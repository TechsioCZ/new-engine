import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { describe, expect, it, vi } from "vitest"

import { GET as getRuleAttributes } from "../rule-attribute-options/[rule_type]/route"
import { GET as getBrandValues } from "../rule-value-options/[rule_type]/brand/route"
import { GET as getVariantValues } from "../rule-value-options/[rule_type]/product_variant/route"
import type {
  RuleAttributeOptionsQuerySchemaType,
  RuleValueOptionsQuerySchemaType,
} from "../schema"

type JsonResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn<MedusaResponse["json"]>>
}

type GraphMock = (input: unknown) => Promise<unknown>

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock this way avoids requiring every
 * property of the huge Node request/response interfaces while still
 * validating the shape the route handler actually reads from at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const createResponse = (): JsonResponse => {
  const candidate: unknown = {
    json: vi.fn<MedusaResponse["json"]>(),
  }

  assertMockShape<JsonResponse>(candidate, ["json"])
  return candidate
}

const createRequest = <TQuery = RuleValueOptionsQuerySchemaType>({
  ruleType = "target-rules",
  validatedQuery,
  graph,
}: {
  ruleType?: string
  validatedQuery: TQuery
  graph?: ReturnType<typeof vi.fn<GraphMock>>
}): MedusaRequest<unknown, TQuery> => {
  const candidate: unknown = {
    params: { rule_type: ruleType },
    scope: {
      resolve: vi
        .fn<(key: string) => { graph?: ReturnType<typeof vi.fn<GraphMock>> }>()
        .mockReturnValue(graph === undefined ? {} : { graph }),
    },
    validatedQuery,
  }

  assertMockShape<MedusaRequest<unknown, TQuery>>(candidate, [
    "params",
    "validatedQuery",
    "scope",
  ])
  return candidate
}

describe("promotion rule attribute route", () => {
  it("returns custom item attributes without dropping Medusa core attributes", () => {
    const res = createResponse()

    getRuleAttributes(
      createRequest<RuleAttributeOptionsQuerySchemaType>({
        ruleType: "target-rules",
        validatedQuery: {
          application_method_target_type: "items",
          application_method_type: "percentage",
          promotion_type: "standard",
        },
      }),
      res,
    )

    const payload = z
      .object({
        attributes: z.array(
          z
            .object({
              id: z.string(),
              operators: z
                .array(
                  z.object({ label: z.string(), value: z.string() }).loose(),
                )
                .optional(),
              value: z.string(),
            })
            .loose(),
        ),
      })
      .parse(res.json.mock.calls.at(0)?.at(0))
    const { attributes } = payload

    expect(attributes.map((attribute) => attribute.id)).toStrictEqual(
      expect.arrayContaining(["product", "brand", "product_variant"]),
    )
    const brandAttribute = attributes.find(
      (attribute) => attribute.id === "brand",
    )
    expect(brandAttribute?.value).toBe("items.brand_ids")
    expect(
      brandAttribute?.operators?.some(
        (operator) => operator.label === "Not In" && operator.value === "ne",
      ),
    ).toBeTruthy()
  })

  it("keeps Medusa invalid rule type behavior", () => {
    expect(() => {
      getRuleAttributes(
        createRequest<RuleAttributeOptionsQuerySchemaType>({
          ruleType: "bad-rule",
          validatedQuery: {},
        }),
        createResponse(),
      )
    }).toThrow("Invalid param rule_type (bad-rule)")
  })
})

describe("promotion custom rule value routes", () => {
  it("returns brand values with pagination and escaped search filters", async () => {
    const graph = vi.fn<GraphMock>().mockResolvedValue({
      data: [{ id: "brand_1", title: "ACME 50%_Sale" }],
      metadata: { count: 1, skip: 5, take: 10 },
    })
    const res = createResponse()

    await getBrandValues(
      createRequest({
        graph,
        validatedQuery: {
          limit: 10,
          offset: 5,
          q: "50%_Sale",
          value: "brand_1",
        },
      }),
      res,
    )

    expect(graph).toHaveBeenCalledWith({
      entity: "brand",
      fields: ["id", "title"],
      filters: {
        deleted_at: null,
        id: ["brand_1"],
        title: { $ilike: "%50\\%\\_Sale%" },
      },
      pagination: { skip: 5, take: 10 },
    })
    expect(res.json).toHaveBeenCalledWith({
      count: 1,
      limit: 10,
      offset: 5,
      values: [{ label: "ACME 50%_Sale", value: "brand_1" }],
    })
  })

  it("returns stable product variant labels and hydrates by id", async () => {
    const graph = vi.fn<GraphMock>().mockResolvedValue({
      data: [
        {
          id: "variant_1",
          product: { title: "Trail Shirt" },
          sku: "SHIRT-L",
          title: "Large",
        },
      ],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    const res = createResponse()

    await getVariantValues(
      createRequest({
        graph,
        validatedQuery: {
          id: ["variant_1"],
          limit: 20,
          offset: 0,
          q: "Trail",
        },
      }),
      res,
    )

    expect(graph).toHaveBeenCalledWith({
      entity: "product_variant",
      fields: ["id", "title", "sku", "product.title"],
      filters: {
        $or: [{ title: { $ilike: "%Trail%" } }, { sku: { $ilike: "%Trail%" } }],
        id: ["variant_1"],
      },
      pagination: { skip: 0, take: 20 },
    })
    expect(res.json).toHaveBeenCalledWith({
      count: 1,
      limit: 20,
      offset: 0,
      values: [{ label: "Trail Shirt - Large (SHIRT-L)", value: "variant_1" }],
    })
  })
})
