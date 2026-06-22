import type {
  Context,
  LinkDefinition,
  MedusaContainer,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createLinksWorkflow,
  dismissLinksWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductBrandLink } from "../../../links/product-brand"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import type { BrandAttributeInput } from "../types"

type BrandAttributeRecord = {
  id: string
  value: string
  attributeType?: {
    name: string
  }
}

type BrandSnapshot = {
  id: string
  title: string
  handle: string
  attributes: BrandAttributeInput[]
  gpsrContactEmail?: string | null
  gpsrEuropeanResellerContactEmail?: string | null
  gpsrEuropeanResellerManufacturingCompanyName?: string | null
  gpsrEuropeanResellerPostalAddress?: string | null
  gpsrManufacturedOutsideEu?: boolean
  gpsrManufacturingCompanyName?: string | null
  gpsrPostalAddress?: string | null
}

type BrandSnapshotRecord = {
  id: string
  title: string
  handle: string
  attributes: Array<
    BrandAttributeRecord & {
      attributeType: {
        id?: string
        name: string
      }
    }
  >
  gpsrContactEmail?: string | null
  gpsrEuropeanResellerContactEmail?: string | null
  gpsrEuropeanResellerManufacturingCompanyName?: string | null
  gpsrEuropeanResellerPostalAddress?: string | null
  gpsrManufacturedOutsideEu?: boolean
  gpsrManufacturingCompanyName?: string | null
  gpsrPostalAddress?: string | null
}

type ProductBrandLinkRecord = {
  product_id?: string
  brand_id?: string
}

type BrandIdRecord = {
  id: string
}

type BrandServiceWithTransaction = BrandModuleService & {
  baseRepository_: {
    transaction: <T>(
      task: (transactionManager: unknown) => Promise<T>
    ) => Promise<T>
  }
}

export const getBrandService = (container: MedusaContainer) =>
  container.resolve<BrandModuleService>(BRAND_MODULE)

export const withBrandTransaction = <T>(
  service: BrandModuleService,
  task: (sharedContext: Context) => Promise<T>
) =>
  (service as BrandServiceWithTransaction).baseRepository_.transaction(
    (transactionManager) => task({ transactionManager } as Context)
  )

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isBrandSnapshotRecord = (
  brand: unknown
): brand is BrandSnapshotRecord => {
  if (!isRecord(brand)) {
    return false
  }

  if (
    typeof brand.id !== "string" ||
    typeof brand.title !== "string" ||
    typeof brand.handle !== "string" ||
    !Array.isArray(brand.attributes) ||
    !(
      brand.gpsrManufacturedOutsideEu === undefined ||
      typeof brand.gpsrManufacturedOutsideEu === "boolean"
    )
  ) {
    return false
  }

  return brand.attributes.every((attribute) => {
    if (!isRecord(attribute) || typeof attribute.value !== "string") {
      return false
    }

    return (
      isRecord(attribute.attributeType) &&
      typeof attribute.attributeType.name === "string"
    )
  })
}

const assertBrandSnapshotRecord: (
  brand: unknown,
  brandId: string
) => asserts brand is BrandSnapshotRecord = (
  brand: unknown,
  brandId: string
) => {
  if (isBrandSnapshotRecord(brand)) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Brand "${brandId}" was retrieved without the fields required for a workflow snapshot`
  )
}

export const snapshotBrand = async (
  service: BrandModuleService,
  brandId: string,
  sharedContext: Context = {}
): Promise<BrandSnapshot> => {
  const brand = await service.retrieveBrand(
    brandId,
    {
      relations: ["attributes", "attributes.attributeType"],
    },
    sharedContext
  )

  assertBrandSnapshotRecord(brand, brandId)

  return {
    id: brand.id,
    title: brand.title,
    handle: brand.handle,
    attributes: brand.attributes.map((attribute) => ({
      name: attribute.attributeType.name,
      value: attribute.value,
    })),
    gpsrContactEmail: brand.gpsrContactEmail ?? null,
    gpsrEuropeanResellerContactEmail:
      brand.gpsrEuropeanResellerContactEmail ?? null,
    gpsrEuropeanResellerManufacturingCompanyName:
      brand.gpsrEuropeanResellerManufacturingCompanyName ?? null,
    gpsrEuropeanResellerPostalAddress:
      brand.gpsrEuropeanResellerPostalAddress ?? null,
    gpsrManufacturedOutsideEu: brand.gpsrManufacturedOutsideEu ?? false,
    gpsrManufacturingCompanyName: brand.gpsrManufacturingCompanyName ?? null,
    gpsrPostalAddress: brand.gpsrPostalAddress ?? null,
  }
}

const pickBrandWriteFields = (brand: {
  handle?: string
  title?: string
  gpsrContactEmail?: string | null
  gpsrEuropeanResellerContactEmail?: string | null
  gpsrEuropeanResellerManufacturingCompanyName?: string | null
  gpsrEuropeanResellerPostalAddress?: string | null
  gpsrManufacturedOutsideEu?: boolean
  gpsrManufacturingCompanyName?: string | null
  gpsrPostalAddress?: string | null
}) => ({
  ...(brand.handle !== undefined ? { handle: brand.handle } : {}),
  ...(brand.title !== undefined ? { title: brand.title } : {}),
  ...(brand.gpsrContactEmail !== undefined
    ? { gpsrContactEmail: brand.gpsrContactEmail }
    : {}),
  ...(brand.gpsrEuropeanResellerContactEmail !== undefined
    ? {
        gpsrEuropeanResellerContactEmail:
          brand.gpsrEuropeanResellerContactEmail,
      }
    : {}),
  ...(brand.gpsrEuropeanResellerManufacturingCompanyName !== undefined
    ? {
        gpsrEuropeanResellerManufacturingCompanyName:
          brand.gpsrEuropeanResellerManufacturingCompanyName,
      }
    : {}),
  ...(brand.gpsrEuropeanResellerPostalAddress !== undefined
    ? {
        gpsrEuropeanResellerPostalAddress:
          brand.gpsrEuropeanResellerPostalAddress,
      }
    : {}),
  ...(brand.gpsrManufacturedOutsideEu !== undefined
    ? { gpsrManufacturedOutsideEu: brand.gpsrManufacturedOutsideEu }
    : {}),
  ...(brand.gpsrManufacturingCompanyName !== undefined
    ? { gpsrManufacturingCompanyName: brand.gpsrManufacturingCompanyName }
    : {}),
  ...(brand.gpsrPostalAddress !== undefined
    ? { gpsrPostalAddress: brand.gpsrPostalAddress }
    : {}),
})

export const setBrandAttributes = async (
  service: BrandModuleService,
  brandId: string,
  inputAttributes: BrandAttributeInput[] = [],
  sharedContext: Context = {}
) => service.setBrandAttributes(brandId, inputAttributes, sharedContext)

export const buildBrandWriteInput = pickBrandWriteFields

export const brandProductLink = (productId: string, brandId: string) => ({
  [Modules.PRODUCT]: {
    product_id: productId,
  },
  [BRAND_MODULE]: {
    brand_id: brandId,
  },
})

export const getProductBrandLockKeys = (productIds: string[]) =>
  [...new Set(productIds)]
    .sort()
    .map((productId) => `product-brand:${productId}`)

export const getBrandProductsLockKeys = (
  brandId: string,
  productIds: string[]
) => [`brand-products:${brandId}`, ...getProductBrandLockKeys(productIds)]

export const replaceProductBrandLinks = async (
  container: MedusaContainer,
  currentIds: string[],
  nextIds: string[],
  toLinkDefinition: (id: string) => LinkDefinition
) => {
  const { add, remove } = diffIds(currentIds, nextIds)
  const linksToDismiss = remove.map(toLinkDefinition)
  const linksToCreate = add.map(toLinkDefinition)

  if (linksToDismiss.length) {
    await dismissLinksWorkflow(container).run({
      input: linksToDismiss,
    })
  }

  if (linksToCreate.length) {
    await createLinksWorkflow(container).run({
      input: linksToCreate,
    })
  }

  return { add, remove }
}

export const dismissProductBrandLinks = async (
  container: MedusaContainer,
  links: Array<{ brand_id: string; product_id: string }>
) => {
  if (!links.length) {
    return
  }

  await dismissLinksWorkflow(container).run({
    input: links.map((link) =>
      brandProductLink(link.product_id, link.brand_id)
    ),
  })
}

export const getCurrentProductBrandIds = async (
  container: MedusaContainer,
  productId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["brand_id"],
    filters: {
      product_id: productId,
    },
  })

  return (data as ProductBrandLinkRecord[])
    .map((link) => link.brand_id)
    .filter((brandId): brandId is string => !!brandId)
}

export const getProductBrandIdsToReplace = (
  currentIds: string[],
  activeBrandIds: Set<string>,
  nextIds: string[]
) =>
  nextIds.length
    ? currentIds
    : currentIds.filter((brandId) => activeBrandIds.has(brandId))

export const getCurrentProductBrandLinks = async (
  container: MedusaContainer,
  productIds: string[]
) => {
  const ids = [...new Set(productIds)]

  if (!ids.length) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id", "brand_id"],
    filters: {
      product_id: { $in: ids },
    },
  })

  return (data as ProductBrandLinkRecord[]).filter(
    (link): link is Required<ProductBrandLinkRecord> =>
      !!(link.product_id && link.brand_id)
  )
}

export const getActiveBrandIds = async (
  container: MedusaContainer,
  brandIds: string[]
) => {
  const ids = [...new Set(brandIds)]

  if (!ids.length) {
    return new Set<string>()
  }

  const brands = await getBrandService(container).listBrands(
    {
      id: { $in: ids },
    },
    {
      select: ["id"],
      withDeleted: false,
    }
  )

  return new Set((brands as BrandIdRecord[]).map((brand) => brand.id))
}

export const getCurrentBrandProductIds = async (
  container: MedusaContainer,
  brandId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id"],
    filters: {
      brand_id: brandId,
    },
  })

  return (data as ProductBrandLinkRecord[])
    .map((link) => link.product_id)
    .filter((productId): productId is string => !!productId)
}

export const diffIds = (currentIds: string[], nextIds: string[]) => {
  const current = new Set(currentIds)
  const next = new Set(nextIds)

  return {
    add: [...next].filter((id) => !current.has(id)),
    remove: [...current].filter((id) => !next.has(id)),
  }
}

export const asArray = <T>(value: T | T[]) =>
  Array.isArray(value) ? value : [value]
