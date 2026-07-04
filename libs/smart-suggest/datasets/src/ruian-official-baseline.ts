import type { AddressSnapshotRow } from "./address-snapshot"
import type { AddressTombstoneRow } from "./address-snapshot"
import type {
  ParseRuianAddressSnapshotRowOptions,
  RuianAddressSnapshotParseError,
  RuianAddressSnapshotSourceRow,
} from "./ruian-snapshot"
import {
  parseRuianAddressSnapshotRow,
  parseRuianAddressTombstoneRow,
} from "./ruian-snapshot"

export type RuianOfficialBaselineCsvDelimiter = "," | ";" | "\t"

export type RuianOfficialBaselineCsvChunk = string | Uint8Array

export type RuianOfficialBaselineCsvParseError = {
  lineNumber: number
  parseError: RuianAddressSnapshotParseError
}

export type RuianOfficialBaselineCsvRowsOptions =
  ParseRuianAddressSnapshotRowOptions & {
    delimiter?: RuianOfficialBaselineCsvDelimiter
    encoding?: string
    maxRows?: number
    onParseError?: (
      error: RuianOfficialBaselineCsvParseError
    ) => "skip" | "throw"
  }

export type RuianOfficialCsvSnapshotChange =
  | {
      kind: "address"
      row: AddressSnapshotRow
    }
  | {
      kind: "tombstone"
      tombstone: AddressTombstoneRow
    }

type CsvRecord = {
  fields: readonly string[]
  lineNumber: number
}

type CsvParserState = {
  currentField: string
  currentLineNumber: number
  currentRecord: string[]
  inQuotedField: boolean
  previousWasCarriageReturn: boolean
}

type CsvSourceRow = {
  lineNumber: number
  row: RuianAddressSnapshotSourceRow
}

const DEFAULT_CSV_DELIMITER = ";"
const DEFAULT_CSV_ENCODING = "utf-8"

const isBlankCsvRecord = (fields: readonly string[]) =>
  fields.every((field) => field.trim().length === 0)

const stripBom = (value: string) =>
  value.charCodeAt(0) === 0xfe_ff ? value.slice(1) : value

const assertMaxRows = (maxRows: number | undefined) => {
  if (maxRows === undefined) {
    return
  }

  if (!Number.isInteger(maxRows) || maxRows < 1) {
    throw new Error("RUIAN CSV maxRows must be a positive integer.")
  }
}

async function* decodeCsvChunks(
  chunks: AsyncIterable<RuianOfficialBaselineCsvChunk>,
  encoding: string
) {
  const decoder = new TextDecoder(encoding)

  for await (const chunk of chunks) {
    if (typeof chunk === "string") {
      yield chunk
      continue
    }

    yield decoder.decode(chunk, { stream: true })
  }

  const remainder = decoder.decode()

  if (remainder.length > 0) {
    yield remainder
  }
}

const createCsvParserState = (): CsvParserState => ({
  currentField: "",
  currentLineNumber: 1,
  currentRecord: [],
  inQuotedField: false,
  previousWasCarriageReturn: false,
})

const finishCsvField = (state: CsvParserState) => {
  state.currentRecord.push(state.currentField)
  state.currentField = ""
}

const finishCsvRecord = (state: CsvParserState): CsvRecord | undefined => {
  finishCsvField(state)

  const fields = state.currentRecord
  const lineNumber = state.currentLineNumber
  state.currentRecord = []
  state.currentLineNumber += 1

  if (isBlankCsvRecord(fields)) {
    return
  }

  return { fields, lineNumber }
}

const handleQuotedCsvCharacter = (
  state: CsvParserState,
  text: string,
  index: number
) => {
  const character = text[index]

  if (character !== '"') {
    state.currentField += character ?? ""
    return index
  }

  if (text[index + 1] === '"') {
    state.currentField += '"'
    return index + 1
  }

  state.inQuotedField = false
  return index
}

const consumePendingCsvLineFeed = (
  state: CsvParserState,
  character: string
) => {
  if (!state.previousWasCarriageReturn) {
    return false
  }

  state.previousWasCarriageReturn = false
  return character === "\n"
}

const handleUnquotedCsvCharacter = (
  state: CsvParserState,
  character: string,
  delimiter: RuianOfficialBaselineCsvDelimiter
): CsvRecord | undefined => {
  if (character === '"' && state.currentField.length === 0) {
    state.inQuotedField = true
    return
  }

  if (character === delimiter) {
    finishCsvField(state)
    return
  }

  if (character === "\n") {
    return finishCsvRecord(state)
  }

  if (character === "\r") {
    const record = finishCsvRecord(state)
    state.previousWasCarriageReturn = true
    return record
  }

  state.currentField += character
  return
}

function* parseCsvTextRecords(
  state: CsvParserState,
  text: string,
  delimiter: RuianOfficialBaselineCsvDelimiter
): Generator<CsvRecord> {
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (character === undefined) {
      continue
    }

    if (consumePendingCsvLineFeed(state, character)) {
      continue
    }

    if (state.inQuotedField) {
      index = handleQuotedCsvCharacter(state, text, index)
      continue
    }

    const record = handleUnquotedCsvCharacter(state, character, delimiter)

    if (record !== undefined) {
      yield record
    }
  }
}

async function* parseCsvRecords(
  chunks: AsyncIterable<RuianOfficialBaselineCsvChunk>,
  options: {
    delimiter: RuianOfficialBaselineCsvDelimiter
    encoding: string
  }
): AsyncGenerator<CsvRecord> {
  const state = createCsvParserState()

  for await (const text of decodeCsvChunks(chunks, options.encoding)) {
    yield* parseCsvTextRecords(state, text, options.delimiter)
  }

  if (state.inQuotedField) {
    throw new Error("RUIAN CSV input ended inside a quoted field.")
  }

  if (state.currentField.length > 0 || state.currentRecord.length > 0) {
    const record = finishCsvRecord(state)

    if (record !== undefined) {
      yield record
    }
  }
}

async function* parseCsvSourceRows(
  chunks: AsyncIterable<RuianOfficialBaselineCsvChunk>,
  options: {
    delimiter: RuianOfficialBaselineCsvDelimiter
    encoding: string
  }
): AsyncGenerator<CsvSourceRow> {
  let headers: readonly string[] | undefined

  for await (const record of parseCsvRecords(chunks, options)) {
    if (headers === undefined) {
      headers = record.fields.map((field, index) =>
        index === 0 ? stripBom(field).trim() : field.trim()
      )
      continue
    }

    const row: Record<string, string> = {}

    for (const [index, header] of headers.entries()) {
      if (header.length === 0) {
        continue
      }

      row[header] = record.fields[index] ?? ""
    }

    yield { lineNumber: record.lineNumber, row }
  }
}

const createCsvRowParseError = (
  lineNumber: number,
  parseError: RuianAddressSnapshotParseError
): RuianOfficialBaselineCsvParseError => ({ lineNumber, parseError })

export async function* parseRuianOfficialCsvSnapshotRows(
  chunks: AsyncIterable<RuianOfficialBaselineCsvChunk>,
  options: RuianOfficialBaselineCsvRowsOptions = {}
): AsyncGenerator<AddressSnapshotRow> {
  for await (const change of parseRuianOfficialCsvSnapshotChanges(
    chunks,
    options
  )) {
    if (change.kind === "address") {
      yield change.row
    }
  }
}

export async function* parseRuianOfficialCsvSnapshotChanges(
  chunks: AsyncIterable<RuianOfficialBaselineCsvChunk>,
  options: RuianOfficialBaselineCsvRowsOptions = {}
): AsyncGenerator<RuianOfficialCsvSnapshotChange> {
  assertMaxRows(options.maxRows)

  const delimiter = options.delimiter ?? DEFAULT_CSV_DELIMITER
  const encoding = options.encoding ?? DEFAULT_CSV_ENCODING
  let emittedChanges = 0

  for await (const sourceRow of parseCsvSourceRows(chunks, {
    delimiter,
    encoding,
  })) {
    const tombstoneResult = parseRuianAddressTombstoneRow(
      sourceRow.row,
      options
    )

    if (tombstoneResult.ok) {
      yield { kind: "tombstone", tombstone: tombstoneResult.tombstone }
      emittedChanges += 1

      if (
        options.maxRows !== undefined &&
        emittedChanges >= options.maxRows
      ) {
        return
      }

      continue
    }

    const result = parseRuianAddressSnapshotRow(sourceRow.row, options)

    if (!result.ok) {
      const error = createCsvRowParseError(sourceRow.lineNumber, result.error)
      const behavior = options.onParseError?.(error) ?? "throw"

      if (behavior === "skip") {
        continue
      }

      throw new Error(
        `RUIAN CSV row ${sourceRow.lineNumber}: ${result.error.message}`
      )
    }

    yield { kind: "address", row: result.row }
    emittedChanges += 1

    if (options.maxRows !== undefined && emittedChanges >= options.maxRows) {
      return
    }
  }
}
