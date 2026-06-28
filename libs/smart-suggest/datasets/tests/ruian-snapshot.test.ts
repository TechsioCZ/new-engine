import {
  createInMemorySmartSuggestRepositories,
  SmartSuggestStorageError,
} from '@techsio/smart-suggest-storage';
import { describe, expect, it } from 'vitest';

import {
  createAuthoritativeAddressImportSource,
  mapRuianAddressSnapshotRows,
  normalizeAddressSnapshotRowForImport,
  parseRuianAddressSnapshotRow,
  parseRuianAddressTombstoneRow,
  parseRuianOfficialCsvSnapshotChanges,
  parseRuianOfficialCsvSnapshotRows,
  runAddressDatasetImport,
} from '../src/index';

async function collectRows<T>(rows: AsyncIterable<T>) {
  const collected: T[] = [];

  for await (const row of rows) {
    collected.push(row);
  }

  return collected;
}

async function* splitCsvChunks(csv: string) {
  await Promise.resolve();
  yield csv.slice(0, 73);
  yield csv.slice(73, 149);
  yield csv.slice(149);
}

describe('RUIAN address snapshot mapping', () => {
  it('maps K Louži 1258/12 into an importable CZ address snapshot row', async () => {
    const parsed = parseRuianAddressSnapshotRow(
      {
        'Kód adresního místa': 1_203_603,
        'Část obce': 'Vršovice',
        'Číslo orientační': '12',
        'Číslo popisné': 1258,
        'Městská část': 'Praha 10',
        PSČ: '10100',
        Ulice: 'K Louži',
        'Zeměpisná délka': '14.455',
        'Zeměpisná šířka': '50,067',
      },
      {
        datasetVersion: '2026-06-26',
        idPrefix: 'ruian-cz:',
        snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
        sourceId: 'ruian-cz',
      },
    );

    expect(parsed).toMatchObject({
      ok: true,
      row: {
        id: 'ruian-cz:1203603',
        latitude: 50.067,
        longitude: 14.455,
        parts: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '101 00',
          street: 'K Louži',
        },
        ruian: {
          addressPlaceCode: '1203603',
          stableAddressId: 'ruian-cz:1203603',
        },
        sourceLineage: {
          datasetVersion: '2026-06-26',
          snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
          sourceId: 'ruian-cz',
          sourceRowId: '1203603',
        },
      },
    });

    if (!parsed.ok) {
      throw new Error(parsed.error.message);
    }

    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-26',
      shardCountryCode: 'CZ',
      sourceId: 'ruian-cz',
    });
    const normalized = normalizeAddressSnapshotRowForImport(parsed.row, source, 0);

    expect(normalized).toMatchObject({
      displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
      parts: {
        city: 'Praha 10',
        countryCode: 'CZ',
        district: 'Vršovice',
        houseNumber: '1258',
        orientationNumber: '12',
        postalCode: '101 00',
        street: 'K Louži',
      },
      searchLabel: 'k louzi 1258 12 101 00 praha 10 vrsovice cz',
    });

    const repositories = createInMemorySmartSuggestRepositories();
    const importResult = await runAddressDatasetImport({
      repositories,
      rows: [parsed.row],
      runId: 'import-ruian-cz-k-louzi-fixture',
      source,
    });

    expect(importResult).toMatchObject({
      errors: [],
      insertedRows: 1,
      rawSnapshotStoredInD1: false,
      totalRows: 1,
    });
    await expect(
      repositories.addressRecords.getAddressRecord('ruian-cz:1203603'),
    ).resolves.toMatchObject({
      displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
      latitude: 50.067,
      longitude: 14.455,
      sourceId: 'ruian-cz',
    });
  });

  it('splits combined house and orientation numbers from flat converted rows', () => {
    const parsed = parseRuianAddressSnapshotRow({
      city: 'Praha 10',
      house_number: '1258/12',
      id: 'combined-address-number',
      postal_code: '101 00',
      street: 'K Louži',
    });

    expect(parsed).toMatchObject({
      ok: true,
      row: {
        parts: {
          houseNumber: '1258',
          orientationNumber: '12',
        },
      },
    });
  });

  it('maps optional RUIAN identifiers and source lineage codes when present', () => {
    const parsed = parseRuianAddressSnapshotRow(
      {
        address_place_code: '1 203 603',
        city: 'Praha 10',
        house_number: '1258',
        kod_casti_obce: '40 798',
        kod_kraje: '19',
        kod_obce: '554 782',
        kod_okresu: '3 109',
        kod_momc: '500 224',
        kod_stavebniho_objektu: '2 168 187',
        kod_ulice: '456 891',
        postal_code: '10100',
        street: 'K Louži',
      },
      {
        atomEntryId: 'atom-entry-20260626',
        checksumSha256: 'sha256-test-checksum',
        datasetVersion: '2026-06-26',
        feedId: 'RUIAN-S-ZA-U',
        fileKind: 'baseline',
        sourceGeneratedAt: '2026-06-26T00:00:00Z',
        sourceUri: 'https://atom.cuzk.gov.cz/RUIAN-S-ZA-U/example.zip',
        sourceValidAt: '2026-06-25',
        sourceVersion: '20260626',
        snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
      },
    );

    expect(parsed).toMatchObject({
      ok: true,
      row: {
        id: 'ruian-cz:1203603',
        ruian: {
          addressPlaceCode: '1203603',
          buildingObjectCode: '2168187',
          districtCode: '3109',
          municipalityCode: '554782',
          municipalityDistrictCode: '500224',
          municipalityPartCode: '40798',
          postalCode: '10100',
          regionCode: '19',
          stableAddressId: 'ruian-cz:1203603',
          streetCode: '456891',
        },
        sourceLineage: {
          atomEntryId: 'atom-entry-20260626',
          checksumSha256: 'sha256-test-checksum',
          datasetVersion: '2026-06-26',
          feedId: 'RUIAN-S-ZA-U',
          fileKind: 'baseline',
          sourceGeneratedAt: '2026-06-26T00:00:00Z',
          sourceUri: 'https://atom.cuzk.gov.cz/RUIAN-S-ZA-U/example.zip',
          sourceValidAt: '2026-06-25',
          sourceVersion: '20260626',
          snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
          sourceId: 'ruian-cz',
          sourceRowId: '1203603',
        },
      },
    });
  });

  it('streams official-style RUIAN CSV rows into address snapshot rows with baseline metadata', async () => {
    const csv = [
      [
        'Kód adresního místa',
        'Kód stavebního objektu',
        'Kód obce',
        'Název obce',
        'Kód části obce',
        'Název části obce',
        'Kód ulice',
        'Název ulice',
        'Číslo domovní',
        'Číslo orientační',
        'PSČ',
        'Zeměpisná šířka',
        'Zeměpisná délka',
      ].join(';'),
      [
        '1 203 603',
        '2 168 187',
        '554 782',
        'Praha 10',
        '40 798',
        'Vršovice',
        '456 891',
        'K Louži',
        '1258',
        '12',
        '10100',
        '50,067',
        '14.455',
      ].join(';'),
    ].join('\n');

    const rows = await collectRows(
      parseRuianOfficialCsvSnapshotRows(splitCsvChunks(csv), {
        atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-s-za-u-fixture',
        checksumSha256: 'fixture-sha256',
        datasetVersion: '2026-06-26',
        feedId: 'RUIAN-S-ZA-U',
        fileKind: 'baseline',
        sourceGeneratedAt: '2026-06-26T00:00:00Z',
        sourceId: 'ruian-cz',
        sourceUri: 'https://atom.cuzk.gov.cz/RUIAN-S-ZA-U/example.zip',
        sourceValidAt: '2026-06-25',
        sourceVersion: '20260626',
      }),
    );

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'ruian-cz:1203603',
        latitude: 50.067,
        longitude: 14.455,
        parts: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '101 00',
          street: 'K Louži',
        },
        ruian: expect.objectContaining({
          addressPlaceCode: '1203603',
          buildingObjectCode: '2168187',
          municipalityCode: '554782',
          municipalityPartCode: '40798',
          postalCode: '10100',
          stableAddressId: 'ruian-cz:1203603',
          streetCode: '456891',
        }),
        sourceLineage: {
          atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-s-za-u-fixture',
          checksumSha256: 'fixture-sha256',
          datasetVersion: '2026-06-26',
          feedId: 'RUIAN-S-ZA-U',
          fileKind: 'baseline',
          sourceGeneratedAt: '2026-06-26T00:00:00Z',
          sourceId: 'ruian-cz',
          sourceRowId: '1203603',
          sourceUri: 'https://atom.cuzk.gov.cz/RUIAN-S-ZA-U/example.zip',
          sourceValidAt: '2026-06-25',
          sourceVersion: '20260626',
        },
      }),
    ]);
  });

  it('imports streamed official RUIAN CSV rows with source checksum and feed metadata', async () => {
    const csv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100',
    ].join('\n');
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-26',
      modificationNoteSha256: 'c'.repeat(64),
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.zip',
      sourceId: 'ruian-cz',
    });
    const sourceLineage = {
      atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-csv-adr-st-fixture',
      checksumSha256: 'fixture-sha256',
      datasetVersion: '2026-06-26',
      feedId: 'RUIAN-CSV-ADR-ST',
      fileKind: 'baseline',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.zip',
      sourceGeneratedAt: '2026-06-26T00:00:00Z',
      sourceId: 'ruian-cz',
      sourceRowId: 'ruian-official-baseline',
      sourceUri: 'https://vdp.cuzk.gov.cz/vymenny_format/csv/example_OB_ADR_csv.zip',
      sourceValidAt: '2026-06-25',
      sourceVersion: '20260626',
    } as const;
    const rows = parseRuianOfficialCsvSnapshotRows(splitCsvChunks(csv), {
      ...sourceLineage,
    });
    const importResult = await runAddressDatasetImport({
      chunkSize: 1,
      repositories,
      rows,
      runId: 'import-ruian-cz-official-baseline-fixture',
      source,
      sourceLineage,
    });

    expect(importResult).toMatchObject({
      errors: [],
      insertedRows: 1,
      rawSnapshotStoredInD1: false,
      source: expect.objectContaining({
        modificationNoteSha256: 'c'.repeat(64),
      }),
      totalRows: 1,
    });
    expect(importResult.importRun).toMatchObject({
      atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-csv-adr-st-fixture',
      checksumSha256: 'fixture-sha256',
      importKind: 'baseline',
      sourceFeedId: 'RUIAN-CSV-ADR-ST',
      sourceGeneratedAt: '2026-06-26T00:00:00Z',
      sourceUri: 'https://vdp.cuzk.gov.cz/vymenny_format/csv/example_OB_ADR_csv.zip',
      sourceValidAt: '2026-06-25',
      sourceVersion: '20260626',
    });
    await expect(
      repositories.addressRecords.getAddressRecord('ruian-cz:1203603'),
    ).resolves.toMatchObject({
      displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
      sourceLineage: expect.objectContaining({
        checksumSha256: 'fixture-sha256',
        lastImportRunId: 'import-ruian-cz-official-baseline-fixture',
        sourceRecordId: '1203603',
        sourceUri: 'https://vdp.cuzk.gov.cz/vymenny_format/csv/example_OB_ADR_csv.zip',
      }),
    });
  });

  it('rejects a reused official RUIAN import run id with a different checksum', async () => {
    const csv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100',
    ].join('\n');
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-26',
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.zip',
      sourceId: 'ruian-cz',
    });
    const runId = 'import-ruian-cz-official-checksum-guard-fixture';
    const sourceLineage = {
      checksumSha256: 'fixture-sha256-a',
      datasetVersion: '2026-06-26',
      feedId: 'RUIAN-CSV-ADR-ST',
      fileKind: 'baseline',
      sourceId: 'ruian-cz',
      sourceRowId: 'ruian-official-baseline',
      sourceUri: 'https://vdp.cuzk.gov.cz/vymenny_format/csv/example_OB_ADR_csv.zip',
      sourceVersion: '20260626',
    } as const;

    await runAddressDatasetImport({
      repositories,
      rows: parseRuianOfficialCsvSnapshotRows(splitCsvChunks(csv), sourceLineage),
      runId,
      source,
      sourceLineage,
    });

    await expect(
      runAddressDatasetImport({
        repositories,
        rows: parseRuianOfficialCsvSnapshotRows(splitCsvChunks(csv), {
          ...sourceLineage,
          checksumSha256: 'fixture-sha256-b',
          sourceVersion: '20260627',
        }),
        runId,
        source,
        sourceLineage: {
          ...sourceLineage,
          checksumSha256: 'fixture-sha256-b',
          sourceVersion: '20260627',
        },
      }),
    ).rejects.toMatchObject({
      code: 'import-run-conflict',
      message: expect.stringContaining('checksumSha256'),
      name: 'SmartSuggestStorageError',
    });
    await expect(repositories.importRuns.getImportRun(runId)).resolves.toMatchObject({
      checksumSha256: 'fixture-sha256-a',
      status: 'completed',
    });
    await expect(
      runAddressDatasetImport({
        repositories,
        rows: parseRuianOfficialCsvSnapshotRows(splitCsvChunks(csv), sourceLineage),
        runId,
        source,
        sourceLineage,
      }),
    ).resolves.toMatchObject({
      importRun: {
        checksumSha256: 'fixture-sha256-a',
        status: 'completed',
      },
      insertedRows: 1,
    });
  });

  it('imports streamed official RUIAN delta rows and tombstones in one restartable run', async () => {
    const baselineCsv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100',
      '1203604;Praha 10;Vršovice;K Louži;1259;14;10100',
    ].join('\n');
    const deltaCsv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ;Zrušeno;Datum zániku;Důvod zrušení',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100;;;',
      '1203604;;;;;;;ano;2026-06-27;removed by RUIAN delta',
    ].join('\n');
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-27',
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-27.zip',
      sourceId: 'ruian-cz',
    });
    const baselineAtomEntryId = 'tag:atom.cuzk.gov.cz,2026:ruian-csv-adr-st-baseline-fixture';

    const baselineImportInput = {
      chunkSize: 1,
      repositories,
      rows: parseRuianOfficialCsvSnapshotRows(splitCsvChunks(baselineCsv), {
        atomEntryId: baselineAtomEntryId,
        datasetVersion: '2026-06-26',
        fileKind: 'baseline',
        sourceId: 'ruian-cz',
      }),
      runId: 'import-ruian-cz-baseline-idempotency-fixture',
      source,
      sourceLineage: {
        atomEntryId: baselineAtomEntryId,
        datasetVersion: '2026-06-26',
        fileKind: 'baseline',
        sourceId: 'ruian-cz',
        sourceRowId: 'ruian-official-baseline',
      },
    } as const;

    await runAddressDatasetImport(baselineImportInput);
    await runAddressDatasetImport({
      ...baselineImportInput,
      rows: parseRuianOfficialCsvSnapshotRows(splitCsvChunks(baselineCsv), {
        atomEntryId: baselineAtomEntryId,
        datasetVersion: '2026-06-26',
        fileKind: 'baseline',
        sourceId: 'ruian-cz',
      }),
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'K Louži',
      }),
    ).resolves.toHaveLength(2);

    const deltaLineage = {
      atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-s-za-z-fixture',
      checksumSha256: 'delta-fixture-sha256',
      datasetVersion: '2026-06-27',
      feedId: 'RUIAN-S-ZA-Z',
      fileKind: 'delta',
      previousAtomEntryId: baselineAtomEntryId,
      sourceId: 'ruian-cz',
      sourceRowId: 'ruian-official-delta',
      sourceUri: 'https://atom.cuzk.gov.cz/RUIAN-S-ZA-Z/example.zip',
      sourceValidAt: '2026-06-27',
      sourceVersion: '20260627',
    } as const;
    const deltaResult = await runAddressDatasetImport({
      chunkSize: 1,
      repositories,
      rows: parseRuianOfficialCsvSnapshotChanges(splitCsvChunks(deltaCsv), {
        ...deltaLineage,
      }),
      runId: 'import-ruian-cz-delta-fixture',
      source,
      sourceLineage: deltaLineage,
    });
    const repeatedDeltaResult = await runAddressDatasetImport({
      chunkSize: 1,
      repositories,
      rows: parseRuianOfficialCsvSnapshotChanges(splitCsvChunks(deltaCsv), {
        ...deltaLineage,
      }),
      runId: 'import-ruian-cz-delta-fixture',
      source,
      sourceLineage: deltaLineage,
    });

    expect(deltaResult).toMatchObject({
      errors: [],
      insertedRows: 1,
      tombstonedRows: 1,
      totalRows: 2,
      upsertedRows: 1,
    });
    expect(repeatedDeltaResult).toMatchObject({
      errors: [],
      insertedRows: 1,
      tombstonedRows: 1,
      totalRows: 2,
      upsertedRows: 1,
    });
    expect(deltaResult.importRun).toMatchObject({
      checksumSha256: 'delta-fixture-sha256',
      importKind: 'delta',
      sourceFeedId: 'RUIAN-S-ZA-Z',
      tombstonedRows: 1,
      totalRows: 2,
      upsertedRows: 1,
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'K Louži',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'ruian-cz:1203603',
      }),
    ]);
    await expect(
      repositories.addressRecords.getAddressRecord('ruian-cz:1203604'),
    ).resolves.toMatchObject({
      replicationStatus: 'tombstoned',
      searchVisible: false,
      sourceLineage: expect.objectContaining({
        lastImportRunId: 'import-ruian-cz-delta-fixture',
        sourceRecordId: '1203604',
      }),
      visibility: expect.objectContaining({
        reason: 'removed by RUIAN delta',
      }),
    });
    await expect(repositories.addressTombstones.listAddressTombstones(10)).resolves.toHaveLength(1);
  });

  it('rejects an out-of-order RUIAN delta whose previous file does not match latest import', async () => {
    const baselineCsv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100',
    ].join('\n');
    const deltaCsv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100',
    ].join('\n');
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-27',
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-27.zip',
      sourceId: 'ruian-cz',
    });
    const baselineAtomEntryId = 'tag:atom.cuzk.gov.cz,2026:ruian-baseline-for-delta-order';
    const wrongPreviousAtomEntryId = 'tag:atom.cuzk.gov.cz,2026:not-the-latest-import';

    await runAddressDatasetImport({
      repositories,
      rows: parseRuianOfficialCsvSnapshotRows(splitCsvChunks(baselineCsv), {
        atomEntryId: baselineAtomEntryId,
        datasetVersion: '2026-06-26',
        fileKind: 'baseline',
        sourceId: 'ruian-cz',
      }),
      runId: 'import-ruian-cz-baseline-delta-order-fixture',
      source,
      sourceLineage: {
        atomEntryId: baselineAtomEntryId,
        datasetVersion: '2026-06-26',
        fileKind: 'baseline',
        sourceId: 'ruian-cz',
        sourceRowId: 'ruian-official-baseline',
      },
    });

    await expect(
      runAddressDatasetImport({
        repositories,
        rows: parseRuianOfficialCsvSnapshotChanges(splitCsvChunks(deltaCsv), {
          atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-delta-out-of-order',
          datasetVersion: '2026-06-27',
          fileKind: 'delta',
          previousAtomEntryId: wrongPreviousAtomEntryId,
          sourceId: 'ruian-cz',
        }),
        runId: 'import-ruian-cz-delta-out-of-order-fixture',
        source,
        sourceLineage: {
          atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-delta-out-of-order',
          datasetVersion: '2026-06-27',
          fileKind: 'delta',
          previousAtomEntryId: wrongPreviousAtomEntryId,
          sourceId: 'ruian-cz',
          sourceRowId: 'ruian-official-delta',
        },
      }),
    ).rejects.toThrow(/out of order/u);
  });

  it('checks RUIAN delta continuity against the latest matching source and shard import', async () => {
    const baselineCsv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100',
    ].join('\n');
    const deltaCsv = [
      'Kód adresního místa;Název obce;Název části obce;Název ulice;Číslo domovní;Číslo orientační;PSČ',
      '1203603;Praha 10;Vršovice;K Louži;1258;12;10100',
    ].join('\n');
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-27',
      shardCountryCode: 'CZ',
      sourceId: 'ruian-cz',
    });
    const baselineAtomEntryId = 'tag:atom.cuzk.gov.cz,2026:ruian-baseline-hidden-by-unrelated-runs';

    await runAddressDatasetImport({
      repositories,
      rows: parseRuianOfficialCsvSnapshotRows(splitCsvChunks(baselineCsv), {
        atomEntryId: baselineAtomEntryId,
        datasetVersion: '2026-06-26',
        fileKind: 'baseline',
        sourceId: 'ruian-cz',
      }),
      runId: 'import-ruian-cz-baseline-many-unrelated-fixture',
      source,
      sourceLineage: {
        atomEntryId: baselineAtomEntryId,
        datasetVersion: '2026-06-26',
        fileKind: 'baseline',
        sourceId: 'ruian-cz',
        sourceRowId: 'ruian-official-baseline',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 2));

    for (let index = 0; index < 55; index += 1) {
      const runId = `import-unrelated-sk-baseline-${index}`;
      await repositories.importRuns.startImportRun({
        id: runId,
        importKind: 'baseline',
        shardCountryCode: 'SK',
        sourceId: 'register-adries-sk',
      });
      await repositories.importRuns.finishImportRun({
        completedAt: `2026-06-28T12:${String(index).padStart(2, '0')}:00.000Z`,
        failedRows: 0,
        id: runId,
        insertedRows: 1,
        status: 'completed',
        totalRows: 1,
      });
    }

    await expect(
      runAddressDatasetImport({
        repositories,
        rows: parseRuianOfficialCsvSnapshotChanges(splitCsvChunks(deltaCsv), {
          atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-delta-after-many-unrelated-runs',
          datasetVersion: '2026-06-27',
          fileKind: 'delta',
          previousAtomEntryId: baselineAtomEntryId,
          sourceId: 'ruian-cz',
        }),
        runId: 'import-ruian-cz-delta-after-many-unrelated-runs-fixture',
        source,
        sourceLineage: {
          atomEntryId: 'tag:atom.cuzk.gov.cz,2026:ruian-delta-after-many-unrelated-runs',
          datasetVersion: '2026-06-27',
          fileKind: 'delta',
          previousAtomEntryId: baselineAtomEntryId,
          sourceId: 'ruian-cz',
          sourceRowId: 'ruian-official-delta',
        },
      }),
    ).resolves.toMatchObject({
      errors: [],
      importRun: {
        importKind: 'delta',
      },
      totalRows: 1,
    });
  });

  it('keeps valid imported rows searchable when later rows are rejected', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-28',
      shardCountryCode: 'CZ',
      sourceId: 'ruian-cz',
    });
    const result = await runAddressDatasetImport({
      chunkSize: 2,
      repositories,
      rows: [
        {
          id: 'ruian-cz:1203603',
          parts: {
            city: 'Praha 10',
            countryCode: 'CZ',
            district: 'Vršovice',
            houseNumber: '1258',
            orientationNumber: '12',
            postalCode: '101 00',
            street: 'K Louži',
          },
        },
        {
          id: 'ruian-cz:bad-administrative-row',
          parts: {
            countryCode: 'CZ',
            street: 'K Louži',
          },
        },
      ],
      runId: 'import-ruian-cz-failed-row-isolation-fixture',
      source,
    });

    expect(result).toMatchObject({
      errors: [
        expect.objectContaining({
          index: 1,
          rowId: 'ruian-cz:bad-administrative-row',
        }),
      ],
      insertedRows: 1,
      totalRows: 2,
    });
    expect(result.importRun).toMatchObject({
      failedRows: 1,
      insertedRows: 1,
      skippedRows: 1,
      status: 'completed',
      totalRows: 2,
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'K Louži 1258',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'ruian-cz:1203603',
      }),
    ]);
    await expect(
      repositories.addressRecords.getAddressRecord('ruian-cz:bad-administrative-row'),
    ).resolves.toBeUndefined();
  });

  it('marks invalid RUIAN address rows as hidden from search', () => {
    const parsed = parseRuianAddressSnapshotRow({
      'Důvod neplatnosti': 'address place retired by source',
      'Globální id návrhu změny': 'G-123',
      'Id transakce': 'TX-456',
      'Kód adresního místa': '1203603',
      Obec: 'Praha 10',
      'Platí od': '2026-01-01',
      'Platí do': '2026-06-26',
      Platný: 'ne',
      PSČ: '10100',
      Stav: 'neplatný',
      Ulice: 'K Louži',
      'Číslo popisné': '1258',
    });

    expect(parsed).toMatchObject({
      ok: true,
      row: {
        visibility: {
          invalid: true,
          changeProposalGlobalId: 'G-123',
          reason: 'address place retired by source',
          searchVisibility: 'hidden',
          sourceStatus: 'neplatný',
          transactionId: 'TX-456',
          validFrom: '2026-01-01',
          validTo: '2026-06-26',
        },
      },
    });
  });

  it('parses RUIAN tombstones separately from partial address rows', () => {
    const parsed = parseRuianAddressTombstoneRow(
      {
        'Datum zániku': '2026-06-26',
        'Důvod zrušení': 'removed from source snapshot',
        'Kód adresního místa': '1 203 603',
        'Kód stavebního objektu': '2 168 187',
        Zrušeno: 'ano',
      },
      {
        datasetVersion: '2026-06-26',
        snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
      },
    );

    expect(parsed).toMatchObject({
      ok: true,
      tombstone: {
        deletedAt: '2026-06-26',
        id: 'ruian-cz:1203603',
        reason: 'removed from source snapshot',
        ruian: {
          addressPlaceCode: '1203603',
          buildingObjectCode: '2168187',
          stableAddressId: 'ruian-cz:1203603',
        },
        sourceLineage: {
          datasetVersion: '2026-06-26',
          snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
          sourceId: 'ruian-cz',
          sourceRowId: '1203603',
        },
      },
    });
  });

  it('collects tombstones during batch RUIAN mapping without emitting address rows', () => {
    const result = mapRuianAddressSnapshotRows([
      {
        'Kód adresního místa': '1203603',
        Obec: 'Praha 10',
        PSČ: '10100',
        Ulice: 'K Louži',
        'Číslo popisné': '1258',
      },
      {
        'Datum zániku': '2026-06-26',
        'Kód adresního místa': '1203604',
        Zrušeno: true,
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.tombstones).toEqual([
      expect.objectContaining({
        deletedAt: '2026-06-26',
        id: 'ruian-cz:1203604',
      }),
    ]);
  });

  it('rejects partial administrative rows before they become address snapshot rows', () => {
    const result = mapRuianAddressSnapshotRows([
      {
        Kraj: 'Hlavní město Praha',
        'Kód ADM': 'region-row',
        Ulice: 'K Louži',
      },
      {
        Obec: 'Praha',
        PSČ: '101 00',
        Ulice: 'K Louži',
      },
      {
        Obec: 'Praha',
        'Kód ADM': 'municipality-row',
        PSČ: '101 00',
      },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'partial-address-row',
        index: 0,
        missingFields: ['city', 'houseNumber', 'postalCode'],
        sourceRowId: 'region-row',
      }),
      expect.objectContaining({
        code: 'missing-source-row-id',
        index: 1,
      }),
      expect.objectContaining({
        code: 'partial-address-row',
        index: 2,
        missingFields: ['street', 'houseNumber'],
        sourceRowId: 'municipality-row',
      }),
    ]);
    expect(result.tombstones).toEqual([]);
  });
});
