import { MedusaError } from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PplClient } from "../client"

type PplFetch = (input: string, init?: RequestInit) => Promise<Response>

const createClient = () =>
  new PplClient({
    client_id: "client-id",
    client_secret: "client-secret",
    default_label_format: "Pdf",
    environment: "testing",
  })

describe("PplClient response parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the sanitized DTO produced by the response schema", async () => {
    const fetchMock = vi.fn<PplFetch>(
      async () =>
        await Promise.resolve(
          Response.json({
            ignoredRootField: "remove me",
            items: [
              {
                ignoredItemField: "remove me too",
                importState: "Complete",
                referenceId: "fulfillment-1",
                shipmentNumber: "123456789",
              },
            ],
          }),
        ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await createClient().getBatchStatus("token", "batch-1")

    expect(result).toStrictEqual({
      items: [
        {
          importState: "Complete",
          referenceId: "fulfillment-1",
          shipmentNumber: "123456789",
        },
      ],
    })
  })

  it("rejects response DTOs that violate the endpoint contract", async () => {
    const fetchMock = vi.fn<PplFetch>(
      async () =>
        await Promise.resolve(
          Response.json({
            items: [{ referenceId: 123 }],
          }),
        ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      createClient().getBatchStatus("token", "batch-1"),
    ).rejects.toThrow(MedusaError)
  })
})
