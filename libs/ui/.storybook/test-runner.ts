import { createA11yReporter } from '@techsio/storybook-a11y-reporter';
import type { TestRunnerConfig } from '@storybook/test-runner';

function readBoolEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  return defaultValue;
}

function readNumberEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

type JestConfig = {
  modulePathIgnorePatterns?: string[];
  testTimeout?: number;
  [key: string]: unknown;
};

type TestRunnerConfigWithJest = TestRunnerConfig & {
  getJestConfig: (config: JestConfig) => JestConfig;
};

const reporter = createA11yReporter({
  outputDir: process.env.A11Y_REPORT_OUTPUT_DIR ?? 'a11y-report',
  failOnViolations: readBoolEnv('A11Y_REPORT_FAIL_ON_VIOLATIONS', true),
  writeJUnit: readBoolEnv('A11Y_REPORT_WRITE_JUNIT', true),
  waitForResultsMs: readNumberEnv('A11Y_REPORT_WAIT_MS', 30000),
});

const testRunnerConfig: TestRunnerConfigWithJest = {
  ...reporter,
  getJestConfig(config) {
    return {
      ...config,
      testTimeout: 60000,
      modulePathIgnorePatterns: [
        ...(config.modulePathIgnorePatterns ?? []),
        '<rootDir>/.schaltwerk',
        '<rootDir>/.nx',
      ],
    };
  },
};

export default testRunnerConfig;
