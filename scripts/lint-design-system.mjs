import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const rootPath = fileURLToPath(root);

const files = {
  tailwind: new URL("apps/web/tailwind.config.ts", root),
  tokenCss: new URL("packages/tokens/dist/css/variables.css", root),
  tokenTailwind: new URL("packages/tokens/dist/tailwind/tokens.mjs", root),
};

const [tailwindConfig, tokenCss, tokenTailwind] = await Promise.all(
  Object.values(files).map((file) => readFile(file, "utf8")),
);

const failures = [];
const warnings = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function addWarning(file, lineNumber, message) {
  warnings.push(`${path.relative(rootPath, file)}:${lineNumber}: ${message}`);
}

async function collectSourceFiles(dir, output = []) {
  for (const entry of await readdir(dir)) {
    const fullPath = path.join(dir, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".next" ||
        entry === "storybook-static"
      ) {
        continue;
      }

      await collectSourceFiles(fullPath, output);
    } else if (/\.(css|tsx?)$/.test(fullPath)) {
      output.push(fullPath);
    }
  }

  return output;
}

function hasDesignException(line) {
  return /design-ok:\s+\S+/.test(line);
}

function scanLine(file, line, lineNumber, previousLine) {
  if (hasDesignException(line) || hasDesignException(previousLine)) return;

  if (
    /#[0-9a-fA-F]{3,8}\b/.test(line) ||
    /\b(?:rgb|rgba|hsl|hsla)\(/.test(line)
  ) {
    addWarning(
      file,
      lineNumber,
      "prefer semantic color tokens over raw color values, or add `design-ok: <reason>`",
    );
  }

  if (
    /\b(?:text|leading|tracking)-\[(?:length:)?-?\d/.test(line) ||
    /font-size:\s*-?\d/.test(line)
  ) {
    addWarning(
      file,
      lineNumber,
      "prefer typography tokens over arbitrary font-size, line-height, or tracking values",
    );
  }

  if (
    /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y)-\[-?\d/.test(
      line,
    ) ||
    /(?:padding|margin|gap):\s*-?\d/.test(line)
  ) {
    addWarning(
      file,
      lineNumber,
      "prefer spacing tokens over arbitrary spacing values",
    );
  }

  if (/\brounded-\[-?\d/.test(line) || /border-radius:\s*-?\d/.test(line)) {
    addWarning(
      file,
      lineNumber,
      "prefer radius tokens over arbitrary radius values",
    );
  }
}

expect(
  tailwindConfig.includes('spacing: prefixTokenMap(tokens.spacing, "token")'),
  "Tailwind config must expose design-token spacing via the `token-*` prefix.",
);
expect(
  !tailwindConfig.includes("spacing: tokens.spacing"),
  "Tailwind config must not map design-token spacing directly onto Tailwind's core spacing scale.",
);
expect(
  !tailwindConfig.includes("...tokens.borderRadius"),
  "Tailwind config must not spread raw token radius keys into Tailwind's radius scale.",
);
expect(
  tailwindConfig.includes('...prefixTokenMap(tokens.borderRadius, "token")'),
  "Tailwind config must expose design-token radius via the `token-*` prefix.",
);
expect(
  tailwindConfig.includes('lg: "var(--radius)"') &&
    tailwindConfig.includes('md: "calc(var(--radius) - 2px)"') &&
    tailwindConfig.includes('sm: "calc(var(--radius) - 4px)"'),
  "Tailwind config must preserve shadcn-compatible rounded-sm/md/lg mappings.",
);
expect(
  tokenTailwind.includes('"16": "var(--spacing-16)"'),
  "Generated Tailwind token map should include spacing token 16.",
);
expect(
  tokenCss.includes("--spacing-16: 16px;"),
  "Generated CSS tokens should include length units for spacing.",
);
expect(
  tokenCss.includes("--radius-m: 16px;"),
  "Generated CSS tokens should include length units for radius.",
);
expect(
  tokenCss.includes('--font-font-family-body: "Lab Grotesque";'),
  "Generated CSS tokens should quote font family values that contain spaces.",
);
expect(
  tokenCss.includes("--font-font-size-title: 28px;"),
  "Generated CSS tokens should include px units for font size values.",
);
expect(
  tokenCss.includes("--font-letter-spacing-title: -0.02em;"),
  "Generated CSS tokens should include em units for letter spacing values.",
);

const sourceFiles = (
  await Promise.all(
    [
      path.join(rootPath, "apps/web/src"),
      path.join(rootPath, "packages/design-system/src"),
    ].map((dir) => collectSourceFiles(dir)),
  )
).flat();

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    scanLine(file, line, index + 1, lines[index - 1] ?? "");
  });
}

if (failures.length > 0) {
  console.error("Design system lint failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (warnings.length > 0) {
  const visibleWarnings = warnings.slice(0, 50);
  const hiddenWarningCount = warnings.length - visibleWarnings.length;

  console.log("Design system advisory warnings:");
  for (const warning of visibleWarnings) {
    console.log(`- ${warning}`);
  }
  if (hiddenWarningCount > 0) {
    console.log(
      `- ... ${hiddenWarningCount} additional advisory warnings hidden`,
    );
  }
  console.log(
    "Warnings are non-blocking while legacy surfaces migrate to semantic tokens.",
  );
}

console.log("Design system lint passed.");
