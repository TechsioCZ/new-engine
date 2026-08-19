import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { GET } from "../route"

const response = () => {
  const value = {
    json: vi.fn((body: unknown) => body),
    status: vi.fn(),
  }
  value.status.mockReturnValue(value)
  return value
}

const request = (translations: unknown[]) =>
  ({
    params: { entityKind: "product", id: "prod_1" },
    query: { market: "sk" },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === Modules.TRANSLATION) {
          return { listTranslations: vi.fn(async () => translations) }
        }
        if (key === Modules.PRODUCT) {
          return { listProducts: vi.fn(async () => [{ id: "prod_1" }]) }
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }) as unknown as AuthenticatedMedusaRequest

describe("admin exact catalog Translation proof", () => {
  it("returns the real exact-locale Translation identity", async () => {
    const res = response()
    await GET(
      request([
        {
          deleted_at: null,
          id: "trans_1",
          locale_code: "sk-SK",
          reference: "product",
          reference_id: "prod_1",
          translations: { title: "Produkt" },
        },
      ]),
      res as unknown as MedusaResponse
    )

    expect(res.json).toHaveBeenCalledWith({
      localeCode: "sk-SK",
      reference: "product",
      translationId: "trans_1",
    })
  })

  it("returns 404 when the exact Translation record is absent", async () => {
    const res = response()
    await GET(request([]), res as unknown as MedusaResponse)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("returns 503 instead of accepting a wrong-locale record", async () => {
    const res = response()
    await GET(
      request([
        {
          deleted_at: null,
          id: "trans_1",
          locale_code: "cs-CZ",
          reference: "product",
          reference_id: "prod_1",
          translations: { title: "Fallback" },
        },
      ]),
      res as unknown as MedusaResponse
    )

    expect(res.status).toHaveBeenCalledWith(503)
  })
})
