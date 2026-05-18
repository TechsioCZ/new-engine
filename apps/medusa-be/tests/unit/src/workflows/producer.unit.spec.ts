import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PRODUCER_MODULE } from "../../../../src/modules/producer"
import {
  diffIds,
  getProducerProductsLockKeys,
  getProductProducerLockKeys,
} from "../../../../src/workflows/producer"

const createScope = ({
  links,
  producers = [],
}: {
  links: Array<{ producer_id: string; product_id: string }>
  producers?: Array<{ id: string; title: string }>
}) =>
  ({
    resolve: vi.fn((key: string) => {
      if (key === ContainerRegistrationKeys.QUERY) {
        return {
          graph: vi.fn().mockResolvedValue({ data: links }),
        }
      }

      if (key === PRODUCER_MODULE) {
        return {
          listProducers: vi.fn().mockResolvedValue(producers),
        }
      }

      throw new Error(`Unexpected container key: ${key}`)
    }),
  }) as unknown as MedusaContainer

describe("producer workflows", () => {
  describe("diffIds", () => {
    it("returns only links that need to be added and removed", () => {
      expect(diffIds(["prod_1", "prod_2"], ["prod_2", "prod_3"])).toEqual({
        add: ["prod_3"],
        remove: ["prod_1"],
      })
    })

    it("deduplicates incoming selections before diffing", () => {
      expect(
        diffIds(["prod_1"], ["prod_1", "prod_1", "prod_2", "prod_2"])
      ).toEqual({
        add: ["prod_2"],
        remove: [],
      })
    })

    it("returns empty changes for no-op replacements", () => {
      expect(diffIds(["prod_1", "prod_2"], ["prod_2", "prod_1"])).toEqual({
        add: [],
        remove: [],
      })
    })
  })

  describe("product producer lock keys", () => {
    it("uses one stable product-level lock namespace for both relation workflows", () => {
      expect(
        getProductProducerLockKeys(["prod_2", "prod_1", "prod_2"])
      ).toEqual(["product-producer:prod_1", "product-producer:prod_2"])
      expect(getProducerProductsLockKeys("producer_1", ["prod_2"])).toEqual([
        "producer-products:producer_1",
        "product-producer:prod_2",
      ])
    })
  })

  describe("ensureProductsAssignableToProducer", () => {
    it("allows products that are unassigned or already linked to the producer", async () => {
      const { ensureProductsAssignableToProducer } = await import(
        "../../../../src/api/admin/producers/utils"
      )
      const scope = createScope({
        links: [
          {
            producer_id: "producer_1",
            product_id: "prod_1",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToProducer(scope, "producer_1", [
          "prod_1",
          "prod_2",
        ])
      ).resolves.toBeUndefined()
    })

    it("rejects products linked to a different producer with a clear error", async () => {
      const { ensureProductsAssignableToProducer } = await import(
        "../../../../src/api/admin/producers/utils"
      )
      const scope = createScope({
        links: [
          {
            producer_id: "producer_2",
            product_id: "prod_1",
          },
        ],
        producers: [
          {
            id: "producer_2",
            title: "Other producer",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToProducer(scope, "producer_1", ["prod_1"])
      ).rejects.toMatchObject({
        message:
          "Products are already linked to another producer: prod_1 (Other producer)",
        type: MedusaError.Types.INVALID_DATA,
      })
    })
  })
})
