import "@starter/tokens/css";
import "@starter/design-system/styles";
import "../src/styles/globals.css";
import "dialkit/styles.css";

import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
