import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);

const files = {
  tailwind: new URL("apps/web/tailwind.config.ts", root),
  tokenCss: new URL("packages/tokens/dist/css/variables.css", root),
  tokenTailwind: new URL("packages/tokens/dist/tailwind/tokens.mjs", root),
};

const [tailwindConfig, tokenCss, tokenTailwind] = await Promise.all(
  Object.values(files).map((file) => readFile(file, "utf8")),
);

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(
  tailwindConfig.includes('spacing: prefixTokenMap(tokens.spacing, "nell")'),
  "Tailwind config must expose Nell spacing via the `nell-*` prefix.",
);
expect(
  !tailwindConfig.includes("spacing: tokens.spacing"),
  "Tailwind config must not map Nell spacing directly onto Tailwind's core spacing scale.",
);
expect(
  !tailwindConfig.includes("...tokens.borderRadius"),
  "Tailwind config must not spread raw token radius keys into Tailwind's radius scale.",
);
expect(
  tailwindConfig.includes('...prefixTokenMap(tokens.borderRadius, "nell")'),
  "Tailwind config must expose Nell radius via the `nell-*` prefix.",
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
  tokenCss.includes(
    '--font-font-family-body: "ABC Diatype Hebrew Unlicensed Trial";',
  ),
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

if (failures.length > 0) {
  console.error("Design system lint failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Design system lint passed.");
