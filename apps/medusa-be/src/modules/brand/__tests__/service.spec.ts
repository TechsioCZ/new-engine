import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it, vi } from "vitest"
import { BRAND_MODULE } from "../index"
import Brand from "../models/brand"
import BrandAttribute from "../models/brand-attribute"
import BrandAttributeType from "../models/brand-attribute-type"
import type BrandModuleService from "../service"

vi.setConfig({ testTimeout: 60_000 })

moduleIntegrationTestRunner<BrandModuleService>({
  moduleName: BRAND_MODULE,
  moduleModels: [Brand, BrandAttribute, BrandAttributeType],
  resolve: "./src/modules/brand",
  testSuite: ({ service }) => {
    describe("upsertBrand", () => {
      it("creates new brand with generated handle", async () => {
        const result = await service.upsertBrand({
          name: "Test Brand",
          attributes: [],
        })

        expect(result.id).toBeDefined()
        expect(result.title).toBe("Test Brand")
        expect(result.handle).toBe("test-brand")
      })

      it("creates brand with custom handle", async () => {
        const result = await service.upsertBrand({
          name: "Some Name",
          handle: "custom-handle",
          attributes: [],
        })

        expect(result.handle).toBe("custom-handle")
      })

      it("persists GPSR fields on upsert", async () => {
        const result = await service.upsertBrand({
          name: "GPSR Brand",
          handle: "gpsr-brand",
          attributes: [],
          gpsrContactEmail: "contact@example.com",
          gpsrEuropeanResellerContactEmail: "reseller@example.com",
          gpsrEuropeanResellerManufacturingCompanyName: "Reseller Co",
          gpsrEuropeanResellerPostalAddress: "Reseller Street 1",
          gpsrManufacturedOutsideEu: true,
          gpsrManufacturingCompanyName: "Manufacturer Co",
          gpsrPostalAddress: "Main Street 1",
        })

        const [brand] = await service.listBrands(
          { id: result.id },
          { relations: ["attributes.attributeType"] }
        )

        expect(brand).toBeDefined()
        expect(brand?.gpsrContactEmail).toBe("contact@example.com")
        expect(brand?.gpsrEuropeanResellerContactEmail).toBe(
          "reseller@example.com"
        )
        expect(brand?.gpsrEuropeanResellerManufacturingCompanyName).toBe(
          "Reseller Co"
        )
        expect(brand?.gpsrEuropeanResellerPostalAddress).toBe(
          "Reseller Street 1"
        )
        expect(brand?.gpsrManufacturedOutsideEu).toBe(true)
        expect(brand?.gpsrManufacturingCompanyName).toBe("Manufacturer Co")
        expect(brand?.gpsrPostalAddress).toBe("Main Street 1")
      })

      it("returns existing brand when handle matches", async () => {
        const first = await service.upsertBrand({
          name: "Existing Brand",
          attributes: [],
        })

        const second = await service.upsertBrand({
          name: "Different Name",
          handle: "existing-brand",
          attributes: [],
        })

        expect(second.id).toBe(first.id)
      })

      it("creates brand with attributes", async () => {
        const result = await service.upsertBrand({
          name: "Brand With Attrs",
          attributes: [
            { name: "Country", value: "CZ" },
            { name: "Founded", value: "2020" },
          ],
        })

        const [brand] = await service.listBrands(
          { id: result.id },
          { relations: ["attributes.attributeType"] }
        )
        expect(brand).toBeDefined()

        expect(brand?.attributes).toHaveLength(2)

        const countryAttr = brand?.attributes.find(
          (a) => a.attributeType.name === "Country"
        )
        const foundedAttr = brand?.attributes.find(
          (a) => a.attributeType.name === "Founded"
        )

        expect(countryAttr?.value).toBe("CZ")
        expect(foundedAttr?.value).toBe("2020")
      })

      it("updates existing attributes on second upsert", async () => {
        await service.upsertBrand({
          name: "Update Test",
          attributes: [{ name: "Color", value: "Red" }],
        })

        await service.upsertBrand({
          name: "Update Test",
          attributes: [{ name: "Color", value: "Blue" }],
        })

        const [brand] = await service.listBrands(
          { handle: "update-test" },
          { relations: ["attributes.attributeType"] }
        )
        expect(brand).toBeDefined()

        expect(brand?.attributes).toHaveLength(1)
        expect(brand?.attributes[0]?.value).toBe("Blue")
      })

      it("reuses existing attribute types across brands", async () => {
        await service.upsertBrand({
          name: "First Brand",
          attributes: [{ name: "Material", value: "Wood" }],
        })

        await service.upsertBrand({
          name: "Second Brand",
          attributes: [{ name: "Material", value: "Metal" }],
        })

        const types = await service.listBrandAttributeTypes({
          name: "Material",
        })

        expect(types).toHaveLength(1)
      })

      it("handles mixed create and update attributes", async () => {
        await service.upsertBrand({
          name: "Mixed Test",
          attributes: [{ name: "Size", value: "Small" }],
        })

        await service.upsertBrand({
          name: "Mixed Test",
          attributes: [
            { name: "Size", value: "Large" },
            { name: "Weight", value: "5kg" },
          ],
        })

        const [brand] = await service.listBrands(
          { handle: "mixed-test" },
          { relations: ["attributes.attributeType"] }
        )
        expect(brand).toBeDefined()

        expect(brand?.attributes).toHaveLength(2)

        const sizeAttr = brand?.attributes.find(
          (a) => a.attributeType.name === "Size"
        )
        const weightAttr = brand?.attributes.find(
          (a) => a.attributeType.name === "Weight"
        )

        expect(sizeAttr?.value).toBe("Large")
        expect(weightAttr?.value).toBe("5kg")
      })
    })
  },
})
