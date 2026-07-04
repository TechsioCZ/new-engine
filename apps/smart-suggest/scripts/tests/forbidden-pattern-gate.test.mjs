import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDirectory, '../..');
const gateScript = path.join(appRoot, 'scripts/smart-suggest-forbidden-pattern-gate.mjs');
const filePatternsModule = path.join(appRoot, 'scripts/lib/file-patterns.mjs');
const temporaryRoots = new Set();

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { force: true, recursive: true });
  }
  temporaryRoots.clear();
});

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forbidden-pattern-gate-test-'));
  temporaryRoots.add(root);
  return root;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function copyForbiddenGate(workspaceRoot) {
  const scriptOut = path.join(
    workspaceRoot,
    'apps/smart-suggest/scripts/smart-suggest-forbidden-pattern-gate.mjs',
  );
  const patternsOut = path.join(workspaceRoot, 'apps/smart-suggest/scripts/lib/file-patterns.mjs');

  fs.mkdirSync(path.dirname(scriptOut), { recursive: true });
  fs.mkdirSync(path.dirname(patternsOut), { recursive: true });
  fs.copyFileSync(gateScript, scriptOut);
  fs.copyFileSync(filePatternsModule, patternsOut);

  return scriptOut;
}

function runGate(scriptPath) {
  return spawnSync(process.execPath, [scriptPath, '--format', 'json', '--no-report'], {
    cwd: path.dirname(scriptPath),
    encoding: 'utf8',
  });
}

describe('smart-suggest-forbidden-pattern-gate', () => {
  it('reports planted runtime violations, skips test-file exclusions, and preserves JSON report shape', () => {
    const root = temporaryRoot();
    const scriptPath = copyForbiddenGate(root);
    const appRuntimeRoot = path.join(
      root,
      'apps/smart-suggest/apps/shell-super-app/src/features/search',
    );

    writeFile(
      path.join(appRuntimeRoot, 'accumulator.ts'),
      [
        'export function collect() {',
        '  const suggestions = [];',
        "  suggestions.push({ id: 'from-api' });",
        '  return suggestions;',
        '}',
        '',
      ].join('\n'),
    );
    writeFile(
      path.join(appRuntimeRoot, 'nested/static-suggestions.ts'),
      [
        'export const suggestions = [',
        "  { id: 'local-fixture', label: 'Fixture address' },",
        '];',
        '',
      ].join('\n'),
    );
    writeFile(
      path.join(appRuntimeRoot, 'ignored-static-suggestions.test.ts'),
      [
        'export const suggestions = [',
        "  { id: 'test-only-fixture', label: 'Test fixture address' },",
        '];',
        '',
      ].join('\n'),
    );

    const result = runGate(scriptPath);
    expect(result.status).toBe(1);

    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      profile: 'smart-suggest-production-readiness-forbidden-pattern-gate-v1',
      status: 'fail',
      scanned: expect.objectContaining({
        appRuntimeFiles: 2,
        testFiles: expect.any(Number),
      }),
    });
    expect(report.checkedAt).toEqual(expect.any(String));
    expect(report.findings.length).toBeGreaterThan(0);

    const staticSuggestionFindings = report.findings.filter(
      (finding) => finding.ruleId === 'static-suggestion-array-in-app',
    );
    expect(staticSuggestionFindings).toEqual([
      expect.objectContaining({
        column: expect.any(Number),
        file: 'apps/smart-suggest/apps/shell-super-app/src/features/search/nested/static-suggestions.ts',
        line: expect.any(Number),
        message: expect.any(String),
        severity: 'error',
      }),
    ]);
    expect(report.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'apps/smart-suggest/apps/shell-super-app/src/features/search/accumulator.ts',
          ruleId: 'static-suggestion-array-in-app',
        }),
      ]),
    );
    expect(report.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'apps/smart-suggest/apps/shell-super-app/src/features/search/ignored-static-suggestions.test.ts',
          ruleId: 'static-suggestion-array-in-app',
        }),
      ]),
    );
  });
});
