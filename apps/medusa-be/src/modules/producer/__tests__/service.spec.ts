import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it } from "vitest"
import { PRODUCER_MODULE } from "../index"
import Producer from "../models/producer"
import ProducerAttribute from "../models/producer-attribute"
import ProducerAttributeType from "../models/producer-attribute-type"
import type ProducerModuleService from "../service"

moduleIntegrationTestRunner<ProducerModuleService>({
  moduleName: PRODUCER_MODULE,
  moduleModels: [Producer, ProducerAttribute, ProducerAttributeType],
  resolve: "./src/modules/producer",
  testSuite: ({ service }) => {
    describe("upsertProducer", () => {
      it("creates new producer with generated handle", async () => {
        const result = await service.upsertProducer({
          name: "Test Producer",
          attributes: [],
        })

        expect(result.id).toBeDefined()
        expect(result.title).toBe("Test Producer")
        expect(result.handle).toBe("test-producer")
      })

      it("creates producer with custom handle", async () => {
        const result = await service.upsertProducer({
          name: "Some Name",
          handle: "custom-handle",
          attributes: [],
        })

        expect(result.handle).toBe("custom-handle")
      })

      it("returns existing producer when handle matches", async () => {
        const first = await service.upsertProducer({
          name: "Existing Producer",
          attributes: [],
        })

        const second = await service.upsertProducer({
          name: "Different Name",
          handle: "existing-producer",
          attributes: [],
        })

        expect(second.id).toBe(first.id)
      })

      it("creates producer with attributes", async () => {
        const result = await service.upsertProducer({
          name: "Producer With Attrs",
          attributes: [
            { name: "Country", value: "CZ" },
            { name: "Founded", value: "2020" },
          ],
        })

        const [producer] = await service.listProducers(
          { id: result.id },
          { relations: ["attributes.attributeType"] }
        )
        expect(producer).toBeDefined()

        expect(producer?.attributes).toHaveLength(2)

        const countryAttr = producer?.attributes.find(
          (a) => a.attributeType.name === "Country"
        )
        const foundedAttr = producer?.attributes.find(
          (a) => a.attributeType.name === "Founded"
        )

        expect(countryAttr?.value).toBe("CZ")
        expect(foundedAttr?.value).toBe("2020")
      })

      it("updates existing attributes on second upsert", async () => {
        await service.upsertProducer({
          name: "Update Test",
          attributes: [{ name: "Color", value: "Red" }],
        })

        await service.upsertProducer({
          name: "Update Test",
          attributes: [{ name: "Color", value: "Blue" }],
        })

        const [producer] = await service.listProducers(
          { handle: "update-test" },
          { relations: ["attributes.attributeType"] }
        )
        expect(producer).toBeDefined()

        expect(producer?.attributes).toHaveLength(1)
        expect(producer?.attributes[0]?.value).toBe("Blue")
      })

      it("reuses existing attribute types across producers", async () => {
        await service.upsertProducer({
          name: "First Producer",
          attributes: [{ name: "Material", value: "Wood" }],
        })

        await service.upsertProducer({
          name: "Second Producer",
          attributes: [{ name: "Material", value: "Metal" }],
        })

        const types = await service.listProducerAttributeTypes({
          name: "Material",
        })

        expect(types).toHaveLength(1)
      })

      it("handles mixed create and update attributes", async () => {
        await service.upsertProducer({
          name: "Mixed Test",
          attributes: [{ name: "Size", value: "Small" }],
        })

        await service.upsertProducer({
          name: "Mixed Test",
          attributes: [
            { name: "Size", value: "Large" },
            { name: "Weight", value: "5kg" },
          ],
        })

        const [producer] = await service.listProducers(
          { handle: "mixed-test" },
          { relations: ["attributes.attributeType"] }
        )
        expect(producer).toBeDefined()

        expect(producer?.attributes).toHaveLength(2)

        const sizeAttr = producer?.attributes.find(
          (a) => a.attributeType.name === "Size"
        )
        const weightAttr = producer?.attributes.find(
          (a) => a.attributeType.name === "Weight"
        )

        expect(sizeAttr?.value).toBe("Large")
        expect(weightAttr?.value).toBe("5kg")
      })
    })
  },
})
