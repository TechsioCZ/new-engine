import type { StorybookConfig } from "storybook-react-rsbuild"

const config: StorybookConfig = {
  addons: [
    "@storybook/addon-themes",
    "@techsio/storybook-better-a11y",
    "storybook-addon-rslib",
  ],
  framework: {
    name: "storybook-react-rsbuild",
    options: {},
  },
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  typescript: {
    check: false,
    reactDocgen: "react-docgen",
  },
}

export default config
