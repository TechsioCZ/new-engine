#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWranglerConfig = 'apps/shell-super-app/.output/wrangler.json';
const defaultReportRoot = '.codex/reports/smart-suggest-free-tier-readiness';
const defaultJsonOut = `${defaultReportRoot}/summary.json`;
const defaultProductionArtifactReport =
  '.codex/reports/smart-suggest-owned-artifacts/production.json';
const defaultArtifactPublicAssetsDir = 'apps/shell-super-app/smart-suggest-owned-data';
const staticAssetLimits = {
  fileMaxBytes: 25 * 1024 * 1024,
  fileMaxCount: 20_000,
};
const expectedCzVuscCodes = [
  '19',
  '27',
  '35',
  '43',
  '51',
  '60',
  '78',
  '86',
  '94',
  '108',
  '116',
  '124',
  '132',
  '141',
];
const freeTierLimits = {
  addressShardDatabaseMaxCount: 9,
  databaseMaxBytes: 500_000_000,
  databaseMaxCount: 10,
  workerGzipMaxKiB: 3 * 1024,
  totalDatabaseMaxBytes: 5_000_000_000,
};
const paidTierLimits = {
  workerGzipMaxKiB: 10 * 1024,
};
const workerMetafileTopChunkCount = 12;

function readOption(argv, optionName, defaultValue) {
  const index = argv.indexOf(optionName);

  if (index < 0) {
    return defaultValue;
  }
  if (argv[index + 1] === undefined || argv[index + 1].startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }

  return argv[index + 1];
}

function parseArgs(argv) {
  return {
    artifactReport: readOption(argv, '--artifact-report', defaultProductionArtifactReport),
    artifactPublicAssetsDir: readOption(
      argv,
      '--artifact-public-assets-dir',
      defaultArtifactPublicAssetsDir,
    ),
    cloudflareAccountAudit: argv.includes('--cloudflare-account-audit'),
    jsonOut: readOption(argv, '--json-out', defaultJsonOut),
    production: argv.includes('--production'),
    reportRoot: readOption(argv, '--report-root', defaultReportRoot),
    wranglerConfig: readOption(argv, '--wrangler-config', defaultWranglerConfig),
  };
}

function resolveAppPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(appRoot, filePath);
}

function appRelative(filePath) {
  return path.relative(appRoot, resolveAppPath(filePath)).split(path.sep).join('/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(resolveAppPath(filePath), 'utf8'));
}

function writeJson(filePath, value) {
  const absolutePath = resolveAppPath(filePath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function summarizePublicAssetFiles(directoryPath) {
  const root = resolveAppPath(directoryPath);
  let fileCount = 0;
  let totalSizeBytes = 0;
  let largestFile = { path: undefined, sizeBytes: 0 };

  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const sizeBytes = fs.statSync(entryPath).size;
      const relativePath = path.relative(root, entryPath).split(path.sep).join('/');
      fileCount += 1;
      totalSizeBytes += sizeBytes;

      if (sizeBytes > largestFile.sizeBytes) {
        largestFile = { path: relativePath, sizeBytes };
      }
    }
  };

  visit(root);

  return { fileCount, largestFile, totalSizeBytes };
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    Object.assign(error, { details });
    throw error;
  }
}

function redactLocalText(value) {
  return String(value)
    .replaceAll(/file:\/\/[^\s"']+/giu, '[redacted-file-url]')
    .replaceAll(/\/Users\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/\/private\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/\/var\/folders\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/\/tmp\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/[A-Z]:\\[^\s"']+/gu, '[redacted-local-path]');
}

function run(command, commandArgs, label, expectedExitCodes = [0]) {
  const result = spawnSync(command, commandArgs, {
    cwd: appRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
    maxBuffer: 30 * 1024 * 1024,
  });
  const exitCode = result.status ?? 1;

  assert(expectedExitCodes.includes(exitCode), `${label} failed.`, {
    args: commandArgs.map(redactLocalText),
    exitCode,
    stderr: redactLocalText(result.stderr),
    stdout: redactLocalText(result.stdout),
  });

  return {
    exitCode,
    stderr: result.stderr,
    stdout: result.stdout,
  };
}

function runIndexCapacityProof(reportRoot) {
  const jsonOut = `${reportRoot}/index-capacity.json`;

  run(
    process.execPath,
    ['./scripts/smart-suggest-index-capacity-proof.mjs', '--json-out', jsonOut],
    'Free-tier FTS index capacity proof',
  );

  return readJson(jsonOut);
}

function runD1Preflight(args) {
  const jsonOut = `${args.reportRoot}/d1-preflight${args.production ? '-production' : ''}.json`;
  const commandArgs = [
    './scripts/smart-suggest-d1-operations.mjs',
    'preflight',
    '--wrangler-config',
    args.wranglerConfig,
    '--d1-target',
    'remote',
    '--require-cz-vusc-coverage',
    '--max-d1-databases',
    String(freeTierLimits.databaseMaxCount),
    '--max-address-shard-databases',
    String(freeTierLimits.addressShardDatabaseMaxCount),
    '--json-out',
    jsonOut,
  ];

  run(process.execPath, commandArgs, 'Free-tier D1 preflight');

  return readJson(jsonOut);
}

function assertArtifactStaticWranglerConfig(wranglerConfig) {
  const vars = wranglerConfig.vars ?? {};
  const d1Databases = Array.isArray(wranglerConfig.d1_databases) ? wranglerConfig.d1_databases : [];

  assert(d1Databases.length === 0, 'Artifact-static profile must not carry corpus D1 bindings.', {
    actual: d1Databases.map((database) => database.binding),
  });
  assert(
    wranglerConfig.assets?.binding === 'ASSETS' && wranglerConfig.assets?.directory === './public',
    'Artifact-static profile must use Worker Static Assets.',
    { assets: wranglerConfig.assets },
  );
  assert(
    vars.SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL !== undefined &&
      /^https:\/\//u.test(vars.SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL),
    'Artifact-static profile must expose an HTTPS owned-data manifest URL.',
    { manifestUrl: vars.SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL ?? null },
  );
  assert(
    vars.SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE === 'false',
    'Artifact-static profile must reject incomplete owned-data artifacts.',
    { actual: vars.SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE ?? null },
  );
  assert(
    vars.SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS === 'false',
    'Artifact-static profile must not fall back to full address-record scans.',
    { actual: vars.SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS ?? null },
  );
}

function readArtifactPublicAssetsReport(args, artifactStaticProfile, _artifactReport) {
  if (!artifactStaticProfile) {
    return null;
  }

  const manifestPath = path.join(args.artifactPublicAssetsDir, 'manifest.json');
  assert(
    fs.existsSync(resolveAppPath(manifestPath)),
    'Artifact-static public asset manifest is missing.',
    {
      artifactPublicAssetsDir: args.artifactPublicAssetsDir,
      remediation: 'Run pnpm smart-suggest:artifacts:build:production before Cloudflare build.',
    },
  );

  const manifest = readJson(manifestPath);
  const assetSummary = summarizePublicAssetFiles(args.artifactPublicAssetsDir);

  assert(
    manifest.dataset?.complete === true,
    'Artifact-static public asset manifest must be complete.',
    {
      manifest: manifest.dataset,
    },
  );
  assert(
    assetSummary.fileCount <= staticAssetLimits.fileMaxCount,
    'Owned-data artifact file count must fit Worker Static Assets.',
    { actual: assetSummary.fileCount, max: staticAssetLimits.fileMaxCount },
  );
  assert(
    assetSummary.largestFile.sizeBytes <= staticAssetLimits.fileMaxBytes,
    'Owned-data artifact file size must fit Worker Static Assets.',
    { actual: assetSummary.largestFile, max: staticAssetLimits.fileMaxBytes },
  );

  return {
    artifact: {
      complete: manifest.dataset.complete,
      fileCount: assetSummary.fileCount,
      largestFile: assetSummary.largestFile,
      rowCount: manifest.dataset.rowCount,
      totalSizeBytes: assetSummary.totalSizeBytes,
    },
    manifestPath,
    publicPath: 'smart-suggest-owned-data/manifest.json',
    status: 'ok',
  };
}

function readProductionArtifactReport(args) {
  if (!args.production) {
    return null;
  }

  assert(
    fs.existsSync(resolveAppPath(args.artifactReport)),
    'Production artifact report is missing.',
    {
      artifactReport: args.artifactReport,
      remediation: 'Run pnpm smart-suggest:artifacts:build:production first.',
    },
  );

  return readJson(args.artifactReport);
}

function runWorkerSizeProof(args) {
  const outDir = '.codex/reports/smart-suggest-free-tier-readiness/wrangler-minify-proof';
  const metaFile = `${outDir}/meta.json`;
  const absoluteOutDir = resolveAppPath(outDir);
  const absoluteMetaFile = resolveAppPath(metaFile);
  const result = run(
    'pnpm',
    [
      '--dir',
      'apps/shell-super-app',
      'exec',
      'wrangler',
      'deploy',
      '--config',
      '.output/wrangler.json',
      '--dry-run',
      '--minify',
      '--outdir',
      absoluteOutDir,
      '--metafile',
      absoluteMetaFile,
    ],
    'Cloudflare Worker size dry-run',
  );
  const uploadMatch = result.stdout.match(
    /Total Upload:\s*(?<rawKiB>[0-9.]+)\s*KiB\s*\/\s*gzip:\s*(?<gzipKiB>[0-9.]+)\s*KiB/u,
  );

  assert(uploadMatch?.groups !== undefined, 'Could not parse Wrangler Worker upload size.', {
    stdout: redactLocalText(result.stdout),
  });

  const rawKiB = Number(uploadMatch.groups.rawKiB);
  const gzipKiB = Number(uploadMatch.groups.gzipKiB);

  assert(Number.isFinite(rawKiB) && Number.isFinite(gzipKiB), 'Invalid Worker upload size.', {
    gzipKiB: uploadMatch.groups.gzipKiB,
    rawKiB: uploadMatch.groups.rawKiB,
  });

  assert(fs.existsSync(resolveAppPath(metaFile)), 'Wrangler Worker metafile is missing.', {
    metaFile,
  });

  const metafile = readJson(metaFile);
  const metafileSections = [metafile.outputs, metafile.inputs].filter(
    (section) => section !== undefined && section !== null && typeof section === 'object',
  );
  const workerChunks = [];

  for (const section of metafileSections) {
    for (const [filePath, metadata] of Object.entries(section)) {
      if (!filePath.startsWith('worker/') || !filePath.endsWith('.js')) {
        continue;
      }

      const bytes = Number(metadata?.bytes);

      if (!Number.isFinite(bytes)) {
        continue;
      }

      const fileName = path.basename(filePath);
      let category = 'worker-chunk';

      if (fileName === '__modern_bff_effect.js') {
        category = 'strict-effect-bff-runtime';
      } else if (fileName === 'index.js') {
        category = 'cloudflare-worker-entry';
      } else if (/^\d+\.js$/u.test(fileName)) {
        category = 'generated-runtime-chunk';
      } else if (filePath.includes('/page.js')) {
        category = 'route-worker-chunk';
      }

      workerChunks.push({ bytes, category, filePath });
    }
  }

  const largestChunks = workerChunks
    .sort((left, right) => right.bytes - left.bytes || left.filePath.localeCompare(right.filePath))
    .slice(0, workerMetafileTopChunkCount)
    .map((chunk) => ({
      ...chunk,
      kib: Number((chunk.bytes / 1024).toFixed(2)),
    }));
  const largestChunkTotalBytes = largestChunks.reduce((sum, chunk) => sum + chunk.bytes, 0);

  assert(largestChunks.length > 0, 'Wrangler Worker metafile did not expose worker chunk sizes.', {
    metaFile,
  });

  const bundleBreakdown = {
    largestChunks,
    largestChunkCount: largestChunks.length,
    largestChunkTotalKiB: Number((largestChunkTotalBytes / 1024).toFixed(2)),
    topChunkLimit: workerMetafileTopChunkCount,
  };
  const freeTierStatus = gzipKiB <= freeTierLimits.workerGzipMaxKiB ? 'ok' : 'over-free-tier-limit';
  const paidPlanWouldFit = gzipKiB <= paidTierLimits.workerGzipMaxKiB;
  const largestCategories = [
    ...new Set(bundleBreakdown.largestChunks.slice(0, 4).map((chunk) => chunk.category)),
  ].sort((left, right) => left.localeCompare(right));
  const recommendation =
    freeTierStatus === 'ok'
      ? {
          action: 'deploy-free-tier',
          reason: 'The minified Worker bundle fits the Cloudflare Free upload budget.',
        }
      : paidPlanWouldFit
        ? {
            action: 'use-paid-workers-or-framework-split',
            largestCategories,
            paidPath:
              'The current combined SSR + Module Federation + strict Effect BFF Worker fits the paid Workers upload budget.',
            freeTierPath:
              'Free tier needs an UltraModern-supported split that serves the shell/artifacts as static assets while still emitting a strict Effect API Worker, or equivalent framework-level bundle reduction.',
            reason:
              'The artifact-static data profile fits Worker Static Assets, but the combined Worker bundle exceeds the Free upload budget.',
          }
        : {
            action: 'framework-bundle-reduction-required-before-deploy',
            largestCategories,
            reason:
              'The Worker bundle exceeds both the Free and paid upload budgets, so the framework/runtime topology must shrink before deployment.',
          };

  return {
    bundleBreakdown,
    freeLimitKiB: freeTierLimits.workerGzipMaxKiB,
    gzipKiB,
    paidLimitKiB: paidTierLimits.workerGzipMaxKiB,
    paidPlanWouldFit,
    rawKiB,
    recommendation,
    reports: {
      metafile: appRelative(metaFile),
      outDir: appRelative(outDir),
    },
    status: freeTierStatus,
  };
}

function runSeedReadinessPlan(args) {
  const jsonOut = `${args.reportRoot}/production-seed-plan.json`;

  run(
    process.execPath,
    [
      './scripts/smart-suggest-production-seed.mjs',
      '--wrangler-config',
      args.wranglerConfig,
      '--json-out',
      jsonOut,
    ],
    'Free-tier production seed readiness plan',
    [0, 1],
  );

  return readJson(jsonOut);
}

function readPaidTemplateProof() {
  const result = run(
    process.execPath,
    ['./scripts/validate-smart-suggest-cloudflare-bindings.mjs', '--print-cz-vusc-env-template'],
    'Paid CZ VUSC D1 template proof',
  );
  const missingCodes = expectedCzVuscCodes.filter(
    (code) => !result.stdout.includes(`SMART_SUGGEST_CZ_VUSC_${code}_DATABASE_ID`),
  );

  assert(missingCodes.length === 0, 'Paid template must expose every CZ VUSC database id.', {
    missingCodes,
  });
  assert(
    result.stdout.includes('SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED=true'),
    'Paid template must enable physical CZ VUSC shards.',
  );

  return {
    expectedPhysicalShardCount: expectedCzVuscCodes.length,
    missingCodes,
    status: 'ok',
  };
}

function runOptionalCloudflareAccountAudit() {
  const result = run('wrangler', ['d1', 'list', '--json'], 'Cloudflare D1 account audit');
  const parsed = JSON.parse(result.stdout);
  const databases = Array.isArray(parsed) ? parsed : [];
  const smartSuggestDatabases = databases.filter((database) =>
    String(database.name ?? database.database_name ?? '').startsWith('smart-suggest'),
  );

  return {
    availableFreeTierSlots: Math.max(0, freeTierLimits.databaseMaxCount - databases.length),
    configuredSmartSuggestDatabases: smartSuggestDatabases.length,
    freeTierDatabaseMaxCount: freeTierLimits.databaseMaxCount,
    status: databases.length <= freeTierLimits.databaseMaxCount ? 'ok' : 'over-free-tier-limit',
    totalD1Databases: databases.length,
    unrelatedD1Databases: databases.length - smartSuggestDatabases.length,
  };
}

function assertIndexCapacity(report) {
  assert(report.status === 'ok', 'Index capacity proof must pass.');
  assert(
    report.measurements?.ftsOnlyProjectedBytes < freeTierLimits.databaseMaxBytes,
    'FTS-only projection must fit one free-tier D1 shard.',
    {
      actual: report.measurements?.ftsOnlyProjectedBytes,
      max: freeTierLimits.databaseMaxBytes,
    },
  );
}

function assertD1Preflight(report, production) {
  assert(report.status === 'ok', 'Free-tier D1 preflight must pass.');
  assert(
    report.databases.length <= freeTierLimits.databaseMaxCount,
    'Free-tier topology must stay inside the account D1 database count.',
    { actual: report.databases.length, max: freeTierLimits.databaseMaxCount },
  );
  assert(
    report.databases.filter((database) => database.role === 'address-shard').length <=
      freeTierLimits.addressShardDatabaseMaxCount,
    'Free-tier topology must stay inside the address-shard database count.',
    {
      max: freeTierLimits.addressShardDatabaseMaxCount,
    },
  );
  assert(
    report.logicalCzVuscCodes.length === expectedCzVuscCodes.length,
    'Free-tier topology must cover every logical CZ VUSC region.',
    { actual: report.logicalCzVuscCodes },
  );
  if (production) {
    const placeholderChecks = report.checks.filter(
      (check) => check.reason === 'deterministic-local-placeholder-id',
    );

    assert(
      placeholderChecks.length === 0,
      'Production free-tier proof must use real Cloudflare database ids.',
      { placeholderChecks: placeholderChecks.map((check) => check.id) },
    );
  }
}

function assertProductionArtifact(report) {
  if (report === null) {
    return;
  }

  assert(report.complete === true, 'Production artifact report must be complete.');
  assert(
    report.rowCount >= 3_000_000,
    'Production artifact report must cover the full retained RUIAN snapshot.',
    { actual: report.rowCount },
  );
  assert(
    report.officialSnapshot?.checksumSha256 !== undefined,
    'Production artifact report must include source snapshot checksum provenance.',
  );
  assert(
    (report.oversizedArtifactFiles ?? []).length === 0,
    'Production artifact files must stay under the static asset max file size.',
    { oversizedArtifactFiles: report.oversizedArtifactFiles },
  );
  assert(
    report.artifactFileCount <= staticAssetLimits.fileMaxCount,
    'Production artifact file count must fit the selected static asset surface.',
    { actual: report.artifactFileCount, max: staticAssetLimits.fileMaxCount },
  );
  assert(
    (report.largestArtifactFile?.sizeBytes ?? 0) <= staticAssetLimits.fileMaxBytes,
    'Largest production artifact file must fit the selected static asset surface.',
    { actual: report.largestArtifactFile, max: staticAssetLimits.fileMaxBytes },
  );
}

function assertSeedReadiness(report) {
  assert(report.d1Topology === 'free-tier', 'Seed readiness must stay on free-tier topology.');
  assert(report.searchIndexMode === 'fts-only', 'Free-tier seed must default to FTS-only index.');
  assert(
    report.shardRouteStrategy === 'hash',
    'Free-tier seed must use row-balanced hash routing.',
    { actual: report.shardRouteStrategy },
  );
  assert(
    report.freeTierCapacityGuard?.enabled === true,
    'Free-tier seed must expose the D1 capacity guard.',
  );
  assert(
    report.freeTierCapacityGuard?.effectiveMaxAddressShardRows === 400000,
    'Free-tier seed must use the reviewed FTS-only address-shard row ceiling.',
    { actual: report.freeTierCapacityGuard?.effectiveMaxAddressShardRows },
  );
  assert(
    report.shardLogicalCzVuscCount === expectedCzVuscCodes.length,
    'Seed readiness must cover every logical CZ VUSC region.',
    { actual: report.shardLogicalCzVuscCodes },
  );
}

function summarizeReadiness({
  accountAudit,
  artifactPublicAssetsReport,
  artifactStaticProfile,
  artifactReport,
  d1Preflight,
  indexCapacity,
  paidTemplate,
  seedPlan,
  workerSize,
}) {
  const addressShardCount =
    d1Preflight?.databases.filter((database) => database.role === 'address-shard').length ?? 0;
  const missingExternalInputs = seedPlan?.operatorReadiness?.missingInputs ?? [];
  const blockingStages = seedPlan?.operatorReadiness?.blockingStages ?? [];

  return {
    accountAudit: accountAudit ?? null,
    artifact:
      artifactReport === null
        ? null
        : {
            artifactFileCount: artifactReport.artifactFileCount,
            complete: artifactReport.complete,
            largestArtifactFile: artifactReport.largestArtifactFile,
            oversizedArtifactFileCount: artifactReport.oversizedArtifactFiles?.length ?? 0,
            rowCount: artifactReport.rowCount,
            sourceChecksumSha256: artifactReport.officialSnapshot?.checksumSha256 ?? null,
            status: 'ok',
          },
    artifactPublicAssets:
      artifactPublicAssetsReport === null
        ? null
        : {
            fileCount: artifactPublicAssetsReport.artifact?.fileCount ?? null,
            largestFile: artifactPublicAssetsReport.artifact?.largestFile ?? null,
            manifestPath: artifactPublicAssetsReport.manifestPath,
            publicPath: artifactPublicAssetsReport.publicPath,
            rowCount: artifactPublicAssetsReport.artifact?.rowCount ?? null,
            status: artifactPublicAssetsReport.status,
            totalSizeBytes: artifactPublicAssetsReport.artifact?.totalSizeBytes ?? null,
          },
    deployProfile: artifactStaticProfile ? 'artifact-static' : 'd1',
    d1: {
      addressShardCount,
      databaseCount: d1Preflight?.databases.length ?? 0,
      fullFreeTierAddressShardSlotsUsed:
        addressShardCount === freeTierLimits.addressShardDatabaseMaxCount,
      logicalCzVuscCount: d1Preflight?.logicalCzVuscCodes.length ?? 0,
      status: d1Preflight?.status ?? 'not-used-artifact-static',
    },
    freeTierLimits,
    indexCapacity: {
      ftsOnlyProjectedBytes: indexCapacity.measurements?.ftsOnlyProjectedBytes ?? null,
      improvementRatio: indexCapacity.measurements?.improvementRatio ?? null,
      status: indexCapacity.status,
    },
    paidSwitch: {
      cloudflareWorkersCurrentGzipKiB: workerSize.gzipKiB,
      cloudflareWorkersPaidLimitKiB: workerSize.paidLimitKiB,
      cloudflareWorkersPaidPlanWouldFit: workerSize.paidPlanWouldFit,
      configSwitchReady: paidTemplate.status === 'ok',
      noPayAlternative: workerSize.recommendation.freeTierPath ?? null,
      physicalCzVuscShardCount: paidTemplate.expectedPhysicalShardCount,
      requiredCloudflareWorkersPlan: 'Workers Paid plan',
      requiredOperatorCommand: 'pnpm smart-suggest:d1:paid:cz-shards:template',
    },
    productionSeed: {
      blockingStageCount: blockingStages.length,
      missingExternalInputCount: missingExternalInputs.length,
      readinessStatus: seedPlan?.operatorReadiness?.status ?? seedPlan?.status ?? 'not-used',
      searchIndexMode: seedPlan?.searchIndexMode ?? null,
      shardRouteStrategy: seedPlan?.shardRouteStrategy ?? null,
    },
    routePlan: null,
    workerSize,
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  assert(
    fs.existsSync(resolveAppPath(args.wranglerConfig)),
    'Generated Wrangler config is missing; run pnpm cloudflare:build first.',
    { wranglerConfig: args.wranglerConfig },
  );

  const wranglerConfig = readJson(args.wranglerConfig);
  const artifactStaticProfile =
    wranglerConfig?.vars?.SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL !== undefined;

  if (artifactStaticProfile) {
    assertArtifactStaticWranglerConfig(wranglerConfig);
  }

  const indexCapacity = runIndexCapacityProof(args.reportRoot);
  const d1Preflight = artifactStaticProfile ? null : runD1Preflight(args);
  const seedPlan = artifactStaticProfile ? null : runSeedReadinessPlan(args);
  const workerSize = runWorkerSizeProof(args);
  const paidTemplate = readPaidTemplateProof();
  const accountAudit = args.cloudflareAccountAudit ? runOptionalCloudflareAccountAudit() : null;
  const artifactReport = readProductionArtifactReport(args);
  const artifactPublicAssetsReport = readArtifactPublicAssetsReport(
    args,
    artifactStaticProfile,
    artifactReport,
  );

  assertIndexCapacity(indexCapacity);
  if (d1Preflight !== null) {
    assertD1Preflight(d1Preflight, false);
  }
  assertProductionArtifact(artifactReport);
  if (seedPlan !== null) {
    assertSeedReadiness(seedPlan);
  }
  const status =
    workerSize.status === 'ok'
      ? 'ok'
      : workerSize.status === 'over-free-tier-limit' && workerSize.paidPlanWouldFit
        ? 'blocked-free-worker-size-paid-would-fit'
        : 'blocked-worker-size';

  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.production ? 'production' : 'review',
    reports: {
      artifactPublicAssetsDir:
        artifactPublicAssetsReport === null ? null : appRelative(args.artifactPublicAssetsDir),
      d1Preflight:
        d1Preflight === null
          ? null
          : appRelative(
              `${args.reportRoot}/d1-preflight${args.production ? '-production' : ''}.json`,
            ),
      indexCapacity: appRelative(`${args.reportRoot}/index-capacity.json`),
      productionSeedPlan:
        seedPlan === null ? null : appRelative(`${args.reportRoot}/production-seed-plan.json`),
      productionSeedRoutePlan: null,
      productionSeedRoutePlanWrapper: null,
      workerSizeMetafile: workerSize.reports.metafile,
    },
    status,
    summary: summarizeReadiness({
      accountAudit,
      artifactPublicAssetsReport,
      artifactStaticProfile,
      artifactReport,
      d1Preflight,
      indexCapacity,
      paidTemplate,
      seedPlan,
      workerSize,
    }),
  };

  writeJson(args.jsonOut, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (status !== 'ok') {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  if (error?.details !== undefined) {
    process.stderr.write(`${JSON.stringify(error.details, null, 2)}\n`);
  }
  process.exitCode = 1;
}
