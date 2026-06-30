#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRows = 10_000;
const defaultJsonOut = '.codex/reports/smart-suggest-index-capacity/fts-only-free-tier.json';
const freeTierD1DatabaseMaxBytes = 500_000_000;
const freeTierFtsOnlyMaxAddressRows = 400_000;
const maxFtsOnlyBytesPerAddress = 1_100;
const minFtsOnlyImprovementRatio = 4;

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

function parsePositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function resolveAppPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(appRoot, filePath);
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    Object.assign(error, { details });
    throw error;
  }
}

function runPrototype(rowCount) {
  const result = spawnSync(
    process.execPath,
    ['./scripts/smart-suggest-index-prototype.mjs', `--rows=${rowCount}`],
    {
      cwd: appRoot,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Index prototype failed with exit code ${result.status ?? 'unknown'}: ${result.stderr}`,
    );
  }

  return JSON.parse(result.stdout);
}

function writeReport(report, jsonOut) {
  const absoluteOut = resolveAppPath(jsonOut);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, `${JSON.stringify(report, null, 2)}\n`);
}

function main(argv = process.argv.slice(2)) {
  const rowCount = parsePositiveInteger(readOption(argv, '--rows', String(defaultRows)), '--rows');
  const jsonOut = readOption(argv, '--json-out', defaultJsonOut);
  const prototype = runPrototype(rowCount);
  const fts5 = prototype.measurements?.fts5Prefix;
  const currentPrefix = prototype.measurements?.currentPrefix;
  const ftsOnlyProjectedBytes = Math.ceil(fts5.bytesPerAddress * freeTierFtsOnlyMaxAddressRows);
  const currentPrefixProjectedBytes = Math.ceil(
    currentPrefix.bytesPerAddress * freeTierFtsOnlyMaxAddressRows,
  );
  const improvementRatio = Number(
    (currentPrefix.bytesPerAddress / fts5.bytesPerAddress).toFixed(2),
  );
  const lookupBehavior = prototype.lookupBehavior ?? {};

  assert(
    prototype.assumptions?.rowCount === rowCount,
    'Index prototype did not measure the requested row count.',
    { actual: prototype.assumptions?.rowCount, expected: rowCount },
  );
  assert(
    fts5.bytesPerAddress <= maxFtsOnlyBytesPerAddress,
    'FTS-only bytes/address exceeded the reviewed free-tier ceiling.',
    { actual: fts5.bytesPerAddress, max: maxFtsOnlyBytesPerAddress },
  );
  assert(
    improvementRatio >= minFtsOnlyImprovementRatio,
    'FTS-only index is not sufficiently smaller than the legacy prefix-token index.',
    { actual: improvementRatio, min: minFtsOnlyImprovementRatio },
  );
  assert(
    ftsOnlyProjectedBytes < freeTierD1DatabaseMaxBytes,
    'FTS-only projected default shard size exceeds one free-tier D1 database.',
    { actual: ftsOnlyProjectedBytes, max: freeTierD1DatabaseMaxBytes },
  );
  assert(
    currentPrefixProjectedBytes > freeTierD1DatabaseMaxBytes,
    'Legacy prefix-token projection should remain above one free-tier D1 at the FTS-only row guard.',
    { actual: currentPrefixProjectedBytes, max: freeTierD1DatabaseMaxBytes },
  );
  assert(
    (lookupBehavior['K Louži 1258/12']?.fts5?.top ?? []).some((entry) =>
      entry.displayLabel.includes('K Louži 1258/12'),
    ),
    'FTS-only lookup must keep the exact K Louzi address reachable.',
  );
  assert(
    (lookupBehavior.Lou?.fts5?.top ?? []).length >= 4,
    'FTS-only lookup must return multiple address suggestions for a strong street prefix.',
  );
  assert(
    (lookupBehavior.K?.fts5?.top ?? []).length === 0 &&
      (lookupBehavior.Lo?.fts5?.top ?? []).length === 0,
    'FTS-only lookup must keep weak one/two-character text queries gated.',
  );

  const report = {
    assumptions: {
      freeTierD1DatabaseMaxBytes,
      freeTierFtsOnlyMaxAddressRows,
      rowCount,
      syntheticDatasetOnly: true,
    },
    generatedAt: new Date().toISOString(),
    measurements: {
      currentPrefixBytesPerAddress: currentPrefix.bytesPerAddress,
      currentPrefixProjectedBytes,
      ftsOnlyBytesPerAddress: fts5.bytesPerAddress,
      ftsOnlyProjectedBytes,
      improvementRatio,
    },
    status: 'ok',
  };

  writeReport(report, jsonOut);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
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
