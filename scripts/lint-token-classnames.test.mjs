import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootPath = path.resolve(new URL("..", import.meta.url).pathname);
const lintScript = path.join(rootPath, "scripts/lint-token-classnames.mjs");

test("fixes className token-backed spacing, font weight, and line height", async () => {
  const file = await writeTempSource(`
    export function Example() {
      return <div className="px-[16px] font-[400] leading-[18px]" />;
    }
  `);

  await runLint(["--fix", file]);

  assert.equal(
    await readFile(file, "utf8"),
    `
    export function Example() {
      return <div className="px-token-16 font-regular leading-lhBody" />;
    }
  `,
  );
});

test("does not inspect arbitrary class-looking text outside class contexts", async () => {
  const file = await writeTempSource(`
    const docs = "Use px-[16px] when writing a regression fixture.";
  `);

  await runLint([file]);
});

test("does not auto-fix semantic font-size utilities with bundled properties", async () => {
  const file = await writeTempSource(`
    export function Example() {
      return <div className="text-[16px] leading-[28px]" />;
    }
  `);

  await runLint(["--fix", file]);

  assert.equal(
    await readFile(file, "utf8"),
    `
    export function Example() {
      return <div className="text-[16px] leading-[28px]" />;
    }
  `,
  );
});

test("does not auto-fix duplicate token values to an arbitrary generated class", async () => {
  const file = await writeTempSource(`
    export function Example() {
      return <div className="leading-[22px]" />;
    }
  `);

  await runLint(["--fix", file]);

  assert.equal(
    await readFile(file, "utf8"),
    `
    export function Example() {
      return <div className="leading-[22px]" />;
    }
  `,
  );
});

async function writeTempSource(source) {
  const dir = await mkdtemp(path.join(tmpdir(), "token-class-lint-"));
  const file = path.join(dir, "fixture.tsx");

  await writeFile(file, source);
  test.after(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  return file;
}

async function runLint(args) {
  await execFileAsync(process.execPath, [lintScript, ...args], {
    cwd: rootPath,
  });
}
