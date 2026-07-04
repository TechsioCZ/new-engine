#!/usr/bin/env node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/*
 * PROTOTYPE ONLY.
 *
 * Question: how large is the current Smart Suggest address prefix-token index
 * for RUIAN-like Czech rows, and do FTS5 or bounded compact-prefix keys look
 * viable enough to choose a production index ADR? This script creates local
 * throwaway SQLite databases only. It does not import production storage code,
 * touch D1 bindings, call providers, or write generated databases to the repo.
 */

const defaultRowCount = 10_000;
const minCurrentPrefixLength = 1;
const maxCurrentPrefixLength = 16;
const maxCompactPrefixLength = 16;

const parseRowCount = () => {
  const rowsArg = process.argv.find((arg) => arg.startsWith('--rows='));

  if (rowsArg === undefined) {
    return defaultRowCount;
  }

  const rows = Number(rowsArg.slice('--rows='.length));

  if (!Number.isInteger(rows) || rows < 100) {
    throw new Error('--rows must be an integer >= 100');
  }

  return rows;
};

const extraDiacriticReplacements = {
  ß: 'ss',
  Đ: 'D',
  đ: 'd',
  Ħ: 'H',
  ħ: 'h',
  Ł: 'L',
  ł: 'l',
  Ø: 'O',
  ø: 'o',
  Þ: 'Th',
  þ: 'th',
};

const normalizeWhitespace = (value) => value.trim().replaceAll(/\s+/g, ' ');

const stripDiacritics = (value) =>
  value
    .replaceAll(/[ßĐđĦħŁłØøÞþ]/g, (character) => extraDiacriticReplacements[character] ?? character)
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '');

const normalizeDisplayText = (value) =>
  normalizeWhitespace(
    value
      .normalize('NFKC')
      .replaceAll(/[“”„]/g, '"')
      .replaceAll(/[‘’]/g, "'")
      .replaceAll(/[‐‑‒–—]/g, '-')
      .replaceAll(/\s*,\s*/g, ', ')
      .replaceAll(/\s*\/\s*/g, '/')
      .replaceAll(/\s*-\s*/g, '-')
      .replaceAll(/\s+/g, ' '),
  );

const normalizeSearchText = (value) =>
  normalizeWhitespace(
    stripDiacritics(value)
      .toLocaleLowerCase('cs-CZ')
      .replaceAll(/[^\p{L}\p{N}]+/gu, ' '),
  );

const tokenizeAddressText = (value) => {
  const seen = new Set();
  const tokens = [];

  for (const [token] of normalizeSearchText(value).matchAll(/[\p{L}\p{N}]+/gu)) {
    if (token.length === 0 || seen.has(token)) {
      continue;
    }

    seen.add(token);
    tokens.push(token);
  }

  return tokens;
};

const createPrefixTokens = (tokens, { minLength, maxLength }) => {
  const seen = new Set();
  const prefixes = [];

  for (const token of tokens) {
    const normalizedToken = normalizeSearchText(token);

    if (normalizedToken.length < minLength) {
      continue;
    }

    for (
      let length = minLength;
      length <= Math.min(normalizedToken.length, maxLength);
      length += 1
    ) {
      const prefix = normalizedToken.slice(0, length);

      if (!seen.has(prefix)) {
        seen.add(prefix);
        prefixes.push(prefix);
      }
    }
  }

  return prefixes;
};

const formatPostalCode = (digits) => `${digits.slice(0, 3)} ${digits.slice(3)}`;
const postalDigits = (postalCode) => postalCode.replaceAll(/\D+/g, '');

const formatAddressLabel = (parts) => {
  const number =
    parts.houseNumber === undefined
      ? undefined
      : parts.orientationNumber === undefined
        ? parts.houseNumber
        : `${parts.houseNumber}/${parts.orientationNumber}`;
  const streetLine = [parts.street, number].filter(Boolean).join(' ');
  const postalCityLine = [parts.postalCode, parts.city].filter(Boolean).join(' ');

  return normalizeDisplayText(
    [streetLine, postalCityLine, parts.district, parts.countryCode].filter(Boolean).join(', '),
  );
};

const createAddress = (input) => {
  const displayLabel = formatAddressLabel(input.parts);

  return {
    ...input,
    countryCode: input.parts.countryCode,
    displayLabel,
    searchLabel: normalizeSearchText(displayLabel),
  };
};

const streets = [
  'K Louži',
  'Vinohradská',
  'Václavské náměstí',
  'Masarykova',
  'Hlavní',
  'Dlouhá',
  'Na Příkopě',
  'Nádražní',
  'Sokolská',
  'Školní',
  'Komenského',
  'Husova',
  'Jiráskova',
  'Palackého',
  'Tyršova',
  'Žižkova',
  'Lidická',
  'Pražská',
  'Brněnská',
  'Ostravská',
  'U Lesa',
  'Pod Hájem',
  'Nad Potokem',
  'Ke Škole',
  'Na Výsluní',
  'U Hřiště',
  'K Rybníku',
  'Zahradní',
  'Luční',
  'Polní',
  'Lesní',
  'Slunečná',
  'Krátká',
  'Nová',
  'Tichá',
  'Mírová',
  'Příčná',
  'Okružní',
  'U Stadionu',
  'Československé armády',
  'Dr. Edvarda Beneše',
  'Generála Píky',
  '17. listopadu',
  '28. října',
  '5. května',
  'U Tří lip',
  'Pod Zámkem',
  'Na Kopečku',
  'K Cihelně',
  'U Staré školy',
];

const cities = [
  ['Praha 10', 'Vršovice', '10100'],
  ['Praha 2', 'Vinohrady', '12000'],
  ['Praha 1', 'Nové Město', '11000'],
  ['Brno-střed', 'Veveří', '60200'],
  ['Ostrava-Jih', 'Zábřeh', '70030'],
  ['Plzeň 3', 'Jižní Předměstí', '30100'],
  ['České Budějovice', 'České Budějovice 3', '37001'],
  ['Olomouc', 'Nová Ulice', '77900'],
  ['Liberec', 'Liberec I-Staré Město', '46001'],
  ['Hradec Králové', 'Pražské Předměstí', '50002'],
  ['Pardubice', 'Zelené Předměstí', '53002'],
  ['Ústí nad Labem', 'Klíše', '40001'],
  ['Zlín', 'Malenovice', '76001'],
  ['Kladno', 'Kročehlavy', '27201'],
  ['Most', 'Most', '43401'],
  ['Opava', 'Předměstí', '74601'],
  ['Frýdek-Místek', 'Místek', '73801'],
  ['Jihlava', 'Staré Hory', '58601'],
];

const fixedRows = [
  ['ruian-cz:1203603', 'K Louži', '1258', '12', 'Praha 10', 'Vršovice', '10100'],
  ['ruian-cz:1203604', 'K Louži', '1258', '7', 'Praha 10', 'Vršovice', '10100'],
  ['ruian-cz:1203605', 'K Louži', '784', '3', 'Praha 10', 'Vršovice', '10100'],
  ['ruian-cz:1203606', 'K Louži', '1312', '1', 'Praha 10', 'Vršovice', '10100'],
  ['ruian-cz:2200012', 'Vinohradská', '12', '34', 'Praha 2', 'Vinohrady', '12000'],
  ['ruian-cz:3300832', 'Václavské náměstí', '832', '19', 'Praha 1', 'Nové Město', '11000'],
];

const generateRows = (rowCount) => {
  const rows = fixedRows.map(
    ([id, street, houseNumber, orientationNumber, city, district, postalCode]) =>
      createAddress({
        id,
        latitude: 49 + (Number(id.replaceAll(/\D/g, '').slice(-4)) % 1700) / 10_000,
        longitude: 13 + (Number(id.replaceAll(/\D/g, '').slice(-4)) % 2200) / 10_000,
        parts: {
          city,
          countryCode: 'CZ',
          district,
          houseNumber,
          orientationNumber,
          postalCode: formatPostalCode(postalCode),
          street,
        },
        quality: 0.98,
        sourceId: 'ruian-cz',
      }),
  );

  for (let index = rows.length; index < rowCount; index += 1) {
    const street = streets[(index * 17) % streets.length];
    const [city, district, basePostal] = cities[(index * 11) % cities.length];
    const houseNumber = String(1 + ((index * 37) % 4899));
    const orientationNumber = index % 5 === 0 ? undefined : String(1 + ((index * 13) % 79));
    const postalCode = String(Number(basePostal) + (index % 30)).padStart(5, '0');

    rows.push(
      createAddress({
        id: `ruian-cz:${1_500_000 + index}`,
        latitude: 48.55 + ((index * 29) % 2400) / 10_000,
        longitude: 12.1 + ((index * 31) % 6500) / 10_000,
        parts: {
          city,
          countryCode: 'CZ',
          district,
          houseNumber,
          ...(orientationNumber === undefined ? {} : { orientationNumber }),
          postalCode: formatPostalCode(postalCode),
          street,
        },
        quality: 0.9,
        sourceId: 'ruian-cz',
      }),
    );
  }

  return rows;
};

const openDb = (path) => {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = OFF;
    PRAGMA synchronous = OFF;
    PRAGMA temp_store = MEMORY;
    PRAGMA page_size = 4096;
  `);

  return db;
};

const createAddressRecordsSchema = (db) => {
  db.exec(`
    CREATE TABLE smart_suggest_address_records (
      id text PRIMARY KEY,
      source_id text NOT NULL,
      country_code text NOT NULL,
      region text,
      city text,
      district text,
      street text,
      house_number text,
      orientation_number text,
      postal_code text,
      line_1 text,
      line_2 text,
      display_label text NOT NULL,
      search_label text NOT NULL,
      latitude real,
      longitude real,
      quality real NOT NULL DEFAULT 0,
      attribution_json text,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );
    CREATE INDEX smart_suggest_address_country_postal_idx
      ON smart_suggest_address_records (country_code, postal_code);
    CREATE INDEX smart_suggest_address_source_idx
      ON smart_suggest_address_records (source_id);
  `);
};

const insertAddressRecords = (db, rows) => {
  const insert = db.prepare(`
    INSERT INTO smart_suggest_address_records (
      id, source_id, country_code, city, district, street, house_number,
      orientation_number, postal_code, display_label, search_label, latitude,
      longitude, quality, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const timestamp = '2026-06-28T00:00:00.000Z';

  db.exec('BEGIN');

  for (const row of rows) {
    insert.run(
      row.id,
      row.sourceId,
      row.countryCode,
      row.parts.city ?? null,
      row.parts.district ?? null,
      row.parts.street ?? null,
      row.parts.houseNumber ?? null,
      row.parts.orientationNumber ?? null,
      row.parts.postalCode ?? null,
      row.displayLabel,
      row.searchLabel,
      row.latitude ?? null,
      row.longitude ?? null,
      row.quality,
      timestamp,
      timestamp,
    );
  }

  db.exec('COMMIT');
};

const currentTokenRowsFor = (record) => {
  const rows = [];

  for (const token of tokenizeAddressText(record.searchLabel)) {
    for (const prefix of createPrefixTokens([token], {
      maxLength: maxCurrentPrefixLength,
      minLength: minCurrentPrefixLength,
    })) {
      rows.push({
        countryCode: record.countryCode,
        id: `${record.id}\u001f${token}\u001f${prefix}`,
        prefix,
        recordId: record.id,
        token,
        weight: prefix === token ? 2 : 1,
      });
    }
  }

  return rows;
};

const createCurrentPrefixSchema = (db) => {
  db.exec(`
    CREATE TABLE smart_suggest_address_search_tokens (
      id text PRIMARY KEY,
      record_id text NOT NULL,
      country_code text NOT NULL,
      token text NOT NULL,
      prefix text NOT NULL,
      weight real NOT NULL DEFAULT 1
    );
    CREATE INDEX smart_suggest_address_tokens_prefix_idx
      ON smart_suggest_address_search_tokens (country_code, prefix);
    CREATE INDEX smart_suggest_address_tokens_record_idx
      ON smart_suggest_address_search_tokens (record_id);
  `);
};

const insertCurrentPrefixRows = (db, rows) => {
  const insert = db.prepare(`
    INSERT INTO smart_suggest_address_search_tokens
      (id, record_id, country_code, token, prefix, weight)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let tokenRows = 0;

  db.exec('BEGIN');

  for (const row of rows) {
    for (const tokenRow of currentTokenRowsFor(row)) {
      insert.run(
        tokenRow.id,
        tokenRow.recordId,
        tokenRow.countryCode,
        tokenRow.token,
        tokenRow.prefix,
        tokenRow.weight,
      );
      tokenRows += 1;
    }
  }

  db.exec('COMMIT');

  return tokenRows;
};

const createFtsSchema = (db) => {
  db.exec(`
    CREATE VIRTUAL TABLE smart_suggest_address_fts USING fts5(
      record_id UNINDEXED,
      country_code UNINDEXED,
      street,
      city,
      postal_code,
      house_number,
      orientation_number,
      search_label,
      display_label UNINDEXED,
      tokenize = 'unicode61 remove_diacritics 2',
      prefix = '2 3 4 5 6 7 8 9 10 11 12 13 14 15 16'
    );
  `);
};

const insertFtsRows = (db, rows) => {
  const insert = db.prepare(`
    INSERT INTO smart_suggest_address_fts (
      record_id, country_code, street, city, postal_code, house_number,
      orientation_number, search_label, display_label
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');

  for (const row of rows) {
    insert.run(
      row.id,
      row.countryCode,
      normalizeSearchText(row.parts.street ?? ''),
      normalizeSearchText(row.parts.city ?? ''),
      postalDigits(row.parts.postalCode ?? ''),
      normalizeSearchText(row.parts.houseNumber ?? ''),
      normalizeSearchText(row.parts.orientationNumber ?? ''),
      row.searchLabel,
      row.displayLabel,
    );
  }

  db.exec('COMMIT');
};

const bucketedPrefixes = (value, buckets) => {
  const normalized = normalizeSearchText(value);
  const prefixes = new Set();

  for (const bucket of buckets) {
    if (normalized.length >= bucket) {
      prefixes.add(normalized.slice(0, bucket));
    }
  }

  if (normalized.length > 0) {
    prefixes.add(normalized.slice(0, maxCompactPrefixLength));
  }

  return [...prefixes];
};

const addKey = (keys, key) => {
  if (!(key.includes(':undefined') || key.endsWith(':')) && key.length > 0) {
    keys.add(key);
  }
};

const compactKeysFor = (row) => {
  const keys = new Set();
  const street = normalizeSearchText(row.parts.street ?? '');
  const city = normalizeSearchText(row.parts.city ?? '');
  const postal = postalDigits(row.parts.postalCode ?? '');
  const house = normalizeSearchText(row.parts.houseNumber ?? '');
  const orientation = normalizeSearchText(row.parts.orientationNumber ?? '');

  for (const prefix of bucketedPrefixes(street, [3, 5, 8, 12, 16])) {
    addKey(keys, `street:${prefix}`);
  }

  for (const token of tokenizeAddressText(street)) {
    if (token.length >= 3) {
      for (const prefix of bucketedPrefixes(token, [3, 4, 6, 8])) {
        addKey(keys, `street-token:${prefix}`);
      }
    }
  }

  for (const prefix of bucketedPrefixes(city, [3, 5, 8, 12])) {
    addKey(keys, `city:${prefix}`);
  }

  for (let length = 3; length <= Math.min(postal.length, 5); length += 1) {
    addKey(keys, `postal:${postal.slice(0, length)}`);
  }

  if (house.length > 0) {
    addKey(keys, `house:${house}`);

    for (const prefix of bucketedPrefixes(house, [3, 5])) {
      addKey(keys, `house-prefix:${prefix}`);
      addKey(keys, `street-house:${street}:${prefix}`);
    }
  }

  if (orientation.length > 0) {
    addKey(keys, `orientation:${orientation}`);
    addKey(keys, `street-orientation:${street}:${orientation}`);
  }

  if (house.length > 0 && orientation.length > 0) {
    addKey(keys, `pair:${house}/${orientation}`);
  }

  return [...keys];
};

const createCompactSchema = (db) => {
  db.exec(`
    CREATE TABLE smart_suggest_address_compact_keys (
      id text PRIMARY KEY,
      record_id text NOT NULL,
      country_code text NOT NULL,
      key text NOT NULL,
      weight real NOT NULL DEFAULT 1
    );
    CREATE INDEX smart_suggest_address_compact_key_idx
      ON smart_suggest_address_compact_keys (country_code, key);
    CREATE INDEX smart_suggest_address_compact_record_idx
      ON smart_suggest_address_compact_keys (record_id);
  `);
};

const insertCompactRows = (db, rows) => {
  const insert = db.prepare(`
    INSERT INTO smart_suggest_address_compact_keys
      (id, record_id, country_code, key, weight)
    VALUES (?, ?, ?, ?, ?)
  `);
  let keyRows = 0;

  db.exec('BEGIN');

  for (const row of rows) {
    for (const key of compactKeysFor(row)) {
      insert.run(
        `${row.id}\u001f${key}`,
        row.id,
        row.countryCode,
        key,
        key.startsWith('pair:') ? 4 : 1,
      );
      keyRows += 1;
    }
  }

  db.exec('COMMIT');

  return keyRows;
};

const measuredSize = (db) => {
  db.exec('VACUUM');
  const [{ page_count: pageCount }] = db.prepare('PRAGMA page_count').all();
  const [{ page_size: pageSize }] = db.prepare('PRAGMA page_size').all();

  return pageCount * pageSize;
};

const buildDatabase = (path, rows, schema) => {
  const db = openDb(path);
  createAddressRecordsSchema(db);
  insertAddressRecords(db, rows);

  let indexRows = 0;

  if (schema === 'current-prefix') {
    createCurrentPrefixSchema(db);
    indexRows = insertCurrentPrefixRows(db, rows);
  }

  if (schema === 'fts5-prefix') {
    createFtsSchema(db);
    insertFtsRows(db, rows);
  }

  if (schema === 'compact-prefix') {
    createCompactSchema(db);
    indexRows = insertCompactRows(db, rows);
  }

  const bytes = measuredSize(db);

  return { bytes, db, indexRows };
};

const queryPrefixes = (query) => {
  const tokens = new Set(tokenizeAddressText(query));
  const postal = query.replaceAll(/\D+/g, '');

  if (postal.length === 5) {
    tokens.add(postal);
    tokens.add(postal.slice(0, 3));
    tokens.add(postal.slice(3));
  }

  return [...tokens].map((token) => token.slice(0, maxCurrentPrefixLength));
};

const placeholders = (values) => values.map(() => '?').join(', ');

const rowsById = (rows) => new Map(rows.map((row) => [row.id, row]));

const candidateRows = (rowMap, ids) =>
  [...new Set(ids)].map((id) => rowMap.get(id)).filter(Boolean);

const parseQueryParts = (query) => {
  const normalized = normalizeSearchText(query);
  const tokens = tokenizeAddressText(query);
  const slash = query.match(/(\d{1,5}[a-zA-Z]?)\s*\/\s*(\d{1,4}[a-zA-Z]?)/);
  const numbers = tokens.filter((token) => /^\d+[a-z]?$/.test(token));
  const postalMatch = query.match(/(?<!\d)(\d{3})[\s-]?(\d{2})(?!\d)/);
  const postal = postalMatch?.[1] === undefined ? undefined : `${postalMatch[1]}${postalMatch[2]}`;
  const textTokens = tokens.filter((token) => !/^\d+[a-z]?$/.test(token) && token !== 'cz');
  const text = textTokens.join(' ');

  return {
    normalized,
    numbers,
    postal,
    slash:
      slash === null
        ? undefined
        : {
            house: normalizeSearchText(slash[1]),
            orientation: normalizeSearchText(slash[2]),
          },
    text,
    textTokens,
    tokens,
  };
};

const rankRows = (query, rows) => {
  const parts = parseQueryParts(query);

  return rows
    .map((row) => {
      const street = normalizeSearchText(row.parts.street ?? '');
      const city = normalizeSearchText(row.parts.city ?? '');
      const house = normalizeSearchText(row.parts.houseNumber ?? '');
      const orientation = normalizeSearchText(row.parts.orientationNumber ?? '');
      const postal = postalDigits(row.parts.postalCode ?? '');
      let score = 0;

      if (parts.text.length >= 3 && street.startsWith(parts.text)) {
        score += 90;
      }

      for (const token of parts.textTokens) {
        if (token.length >= 3 && street.includes(token)) {
          score += 25;
        }

        if (token.length >= 3 && city.includes(token)) {
          score += 8;
        }
      }

      if (
        parts.slash !== undefined &&
        house === parts.slash.house &&
        orientation === parts.slash.orientation
      ) {
        score += 200;
      }

      for (const number of parts.numbers) {
        if (number.length >= 3 && house.startsWith(number)) {
          score += 70;
        }

        if (
          number.length <= 2 &&
          orientation === number &&
          parts.text.length >= 3 &&
          street.startsWith(parts.text)
        ) {
          score += 120;
        }
      }

      if (parts.postal !== undefined && postal === parts.postal) {
        score += 55;
      }

      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.row.id.localeCompare(right.row.id))
    .slice(0, 5)
    .map(({ row, score }) => ({
      displayLabel: row.displayLabel,
      id: row.id,
      score,
    }));
};

const currentLookup = (db, rowMap, query) => {
  const prefixes = [...new Set(queryPrefixes(query))];

  if (prefixes.length === 0) {
    return { candidateCount: 0, top: [] };
  }

  const rows = db
    .prepare(
      `SELECT record_id FROM smart_suggest_address_search_tokens
       WHERE country_code = 'CZ' AND prefix IN (${placeholders(prefixes)})
       LIMIT 200`,
    )
    .all(...prefixes);
  const candidates = candidateRows(
    rowMap,
    rows.map((row) => row.record_id),
  );

  return { candidateCount: candidates.length, top: rankRows(query, candidates) };
};

const ftsQueryFor = (query) => {
  const parts = parseQueryParts(query);
  const usableTokens = parts.tokens.filter(
    (token) =>
      token.length >= 3 || /^\d{2,}$/.test(token) || (/^\d$/.test(token) && parts.text.length >= 3),
  );

  if (usableTokens.length === 0) {
    return;
  }

  return usableTokens.map((token) => `${token.replaceAll(/"/g, '""')}*`).join(' ');
};

const ftsLookup = (db, rowMap, query) => {
  const ftsQuery = ftsQueryFor(query);

  if (ftsQuery === undefined) {
    return { candidateCount: 0, query: null, top: [] };
  }

  const rows = db
    .prepare(
      `SELECT record_id FROM smart_suggest_address_fts
       WHERE smart_suggest_address_fts MATCH ?
       LIMIT 200`,
    )
    .all(ftsQuery);
  const candidates = candidateRows(
    rowMap,
    rows.map((row) => row.record_id),
  );

  return {
    candidateCount: candidates.length,
    query: ftsQuery,
    top: rankRows(query, candidates),
  };
};

const compactQueryKeys = (query) => {
  const parts = parseQueryParts(query);
  const keys = new Set();
  const text = parts.text;

  if (text.length >= 3) {
    addKey(keys, `street:${text.slice(0, maxCompactPrefixLength)}`);
  }

  for (const token of parts.textTokens) {
    if (token.length >= 3) {
      addKey(keys, `street-token:${token.slice(0, 8)}`);
      addKey(keys, `city:${token.slice(0, 12)}`);
    }
  }

  if (parts.postal !== undefined) {
    addKey(keys, `postal:${parts.postal}`);
  }

  if (parts.slash !== undefined) {
    addKey(keys, `pair:${parts.slash.house}/${parts.slash.orientation}`);
  }

  for (const number of parts.numbers) {
    if (number.length >= 3) {
      addKey(keys, `house-prefix:${number.slice(0, 5)}`);
      if (text.length >= 3) {
        addKey(keys, `street-house:${text.slice(0, maxCompactPrefixLength)}:${number.slice(0, 5)}`);
      }
    }

    if (number.length <= 2 && text.length >= 3) {
      addKey(keys, `street-orientation:${text.slice(0, maxCompactPrefixLength)}:${number}`);
    }
  }

  return [...keys];
};

const compactLookup = (db, rowMap, query) => {
  const keys = compactQueryKeys(query);

  if (keys.length === 0) {
    return { candidateCount: 0, keys, top: [] };
  }

  const rows = db
    .prepare(
      `SELECT record_id FROM smart_suggest_address_compact_keys
       WHERE country_code = 'CZ' AND key IN (${placeholders(keys)})
       LIMIT 200`,
    )
    .all(...keys);
  const candidates = candidateRows(
    rowMap,
    rows.map((row) => row.record_id),
  );

  return {
    candidateCount: candidates.length,
    keys,
    top: rankRows(query, candidates),
  };
};

const summarizeScenario = ({ baseBytes, bytes, indexRows, rowCount }) => ({
  bytes,
  bytesPerAddress: Number((bytes / rowCount).toFixed(1)),
  indexBytes: bytes - baseBytes,
  indexBytesPerAddress: Number(((bytes - baseBytes) / rowCount).toFixed(1)),
  indexRows,
  indexRowsPerAddress: indexRows === 0 ? 0 : Number((indexRows / rowCount).toFixed(2)),
  indexBytesPerRow: indexRows === 0 ? 0 : Number(((bytes - baseBytes) / indexRows).toFixed(1)),
});

const main = () => {
  const rowCount = parseRowCount();
  const rows = generateRows(rowCount);
  const rowMap = rowsById(rows);
  const tempDir = mkdtempSync(join(tmpdir(), 'smart-suggest-index-prototype-'));

  try {
    const base = buildDatabase(join(tempDir, 'records-only.sqlite'), rows, 'records-only');
    const current = buildDatabase(join(tempDir, 'current-prefix.sqlite'), rows, 'current-prefix');
    const fts = buildDatabase(join(tempDir, 'fts5-prefix.sqlite'), rows, 'fts5-prefix');
    const compact = buildDatabase(join(tempDir, 'compact-prefix.sqlite'), rows, 'compact-prefix');
    const qualityQueries = [
      'K Louži 1258/12',
      'K Louzi 1258',
      'K Louzi 12',
      '12 K Louzi',
      'K Louzi 1',
      '10100 K Louzi',
      'K',
      'Lo',
      'Lou',
      'Praha',
    ];
    const lookupBehavior = Object.fromEntries(
      qualityQueries.map((query) => [
        query,
        {
          compactPrefix: compactLookup(compact.db, rowMap, query),
          currentPrefix: currentLookup(current.db, rowMap, query),
          fts5: ftsLookup(fts.db, rowMap, query),
        },
      ]),
    );

    const summary = {
      assumptions: {
        currentPrefix: {
          maxPrefixLength: maxCurrentPrefixLength,
          minPrefixLength: minCurrentPrefixLength,
          table: 'smart_suggest_address_search_tokens',
        },
        dataset: 'deterministic synthetic RUIAN-like CZ address rows with K Louzi decoys',
        noExternalProviderCalls: true,
        rowCount,
      },
      measurements: {
        compactPrefix: summarizeScenario({
          baseBytes: base.bytes,
          bytes: compact.bytes,
          indexRows: compact.indexRows,
          rowCount,
        }),
        currentPrefix: summarizeScenario({
          baseBytes: base.bytes,
          bytes: current.bytes,
          indexRows: current.indexRows,
          rowCount,
        }),
        fts5Prefix: summarizeScenario({
          baseBytes: base.bytes,
          bytes: fts.bytes,
          indexRows: 0,
          rowCount,
        }),
        recordsOnly: {
          bytes: base.bytes,
          bytesPerAddress: Number((base.bytes / rowCount).toFixed(1)),
        },
      },
      prototypeNotes: {
        compactPrefix:
          'Stores bounded semantic keys for street phrase prefixes, street tokens, postal prefixes, house prefixes, exact orientation, exact house/orientation pairs, and street-number combinations. Lookup is ordinary equality over country_code+key, then domain ranking.',
        fts5: 'Stores normalized address fields in one FTS5 table with prefix indexes for token lengths 2..16. Lookup uses MATCH with token* terms and rejects one/two-character text-only queries before hitting the index.',
      },
      lookupBehavior,
      recommendation:
        'Use FTS5 as the first production ADR candidate, with explicit weak-query gating and domain ranking over returned address records. Keep compact-prefix as fallback if D1 FTS5 latency or ranking explainability fails on full-shard data.',
    };

    console.log(JSON.stringify(summary, null, 2));

    base.db.close();
    current.db.close();
    fts.db.close();
    compact.db.close();
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
};

main();
