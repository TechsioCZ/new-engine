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
    describe("brand persistence", () => {
      it("persists snake_case GPSR fields", async () => {
        const brand = await service.createBrands({
          title: "GPSR Brand",
          handle: "gpsr-brand",
          gpsr_contact_email: "contact@example.com",
          gpsr_european_reseller_contact_email: "reseller@example.com",
          gpsr_european_reseller_manufacturing_company_name: "Reseller Co",
          gpsr_european_reseller_postal_address: "Reseller Street 1",
          gpsr_manufactured_outside_eu: true,
          gpsr_manufacturing_company_name: "Manufacturer Co",
          gpsr_postal_address: "Main Street 1",
        })

        const persisted = await service.retrieveBrand(brand.id)

        expect(persisted.gpsr_contact_email).toBe("contact@example.com")
        expect(persisted.gpsr_european_reseller_contact_email).toBe(
          "reseller@example.com"
        )
        expect(
          persisted.gpsr_european_reseller_manufacturing_company_name
        ).toBe("Reseller Co")
        expect(persisted.gpsr_european_reseller_postal_address).toBe(
          "Reseller Street 1"
        )
        expect(persisted.gpsr_manufactured_outside_eu).toBe(true)
        expect(persisted.gpsr_manufacturing_company_name).toBe(
          "Manufacturer Co"
        )
        expect(persisted.gpsr_postal_address).toBe("Main Street 1")
      })

      it("reconciles attributes inside the brand module", async () => {
        const brand = await service.createBrands({
          title: "Attribute Brand",
          handle: "attribute-brand",
        })

        await service.setBrandAttributes(brand.id, [
          { name: "Country", value: "CZ" },
          { name: "Color", value: "Red" },
        ])
        await service.setBrandAttributes(brand.id, [
          { name: "Country", value: "SK" },
          { name: "Founded", value: "2020" },
        ])

        const attributes = await service.listBrandAttributes(
          { brand_id: brand.id },
          { relations: ["attributeType"] }
        )
        const values = new Map(
          attributes.map((attribute) => [
            attribute.attributeType.name,
            attribute.value,
          ])
        )

        expect(values).toEqual(
          new Map([
            ["Country", "SK"],
            ["Founded", "2020"],
          ])
        )
      })

      it("soft-deletes removed attributes and reuses them when explicitly reintroduced", async () => {
        const brand = await service.createBrands({
          title: "Restore Attribute Brand",
          handle: "restore-attribute-brand",
        })

        await service.setBrandAttributes(brand.id, [
          { name: "Country", value: "CZ" },
        ])
        const [original] = await service.listBrandAttributes({
          brand_id: brand.id,
        })

        expect(original).toBeDefined()

        if (!original) {
          throw new Error("Expected the original Country attribute to exist")
        }

        await service.setBrandAttributes(brand.id, [])
        const [deleted] = await service.listBrandAttributes(
          { brand_id: brand.id },
          { withDeleted: true }
        )

        expect(deleted).toBeDefined()

        if (!deleted) {
          throw new Error("Expected the removed Country attribute to exist")
        }

        expect(deleted.id).toBe(original.id)
        expect(deleted.deleted_at).toBeTruthy()

        await service.setBrandAttributes(brand.id, [
          { name: "Country", value: "SK" },
        ])

        const [restored] = await service.listBrandAttributes(
          { brand_id: brand.id },
          { relations: ["attributeType"] }
        )

        expect(restored).toBeDefined()

        if (!restored) {
          throw new Error("Expected the restored Country attribute to exist")
        }

        expect(restored.id).toBe(original.id)
        expect(restored.value).toBe("SK")
      })

      it("preserves attributes whose type is soft-deleted during replacement", async () => {
        const brand = await service.createBrands({
          title: "Deleted Type Attribute Brand",
          handle: "deleted-type-attribute-brand",
        })

        await service.setBrandAttributes(brand.id, [
          { name: "Legacy", value: "Keep me" },
          { name: "Country", value: "CZ" },
        ])
        const originalAttributes = await service.listBrandAttributes(
          { brand_id: brand.id },
          { relations: ["attributeType"] }
        )
        const legacyAttribute = originalAttributes.find(
          (attribute) => attribute.attributeType.name === "Legacy"
        )

        expect(legacyAttribute).toBeDefined()

        if (!legacyAttribute) {
          throw new Error("Expected the Legacy attribute to exist")
        }

        await service.softDeleteBrandAttributeTypes(
          legacyAttribute.attributeType.id
        )
        await service.setBrandAttributes(brand.id, [
          { name: "Country", value: "SK" },
        ])

        const attributes = await service.listBrandAttributes(
          { brand_id: brand.id },
          {
            relations: ["attributeType"],
            withDeleted: true,
          }
        )
        const preservedLegacyAttribute = attributes.find(
          (attribute) => attribute.id === legacyAttribute.id
        )
        const countryAttribute = attributes.find(
          (attribute) => attribute.attributeType.name === "Country"
        )

        expect(preservedLegacyAttribute?.deleted_at).toBeNull()
        expect(preservedLegacyAttribute?.value).toBe("Keep me")
        expect(preservedLegacyAttribute?.attributeType.deleted_at).toBeTruthy()
        expect(countryAttribute?.value).toBe("SK")
      })
    })
  },
})
