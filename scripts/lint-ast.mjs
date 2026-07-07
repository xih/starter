import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const rootPath = path.resolve(new URL("..", import.meta.url).pathname);
const tailwindConfigPath = path.join(rootPath, "apps/web/tailwind.config.ts");
const rootPackagePath = path.join(rootPath, "package.json");
const webPackagePath = path.join(rootPath, "apps/web/package.json");

const failures = [];

function fail(message) {
  failures.push(message);
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
  fail(`tailwind.config.ts parse error: ${diagnostic.messageText}`);
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

const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
const webPackage = JSON.parse(await readFile(webPackagePath, "utf8"));

if (!rootPackage.scripts?.["lint:design-system"]) {
  fail("root package.json must define lint:design-system.");
}

if (!rootPackage.scripts?.["lint:frontend-tokens"]) {
  fail("root package.json must define lint:frontend-tokens.");
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
