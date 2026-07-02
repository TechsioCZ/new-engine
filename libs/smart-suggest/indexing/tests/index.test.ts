import { describe, expect, it } from 'vitest';

import {
  createAddressIndexDocument,
  createAddressLabels,
  createPrefixTokens,
  extractHouseNumberCandidates,
  extractPostalCodeCandidates,
  normalizeSearchText,
  rankAddressCandidates,
  scoreAddressCandidate,
  scoreAddressRecordQuality,
  tokenizeAddressText,
} from '../src/indexing';

describe('address text normalization', () => {
  it('normalizes Czech and Slovak diacritics, casing, punctuation, and whitespace', () => {
    expect(normalizeSearchText('  Žižkova,  Čadca – Čierna   Ľubovňa! ')).toBe(
      'zizkova cadca cierna lubovna',
    );
  });

  it('generates stable unique tokens and prefix tokens', () => {
    const tokens = tokenizeAddressText('Hlavná Hlavna 12, 811 01 Bratislava');

    expect(tokens).toEqual(['hlavna', '12', '811', '01', 'bratislava']);
    expect(createPrefixTokens(tokens, { minLength: 2, maxLength: 4 })).toEqual([
      'hl',
      'hla',
      'hlav',
      '12',
      '81',
      '811',
      '01',
      'br',
      'bra',
      'brat',
    ]);
  });
});

describe('address candidate extraction', () => {
  it('extracts Czech and Slovak postal-code candidates from mixed input', () => {
    expect(extractPostalCodeCandidates('Vinohradská 12/34, 120 00 Praha 2')).toMatchObject([
      { value: '12000', displayValue: '120 00' },
    ]);

    expect(extractPostalCodeCandidates('Hlavná 7, SK-81101 Bratislava')).toEqual([
      {
        value: '81101',
        displayValue: '811 01',
        sourceText: '81101',
        start: 13,
        end: 18,
      },
    ]);
  });

  it('extracts slash, explicit, and street house-number candidates', () => {
    expect(extractHouseNumberCandidates('Václavské náměstí 832/19, 110 00 Praha')).toMatchObject([
      {
        houseNumber: '832',
        orientationNumber: '19',
        displayValue: '832/19',
        reason: 'slash',
      },
    ]);

    expect(extractHouseNumberCandidates('č.p. 45, č.o. 7, Žilina')).toEqual([
      {
        houseNumber: '45',
        displayValue: '45',
        sourceText: 'č.p. 45',
        start: 0,
        end: 7,
        reason: 'explicit-house',
      },
      {
        houseNumber: '7',
        orientationNumber: '7',
        displayValue: '7',
        sourceText: 'č.o. 7',
        start: 9,
        end: 15,
        reason: 'explicit-orientation',
      },
    ]);

    expect(extractHouseNumberCandidates('Masarykova 12, 602 00 Brno')).toEqual([
      {
        houseNumber: '12',
        displayValue: '12',
        sourceText: '12',
        start: 11,
        end: 13,
        reason: 'street-number',
      },
    ]);
  });
});

describe('address labels and index documents', () => {
  it('creates normalized display and search labels from address parts', () => {
    const labels = createAddressLabels({
      countryCode: 'CZ',
      city: 'Praha',
      district: 'Praha 2',
      street: 'Vinohradská',
      houseNumber: '12',
      orientationNumber: '34',
      postalCode: '120 00',
    });

    expect(labels).toEqual({
      displayLabel: 'Vinohradská 12/34, 120 00 Praha, Praha 2, CZ',
      searchLabel: 'vinohradska 12 34 120 00 praha praha 2 cz',
    });
  });

  it('creates a complete index document', () => {
    const document = createAddressIndexDocument({
      countryCode: 'SK',
      city: 'Bratislava',
      street: 'Hlavná',
      houseNumber: '7',
      postalCode: '811 01',
    });

    expect(document.displayLabel).toBe('Hlavná 7, 811 01 Bratislava, SK');
    expect(document.tokens).toEqual(['hlavna', '7', '811', '01', 'bratislava', 'sk']);
    expect(document.postalCodeCandidates).toMatchObject([{ value: '81101' }]);
    expect(document.houseNumberCandidates).toMatchObject([
      { houseNumber: '7', reason: 'street-number' },
    ]);
  });
});

describe('address ranking', () => {
  const candidates = [
    {
      id: 'bratislava',
      displayLabel: 'Hlavná 7, 811 01 Bratislava, SK',
      address: {
        city: 'Bratislava',
        street: 'Hlavná',
        houseNumber: '7',
        postalCode: '811 01',
      },
      confidence: 0.6,
    },
    {
      id: 'praha',
      displayLabel: 'Vinohradská 12/34, 120 00 Praha, CZ',
      address: {
        city: 'Praha',
        street: 'Vinohradská',
        houseNumber: '12',
        orientationNumber: '34',
        postalCode: '120 00',
      },
      confidence: 0.6,
    },
  ] as const;

  it('scores deterministically with diagnostics', () => {
    const scored = scoreAddressCandidate('vinohrad 12/34 12000', candidates[1]);

    expect(scored.score).toBeGreaterThan(0);
    expect(scored.reasons).toContain('postal:match');
    expect(scored.reasons).toContain('house-number:match');
    expect(scored.reasons).toContain('tokens:prefix:1');
  });

  it('ranks matching address forms above unrelated candidates with stable tie breaks', () => {
    const ranked = rankAddressCandidates('Hlavna 7 Bratislava', candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual(['bratislava']);
    expect(ranked[0]?.reasons).toContain('house-number:match');
    expect(ranked[0]?.reasons).toContain('tokens:all-exact');
  });

  it('filters confidence-only candidates for unrelated street text', () => {
    const scored = scoreAddressCandidate('K Louži 1', candidates[1]);
    const ranked = rankAddressCandidates('K Louži 1', candidates);

    expect(scored.reasons).toContain('no-query-match');
    expect(ranked).toEqual([]);
  });

  it('does not treat shared locality as enough for a multi-token street query', () => {
    const kLouziCandidate = {
      address: {
        city: 'Praha',
        countryCode: 'CZ',
        houseNumber: '1',
        postalCode: '101 00',
        street: 'K Louži',
      },
      confidence: 0.95,
      displayLabel: 'K Louži 1, 101 00 Praha, CZ',
      id: 'k-louzi',
    } as const;
    const localityOnlyCandidates = [
      {
        address: {
          city: 'Praha',
          countryCode: 'CZ',
          region: 'Hlavní město Praha',
        },
        confidence: 1,
        displayLabel: 'Praha, Hlavní město Praha, CZ',
        id: 'praha-locality',
      },
      {
        address: {
          countryCode: 'CZ',
          region: 'Hlavní město Praha',
        },
        confidence: 1,
        displayLabel: 'Hlavní město Praha, CZ',
        id: 'praha-region',
      },
    ] as const;
    const ranked = rankAddressCandidates('K Louži Praha', [
      candidates[1],
      ...localityOnlyCandidates,
      kLouziCandidate,
    ]);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual(['k-louzi']);
  });

  it('ranks slash pairs above same-street house and orientation decoys', () => {
    const kLouziCandidates = [
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '784',
          orientationNumber: '3',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 784/3, Vršovice, 10100 Praha 10',
        id: 'k-louzi-784-3',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1258/12, Vršovice, 10100 Praha 10',
        id: 'k-louzi-1258-12',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '7',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1258/7, Vršovice, 10100 Praha 10',
        id: 'k-louzi-1258-7',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1312',
          orientationNumber: '1',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1312/1, Vršovice, 10100 Praha 10',
        id: 'k-louzi-1312-1',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          region: 'Hlavní město Praha',
        },
        confidence: 1,
        displayLabel: 'Praha 10, Hlavní město Praha, CZ',
        id: 'praha-10-locality',
      },
    ] as const;

    const pairRanked = rankAddressCandidates('K Louži 1258/12', kLouziCandidates);

    expect(pairRanked.map(({ candidate }) => candidate.id)).toEqual(['k-louzi-1258-12']);
    expect(pairRanked[0]?.reasons).toContain('house-number:pair-exact:1258/12');
  });

  it('tolerates a single street-token typo when the exact house/orientation pair matches', () => {
    const kLouziCandidates = [
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1258/12, Vršovice, 10100 Praha 10',
        id: 'k-louzi-1258-12',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vinohrady',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '120 00',
          street: 'Vinohradská',
        },
        confidence: 0.98,
        displayLabel: 'Vinohradská 1258/12, Vinohrady, 12000 Praha 10',
        id: 'vinohradska-1258-12',
      },
      {
        address: {
          city: 'Brno',
          countryCode: 'CZ',
          district: 'Stránice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '602 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1258/12, Stránice, 60200 Brno',
        id: 'k-louzi-brno-1258-12',
      },
    ] as const;

    const typoRanked = rankAddressCandidates('K Louzy 1258/12 Praha 10', kLouziCandidates);
    const wrongCityRanked = rankAddressCandidates('K Louži 1258/12 Brno', kLouziCandidates);

    expect(typoRanked.map(({ candidate }) => candidate.id)).toEqual(['k-louzi-1258-12']);
    expect(typoRanked[0]?.reasons).toContain('house-number:pair-exact:1258/12');
    expect(wrongCityRanked.map(({ candidate }) => candidate.id)).toEqual(['k-louzi-brno-1258-12']);
  });

  it('uses orientation-only numbers when street tokens strongly match', () => {
    const kLouziCandidates = [
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '784',
          orientationNumber: '3',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 784/3, Vršovice, 10100 Praha 10',
        id: 'k-louzi-784-3',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1258/12, Vršovice, 10100 Praha 10',
        id: 'k-louzi-1258-12',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '7',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1258/7, Vršovice, 10100 Praha 10',
        id: 'k-louzi-1258-7',
      },
      {
        address: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1312',
          orientationNumber: '1',
          postalCode: '101 00',
          street: 'K Louži',
        },
        confidence: 0.98,
        displayLabel: 'K Louži 1312/1, Vršovice, 10100 Praha 10',
        id: 'k-louzi-1312-1',
      },
    ] as const;

    expect(
      rankAddressCandidates('K Louži', kLouziCandidates).map(({ candidate }) => candidate.id),
    ).toHaveLength(4);
    expect(
      rankAddressCandidates('K Louži 1258', kLouziCandidates).map(({ candidate }) => candidate.id),
    ).toEqual(['k-louzi-1258-12', 'k-louzi-1258-7']);
    expect(
      rankAddressCandidates('K Louži 125', kLouziCandidates).map(({ candidate }) => candidate.id),
    ).toEqual(['k-louzi-1258-12', 'k-louzi-1258-7']);
    const streetFirstRanked = rankAddressCandidates('K Louži 12', kLouziCandidates);
    const numberFirstRanked = rankAddressCandidates('12 K Louži', kLouziCandidates);

    expect(streetFirstRanked.map(({ candidate }) => candidate.id)).toEqual(['k-louzi-1258-12']);
    expect(numberFirstRanked.map(({ candidate }) => candidate.id)).toEqual(['k-louzi-1258-12']);
    expect(streetFirstRanked[0]?.reasons).toContain('house-number:orientation-exact:12');
    expect(numberFirstRanked[0]?.reasons).toContain('house-number:orientation-exact:12');
    expect(
      rankAddressCandidates('K Louži 1', kLouziCandidates).map(({ candidate }) => candidate.id),
    ).toEqual(['k-louzi-1312-1']);
  });

  it('matches house and orientation numbers only by compatible shape', () => {
    const candidate = candidates[1];

    expect(scoreAddressCandidate('Vinohradská 12/34', candidate).reasons).toContain(
      'house-number:match',
    );
    expect(scoreAddressCandidate('Vinohradská 12/99', candidate).reasons).not.toContain(
      'house-number:match',
    );
    expect(scoreAddressCandidate('Vinohradská č.o. 34', candidate).reasons).toContain(
      'house-number:match',
    );
    expect(scoreAddressCandidate('Hlavná č.o. 7', candidates[0]).reasons).not.toContain(
      'house-number:match',
    );
  });

  it('scores imported record quality from structured address completeness', () => {
    expect(
      scoreAddressRecordQuality({
        city: 'Praha',
        countryCode: 'CZ',
        houseNumber: '832',
        orientationNumber: '19',
        postalCode: '110 00',
        street: 'Václavské náměstí',
      }),
    ).toEqual({
      reasons: [
        'baseline',
        'country',
        'locality',
        'postal-code',
        'street-or-line1',
        'house-number',
        'orientation-number',
      ],
      score: 1,
    });

    expect(scoreAddressRecordQuality({ countryCode: 'CZ' }).score).toBeLessThan(0.5);
  });
});
