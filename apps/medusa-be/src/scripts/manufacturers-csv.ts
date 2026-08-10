import { readFileSync } from "node:fs"

import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const HTTP_CSV_SOURCE_PATTERN = /^https?:\/\//iu
const BOM_PREFIX_REGEX = /^\uFEFF/u
const EMAIL_SCHEMA = z.email()
const TRUE_BOOLEAN_VALUES = new Set(["1", "true", "yes", "on"])
const FALSE_BOOLEAN_VALUES = new Set(["", "0", "false", "no", "off"])
const REQUIRED_HEADERS = [
  "id",
  "name",
  "contactEmail",
  "europeanResellerContactEmail",
  "europeanResellerManufacturingCompanyName",
  "europeanResellerPostalAddress",
  "manufacturingCompanyName",
  "postalAddress",
  "inList",
  "inMenu",
] as const

export interface ManufacturerCsvRow {
  description: string | null
  gpsr_contact_email: string | null
  gpsr_european_reseller_contact_email: string | null
  gpsr_european_reseller_manufacturing_company_name: string | null
  gpsr_european_reseller_postal_address: string | null
  gpsr_manufactured_outside_eu: boolean
  gpsr_manufacturing_company_name: string | null
  gpsr_postal_address: string | null
  id: string
  indexName: string | null
  inList: boolean
  inMenu: boolean
  metaDescription: string | null
  metaTitle: string | null
  name: string
  webUrl: string | null
}

export type ManufacturerCsvLookup = Map<string, ManufacturerCsvRow>

interface CsvParserState {
  afterClosingQuote: boolean
  currentField: string
  currentRow: string[]
  inQuotes: boolean
  line: number
}

const decodeCsvValue = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

const parseBooleanCsvValue = (
  value: string,
  field: string,
  manufacturerIdentity: string,
): boolean => {
  const normalized = value.trim().toLowerCase()
  if (TRUE_BOOLEAN_VALUES.has(normalized)) {
    return true
  }
  if (FALSE_BOOLEAN_VALUES.has(normalized)) {
    return false
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Manufacturer "${manufacturerIdentity}" has invalid boolean "${value}" in CSV field "${field}"`,
  )
}

const normalizeLookupKey = (value: string): string =>
  value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

const pushCsvField = (state: CsvParserState): void => {
  state.currentRow.push(state.currentField)
  state.currentField = ""
  state.afterClosingQuote = false
}

const pushCsvRow = (rows: string[][], state: CsvParserState): void => {
  pushCsvField(state)
  if (state.currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(state.currentRow)
  }
  state.currentRow = []
}

const consumeQuotedCsvCharacter = (
  source: string,
  index: number,
  state: CsvParserState,
): number => {
  const char = source.charAt(index)
  if (char !== '"') {
    state.currentField += char
    if (char === "\n") {
      state.line += 1
    }
    return index
  }

  if (source.charAt(index + 1) === '"') {
    state.currentField += '"'
    return index + 1
  }

  state.inQuotes = false
  state.afterClosingQuote = true
  return index
}

const consumeUnquotedCsvCharacter = (
  char: string,
  delimiter: string,
  rows: string[][],
  state: CsvParserState,
): void => {
  if (state.afterClosingQuote && char !== delimiter && char !== "\n") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Malformed manufacturers CSV at line ${state.line}: unexpected character after a closing quote`,
    )
  }

  if (char === '"') {
    if (state.currentField.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Malformed manufacturers CSV at line ${state.line}: quote must start at the beginning of a field`,
      )
    }
    state.inQuotes = true
    return
  }

  if (char === delimiter) {
    pushCsvField(state)
    return
  }

  if (char === "\n") {
    pushCsvRow(rows, state)
    state.line += 1
    return
  }

  state.currentField += char
}

// The parser advances through quoted and unquoted spans at different rates,
// so the cursor is walked with a while loop instead of a for loop whose
// counter would otherwise be reassigned from within the loop body.
const parseCsvRows = (source: string, delimiter = ";"): string[][] => {
  const rows: string[][] = []
  const state: CsvParserState = {
    afterClosingQuote: false,
    currentField: "",
    currentRow: [],
    inQuotes: false,
    line: 1,
  }
  const normalizedSource = source.replaceAll(/\r\n?/gu, "\n")

  let index = 0
  while (index < normalizedSource.length) {
    if (state.inQuotes) {
      index = consumeQuotedCsvCharacter(normalizedSource, index, state) + 1
      continue
    }

    consumeUnquotedCsvCharacter(
      normalizedSource.charAt(index),
      delimiter,
      rows,
      state,
    )
    index += 1
  }

  if (state.inQuotes) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Malformed manufacturers CSV: unclosed quoted field starting before line ${state.line}`,
    )
  }

  if (
    state.currentField.length > 0 ||
    state.currentRow.length > 0 ||
    state.afterClosingQuote
  ) {
    pushCsvRow(rows, state)
  }

  return rows
}

const validateHeaders = (headers: string[]): void => {
  if (!headers.length || headers.every((header) => header.length === 0)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Manufacturers CSV has no usable headers",
    )
  }

  const emptyHeaderIndex = headers.findIndex((header) => header.length === 0)
  if (emptyHeaderIndex !== -1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Manufacturers CSV has an empty header at column ${emptyHeaderIndex + 1}`,
    )
  }

  const seen = new Set<string>()
  for (const header of headers) {
    if (seen.has(header)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Manufacturers CSV has duplicate header "${header}"`,
      )
    }
    seen.add(header)
  }

  const missing = REQUIRED_HEADERS.filter((header) => !seen.has(header))
  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Manufacturers CSV is missing required header(s): ${missing.join(", ")}`,
    )
  }
}

const validateEmail = (
  value: string | null,
  field: string,
  manufacturerIdentity: string,
): void => {
  if (
    value !== null &&
    value !== "" &&
    !EMAIL_SCHEMA.safeParse(value).success
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Manufacturer "${manufacturerIdentity}" has invalid email "${value}" in CSV field "${field}"`,
    )
  }
}

const buildManufacturerCsvFields = (
  record: Record<string, string>,
  manufacturerIdentity: string,
): Omit<ManufacturerCsvRow, "id" | "name"> => {
  const gpsrContactEmail = decodeCsvValue(record["contactEmail"] ?? "")
  const gpsrEuropeanResellerContactEmail = decodeCsvValue(
    record["europeanResellerContactEmail"] ?? "",
  )
  const gpsrEuropeanResellerManufacturingCompanyName = decodeCsvValue(
    record["europeanResellerManufacturingCompanyName"] ?? "",
  )
  const gpsrEuropeanResellerPostalAddress = decodeCsvValue(
    record["europeanResellerPostalAddress"] ?? "",
  )
  const europeanRepresentativeFields = [
    gpsrEuropeanResellerContactEmail,
    gpsrEuropeanResellerManufacturingCompanyName,
    gpsrEuropeanResellerPostalAddress,
  ]
  const representativeFieldCount = europeanRepresentativeFields.filter(
    (value) => value !== null,
  ).length

  if (representativeFieldCount > 0 && representativeFieldCount < 3) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Manufacturer "${manufacturerIdentity}" must provide all European responsible-person fields or none of them`,
    )
  }

  validateEmail(gpsrContactEmail, "contactEmail", manufacturerIdentity)
  validateEmail(
    gpsrEuropeanResellerContactEmail,
    "europeanResellerContactEmail",
    manufacturerIdentity,
  )

  return {
    description: decodeCsvValue(record["description"] ?? ""),
    gpsr_contact_email: gpsrContactEmail,
    gpsr_european_reseller_contact_email: gpsrEuropeanResellerContactEmail,
    gpsr_european_reseller_manufacturing_company_name:
      gpsrEuropeanResellerManufacturingCompanyName,
    gpsr_european_reseller_postal_address: gpsrEuropeanResellerPostalAddress,
    gpsr_manufactured_outside_eu: representativeFieldCount === 3,
    gpsr_manufacturing_company_name: decodeCsvValue(
      record["manufacturingCompanyName"] ?? "",
    ),
    gpsr_postal_address: decodeCsvValue(record["postalAddress"] ?? ""),
    inList: parseBooleanCsvValue(
      record["inList"] ?? "",
      "inList",
      manufacturerIdentity,
    ),
    inMenu: parseBooleanCsvValue(
      record["inMenu"] ?? "",
      "inMenu",
      manufacturerIdentity,
    ),
    indexName: decodeCsvValue(record["indexName"] ?? ""),
    metaDescription: decodeCsvValue(record["metaDescription"] ?? ""),
    metaTitle: decodeCsvValue(record["metaTitle"] ?? ""),
    webUrl: decodeCsvValue(record["webUrl"] ?? ""),
  }
}

const toManufacturerCsvRow = (
  headers: string[],
  row: string[],
  sourceRow: number,
): ManufacturerCsvRow => {
  if (row.length !== headers.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Malformed manufacturers CSV row ${sourceRow}: expected ${headers.length} columns, received ${row.length}`,
    )
  }

  const record = Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? ""]),
  ) as Record<string, string>

  const id = decodeCsvValue(record["id"] ?? "")
  const name = decodeCsvValue(record["name"] ?? "")
  if (id === null || id === "" || name === null || name === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Malformed manufacturers CSV row ${sourceRow}: both "id" and "name" are required`,
    )
  }

  const manufacturerIdentity = `${name} (${id})`
  return {
    id,
    name,
    ...buildManufacturerCsvFields(record, manufacturerIdentity),
  }
}

export const parseManufacturersCsv = (source: string): ManufacturerCsvRow[] => {
  const rows = parseCsvRows(source)
  const [headerRow] = rows
  if (!headerRow) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Manufacturers CSV has no usable headers or rows",
    )
  }

  const headers = headerRow.map((header, index) => {
    const normalizedHeader =
      index === 0 ? header.replace(BOM_PREFIX_REGEX, "") : header
    return normalizedHeader.trim()
  })
  validateHeaders(headers)

  const manufacturers = rows
    .slice(1)
    .map((row, index) => toManufacturerCsvRow(headers, row, index + 2))

  if (!manufacturers.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Manufacturers CSV has headers but no usable data rows",
    )
  }

  return manufacturers
}

export const buildManufacturersLookup = (
  rows: ManufacturerCsvRow[],
): ManufacturerCsvLookup => {
  if (!rows.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cannot build manufacturers lookup from zero rows",
    )
  }

  const lookup = new Map<string, ManufacturerCsvRow>()

  for (const row of rows) {
    const aliases = [
      { field: "name", value: row.name },
      ...(row.indexName !== null && row.indexName !== ""
        ? [{ field: "indexName", value: row.indexName }]
        : []),
    ]

    for (const alias of aliases) {
      const key = normalizeLookupKey(alias.value)
      if (!key) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Manufacturer "${row.name}" (${row.id}) has unusable ${alias.field} alias "${alias.value}"`,
        )
      }

      const existing = lookup.get(key)
      if (existing && existing !== row) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Manufacturer alias collision for normalized key "${key}": "${existing.name}" (${existing.id}) and "${row.name}" (${row.id})`,
        )
      }

      lookup.set(key, row)
    }
  }

  return lookup
}

export const findManufacturerCsvRow = (
  lookup: ManufacturerCsvLookup,
  value?: string | null,
): ManufacturerCsvRow | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  return lookup.get(normalizeLookupKey(value))
}

export const readCsvSource = async (source: string): Promise<string> => {
  if (!HTTP_CSV_SOURCE_PATTERN.test(source)) {
    return readFileSync(source, "utf-8")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 30_000)

  try {
    const response = await fetch(source, {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to fetch CSV source ${source}: ${response.status} ${response.statusText}`,
      )
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}
