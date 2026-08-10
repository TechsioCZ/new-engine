import type { MedusaStoreRequest } from "@medusajs/framework/http"
import type {
  ITaxModuleService,
  TaxCalculationContext,
} from "@medusajs/framework/types"
import {
  applyTranslationsToTaxLines,
  calculateAmountsWithTax,
  FeatureFlag,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"
import translationFeatureFlag from "@medusajs/medusa/feature-flags/translation"

import type {
  CalculatedPriceProjection,
  StoreProductProjection,
  StoreProductVariantProjection,
} from "./product-graph-validation"

type RequiredCalculatedPriceField =
  | "calculated_amount"
  | "currency_code"
  | "is_calculated_price_tax_inclusive"
  | "is_original_price_tax_inclusive"
  | "original_amount"

type CompleteCalculatedPriceProjection = Omit<
  CalculatedPriceProjection,
  RequiredCalculatedPriceField
> & {
  calculated_amount: number
  currency_code: string
  is_calculated_price_tax_inclusive: boolean
  is_original_price_tax_inclusive: boolean
  original_amount: number
}

type TaxDecoratableVariantProjection = Omit<
  StoreProductVariantProjection,
  "calculated_price" | "id"
> & {
  calculated_price: CompleteCalculatedPriceProjection
  id: string
}

interface InventoryVariantInput {
  id: string
  inventory_quantity?: null | number
  manage_inventory?: boolean
}

interface InventoryVariantTarget {
  input: InventoryVariantInput
  source: StoreProductVariantProjection
}

interface TaxVariantContext {
  productId: string
  productTypeId: null | string | undefined
  variant: TaxDecoratableVariantProjection
}

const isCompleteCalculatedPriceProjection = (
  value: CalculatedPriceProjection | null | undefined,
): value is CompleteCalculatedPriceProjection => {
  if (value === null || value === undefined) {
    return false
  }

  const amountsAreValid =
    typeof value.calculated_amount === "number" &&
    typeof value.original_amount === "number"
  const taxFlagsAreValid =
    typeof value.is_calculated_price_tax_inclusive === "boolean" &&
    typeof value.is_original_price_tax_inclusive === "boolean"

  return (
    amountsAreValid &&
    taxFlagsAreValid &&
    typeof value.currency_code === "string"
  )
}

const isTaxDecoratableVariantProjection = (
  variant: StoreProductVariantProjection,
): variant is TaxDecoratableVariantProjection =>
  typeof variant.id === "string" &&
  isCompleteCalculatedPriceProjection(variant.calculated_price)

const collectTaxVariantContexts = (
  products: StoreProductProjection[],
): TaxVariantContext[] => {
  const contexts: TaxVariantContext[] = []

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (
        variant.calculated_price === null ||
        variant.calculated_price === undefined
      ) {
        continue
      }
      if (
        typeof product.id !== "string" ||
        !isTaxDecoratableVariantProjection(variant)
      ) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Product query returned data that cannot be decorated with tax prices.",
        )
      }

      contexts.push({
        productId: product.id,
        productTypeId: product.type_id,
        variant,
      })
    }
  }

  return contexts
}

interface ProductProjectionTaxItem {
  currency_code: string
  id: string
  product_id: string
  product_type_id?: null | string
  quantity: number
  unit_price: number
}

interface ProductProjectionTaxLine {
  line_item_id: string
  rate: number
}

interface ProductProjectionTaxService {
  getTaxLines: (
    items: ProductProjectionTaxItem[],
    calculationContext: TaxCalculationContext,
  ) => ReturnType<ITaxModuleService["getTaxLines"]>
}

export interface ProductProjectionTaxDependencies {
  automaticTaxes: boolean
  getTaxLines: (
    items: ProductProjectionTaxItem[],
  ) => Promise<ProductProjectionTaxLine[]>
}

export const decorateProductProjectionsWithAutomaticTax = async (
  products: StoreProductProjection[],
  dependencies: ProductProjectionTaxDependencies,
) => {
  if (!dependencies.automaticTaxes) {
    return
  }

  const variantContexts = collectTaxVariantContexts(products)
  const taxLines = await dependencies.getTaxLines(
    variantContexts.map(({ productId, productTypeId, variant }) => ({
      currency_code: variant.calculated_price.currency_code,
      id: variant.id,
      product_id: productId,
      ...(productTypeId === undefined
        ? {}
        : { product_type_id: productTypeId }),
      quantity: 1,
      unit_price: variant.calculated_price.calculated_amount,
    })),
  )
  const taxRatesByVariantId = new Map<string, ProductProjectionTaxLine[]>()
  for (const taxLine of taxLines) {
    const variantTaxLines = taxRatesByVariantId.get(taxLine.line_item_id) ?? []
    variantTaxLines.push(taxLine)
    taxRatesByVariantId.set(taxLine.line_item_id, variantTaxLines)
  }

  for (const { variant } of variantContexts) {
    const taxRates = taxRatesByVariantId.get(variant.id) ?? []
    const { priceWithTax, priceWithoutTax } = calculateAmountsWithTax({
      amount: variant.calculated_price.calculated_amount,
      includesTax: variant.calculated_price.is_calculated_price_tax_inclusive,
      taxLines: taxRates,
    })
    variant.calculated_price["calculated_amount_with_tax"] = priceWithTax
    variant.calculated_price["calculated_amount_without_tax"] = priceWithoutTax

    const {
      priceWithTax: originalPriceWithTax,
      priceWithoutTax: originalPriceWithoutTax,
    } = calculateAmountsWithTax({
      amount: variant.calculated_price.original_amount,
      includesTax: variant.calculated_price.is_original_price_tax_inclusive,
      taxLines: taxRates,
    })
    variant.calculated_price["original_amount_with_tax"] = originalPriceWithTax
    variant.calculated_price["original_amount_without_tax"] =
      originalPriceWithoutTax
  }
}

const toProductProjectionTaxLines = (
  taxLines: { line_item_id: string; rate: unknown }[],
): ProductProjectionTaxLine[] =>
  taxLines.map((taxLine) => {
    if (typeof taxLine.rate !== "number") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Tax service returned a product tax line with an invalid rate.",
      )
    }

    return {
      line_item_id: taxLine.line_item_id,
      rate: taxLine.rate,
    }
  })

export const decorateProductProjectionsWithTaxPrices = async <T>(
  req: RequestWithContext<T>,
  products: StoreProductProjection[],
) => {
  if (
    !req.taxContext?.taxInclusivityContext ||
    !req.taxContext.taxLineContext
  ) {
    return
  }

  const { taxLineContext } = req.taxContext
  const { automaticTaxes } = req.taxContext.taxInclusivityContext
  if (!automaticTaxes) {
    return
  }

  // Medusa's product helper forwards nullable product type ids even though
  // TaxableItemDTO currently declares this field as string-only.
  const taxService = req.scope.resolve<ProductProjectionTaxService>(Modules.TAX)
  await decorateProductProjectionsWithAutomaticTax(products, {
    automaticTaxes,
    getTaxLines: async (items) => {
      const taxLines = await taxService.getTaxLines(items, taxLineContext)
      const itemTaxLines = taxLines.filter(
        (taxLine): taxLine is typeof taxLine & { line_item_id: string } =>
          "line_item_id" in taxLine && typeof taxLine.line_item_id === "string",
      )
      if (itemTaxLines.length !== taxLines.length) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Tax service returned invalid tax lines for product variants.",
        )
      }

      const localizedTaxLines = FeatureFlag.isFeatureEnabled(
        translationFeatureFlag.key,
      )
        ? await applyTranslationsToTaxLines(itemTaxLines, req.locale, req.scope)
        : itemTaxLines
      const localizedItemTaxLines = localizedTaxLines.filter(
        (taxLine): taxLine is typeof taxLine & { line_item_id: string } =>
          "line_item_id" in taxLine && typeof taxLine.line_item_id === "string",
      )
      if (localizedItemTaxLines.length !== localizedTaxLines.length) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Tax translation returned invalid tax lines for product variants.",
        )
      }

      return toProductProjectionTaxLines(localizedItemTaxLines)
    },
  })
}

const collectInventoryVariantTargets = (
  products: StoreProductProjection[],
): InventoryVariantTarget[] => {
  const targets: InventoryVariantTarget[] = []

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (variant.manage_inventory === null) {
        continue
      }
      if (typeof variant.id !== "string") {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Product query returned a variant without an id for inventory decoration.",
        )
      }

      targets.push({
        input: {
          id: variant.id,
          ...(typeof variant.manage_inventory === "boolean"
            ? { manage_inventory: variant.manage_inventory }
            : {}),
        },
        source: variant,
      })
    }
  }

  return targets
}

export const decorateInventoryQuantityForProductProjections = async (
  req: MedusaStoreRequest,
  products: StoreProductProjection[],
) => {
  const targets = collectInventoryVariantTargets(products)
  await wrapVariantsWithInventoryQuantityForSalesChannel(
    req,
    targets.map(({ input }) => input),
  )

  for (const { input, source } of targets) {
    if (input.inventory_quantity !== undefined) {
      source.inventory_quantity = input.inventory_quantity
    }
  }
}

export const filterOutInternalProductCategoryProjections = (
  products: StoreProductProjection[],
) => {
  for (const product of products) {
    if (product.categories === null || product.categories === undefined) {
      continue
    }

    for (const category of product.categories) {
      if (typeof category.is_internal !== "boolean") {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Product query returned a category without visibility data.",
        )
      }
    }

    product.categories = product.categories.filter(
      (category) => category.is_internal === false,
    )
  }
}
