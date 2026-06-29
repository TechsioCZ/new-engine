import { defineConfig } from 'oxlint';
import core from 'ultracite/oxlint/core';
import react from 'ultracite/oxlint/react';

export default defineConfig({
  extends: [core, react],
  ignorePatterns: [
    '.agents',
    '.output',
    'dist',
    'node_modules',
    'repos/**',
    '.modern',
    '.modernjs',
    '**/modern-tanstack/**',
    '**/routeTree.gen.*',
    'apps/*/sdk/*.js',
  ],
  overrides: [
    {
      files: ['apps/*/src/**/*.d.ts'],
      rules: {
        'no-redeclare': 'off',
      },
    },
    {
      files: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.ts'],
      env: {
        browser: true,
      },
      globals: {
        ULTRAMODERN_SITE_URL: 'readonly',
      },
      rules: {
        'no-undef': 'error',
      },
    },
    {
      files: [
        '*.config.{ts,mjs}',
        'scripts/**/*.mjs',
        'apps/*/*.config.{ts,mjs}',
        'apps/*/api/**/*.ts',
        'apps/*/shared/**/*.ts',
        'apps/*/tests/**/*.ts',
        'packages/*/*.config.{ts,mjs}',
        'packages/*/tests/**/*.ts',
      ],
      env: {
        node: true,
      },
      rules: {
        'no-undef': 'error',
      },
    },
  ],
});
