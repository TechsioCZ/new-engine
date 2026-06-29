#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..', '..');
const reportDir = path.resolve(appRoot, '.codex/reports/smart-suggest-benchmark');
const readyReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-ready.json';
const missingApiBaseReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-missing-api-base.json';
const missingProvenanceReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-missing-provenance.json';
const modificationNoteReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-missing-modification-note.json';
const skippedOwnedSuggestReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-skipped-owned-suggest.json';
const missingLiveOptInReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-missing-live-opt-in.json';
const partialShardsReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-partial-shards.json';
const wrongShardCodesReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof-wrong-shard-codes.json';
const outputReportPath = '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof.out';
const providers = [
  'ruian-geocode',
  'mapy-cz',
  'here-discover',
  'managed-nominatim',
  'radar-autocomplete',
];
const proofEnv = {
  HERE_API_KEY: 'proof-here-key',
  MAPY_CZ_API_KEY: 'proof-mapy-key',
  NOMINATIM_BASE_URL: 'https://nominatim.example.invalid',
  NOMINATIM_USER_AGENT: 'smart-suggest-proof',
  RADAR_API_KEY: 'proof-radar-key',
  SMART_SUGGEST_BENCHMARK_LIVE_PROVIDERS: 'true',
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

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;

    throw new Error(`${message}${suffix}`);
  }
}

function appPath(appRelativePath) {
  return path.resolve(appRoot, appRelativePath);
}

function readJson(appRelativePath) {
  return JSON.parse(fs.readFileSync(appPath(appRelativePath), 'utf8'));
}

function writeJson(appRelativePath, value) {
  const filePath = appPath(appRelativePath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function nowIso() {
  return new Date().toISOString();
}

function proofShardCodes(mode) {
  if (mode === 'wrong-shard-codes') {
    return expectedCzVuscCodes.map((code) => (code === '141' ? '999' : code));
  }

  return expectedCzVuscCodes;
}

function proofShardRows(mode) {
  return proofShardCodes(mode).map((code, index) => {
    const state = mode === 'partial-shards' && index > 1 ? 'standby' : 'active';

    return {
      bindingName: `SMART_SUGGEST_CZ_VUSC_${code}`,
      countryCode: 'CZ',
      estimatedSizeBytes: 65_536,
      regionCode: code,
      regionKind: 'vusc',
      regionName: `VUSC ${code}`,
      rowCount: 3,
      shardId: `proof-shard-${code}`,
      state,
    };
  });
}

function statusPayload(mode) {
  const now = nowIso();
  const shardRows = proofShardRows(mode);
  const activeShardCount = shardRows.filter((shard) => shard.state === 'active').length;
  const sourceProvenance =
    mode === 'missing-provenance'
      ? {
          authoritativeSources: [],
        }
      : {
          authoritativeSources: [
            {
              attribution: {
                label: 'CUZK RUIAN',
                license: 'CC BY 4.0',
                url: 'https://ruian.cuzk.cz/',
              },
              datasetVersion: 'ruian-cz-proof',
              modificationNoteSha256Present: mode !== 'missing-modification-note',
              present: true,
              sourceId: 'ruian-cz',
              sourceKind: 'owned-dataset',
            },
          ],
        };

  return {
    db: {
      checkedAt: now,
      ok: true,
    },
    imports: {
      freshness: {
        latestBaseline: {
          completedAt: now,
          failedRows: 0,
          runId: 'proof-baseline-run',
          sourceFeedId: 'RUIAN-CSV-ADR-ST',
          sourceValidAt: now,
          sourceVersion: '20260628',
          status: 'completed',
          totalRows: 42,
          tombstonedRows: 0,
          upsertedRows: 42,
        },
        rowCounts: {
          failedRows: 0,
          skippedRows: 0,
          tombstonedRows: 0,
          totalRows: 42,
          upsertedRows: 42,
        },
        sla: {
          ageHours: 0,
          maxDeltaAgeHours: 48,
          measuredAt: now,
          status: 'fresh',
        },
      },
      recentRuns: [],
    },
    metrics: {
      accept: { total: 0 },
      providerEvents: {
        error: 0,
        skipped: 0,
        success: 0,
        timeout: 0,
      },
      suggest: {
        cacheHitRate: 1,
        cacheStatus: {
          disabled: 0,
          hit: 1,
          miss: 0,
          stale: 0,
          written: 0,
        },
        ownedSuccess: 1,
        providerFallback: 0,
        total: 1,
      },
    },
    service: 'smart-suggest',
    shards: {
      activeCount: activeShardCount,
      disabledCount: 0,
      maxEstimatedSizeBytes: 65_536,
      rowCount: 42,
      shards: shardRows,
      sizeGuard: {
        blockBytes: 6_000_000_000,
        status: 'ok',
        warnBytes: 5_000_000_000,
      },
      standbyCount: 0,
      totalCount: 14,
    },
    sourcePolicy: {
      providerSources: {
        durableRetentionAllowed: [],
        noDurableRetention: [],
        permanentCacheAllowed: [],
        ttlCacheOnly: [],
      },
      rawQueryStorage: 'disabled',
    },
    sourceProvenance,
    timestamp: now,
  };
}

function suggestPayload() {
  return {
    providerEvents: [],
    suggestions: [
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vrsovice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '101 00',
          street: 'K Louzi',
        },
        displayLabel: 'K Louzi 1258/12, 101 00 Praha 10, Vrsovice, CZ',
        id: 'ruian-cz:1203603',
        source: {
          id: 'ruian-cz',
          kind: 'owned-dataset',
        },
      },
    ],
  };
}

function createProofServer(state) {
  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const payload = url.pathname === '/v1/status' ? statusPayload(state.mode) : suggestPayload();

    if (!['/v1/status', '/v1/suggest'].includes(url.pathname)) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not-found' }));
      return;
    }

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(`${JSON.stringify(payload)}\n`);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function buildProofEnv(envOverrides) {
  const env = {
    ...process.env,
    ...proofEnv,
    NO_COLOR: '1',
  };

  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete env[key];
      continue;
    }

    env[key] = value;
  }

  return env;
}

function runPreflight({
  apiBase,
  envOverrides = {},
  expectedOk,
  expectedStderr,
  extraArgs = [],
  reportPath,
}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        './scripts/benchmark/preflight-smart-suggest-final-boss.mjs',
        '--api-base',
        apiBase,
        '--json-out',
        reportPath,
        ...extraArgs,
      ],
      {
        cwd: appRoot,
        env: buildProofEnv(envOverrides),
      },
    );
    const chunks = {
      stderr: [],
      stdout: [],
    };

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => chunks.stdout.push(chunk));
    child.stderr.on('data', (chunk) => chunks.stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (exitCode) => {
      const result = {
        status: exitCode,
        stderr: chunks.stderr.join(''),
        stdout: chunks.stdout.join(''),
      };

      try {
        if (expectedOk) {
          assert(result.status === 0, 'Expected final-boss preflight proof to pass.', {
            reportPath,
            stderr: result.stderr,
            stdout: result.stdout,
          });
        } else {
          assert(result.status !== 0, 'Expected final-boss preflight proof to fail.', {
            reportPath,
            stderr: result.stderr,
            stdout: result.stdout,
          });
          assert(
            result.stdout.includes(expectedStderr) || result.stderr.includes(expectedStderr),
            'Final-boss preflight failed for an unexpected reason.',
            {
              expected: expectedStderr,
              reportPath,
              stderr: result.stderr,
              stdout: result.stdout,
            },
          );
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function assertReadyReport(report) {
  const checkIds = new Set(report.checks.map((entry) => entry.id));

  assert(report.status === 'ready', 'Ready final-boss preflight proof must be ready.');
  assert(
    typeof report.apiBaseSha256 === 'string' && /^[a-f0-9]{64}$/u.test(report.apiBaseSha256),
    'Ready proof must include an API base fingerprint.',
  );
  assert(report.apiStatus?.configured === true, 'Ready proof must mark API base configured.');
  assert(checkIds.has('api-base-config'), 'Ready proof must check API base config.');
  assert(checkIds.has('owned-source-provenance-present'), 'Ready proof must check provenance.');
  assert(checkIds.has('owned-source-attribution'), 'Ready proof must check attribution.');
  assert(checkIds.has('owned-source-modification-note'), 'Ready proof must check modification.');
  assert(
    report.checks.every((entry) => entry.ok === true),
    'Ready final-boss preflight proof must have zero failing checks.',
  );
  assert(
    JSON.stringify(report.providers) === JSON.stringify(providers),
    'Ready proof must include exactly the expected provider baseline set.',
    { expected: providers, received: report.providers },
  );
}

function assertBlockedReport(report, expectedCheckId) {
  const failedChecks = report.checks.filter((entry) => entry.ok !== true);

  assert(report.status === 'blocked', 'Negative final-boss preflight proof must be blocked.');
  assert(
    failedChecks.some((entry) => entry.id === expectedCheckId),
    `Negative final-boss preflight proof must fail ${expectedCheckId}.`,
  );
}

function assertMissingApiBaseReport(report) {
  const checkIds = new Set(report.checks.map((entry) => entry.id));

  assert(report.status === 'blocked', 'Missing API base proof must be blocked.');
  assert(report.apiBaseSha256 === null, 'Missing API base proof must not fingerprint an API base.');
  assert(report.apiStatus?.configured === false, 'Missing API base proof must mark API absent.');
  assertBlockedReport(report, 'api-base-config');
  assert(!checkIds.has('status-fetch'), 'Missing API base proof must not attempt status fetch.');
  assert(
    !checkIds.has('owned-suggest-fetch'),
    'Missing API base proof must not attempt owned suggest fetch.',
  );
}

async function runProof() {
  fs.mkdirSync(reportDir, { recursive: true });
  const state = { mode: 'ready' };
  const server = createProofServer(state);

  await listen(server);

  const address = server.address();
  assert(address && typeof address === 'object', 'Proof HTTP server did not expose an address.');

  const apiBase = `http://127.0.0.1:${address.port}`;
  const artifacts = [];

  try {
    artifacts.push({
      reportPath: missingApiBaseReportPath,
      result: await runPreflight({
        apiBase: '',
        expectedOk: false,
        expectedStderr: 'api-base-config',
        reportPath: missingApiBaseReportPath,
      }),
    });
    assertMissingApiBaseReport(readJson(missingApiBaseReportPath));

    state.mode = 'ready';
    artifacts.push({
      reportPath: readyReportPath,
      result: await runPreflight({ apiBase, expectedOk: true, reportPath: readyReportPath }),
    });
    assertReadyReport(readJson(readyReportPath));

    state.mode = 'missing-provenance';
    artifacts.push({
      reportPath: missingProvenanceReportPath,
      result: await runPreflight({
        apiBase,
        expectedOk: false,
        expectedStderr: 'owned-source-provenance-present',
        reportPath: missingProvenanceReportPath,
      }),
    });
    assertBlockedReport(readJson(missingProvenanceReportPath), 'owned-source-provenance-present');

    state.mode = 'missing-modification-note';
    artifacts.push({
      reportPath: modificationNoteReportPath,
      result: await runPreflight({
        apiBase,
        expectedOk: false,
        expectedStderr: 'owned-source-modification-note',
        reportPath: modificationNoteReportPath,
      }),
    });
    assertBlockedReport(readJson(modificationNoteReportPath), 'owned-source-modification-note');

    state.mode = 'ready';
    artifacts.push({
      reportPath: missingLiveOptInReportPath,
      result: await runPreflight({
        apiBase,
        envOverrides: { SMART_SUGGEST_BENCHMARK_LIVE_PROVIDERS: undefined },
        expectedOk: false,
        expectedStderr: 'live-provider-opt-in',
        extraArgs: ['--allow-live-providers-env-missing'],
        reportPath: missingLiveOptInReportPath,
      }),
    });
    assertBlockedReport(readJson(missingLiveOptInReportPath), 'live-provider-opt-in');

    state.mode = 'partial-shards';
    artifacts.push({
      reportPath: partialShardsReportPath,
      result: await runPreflight({
        apiBase,
        expectedOk: false,
        expectedStderr: 'owned-active-cz-shards',
        extraArgs: ['--allow-partial-shards'],
        reportPath: partialShardsReportPath,
      }),
    });
    assertBlockedReport(readJson(partialShardsReportPath), 'owned-active-cz-shards');

    state.mode = 'wrong-shard-codes';
    artifacts.push({
      reportPath: wrongShardCodesReportPath,
      result: await runPreflight({
        apiBase,
        expectedOk: false,
        expectedStderr: 'owned-active-cz-shards',
        reportPath: wrongShardCodesReportPath,
      }),
    });
    assertBlockedReport(readJson(wrongShardCodesReportPath), 'owned-active-cz-shards');

    state.mode = 'ready';
    artifacts.push({
      reportPath: skippedOwnedSuggestReportPath,
      result: await runPreflight({
        apiBase,
        expectedOk: false,
        expectedStderr: 'owned-suggest-proof-skipped',
        extraArgs: ['--skip-owned-suggest-proof'],
        reportPath: skippedOwnedSuggestReportPath,
      }),
    });
    assertBlockedReport(readJson(skippedOwnedSuggestReportPath), 'owned-suggest-proof-skipped');
  } finally {
    await close(server);
  }

  writeJson(outputReportPath, {
    artifacts: artifacts.map((artifact) => ({
      exitCode: artifact.result.status,
      reportPath: artifact.reportPath,
      stderr: artifact.result.stderr.trim(),
      stdout: artifact.result.stdout.trim(),
    })),
  });

  process.stdout.write('Smart Suggest final-boss preflight proof passed:\n');
  process.stdout.write(`- ${missingApiBaseReportPath}\n`);
  process.stdout.write(`- ${readyReportPath}\n`);
  process.stdout.write(`- ${missingProvenanceReportPath}\n`);
  process.stdout.write(`- ${modificationNoteReportPath}\n`);
  process.stdout.write(`- ${missingLiveOptInReportPath}\n`);
  process.stdout.write(`- ${partialShardsReportPath}\n`);
  process.stdout.write(`- ${wrongShardCodesReportPath}\n`);
  process.stdout.write(`- ${skippedOwnedSuggestReportPath}\n`);
}

runProof().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
