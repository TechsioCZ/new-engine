import { describe, expect, it } from "vitest"

import { InvoicesBatchClientMapperHelper } from "./client-mapper-helper"
import type { InvoiceInput } from "./types"

const helper = new InvoicesBatchClientMapperHelper()

const invoice = (overrides: Partial<InvoiceInput> = {}): InvoiceInput => ({
  identifier_type: "order_id",
  invoice_date: "2026-07-18",
  invoice_number: "INV/2026 01",
  order_id: "order_1",
  url: "https://example.test/invoice.pdf",
  ...overrides,
})

describe("invoice batch client mapper", () => {
  it("collects validated lookup keys", () => {
    const keys = helper.collectOrderLookupKeys([
      invoice(),
      invoice({
        identifier_type: "display_id",
        display_id: "42",
        order_id: undefined,
      }),
      invoice({
        identifier_type: "display_id",
        display_id: "4.2",
        order_id: undefined,
      }),
      invoice({
        identifier_type: "erp_id",
        erp_id: "ERP-1",
        order_id: undefined,
      }),
    ])

    expect([...keys.orderIds]).toEqual(["order_1"])
    expect([...keys.displayIds]).toEqual([42])
    expect([...keys.erpIds]).toEqual(["ERP-1"])
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
        invoice({
          identifier_type: "display_id",
          display_id: "42",
          order_id: undefined,
        }),
        index
      )
    ).toBe(order)
    expect(
      helper.findExistingOrder(
        invoice({
          identifier_type: "erp_id",
          erp_id: "ERP-1",
          order_id: undefined,
        }),
        index
      )
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
      { id: "file_1", url: "https://example.test/uploaded.pdf" }
    )

    expect(metadata.invoices).toHaveLength(2)
    expect(metadata.invoices.at(-1)).toMatchObject({
      file_id: "file_1",
      invoice_number: "INV/2026 01",
      url: "https://example.test/new.pdf",
    })
  })
})
