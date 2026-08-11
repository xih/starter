/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  plugins: ["prettier-plugin-tailwindcss"],
  // Pin the Tailwind config so class-sort order is stable across the
  // monorepo. Without this, files under packages/* have no upward
  // `tailwind.config.*` to walk to, and the plugin can pick a different
  // (or no) config depending on the environment — which produces
  // formatting diffs between local and CI.
  tailwindConfig: "./apps/web/tailwind.config.ts",
};
