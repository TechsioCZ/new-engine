import type { AddressParts } from '@techsio/smart-suggest-core';

import type {
  AddressSnapshotRow,
  AddressSnapshotRuianFeedId,
  AddressSnapshotRuianFileKind,
  AddressSnapshotRuianIdentifiers,
  AddressSnapshotSourceLineage,
  AddressSnapshotVisibilityMetadata,
  AddressTombstoneRow,
} from './address-snapshot';

export type RuianAddressSnapshotSourceRow = Readonly<Record<string, unknown>>;

export type ParseRuianAddressSnapshotRowOptions = {
  atomEntryId?: string;
  checksumSha256?: string;
  datasetVersion?: string;
  fileKind?: AddressSnapshotRuianFileKind;
  feedId?: AddressSnapshotRuianFeedId;
  idPrefix?: string;
  previousAtomEntryId?: string;
  sourceGeneratedAt?: string;
  sourceUri?: string;
  sourceValidAt?: string;
  sourceVersion?: string;
  snapshotUri?: string;
  sourceId?: string;
};

export type ParseRuianAddressTombstoneRowOptions = ParseRuianAddressSnapshotRowOptions;

export type RuianRequiredAddressField = 'city' | 'street' | 'houseNumber' | 'postalCode';

export type RuianAddressSnapshotParseErrorCode = 'missing-source-row-id' | 'partial-address-row';

export type RuianAddressSnapshotParseError = {
  code: RuianAddressSnapshotParseErrorCode;
  index?: number;
  message: string;
  missingFields?: readonly RuianRequiredAddressField[];
  sourceRowId?: string;
};

export type RuianAddressSnapshotParseResult =
  | {
      ok: true;
      row: AddressSnapshotRow;
    }
  | {
      error: RuianAddressSnapshotParseError;
      ok: false;
    };

export type RuianAddressSnapshotRowsParseResult = {
  errors: readonly RuianAddressSnapshotParseError[];
  rows: readonly AddressSnapshotRow[];
  tombstones: readonly AddressTombstoneRow[];
};

export type RuianAddressTombstoneParseResult =
  | {
      ok: true;
      tombstone: AddressTombstoneRow;
    }
  | {
      error: RuianAddressSnapshotParseError;
      ok: false;
    };

const DIACRITIC_PATTERN = /\p{Diacritic}/gu;
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const COMBINED_HOUSE_ORIENTATION_PATTERN = /^([^/]+)\/([^/]+)$/u;
const NON_DIGIT_PATTERN = /\D+/gu;
const NUMERIC_CODE_PATTERN = /^[\d\s_.-]+$/u;
const COORDINATE_SEPARATOR_PATTERN = /[,;\s]+/u;
const DEFAULT_RUIAN_SOURCE_ID = 'ruian-cz';
const DEFAULT_RUIAN_ID_PREFIX = 'ruian-cz:';

const normalizeSourceKey = (key: string) =>
  key
    .normalize('NFD')
    .replaceAll(DIACRITIC_PATTERN, '')
    .toLocaleLowerCase('en-US')
    .replaceAll(NON_ALPHANUMERIC_PATTERN, '');

const aliases = (...keys: readonly string[]) => keys.map(normalizeSourceKey);

const SOURCE_ROW_ID_KEYS = aliases(
  'id',
  'sourceRowId',
  'source_row_id',
  'addressPlaceCode',
  'address_place_code',
  'ruianId',
  'ruian_id',
  'kodAdm',
  'kod_adm',
  'kód adm',
  'kodAdresnihoMista',
  'kod_adresniho_mista',
  'kód adresního místa',
  'adresniMistoKod',
  'adresni_misto_kod',
  'adresaKod',
  'adresa_kod',
);

const BUILDING_OBJECT_CODE_KEYS = aliases(
  'buildingObjectCode',
  'building_object_code',
  'kodStavebnihoObjektu',
  'kod_stavebniho_objektu',
  'kód stavebního objektu',
  'kodSo',
  'kod_so',
);

const REGION_CODE_KEYS = aliases(
  'regionCode',
  'region_code',
  'vuscKod',
  'vusc_kod',
  'kodVusc',
  'kod_vusc',
  'kód vusc',
  'krajKod',
  'kraj_kod',
  'kodKraje',
  'kod_kraje',
  'kód kraje',
);

const DISTRICT_CODE_KEYS = aliases(
  'districtCode',
  'district_code',
  'okresKod',
  'okres_kod',
  'kodOkresu',
  'kod_okresu',
  'kód okresu',
);

const MUNICIPALITY_DISTRICT_CODE_KEYS = aliases(
  'municipalityDistrictCode',
  'municipality_district_code',
  'momcKod',
  'momc_kod',
  'kodMomc',
  'kod_momc',
  'kód momc',
  'mopKod',
  'mop_kod',
);

const MUNICIPALITY_CODE_KEYS = aliases(
  'municipalityCode',
  'municipality_code',
  'kodObce',
  'kod_obce',
  'kód obce',
  'obecKod',
  'obec_kod',
);

const MUNICIPALITY_PART_CODE_KEYS = aliases(
  'municipalityPartCode',
  'municipality_part_code',
  'cityPartCode',
  'city_part_code',
  'kodCastiObce',
  'kod_casti_obce',
  'kód části obce',
  'castObceKod',
  'cast_obce_kod',
);

const STREET_CODE_KEYS = aliases(
  'streetCode',
  'street_code',
  'kodUlice',
  'kod_ulice',
  'kód ulice',
  'uliceKod',
  'ulice_kod',
);

const STREET_KEYS = aliases(
  'street',
  'ulice',
  'nazevUlice',
  'nazev_ulice',
  'název ulice',
  'uliceNazev',
  'ulice_nazev',
);

const HOUSE_NUMBER_KEYS = aliases(
  'houseNumber',
  'house_number',
  'cisloPopisne',
  'cislo_popisne',
  'číslo popisné',
  'cp',
  'c_p',
  'č.p.',
  'cisloDomovni',
  'cislo_domovni',
  'číslo domovní',
);

const ORIENTATION_NUMBER_KEYS = aliases(
  'orientationNumber',
  'orientation_number',
  'cisloOrientacni',
  'cislo_orientacni',
  'číslo orientační',
  'co',
  'c_o',
  'č.o.',
);

const ORIENTATION_SUFFIX_KEYS = aliases(
  'orientationNumberSuffix',
  'orientation_number_suffix',
  'pismenoOrientacni',
  'pismeno_orientacni',
  'písmeno orientační',
);

const CITY_KEYS = aliases(
  'city',
  'mesto',
  'město',
  'municipality',
  'obec',
  'nazevObce',
  'nazev_obce',
  'název obce',
  'mestskaCast',
  'mestska_cast',
  'městská část',
  'nazevMomc',
  'nazev_momc',
  'nazevMestskeCasti',
  'nazev_mestske_casti',
);

const DISTRICT_KEYS = aliases(
  'district',
  'cityPart',
  'city_part',
  'castObce',
  'cast_obce',
  'část obce',
  'nazevCastiObce',
  'nazev_casti_obce',
  'městský obvod',
  'mestskyObvod',
  'mestsky_obvod',
);

const POSTAL_CODE_KEYS = aliases(
  'postalCode',
  'postal_code',
  'postcode',
  'zip',
  'psc',
  'psč',
  'p_s_c',
  'poštovní směrovací číslo',
);

const TRANSACTION_ID_KEYS = aliases(
  'transactionId',
  'transaction_id',
  'idTransakce',
  'id_transakce',
  'identifikatorTransakce',
  'identifikator_transakce',
);

const CHANGE_PROPOSAL_GLOBAL_ID_KEYS = aliases(
  'changeProposalGlobalId',
  'change_proposal_global_id',
  'globalniIdNavrhuZmeny',
  'globalni_id_navrhu_zmeny',
  'globální id návrhu změny',
);

const LATITUDE_KEYS = aliases(
  'latitude',
  'lat',
  'gpsLatitude',
  'gps_latitude',
  'wgs84Latitude',
  'wgs84_latitude',
  'zemepisnaSirka',
  'zemepisna_sirka',
  'zeměpisná šířka',
);

const LONGITUDE_KEYS = aliases(
  'longitude',
  'long',
  'lng',
  'lon',
  'gpsLongitude',
  'gps_longitude',
  'wgs84Longitude',
  'wgs84_longitude',
  'zemepisnaDelka',
  'zemepisna_delka',
  'zeměpisná délka',
);

const COORDINATE_KEYS = aliases('coordinates', 'coordinate', 'coords', 'gps', 'wgs84');

const INVALID_FLAG_KEYS = aliases(
  'invalid',
  'isInvalid',
  'is_invalid',
  'neplatny',
  'neplatný',
  'jeNeplatny',
  'je_neplatny',
  'je neplatný',
);

const VALID_FLAG_KEYS = aliases(
  'valid',
  'isValid',
  'is_valid',
  'platny',
  'platný',
  'jePlatny',
  'je_platny',
  'je platný',
);

const STATUS_KEYS = aliases('status', 'stav', 'recordStatus', 'record_status');

const INVALID_REASON_KEYS = aliases(
  'invalidReason',
  'invalid_reason',
  'reason',
  'duvod',
  'důvod',
  'duvodNeplatnosti',
  'duvod_neplatnosti',
  'důvod neplatnosti',
);

const VALID_TO_KEYS = aliases('validTo', 'valid_to', 'platnostDo', 'platnost_do', 'platí do');

const VALID_FROM_KEYS = aliases('validFrom', 'valid_from', 'platnostOd', 'platnost_od', 'platí od');

const TOMBSTONE_FLAG_KEYS = aliases(
  'tombstone',
  'isTombstone',
  'is_tombstone',
  'deleted',
  'isDeleted',
  'is_deleted',
  'removed',
  'isRemoved',
  'is_removed',
  'zruseno',
  'zrušeno',
  'zaniklo',
  'zaniklé',
);

const TOMBSTONE_DELETED_AT_KEYS = aliases(
  'deletedAt',
  'deleted_at',
  'removedAt',
  'removed_at',
  'datumZaniku',
  'datum_zaniku',
  'datum zániku',
);

const TOMBSTONE_REASON_KEYS = aliases(
  'tombstoneReason',
  'tombstone_reason',
  'deleteReason',
  'delete_reason',
  'deletionReason',
  'deletion_reason',
  'reason',
  'duvodZruseni',
  'duvod_zruseni',
  'důvod zrušení',
);

const normalizeDisplayText = (value: string) => value.trim().replaceAll(WHITESPACE_PATTERN, ' ');

const cellToText = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const normalized = normalizeDisplayText(value);
    return normalized.length === 0 ? undefined : normalized;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return;
};

const normalizeRuianCode = (value: string) => {
  if (!NUMERIC_CODE_PATTERN.test(value)) {
    return normalizeDisplayText(value);
  }

  const digits = value.replaceAll(NON_DIGIT_PATTERN, '');
  return digits.length > 0 ? digits : normalizeDisplayText(value);
};

const normalizeStatusToken = (value: string) => normalizeSourceKey(value);

const TRUE_STATUS_TOKENS = new Set([
  '1',
  'ano',
  'true',
  'yes',
  'y',
  'a',
  'platny',
  'active',
  'valid',
]);

const FALSE_STATUS_TOKENS = new Set([
  '0',
  'false',
  'ne',
  'no',
  'n',
  'neplatny',
  'inactive',
  'invalid',
]);

const INVALID_STATUS_TOKENS = new Set([
  'deleted',
  'invalid',
  'inactive',
  'neaktivni',
  'neplatny',
  'removed',
  'tombstone',
  'zanikly',
  'zaniklo',
  'zruseno',
]);

const TOMBSTONE_STATUS_TOKENS = new Set([
  'deleted',
  'removed',
  'tombstone',
  'zanikly',
  'zaniklo',
  'zruseno',
]);

const buildSourceLookup = (sourceRow: RuianAddressSnapshotSourceRow) => {
  const lookup = new Map<string, unknown>();

  for (const [key, value] of Object.entries(sourceRow)) {
    const normalizedKey = normalizeSourceKey(key);

    if (normalizedKey.length > 0 && !lookup.has(normalizedKey)) {
      lookup.set(normalizedKey, value);
    }
  }

  return lookup;
};

const readFirstValue = (lookup: ReadonlyMap<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const value = lookup.get(key);

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return;
};

const readFirstText = (lookup: ReadonlyMap<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const text = cellToText(lookup.get(key));

    if (text !== undefined) {
      return text;
    }
  }

  return;
};

const readFirstCode = (lookup: ReadonlyMap<string, unknown>, keys: readonly string[]) => {
  const text = readFirstText(lookup, keys);
  return text === undefined ? undefined : normalizeRuianCode(text);
};

const parseBooleanIndicator = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  const text = cellToText(value);

  if (text === undefined) {
    return;
  }

  const token = normalizeStatusToken(text);

  if (TRUE_STATUS_TOKENS.has(token)) {
    return true;
  }

  if (FALSE_STATUS_TOKENS.has(token)) {
    return false;
  }

  return;
};

const readFirstBooleanIndicator = (
  lookup: ReadonlyMap<string, unknown>,
  keys: readonly string[],
) => {
  for (const key of keys) {
    const parsed = parseBooleanIndicator(lookup.get(key));

    if (parsed !== undefined) {
      return parsed;
    }
  }

  return;
};

const createRuianStableAddressId = (addressPlaceCode: string) =>
  `${DEFAULT_RUIAN_ID_PREFIX}${addressPlaceCode}`;

const createRuianIdentifiers = (
  lookup: ReadonlyMap<string, unknown>,
  addressPlaceCode: string,
): AddressSnapshotRuianIdentifiers => {
  const identifiers: AddressSnapshotRuianIdentifiers = {
    addressPlaceCode,
    stableAddressId: createRuianStableAddressId(addressPlaceCode),
  };
  const buildingObjectCode = readFirstCode(lookup, BUILDING_OBJECT_CODE_KEYS);
  const districtCode = readFirstCode(lookup, DISTRICT_CODE_KEYS);
  const municipalityCode = readFirstCode(lookup, MUNICIPALITY_CODE_KEYS);
  const municipalityDistrictCode = readFirstCode(lookup, MUNICIPALITY_DISTRICT_CODE_KEYS);
  const municipalityPartCode = readFirstCode(lookup, MUNICIPALITY_PART_CODE_KEYS);
  const postalCode = readFirstCode(lookup, POSTAL_CODE_KEYS);
  const regionCode = readFirstCode(lookup, REGION_CODE_KEYS);
  const streetCode = readFirstCode(lookup, STREET_CODE_KEYS);

  if (buildingObjectCode !== undefined) {
    identifiers.buildingObjectCode = buildingObjectCode;
  }

  if (districtCode !== undefined) {
    identifiers.districtCode = districtCode;
  }

  if (municipalityCode !== undefined) {
    identifiers.municipalityCode = municipalityCode;
  }

  if (municipalityDistrictCode !== undefined) {
    identifiers.municipalityDistrictCode = municipalityDistrictCode;
  }

  if (municipalityPartCode !== undefined) {
    identifiers.municipalityPartCode = municipalityPartCode;
  }

  if (postalCode !== undefined) {
    identifiers.postalCode = postalCode;
  }

  if (regionCode !== undefined) {
    identifiers.regionCode = regionCode;
  }

  if (streetCode !== undefined) {
    identifiers.streetCode = streetCode;
  }

  return identifiers;
};

const createSourceLineage = (
  sourceRowId: string,
  options: ParseRuianAddressSnapshotRowOptions,
): AddressSnapshotSourceLineage => {
  const sourceLineage: AddressSnapshotSourceLineage = {
    sourceId: options.sourceId ?? DEFAULT_RUIAN_SOURCE_ID,
    sourceRowId,
  };

  if (options.atomEntryId !== undefined) {
    sourceLineage.atomEntryId = options.atomEntryId;
  }

  if (options.checksumSha256 !== undefined) {
    sourceLineage.checksumSha256 = options.checksumSha256;
  }

  if (options.datasetVersion !== undefined) {
    sourceLineage.datasetVersion = options.datasetVersion;
  }

  if (options.fileKind !== undefined) {
    sourceLineage.fileKind = options.fileKind;
  }

  if (options.feedId !== undefined) {
    sourceLineage.feedId = options.feedId;
  }

  if (options.previousAtomEntryId !== undefined) {
    sourceLineage.previousAtomEntryId = options.previousAtomEntryId;
  }

  if (options.sourceGeneratedAt !== undefined) {
    sourceLineage.sourceGeneratedAt = options.sourceGeneratedAt;
  }

  if (options.sourceUri !== undefined) {
    sourceLineage.sourceUri = options.sourceUri;
  }

  if (options.sourceValidAt !== undefined) {
    sourceLineage.sourceValidAt = options.sourceValidAt;
  }

  if (options.sourceVersion !== undefined) {
    sourceLineage.sourceVersion = options.sourceVersion;
  }

  if (options.snapshotUri !== undefined) {
    sourceLineage.snapshotUri = options.snapshotUri;
  }

  return sourceLineage;
};

const createVisibilityMetadata = (
  lookup: ReadonlyMap<string, unknown>,
): AddressSnapshotVisibilityMetadata | undefined => {
  const changeProposalGlobalId = readFirstText(lookup, CHANGE_PROPOSAL_GLOBAL_ID_KEYS);
  const invalidFlag = readFirstBooleanIndicator(lookup, INVALID_FLAG_KEYS);
  const validFlag = readFirstBooleanIndicator(lookup, VALID_FLAG_KEYS);
  const sourceStatus = readFirstText(lookup, STATUS_KEYS);
  const transactionId = readFirstText(lookup, TRANSACTION_ID_KEYS);
  const validFrom = readFirstText(lookup, VALID_FROM_KEYS);
  const validTo = readFirstText(lookup, VALID_TO_KEYS);
  const normalizedStatus =
    sourceStatus === undefined ? undefined : normalizeStatusToken(sourceStatus);
  const statusIsInvalid =
    normalizedStatus === undefined ? undefined : INVALID_STATUS_TOKENS.has(normalizedStatus);
  const invalid =
    invalidFlag ??
    (validFlag === undefined ? undefined : !validFlag) ??
    statusIsInvalid ??
    (validTo === undefined ? undefined : true);

  if (
    invalid === undefined &&
    changeProposalGlobalId === undefined &&
    sourceStatus === undefined &&
    transactionId === undefined &&
    validFlag === undefined &&
    validFrom === undefined &&
    validTo === undefined
  ) {
    return;
  }

  const visibility: AddressSnapshotVisibilityMetadata = {
    searchVisibility: invalid === true ? 'hidden' : 'searchable',
  };
  const reason = readFirstText(lookup, INVALID_REASON_KEYS);

  if (changeProposalGlobalId !== undefined) {
    visibility.changeProposalGlobalId = changeProposalGlobalId;
  }

  if (invalid !== undefined) {
    visibility.invalid = invalid;
  }

  if (reason !== undefined) {
    visibility.reason = reason;
  }

  if (sourceStatus !== undefined) {
    visibility.sourceStatus = sourceStatus;
  }

  if (transactionId !== undefined) {
    visibility.transactionId = transactionId;
  }

  if (validFrom !== undefined) {
    visibility.validFrom = validFrom;
  }

  if (validTo !== undefined) {
    visibility.validTo = validTo;
  }

  return visibility;
};

const createTombstoneMetadata = (lookup: ReadonlyMap<string, unknown>) => {
  const tombstoneFlag = readFirstBooleanIndicator(lookup, TOMBSTONE_FLAG_KEYS);
  const deletedAt = readFirstText(lookup, TOMBSTONE_DELETED_AT_KEYS);
  const sourceStatus = readFirstText(lookup, STATUS_KEYS);
  const statusIsTombstone =
    sourceStatus === undefined
      ? false
      : TOMBSTONE_STATUS_TOKENS.has(normalizeStatusToken(sourceStatus));

  if (tombstoneFlag !== true && deletedAt === undefined && !statusIsTombstone) {
    return;
  }

  return {
    deletedAt,
    reason: readFirstText(lookup, TOMBSTONE_REASON_KEYS),
  };
};

const normalizePostalCode = (value: string) => {
  const digits = value.replaceAll(NON_DIGIT_PATTERN, '');

  if (digits.length === 5) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }

  return normalizeDisplayText(value);
};

const appendOrientationSuffix = (
  orientationNumber: string | undefined,
  suffix: string | undefined,
) => {
  if (orientationNumber === undefined || suffix === undefined) {
    return orientationNumber;
  }

  return `${orientationNumber}${suffix}`;
};

const splitHouseOrientationNumber = (
  houseNumber: string,
  orientationNumber: string | undefined,
) => {
  const match = COMBINED_HOUSE_ORIENTATION_PATTERN.exec(houseNumber);

  if (match === null) {
    return { houseNumber, orientationNumber };
  }

  const matchedHouseNumber = match.at(1);
  const matchedOrientationNumber = match.at(2);

  if (matchedHouseNumber === undefined || matchedOrientationNumber === undefined) {
    return { houseNumber, orientationNumber };
  }

  return {
    houseNumber: normalizeDisplayText(matchedHouseNumber),
    orientationNumber: orientationNumber ?? normalizeDisplayText(matchedOrientationNumber),
  };
};

const parseCoordinateNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string') {
    return;
  }

  const normalized = value.trim().replace(',', '.');

  if (normalized.length === 0) {
    return;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isLatitude = (value: number) => value >= -90 && value <= 90;

const isLongitude = (value: number) => value >= -180 && value <= 180;

const parseCoordinatePair = (
  value: unknown,
): { latitude: number; longitude: number } | undefined => {
  if (Array.isArray(value)) {
    const first = parseCoordinateNumber(value.at(0));
    const second = parseCoordinateNumber(value.at(1));

    if (first !== undefined && second !== undefined && isLongitude(first) && isLatitude(second)) {
      return { latitude: second, longitude: first };
    }

    return;
  }

  const text = cellToText(value);

  if (text === undefined) {
    return;
  }

  const parts = text.split(COORDINATE_SEPARATOR_PATTERN);

  if (parts.length < 2) {
    return;
  }

  const first = parseCoordinateNumber(parts.at(0));
  const second = parseCoordinateNumber(parts.at(1));

  if (first === undefined || second === undefined || !isLatitude(first) || !isLongitude(second)) {
    return;
  }

  return { latitude: first, longitude: second };
};

const parseCoordinates = (lookup: ReadonlyMap<string, unknown>) => {
  const coordinatePair = parseCoordinatePair(readFirstValue(lookup, COORDINATE_KEYS));
  const latitude =
    parseCoordinateNumber(readFirstValue(lookup, LATITUDE_KEYS)) ?? coordinatePair?.latitude;
  const longitude =
    parseCoordinateNumber(readFirstValue(lookup, LONGITUDE_KEYS)) ?? coordinatePair?.longitude;

  return {
    latitude: latitude !== undefined && isLatitude(latitude) ? latitude : undefined,
    longitude: longitude !== undefined && isLongitude(longitude) ? longitude : undefined,
  };
};

const createPartialRowError = (
  sourceRowId: string,
  missingFields: readonly RuianRequiredAddressField[],
): RuianAddressSnapshotParseError => ({
  code: 'partial-address-row',
  message: `RUIAN address row ${sourceRowId} is missing required address fields: ${missingFields.join(
    ', ',
  )}.`,
  missingFields,
  sourceRowId,
});

const withErrorIndex = (
  error: RuianAddressSnapshotParseError,
  index: number,
): RuianAddressSnapshotParseError => ({
  ...error,
  index,
});

export const parseRuianAddressTombstoneRow = (
  sourceRow: RuianAddressSnapshotSourceRow,
  options: ParseRuianAddressTombstoneRowOptions = {},
): RuianAddressTombstoneParseResult => {
  const lookup = buildSourceLookup(sourceRow);
  const sourceRowId = readFirstCode(lookup, SOURCE_ROW_ID_KEYS);

  if (sourceRowId === undefined) {
    return {
      error: {
        code: 'missing-source-row-id',
        message: 'RUIAN tombstone row is missing a stable source row id.',
      },
      ok: false,
    };
  }

  const tombstoneMetadata = createTombstoneMetadata(lookup);

  if (tombstoneMetadata === undefined) {
    return {
      error: {
        code: 'partial-address-row',
        message: `RUIAN row ${sourceRowId} is not marked as a tombstone.`,
        sourceRowId,
      },
      ok: false,
    };
  }

  const tombstone: AddressTombstoneRow = {
    id: createRuianStableAddressId(sourceRowId),
    ruian: createRuianIdentifiers(lookup, sourceRowId),
    sourceLineage: createSourceLineage(sourceRowId, options),
  };

  if (tombstoneMetadata.deletedAt !== undefined) {
    tombstone.deletedAt = tombstoneMetadata.deletedAt;
  }

  if (tombstoneMetadata.reason !== undefined) {
    tombstone.reason = tombstoneMetadata.reason;
  }

  return { ok: true, tombstone };
};

export const parseRuianAddressSnapshotRow = (
  sourceRow: RuianAddressSnapshotSourceRow,
  options: ParseRuianAddressSnapshotRowOptions = {},
): RuianAddressSnapshotParseResult => {
  const lookup = buildSourceLookup(sourceRow);
  const sourceRowId = readFirstCode(lookup, SOURCE_ROW_ID_KEYS);

  if (sourceRowId === undefined) {
    return {
      error: {
        code: 'missing-source-row-id',
        message: 'RUIAN address row is missing a stable source row id.',
      },
      ok: false,
    };
  }

  const city = readFirstText(lookup, CITY_KEYS);
  const street = readFirstText(lookup, STREET_KEYS);
  const rawHouseNumber = readFirstText(lookup, HOUSE_NUMBER_KEYS);
  const postalCode = readFirstText(lookup, POSTAL_CODE_KEYS);
  const missingFields: RuianRequiredAddressField[] = [];

  if (city === undefined) {
    missingFields.push('city');
  }

  if (street === undefined) {
    missingFields.push('street');
  }

  if (rawHouseNumber === undefined) {
    missingFields.push('houseNumber');
  }

  if (postalCode === undefined) {
    missingFields.push('postalCode');
  }

  if (
    city === undefined ||
    street === undefined ||
    rawHouseNumber === undefined ||
    postalCode === undefined
  ) {
    return {
      error: createPartialRowError(sourceRowId, missingFields),
      ok: false,
    };
  }

  const rawOrientationNumber = appendOrientationSuffix(
    readFirstText(lookup, ORIENTATION_NUMBER_KEYS),
    readFirstText(lookup, ORIENTATION_SUFFIX_KEYS),
  );
  const addressNumbers = splitHouseOrientationNumber(rawHouseNumber, rawOrientationNumber);
  const parts: AddressParts = {
    city,
    countryCode: 'CZ',
    houseNumber: addressNumbers.houseNumber,
    postalCode: normalizePostalCode(postalCode),
    street,
  };
  const district = readFirstText(lookup, DISTRICT_KEYS);
  const row: AddressSnapshotRow = {
    id:
      options.idPrefix === undefined
        ? createRuianStableAddressId(sourceRowId)
        : `${options.idPrefix}${sourceRowId}`,
    parts,
    ruian: createRuianIdentifiers(lookup, sourceRowId),
    sourceLineage: createSourceLineage(sourceRowId, options),
  };
  const visibility = createVisibilityMetadata(lookup);

  if (addressNumbers.orientationNumber !== undefined) {
    parts.orientationNumber = addressNumbers.orientationNumber;
  }

  if (district !== undefined) {
    parts.district = district;
  }

  const coordinates = parseCoordinates(lookup);

  if (coordinates.latitude !== undefined) {
    row.latitude = coordinates.latitude;
  }

  if (coordinates.longitude !== undefined) {
    row.longitude = coordinates.longitude;
  }

  if (visibility !== undefined) {
    row.visibility = visibility;
  }

  return { ok: true, row };
};

export const mapRuianAddressSnapshotRows = (
  sourceRows: readonly RuianAddressSnapshotSourceRow[],
  options: ParseRuianAddressSnapshotRowOptions = {},
): RuianAddressSnapshotRowsParseResult => {
  const errors: RuianAddressSnapshotParseError[] = [];
  const rows: AddressSnapshotRow[] = [];
  const tombstones: AddressTombstoneRow[] = [];

  for (const [index, sourceRow] of sourceRows.entries()) {
    const tombstoneResult = parseRuianAddressTombstoneRow(sourceRow, options);

    if (tombstoneResult.ok) {
      tombstones.push(tombstoneResult.tombstone);
      continue;
    }

    const result = parseRuianAddressSnapshotRow(sourceRow, options);

    if (result.ok) {
      rows.push(result.row);
      continue;
    }

    errors.push(withErrorIndex(result.error, index));
  }

  return { errors, rows, tombstones };
};
