import { ProductStatus } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import type {
  MeasurementUnitRecord,
  ProductMeasurementRecord,
  ProductVariantMeasurementRecord,
} from "../../../utils/measurement-units"
import type { ProductInput } from "../steps/create-products"
import {
  buildLinkPlan,
  buildProductRecordMutationPlan,
  buildVariantRecordMutationPlan,
  collectCanonicalSeedMeasurementUnits,
  findReusableSeedMeasurementUnit,
  getSeedMeasurementUnitSemanticKey,
  resolveAvailableSeedMeasurementUnitCode,
  validateSeedProductMeasurementInput,
} from "../steps/reconcile-product-measurements"

const unit = (params: {
  baseQuantity: number
  code: string
  deleted?: boolean
  id?: string
  symbol: string
}) =>
  ({
    base_quantity: params.baseQuantity,
    code: params.code,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    deleted_at: params.deleted ? new Date("2026-02-01T00:00:00.000Z") : null,
    id: params.id ?? `unit-${params.code}`,
    name: params.symbol,
    symbol: params.symbol,
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
  }) as MeasurementUnitRecord

const productMeasurement = (params: {
  deleted?: boolean
  id: string
  productId?: string
  unitId: string
}) =>
  ({
    deleted_at: params.deleted ? new Date("2026-02-01T00:00:00.000Z") : null,
    id: params.id,
    measurement_unit_id: params.unitId,
    product_id: params.productId ?? "product-1",
  }) as ProductMeasurementRecord

const variantMeasurement = (params: {
  deleted?: boolean
  id: string
  productMeasurementId: string
  quantity: number
  variantId: string
}) =>
  ({
    deleted_at: params.deleted ? new Date("2026-02-01T00:00:00.000Z") : null,
    id: params.id,
    product_measurement_id: params.productMeasurementId,
    product_unit_quantity: params.quantity,
    product_variant_id: params.variantId,
  }) as ProductVariantMeasurementRecord

const productInput = (params: {
  measurement: ProductInput["measurement"]
  variantMeasurements?: ({ product_unit_quantity: number } | null | undefined)[]
}): ProductInput => ({
  categories: [],
  description: "",
  handle: "product-1",
  images: [],
  measurement: params.measurement,
  salesChannelNames: [],
  shippingProfileName: "Default",
  status: ProductStatus.PUBLISHED,
  title: "Product",
  variants: (params.variantMeasurements ?? []).map((measurement, index) => ({
    measurement,
    sku: `SKU-${index + 1}`,
    title: `Variant ${index + 1}`,
  })),
})

const resolvedProduct = (input: ProductInput, variantIds = ["variant-1"]) => {
  const variants = variantIds.map((id, index) => ({
    id,
    sku: `SKU-${index + 1}`,
  }))
  return {
    input,
    product: {
      handle: input.handle,
      id: "product-1",
      variants,
    },
    variantInputById: new Map(
      variants.map((variant, index) => [
        variant.id,
        input.variants?.[index] as NonNullable<
          ProductInput["variants"]
        >[number],
      ]),
    ),
  }
}

describe("seed Measurement Unit identity", () => {
  it("keeps different comparison bases as separate canonical units", () => {
    const canonical = collectCanonicalSeedMeasurementUnits([
      productInput({
        measurement: {
          unit: { base_quantity: 100, code: "g_100", name: "g", symbol: "g" },
        },
      }),
      {
        ...productInput({
          measurement: {
            unit: { base_quantity: 1, code: "g_1", name: "g", symbol: "g" },
          },
        }),
        handle: "product-2",
      },
    ])

    expect([...canonical.keys()].sort()).toStrictEqual(["g:1", "g:100"])
    expect(
      getSeedMeasurementUnitSemanticKey({ base_quantity: 100, symbol: "G" }),
    ).toBe("g:100")
  })

  it("selects a canonical source without delimiter-dependent identities", () => {
    const first = productInput({
      measurement: {
        unit: {
          base_quantity: 100,
          code: "a\u0000b",
          name: "c",
          symbol: "g",
        },
      },
    })
    const second = {
      ...productInput({
        measurement: {
          unit: {
            base_quantity: 100,
            code: "a",
            name: "b\u0000c",
            symbol: "g",
          },
        },
      }),
      handle: "product-2",
    }

    expect(
      collectCanonicalSeedMeasurementUnits([first, second]).get("g:100")?.source
        .code,
    ).toBe("a")
    expect(
      collectCanonicalSeedMeasurementUnits([second, first]).get("g:100")?.source
        .code,
    ).toBe("a")
  })

  it("reuses an active semantic match regardless of its code", () => {
    const existing = unit({
      baseQuantity: 100,
      code: "grams",
      id: "manual-grams",
      symbol: "g",
    })

    expect(
      findReusableSeedMeasurementUnit([existing], {
        base_quantity: 100,
        code: "g_100",
        name: "g",
        symbol: "g",
      })?.id,
    ).toBe("manual-grams")
  })

  it("restores a semantic match only when its code is not occupied", () => {
    const deletedMatch = unit({
      baseQuantity: 100,
      code: "g_100",
      deleted: true,
      id: "deleted-match",
      symbol: "g",
    })
    const conflictingActiveCode = unit({
      baseQuantity: 1,
      code: "g_100",
      id: "active-conflict",
      symbol: "pcs",
    })
    const desired = {
      base_quantity: 100,
      code: "g_100",
      name: "g",
      symbol: "g",
    }

    expect(findReusableSeedMeasurementUnit([deletedMatch], desired)?.id).toBe(
      "deleted-match",
    )
    expect(
      findReusableSeedMeasurementUnit(
        [deletedMatch, conflictingActiveCode],
        desired,
      ),
    ).toBeUndefined()
    expect(
      resolveAvailableSeedMeasurementUnitCode(
        "g_100",
        new Set(["g_100", "g_100_2"]),
      ),
    ).toBe("g_100_3")
  })
})

describe("seed Product measurement preflight", () => {
  const measurement = {
    unit: { base_quantity: 100, code: "g_100", name: "g", symbol: "g" },
  }

  it("rejects Variant ownership when Product reconciliation is omitted", () => {
    expect(() => {
      validateSeedProductMeasurementInput([
        productInput({
          measurement: undefined,
          variantMeasurements: [null],
        }),
      ])
    }).toThrow("without owning Product measurement reconciliation")
  })

  it("rejects a Variant assignment while clearing the Product measurement", () => {
    expect(() => {
      validateSeedProductMeasurementInput([
        productInput({
          measurement: null,
          variantMeasurements: [{ product_unit_quantity: 100 }],
        }),
      ])
    }).toThrow("while clearing its Product measurement")
  })

  it("rejects invalid Variant quantities before reconciliation", () => {
    expect(() => {
      validateSeedProductMeasurementInput([
        productInput({
          measurement,
          variantMeasurements: [{ product_unit_quantity: 0 }],
        }),
      ])
    }).toThrow("measurement quantity must be positive")
  })
})

describe("seed Product measurement planning", () => {
  const grams = unit({ baseQuantity: 100, code: "g_100", symbol: "g" })
  const pieces = unit({ baseQuantity: 1, code: "pcs_1", symbol: "pcs" })

  it("authoritatively clears active Product and Variant measurements", () => {
    const activeProduct = productMeasurement({
      id: "pm-active",
      unitId: grams.id,
    })
    const activeVariant = variantMeasurement({
      id: "vm-active",
      productMeasurementId: activeProduct.id,
      quantity: 100,
      variantId: "variant-1",
    })
    const plan = buildProductRecordMutationPlan(
      [resolvedProduct(productInput({ measurement: null }))] as Parameters<
        typeof buildProductRecordMutationPlan
      >[0],
      [activeProduct],
      [activeVariant],
      new Map(),
    )

    expect([...plan.productIdsToSoftDelete]).toStrictEqual(["pm-active"])
    expect([...plan.variantIdsToSoftDelete]).toStrictEqual(["vm-active"])
    expect(plan.productTargetById.get("product-1")).toBeNull()
  })

  it("switches to and restores the requested semantic unit", () => {
    const activeProduct = productMeasurement({
      id: "pm-old",
      unitId: pieces.id,
    })
    const deletedTarget = productMeasurement({
      deleted: true,
      id: "pm-target",
      unitId: grams.id,
    })
    const oldVariant = variantMeasurement({
      id: "vm-old",
      productMeasurementId: activeProduct.id,
      quantity: 1,
      variantId: "variant-1",
    })
    const input = productInput({
      measurement: {
        unit: { base_quantity: 100, code: "g_100", name: "g", symbol: "g" },
      },
    })
    const plan = buildProductRecordMutationPlan(
      [resolvedProduct(input)] as Parameters<
        typeof buildProductRecordMutationPlan
      >[0],
      [activeProduct, deletedTarget],
      [oldVariant],
      new Map([["g:100", grams]]),
    )

    expect([...plan.productIdsToSoftDelete]).toStrictEqual(["pm-old"])
    expect([...plan.productIdsToRestore]).toStrictEqual(["pm-target"])
    expect([...plan.variantIdsToSoftDelete]).toStrictEqual(["vm-old"])
    expect(plan.productTargetById.get("product-1")?.id).toBe("pm-target")
  })

  it("preserves an omitted Variant quantity when the Product unit changes", () => {
    const activeProduct = productMeasurement({
      id: "pm-old",
      unitId: pieces.id,
    })
    const targetProduct = productMeasurement({
      deleted: true,
      id: "pm-target",
      unitId: grams.id,
    })
    const previousVariant = variantMeasurement({
      id: "vm-old",
      productMeasurementId: activeProduct.id,
      quantity: 250,
      variantId: "variant-1",
    })
    const input = productInput({
      measurement: {
        unit: { base_quantity: 100, code: "g_100", name: "g", symbol: "g" },
      },
      variantMeasurements: [undefined],
    })
    const resolved = [resolvedProduct(input)] as Parameters<
      typeof buildVariantRecordMutationPlan
    >[0]
    const productPlan = buildProductRecordMutationPlan(
      resolved,
      [activeProduct, targetProduct],
      [previousVariant],
      new Map([["g:100", grams]]),
    )
    const variantPlan = buildVariantRecordMutationPlan(resolved, {
      productMeasurements: [activeProduct, targetProduct],
      productTargetById: productPlan.productTargetById,
      variantIdsToSoftDelete: productPlan.variantIdsToSoftDelete,
      variantMeasurements: [previousVariant],
    })

    expect(variantPlan.creates).toStrictEqual([
      {
        product_measurement_id: "pm-target",
        product_unit_quantity: 250,
        product_variant_id: "variant-1",
      },
    ])
    expect([...variantPlan.softDeleteIds]).toStrictEqual(["vm-old"])
  })

  it("sets and clears mixed Variant measurements and converges on rerun", () => {
    const targetProduct = productMeasurement({
      id: "pm-target",
      unitId: grams.id,
    })
    const firstVariant = variantMeasurement({
      id: "vm-first",
      productMeasurementId: targetProduct.id,
      quantity: 500,
      variantId: "variant-1",
    })
    const secondVariant = variantMeasurement({
      id: "vm-second",
      productMeasurementId: targetProduct.id,
      quantity: 250,
      variantId: "variant-2",
    })
    const input = productInput({
      measurement: {
        unit: { base_quantity: 100, code: "g_100", name: "g", symbol: "g" },
      },
      variantMeasurements: [{ product_unit_quantity: 500 }, null],
    })
    const resolved = [
      resolvedProduct(input, ["variant-1", "variant-2"]),
    ] as Parameters<typeof buildVariantRecordMutationPlan>[0]
    const productState = {
      productMeasurements: [targetProduct],
      productTargetById: new Map([["product-1", targetProduct]]),
      variantIdsToSoftDelete: new Set<string>(),
      variantMeasurements: [firstVariant, secondVariant],
    } as Parameters<typeof buildVariantRecordMutationPlan>[1]
    const plan = buildVariantRecordMutationPlan(resolved, productState)

    expect(plan.creates).toStrictEqual([])
    expect(plan.updates).toStrictEqual([])
    expect([...plan.softDeleteIds]).toStrictEqual(["vm-second"])
    expect(plan.variantTargetById.get("variant-1")?.id).toBe("vm-first")
    expect(plan.variantTargetById.get("variant-2")).toBeNull()

    const convergedState = {
      ...productState,
      variantIdsToSoftDelete: new Set<string>(),
      variantMeasurements: [
        firstVariant,
        { ...secondVariant, deleted_at: new Date() },
      ],
    }
    const rerun = buildVariantRecordMutationPlan(resolved, convergedState)
    expect(rerun.creates).toStrictEqual([])
    expect(rerun.updates).toStrictEqual([])
    expect([...rerun.restoreIds]).toStrictEqual([])
    expect([...rerun.softDeleteIds]).toStrictEqual([])
  })
})

describe("seed measurement link planning", () => {
  it("repairs stale links and becomes a no-op once targets are active", () => {
    const productTarget = productMeasurement({
      id: "pm-target",
      unitId: "unit-g",
    })
    const variantTarget = variantMeasurement({
      id: "vm-target",
      productMeasurementId: productTarget.id,
      quantity: 100,
      variantId: "variant-1",
    })
    const targets = {
      productTargetById: new Map([["product-1", productTarget]]),
      variantTargetById: new Map([["variant-1", variantTarget]]),
    }
    const repair = buildLinkPlan(
      [
        {
          product_id: "product-1",
          product_measurement_id: "pm-old",
        },
        {
          deleted_at: new Date(),
          product_id: "product-1",
          product_measurement_id: "pm-target",
        },
      ],
      [],
      targets,
    )
    expect(repair.productLinksToDismiss).toHaveLength(1)
    expect(repair.productMeasurementIdsToRestore).toStrictEqual(["pm-target"])
    expect(repair.variantLinksToCreate).toHaveLength(1)

    const converged = buildLinkPlan(
      [
        {
          product_id: "product-1",
          product_measurement_id: "pm-target",
        },
      ],
      [
        {
          product_variant_id: "variant-1",
          product_variant_measurement_id: "vm-target",
        },
      ],
      targets,
    )
    expect(converged).toStrictEqual({
      productLinksToCreate: [],
      productLinksToDismiss: [],
      productMeasurementIdsToRestore: [],
      variantLinksToCreate: [],
      variantLinksToDismiss: [],
      variantMeasurementIdsToRestore: [],
    })
  })
})
