import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PRODUCER_MODULE } from "../../../../src/modules/producer"
import ProducerModuleService from "../../../../src/modules/producer/service"
import {
  diffIds,
  getProducerProductsLockKeys,
  getProductProducerIdsToReplace,
  getProductProducerLockKeys,
} from "../../../../src/workflows/producer"

const createScope = ({
  links,
  producers = [],
}: {
  links: Array<{ producer_id: string; product_id: string }>
  producers?: Array<{ deleted_at?: Date | null; id: string; title: string }>
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
          listProducers: vi
            .fn()
            .mockImplementation(
              (_filters: unknown, config: { withDeleted?: boolean } = {}) =>
                Promise.resolve(
                  config.withDeleted === false
                    ? producers.filter((producer) => !producer.deleted_at)
                    : producers
                )
            ),
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

  describe("getProductProducerIdsToReplace", () => {
    it("dismisses inactive retained links only when creating a new active assignment", () => {
      const activeProducerIds = new Set(["producer_active"])

      expect(
        getProductProducerIdsToReplace(
          ["producer_deleted", "producer_active"],
          activeProducerIds,
          ["producer_next"]
        )
      ).toEqual(["producer_deleted", "producer_active"])

      expect(
        getProductProducerIdsToReplace(
          ["producer_deleted"],
          activeProducerIds,
          []
        )
      ).toEqual([])
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

    it("allows products linked only to a soft-deleted producer", async () => {
      const { ensureProductsAssignableToProducer } = await import(
        "../../../../src/api/admin/producers/utils"
      )
      const scope = createScope({
        links: [
          {
            producer_id: "producer_deleted",
            product_id: "prod_1",
          },
        ],
        producers: [
          {
            deleted_at: new Date(),
            id: "producer_deleted",
            title: "Deleted producer",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToProducer(scope, "producer_1", ["prod_1"])
      ).resolves.toBeUndefined()
    })
  })

  describe("setProducerAttributes", () => {
    it("restores only the deleted attribute type and attribute it reuses", async () => {
      const createProducerAttributeTypes = vi.fn()
      const createProducerAttributes = vi.fn()
      const deleteProducerAttributes = vi.fn()
      const restoreProducerAttributes = vi.fn()
      const restoreProducerAttributeTypes = vi.fn()
      const updateProducerAttributes = vi.fn()
      const service = Object.assign(
        Object.create(ProducerModuleService.prototype),
        {
          createProducerAttributeTypes,
          createProducerAttributes,
          deleteProducerAttributes,
          listProducerAttributes: vi.fn().mockResolvedValue([
            {
              attributeType: {
                id: "pat_deleted_1",
                name: "Material",
              },
              deleted_at: new Date(),
              id: "pa_deleted_1",
              value: "Wool",
            },
            {
              attributeType: {
                id: "pat_deleted_2",
                name: "Material",
              },
              deleted_at: new Date(),
              id: "pa_deleted_2",
              value: "Linen",
            },
          ]),
          listProducerAttributeTypes: vi.fn().mockResolvedValue([
            {
              deleted_at: new Date(),
              id: "pat_deleted_1",
              name: "Material",
            },
            {
              deleted_at: new Date(),
              id: "pat_deleted_2",
              name: "Material",
            },
          ]),
          restoreProducerAttributes,
          restoreProducerAttributeTypes,
          updateProducerAttributes,
        }
      ) as ProducerModuleService

      await service.setProducerAttributes(
        "producer_1",
        [{ name: "Material", value: "Cotton" }],
        {}
      )

      expect(restoreProducerAttributeTypes).toHaveBeenCalledWith(
        ["pat_deleted_1"],
        {},
        {}
      )
      expect(restoreProducerAttributes).toHaveBeenCalledWith(
        ["pa_deleted_1"],
        {},
        {}
      )
      expect(createProducerAttributeTypes).not.toHaveBeenCalled()
      expect(createProducerAttributes).not.toHaveBeenCalled()
      expect(deleteProducerAttributes).not.toHaveBeenCalled()
      expect(updateProducerAttributes).toHaveBeenCalledWith(
        [{ id: "pa_deleted_1", value: "Cotton" }],
        {}
      )
    })
  })
})
