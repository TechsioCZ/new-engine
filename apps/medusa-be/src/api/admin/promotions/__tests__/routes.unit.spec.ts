import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { describe, expect, it, vi } from "vitest"
import { GET as getRuleAttributes } from "../rule-attribute-options/[rule_type]/route"
import { GET as getProducerValues } from "../rule-value-options/[rule_type]/producer/route"
import { GET as getVariantValues } from "../rule-value-options/[rule_type]/product_variant/route"
import type { RuleValueOptionsQuerySchemaType } from "../schema"

type JsonResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn>
}

function createResponse(): JsonResponse {
  return {
    json: vi.fn(),
  } as unknown as JsonResponse
}

function createRequest({
  ruleType = "target-rules",
  validatedQuery = {},
  graph,
}: {
  ruleType?: string
  validatedQuery?: Record<string, unknown>
  graph?: ReturnType<typeof vi.fn>
} = {}): MedusaRequest<unknown, RuleValueOptionsQuerySchemaType> {
  return {
    params: { rule_type: ruleType },
    validatedQuery,
    scope: {
      resolve: vi.fn().mockReturnValue({ graph }),
    },
  } as unknown as MedusaRequest<unknown, RuleValueOptionsQuerySchemaType>
}

describe("promotion rule attribute route", () => {
  it("returns custom item attributes without dropping Medusa core attributes", async () => {
    const res = createResponse()

    await getRuleAttributes(
      createRequest({
        ruleType: "target-rules",
        validatedQuery: {
          promotion_type: "standard",
          application_method_type: "percentage",
          application_method_target_type: "items",
        },
      }),
      res
    )

    const payload = res.json.mock.calls[0]?.[0]
    const attributes = payload.attributes as Array<{
      id: string
      operators?: Array<{ value: string }>
      value: string
    }>

    expect(attributes.map((attribute) => attribute.id)).toEqual(
      expect.arrayContaining(["product", "producer", "product_variant"])
    )
    expect(attributes.find((attribute) => attribute.id === "producer")).toEqual(
      expect.objectContaining({
        value: "items.producer_ids",
        operators: expect.arrayContaining([
          expect.objectContaining({ value: "ne", label: "Not In" }),
        ]),
      })
    )
  })

  it("keeps Medusa invalid rule type behavior", async () => {
    await expect(
      getRuleAttributes(
        createRequest({ ruleType: "bad-rule" }),
        createResponse()
      )
    ).rejects.toThrow("Invalid param rule_type (bad-rule)")
  })
})

describe("promotion custom rule value routes", () => {
  it("returns producer values with pagination and escaped search filters", async () => {
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "producer_1", title: "ACME 50%_Sale" }],
      metadata: { count: 1, skip: 5, take: 10 },
    })
    const res = createResponse()

    await getProducerValues(
      createRequest({
        validatedQuery: {
          q: "50%_Sale",
          value: "producer_1",
          limit: 10,
          offset: 5,
        },
        graph,
      }),
      res
    )

    expect(graph).toHaveBeenCalledWith({
      entity: "producer",
      fields: ["id", "title"],
      filters: {
        id: ["producer_1"],
        title: { $ilike: "%50\\%\\_Sale%" },
      },
      pagination: { skip: 5, take: 10 },
    })
    expect(res.json).toHaveBeenCalledWith({
      values: [{ label: "ACME 50%_Sale", value: "producer_1" }],
      count: 1,
      offset: 5,
      limit: 10,
    })
  })

  it("returns stable product variant labels and hydrates by id", async () => {
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "variant_1",
          title: "Large",
          sku: "SHIRT-L",
          product: { title: "Trail Shirt" },
        },
      ],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    const res = createResponse()

    await getVariantValues(
      createRequest({
        validatedQuery: {
          q: "Trail",
          id: ["variant_1"],
          limit: 20,
          offset: 0,
        },
        graph,
      }),
      res
    )

    expect(graph).toHaveBeenCalledWith({
      entity: "product_variant",
      fields: ["id", "title", "sku", "product.title"],
      filters: {
        id: ["variant_1"],
        $or: [{ title: { $ilike: "%Trail%" } }, { sku: { $ilike: "%Trail%" } }],
      },
      pagination: { skip: 0, take: 20 },
    })
    expect(res.json).toHaveBeenCalledWith({
      values: [{ label: "Trail Shirt - Large (SHIRT-L)", value: "variant_1" }],
      count: 1,
      offset: 0,
      limit: 20,
    })
  })
})
