import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { PRODUCT_ATTRIBUTE_MODULE } from "../../../../modules/product-attribute"
import {
  getProductAttributeDetail,
  listAllProductAttributeRecords,
  listProductAttributeOptionAssignedProducts,
  parseProductAttributeOrder,
} from "../utils"

describe("Product Attribute Admin detail pagination", () => {
  it("loads every page without imposing a fixed record cap", async () => {
    const records = Array.from({ length: 101 }, (_, index) => index)
    const listPage = vi.fn(
      async (skip: number, take: number) =>
        [records.slice(skip, skip + take), records.length] as [
          number[],
          number,
        ],
    )

    await expect(
      listAllProductAttributeRecords(listPage),
    ).resolves.toStrictEqual(records)
    expect(listPage).toHaveBeenNthCalledWith(1, 0, 100)
    expect(listPage).toHaveBeenNthCalledWith(2, 100, 100)
  })
})

describe("Product Attribute Admin ordering", () => {
  it("adds a stable id tie-breaker to supported order fields", () => {
    expect(parseProductAttributeOrder("-label")).toStrictEqual({
      id: "ASC",
      label: "DESC",
    })
  })

  it("falls back to a stable label order", () => {
    expect(parseProductAttributeOrder("unsupported")).toStrictEqual({
      id: "ASC",
      label: "ASC",
    })
  })
})

describe("Product Attribute Admin detail option loading", () => {
  it("loads only options selected by this Product", async () => {
    const service = {
      getActiveDefinitionUsageCounts: vi.fn().mockResolvedValue([
        { count: 4, id: "patdef_supplier" },
        { count: 2, id: "patdef_warranty" },
      ]),
      getActiveOptionUsageCounts: vi
        .fn()
        .mockResolvedValue([{ count: 3, id: "patopt_selected" }]),
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
        withDeleted: true,
      },
    )
    expect(detail[0]?.selected_option).toStrictEqual(
      expect.objectContaining({ id: "patopt_selected", usage_count: 3 }),
    )
    expect(detail[0]?.definition.usage_count).toBe(4)
    expect(detail[1]?.definition.usage_count).toBe(2)
    expect(detail[1]?.selected_option).toBeNull()
  })

  it("preserves assigned deleted definitions and options for Product detail", async () => {
    const service = {
      getActiveDefinitionUsageCounts: vi
        .fn()
        .mockResolvedValue([{ count: 1, id: "patdef_deleted_assigned" }]),
      getActiveOptionUsageCounts: vi
        .fn()
        .mockResolvedValue([{ count: 1, id: "patopt_deleted" }]),
      listAndCountProductAttributeDefinitions: vi.fn().mockResolvedValue([
        [
          {
            deleted_at: new Date("2026-07-29T00:00:00.000Z"),
            id: "patdef_deleted_assigned",
            input_type: "select",
            is_public: false,
            key: "deleted-assigned",
            label: "Deleted assigned",
          },
          {
            deleted_at: new Date("2026-07-29T00:00:00.000Z"),
            id: "patdef_deleted_unassigned",
            input_type: "text",
            is_public: false,
            key: "deleted-unassigned",
            label: "Deleted unassigned",
          },
        ],
        2,
      ]),
      listAndCountProductAttributes: vi.fn().mockResolvedValue([
        [
          {
            definition_id: "patdef_deleted_assigned",
            id: "pat_assigned",
            option_id: "patopt_deleted",
            product_id: "prod_1",
          },
        ],
        1,
      ]),
      listProductAttributeOptions: vi.fn().mockResolvedValue([
        {
          definition_id: "patdef_deleted_assigned",
          deleted_at: new Date("2026-07-29T00:00:00.000Z"),
          id: "patopt_deleted",
          key: "deleted-option",
          label: "Deleted option",
        },
      ]),
    }
    const scope = {
      resolve: vi.fn().mockReturnValue(service),
    }

    const detail = await getProductAttributeDetail(scope as never, "prod_1")

    expect(detail).toHaveLength(1)
    expect(detail[0]).toStrictEqual(
      expect.objectContaining({
        assignment: expect.objectContaining({
          id: "pat_assigned",
          option_id: "patopt_deleted",
        }),
        definition: expect.objectContaining({
          deleted_at: expect.any(Date),
          id: "patdef_deleted_assigned",
        }),
        selected_option: expect.objectContaining({
          deleted_at: expect.any(Date),
          id: "patopt_deleted",
          label: "Deleted option",
        }),
      }),
    )
  })
})

describe("Product Attribute option Product usage", () => {
  it("searches and paginates Products assigned to an option", async () => {
    const attributeService = {
      listProductAttributes: vi.fn().mockResolvedValue([
        {
          id: "pat_1",
          option_id: "patopt_1",
          product_id: "prod_1",
        },
      ]),
    }
    const productService = {
      listAndCountProducts: vi.fn().mockResolvedValue([
        [
          {
            handle: "product-one",
            id: "prod_1",
            status: "published",
            title: "Product One",
          },
        ],
        1,
      ]),
    }
    const scope = {
      resolve: vi.fn((key: string) =>
        key === PRODUCT_ATTRIBUTE_MODULE ? attributeService : productService,
      ),
    }

    await expect(
      listProductAttributeOptionAssignedProducts({
        limit: 20,
        offset: 0,
        optionId: "patopt_1",
        q: "50%",
        scope: scope as never,
      }),
    ).resolves.toStrictEqual({
      count: 1,
      products: [
        {
          handle: "product-one",
          id: "prod_1",
          status: "published",
          title: "Product One",
          updated_at: undefined,
        },
      ],
    })

    expect(scope.resolve).toHaveBeenCalledWith(Modules.PRODUCT)
    expect(productService.listAndCountProducts).toHaveBeenCalledWith(
      {
        $or: [
          { title: { $ilike: "%50\\%%" } },
          { handle: { $ilike: "%50\\%%" } },
        ],
        id: { $in: ["prod_1"] },
      },
      {
        order: { id: "ASC", title: "ASC" },
        select: ["id", "title", "handle", "status", "updated_at"],
        skip: 0,
        take: 20,
      },
    )
  })
})
