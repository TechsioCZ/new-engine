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
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/core/src/core.ts'),
      },
      {
        find: '@techsio/smart-suggest-datasets',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/datasets/src/datasets.ts'),
      },
      {
        find: '@techsio/smart-suggest-indexing',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/indexing/src/indexing.ts'),
      },
      {
        find: '@techsio/smart-suggest-integrations',
        replacement: path.join(
          workspaceRoot,
          'libs/smart-suggest/integrations/src/integrations.ts',
        ),
      },
      {
        find: '@techsio/smart-suggest-storage',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/storage/src/storage.ts'),
      },
      {
        find: /^@techsio\/smart-suggest-validation\/(?<entry>.+)$/u,
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/validation/src/$<entry>.ts'),
      },
      {
        find: '@techsio/smart-suggest-validation',
        replacement: path.join(workspaceRoot, 'libs/smart-suggest/validation/src/validation.ts'),
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
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    passWithNoTests: false,
    restoreMocks: true,
    typecheck: { tsconfig: './tsconfig.json' },
  },
});
