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
import { wrapProductsWithTaxPrices } from "@medusajs/medusa/api/store/products/helpers"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"
import { isRecord } from "@techsio/std/object"

import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
} from "../../../utils/measurement-units"
import { normalizeProductSalesChannelFilter } from "../../utils/product-filters"

type InventoryDecoratableVariant = HttpTypes.StoreProductVariant & {
  manage_inventory?: boolean
}

interface QueryMetadata {
  count?: number
  skip?: number
  take?: number
}

const storeProductSchema = z
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
  storeProductSchema.safeParse(value).success

const isOptionalNumber = (value: unknown) =>
  value === undefined || typeof value === "number"

const isQueryMetadata = (value: unknown): value is QueryMetadata => {
  if (!isRecord(value)) {
    return false
  }

  const { count, skip, take } = value
  return (
    isOptionalNumber(count) && isOptionalNumber(skip) && isOptionalNumber(take)
  )
}

const parseProductsGraphResponse = (value: unknown) => {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product query returned an invalid response.",
    )
  }

  const { data: products, metadata } = value
  if (!Array.isArray(products)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product query returned an invalid response.",
    )
  }
  if (!products.every(isStoreProduct)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product query returned invalid store product data.",
    )
  }

  if (metadata !== undefined && !isQueryMetadata(metadata)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product query returned invalid pagination metadata.",
    )
  }

  return { metadata, products }
}

const isInventoryDecoratableVariant = (
  variant: HttpTypes.StoreProductVariant,
): variant is InventoryDecoratableVariant => variant.manage_inventory !== null

const getHandler = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const context: QueryContextType = {}
  const fields = req.queryConfig.fields ?? []
  const measurementDecorationOptions = getMeasurementDecorationOptions(fields)
  const withInventoryQuantity = fields.some((field) =>
    field.includes("variants.inventory_quantity"),
  )

  const productFieldsBeforeDecoration = withInventoryQuantity
    ? fields.filter((field) => !field.includes("variants.inventory_quantity"))
    : fields
  const productFields = getMeasurementDecorationQueryFields(
    productFieldsBeforeDecoration,
    measurementDecorationOptions,
  )

  if (req.pricingContext !== undefined && req.pricingContext !== null) {
    context["variants"] = {
      calculated_price: QueryContext(req.pricingContext),
    }
  }

  const rawProductsResult: unknown = await query.graph(
    {
      context,
      entity: "product",
      fields: productFields,
      filters: await normalizeProductSalesChannelFilter(
        query,
        remoteQuery,
        req.filterableFields,
      ),
      pagination: req.queryConfig.pagination,
    },
    {
      cache: { enable: true },
      ...(req.locale === undefined ? {} : { locale: req.locale }),
    },
  )
  const { metadata, products } = parseProductsGraphResponse(rawProductsResult)

  if (withInventoryQuantity) {
    const variants: InventoryDecoratableVariant[] = []
    for (const product of products) {
      for (const variant of product.variants ?? []) {
        if (isInventoryDecoratableVariant(variant)) {
          variants.push(variant)
        }
      }
    }

    await wrapVariantsWithInventoryQuantityForSalesChannel(req, variants)
  }

  await wrapProductsWithTaxPrices(req, products)
  await decorateProductsWithMeasurements(
    req.scope,
    products,
    measurementDecorationOptions,
  )

  res.json({
    count: metadata?.count ?? products.length,
    limit: metadata?.take,
    offset: metadata?.skip,
    products,
  })
}

export { getHandler as GET }
