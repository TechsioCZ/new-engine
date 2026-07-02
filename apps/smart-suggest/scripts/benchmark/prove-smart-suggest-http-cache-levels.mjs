#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..', '..');
const reportPath = path.resolve(
  appRoot,
  '.codex/reports/smart-suggest-benchmark/http-cache-levels-proof.json',
);
const scenarioId = 'addr-k-louzi-slash-diacritic-exact';
const resultId = 'ruian-cz:1203603';

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;

    throw new Error(`${message}${suffix}`);
  }
}

const suggestion = {
  address: {
    city: 'Praha 10',
    countryCode: 'CZ',
    district: 'Vršovice',
    houseNumber: '1258',
    orientationNumber: '12',
    postalCode: '101 00',
    street: 'K Louži',
  },
  confidence: 0.99,
  displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
  id: resultId,
  kind: 'address',
  source: {
    id: 'ruian-cz',
    kind: 'owned-dataset',
    name: 'RUIAN CZ',
  },
};

const jsonResponse = (response, body) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

function suggestResponse(requestCount) {
  const firstMeasuredPass = requestCount === 1;

  return {
    cacheLevels: firstMeasuredPass
      ? {
          browserMemory: { enabled: false, status: 'disabled' },
          d1ReadThrough: { enabled: true, status: 'written' },
          edgeCache: { enabled: true, status: 'written' },
          ownedDb: { enabled: true, status: 'hit' },
          workerMemory: { enabled: true, status: 'written' },
        }
      : {
          browserMemory: { enabled: false, status: 'disabled' },
          d1ReadThrough: { enabled: true, status: 'miss' },
          edgeCache: { enabled: true, status: 'hit' },
          ownedDb: { enabled: true, status: 'hit' },
          workerMemory: { enabled: true, status: 'miss' },
        },
    cacheStatus: firstMeasuredPass ? 'written' : 'hit',
    providerEvents: [],
    requestId: `http-cache-proof-${requestCount}`,
    suggestions: [suggestion],
  };
}

function statusResponse() {
  return {
    imports: {
      freshness: {
        latestBaseline: {
          completedAt: '2026-06-28T00:00:00.000Z',
          runId: 'http-cache-levels-proof-run',
          sourceVersion: 'http-cache-levels-proof-version',
          status: 'completed',
        },
        sla: { ageHours: 1 },
      },
    },
  };
}

const run = (cmd, args, options) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status) => resolve({ status, stderr, stdout }));
  });

async function main() {
  let suggestRequests = 0;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (url.pathname === '/v1/status') {
      jsonResponse(response, statusResponse());
      return;
    }

    if (url.pathname === '/v1/suggest') {
      suggestRequests += 1;
      jsonResponse(response, suggestResponse(suggestRequests));
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    const apiBase = `http://127.0.0.1:${address.port}`;
    const result = await run(
      process.execPath,
      [
        './scripts/benchmark/run-local-owned-benchmark.mjs',
        '--paths',
        'http-api-all-caches',
        '--api-base',
        apiBase,
        '--scenario',
        scenarioId,
        '--iterations',
        '3',
        '--warmup',
        '0',
        '--json-out',
        '.codex/reports/smart-suggest-benchmark/http-cache-levels-proof.json',
        '--format',
        'json',
      ],
      { cwd: appRoot },
    );

    assert(result.status === 0, 'Expected HTTP cache-level benchmark proof to pass.', {
      stderr: result.stderr,
      stdout: result.stdout,
    });

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const results = report.scenarioResults.filter(
      (entry) => entry.pathId === 'owned-db-all-caches',
    );
    const metrics = report.aggregateMetrics.paths.find(
      (entry) => entry.pathId === 'owned-db-all-caches',
    )?.metrics;
    const networkRequests = results.reduce((sum, entry) => sum + entry.network.requestCount, 0);

    assert(results.length === 3, 'Expected three measured HTTP all-cache results.', {
      count: results.length,
    });
    assert(suggestRequests === 2, 'Expected two Smart Suggest network calls before browser hit.', {
      suggestRequests,
    });
    assert(networkRequests === 2, 'Expected two measured Smart Suggest network requests.', {
      networkRequests,
    });
    assert(
      results[0]?.cache.levels.browserMemory.status === 'miss',
      'First pass must miss browser memory.',
    );
    assert(
      results[0]?.cache.levels.d1ReadThrough.status === 'written' &&
        results[0]?.cache.levels.workerMemory.status === 'written' &&
        results[0]?.cache.levels.edgeCache.status === 'written',
      'First pass must prove server cache write-through.',
      results[0]?.cache.levels,
    );
    assert(
      results[1]?.cache.levels.edgeCache.status === 'hit',
      'Second pass must prove server cache hit.',
    );
    assert(
      results[2]?.cache.levels.browserMemory.status === 'hit',
      'Third pass must prove browser memory hit.',
    );
    assert(
      results[2]?.network.requestCount === 0,
      'Browser-memory pass must not call Smart Suggest API.',
    );
    assert(
      results[2]?.cache.levels.edgeCache.status === 'miss' &&
        results[2]?.cache.levels.workerMemory.status === 'miss' &&
        results[2]?.cache.levels.d1ReadThrough.status === 'miss' &&
        results[2]?.cache.levels.ownedDb.status === 'miss',
      'Browser-memory pass must not attribute the zero-network hit to lower cache layers.',
      results[2]?.cache.levels,
    );
    assert(metrics?.cacheHitRate.browserMemory === 0.333, 'Browser-memory hit rate must be 1/3.', {
      cacheHitRate: metrics?.cacheHitRate,
    });
    assert(metrics?.cacheHitRate.ownedDb === 0.667, 'Owned DB hit rate must be 2/3.', {
      cacheHitRate: metrics?.cacheHitRate,
    });

    process.stdout.write(
      `Smart Suggest HTTP cache-level proof passed: report=${path.relative(appRoot, reportPath)} networkRequests=${networkRequests} browserMemoryHitRate=${metrics.cacheHitRate.browserMemory}\n`,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
