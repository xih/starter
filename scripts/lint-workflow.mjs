import { readFile, stat } from "node:fs/promises";

const files = {
  makefile: new URL("../Makefile", import.meta.url),
  ci: new URL("../.github/workflows/ci.yml", import.meta.url),
  designCi: new URL(
    "../.github/workflows/design-system-ci.yml",
    import.meta.url,
  ),
  preCommit: new URL("../.githooks/pre-commit", import.meta.url),
  prePush: new URL("../.githooks/pre-push", import.meta.url),
};

const [makefile, ci, designCi, preCommit, prePush] = await Promise.all(
  Object.values(files).map((file) => readFile(file, "utf8")),
);

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

for (const target of [
  "help",
  "hooks-install",
  "dev-check",
  "verify",
  "verification",
  "design-check",
  "design-gallery",
  "design-gallery-serve",
  "web-verify",
  "agent-verify",
  "tokens-check",
  "design-system-check",
]) {
  expect(
    new RegExp(`^${target}:.*## `, "m").test(makefile),
    `Makefile target ${target} must have discoverable ## help text.`,
  );
}

expect(
  makefile.includes("git config core.hooksPath .githooks"),
  "hooks-install must configure a repository-relative hooks path.",
);
expect(
  ci.includes("run: make ci-install") &&
    ci.includes("run: make ci-lint") &&
    ci.includes("run: make ci-test") &&
    ci.includes("run: make ci-build"),
  "CI must call Makefile targets instead of duplicating pnpm commands.",
);
expect(
  designCi.includes("run: make design-check"),
  "Design-system CI must call make design-check.",
);
expect(
  designCi.includes("permissions:\n  contents: read"),
  "Design-system CI must declare least-privilege read permissions.",
);
expect(
  preCommit.includes("make dev-check"),
  "pre-commit must run the fast local dev-check lane.",
);
expect(
  prePush.includes("RUN_PRE_PUSH_VERIFY"),
  "pre-push must keep exhaustive verification opt-in.",
);
expect(
  !preCommit.includes("/Users/") && !prePush.includes("/Users/"),
  "Git hooks must not contain checkout-specific absolute paths.",
);

for (const [name, file] of [
  ["pre-commit", files.preCommit],
  ["pre-push", files.prePush],
]) {
  const mode = (await stat(file)).mode;
  expect((mode & 0o111) !== 0, `${name} must be executable.`);
}

if (failures.length > 0) {
  console.error("Workflow lint failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Workflow lint passed.");
