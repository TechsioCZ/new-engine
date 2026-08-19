import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { POST } from "../sources/route"

const product = {
  id: "prod_1",
  metadata: {
    url_registry_publication: {
      markets: {
        sk: {
          publicationStatus: "published",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
        },
      },
      schemaVersion: 1,
    },
  },
  sales_channels: [{ id: "sc_sk" }],
  updated_at: "2026-08-19T00:00:00.000Z",
}

const makeRequest = (body: unknown) => {
  const listProducts = vi.fn(async () => [product])
  const listTranslations = vi.fn(async () => [
    {
      deleted_at: null,
      id: "trans_1",
      locale_code: "sk-SK",
      reference: "product",
      reference_id: "prod_1",
      translations: { title: "Vitamín C" },
    },
  ])
  const resolve = vi.fn((key: string) => {
    if (key === Modules.PRODUCT) {
      return { listProducts }
    }
    if (key === Modules.TRANSLATION) {
      return { listTranslations }
    }
    throw new Error(`Unexpected dependency: ${key}`)
  })
  return {
    listProducts,
    listTranslations,
    request: {
      body,
      publishable_key_context: { sales_channel_ids: ["sc_sk"] },
      scope: { resolve },
    } as unknown as MedusaStoreRequest,
    resolve,
  }
}

const makeResponse = () => {
  const json = vi.fn()
  const response = {
    json,
    status: vi.fn().mockReturnThis(),
  } as unknown as MedusaResponse
  return { json, response }
}

describe("product sitemap source batch route", () => {
  it("returns a strict ordered source proof payload", async () => {
    const { listProducts, listTranslations, request } = makeRequest({
      candidates: [{ entityId: "prod_1", publicSlug: "vitamin-c" }],
      market: "sk",
      schemaVersion: 1,
    })
    const { json, response } = makeResponse()

    await POST(request, response)

    expect(json).toHaveBeenCalledWith({
      marketCode: "sk",
      schemaVersion: 1,
      sources: [
        {
          entityId: "prod_1",
          marketCode: "sk",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
          sourceVersion: "2026-08-19T00:00:00.000Z",
          translation: {
            localeCode: "sk-SK",
            reference: "product",
            translationId: "trans_1",
          },
        },
      ],
    })
    expect(listProducts).toHaveBeenCalledTimes(1)
    expect(listTranslations).toHaveBeenCalledTimes(1)
  })

  it("rejects extra request fields before resolving services", async () => {
    const { request, resolve } = makeRequest({
      candidates: [{ entityId: "prod_1", publicSlug: "vitamin-c" }],
      extra: true,
      market: "sk",
      schemaVersion: 1,
    })
    const { json, response } = makeResponse()

    await POST(request, response)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({ message: "Invalid request" })
    expect(resolve).not.toHaveBeenCalled()
  })
})
