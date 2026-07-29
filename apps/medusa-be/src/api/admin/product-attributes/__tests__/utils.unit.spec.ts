import { describe, expect, it, vi } from "vitest"
import {
  getProductAttributeDetail,
  listAllProductAttributeRecords,
  parseProductAttributeOrder,
} from "../utils"

describe("Product Attribute Admin detail pagination", () => {
  it("loads every page without imposing a fixed record cap", async () => {
    const records = Array.from({ length: 101 }, (_, index) => index)
    const listPage = vi.fn(
      async (skip: number, take: number) =>
        [records.slice(skip, skip + take), records.length] as [number[], number]
    )

    await expect(listAllProductAttributeRecords(listPage)).resolves.toEqual(
      records
    )
    expect(listPage).toHaveBeenNthCalledWith(1, 0, 100)
    expect(listPage).toHaveBeenNthCalledWith(2, 100, 100)
  })
})

describe("Product Attribute Admin ordering", () => {
  it("adds a stable id tie-breaker to supported order fields", () => {
    expect(parseProductAttributeOrder("-label")).toEqual({
      id: "ASC",
      label: "DESC",
    })
  })

  it("falls back to a stable label order", () => {
    expect(parseProductAttributeOrder("unsupported")).toEqual({
      id: "ASC",
      label: "ASC",
    })
  })
})

describe("Product Attribute Admin detail option loading", () => {
  it("loads only options selected by this Product", async () => {
    const service = {
      listAndCountProductAttributeDefinitions: vi.fn().mockResolvedValue([
        [
          {
            id: "patdef_supplier",
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
          },
          {
            id: "patdef_warranty",
            input_type: "select",
            is_public: true,
            key: "warranty",
            label: "Warranty",
          },
        ],
        2,
      ]),
      listAndCountProductAttributes: vi.fn().mockResolvedValue([
        [
          {
            definition_id: "patdef_supplier",
            id: "pat_supplier",
            option_id: "patopt_selected",
            product_id: "prod_1",
          },
        ],
        1,
      ]),
      listProductAttributeOptions: vi.fn().mockResolvedValue([
        {
          definition_id: "patdef_supplier",
          id: "patopt_selected",
          key: "supplier-a",
          label: "Supplier A",
        },
      ]),
    }
    const scope = {
      resolve: vi.fn().mockReturnValue(service),
    }

    const detail = await getProductAttributeDetail(scope as never, "prod_1")

    expect(service.listProductAttributeOptions).toHaveBeenCalledWith(
      { id: { $in: ["patopt_selected"] } },
      {
        order: { id: "ASC", label: "ASC" },
        take: 1,
      }
    )
    expect(detail[0]?.selected_option).toEqual(
      expect.objectContaining({ id: "patopt_selected" })
    )
    expect(detail[1]?.selected_option).toBeNull()
  })
})
