import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import {
  artifactTokensForRecord,
  buildOwnedDataArtifacts,
  defaultArgs,
  normalizeAddressParts,
  normalizeArtifactSearchText,
  normalizeFixtureRows,
  postalDigits,
  sortArtifactPostalPrefixRecords,
  tokenEntriesToObject,
} from '../lib/owned-import/commands.mjs';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(testDirectory, 'fixtures/owned-import-artifact-fixture.jsonl');
const temporaryRoots = new Set();

afterEach(() => {
  for (const root of temporaryRoots) fs.rmSync(root, { force: true, recursive: true });
  temporaryRoots.clear();
});

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owned-import-test-'));
  temporaryRoots.add(root);
  return root;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFiles(directory) {
  return fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(directory, path.join(entry.parentPath ?? directory, entry.name)))
    .map((filePath) => filePath.split(path.sep).join('/'))
    .toSorted((left, right) => left.localeCompare(right, 'cs-CZ'));
}

function modules() {
  return {
    createAddressImportRunId: (metadata) => `run-${metadata.sourceId}-${metadata.datasetVersion}`,
    createAuthoritativeAddressImportSource: (metadata) => ({
      attribution: 'unit-test',
      cachePolicy: 'static-owned-artifact',
      countryCode: metadata.shardCountryCode,
      datasetVersion: metadata.datasetVersion,
      id: metadata.sourceId,
      name: metadata.sourceName,
      shardCountryCode: metadata.shardCountryCode,
      sourceKind: 'authoritative-address',
    }),
    normalizeAddressSnapshotRowForImport: (row, source, index, runId) => ({
      countryCode: row.parts.countryCode,
      displayLabel: `${row.parts.line1}, ${row.parts.city}`,
      id: row.id,
      importRunId: runId,
      parts: row.parts,
      quality: row.quality,
      ranking: {},
      ruian: { postalCode: row.parts.postalCode, regionCode: index === 0 ? '19' : '116' },
      searchLabel: `${row.parts.line1} ${row.parts.city} ${row.parts.postalCode}`,
      sourceId: source.id,
    }),
  };
}

function args(root) {
  return {
    ...defaultArgs('build-artifacts'),
    artifactMaxFileSizeBytes: 128 * 1024,
    artifactMaxTokenLength: 6,
    artifactOutDir: path.join(root, 'artifacts'),
    artifactRecordShardCount: 8,
    artifactTokenBucketCount: 16,
    country: 'CZ',
    datasetVersion: 'unit-test-dataset',
    fixture: fixturePath,
    sourceId: 'ruian-cz',
    sourceName: 'Unit test fixture',
    snapshotUri: 'fixture://unit/owned-import',
  };
}

const record = {
  countryCode: 'CZ',
  displayLabel: 'K Louzi 1258/12, Praha',
  id: 'fixture-1',
  parts: { city: 'Praha', countryCode: 'CZ', postalCode: '110 00', region: 'Praha' },
  quality: 0.95,
  searchLabel: 'K Louzi 1258/12 Praha CZ',
};

describe('owned import helper characterization', () => {
  it('normalizes fixture and search data', () => {
    expect(normalizeArtifactSearchText(' K Louzi, Zlin 12/3 ')).toBe('k louzi zlin 12 3');
    expect(postalDigits('CZ-110 00')).toBe('11000');
    expect(normalizeFixtureRows([{ id: 'x', parts: { city: 'Praha' } }])).toEqual([
      { id: 'x', parts: { city: 'Praha' } },
    ]);
    expect(() => normalizeAddressParts({ city: 'Praha', extra: 'x' }, 0)).toThrow(/extra/u);
  });

  it('keeps token and record JSON helpers stable', () => {
    expect(
      artifactTokensForRecord(record, { artifactMaxTokenLength: 6, artifactMinTokenLength: 2 }),
    ).toContain('k louzi');
    expect(sortArtifactPostalPrefixRecords([record]).map((entry) => entry.id)).toEqual([
      'fixture-1',
    ]);
    expect(tokenEntriesToObject([['praha', ['fixture-1']]])).toEqual({
      praha: { recordCount: 1, recordIds: ['fixture-1'] },
    });
  });

  it('builds deterministic tmp-root artifacts with records and token references', async () => {
    const root = temporaryRoot();
    const buildArgs = args(root);
    const report = await buildOwnedDataArtifacts(buildArgs, modules(), {
      now: () => new Date('2026-01-02T03:04:05.000Z'),
      tempDir: path.join(root, 'work'),
      workspaceRoot: root,
    });
    const outDir = buildArgs.artifactOutDir;
    const files = listFiles(outDir);
    const manifest = readJson(path.join(outDir, 'manifest.json'));
    expect(report).toMatchObject({
      rowCount: 2,
      complete: true,
      manifestPath: 'artifacts/manifest.json',
    });
    expect(manifest.generatedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(files).toContain('manifest.json');
    expect(files).toContain('postal/CZ/11000.json');
    const tokenArtifacts = files
      .filter((filePath) => /^token\/CZ\/bucket-\d{4}\.json$/u.test(filePath))
      .map((filePath) => readJson(path.join(outDir, filePath)).tokens);
    const tokens = Object.assign({}, ...tokenArtifacts);
    expect(tokens.praha.recordIds).toEqual(['fixture-1']);
    expect(tokens.brno.recordIds).toEqual(['fixture-2']);
  });
});
