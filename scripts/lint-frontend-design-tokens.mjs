import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootPath = path.resolve(new URL("..", import.meta.url).pathname);

const frontendRoots = [
  "apps/web/src/",
  "apps/web/.storybook/",
  "packages/design-system/src/",
];
const frontendExtensions = new Set([
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mdx",
]);
const ignoredPathParts = [
  "/app/api/",
  "/lib/",
  "/server/",
  "/stories/assets/",
  "/trpc/",
  "/types/",
];
const tokenBackedCssProperties =
  /(?:^|[-\s])(background|background-color|border|border-color|border-radius|box-shadow|caret-color|color|column-gap|fill|font|font-family|font-size|font-weight|gap|height|inset|left|letter-spacing|line-height|margin|max-height|max-width|min-height|min-width|outline|outline-color|padding|right|row-gap|stroke|top|width)\s*:/i;
const hardcodedColorPattern =
  /(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color-mix)\()/;
const hardcodedLengthPattern = /(?<![\w-])-?\d*\.?\d+(?:px|r?em)\b/;
const arbitraryTailwindPattern = /(?:^|:|[\s"'`])!?-?[a-z][\w/-]*-\[[^\]]+\]/g;
const rawPalettePattern =
  /(?:^|:|[\s"'`])(?:bg|border|caret|decoration|divide|fill|from|outline|placeholder|ring|stroke|text|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?(?:\/\d+)?(?=$|[\s"'`])/g;
const rawSpacingPattern =
  /(?:^|:|[\s"'`])(?:-?)(?:m[trblxy]?|p[trblxy]?|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left|w|h|min-w|min-h|max-w|max-h)-(?!(?:nell|px|full|screen|svh|svw|dvh|dvw|lvh|lvw|auto|fit|min|max)\b)(?:\d+(?:\.\d+)?)(?:\/\d+)?(?=$|[\s"'`])/g;
const rawRadiusPattern =
  /(?:^|:|[\s"'`])rounded(?:-[trbl]{1,2})?-(?!(?:nell|none|sm|md|lg|full)\b)(?:\dxl|xl|2xl|3xl|\[[^\]]+\])(?=$|[\s"'`])/g;
const dataVariantPattern =
  /(?:^|:)(?:data|aria|group-data|peer-data|group-aria|peer-aria)-\[[^\]]+\]$/;
const allowedArbitraryValuePattern =
  /\[(?:var\(--[\w-]+\)|calc\(var\(--[\w-]+\)[^)]+\)|theme\([^)]+\))\]/;
const allowedStyleProperties = new Set([
  "animationDelay",
  "animationDuration",
  "opacity",
  "pointerEvents",
  "touchAction",
  "transform",
]);

const args = new Set(process.argv.slice(2));
const baseRef = readArgValue("--base") ?? process.env.DESIGN_TOKEN_LINT_BASE;
const headRef =
  readArgValue("--head") ?? process.env.DESIGN_TOKEN_LINT_HEAD ?? "HEAD";
const scanAll = args.has("--all");

function readArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg?.slice(name.length + 1);
}

async function git(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: rootPath,
    maxBuffer: 1024 * 1024 * 10,
  });
  return stdout.trim();
}

async function resolveBaseRef() {
  if (baseRef) return baseRef;

  const candidates = ["origin/main", "upstream/main", "main", "HEAD~1"];

  for (const candidate of candidates) {
    try {
      await git(["rev-parse", "--verify", candidate]);
      return candidate;
    } catch {
      // Try the next likely base.
    }
  }

  return null;
}

async function listChangedFiles() {
  if (scanAll) {
    const files = await git(["ls-files"]);
    return files.split("\n").filter(Boolean);
  }

  const base = await resolveBaseRef();
  if (!base) {
    const files = await git([
      "diff",
      "--name-only",
      "--diff-filter=ACMRT",
      headRef,
    ]);
    return files.split("\n").filter(Boolean);
  }

  const diffBase = await git(["merge-base", base, headRef]).catch(() => base);
  const files = await git([
    "diff",
    "--name-only",
    "--diff-filter=ACMRT",
    `${diffBase}...${headRef}`,
  ]);

  const changedFiles = files.split("\n").filter(Boolean);

  if (process.env.GITHUB_ACTIONS || headRef !== "HEAD") {
    return changedFiles;
  }

  const localFiles = await Promise.all([
    git(["diff", "--name-only", "--diff-filter=ACMRT"]),
    git(["diff", "--cached", "--name-only", "--diff-filter=ACMRT"]),
    git(["ls-files", "--others", "--exclude-standard"]),
  ]);

  return [
    ...new Set([
      ...changedFiles,
      ...localFiles.flatMap((files) => files.split("\n")),
    ]),
  ].filter(Boolean);
}

function isFrontendFile(file) {
  return (
    frontendRoots.some((root) => file.startsWith(root)) &&
    frontendExtensions.has(path.extname(file)) &&
    !ignoredPathParts.some((part) => file.includes(part)) &&
    existsSync(path.join(rootPath, file))
  );
}

function addFailure(failures, file, lineNumber, message, sample) {
  const suffix = sample ? ` (${sample.trim()})` : "";
  failures.push(`${file}:${lineNumber}: ${message}${suffix}`);
}

function lineNumberForIndex(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function checkCssLine(failures, file, line, lineNumber) {
  if (!tokenBackedCssProperties.test(line)) return;
  if (line.includes("var(") || line.includes("theme(")) return;

  if (hardcodedColorPattern.test(line)) {
    addFailure(
      failures,
      file,
      lineNumber,
      "use a design-system color token instead of a hardcoded color",
      line,
    );
  }

  if (hardcodedLengthPattern.test(line)) {
    addFailure(
      failures,
      file,
      lineNumber,
      "use a spacing, radius, or typography token instead of a hardcoded length",
      line,
    );
  }
}

function checkStyleObjectLine(failures, file, line, lineNumber) {
  const styleMatch = line.match(
    /\b([a-zA-Z][\w-]*)\s*:\s*("[^"]+"|'[^']+'|-?\d+(?:\.\d+)?)/,
  );
  if (!styleMatch) return;

  const [, property, rawValue] = styleMatch;
  if (allowedStyleProperties.has(property)) return;
  if (rawValue.includes("var(") || rawValue.includes("token(")) return;

  if (hardcodedColorPattern.test(rawValue)) {
    addFailure(
      failures,
      file,
      lineNumber,
      "use a design-system color token in inline styles",
      line,
    );
  }

  if (hardcodedLengthPattern.test(rawValue) || /^-?\d/.test(rawValue)) {
    addFailure(
      failures,
      file,
      lineNumber,
      "use a design-system spacing, radius, or typography token in inline styles",
      line,
    );
  }
}

function checkMatches(
  failures,
  file,
  source,
  pattern,
  message,
  filter = () => true,
) {
  const globalPattern = pattern.global
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);

  for (const match of source.matchAll(globalPattern)) {
    const sample = match[0].trim();
    if (!filter(sample)) continue;

    addFailure(
      failures,
      file,
      lineNumberForIndex(source, match.index),
      message,
      sample,
    );
  }
}

function isAllowedArbitraryClass(sample) {
  const className = sample.replace(/^[\s"'`:]+/, "");
  return (
    dataVariantPattern.test(className) ||
    allowedArbitraryValuePattern.test(className)
  );
}

async function lintFile(file) {
  const source = await readFile(path.join(rootPath, file), "utf8");
  const failures = [];
  let styleDepth = 0;

  source.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const startsStyleBlock = /\bstyle=\{\{/.test(line);

    checkCssLine(failures, file, line, lineNumber);
    if (startsStyleBlock || styleDepth > 0) {
      checkStyleObjectLine(failures, file, line, lineNumber);
    }

    if (startsStyleBlock) {
      styleDepth += 1;
    }

    if (styleDepth > 0 && /\}\}/.test(line)) {
      styleDepth -= 1;
    }
  });

  checkMatches(
    failures,
    file,
    source,
    arbitraryTailwindPattern,
    "replace arbitrary Tailwind values with named design-system tokens",
    (sample) => !isAllowedArbitraryClass(sample),
  );
  checkMatches(
    failures,
    file,
    source,
    rawPalettePattern,
    "use semantic or generated design-system color utilities instead of raw Tailwind palette colors",
  );
  checkMatches(
    failures,
    file,
    source,
    rawSpacingPattern,
    "use the `nell-*` spacing scale instead of raw Tailwind spacing utilities",
  );
  checkMatches(
    failures,
    file,
    source,
    rawRadiusPattern,
    "use `rounded-nell-*` radius tokens instead of raw radius utilities",
  );

  if (!file.endsWith(".css")) {
    checkMatches(
      failures,
      file,
      source,
      hardcodedColorPattern,
      "use a design-system color token instead of a hardcoded color string",
      (sample) => !sample.includes("color-mix(in oklab, var("),
    );
  }

  return failures;
}

const changedFiles = (await listChangedFiles()).filter(isFrontendFile);
const failures = (await Promise.all(changedFiles.map(lintFile))).flat();

if (failures.length > 0) {
  console.error("Frontend design token lint failed:");
  console.error(
    "Changed frontend files must use repository design tokens for colors, spacing, radius, and typography.",
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const scope = scanAll
  ? "all frontend files"
  : `${changedFiles.length} changed frontend file(s)`;
console.log(`Frontend design token lint passed for ${scope}.`);
