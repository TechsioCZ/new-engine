import path from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = import.meta.dirname;
const workspaceRoot = path.resolve(rootDir, '../../../..');

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@techsio/smart-suggest-datasets/source-catalog',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/datasets/src/source-catalog.ts'),
      },
      {
        find: '@techsio/smart-suggest-core',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/core/src/index.ts'),
      },
      {
        find: '@techsio/smart-suggest-datasets',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/datasets/src/index.ts'),
      },
      {
        find: '@techsio/smart-suggest-indexing',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/indexing/src/index.ts'),
      },
      {
        find: '@techsio/smart-suggest-integrations',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/integrations/src/index.ts'),
      },
      {
        find: '@techsio/smart-suggest-storage',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/storage/src/index.ts'),
      },
      {
        find: '@techsio/smart-suggest-validation',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/validation/src/index.ts'),
      },
      {
        find: /^@techsio\/smart-suggest-ui\/(?<entry>.+)$/u,
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/ui/dist/$<entry>.js'),
      },
      {
        find: /^@techsio\/smart-suggest-react$/u,
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/react/dist/index.js'),
      },
      {
        find: /^@techsio\/ui-kit\/(?<entry>.+)$/u,
        replacement: path.join(workspaceRoot, 'libs/ui/dist/$<entry>.js'),
      },
      {
        find: 'react',
        replacement: path.join(rootDir, 'node_modules/react'),
      },
      {
        find: 'react-dom',
        replacement: path.join(rootDir, 'node_modules/react-dom'),
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'node',
    include: ['api/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    passWithNoTests: false,
    restoreMocks: true,
    typecheck: { tsconfig: './tsconfig.json' },
  },
});
