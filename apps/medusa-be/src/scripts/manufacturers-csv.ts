import { readFileSync } from "node:fs"

const HTTP_CSV_SOURCE_PATTERN = /^https?:\/\//i
const BOM_PREFIX_REGEX = /^\uFEFF/

export type ManufacturerCsvRow = {
  contactEmail: string | null
  description: string | null
  europeanResellerContactEmail: string | null
  europeanResellerManufacturingCompanyName: string | null
  europeanResellerPostalAddress: string | null
  id: string
  indexName: string | null
  inList: boolean
  inMenu: boolean
  manufacturingCompanyName: string | null
  metaDescription: string | null
  metaTitle: string | null
  name: string
  postalAddress: string | null
  webUrl: string | null
}

export type ManufacturerCsvLookup = Map<string, ManufacturerCsvRow>

type CsvParserState = {
  currentField: string
  currentRow: string[]
  inQuotes: boolean
}

function decodeCsvValue(value: string) {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function parseBooleanCsvValue(value: string) {
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
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
}

function pushCsvRow(rows: string[][], state: CsvParserState) {
  pushCsvField(state)
  if (state.currentRow.some((cell) => cell.length > 0)) {
    rows.push(state.currentRow)
  }
  state.currentRow = []
}

function handleCsvQuote(state: CsvParserState, nextChar?: string) {
  if (state.inQuotes && nextChar === '"') {
    state.currentField += '"'
    return 1
  }

  state.inQuotes = !state.inQuotes
  return 0
}

function parseCsvRows(source: string, delimiter = ";") {
  const rows: string[][] = []
  const state: CsvParserState = {
    currentField: "",
    currentRow: [],
    inQuotes: false,
  }
  const normalizedSource = source.replace(/\r\n?/g, "\n")

  for (let index = 0; index < normalizedSource.length; index += 1) {
    const char = normalizedSource[index]

    if (char === '"') {
      index += handleCsvQuote(state, normalizedSource[index + 1])
      continue
    }

    if (!state.inQuotes && char === delimiter) {
      pushCsvField(state)
      continue
    }

    if (!state.inQuotes && char === "\n") {
      pushCsvRow(rows, state)
      continue
    }

    state.currentField += char
  }

  if (state.currentField.length > 0 || state.currentRow.length > 0) {
    pushCsvField(state)
    if (state.currentRow.some((cell) => cell.length > 0)) {
      rows.push(state.currentRow)
    }
  }

  return rows
}

function buildManufacturerCsvFields(record: Record<string, string>) {
  return {
    contactEmail: decodeCsvValue(record.contactEmail ?? ""),
    description: decodeCsvValue(record.description ?? ""),
    europeanResellerContactEmail: decodeCsvValue(
      record.europeanResellerContactEmail ?? ""
    ),
    europeanResellerManufacturingCompanyName: decodeCsvValue(
      record.europeanResellerManufacturingCompanyName ?? ""
    ),
    europeanResellerPostalAddress: decodeCsvValue(
      record.europeanResellerPostalAddress ?? ""
    ),
    indexName: decodeCsvValue(record.indexName ?? ""),
    inList: parseBooleanCsvValue(record.inList ?? ""),
    inMenu: parseBooleanCsvValue(record.inMenu ?? ""),
    manufacturingCompanyName: decodeCsvValue(
      record.manufacturingCompanyName ?? ""
    ),
    metaDescription: decodeCsvValue(record.metaDescription ?? ""),
    metaTitle: decodeCsvValue(record.metaTitle ?? ""),
    postalAddress: decodeCsvValue(record.postalAddress ?? ""),
    webUrl: decodeCsvValue(record.webUrl ?? ""),
  }
}

function toManufacturerCsvRow(
  headers: string[],
  row: string[]
): ManufacturerCsvRow | undefined {
  if (!row.some((cell) => cell.trim().length > 0)) {
    return
  }

  const record = Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? ""])
  ) as Record<string, string>

  const id = decodeCsvValue(record.id ?? record["ï»¿id"] ?? "")
  const name = decodeCsvValue(record.name ?? "")
  if (!(id && name)) {
    return
  }

  return {
    id,
    name,
    ...buildManufacturerCsvFields(record),
  }
}

export function parseManufacturersCsv(source: string): ManufacturerCsvRow[] {
  const rows = parseCsvRows(source)
  const headers = rows[0]?.map((header, index) => {
    const normalizedHeader =
      index === 0 ? header.replace(BOM_PREFIX_REGEX, "") : header
    return normalizedHeader.trim()
  })

  if (!headers?.length) {
    return []
  }

  const manufacturers: ManufacturerCsvRow[] = []
  for (const row of rows.slice(1)) {
    const manufacturer = toManufacturerCsvRow(headers, row)
    if (manufacturer) {
      manufacturers.push(manufacturer)
    }
  }

  return manufacturers
}

export function buildManufacturersLookup(
  rows: ManufacturerCsvRow[]
): ManufacturerCsvLookup {
  const lookup = new Map<string, ManufacturerCsvRow>()

  for (const row of rows) {
    lookup.set(normalizeLookupKey(row.name), row)
    if (row.indexName) {
      lookup.set(normalizeLookupKey(row.indexName), row)
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

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch CSV source ${source}: ${response.status} ${response.statusText}`
    )
  }

  return response.text()
}
