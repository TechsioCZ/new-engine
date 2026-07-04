import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDirectory, '../..');
const boundaryScript = path.join(appRoot, 'scripts/check-ultramodern-api-boundaries.mjs');
const temporaryRoots = new Set();

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { force: true, recursive: true });
  }
  temporaryRoots.clear();
});

function temporaryWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-boundaries-test-'));
  temporaryRoots.add(root);
  return {
    appRoot: path.join(root, 'apps/smart-suggest'),
    root,
  };
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeApiContractFixture(appWorkspaceRoot, sharedApi, clientApi) {
  writeFile(path.join(appWorkspaceRoot, 'package.json'), '{"name":"api-boundary-fixture"}\n');
  writeFile(path.join(appWorkspaceRoot, 'apps/shell-super-app/shared/api.ts'), `${sharedApi}\n`);
  writeFile(
    path.resolve(appWorkspaceRoot, '../../libs/smart-suggest/client/src/api.ts'),
    `${clientApi}\n`,
  );
  writeFile(
    path.join(appWorkspaceRoot, 'apps/shell-super-app/shared/smart-suggest-api-errors/index.ts'),
    'export class SmartSuggestApiError extends Error {}\n',
  );
  writeFile(
    path.resolve(
      appWorkspaceRoot,
      '../../libs/smart-suggest/client/src/smart-suggest-api-errors/index.ts',
    ),
    'export   class   SmartSuggestApiError   extends   Error   {}\n',
  );
}

function runDriftOnly(appWorkspaceRoot) {
  return spawnSync(process.execPath, [boundaryScript, '--drift-only'], {
    cwd: appWorkspaceRoot,
    encoding: 'utf8',
  });
}

describe('check-ultramodern-api-boundaries drift-only mode', () => {
  it('does not report drift for formatting-only TypeScript differences', () => {
    const { appRoot: workspaceRoot } = temporaryWorkspace();

    writeApiContractFixture(
      workspaceRoot,
      [
        'export interface SearchRequest {',
        '  query: string;',
        '}',
        'export const endpoint = { method: "GET", path: "/api/search" } as const;',
      ].join('\n'),
      [
        'export interface SearchRequest{query:string}',
        "export const endpoint={method:'GET',path:'/api/search'} as const;",
      ].join('\n'),
    );

    const result = runDriftOnly(workspaceRoot);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Smart Suggest API contract drift check passed.');
    expect(result.stderr).toBe('');
  });

  it('reports drift for structurally different TypeScript contracts', () => {
    const { appRoot: workspaceRoot } = temporaryWorkspace();

    writeApiContractFixture(
      workspaceRoot,
      [
        'export interface SearchRequest {',
        '  query: string;',
        '}',
        'export const endpoint = { method: "GET", path: "/api/search" } as const;',
      ].join('\n'),
      [
        'export interface SearchRequest {',
        '  query: string;',
        '  limit: number;',
        '}',
        'export const endpoint = { method: "GET", path: "/api/search" } as const;',
      ].join('\n'),
    );

    const result = runDriftOnly(workspaceRoot);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Smart Suggest API contract drift check failed:');
    expect(result.stderr).toContain('must stay structurally in sync');
  });
});
