import { createInMemorySmartSuggestRepositories } from '@techsio/smart-suggest-storage';
import { describe, expect, it } from 'vitest';

import {
  CZ_SAMPLE_ADDRESSES,
  createAddressImportRunId,
  createAuthoritativeAddressImportSource,
  OPENADDRESSES_US_CA_SAMPLE_SOURCE,
  REGISTER_ADRIES_SK_SAMPLE_SOURCE,
  RUIAN_CZ_SAMPLE_SOURCE,
  runAddressDatasetImport,
  searchSampleAddressFixtures,
  seedSampleAddressDatasets,
} from '../src/index';

describe('sample smart suggest datasets', () => {
  it('defines source attribution and sample address records', () => {
    expect(RUIAN_CZ_SAMPLE_SOURCE).toMatchObject({
      attribution: expect.objectContaining({
        label: 'RUIAN sample',
        license: 'CC BY 4.0',
      }),
      cachePolicy: { kind: 'permanent' },
      countryCode: 'CZ',
      sourceKind: 'owned-dataset',
    });
    expect(REGISTER_ADRIES_SK_SAMPLE_SOURCE.countryCode).toBe('SK');
    expect(OPENADDRESSES_US_CA_SAMPLE_SOURCE.region).toBe('CA');
    expect(CZ_SAMPLE_ADDRESSES.length).toBeGreaterThan(0);
  });

  it('seeds source registry and normalized records through repository APIs', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const result = await seedSampleAddressDatasets(repositories);

    expect(result.sources).toHaveLength(3);
    expect(result.records.map((record) => record.searchLabel)).toContain(
      'vaclavske namesti 832 19 110 00 praha praha 1 cz',
    );
    expect(result.records.map((record) => record.searchLabel)).toContain(
      'k louzi 1258 12 101 00 praha 10 vrsovice cz',
    );
    expect(await repositories.dataSources.getDataSource(RUIAN_CZ_SAMPLE_SOURCE.id)).toMatchObject({
      attribution: expect.objectContaining({ label: 'RUIAN sample' }),
    });
  });

  it('searches CZ and SK sample records with diacritics-insensitive ranking', () => {
    expect(
      searchSampleAddressFixtures('vaclavske 832', {
        countryCode: 'CZ',
        limit: 1,
      })[0],
    ).toMatchObject({
      id: 'cz-ruian-vaclavske-namesti-832-19',
      ranking: expect.objectContaining({
        reasons: expect.arrayContaining(['house-number:match']),
      }),
    });

    expect(
      searchSampleAddressFixtures('K Louži 1258/12', {
        countryCode: 'CZ',
        limit: 1,
      })[0],
    ).toMatchObject({
      id: 'cz-ruian-k-louzi-1258-12',
      ranking: expect.objectContaining({
        reasons: expect.arrayContaining(['house-number:pair-exact:1258/12']),
      }),
    });

    expect(
      searchSampleAddressFixtures('zizkova zilina', {
        countryCode: 'SK',
        limit: 1,
      })[0],
    ).toMatchObject({
      id: 'sk-register-adries-zizkova-45',
    });

    expect(
      searchSampleAddressFixtures('mission san francisco', {
        countryCode: 'US',
        limit: 1,
      })[0],
    ).toMatchObject({
      id: 'us-openaddresses-ca-mission-1',
    });
  });

  it('creates deterministic authoritative import source and run metadata from the source catalog', () => {
    const metadata = {
      datasetVersion: '2026-06-26',
      modificationNoteSha256: 'b'.repeat(64),
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
      sourceId: 'ruian-cz',
    } as const;

    expect(createAddressImportRunId(metadata)).toBe('import-ruian-cz-cz-2026-06-26');
    expect(createAuthoritativeAddressImportSource(metadata)).toMatchObject({
      attribution: {
        label: 'CUZK RUIAN',
        license: 'CC BY 4.0',
        url: 'https://ruian.cuzk.cz/',
      },
      cachePolicy: { kind: 'permanent' },
      countryCode: 'CZ',
      datasetVersion: '2026-06-26',
      id: 'ruian-cz',
      modificationNoteSha256: 'b'.repeat(64),
      name: 'RUIAN Czech Republic',
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
      sourceKind: 'owned-dataset',
    });
  });

  it('runs RUIAN chunked imports with bad-row accounting and restartable upserts', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-26',
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
      sourceId: 'ruian-cz',
    });
    const result = await runAddressDatasetImport({
      chunkSize: 1,
      repositories,
      rows: [
        {
          id: 'cz-ruian-vaclavske-namesti-833-20',
          parts: {
            city: 'Praha',
            countryCode: 'CZ',
            district: 'Praha 1',
            houseNumber: '833',
            orientationNumber: '20',
            postalCode: '110 00',
            street: 'Václavské náměstí',
          },
          quality: 0.97,
        },
        {
          id: 'bad-row',
          parts: {
            countryCode: 'CZ',
          },
        },
        {
          id: 'cz-ruian-na-prikope-10',
          parts: {
            city: 'Praha',
            countryCode: 'CZ',
            houseNumber: '10',
            postalCode: '110 00',
            street: 'Na Příkopě',
          },
        },
        {
          id: 'wrong-shard',
          parts: {
            city: 'Bratislava',
            countryCode: 'SK',
            houseNumber: '1',
            postalCode: '811 01',
            street: 'Hlavná',
          },
        },
      ],
      runId: 'import-ruian-cz-cz-2026-06-26',
      source,
    });

    expect(result).toMatchObject({
      insertedRows: 2,
      rawSnapshotStoredInD1: false,
      restartable: true,
      shardCountryCode: 'CZ',
      snapshotUri: 'r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl',
      totalRows: 4,
    });
    expect(result.errors).toEqual([
      expect.objectContaining({ index: 1, rowId: 'bad-row' }),
      expect.objectContaining({ index: 3, rowId: 'wrong-shard' }),
    ]);
    expect(result.importRun).toMatchObject({
      failedRows: 2,
      insertedRows: 2,
      status: 'completed',
      totalRows: 4,
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'prikope',
      }),
    ).resolves.toHaveLength(1);
    await expect(
      repositories.addressRecords.getAddressRecord('cz-ruian-na-prikope-10'),
    ).resolves.toMatchObject({
      attribution: {
        label: 'CUZK RUIAN',
        license: 'CC BY 4.0',
        url: 'https://ruian.cuzk.cz/',
      },
      displayLabel: 'Na Příkopě 10, 110 00 Praha, CZ',
      quality: 0.95,
      searchLabel: 'na prikope 10 110 00 praha cz',
      sourceId: 'ruian-cz',
    });

    await expect(
      runAddressDatasetImport({
        chunkSize: 2,
        repositories,
        rows: [
          {
            id: 'cz-ruian-vaclavske-namesti-833-20',
            parts: {
              city: 'Praha',
              countryCode: 'CZ',
              houseNumber: '833',
              orientationNumber: '20',
              postalCode: '110 00',
              street: 'Václavské náměstí',
            },
            quality: 0.97,
          },
        ],
        runId: 'import-ruian-cz-cz-2026-06-26',
        source,
      }),
    ).resolves.toMatchObject({
      importRun: { insertedRows: 1, status: 'completed', totalRows: 1 },
      restartable: true,
    });
  });

  it('requires source catalog bulk-import approval before permanent imports', async () => {
    const blockedSources = [
      {
        attribution: { label: 'Register adries SK' },
        cachePolicy: { kind: 'permanent' },
        countryCode: 'SK',
        id: 'register-adries-sk',
        name: 'Register adries Slovakia',
        shardCountryCode: 'SK',
        sourceKind: 'owned-dataset',
      },
      {
        attribution: { label: 'OpenAddresses' },
        cachePolicy: { kind: 'permanent' },
        countryCode: 'US',
        id: 'openaddresses',
        name: 'OpenAddresses blanket source',
        shardCountryCode: 'US',
        sourceKind: 'owned-dataset',
      },
      {
        attribution: { label: 'Mapy.com / Mapy.cz' },
        cachePolicy: { kind: 'permanent' },
        countryCode: 'CZ',
        id: 'mapy-cz',
        name: 'Mapy.cz provider policy',
        shardCountryCode: 'CZ',
        sourceKind: 'live-provider',
      },
      {
        attribution: { label: 'HERE Discover' },
        cachePolicy: { kind: 'permanent' },
        countryCode: 'CZ',
        id: 'here-discover',
        name: 'HERE Discover provider policy',
        shardCountryCode: 'CZ',
        sourceKind: 'live-provider',
      },
      {
        attribution: { label: 'OpenStreetMap contributors' },
        cachePolicy: { kind: 'permanent' },
        countryCode: 'CZ',
        id: 'nominatim-managed',
        name: 'Managed Nominatim provider policy',
        shardCountryCode: 'CZ',
        sourceKind: 'live-provider',
      },
    ] as const;

    for (const source of blockedSources) {
      const repositories = createInMemorySmartSuggestRepositories();
      const runId = `blocked-${source.id}`;

      await expect(
        runAddressDatasetImport({
          repositories,
          rows: [
            {
              id: `${source.id}-row`,
              parts: {
                city: 'Praha',
                countryCode: source.shardCountryCode,
                houseNumber: '1',
                street: 'Testovací',
              },
            },
          ],
          runId,
          source,
        }),
      ).rejects.toThrow('permanent Smart Suggest source writes');
      await expect(repositories.dataSources.getDataSource(source.id)).resolves.toBeUndefined();
      await expect(repositories.importRuns.getImportRun(runId)).resolves.toBeUndefined();
    }
  });

  it('marks import runs failed when repository writes fail', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: '2026-06-26',
      shardCountryCode: 'CZ',
      sourceId: 'ruian-cz',
    });

    repositories.addressRecords.upsertAddressRecords = () =>
      Promise.reject(new Error('D1 write failed'));

    await expect(
      runAddressDatasetImport({
        repositories,
        rows: [
          {
            id: 'cz-ruian-write-failure',
            parts: {
              city: 'Praha',
              countryCode: 'CZ',
              houseNumber: '1',
              postalCode: '110 00',
              street: 'Na Příkopě',
            },
          },
        ],
        runId: 'import-ruian-cz-failed',
        source,
      }),
    ).rejects.toThrow('D1 write failed');

    await expect(
      repositories.importRuns.getImportRun('import-ruian-cz-failed'),
    ).resolves.toMatchObject({
      errorSummary: 'D1 write failed',
      failedRows: 1,
      insertedRows: 0,
      status: 'failed',
      totalRows: 1,
    });
  });
});
