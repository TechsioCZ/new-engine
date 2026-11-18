import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from 'storybook-react-rsbuild'

const config: StorybookConfig = {
  staticDirs: [{ from: '../stories/assets/player-media', to: '/player-media' }],
  stories: [
    './getting-started.mdx',
    '../stories/**/*.mdx',
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
  // No type checker here: CI's main job runs `pnpm --dir libs/ui typecheck`
  // over the same tsconfig.json, and every browser bundle waits on this build.
  typescript: {
    reactDocgen: 'react-docgen-typescript',
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
