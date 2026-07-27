import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const rootPath = path.resolve(new URL("..", import.meta.url).pathname);
const tailwindConfigPath = path.join(rootPath, "apps/web/tailwind.config.ts");
const rootPackagePath = path.join(rootPath, "package.json");
const webPackagePath = path.join(rootPath, "apps/web/package.json");
const jsxScanDirs = [
  path.join(rootPath, "apps/web/src"),
  path.join(rootPath, "packages/design-system/src"),
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function formatDiagnosticMessage(messageText) {
  return ts.flattenDiagnosticMessageText(messageText, "\n");
}

const tailwindConfig = await readFile(tailwindConfigPath, "utf8");
const sourceFile = ts.createSourceFile(
  tailwindConfigPath,
  tailwindConfig,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

for (const diagnostic of sourceFile.parseDiagnostics) {
  fail(
    `tailwind.config.ts parse error: ${formatDiagnosticMessage(
      diagnostic.messageText,
    )}`,
  );
}

function visit(node) {
  if (
    ts.isPropertyAssignment(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "spacing" &&
    node.initializer.getText(sourceFile) === "tokens.spacing"
  ) {
    fail("tailwind.config.ts must not assign `spacing: tokens.spacing`.");
  }

  if (
    ts.isSpreadAssignment(node) &&
    node.expression.getText(sourceFile) === "tokens.borderRadius"
  ) {
    fail("tailwind.config.ts must not spread `tokens.borderRadius`.");
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

async function collectSourceFiles(dir, files = []) {
  for (const entry of await readdir(dir)) {
    const fullPath = path.join(dir, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      await collectSourceFiles(fullPath, files);
    } else if (/\.(tsx?|jsx?)$/.test(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getAttribute(attributes, name) {
  return attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText() === name,
  );
}

function collectStringBindings(source) {
  const bindings = new Map();

  function visitBindings(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const initializer = node.initializer;

      if (initializer && ts.isStringLiteralLike(initializer)) {
        bindings.set(node.name.text, initializer.text);
      }
    }

    ts.forEachChild(node, visitBindings);
  }

  visitBindings(source);
  return bindings;
}

function getClassText(openingElement, source, stringBindings = new Map()) {
  const className = getAttribute(openingElement.attributes, "className");

  if (!className?.initializer) {
    return "";
  }

  const initializer = className.initializer;

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  if (!ts.isJsxExpression(initializer) || !initializer.expression) {
    return "";
  }

  if (ts.isIdentifier(initializer.expression)) {
    return stringBindings.get(initializer.expression.text) ?? "";
  }

  return initializer.expression.getText(source);
}

function hasFixedLightSurface(classText) {
  return /\bbg-white\b|\bbg-\[#(?:fff|ffffff)\]\b|\bbg-\[white\]\b/i.test(
    classText,
  );
}

function hasGlobalForegroundToken(classText) {
  return (
    /\btext-\[var\(--color-text-primary\)\]/.test(classText) ||
    /\btext-text-primary\b/.test(classText)
  );
}

function hasExplicitSurfaceForeground(classText) {
  return (
    /\btext-(?:black|zinc-950|neutral-950|stone-950|slate-950)\b/.test(
      classText,
    ) ||
    /\btext-\[#(?:000|121318|1e1f24|111827|18181b|0f172a)\]/i.test(classText) ||
    /\btext-\[rgb\(/.test(classText) ||
    /\btext-\[hsl\(/.test(classText) ||
    /\btext-\[var\(--[\w-]*(?:on-card|card-text|surface-text|text-on-card)[\w-]*\)\]/.test(
      classText,
    )
  );
}

function openingElementOf(node) {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
}

function lineFor(sourceFile, node) {
  return (
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  );
}

function subtreeUsesGlobalForegroundToken(node, sourceFile, stringBindings) {
  let found = false;

  function visitJsx(child) {
    if (found) return;

    const openingElement = openingElementOf(child);
    if (
      openingElement &&
      hasGlobalForegroundToken(
        getClassText(openingElement, sourceFile, stringBindings),
      )
    ) {
      found = true;
      return;
    }

    ts.forEachChild(child, visitJsx);
  }

  ts.forEachChild(node, visitJsx);
  return found;
}

for (const file of (
  await Promise.all(jsxScanDirs.map((dir) => collectSourceFiles(dir)))
).flat()) {
  const source = await readFile(file, "utf8");
  const scriptKind =
    file.endsWith(".tsx") || file.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS;
  const jsxSourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const stringBindings = collectStringBindings(jsxSourceFile);

  for (const diagnostic of jsxSourceFile.parseDiagnostics) {
    fail(
      `${path.relative(rootPath, file)} parse error: ${formatDiagnosticMessage(
        diagnostic.messageText,
      )}`,
    );
  }

  function visitJsx(node) {
    const openingElement = openingElementOf(node);

    if (openingElement) {
      const classText = getClassText(
        openingElement,
        jsxSourceFile,
        stringBindings,
      );
      const hasLightSurface = hasFixedLightSurface(classText);
      const hasExplicitForeground = hasExplicitSurfaceForeground(classText);
      const ownGlobalForeground = hasGlobalForegroundToken(classText);
      let childGlobalForeground = false;

      if (hasLightSurface && !hasExplicitForeground && ts.isJsxElement(node)) {
        childGlobalForeground = subtreeUsesGlobalForegroundToken(
          node,
          jsxSourceFile,
          stringBindings,
        );
      }

      if (
        hasLightSurface &&
        !hasExplicitForeground &&
        (ownGlobalForeground || childGlobalForeground)
      ) {
        fail(
          `${path.relative(rootPath, file)}:${lineFor(
            jsxSourceFile,
            openingElement,
          )} fixed light surface uses global foreground tokens; add an explicit light-surface foreground such as text-[#121318] or a scoped surface token.`,
        );
      }
    }

    ts.forEachChild(node, visitJsx);
  }

  visitJsx(jsxSourceFile);
}

const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
const webPackage = JSON.parse(await readFile(webPackagePath, "utf8"));

if (!rootPackage.scripts?.["lint:design-system"]) {
  fail("root package.json must define lint:design-system.");
}

if (!rootPackage.scripts?.["lint:styles"]) {
  fail("root package.json must define lint:styles.");
}

if (!rootPackage.scripts?.["lint:ast"]) {
  fail("root package.json must define lint:ast.");
}

if (webPackage.scripts?.lint?.includes("next lint")) {
  fail(
    "apps/web package.json lint script must not use deprecated `next lint`.",
  );
}

if (failures.length > 0) {
  console.error("AST structural checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("AST structural checks passed.");
