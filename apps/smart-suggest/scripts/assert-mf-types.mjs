import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedContractPath = path.join(root, '.modernjs/ultramodern-generated-contract.json');
const generatedContract = fs.existsSync(generatedContractPath)
  ? JSON.parse(fs.readFileSync(generatedContractPath, 'utf-8'))
  : undefined;
const contractAppDirs = Array.isArray(generatedContract?.apps)
  ? generatedContract.apps
      .map((app) => (typeof app.path === 'string' ? app.path : undefined))
      .filter((appPath) => appPath !== undefined)
  : [];
const shellAppDirs = Array.isArray(generatedContract?.apps)
  ? generatedContract.apps
      .filter((app) => app.kind === 'shell')
      .map((app) => (typeof app.path === 'string' ? app.path : undefined))
      .filter((appPath) => appPath !== undefined)
  : [];
const defaultAppDirs = (shellAppDirs.length > 0 ? shellAppDirs : contractAppDirs)
  .filter((appPath) => fs.existsSync(path.join(root, appPath, 'module-federation.config.ts')))
  .filter((appPath, index, appPaths) => appPaths.indexOf(appPath) === index);

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`Usage:
  node scripts/assert-mf-types.mjs [app-dir...]

Checks that every Module Federation remote with exposed modules emitted a non-empty dist/@mf-types.zip archive and uses the workspace TypeScript compiler.
`);
  process.exit(0);
}

const candidateDirs = args;
const appDirs = candidateDirs.length
  ? candidateDirs
  : fs.existsSync(path.join(root, 'module-federation.config.ts'))
    ? ['.']
    : defaultAppDirs;

const configHasExposes = (configPath) => {
  const config = fs.readFileSync(configPath, 'utf-8');
  const exposesMatch = /exposes\s*:\s*\{(?<body>[\s\S]*?)\}/u.exec(config);
  const exposesBody = exposesMatch?.groups?.body;

  return exposesBody !== undefined && exposesBody.trim() !== '';
};

for (const appDir of appDirs) {
  const configPath = path.join(root, appDir, 'module-federation.config.ts');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing Module Federation config: ${path.relative(root, configPath)}`);
  }

  const contractEntry = generatedContract?.apps?.find(
    (app) => app.path === appDir.replace(/\\/g, '/'),
  );
  if (contractEntry && contractEntry.moduleFederation?.dts?.compilerInstance !== 'tsgo') {
    throw new Error(`Module Federation DTS must use the workspace TypeScript compiler: ${appDir}`);
  }
  if (
    contractEntry &&
    contractEntry.moduleFederation?.dts?.tsConfigPath !== './tsconfig.mf-types.json'
  ) {
    throw new Error(`Module Federation DTS must use the dedicated type config: ${appDir}`);
  }

  const exposes = contractEntry?.moduleFederation?.exposes;
  const hasExposes = Array.isArray(exposes) ? exposes.length > 0 : configHasExposes(configPath);

  if (!hasExposes) {
    continue;
  }

  const typesArchivePath = path.join(root, appDir, 'dist/@mf-types.zip');
  if (!fs.existsSync(typesArchivePath)) {
    throw new Error(
      `Missing Module Federation DTS archive: ${path.relative(root, typesArchivePath)}`,
    );
  }

  const stats = fs.statSync(typesArchivePath);
  if (stats.size === 0) {
    throw new Error(
      `Empty Module Federation DTS archive: ${path.relative(root, typesArchivePath)}`,
    );
  }
}
