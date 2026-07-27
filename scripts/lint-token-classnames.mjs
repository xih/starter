import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

import { tokens } from "../packages/tokens/dist/tailwind/tokens.mjs";

const rootPath = path.resolve(new URL("..", import.meta.url).pathname);
const tokenValuesPath = path.join(
  rootPath,
  "packages/tokens/dist/json/light.json",
);
const tailwindConfigPath = path.join(rootPath, "apps/web/tailwind.config.ts");
const defaultTargets = [
  path.join(rootPath, "apps/web/src"),
  path.join(rootPath, "packages/design-system/src"),
];
const args = process.argv.slice(2);
const shouldFix = args.includes("--fix");
const explicitFiles = args.filter((arg) => arg !== "--fix");
const sourceExtensions = new Set([".ts", ".tsx", ".jsx", ".mdx"]);
const classHelperNames = new Set(["cn", "clsx", "cva", "twMerge"]);
const spacingUtilityPrefixes = new Set([
  "basis",
  "bottom",
  "end",
  "gap",
  "gap-x",
  "gap-y",
  "h",
  "inset",
  "inset-x",
  "inset-y",
  "left",
  "m",
  "max-h",
  "max-w",
  "mb",
  "me",
  "min-h",
  "min-w",
  "ml",
  "mr",
  "ms",
  "mt",
  "mx",
  "my",
  "p",
  "pb",
  "pe",
  "pl",
  "pr",
  "ps",
  "pt",
  "px",
  "py",
  "right",
  "scroll-m",
  "scroll-mb",
  "scroll-me",
  "scroll-ml",
  "scroll-mr",
  "scroll-ms",
  "scroll-mt",
  "scroll-mx",
  "scroll-my",
  "scroll-p",
  "scroll-pb",
  "scroll-pe",
  "scroll-pl",
  "scroll-pr",
  "scroll-ps",
  "scroll-pt",
  "scroll-px",
  "scroll-py",
  "size",
  "space-x",
  "space-y",
  "start",
  "top",
  "w",
]);
const radiusUtilityPrefixes = new Set([
  "rounded",
  "rounded-b",
  "rounded-bl",
  "rounded-br",
  "rounded-e",
  "rounded-ee",
  "rounded-es",
  "rounded-l",
  "rounded-r",
  "rounded-s",
  "rounded-se",
  "rounded-ss",
  "rounded-t",
  "rounded-tl",
  "rounded-tr",
]);

const tokenValues = buildTokenValueMap(
  JSON.parse(await readFile(tokenValuesPath, "utf8")),
);
const configuredFontSizeUtilities = readConfiguredFontSizeUtilities(
  await readFile(tailwindConfigPath, "utf8"),
);
const configuredTokenClasses = buildConfiguredTokenClasses();
const files = await resolveTargetFiles(explicitFiles);
const failures = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const replacements = collectClassTokenReplacements(file, source);

  for (const replacement of replacements) {
    failures.push(
      `${path.relative(rootPath, file)}:${replacement.line}: use \`${replacement.replacement}\` instead of \`${replacement.classToken}\``,
    );
  }

  if (shouldFix && replacements.length > 0) {
    await writeFile(file, applyReplacements(source, replacements));
  }
}

if (failures.length > 0 && shouldFix) {
  console.log("Token className lint fixed token-backed arbitrary classes:");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
} else if (failures.length > 0) {
  console.error("Token className lint failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
} else {
  console.log("Token className lint passed.");
}

function collectClassTokenReplacements(file, source) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(file),
  );
  const replacements = [];

  const inspectClassNode = (node) => {
    if (isStringLike(node)) {
      inspectClassString(
        source,
        node.text,
        getStringContentStart(node),
        replacements,
      );
      return;
    }

    if (ts.isTemplateExpression(node)) {
      inspectTemplateExpression(source, node, replacements);
      ts.forEachChild(node, inspectClassNode);
      return;
    }

    ts.forEachChild(node, inspectClassNode);
  };

  const inspectJsxClassInitializer = (initializer) => {
    if (!initializer) return;

    if (ts.isStringLiteral(initializer)) {
      inspectClassNode(initializer);
      return;
    }

    if (ts.isJsxExpression(initializer) && initializer.expression) {
      inspectClassNode(initializer.expression);
    }
  };

  const visit = (node) => {
    if (ts.isJsxAttribute(node) && isClassAttributeName(node.name.text)) {
      inspectJsxClassInitializer(node.initializer);
      return;
    }

    if (ts.isCallExpression(node) && isClassHelperCall(node.expression)) {
      for (const argument of node.arguments) {
        inspectClassNode(argument);
      }
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return replacements;
}

function inspectClassString(source, classString, contentStart, replacements) {
  for (const match of classString.matchAll(
    /[\w!:[\]()>+&./-]+-\[[^\]\s"'`]+\]/g,
  )) {
    const classToken = match[0];
    const replacement = getTokenClassReplacement(classToken);

    if (!replacement || replacement === classToken) continue;

    const start = contentStart + match.index;
    const end = start + classToken.length;
    const line = source.slice(0, start).split("\n").length;

    replacements.push({ start, end, line, classToken, replacement });
  }
}

function inspectTemplateExpression(source, node, replacements) {
  inspectTemplateLiteralChunk(source, node.head, replacements);

  for (const span of node.templateSpans) {
    inspectTemplateLiteralChunk(source, span.literal, replacements);
  }
}

function inspectTemplateLiteralChunk(source, node, replacements) {
  const raw = node.getText();
  const text = node.text;
  const rawTextIndex = raw.indexOf(text);

  if (rawTextIndex === -1) return;

  inspectClassString(
    source,
    text,
    node.getStart() + rawTextIndex,
    replacements,
  );
}

function getTokenClassReplacement(classToken) {
  const parts = splitOutsideBrackets(classToken, ":");
  const utility = parts.at(-1);
  const variantPrefix =
    parts.length > 1 ? `${parts.slice(0, -1).join(":")}:` : "";
  const importantPrefix = utility.startsWith("!") ? "!" : "";
  const utilityWithoutImportant = importantPrefix ? utility.slice(1) : utility;
  const negativePrefix = utilityWithoutImportant.startsWith("-") ? "-" : "";
  const unsignedUtility = negativePrefix
    ? utilityWithoutImportant.slice(1)
    : utilityWithoutImportant;
  const arbitrary = unsignedUtility.match(/^(.+)-\[(.+)\]$/);

  if (!arbitrary) return null;

  const [, prefix, rawValue] = arbitrary;
  const value = normalizeArbitraryValue(rawValue);
  const tokenClass = getConfiguredClassForValue(prefix, value);

  if (!tokenClass) return null;

  return `${variantPrefix}${importantPrefix}${negativePrefix}${prefix}-${tokenClass}`;
}

function getConfiguredClassForValue(prefix, value) {
  if (spacingUtilityPrefixes.has(prefix)) {
    return getUniqueTokenClass(configuredTokenClasses.spacing, value);
  }

  if (radiusUtilityPrefixes.has(prefix)) {
    return getUniqueTokenClass(configuredTokenClasses.radius, value);
  }

  if (prefix === "leading") {
    return getUniqueTokenClass(configuredTokenClasses.lineHeight, value);
  }

  if (prefix === "font") {
    return getUniqueTokenClass(configuredTokenClasses.fontWeight, value);
  }

  if (prefix === "text") {
    return getUniqueTokenClass(configuredTokenClasses.fontSize, value);
  }

  return null;
}

function getUniqueTokenClass(map, value) {
  const candidates = map.get(value);

  if (!candidates || candidates.length !== 1) return null;

  return candidates[0];
}

function buildConfiguredTokenClasses() {
  return {
    spacing: buildTokenClassMap(tokens.spacing, (key) => `token-${key}`),
    radius: buildTokenClassMap(tokens.borderRadius, (key) => `token-${key}`),
    fontSize: buildFontSizeClassMap(),
    fontWeight: buildTokenClassMap(tokens.fontWeight, (key) => key),
    lineHeight: buildTokenClassMap(tokens.lineHeight, (key) => key),
  };
}

function buildFontSizeClassMap() {
  const map = new Map();

  for (const [key, variable] of Object.entries(tokens.fontSize)) {
    if (!isPropertyEquivalentFontSizeClass(key)) continue;

    addClassValue(map, key, tokenValueCandidates(variable));
  }

  return map;
}

function isPropertyEquivalentFontSizeClass(key) {
  const utility = configuredFontSizeUtilities.get(key);

  return Boolean(utility && !utility.hasExtraProperties);
}

function readConfiguredFontSizeUtilities(source) {
  const sourceFile = ts.createSourceFile(
    tailwindConfigPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const utilities = new Map();

  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      getPropertyName(node.name) === "fontSize" &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        if (!ts.isPropertyAssignment(property)) continue;

        const utilityName = getPropertyName(property.name);
        if (!utilityName) continue;

        utilities.set(utilityName, {
          hasExtraProperties: hasFontSizeExtraProperties(property.initializer),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return utilities;
}

function hasFontSizeExtraProperties(initializer) {
  if (!ts.isArrayLiteralExpression(initializer)) return false;

  const options = initializer.elements[1];
  return Boolean(
    options &&
    ts.isObjectLiteralExpression(options) &&
    options.properties.length > 0,
  );
}

function getPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }

  return null;
}

function buildTokenClassMap(tokenGroup, classNameForKey) {
  const map = new Map();

  for (const [key, variable] of Object.entries(tokenGroup)) {
    addClassValue(map, classNameForKey(key), tokenValueCandidates(variable));
  }

  return map;
}

function addClassValue(map, className, values) {
  for (const value of values) {
    const normalized = normalizeArbitraryValue(value);
    const candidates = map.get(normalized) ?? [];

    if (!candidates.includes(className)) {
      candidates.push(className);
    }

    map.set(normalized, candidates);
  }
}

function tokenValueCandidates(variable) {
  const variableName = variable.match(/^var\(--([^)]+)\)$/)?.[1];
  const values = [variable];
  const resolved = variableName ? tokenValues.get(variableName) : null;

  if (resolved) {
    values.push(resolved);
  }

  return values;
}

function buildTokenValueMap(sourceTokens) {
  const map = new Map();

  for (const token of sourceTokens) {
    map.set(token.name, normalizeTokenValue(token));
  }

  return map;
}

function normalizeTokenValue(token) {
  if (typeof token.value !== "number") {
    return String(token.value).trim();
  }

  if (token.name.startsWith("font-font-weight-")) {
    return String(token.value);
  }

  return `${roundTokenNumber(token.value)}px`;
}

function roundTokenNumber(value) {
  return Number.isInteger(value) ? value : Number(value.toFixed(4));
}

function normalizeArbitraryValue(value) {
  return value.replace(/_/g, " ").trim();
}

function splitOutsideBrackets(value, separator) {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;

    if (char === separator && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
}

async function resolveTargetFiles(targets) {
  if (targets.length === 0) {
    return (
      await Promise.all(defaultTargets.map((target) => collectFiles(target)))
    ).flat();
  }

  const resolved = [];

  for (const target of targets) {
    const fullPath = path.resolve(rootPath, target);

    try {
      const targetStat = await stat(fullPath);

      if (targetStat.isDirectory()) {
        resolved.push(...(await collectFiles(fullPath)));
      } else if (sourceExtensions.has(path.extname(fullPath))) {
        resolved.push(fullPath);
      }
    } catch {
      // Ignore explicit file paths that no longer exist.
    }
  }

  return [...new Set(resolved)];
}

async function collectFiles(dir, files = []) {
  for (const entry of await readdir(dir)) {
    const fullPath = path.join(dir, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      await collectFiles(fullPath, files);
    } else if (sourceExtensions.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function applyReplacements(source, replacements) {
  let updated = source;

  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    updated =
      updated.slice(0, replacement.start) +
      replacement.replacement +
      updated.slice(replacement.end);
  }

  return updated;
}

function getScriptKind(file) {
  switch (path.extname(file)) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    default:
      return ts.ScriptKind.TS;
  }
}

function isStringLike(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function getStringContentStart(node) {
  return node.getStart() + 1;
}

function isClassAttributeName(name) {
  return name === "className" || name === "class";
}

function isClassHelperCall(expression) {
  if (ts.isIdentifier(expression)) {
    return classHelperNames.has(expression.text);
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return classHelperNames.has(expression.name.text);
  }

  return false;
}
