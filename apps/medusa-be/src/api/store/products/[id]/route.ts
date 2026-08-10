import type { MedusaResponse } from "@medusajs/framework/http"
import type {
  HttpTypes,
  Query,
  QueryContextType,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"

import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
} from "../../../../utils/measurement-units"
import type { StoreProductProjection } from "../product-graph-validation"
import { parseStoreProductDetailGraphResponse } from "../product-graph-validation"
import {
  decorateInventoryQuantityForProductProjections,
  decorateProductProjectionsWithTaxPrices,
  filterOutInternalProductCategoryProjections,
} from "../product-projection-decorators"

const INCLUDED_FIELD_PREFIX_PATTERN = /^[+*]/u

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
  res: MedusaResponse<{ product: StoreProductProjection }>,
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

  const rawProductResult: unknown = await query.graph(
    {
      context,
      entity: "product",
      fields: productFields,
      filters,
    },
    req.locale === undefined ? {} : { locale: req.locale },
  )
  const product = parseStoreProductDetailGraphResponse(
    rawProductResult,
    req.params["id"],
  )

  if (withInventoryQuantity) {
    await decorateInventoryQuantityForProductProjections(req, [product])
  }

  if (includesCategoriesField) {
    filterOutInternalProductCategoryProjections([product])
  }

  await decorateProductProjectionsWithTaxPrices(req, [product])
  await decorateProductsWithMeasurements(
    req.scope,
    [product],
    measurementDecorationOptions,
  )

  res.json({ product })
}

export { get as GET }
