import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDirectory, '../..');
const validatorScript = path.join(
  appRoot,
  'scripts/validate-smart-suggest-cloudflare-bindings.mjs',
);
const temporaryRoots = new Set();
const expectedManifestUrl = 'https://smart.example.test/smart-suggest-owned-data/manifest.json';

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { force: true, recursive: true });
  }
  temporaryRoots.clear();
});

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudflare-bindings-test-'));
  temporaryRoots.add(root);
  return root;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function cleanManifestEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  delete env.SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL;
  delete env.ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP;
  delete env.MODERN_PUBLIC_SITE_URL;
  delete env.ULTRAMODERN_CLOUDFLARE_WORKERS_DEV_SUBDOMAIN;

  return { ...env, ...overrides };
}

function copyValidator(workspaceRoot) {
  const scriptOut = path.join(
    workspaceRoot,
    'apps/smart-suggest/scripts/validate-smart-suggest-cloudflare-bindings.mjs',
  );

  fs.mkdirSync(path.dirname(scriptOut), { recursive: true });
  fs.copyFileSync(validatorScript, scriptOut);

  return scriptOut;
}

function writeOutputFixture(workspaceRoot, manifestUrl) {
  const shellRoot = path.join(workspaceRoot, 'apps/smart-suggest/apps/shell-super-app');
  const vars = {
    SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE: 'false',
    SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS: 'false',
  };

  if (manifestUrl !== undefined) {
    vars.SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL = manifestUrl;
  }

  writeFile(
    path.join(shellRoot, '.output/wrangler.json'),
    `${JSON.stringify(
      {
        assets: {
          binding: 'ASSETS',
          html_handling: 'none',
        },
        main: 'server/index.mjs',
        name: 'shell-super-app',
        vars,
      },
      null,
      2,
    )}\n`,
  );
  writeFile(
    path.join(shellRoot, '.output/server/index.mjs'),
    [
      'export default {',
      '  fetch(request, env) {',
      '    return env.ASSETS.fetch(request);',
      '  },',
      '};',
      '',
    ].join('\n'),
  );
  writeFile(path.join(shellRoot, '.output/public/sdk/demo.html'), '<!doctype html>\n');
}

function runValidator(scriptPath, env) {
  return spawnSync(
    process.execPath,
    [scriptPath, '--app', 'shell-super-app', '--artifact-static'],
    {
      cwd: path.dirname(scriptPath),
      encoding: 'utf8',
      env,
    },
  );
}

describe('validate-smart-suggest-cloudflare-bindings artifact manifest validation', () => {
  it('requires an environment-derived artifact manifest URL for static artifacts', () => {
    const root = temporaryRoot();
    const scriptPath = copyValidator(root);
    writeOutputFixture(root, expectedManifestUrl);

    const result = runValidator(scriptPath, cleanManifestEnv());
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '--artifact-static needs SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL',
    );
  });

  it('passes when generated config matches the environment-derived manifest URL', () => {
    const root = temporaryRoot();
    const scriptPath = copyValidator(root);
    writeOutputFixture(root, expectedManifestUrl);

    const result = runValidator(
      scriptPath,
      cleanManifestEnv({ MODERN_PUBLIC_SITE_URL: 'https://smart.example.test/storefront' }),
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Validated Smart Suggest Cloudflare config');
    expect(result.stderr).toBe('');
  });

  it('fails when generated config manifest URL does not match the environment-derived URL', () => {
    const root = temporaryRoot();
    const scriptPath = copyValidator(root);
    writeOutputFixture(root, 'https://wrong.example.test/smart-suggest-owned-data/manifest.json');

    const result = runValidator(
      scriptPath,
      cleanManifestEnv({ MODERN_PUBLIC_SITE_URL: 'https://smart.example.test/storefront' }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL mismatch');
    expect(result.stderr).toContain(`Expected ${expectedManifestUrl}`);
  });
});
