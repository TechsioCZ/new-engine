#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
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

  if (!parsed.app && !parsed.help) {
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

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  const appRoot = path.resolve(workspaceRoot, 'apps', args.app);
  assertInside(path.resolve(workspaceRoot, 'apps'), appRoot);

  execFileSync('pnpm', ['--filter', '@techsio/smart-suggest-vanilla', 'build'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  const vanillaOutput = path.resolve(
    workspaceRoot,
    '../../libs/smart-suggest/vanilla/dist/index.js',
  );
  const sdkOutputDir = path.join(appRoot, 'sdk');
  const sdkOutput = path.join(sdkOutputDir, 'techsio-smart-suggest.js');
  const source = fs.readFileSync(vanillaOutput, 'utf-8');
  const publicModule = `${source}

if (typeof window !== 'undefined') {
  installSmartSuggestGlobal(window);
}
`;

  fs.mkdirSync(sdkOutputDir, { recursive: true });
  fs.writeFileSync(sdkOutput, publicModule);
  process.stdout.write(`Prepared Smart Suggest SDK: ${path.relative(workspaceRoot, sdkOutput)}\n`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
