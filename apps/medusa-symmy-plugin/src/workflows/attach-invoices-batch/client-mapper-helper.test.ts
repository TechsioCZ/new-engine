import { describe, expect, it } from "vitest"

import { invoicesBatchClientMapperHelper as helper } from "./client-mapper-helper"
import type { InvoiceInput } from "./types"

const invoice = (overrides: Partial<InvoiceInput> = {}): InvoiceInput => ({
  identifier_type: "order_id",
  invoice_date: "2026-07-18",
  invoice_number: "INV/2026 01",
  order_id: "order_1",
  url: "https://example.test/invoice.pdf",
  ...overrides,
})

const invoiceWithoutOrderId = (
  overrides: Partial<InvoiceInput>,
): InvoiceInput => {
  const result = invoice(overrides)
  delete result.order_id
  return result
}

describe("invoice batch client mapper", () => {
  it("collects validated lookup keys", () => {
    const keys = helper.collectOrderLookupKeys([
      invoice(),
      invoiceWithoutOrderId({
        display_id: "42",
        identifier_type: "display_id",
      }),
      invoiceWithoutOrderId({
        display_id: "4.2",
        identifier_type: "display_id",
      }),
      invoiceWithoutOrderId({
        erp_id: "ERP-1",
        identifier_type: "erp_id",
      }),
    ])

    expect([...keys.orderIds]).toStrictEqual(["order_1"])
    expect([...keys.displayIds]).toStrictEqual([42])
    expect([...keys.erpIds]).toStrictEqual(["ERP-1"])
  })

  it("indexes and resolves orders by every supported identifier", () => {
    const order = {
      display_id: 42,
      id: "order_1",
      metadata: { erp_id: "ERP-1" },
    }
    const index = helper.buildOrderIndex([order])

    expect(helper.findExistingOrder(invoice(), index)).toBe(order)
    expect(
      helper.findExistingOrder(
        invoiceWithoutOrderId({
          display_id: "42",
          identifier_type: "display_id",
        }),
        index,
      ),
    ).toBe(order)
    expect(
      helper.findExistingOrder(
        invoiceWithoutOrderId({
          erp_id: "ERP-1",
          identifier_type: "erp_id",
        }),
        index,
      ),
    ).toBe(order)
  })

  it("sanitizes upload filenames and replaces duplicate invoice metadata", () => {
    expect(helper.buildUploadPayload(invoice())).toMatchObject({
      filename: "INV_2026_01.pdf",
      mimeType: "application/pdf",
    })

    const metadata = helper.buildUpdatedMetadata(
      {
        invoices: [
          { invoice_number: "OLD", url: "old.pdf" },
          { invoice_number: "INV/2026 01", url: "stale.pdf" },
          { invalid: true },
        ],
      },
      invoice(),
      "https://example.test/new.pdf",
      { id: "file_1", url: "https://example.test/uploaded.pdf" },
    )

    expect(metadata.invoices).toHaveLength(2)
    expect(metadata.invoices.at(-1)).toMatchObject({
      file_id: "file_1",
      invoice_number: "INV/2026 01",
      url: "https://example.test/new.pdf",
    })
  })
})
