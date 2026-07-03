#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const workspaceRoot = process.env.ULTRAMODERN_WORKSPACE_ROOT ?? process.cwd();
const driftOnly = process.argv.includes('--drift-only');
const failures = [];

const ignoredDirectories = new Set([
  '.git',
  '.modern',
  '.output',
  'coverage',
  'dist',
  'node_modules',
  'repos',
]);

const normalize = (filePath) => filePath.split(path.sep).join('/');
const relative = (filePath) => normalize(path.relative(workspaceRoot, filePath));
const exists = (relativePath) => fs.existsSync(path.join(workspaceRoot, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) {
    fail(message);
  }
};

const resolveWorkspacePath = (relativePath) => path.resolve(workspaceRoot, relativePath);
const displayPath = (relativePath) =>
  normalize(path.relative(workspaceRoot, resolveWorkspacePath(relativePath)));
const requireFromWorkspace = createRequire(path.join(workspaceRoot, 'package.json'));

const omittedTypeScriptNodeKeys = new Set([
  'amdDependencies',
  'ambientModuleNames',
  'bindDiagnostics',
  'checkJsDirective',
  'classifiableNames',
  'commentDirectives',
  'emitNode',
  'end',
  'endFlowNode',
  'externalModuleIndicator',
  'fileName',
  'hasExtendedUnicodeEscape',
  'id',
  'identifiers',
  'impliedNodeFormat',
  'imports',
  'isDeclarationFile',
  'jsDoc',
  'languageVariant',
  'languageVersion',
  'libReferenceDirectives',
  'localSymbol',
  'locals',
  'maybeBind',
  'modifierFlagsCache',
  'moduleAugmentations',
  'nextContainer',
  'nodeCount',
  'original',
  'originalFileName',
  'packageJsonLocations',
  'packageJsonScope',
  'parent',
  'parseDiagnostics',
  'path',
  'pos',
  'pragmas',
  'referencedFiles',
  'resolvedPath',
  'scriptKind',
  'setExternalModuleIndicator',
  'singleQuote',
  'symbol',
  'symbolCount',
  'transformFlags',
  'typeReferenceDirectives',
]);

const loadTypeScript = () => {
  try {
    return requireFromWorkspace('typescript');
  } catch (error) {
    fail(
      `Unable to load TypeScript for structured API drift checks (${error instanceof Error ? error.message : String(error)}).`,
    );
    return undefined;
  }
};

const isTypeScriptNode = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.kind === 'number' &&
  typeof value.pos === 'number' &&
  typeof value.end === 'number';

const serializeTypeScriptValue = (typescript, value) => {
  if (value === undefined || typeof value === 'function') {
    return undefined;
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => serializeTypeScriptValue(typescript, item))
      .filter((item) => item !== undefined);
  }

  if (!isTypeScriptNode(value)) {
    return undefined;
  }

  const serialized = {
    kind: typescript.SyntaxKind[value.kind] ?? String(value.kind),
  };

  for (const key of Object.keys(value).sort()) {
    if (omittedTypeScriptNodeKeys.has(key)) {
      continue;
    }

    if (key === 'text' && value.kind === typescript.SyntaxKind.SourceFile) {
      continue;
    }

    const item = serializeTypeScriptValue(typescript, value[key]);
    if (item !== undefined) {
      serialized[key] = item;
    }
  }

  return serialized;
};

const canonicalTypeScriptAst = (typescript, relativePath) => {
  const absolutePath = resolveWorkspacePath(relativePath);
  const label = displayPath(relativePath);

  if (!fs.existsSync(absolutePath)) {
    fail(`${label}: API contract drift check target is missing.`);
    return undefined;
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  const sourceFile = typescript.createSourceFile(
    label,
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS,
  );

  if (sourceFile.parseDiagnostics.length > 0) {
    for (const diagnostic of sourceFile.parseDiagnostics) {
      const position =
        diagnostic.start === undefined
          ? undefined
          : sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
      const location =
        position === undefined ? '' : `:${position.line + 1}:${position.character + 1}`;
      const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      fail(
        `${label}${location}: TypeScript parse error during API contract drift check: ${message}`,
      );
    }
    return undefined;
  }

  return JSON.stringify(serializeTypeScriptValue(typescript, sourceFile));
};

const astHash = (canonicalAst) =>
  createHash('sha256').update(canonicalAst).digest('hex').slice(0, 16);

const assertSameTypeScriptAst = (typescript, leftPath, rightPath) => {
  const leftAst = canonicalTypeScriptAst(typescript, leftPath);
  const rightAst = canonicalTypeScriptAst(typescript, rightPath);

  if (leftAst === undefined || rightAst === undefined) {
    return;
  }

  assert(
    leftAst === rightAst,
    `${displayPath(leftPath)} must stay structurally in sync with ${displayPath(rightPath)} (AST hashes ${astHash(leftAst)} != ${astHash(rightAst)}).`,
  );
};

const listTypeScriptFiles = (relativeDirectory) => {
  const absoluteDirectory = resolveWorkspacePath(relativeDirectory);

  if (!fs.existsSync(absoluteDirectory)) {
    fail(`${displayPath(relativeDirectory)}: API contract drift check directory is missing.`);
    return [];
  }

  return fs
    .readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.posix.join(normalize(relativeDirectory), entry.name))
    .sort();
};

const assertSameTypeScriptDirectoryAst = (typescript, leftDirectory, rightDirectory) => {
  const leftFiles = listTypeScriptFiles(leftDirectory);
  const rightFiles = listTypeScriptFiles(rightDirectory);
  const leftNames = leftFiles.map((file) => path.posix.basename(file));
  const rightNames = rightFiles.map((file) => path.posix.basename(file));

  assert(
    JSON.stringify(leftNames) === JSON.stringify(rightNames),
    `${displayPath(leftDirectory)} must contain the same TypeScript files as ${displayPath(rightDirectory)}.`,
  );

  for (const fileName of leftNames.filter((name) => rightNames.includes(name))) {
    assertSameTypeScriptAst(
      typescript,
      path.posix.join(normalize(leftDirectory), fileName),
      path.posix.join(normalize(rightDirectory), fileName),
    );
  }
};

const assertSmartSuggestApiContractDriftGate = () => {
  const typescript = loadTypeScript();
  if (typescript === undefined) {
    return;
  }

  assertSameTypeScriptAst(
    typescript,
    'apps/shell-super-app/shared/api.ts',
    '../../libs/smart-suggest/client/src/api.ts',
  );
  assertSameTypeScriptDirectoryAst(
    typescript,
    'apps/shell-super-app/shared/smart-suggest-api-errors',
    '../../libs/smart-suggest/client/src/smart-suggest-api-errors',
  );
};

assertSmartSuggestApiContractDriftGate();

if (driftOnly) {
  if (failures.length > 0) {
    console.error('Smart Suggest API contract drift check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Smart Suggest API contract drift check passed.');
  process.exit(0);
}

const publicEffectServerExports = [
  'createEffectBffEdgeHandler',
  'createEffectBffTestHandler',
  'dispatchEffectBffRequest',
];

const assertPublicEffectBffServerApi = (ownerPath) => {
  const packageJsonPath = `${ownerPath}/package.json`;
  if (!exists(packageJsonPath)) {
    return;
  }

  const requireFromOwner = createRequire(path.join(workspaceRoot, packageJsonPath));

  try {
    requireFromOwner.resolve('@modern-js/plugin-bff/effect-server');
    const effectServer = requireFromOwner('@modern-js/plugin-bff/effect-server');
    for (const exportName of publicEffectServerExports) {
      assert(
        typeof effectServer[exportName] === 'function',
        `${ownerPath}: @modern-js/plugin-bff/effect-server must expose ${exportName}.`,
      );
    }
  } catch (error) {
    fail(
      `${ownerPath}: @modern-js/plugin-bff/effect-server must be a public package export (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
};

const listFiles = (startDirectory) => {
  const absoluteStart = path.join(workspaceRoot, startDirectory);
  if (!fs.existsSync(absoluteStart)) {
    return [];
  }

  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      const absoluteEntry = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absoluteEntry);
        continue;
      }

      if (entry.isFile()) {
        files.push(relative(absoluteEntry));
      }
    }
  };

  visit(absoluteStart);
  return files;
};

const listDirectories = (startDirectory) => {
  const absoluteStart = path.join(workspaceRoot, startDirectory);
  if (!fs.existsSync(absoluteStart)) {
    return [];
  }

  return fs
    .readdirSync(absoluteStart, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name))
    .map((entry) => path.posix.join(startDirectory, entry.name));
};

const assertNoPath = (relativePath, message) => {
  if (exists(relativePath)) {
    fail(message);
  }
};

const assertContains = (relativePath, content, pattern, message) => {
  assert(pattern.test(content), `${relativePath}: ${message}`);
};

const assertNotContains = (relativePath, content, pattern, message) => {
  assert(!pattern.test(content), `${relativePath}: ${message}`);
};

const generatedFiles = [...listFiles('apps'), ...listFiles('verticals'), ...listFiles('packages')];

for (const forbiddenPath of [
  'apps/shell-super-app/api/effect',
  'apps/shell-super-app/api/lambda',
  'apps/shell-super-app/shared/effect',
  'apps/shell-super-app/src/effect',
  ...listDirectories('verticals').flatMap((verticalPath) => [
    `${verticalPath}/api/effect`,
    `${verticalPath}/api/lambda`,
    `${verticalPath}/shared/effect`,
    `${verticalPath}/src/effect`,
  ]),
]) {
  assertNoPath(
    forbiddenPath,
    `${forbiddenPath} is forbidden in UltraModern strictEffectApproach workspaces; use api/index.ts, shared/api.ts and src/api/* instead.`,
  );
}

const textFiles = generatedFiles.filter((file) =>
  /\.(?:[cm]?[jt]sx?|json|md|mjs|mts|cts)$/u.test(file),
);

for (const file of textFiles) {
  const content = readText(file);

  if (/\/api\//u.test(file) && !/\.test\.[cm]?[jt]sx?$/u.test(file)) {
    assertNotContains(
      file,
      content,
      /\bnew\s+Response\s*\(|\bResponse\.json\s*\(/u,
      'API modules must not hand-build Response objects; model the endpoint through Effect HttpApi and schemas.',
    );
    assertNotContains(
      file,
      content,
      /\brequest\.(?:json|text|formData|arrayBuffer)\s*\(/u,
      'API modules must not manually parse request bodies; use HttpApiEndpoint payload/query/params schemas.',
    );
    assertNotContains(
      file,
      content,
      /\bexport\s+const\s+handler\b|\bexport\s+default\s+async\b/u,
      'API modules must not export raw request handlers; export defineEffectBff(...) from api/index.ts.',
    );
    assertNotContains(
      file,
      content,
      /\bcreateHandler\s*[:=]\s*(?!defineEffectBff\b)/u,
      'API modules must not define unbranded handler factories; use defineEffectBff(...).',
    );
  }

  assertNotContains(
    file,
    content,
    /@modern-js\/plugin-bff\/hono-server/u,
    'Hono server helpers are not part of generated UltraModern API workspaces.',
  );
  assertNotContains(
    file,
    content,
    /runtimeFramework:\s*['"]hono['"]/u,
    'Generated UltraModern API apps must use the Effect runtime.',
  );
}

const apiOwners = [
  ...(exists('apps/shell-super-app/api/index.ts') ? ['apps/shell-super-app'] : []),
  ...listDirectories('verticals'),
];

for (const ownerPath of apiOwners) {
  const apiEntry = `${ownerPath}/api/index.ts`;
  const sharedApi = `${ownerPath}/shared/api.ts`;
  const srcApiDirectory = `${ownerPath}/src/api`;
  const modernConfig = `${ownerPath}/modern.config.ts`;
  const packageJsonPath = `${ownerPath}/package.json`;

  assertPublicEffectBffServerApi(ownerPath);

  assert(exists(apiEntry), `${apiEntry} is required.`);
  assert(exists(sharedApi), `${sharedApi} is required.`);
  assert(exists(srcApiDirectory), `${srcApiDirectory} is required.`);

  if (exists(srcApiDirectory)) {
    const clientFiles = listFiles(srcApiDirectory).filter((file) => /-client\.ts$/u.test(file));
    assert(clientFiles.length > 0, `${srcApiDirectory} must contain a generated API client.`);
  }

  if (exists(apiEntry)) {
    const entry = readText(apiEntry);
    assertContains(
      apiEntry,
      entry,
      /\bdefineEffectBff\b/u,
      'must export a defineEffectBff(...) runtime definition.',
    );
    assertContains(
      apiEntry,
      entry,
      /\bHttpApiBuilder\b/u,
      'must implement handlers through HttpApiBuilder.',
    );
    assertContains(apiEntry, entry, /\bLayer\b/u, 'must compose dependencies with Effect Layer.');
    assertContains(
      apiEntry,
      entry,
      /from ['"]\.\.\/shared\/api\.ts['"]/u,
      'must import the contract from ../shared/api.ts.',
    );
  }

  if (exists(sharedApi)) {
    const contract = readText(sharedApi);
    assertContains(sharedApi, contract, /\bHttpApi\.make\b/u, 'must declare the HttpApi contract.');
    assertContains(sharedApi, contract, /\bHttpApiGroup\.make\b/u, 'must declare HttpApi groups.');
    assertContains(
      sharedApi,
      contract,
      /\bHttpApiEndpoint\./u,
      'must declare endpoints through HttpApiEndpoint.',
    );
    assertContains(
      sharedApi,
      contract,
      /\bSchema\./u,
      'must use Schema for request, response and error shapes.',
    );
  }

  if (exists(modernConfig)) {
    const config = readText(modernConfig);
    assertContains(
      modernConfig,
      config,
      /runtimeFramework:\s*['"]effect['"]/u,
      'must use bff.runtimeFramework: effect.',
    );
    assertContains(
      modernConfig,
      config,
      /entry:\s*['"]\.\/api\/index['"]/u,
      'must point bff.effect.entry at ./api/index.',
    );
    assertContains(
      modernConfig,
      config,
      /strictEffectApproach:\s*true/u,
      'must enable strictEffectApproach explicitly.',
    );
  }

  if (exists(packageJsonPath)) {
    const packageJson = JSON.parse(readText(packageJsonPath));
    assert(
      packageJson.exports?.['./api'] === './shared/api.ts',
      `${packageJsonPath}: package must export ./api from shared/api.ts.`,
    );
    assert(
      typeof packageJson.exports?.['./api/client'] === 'string' &&
        packageJson.exports['./api/client'].startsWith('./src/api/'),
      `${packageJsonPath}: package must export ./api/client from src/api/*.`,
    );
    assert(
      packageJson.exports?.['./effect/client'] === undefined &&
        packageJson.exports?.['./shared/effect/api'] === undefined,
      `${packageJsonPath}: old nested Effect exports are forbidden.`,
    );
  }
}

if (exists('apps/shell-super-app/package.json')) {
  const shellPackageJson = JSON.parse(readText('apps/shell-super-app/package.json'));
  assert(
    shellPackageJson.exports?.['./api/clients'] === './src/api/vertical-clients.ts',
    'apps/shell-super-app/package.json must export ./api/clients.',
  );
}

if (exists('package.json')) {
  const rootPackageJson = JSON.parse(readText('package.json'));
  assert(
    rootPackageJson.scripts?.['api:check'] ===
      'node ./scripts/check-ultramodern-api-boundaries.mjs',
    'Root package.json must expose api:check.',
  );
  assert(
    rootPackageJson.scripts?.check?.includes('pnpm api:check'),
    'Root check script must include pnpm api:check.',
  );
}

if (exists('.modernjs/ultramodern.json')) {
  const config = JSON.parse(readText('.modernjs/ultramodern.json'));
  const rootPackageJson = exists('package.json') ? JSON.parse(readText('package.json')) : {};
  const modernCreateSpecifier =
    rootPackageJson.devDependencies?.['@modern-js/create'] ??
    rootPackageJson.dependencies?.['@modern-js/create'];
  const expectedModernPackageVersion = /^npm:@bleedingdev\/modern-js-create@(?<version>.+)$/u.exec(
    modernCreateSpecifier ?? '',
  )?.groups?.version;
  assert(
    typeof expectedModernPackageVersion === 'string',
    'Root package.json must install @modern-js/create from the bleedingdev UltraModern alias.',
  );
  assert(
    config.generator?.version === expectedModernPackageVersion,
    '.modernjs/ultramodern.json generator.version must match the UltraModern cohort.',
  );
  assert(
    config.packageSource?.modernPackageVersion === expectedModernPackageVersion,
    '.modernjs/ultramodern.json packageSource.modernPackageVersion must match the UltraModern cohort.',
  );

  for (const app of config.topology?.apps ?? []) {
    if (app.api?.runtime === 'effect') {
      assert(
        app.api.bff?.strictEffectApproach === true,
        `${app.id} topology must mark strictEffectApproach as true.`,
      );
      assert(
        typeof app.api.serverEntry === 'string' && app.api.serverEntry.endsWith('/api/index.ts'),
        `${app.id} topology must use api/index.ts as the server entry.`,
      );
    }
    assert(
      !app.api?.effect,
      `${app.id} topology must describe the API directly, not under api.effect.`,
    );
  }
}

if (failures.length > 0) {
  console.error('UltraModern API boundary check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('UltraModern API boundary check passed.');
