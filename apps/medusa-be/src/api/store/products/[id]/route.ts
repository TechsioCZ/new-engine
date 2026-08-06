import type { MedusaResponse } from "@medusajs/framework/http"
import type {
  HttpTypes,
  Query,
  QueryContextType,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  QueryContext,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  filterOutInternalProductCategories,
  wrapProductsWithTaxPrices,
} from "@medusajs/medusa/api/store/products/helpers"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"

import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
} from "../../../../utils/measurement-units"

type InventoryDecoratableVariant = HttpTypes.StoreProductVariant & {
  manage_inventory?: boolean
}

const StoreProductSchema = z
  .object({
    created_at: z.string().nullable(),
    deleted_at: z.string().nullable(),
    description: z.string().nullable(),
    discountable: z.boolean(),
    external_id: z.string().nullable(),
    handle: z.string(),
    height: z.number().nullable(),
    hs_code: z.string().nullable(),
    id: z.string(),
    images: z.array(z.record(z.string(), z.unknown())).nullable(),
    is_giftcard: z.boolean(),
    length: z.number().nullable(),
    material: z.string().nullable(),
    mid_code: z.string().nullable(),
    options: z.array(z.record(z.string(), z.unknown())).nullable(),
    origin_country: z.string().nullable(),
    status: z.enum(["draft", "proposed", "published", "rejected"]),
    subtitle: z.string().nullable(),
    thumbnail: z.string().nullable(),
    title: z.string(),
    type_id: z.string().nullable(),
    updated_at: z.string().nullable(),
    variants: z
      .array(
        z
          .object({
            id: z.string(),
            manage_inventory: z.boolean().nullable(),
          })
          .loose(),
      )
      .nullable(),
    weight: z.number().nullable(),
    width: z.number().nullable(),
  })
  .loose()

const isStoreProduct = (value: unknown): value is HttpTypes.StoreProduct =>
  StoreProductSchema.safeParse(value).success

const INCLUDED_FIELD_PREFIX_PATTERN = /^[+*]/u

const isInventoryDecoratableVariant = (
  variant: HttpTypes.StoreProductVariant,
): variant is InventoryDecoratableVariant => variant.manage_inventory !== null

const normalizeIncludedField = (field: string) =>
  field.replace(INCLUDED_FIELD_PREFIX_PATTERN, "")

const includesCategoryField = (fields: string[]) =>
  fields.some((field) => {
    const normalizedField = normalizeIncludedField(field)

    return (
      normalizedField === "categories" ||
      normalizedField.startsWith("categories.")
    )
  })

const includesCategoryVisibilityField = (fields: string[]) =>
  fields.some(
    (field) => normalizeIncludedField(field) === "categories.is_internal",
  )

const get = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse<HttpTypes.StoreProductResponse>,
) => {
  const requestedFields = req.queryConfig.fields
  const measurementDecorationOptions =
    getMeasurementDecorationOptions(requestedFields)
  const withInventoryQuantity = requestedFields.some((field) =>
    field.includes("variants.inventory_quantity"),
  )
  const productFieldsBeforeDecoration = withInventoryQuantity
    ? requestedFields.filter(
        (field) => !field.includes("variants.inventory_quantity"),
      )
    : requestedFields

  const filters: object = {
    id: req.params["id"],
    ...req.filterableFields,
  }

  const context: QueryContextType =
    req.pricingContext === undefined
      ? {}
      : { variants: { calculated_price: QueryContext(req.pricingContext) } }

  const includesCategoriesField = includesCategoryField(
    productFieldsBeforeDecoration,
  )
  const productFieldsWithCategoryVisibility =
    includesCategoriesField &&
    !includesCategoryVisibilityField(productFieldsBeforeDecoration)
      ? [...productFieldsBeforeDecoration, "categories.is_internal"]
      : productFieldsBeforeDecoration

  const productFields = getMeasurementDecorationQueryFields(
    productFieldsWithCategoryVisibility,
    measurementDecorationOptions,
  )

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph(
    {
      context,
      entity: "product",
      fields: productFields,
      filters,
    },
    req.locale === undefined ? {} : { locale: req.locale },
  )
  const product: unknown = products.at(0)

  if (!isStoreProduct(product)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${req.params["id"]} was not found`,
    )
  }

  if (withInventoryQuantity) {
    const variants = (product.variants ?? []).filter(
      isInventoryDecoratableVariant,
    )

    await wrapVariantsWithInventoryQuantityForSalesChannel(req, variants)
  }

  if (includesCategoriesField) {
    filterOutInternalProductCategories([product])
  }

  await wrapProductsWithTaxPrices(req, [product])
  await decorateProductsWithMeasurements(
    req.scope,
    [product],
    measurementDecorationOptions,
  )

  res.json({ product })
}

export { get as GET }
