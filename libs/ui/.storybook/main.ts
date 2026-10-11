import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from 'storybook-react-rsbuild'

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
    '@techsio/storybook-better-a11y',
    'storybook-addon-rslib',
  ],
  framework: {
    name: 'storybook-react-rsbuild',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    check: true,
  },
  rsbuildFinal: (rsbuildConfig) => {
    // Library declaration builds exclude stories; preview checks include them.
    rsbuildConfig.source ??= {}
    rsbuildConfig.source.tsconfigPath = fileURLToPath(
      new URL('../tsconfig.json', import.meta.url)
    )
    return rsbuildConfig
  },
}

export default config
