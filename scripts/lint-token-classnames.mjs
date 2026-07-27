import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const rootPath = path.resolve(new URL("..", import.meta.url).pathname);
const tokenCssPath = path.join(
  rootPath,
  "packages/tokens/dist/css/variables.css",
);
const defaultTargets = [
  path.join(rootPath, "apps/web/src"),
  path.join(rootPath, "packages/design-system/src"),
];
const args = process.argv.slice(2);
const shouldFix = args.includes("--fix");
const explicitFiles = args.filter((arg) => arg !== "--fix");
const sourceExtensions = new Set([".ts", ".tsx", ".jsx", ".mdx"]);

const spacingPrefixes = new Set([
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

const radiusPrefixes = new Set([
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

const tokenCss = await readFile(tokenCssPath, "utf8");
const tokenClassMaps = {
  spacing: readCssTokenMap(tokenCss, "--spacing-", "token-"),
  radius: readCssTokenMap(tokenCss, "--radius-", "token-"),
  fontSize: readCssTokenMap(tokenCss, "--font-font-size-", ""),
  lineHeight: readCssTokenMap(tokenCss, "--font-line-height-", ""),
  fontWeight: readCssTokenMap(tokenCss, "--font-font-weight-", ""),
};
const files = await resolveTargetFiles(explicitFiles);
const failures = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const replacements = [];

  for (const tokenMatch of source.matchAll(
    /(?<![\w/.-])(?<token>-?[\w:[\]()>+&.-]+-\[[^\]\s"'`]+\])/g,
  )) {
    const classToken = tokenMatch.groups.token;
    const replacement = getTokenClassReplacement(classToken);

    if (!replacement || replacement === classToken) continue;

    const start = tokenMatch.index;
    const end = start + classToken.length;
    const line = source.slice(0, start).split("\n").length;

    failures.push(
      `${path.relative(rootPath, file)}:${line}: use \`${replacement}\` instead of \`${classToken}\``,
    );
    replacements.push({ start, end, replacement });
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

function readCssTokenMap(source, variablePrefix, classPrefix) {
  const map = new Map();
  const pattern = new RegExp(
    `${escapeRegExp(variablePrefix)}([\\w-]+):\\s*([^;]+);`,
    "g",
  );

  for (const [, key, rawValue] of source.matchAll(pattern)) {
    const value = rawValue.trim();
    map.set(value, `${classPrefix}${toTailwindTokenKey(key)}`);
  }

  return map;
}

function toTailwindTokenKey(key) {
  return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function getTokenClassReplacement(classToken) {
  const parts = splitOutsideBrackets(classToken, ":");
  const utility = parts.at(-1);
  const variantPrefix =
    parts.length > 1 ? `${parts.slice(0, -1).join(":")}:` : "";
  const negativePrefix = utility.startsWith("-") ? "-" : "";
  const unsignedUtility = negativePrefix ? utility.slice(1) : utility;
  const arbitrary = unsignedUtility.match(/^(.+)-\[(.+)\]$/);

  if (!arbitrary) return null;

  const [, prefix, rawValue] = arbitrary;
  const value = rawValue.trim();

  if (spacingPrefixes.has(prefix)) {
    const tokenClass = tokenClassMaps.spacing.get(value);
    return tokenClass
      ? `${variantPrefix}${negativePrefix}${prefix}-${tokenClass}`
      : null;
  }

  if (radiusPrefixes.has(prefix)) {
    const tokenClass = tokenClassMaps.radius.get(value);
    return tokenClass ? `${variantPrefix}${prefix}-${tokenClass}` : null;
  }

  if (prefix === "text") {
    const tokenClass = tokenClassMaps.fontSize.get(value);
    return tokenClass ? `${variantPrefix}text-${tokenClass}` : null;
  }

  if (prefix === "leading") {
    const tokenClass = tokenClassMaps.lineHeight.get(value);
    return tokenClass ? `${variantPrefix}leading-${tokenClass}` : null;
  }

  if (prefix === "font") {
    const tokenClass = tokenClassMaps.fontWeight.get(value);
    return tokenClass ? `${variantPrefix}font-${tokenClass}` : null;
  }

  return null;
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
      // lint-staged can pass deleted files; ignore anything no longer on disk.
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
