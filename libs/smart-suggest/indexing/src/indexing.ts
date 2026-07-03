import type { AddressParts } from '@techsio/smart-suggest-core';

export type AddressIndexParts = AddressParts;

export type PrefixTokenOptions = {
  minLength?: number;
  maxLength?: number;
};

export type PostalCodeCandidate = {
  value: string;
  displayValue: string;
  sourceText: string;
  start: number;
  end: number;
};

export type HouseNumberCandidate = {
  houseNumber: string;
  orientationNumber?: string;
  displayValue: string;
  sourceText: string;
  start: number;
  end: number;
  reason: 'explicit-house' | 'explicit-orientation' | 'slash' | 'street-number';
};

export type AddressLabels = {
  displayLabel: string;
  searchLabel: string;
};

export type AddressIndexDocument = AddressLabels & {
  parts: AddressIndexParts;
  normalizedLabel: string;
  tokens: readonly string[];
  prefixTokens: readonly string[];
  postalCodeCandidates: readonly PostalCodeCandidate[];
  houseNumberCandidates: readonly HouseNumberCandidate[];
};

export type AddressRankingCandidate = {
  id: string;
  displayLabel?: string;
  searchLabel?: string;
  address?: AddressIndexParts;
  parts?: AddressIndexParts;
  confidence?: number;
  tokens?: readonly string[];
  prefixTokens?: readonly string[];
};

export type AddressRankedCandidate<TCandidate extends AddressRankingCandidate> = {
  candidate: TCandidate;
  score: number;
  reasons: readonly string[];
};

export type AddressRecordQuality = {
  score: number;
  reasons: readonly string[];
};

export type AddressRankingOptions = {
  limit?: number;
};

const DEFAULT_MIN_PREFIX_LENGTH = 2;
const DEFAULT_MAX_PREFIX_LENGTH = 16;
const MIN_HOUSE_NUMBER_PREFIX_LENGTH = 3;

const EXTRA_DIACRITIC_REPLACEMENTS: Record<string, string> = {
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

const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const POSTAL_CODE_PATTERN = /(?<!\d)(\d{3})[\s-]?(\d{2})(?!\d)/gu;
const SLASH_HOUSE_NUMBER_PATTERN =
  /(?<![\p{L}\p{N}])(\d{1,5}[a-zA-Z]?)[\s]*\/[\s]*(\d{1,4}[a-zA-Z]?)(?![\p{L}\p{N}])/gu;
const EXPLICIT_HOUSE_NUMBER_PATTERN =
  /(?:č\s*\.?\s*p\s*\.?|c\s*\.?\s*p\s*\.?|číslo\s+popisné|cislo\s+popisne|čp\s*\.?|cp\s*\.?)\s*(\d{1,5}[a-zA-Z]?)/giu;
const EXPLICIT_ORIENTATION_NUMBER_PATTERN =
  /(?:č\s*\.?\s*o\s*\.?|c\s*\.?\s*o\s*\.?|číslo\s+orientační|cislo\s+orientacni|čo\s*\.?|co\s*\.?)\s*(\d{1,4}[a-zA-Z]?)/giu;
const STREET_NUMBER_PATTERN = /(?<![\p{L}\p{N}/])(\d{1,5}[a-zA-Z]?)(?![\p{L}\p{N}/])/gu;
const CITY_DISTRICT_NUMBER_PATTERN = /\b(?:praha|bratislava|ostrava|brno|kosice|plzen)$/;

const normalizeWhitespace = (value: string) => value.trim().replaceAll(/\s+/g, ' ');

const replaceExtraDiacritics = (value: string) =>
  value.replaceAll(/[ßĐđĦħŁłØøÞþ]/g, (character) => {
    const replacement = EXTRA_DIACRITIC_REPLACEMENTS[character];

    return replacement ?? character;
  });

export const stripDiacritics = (value: string) =>
  replaceExtraDiacritics(value)
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '');

export const normalizeDisplayText = (value: string) =>
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

export const normalizeSearchText = (value: string) =>
  normalizeWhitespace(
    stripDiacritics(value)
      .toLocaleLowerCase('cs-CZ')
      .replaceAll(/[^\p{L}\p{N}]+/gu, ' '),
  );

export const tokenizeAddressText = (value: string): string[] => {
  const normalizedValue = normalizeSearchText(value);
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const match of normalizedValue.matchAll(TOKEN_PATTERN)) {
    const [token] = match;

    if (token.length === 0 || seen.has(token)) {
      continue;
    }

    seen.add(token);
    tokens.push(token);
  }

  return tokens;
};

export const createPrefixTokens = (
  tokens: readonly string[],
  options: PrefixTokenOptions = {},
): string[] => {
  const minLength = Math.max(1, Math.trunc(options.minLength ?? DEFAULT_MIN_PREFIX_LENGTH));
  const maxLength = Math.max(minLength, Math.trunc(options.maxLength ?? DEFAULT_MAX_PREFIX_LENGTH));
  const seen = new Set<string>();
  const prefixes: string[] = [];

  for (const token of tokens) {
    const normalizedToken = normalizeSearchText(token);

    if (normalizedToken.length < minLength) {
      continue;
    }

    const lastPrefixLength = Math.min(normalizedToken.length, maxLength);

    for (let length = minLength; length <= lastPrefixLength; length += 1) {
      const prefix = normalizedToken.slice(0, length);

      if (seen.has(prefix)) {
        continue;
      }

      seen.add(prefix);
      prefixes.push(prefix);
    }
  }

  return prefixes;
};

const isPostalCodeMatchLikely = (value: string, start: number, end: number) => {
  const previous = value[start - 1];
  const next = value[end];

  if (previous !== undefined && LETTER_OR_NUMBER.test(previous)) {
    return false;
  }

  if (next !== undefined && LETTER_OR_NUMBER.test(next)) {
    return false;
  }

  return true;
};

const formatCzSkPostalCode = (digits: string) => `${digits.slice(0, 3)} ${digits.slice(3)}`;

export const extractPostalCodeCandidates = (value: string): PostalCodeCandidate[] => {
  const candidates: PostalCodeCandidate[] = [];
  const seen = new Set<string>();

  for (const match of value.matchAll(POSTAL_CODE_PATTERN)) {
    const [sourceText, firstGroup, secondGroup] = match;
    const start = match.index;
    const end = start + sourceText.length;

    if (
      firstGroup === undefined ||
      secondGroup === undefined ||
      !isPostalCodeMatchLikely(value, start, end)
    ) {
      continue;
    }

    const postalCode = `${firstGroup}${secondGroup}`;

    if (seen.has(`${postalCode}:${start}`)) {
      continue;
    }

    seen.add(`${postalCode}:${start}`);
    candidates.push({
      value: postalCode,
      displayValue: formatCzSkPostalCode(postalCode),
      sourceText,
      start,
      end,
    });
  }

  return candidates;
};

const isInsideAnySpan = (
  start: number,
  end: number,
  spans: readonly { start: number; end: number }[],
) => spans.some((span) => start < span.end && end > span.start);

const isLikelyCityDistrictNumber = (value: string, start: number) => {
  const before = normalizeSearchText(value.slice(Math.max(0, start - 16), start));

  return CITY_DISTRICT_NUMBER_PATTERN.test(before);
};

const normalizeAddressNumber = (value: string) => stripDiacritics(value).toLocaleLowerCase('cs-CZ');

const createHouseCandidateKey = (
  houseNumber: string,
  orientationNumber: string | undefined,
  start: number,
) => `${houseNumber}/${orientationNumber ?? ''}:${start}`;

export const extractHouseNumberCandidates = (value: string): HouseNumberCandidate[] => {
  const postalSpans = extractPostalCodeCandidates(value);
  const candidates: HouseNumberCandidate[] = [];
  const seen = new Set<string>();

  const pushCandidate = (
    candidate: Omit<HouseNumberCandidate, 'houseNumber' | 'orientationNumber'> & {
      houseNumber: string;
      orientationNumber?: string;
    },
  ) => {
    if (isInsideAnySpan(candidate.start, candidate.end, postalSpans)) {
      return;
    }

    const houseNumber = normalizeAddressNumber(candidate.houseNumber);
    const orientationNumber =
      candidate.orientationNumber === undefined
        ? undefined
        : normalizeAddressNumber(candidate.orientationNumber);
    const key = createHouseCandidateKey(houseNumber, orientationNumber, candidate.start);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    const displayValue =
      candidate.reason === 'explicit-orientation' || orientationNumber === undefined
        ? houseNumber
        : `${houseNumber}/${orientationNumber}`;

    candidates.push(
      orientationNumber === undefined
        ? {
            ...candidate,
            houseNumber,
            displayValue,
          }
        : {
            ...candidate,
            houseNumber,
            orientationNumber,
            displayValue,
          },
    );
  };

  for (const match of value.matchAll(SLASH_HOUSE_NUMBER_PATTERN)) {
    const [sourceText, houseNumber, orientationNumber] = match;
    const start = match.index;

    if (houseNumber === undefined || orientationNumber === undefined) {
      continue;
    }

    pushCandidate({
      houseNumber,
      orientationNumber,
      displayValue: sourceText,
      sourceText,
      start,
      end: start + sourceText.length,
      reason: 'slash',
    });
  }

  for (const match of value.matchAll(EXPLICIT_HOUSE_NUMBER_PATTERN)) {
    const [sourceText, houseNumber] = match;
    const start = match.index;

    if (houseNumber === undefined) {
      continue;
    }

    pushCandidate({
      houseNumber,
      displayValue: houseNumber,
      sourceText,
      start,
      end: start + sourceText.length,
      reason: 'explicit-house',
    });
  }

  for (const match of value.matchAll(EXPLICIT_ORIENTATION_NUMBER_PATTERN)) {
    const [sourceText, orientationNumber] = match;
    const start = match.index;

    if (orientationNumber === undefined) {
      continue;
    }

    pushCandidate({
      houseNumber: orientationNumber,
      orientationNumber,
      displayValue: orientationNumber,
      sourceText,
      start,
      end: start + sourceText.length,
      reason: 'explicit-orientation',
    });
  }

  for (const match of value.matchAll(STREET_NUMBER_PATTERN)) {
    const [sourceText, houseNumber] = match;
    const start = match.index;
    const end = start + sourceText.length;

    if (
      houseNumber === undefined ||
      isInsideAnySpan(start, end, postalSpans) ||
      isInsideAnySpan(start, end, candidates) ||
      isLikelyCityDistrictNumber(value, start)
    ) {
      continue;
    }

    pushCandidate({
      houseNumber,
      displayValue: houseNumber,
      sourceText,
      start,
      end,
      reason: 'street-number',
    });
  }

  return candidates;
};

const joinNonEmpty = (values: readonly (string | undefined)[], separator: string) =>
  values
    .map((value) => (value === undefined ? undefined : normalizeDisplayText(String(value))))
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(separator);

const formatStreetLine = (parts: AddressIndexParts) => {
  let housePart: string | undefined;

  if (parts.houseNumber !== undefined) {
    housePart =
      parts.orientationNumber === undefined
        ? parts.houseNumber
        : `${parts.houseNumber}/${parts.orientationNumber}`;
  }

  return joinNonEmpty([parts.street, housePart], ' ');
};

const formatPostalCityLine = (parts: AddressIndexParts) =>
  joinNonEmpty([parts.postalCode, parts.city], ' ');

export const createAddressLabels = (
  parts: AddressIndexParts,
  fallbackLabel?: string,
): AddressLabels => {
  const line1 = normalizeDisplayText(parts.line1 ?? '');
  const streetLine = formatStreetLine(parts);
  const primaryLine = line1.length > 0 ? line1 : streetLine;
  const line2 = normalizeDisplayText(parts.line2 ?? '');
  const postalCityLine = formatPostalCityLine(parts);
  const localityLine = joinNonEmpty(
    [line2.length > 0 ? line2 : undefined, postalCityLine, parts.district],
    ', ',
  );
  const regionCountryLine = joinNonEmpty([parts.region, parts.countryCode?.toUpperCase()], ', ');
  const displayLabel =
    joinNonEmpty([primaryLine, localityLine, regionCountryLine], ', ') ||
    normalizeDisplayText(fallbackLabel ?? '');

  return {
    displayLabel,
    searchLabel: normalizeSearchText(displayLabel),
  };
};

const addressPartsFromCandidate = (candidate: AddressRankingCandidate): AddressIndexParts =>
  candidate.parts ?? candidate.address ?? {};

const labelTextFromCandidate = (candidate: AddressRankingCandidate) => {
  if (candidate.searchLabel !== undefined && candidate.searchLabel.length > 0) {
    return candidate.searchLabel;
  }

  if (candidate.displayLabel !== undefined && candidate.displayLabel.length > 0) {
    return candidate.displayLabel;
  }

  return createAddressLabels(addressPartsFromCandidate(candidate)).displayLabel;
};

export const createAddressIndexDocument = (
  parts: AddressIndexParts,
  fallbackLabel?: string,
): AddressIndexDocument => {
  const labels = createAddressLabels(parts, fallbackLabel);
  const normalizedLabel = normalizeSearchText(labels.searchLabel);
  const tokens = tokenizeAddressText(normalizedLabel);

  return {
    ...labels,
    parts,
    normalizedLabel,
    tokens,
    prefixTokens: createPrefixTokens(tokens),
    postalCodeCandidates: extractPostalCodeCandidates(labels.displayLabel),
    houseNumberCandidates: extractHouseNumberCandidates(labels.displayLabel),
  };
};

const normalizePostalCodeValue = (value: string | undefined) => value?.replaceAll(/\D/g, '') ?? '';

const collectCandidatePostalCodes = (candidate: AddressRankingCandidate) => {
  const values = new Set<string>();
  const parts = addressPartsFromCandidate(candidate);
  const normalizedPostalCode = normalizePostalCodeValue(parts.postalCode);

  if (normalizedPostalCode.length > 0) {
    values.add(normalizedPostalCode);
  }

  for (const postalCode of extractPostalCodeCandidates(labelTextFromCandidate(candidate))) {
    values.add(postalCode.value);
  }

  return values;
};

type CandidateAddressNumbers = {
  houseNumbers: Set<string>;
  orientationNumbers: Set<string>;
  pairs: Set<string>;
};

type HouseNumberMatchKind = 'house-exact' | 'house-prefix' | 'orientation-exact' | 'pair-exact';

type HouseNumberMatch = {
  kind: HouseNumberMatchKind;
  value: string;
};

type HouseNumberMatchOptions = {
  allowOrientationOnly: boolean;
};

const createCandidateAddressNumbers = (): CandidateAddressNumbers => ({
  houseNumbers: new Set<string>(),
  orientationNumbers: new Set<string>(),
  pairs: new Set<string>(),
});

const addHouseOrientationPair = (
  numbers: CandidateAddressNumbers,
  houseNumber: string,
  orientationNumber: string,
) => {
  numbers.pairs.add(`${houseNumber}/${orientationNumber}`);
};

const collectCandidateAddressNumbers = (
  candidate: AddressRankingCandidate,
): CandidateAddressNumbers => {
  const numbers = createCandidateAddressNumbers();
  const parts = addressPartsFromCandidate(candidate);

  if (parts.houseNumber !== undefined) {
    numbers.houseNumbers.add(normalizeAddressNumber(parts.houseNumber));
  }

  if (parts.orientationNumber !== undefined) {
    numbers.orientationNumbers.add(normalizeAddressNumber(parts.orientationNumber));
  }

  if (parts.houseNumber !== undefined && parts.orientationNumber !== undefined) {
    addHouseOrientationPair(
      numbers,
      normalizeAddressNumber(parts.houseNumber),
      normalizeAddressNumber(parts.orientationNumber),
    );
  }

  for (const houseNumber of extractHouseNumberCandidates(labelTextFromCandidate(candidate))) {
    if (houseNumber.reason === 'explicit-orientation') {
      numbers.orientationNumbers.add(houseNumber.orientationNumber ?? houseNumber.houseNumber);
      continue;
    }

    numbers.houseNumbers.add(houseNumber.houseNumber);

    if (houseNumber.orientationNumber !== undefined) {
      numbers.orientationNumbers.add(houseNumber.orientationNumber);
      addHouseOrientationPair(numbers, houseNumber.houseNumber, houseNumber.orientationNumber);
    }
  }

  return numbers;
};

const findMatchingHouseNumberPrefix = (queryNumber: string, houseNumbers: ReadonlySet<string>) => {
  if (queryNumber.length < MIN_HOUSE_NUMBER_PREFIX_LENGTH) {
    return;
  }

  for (const houseNumber of houseNumbers) {
    if (houseNumber.startsWith(queryNumber)) {
      return houseNumber;
    }
  }

  return;
};

const findHouseNumberMatch = (
  queryCandidate: HouseNumberCandidate,
  candidateNumbers: CandidateAddressNumbers,
  options: HouseNumberMatchOptions,
): HouseNumberMatch | undefined => {
  if (queryCandidate.reason === 'explicit-orientation') {
    const orientationNumber = queryCandidate.orientationNumber ?? queryCandidate.houseNumber;

    return options.allowOrientationOnly &&
      candidateNumbers.orientationNumbers.has(orientationNumber)
      ? { kind: 'orientation-exact', value: orientationNumber }
      : undefined;
  }

  if (queryCandidate.orientationNumber !== undefined) {
    const pair = `${queryCandidate.houseNumber}/${queryCandidate.orientationNumber}`;

    return candidateNumbers.pairs.has(pair) ? { kind: 'pair-exact', value: pair } : undefined;
  }

  if (candidateNumbers.houseNumbers.has(queryCandidate.houseNumber)) {
    return { kind: 'house-exact', value: queryCandidate.houseNumber };
  }

  if (
    options.allowOrientationOnly &&
    candidateNumbers.orientationNumbers.has(queryCandidate.houseNumber)
  ) {
    return { kind: 'orientation-exact', value: queryCandidate.houseNumber };
  }

  const prefixHouseNumber = findMatchingHouseNumberPrefix(
    queryCandidate.houseNumber,
    candidateNumbers.houseNumbers,
  );

  if (prefixHouseNumber !== undefined) {
    return { kind: 'house-prefix', value: prefixHouseNumber };
  }

  return;
};

const scoreConfidence = (confidence: number | undefined) => {
  if (confidence === undefined || !Number.isFinite(confidence)) {
    return 0;
  }

  return Math.max(0, Math.min(10, confidence * 10));
};

type ScoreState = {
  score: number;
  reasons: string[];
};

type CandidateTokenContext = {
  candidatePrefixSet: ReadonlySet<string>;
  candidateTokenSet: ReadonlySet<string>;
  normalizedCandidateLabel: string;
};

const QUERY_MATCH_REASON_PREFIXES = ['label:', 'tokens:', 'postal:', 'house-number:'] as const;
const TEXT_TOKEN_PATTERN = /\p{L}/u;
const FUZZY_TEXT_TOKEN_MIN_LENGTH = 4;
const MAX_TEXT_TOKEN_EDIT_DISTANCE = 1;

const hasReasonPrefix = (reasons: readonly string[], prefixes: readonly string[]) =>
  reasons.some((reason) => prefixes.some((prefix) => reason.startsWith(prefix)));

const hasQueryMatchReason = (reasons: readonly string[]) =>
  hasReasonPrefix(reasons, QUERY_MATCH_REASON_PREFIXES);

const createCandidateTokenContext = (candidate: AddressRankingCandidate): CandidateTokenContext => {
  const candidateLabel = labelTextFromCandidate(candidate);
  const normalizedCandidateLabel = normalizeSearchText(candidateLabel);
  const candidateTokens =
    candidate.tokens === undefined || candidate.tokens.length === 0
      ? tokenizeAddressText(normalizedCandidateLabel)
      : [...candidate.tokens];
  const candidatePrefixTokens =
    candidate.prefixTokens === undefined || candidate.prefixTokens.length === 0
      ? createPrefixTokens(candidateTokens)
      : [...candidate.prefixTokens];

  return {
    candidatePrefixSet: new Set(candidatePrefixTokens),
    candidateTokenSet: new Set(candidateTokens),
    normalizedCandidateLabel,
  };
};

const hasNonEmptyAddressPart = (value: string | undefined) =>
  value !== undefined && normalizeDisplayText(value).length > 0;

const hasAddressNumberInText = (value: string | undefined) =>
  value !== undefined && extractHouseNumberCandidates(value).length > 0;

const hasStreetAddressParts = (candidate: AddressRankingCandidate) => {
  const parts = addressPartsFromCandidate(candidate);
  const hasStreetText = hasNonEmptyAddressPart(parts.street) || hasNonEmptyAddressPart(parts.line1);
  const hasStructuredAddressNumber =
    hasNonEmptyAddressPart(parts.houseNumber) || hasNonEmptyAddressPart(parts.orientationNumber);

  if (
    hasStreetText &&
    (hasStructuredAddressNumber ||
      hasAddressNumberInText(parts.line1) ||
      hasAddressNumberInText(labelTextFromCandidate(candidate)))
  ) {
    return true;
  }

  if (candidate.address !== undefined || candidate.parts !== undefined) {
    return false;
  }

  return hasAddressNumberInText(labelTextFromCandidate(candidate));
};

const textAddressTokens = (value: string) =>
  tokenizeAddressText(value).filter(
    (token) => token.length >= DEFAULT_MIN_PREFIX_LENGTH && TEXT_TOKEN_PATTERN.test(token),
  );

const hasStrongStreetTextMatch = (query: string, candidate: AddressRankingCandidate) => {
 const parts = addressPartsFromCandidate(candidate);
 const candidateStreetText = joinNonEmpty([parts.street, parts.line1], ' ');
  const candidateStreetTokens = textAddressTokens(candidateStreetText);

  if (candidateStreetTokens.length === 0) {
    return false;
  }

  const queryTextTokens = textAddressTokens(query);

  return candidateStreetTokens.every((streetToken) =>
    queryTextTokens.some(
      (queryToken) => streetToken === queryToken || streetToken.startsWith(queryToken),
    ),
 );
};

const applyStreetPrefixScore = (
 state: ScoreState,
 normalizedQuery: string,
 candidate: AddressRankingCandidate,
) => {
 if (normalizedQuery.length === 0) {
 return;
 }

 const parts = addressPartsFromCandidate(candidate);
 const normalizedStreetText = normalizeSearchText(joinNonEmpty([parts.street, parts.line1], ' '));

 if (!normalizedStreetText.startsWith(normalizedQuery)) {
 return;
 }

 const completionLength = normalizedStreetText.length - normalizedQuery.length;
 state.score += 24 + Math.max(0, 12 - completionLength);
 state.reasons.push('street:prefix');
};

const applyLabelScore = (
 state: ScoreState,
 normalizedQuery: string,
 normalizedCandidateLabel: string,
) => {
  if (normalizedQuery.length > 0 && normalizedCandidateLabel === normalizedQuery) {
    state.score += 100;
    state.reasons.push('label:exact');
  }

  if (normalizedQuery.length > 0 && normalizedCandidateLabel.startsWith(normalizedQuery)) {
    state.score += 20;
    state.reasons.push('label:prefix');
  }
};

const applyTokenScore = (
  state: ScoreState,
  queryTokens: readonly string[],
  candidateTokenSet: ReadonlySet<string>,
  candidatePrefixSet: ReadonlySet<string>,
) => {
  const exactTokenMatches = queryTokens.filter((token) => candidateTokenSet.has(token));

  if (queryTokens.length > 0 && exactTokenMatches.length === queryTokens.length) {
    state.score += 30;
    state.reasons.push('tokens:all-exact');
  }

  if (exactTokenMatches.length > 0) {
    state.score += exactTokenMatches.length * 10;
    state.reasons.push(`tokens:exact:${exactTokenMatches.length}`);
  }

  const prefixTokenMatches = queryTokens.filter(
    (token) =>
      token.length >= DEFAULT_MIN_PREFIX_LENGTH &&
      !candidateTokenSet.has(token) &&
      candidatePrefixSet.has(token),
  );

  if (prefixTokenMatches.length > 0) {
    state.score += prefixTokenMatches.length * 4;
    state.reasons.push(`tokens:prefix:${prefixTokenMatches.length}`);
  }
};

const applyPostalScore = (state: ScoreState, query: string, candidate: AddressRankingCandidate) => {
  const candidatePostalCodes = collectCandidatePostalCodes(candidate);
  const matchedPostalCodes = extractPostalCodeCandidates(query).filter((postalCode) =>
    candidatePostalCodes.has(postalCode.value),
  );

  if (matchedPostalCodes.length > 0) {
    state.score += 18;
    state.reasons.push('postal:match');
  }
};

const houseNumberMatchScore = (kind: HouseNumberMatchKind) => {
  switch (kind) {
    case 'pair-exact':
      return 28;
    case 'house-exact':
      return 22;
    case 'orientation-exact':
      return 16;
    case 'house-prefix':
      return 14;
    default:
      return 0;
  }
};

const applyHouseNumberScore = (
  state: ScoreState,
  query: string,
  candidate: AddressRankingCandidate,
) => {
  if (textAddressTokens(query).length > 0 && !hasTextualQueryTokenMatch(query, candidate)) {
    return;
  }

  const candidateHouseNumbers = collectCandidateAddressNumbers(candidate);
  const matchOptions = {
    allowOrientationOnly: hasStrongStreetTextMatch(query, candidate),
  };
  const matchedHouseNumbers = extractHouseNumberCandidates(query)
    .map((houseNumber) => findHouseNumberMatch(houseNumber, candidateHouseNumbers, matchOptions))
    .filter((match): match is HouseNumberMatch => match !== undefined);

  if (matchedHouseNumbers.length > 0) {
    state.score += Math.max(
      ...matchedHouseNumbers.map((match) => houseNumberMatchScore(match.kind)),
    );
    state.reasons.push('house-number:match');

    for (const reason of new Set(
      matchedHouseNumbers.map((match) => `house-number:${match.kind}:${match.value}`),
    )) {
      state.reasons.push(reason);
    }
  }
};

const isTextQueryTokenCandidateMatch = (
  token: string,
  candidateTokenSet: ReadonlySet<string>,
  candidatePrefixSet: ReadonlySet<string>,
) =>
  candidateTokenSet.has(token) ||
  candidatePrefixSet.has(token) ||
  isFuzzyTextQueryTokenCandidateMatch(token, candidateTokenSet);

const hasBoundedEditDistance = (left: string, right: string, maxDistance: number) => {
  const lengthDelta = Math.abs(left.length - right.length);

  if (lengthDelta > maxDistance) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left.charAt(leftIndex) === right.charAt(rightIndex)) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;

    if (edits > maxDistance) {
      return false;
    }

    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) {
    edits += 1;
  }

  return edits <= maxDistance;
};

const isFuzzyTextQueryTokenCandidateMatch = (
  queryToken: string,
  candidateTokenSet: ReadonlySet<string>,
) => {
  if (queryToken.length < FUZZY_TEXT_TOKEN_MIN_LENGTH || !TEXT_TOKEN_PATTERN.test(queryToken)) {
    return false;
  }

  for (const candidateToken of candidateTokenSet) {
    if (
      candidateToken.length >= FUZZY_TEXT_TOKEN_MIN_LENGTH &&
      TEXT_TOKEN_PATTERN.test(candidateToken) &&
      hasBoundedEditDistance(queryToken, candidateToken, MAX_TEXT_TOKEN_EDIT_DISTANCE)
    ) {
      return true;
    }
  }

  return false;
};

const requiredTextQueryTokenMatches = (tokenCount: number) =>
  tokenCount <= 1 ? 1 : Math.ceil(tokenCount * 0.6);

const hasTextualQueryTokenMatch = (query: string, candidate: AddressRankingCandidate) => {
  const textQueryTokens = tokenizeAddressText(query).filter(
    (token) => token.length >= DEFAULT_MIN_PREFIX_LENGTH && TEXT_TOKEN_PATTERN.test(token),
  );

  if (textQueryTokens.length === 0) {
    return true;
  }

  const { candidatePrefixSet, candidateTokenSet } = createCandidateTokenContext(candidate);
  const matchedTextTokenCount = textQueryTokens.filter((token) =>
    isTextQueryTokenCandidateMatch(token, candidateTokenSet, candidatePrefixSet),
  ).length;

  return matchedTextTokenCount >= requiredTextQueryTokenMatches(textQueryTokens.length);
};

const hasNumericQueryMatch = (query: string, candidate: AddressRankingCandidate) => {
  const candidatePostalCodes = collectCandidatePostalCodes(candidate);
  const candidateNumbers = collectCandidateAddressNumbers(candidate);
  const queryPostalCodes = extractPostalCodeCandidates(query);
  const queryHouseNumbers = extractHouseNumberCandidates(query);
  const hasPostalMatch =
    queryPostalCodes.length === 0 ||
    queryPostalCodes.some((postalCode) => candidatePostalCodes.has(postalCode.value));
  const matchOptions = {
    allowOrientationOnly: hasStrongStreetTextMatch(query, candidate),
  };
  const hasHouseNumberMatch =
    queryHouseNumbers.length === 0 ||
    queryHouseNumbers.some(
      (houseNumber) =>
        findHouseNumberMatch(houseNumber, candidateNumbers, matchOptions) !== undefined,
    );

  return hasPostalMatch && hasHouseNumberMatch;
};

const isQueryRelevantCandidate = <TCandidate extends AddressRankingCandidate>(
  query: string,
  ranked: AddressRankedCandidate<TCandidate>,
) => {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length === 0) {
    return true;
  }

  if (!hasQueryMatchReason(ranked.reasons)) {
    return false;
  }

  return (
    hasStreetAddressParts(ranked.candidate) &&
    hasTextualQueryTokenMatch(query, ranked.candidate) &&
    hasNumericQueryMatch(query, ranked.candidate)
  );
};

const clampQualityScore = (score: number) => Number(Math.max(0, Math.min(1, score)).toFixed(3));

export const scoreAddressRecordQuality = (parts: AddressIndexParts): AddressRecordQuality => {
  let score = 0.2;
  const reasons: string[] = ['baseline'];

  if (parts.countryCode !== undefined) {
    score += 0.1;
    reasons.push('country');
  }
  if (parts.city !== undefined || parts.region !== undefined) {
    score += 0.15;
    reasons.push('locality');
  }
  if (parts.postalCode !== undefined) {
    score += 0.15;
    reasons.push('postal-code');
  }
  if (parts.street !== undefined || parts.line1 !== undefined) {
    score += 0.2;
    reasons.push('street-or-line1');
  }
  if (parts.houseNumber !== undefined) {
    score += 0.15;
    reasons.push('house-number');
  }
  if (parts.orientationNumber !== undefined) {
    score += 0.05;
    reasons.push('orientation-number');
  }

  return {
    reasons,
    score: clampQualityScore(score),
  };
};

export const scoreAddressCandidate = <TCandidate extends AddressRankingCandidate>(
  query: string,
  candidate: TCandidate,
): AddressRankedCandidate<TCandidate> => {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenizeAddressText(normalizedQuery);
  const { candidatePrefixSet, candidateTokenSet, normalizedCandidateLabel } =
    createCandidateTokenContext(candidate);
  const state: ScoreState = {
    score: scoreConfidence(candidate.confidence),
    reasons: [],
  };

  if (state.score > 0) {
    state.reasons.push(`confidence:${state.score.toFixed(2)}`);
  }

 applyLabelScore(state, normalizedQuery, normalizedCandidateLabel);
 applyStreetPrefixScore(state, normalizedQuery, candidate);
 applyTokenScore(state, queryTokens, candidateTokenSet, candidatePrefixSet);
  applyPostalScore(state, query, candidate);
  applyHouseNumberScore(state, query, candidate);

  if (!hasQueryMatchReason(state.reasons) && normalizedQuery.length > 0) {
    state.reasons.push('no-query-match');
  }

  return {
    candidate,
    score: Number(state.score.toFixed(6)),
    reasons: state.reasons,
  };
};

const streetClusterKeyFromCandidate = (candidate: AddressRankingCandidate) => {
  const parts = addressPartsFromCandidate(candidate);
  return normalizeSearchText(joinNonEmpty([parts.street, parts.line1], ' '));
};

const streetClusterCountForCandidate = (
  streetClusterCounts: ReadonlyMap<string, number>,
  candidate: AddressRankingCandidate,
) => {
  const key = streetClusterKeyFromCandidate(candidate);
  return key.length === 0 ? 0 : (streetClusterCounts.get(key) ?? 0);
};

export const rankAddressCandidates = <TCandidate extends AddressRankingCandidate>(
  query: string,
  candidates: readonly TCandidate[],
  options: AddressRankingOptions = {},
): AddressRankedCandidate<TCandidate>[] => {
  const ranked = candidates
    .map((candidate) => scoreAddressCandidate(query, candidate))
    .filter((candidate) => isQueryRelevantCandidate(query, candidate));
  const streetClusterCounts = new Map<string, number>();

  for (const { candidate } of ranked) {
    const key = streetClusterKeyFromCandidate(candidate);

    if (key.length > 0) {
      streetClusterCounts.set(key, (streetClusterCounts.get(key) ?? 0) + 1);
    }
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const streetClusterComparison =
      streetClusterCountForCandidate(streetClusterCounts, right.candidate) -
      streetClusterCountForCandidate(streetClusterCounts, left.candidate);

    if (streetClusterComparison !== 0) {
      return streetClusterComparison;
    }

    const leftLabel = labelTextFromCandidate(left.candidate);
    const rightLabel = labelTextFromCandidate(right.candidate);
    const labelComparison = leftLabel.localeCompare(rightLabel, 'cs-CZ');

    if (labelComparison !== 0) {
      return labelComparison;
    }

    return left.candidate.id.localeCompare(right.candidate.id, 'cs-CZ');
  });

  return options.limit === undefined ? ranked : ranked.slice(0, options.limit);
};
