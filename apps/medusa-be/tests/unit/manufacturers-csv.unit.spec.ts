import { describe, expect, it } from "vitest"
import {
  buildManufacturersLookup,
  parseManufacturersCsv,
} from "../../src/scripts/manufacturers-csv"

const HEADERS = [
  "id",
  "name",
  "indexName",
  "contactEmail",
  "europeanResellerContactEmail",
  "europeanResellerManufacturingCompanyName",
  "europeanResellerPostalAddress",
  "manufacturingCompanyName",
  "postalAddress",
  "inList",
  "inMenu",
  "description",
].join(";")
const PARTIAL_RESPONSIBLE_PERSON_ERROR =
  /Herbatika.*all European responsible-person fields/
const INVALID_EMAIL_ERROR = /Herbatika \(manufacturer-1\).*invalid email/
const INVALID_BOOLEAN_ERROR = /Herbatika \(manufacturer-1\).*invalid boolean/
const NO_USABLE_CSV_ERROR = /no usable headers or rows/
const MISSING_NAME_HEADER_ERROR = /missing required header.*name/
const DUPLICATE_HEADER_ERROR = /duplicate header/
const EMPTY_HEADER_ERROR = /empty header/
const NO_DATA_ROWS_ERROR = /no usable data rows/
const COLUMN_COUNT_ERROR = /expected 12 columns/
const UNCLOSED_QUOTE_ERROR = /unclosed quoted field/
const MISPLACED_QUOTE_ERROR = /quote must start/
const NORMALIZED_ALIAS_COLLISION_ERROR = /alias collision.*Herbatika.*Hérbatika/
const ALIAS_COLLISION_ERROR = /alias collision/

function csvRow(overrides: Partial<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    id: "manufacturer-1",
    name: "Herbatika",
    indexName: "",
    contactEmail: "manufacturer@example.com",
    europeanResellerContactEmail: "",
    europeanResellerManufacturingCompanyName: "",
    europeanResellerPostalAddress: "",
    manufacturingCompanyName: "Herbatika s.r.o.",
    postalAddress: "Bratislava",
    inList: "true",
    inMenu: "false",
    description: "Description",
    ...overrides,
  }

  return [
    values.id,
    values.name,
    values.indexName,
    values.contactEmail,
    values.europeanResellerContactEmail,
    values.europeanResellerManufacturingCompanyName,
    values.europeanResellerPostalAddress,
    values.manufacturingCompanyName,
    values.postalAddress,
    values.inList,
    values.inMenu,
    values.description,
  ].join(";")
}

describe("parseManufacturersCsv", () => {
  it("parses BOM, CRLF, quoted delimiters, escaped quotes, and no trailing newline", () => {
    const source = `\uFEFF${HEADERS}\r\n${csvRow({
      description: '"Quoted; value with ""escaped"" text"',
    })}`

    const rows = parseManufacturersCsv(source)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      description: 'Quoted; value with "escaped" text',
      gpsr_contact_email: "manufacturer@example.com",
      gpsr_manufactured_outside_eu: false,
      id: "manufacturer-1",
      inList: true,
      inMenu: false,
      name: "Herbatika",
    })
  })

  it("ignores blank LF rows", () => {
    expect(
      parseManufacturersCsv(
        `${HEADERS}\n\n${csvRow()}\n; ; ; ; ; ; ; ; ; ; ; \n`
      )
    ).toHaveLength(1)
  })

  it.each([
    "1",
    "true",
    "TRUE",
    "yes",
    "on",
  ])("accepts true boolean spelling %s", (value) => {
    expect(
      parseManufacturersCsv(`${HEADERS}\n${csvRow({ inList: value })}`)[0]
        .inList
    ).toBe(true)
  })

  it.each([
    "",
    "0",
    "false",
    "FALSE",
    "no",
    "off",
  ])("accepts false boolean spelling %s", (value) => {
    expect(
      parseManufacturersCsv(`${HEADERS}\n${csvRow({ inList: value })}`)[0]
        .inList
    ).toBe(false)
  })

  it("derives outside-EU only from a complete representative", () => {
    const row = parseManufacturersCsv(
      `${HEADERS}\n${csvRow({
        europeanResellerContactEmail: "representative@example.com",
        europeanResellerManufacturingCompanyName: "EU Representative",
        europeanResellerPostalAddress: "Prague",
      })}`
    )[0]

    expect(row.gpsr_manufactured_outside_eu).toBe(true)
  })

  it.each([
    ["", "EU Representative", "Prague"],
    ["representative@example.com", "", "Prague"],
    ["representative@example.com", "EU Representative", ""],
  ])("rejects partial responsible-person data", (email, company, address) => {
    expect(() =>
      parseManufacturersCsv(
        `${HEADERS}\n${csvRow({
          europeanResellerContactEmail: email,
          europeanResellerManufacturingCompanyName: company,
          europeanResellerPostalAddress: address,
        })}`
      )
    ).toThrow(PARTIAL_RESPONSIBLE_PERSON_ERROR)
  })

  it.each([
    ["contactEmail", { contactEmail: "not-an-email" }],
    [
      "europeanResellerContactEmail",
      {
        europeanResellerContactEmail: "not-an-email",
        europeanResellerManufacturingCompanyName: "EU Representative",
        europeanResellerPostalAddress: "Prague",
      },
    ],
  ])("reports invalid %s with manufacturer identity", (_field, overrides) => {
    expect(() =>
      parseManufacturersCsv(`${HEADERS}\n${csvRow(overrides)}`)
    ).toThrow(INVALID_EMAIL_ERROR)
  })

  it("rejects invalid booleans with manufacturer identity", () => {
    expect(() =>
      parseManufacturersCsv(`${HEADERS}\n${csvRow({ inList: "sometimes" })}`)
    ).toThrow(INVALID_BOOLEAN_ERROR)
  })

  it.each([
    ["", NO_USABLE_CSV_ERROR],
    ["id;title\n1;Brand", MISSING_NAME_HEADER_ERROR],
    ["id;name;name\n1;Brand;Alias", DUPLICATE_HEADER_ERROR],
    ["id;;name\n1;x;Brand", EMPTY_HEADER_ERROR],
    [`${HEADERS}`, NO_DATA_ROWS_ERROR],
    [`${HEADERS}\nmanufacturer-1;Brand`, COLUMN_COUNT_ERROR],
    [`${HEADERS}\n"manufacturer-1;Brand`, UNCLOSED_QUOTE_ERROR],
    [`${HEADERS}\nmanufacturer"1;Brand`, MISPLACED_QUOTE_ERROR],
  ])("rejects malformed CSV", (source, expected) => {
    expect(() => parseManufacturersCsv(source)).toThrow(expected)
  })
})

describe("buildManufacturersLookup", () => {
  it("resolves normalized name and indexName aliases", () => {
    const rows = parseManufacturersCsv(
      `${HEADERS}\n${csvRow({ indexName: "Herbátika Labs" })}`
    )
    const lookup = buildManufacturersLookup(rows)

    expect(lookup.get("herbatika")).toBe(rows[0])
    expect(lookup.get("herbatika-labs")).toBe(rows[0])
  })

  it("rejects duplicate normalized names", () => {
    const rows = parseManufacturersCsv(
      `${HEADERS}\n${csvRow()}\n${csvRow({
        id: "manufacturer-2",
        name: "Hérbatika",
      })}`
    )

    expect(() => buildManufacturersLookup(rows)).toThrow(
      NORMALIZED_ALIAS_COLLISION_ERROR
    )
  })

  it("rejects collisions between name and indexName aliases", () => {
    const rows = parseManufacturersCsv(
      `${HEADERS}\n${csvRow()}\n${csvRow({
        id: "manufacturer-2",
        indexName: "Herbatika",
        name: "Other",
      })}`
    )

    expect(() => buildManufacturersLookup(rows)).toThrow(ALIAS_COLLISION_ERROR)
  })
})
