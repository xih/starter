import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-docs"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  docs: {
    autodocs: true,
    defaultName: "Documentation",
  },
  staticDirs: ["../public"],
  core: {
    disableTelemetry: true,
  },
};

export default config;
