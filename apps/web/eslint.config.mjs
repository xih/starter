import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import storybook from "eslint-plugin-storybook";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [
      ".next/**",
      ".eslintrc.cjs",
      ".storybook/**",
      "eslint.config.mjs",
      "next-env.d.ts",
      "next.config.js",
      "node_modules/**",
      "postcss.config.js",
      "scripts/*.mjs",
      "public/ort-wasm-simd-threaded.mjs",
      "public/vad.worklet.bundle.min.js",
      "public/storybook/**",
      "storybook-static/**",
      "tailwind.config.ts",
      "vitest.config.ts",
    ],
  },
  ...compat.extends(
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ),
  ...storybook.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/require-await": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "dialkit",
              importNames: ["DialRoot"],
              message:
                "Use ~/components/DialKitRoot so DialKit stays disabled on production routes unless explicitly enabled.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/DialKitRoot.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
