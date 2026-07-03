#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const parsed = {
    app: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--app') {
      parsed.app = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!(parsed.app || parsed.help)) {
    throw new Error('Missing required --app argument.');
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/prepare-smart-suggest-sdk.mjs --app shell-super-app

Builds @techsio/smart-suggest-vanilla and writes the public SDK module to
  apps/<app>/sdk/techsio-smart-suggest.js. The generated asset installs
window.TechsioSmartSuggest when loaded with <script type="module">.
`);
}

function assertInside(parent, child) {
  if (child !== parent && !child.startsWith(parent + path.sep)) {
    throw new Error(`Path escaped expected root: ${child}`);
  }
}

function writeBundleConfig(configPath, entryPath) {
  fs.writeFileSync(
    configPath,
    `import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: { entry: { index: ${JSON.stringify(entryPath)} } },
  lib: [{ bundle: true, autoExternal: false, dts: false, format: 'esm' }],
  output: { target: 'web' },
});
`,
  );
}

function copySdkBundle(bundleOutputDir, sdkOutputDir, sdkOutput) {
  fs.rmSync(sdkOutput, { force: true });

  for (const entry of fs.readdirSync(sdkOutputDir)) {
    if ((entry.endsWith('.js') && entry !== 'demo.html') || entry === 'demo') {
      fs.rmSync(path.join(sdkOutputDir, entry), { force: true });
    }
  }

  for (const entry of fs.readdirSync(bundleOutputDir)) {
    if (!entry.endsWith('.js')) {
      continue;
    }

    const sourcePath = path.join(bundleOutputDir, entry);
    const targetPath = path.join(
      sdkOutputDir,
      entry === 'index.js' ? 'techsio-smart-suggest.js' : entry,
    );
    fs.copyFileSync(sourcePath, targetPath);
  }
  const demoHtmlPath = path.join(sdkOutputDir, 'demo.html');
  if (fs.existsSync(demoHtmlPath)) {
    fs.copyFileSync(demoHtmlPath, path.join(sdkOutputDir, 'demo'));
  }
}

function sdkJavaScriptFiles(sdkOutputDir) {
  return fs
    .readdirSync(sdkOutputDir)
    .filter((entry) => entry.endsWith('.js') && entry !== 'demo.html')
    .map((entry) => path.join(sdkOutputDir, entry));
}

function formatSdkBundle(sdkOutputDir) {
  const files = sdkJavaScriptFiles(sdkOutputDir);

  if (files.length === 0) {
    throw new Error(`No JavaScript files were generated in ${sdkOutputDir}.`);
  }

  execFileSync('pnpm', ['exec', 'oxfmt', ...files], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  const appRoot = path.resolve(workspaceRoot, 'apps', args.app);
  assertInside(path.resolve(workspaceRoot, 'apps'), appRoot);

  const vanillaEntry = path.resolve(
    workspaceRoot,
    '../../libs/smart-suggest/vanilla/src/vanilla.ts',
  );
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-suggest-sdk-'));
  const bundleConfig = path.join(tempRoot, 'rslib.config.ts');
  const bundleOutputDir = path.join(tempRoot, 'dist');
  const sdkOutputDir = path.join(appRoot, 'sdk');
  const sdkOutput = path.join(sdkOutputDir, 'techsio-smart-suggest.js');

  try {
    writeBundleConfig(bundleConfig, vanillaEntry);

    execFileSync(
      'pnpm',
      [
        '--filter',
        '@techsio/smart-suggest-vanilla',
        'exec',
        'rslib',
        'build',
        '--config',
        bundleConfig,
        '--dist-path',
        bundleOutputDir,
        '--clean',
      ],
      {
        cwd: workspaceRoot,
        stdio: 'inherit',
      },
    );

    fs.mkdirSync(sdkOutputDir, { recursive: true });
    copySdkBundle(bundleOutputDir, sdkOutputDir, sdkOutput);

    const source = fs.readFileSync(sdkOutput, 'utf-8');
    fs.writeFileSync(
      sdkOutput,
      `${source}

if (typeof window !== 'undefined') {
  installSmartSuggestGlobal(window);
}
`,
    );
    formatSdkBundle(sdkOutputDir);
  } finally {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }

  process.stdout.write(`Prepared Smart Suggest SDK: ${path.relative(workspaceRoot, sdkOutput)}\n`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
