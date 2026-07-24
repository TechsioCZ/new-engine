import { readFileSync } from "node:fs"
import { z } from "@medusajs/framework/zod"

const HTTP_CSV_SOURCE_PATTERN = /^https?:\/\//i
const BOM_PREFIX_REGEX = /^\uFEFF/
const EMAIL_SCHEMA = z.string().email()
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

export type ManufacturerCsvRow = {
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

type CsvParserState = {
  afterClosingQuote: boolean
  currentField: string
  currentRow: string[]
  inQuotes: boolean
  line: number
}

function decodeCsvValue(value: string) {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function parseBooleanCsvValue(
  value: string,
  field: string,
  manufacturerIdentity: string
) {
  const normalized = value.trim().toLowerCase()
  if (TRUE_BOOLEAN_VALUES.has(normalized)) {
    return true
  }
  if (FALSE_BOOLEAN_VALUES.has(normalized)) {
    return false
  }

  throw new Error(
    `Manufacturer "${manufacturerIdentity}" has invalid boolean "${value}" in CSV field "${field}"`
  )
}

function normalizeLookupKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function pushCsvField(state: CsvParserState) {
  state.currentRow.push(state.currentField)
  state.currentField = ""
  state.afterClosingQuote = false
}

function pushCsvRow(rows: string[][], state: CsvParserState) {
  pushCsvField(state)
  if (state.currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(state.currentRow)
  }
  state.currentRow = []
}

function consumeQuotedCsvCharacter(
  source: string,
  index: number,
  state: CsvParserState
) {
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

function consumeUnquotedCsvCharacter(
  char: string,
  delimiter: string,
  rows: string[][],
  state: CsvParserState
) {
  if (state.afterClosingQuote && char !== delimiter && char !== "\n") {
    throw new Error(
      `Malformed manufacturers CSV at line ${state.line}: unexpected character after a closing quote`
    )
  }

  if (char === '"') {
    if (state.currentField.length > 0) {
      throw new Error(
        `Malformed manufacturers CSV at line ${state.line}: quote must start at the beginning of a field`
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

function parseCsvRows(source: string, delimiter = ";") {
  const rows: string[][] = []
  const state: CsvParserState = {
    afterClosingQuote: false,
    currentField: "",
    currentRow: [],
    inQuotes: false,
    line: 1,
  }
  const normalizedSource = source.replace(/\r\n?/g, "\n")

  for (let index = 0; index < normalizedSource.length; index += 1) {
    if (state.inQuotes) {
      index = consumeQuotedCsvCharacter(normalizedSource, index, state)
      continue
    }

    consumeUnquotedCsvCharacter(
      normalizedSource.charAt(index),
      delimiter,
      rows,
      state
    )
  }

  if (state.inQuotes) {
    throw new Error(
      `Malformed manufacturers CSV: unclosed quoted field starting before line ${state.line}`
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

function validateHeaders(headers: string[]) {
  if (!headers.length || headers.every((header) => header.length === 0)) {
    throw new Error("Manufacturers CSV has no usable headers")
  }

  const emptyHeaderIndex = headers.findIndex((header) => header.length === 0)
  if (emptyHeaderIndex !== -1) {
    throw new Error(
      `Manufacturers CSV has an empty header at column ${emptyHeaderIndex + 1}`
    )
  }

  const seen = new Set<string>()
  for (const header of headers) {
    if (seen.has(header)) {
      throw new Error(`Manufacturers CSV has duplicate header "${header}"`)
    }
    seen.add(header)
  }

  const missing = REQUIRED_HEADERS.filter((header) => !seen.has(header))
  if (missing.length) {
    throw new Error(
      `Manufacturers CSV is missing required header(s): ${missing.join(", ")}`
    )
  }
}

function validateEmail(
  value: string | null,
  field: string,
  manufacturerIdentity: string
) {
  if (value && !EMAIL_SCHEMA.safeParse(value).success) {
    throw new Error(
      `Manufacturer "${manufacturerIdentity}" has invalid email "${value}" in CSV field "${field}"`
    )
  }
}

function buildManufacturerCsvFields(
  record: Record<string, string>,
  manufacturerIdentity: string
) {
  const gpsr_contact_email = decodeCsvValue(record.contactEmail ?? "")
  const gpsr_european_reseller_contact_email = decodeCsvValue(
    record.europeanResellerContactEmail ?? ""
  )
  const gpsr_european_reseller_manufacturing_company_name = decodeCsvValue(
    record.europeanResellerManufacturingCompanyName ?? ""
  )
  const gpsr_european_reseller_postal_address = decodeCsvValue(
    record.europeanResellerPostalAddress ?? ""
  )
  const europeanRepresentativeFields = [
    gpsr_european_reseller_contact_email,
    gpsr_european_reseller_manufacturing_company_name,
    gpsr_european_reseller_postal_address,
  ]
  const representativeFieldCount = europeanRepresentativeFields.filter(
    (value) => value !== null
  ).length

  if (representativeFieldCount > 0 && representativeFieldCount < 3) {
    throw new Error(
      `Manufacturer "${manufacturerIdentity}" must provide all European responsible-person fields or none of them`
    )
  }

  validateEmail(gpsr_contact_email, "contactEmail", manufacturerIdentity)
  validateEmail(
    gpsr_european_reseller_contact_email,
    "europeanResellerContactEmail",
    manufacturerIdentity
  )

  return {
    description: decodeCsvValue(record.description ?? ""),
    gpsr_contact_email,
    gpsr_european_reseller_contact_email,
    gpsr_european_reseller_manufacturing_company_name,
    gpsr_european_reseller_postal_address,
    gpsr_manufactured_outside_eu: representativeFieldCount === 3,
    gpsr_manufacturing_company_name: decodeCsvValue(
      record.manufacturingCompanyName ?? ""
    ),
    gpsr_postal_address: decodeCsvValue(record.postalAddress ?? ""),
    indexName: decodeCsvValue(record.indexName ?? ""),
    inList: parseBooleanCsvValue(
      record.inList ?? "",
      "inList",
      manufacturerIdentity
    ),
    inMenu: parseBooleanCsvValue(
      record.inMenu ?? "",
      "inMenu",
      manufacturerIdentity
    ),
    metaDescription: decodeCsvValue(record.metaDescription ?? ""),
    metaTitle: decodeCsvValue(record.metaTitle ?? ""),
    webUrl: decodeCsvValue(record.webUrl ?? ""),
  }
}

function toManufacturerCsvRow(
  headers: string[],
  row: string[],
  sourceRow: number
): ManufacturerCsvRow {
  if (row.length !== headers.length) {
    throw new Error(
      `Malformed manufacturers CSV row ${sourceRow}: expected ${headers.length} columns, received ${row.length}`
    )
  }

  const record = Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? ""])
  ) as Record<string, string>

  const id = decodeCsvValue(record.id ?? "")
  const name = decodeCsvValue(record.name ?? "")
  if (!(id && name)) {
    throw new Error(
      `Malformed manufacturers CSV row ${sourceRow}: both "id" and "name" are required`
    )
  }

  const manufacturerIdentity = `${name} (${id})`
  return {
    id,
    name,
    ...buildManufacturerCsvFields(record, manufacturerIdentity),
  }
}

export function parseManufacturersCsv(source: string): ManufacturerCsvRow[] {
  const rows = parseCsvRows(source)
  const [headerRow] = rows
  if (!headerRow) {
    throw new Error("Manufacturers CSV has no usable headers or rows")
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
    throw new Error("Manufacturers CSV has headers but no usable data rows")
  }

  return manufacturers
}

export function buildManufacturersLookup(
  rows: ManufacturerCsvRow[]
): ManufacturerCsvLookup {
  if (!rows.length) {
    throw new Error("Cannot build manufacturers lookup from zero rows")
  }

  const lookup = new Map<string, ManufacturerCsvRow>()

  for (const row of rows) {
    const aliases = [
      { field: "name", value: row.name },
      ...(row.indexName ? [{ field: "indexName", value: row.indexName }] : []),
    ]

    for (const alias of aliases) {
      const key = normalizeLookupKey(alias.value)
      if (!key) {
        throw new Error(
          `Manufacturer "${row.name}" (${row.id}) has unusable ${alias.field} alias "${alias.value}"`
        )
      }

      const existing = lookup.get(key)
      if (existing && existing !== row) {
        throw new Error(
          `Manufacturer alias collision for normalized key "${key}": "${existing.name}" (${existing.id}) and "${row.name}" (${row.id})`
        )
      }

      lookup.set(key, row)
    }
  }

  return lookup
}

export function findManufacturerCsvRow(
  lookup: ManufacturerCsvLookup,
  value?: string | null
): ManufacturerCsvRow | undefined {
  if (!value) {
    return
  }

  return lookup.get(normalizeLookupKey(value))
}

export async function readCsvSource(source: string): Promise<string> {
  if (!HTTP_CSV_SOURCE_PATTERN.test(source)) {
    return readFileSync(source, "utf8")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(source, {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(
        `Failed to fetch CSV source ${source}: ${response.status} ${response.statusText}`
      )
    }

    return response.text()
  } finally {
    clearTimeout(timeout)
  }
}
