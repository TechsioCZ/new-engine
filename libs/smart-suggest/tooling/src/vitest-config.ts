import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

type SmartSuggestPackage =
  | 'client'
  | 'core'
  | 'datasets'
  | 'indexing'
  | 'integrations'
  | 'react'
  | 'storage'
  | 'validation';

type SmartSuggestVitestOptions = {
  environment: 'jsdom' | 'node';
  include?: string[];
  packages?: SmartSuggestPackage[];
  reactSingletonFrom?: 'ui';
};

const sourcePath = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

const packageSources: Record<SmartSuggestPackage, string> = {
  client: '../../client/src/client.ts',
  core: '../../core/src/core.ts',
  datasets: '../../datasets/src/datasets.ts',
  indexing: '../../indexing/src/indexing.ts',
  integrations: '../../integrations/src/integrations.ts',
  react: '../../react/src/react.ts',
  storage: '../../storage/src/storage.ts',
  validation: '../../validation/src/validation.ts',
};

const packageSubpathSources: Partial<Record<SmartSuggestPackage, Record<string, string>>> = {
  validation: {
    'phone-lite': '../../validation/src/phone-lite.ts',
    'phone-strict': '../../validation/src/phone-strict.ts',
  },
};

const shellApiAlias = {
  find: /^@smart-suggest\/shell-super-app\/api$/u,
  replacement: sourcePath('../../../../apps/smart-suggest/apps/shell-super-app/shared/api.ts'),
};

const REACT_IMPORT_PATTERN = /^react$/u;
const REACT_JSX_DEV_RUNTIME_PATTERN = /^react\/jsx-dev-runtime$/u;
const REACT_JSX_RUNTIME_PATTERN = /^react\/jsx-runtime$/u;

const packageAliases = (packageName: SmartSuggestPackage) => [
  {
    find: new RegExp(`^@techsio/smart-suggest-${packageName}$`, 'u'),
    replacement: sourcePath(packageSources[packageName]),
  },
  ...Object.entries(packageSubpathSources[packageName] ?? {}).map(([subpath, relativePath]) => ({
    find: new RegExp(`^@techsio/smart-suggest-${packageName}/${subpath}$`, 'u'),
    replacement: sourcePath(relativePath),
  })),
];

const reactSingletonAliases = (packageName: 'ui') => [
  {
    find: REACT_IMPORT_PATTERN,
    replacement: sourcePath(`../../${packageName}/node_modules/react/index.js`),
  },
  {
    find: REACT_JSX_DEV_RUNTIME_PATTERN,
    replacement: sourcePath(`../../${packageName}/node_modules/react/jsx-dev-runtime.js`),
  },
  {
    find: REACT_JSX_RUNTIME_PATTERN,
    replacement: sourcePath(`../../${packageName}/node_modules/react/jsx-runtime.js`),
  },
];

export const defineSmartSuggestVitestConfig = ({
  environment,
  include = ['tests/**/*.test.ts'],
  packages = [],
  reactSingletonFrom,
}: SmartSuggestVitestOptions) =>
  defineConfig({
    resolve: {
      alias: [
        shellApiAlias,
        ...(reactSingletonFrom ? reactSingletonAliases(reactSingletonFrom) : []),
        ...packages.flatMap(packageAliases),
      ],
      ...(reactSingletonFrom ? { dedupe: ['react', 'react-dom'] } : {}),
    },
    test: {
      environment,
      include,
      passWithNoTests: true,
      restoreMocks: true,
      typecheck: { tsconfig: '../tsconfig.vitest.json' },
    },
  });
