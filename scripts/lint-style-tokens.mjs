import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const rootPath = path.resolve(new URL("..", import.meta.url).pathname);
const targetDirs = [
  path.join(rootPath, "apps/web/src"),
  path.join(rootPath, "packages/tokens/dist/css"),
];

const failures = [];

async function collectCssFiles(dir, files = []) {
  for (const entry of await readdir(dir)) {
    const fullPath = path.join(dir, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      await collectCssFiles(fullPath, files);
    } else if (fullPath.endsWith(".css")) {
      files.push(fullPath);
    }
  }

  return files;
}

function addFailure(file, message) {
  failures.push(`${path.relative(rootPath, file)}: ${message}`);
}

const cssFiles = (
  await Promise.all(targetDirs.map((dir) => collectCssFiles(dir)))
).flat();

for (const file of cssFiles) {
  const source = await readFile(file, "utf8");

  if (/hsl\(var\(--/.test(source)) {
    addFailure(
      file,
      "do not wrap CSS variable colors in hsl(); token colors are emitted as complete color values",
    );
  }

  if (file.endsWith("variables.css")) {
    for (const [name, value] of source.matchAll(
      /--(font-font-size-[\w-]+|font-line-height-[\w-]+|spacing-[\w-]+|radius-[\w-]+):\s*([^;]+);/g,
    )) {
      if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
        addFailure(file, `--${name} must include a CSS unit, got ${value}`);
      }
    }

    for (const [name, value] of source.matchAll(
      /--(font-letter-spacing-[\w-]+):\s*([^;]+);/g,
    )) {
      if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
        addFailure(file, `--${name} must include an em unit, got ${value}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Style token lint failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Style token lint passed.");
