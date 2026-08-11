/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow the higher-quality setting used by case-study screenshots.
    // Explicit list is required starting in Next.js 16.
    qualities: [75, 90],
  },
  transpilePackages: ["@starter/design-system", "@starter/tokens"],
};

export default config;
