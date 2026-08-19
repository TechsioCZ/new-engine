import type { MedusaStoreRequest } from "@medusajs/framework/http"
import type { IProductModuleService } from "@medusajs/framework/types"
import { Modules, ProductStatus } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  COLLECTION_URL_ASSIGNMENT_MARKETS,
  resolvePublishableKeySalesChannelId,
} from "../../../modules/storefront-url-assignment/contracts"
import { parseProductPublicationSnapshot } from "../../../modules/url-registry-outbox/product-publication-assignment"
import type { ProductPublicationAssignment } from "../../../modules/url-registry-outbox/types"
import {
  type CatalogMarket,
  type CatalogTranslationProof,
  readExactCatalogTranslation,
} from "../../../utils/catalog-translation"

export type PublishedProductCatalogSource = Readonly<{
  entityId: string
  marketCode: CatalogMarket
  publicSlug: string
  salesChannelId: string
  sourceVersion: string
  translation: CatalogTranslationProof
}>

export type PublishedProductCatalogSourceRead =
  | Readonly<{ kind: "found"; source: PublishedProductCatalogSource }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unavailable" }>

const MarketSchema = z.enum(COLLECTION_URL_ASSIGNMENT_MARKETS)

const isPublishedForChannel = (
  assignment: ProductPublicationAssignment | null,
  salesChannelId: string
): assignment is ProductPublicationAssignment =>
  assignment?.publicationStatus === "published" &&
  assignment.salesChannelId === salesChannelId

export const parseProductCatalogSourceMarket = (
  value: unknown
): CatalogMarket | null => {
  const result = MarketSchema.safeParse(value)
  return result.success ? result.data : null
}

export const readPublishedProductCatalogSource = async (
  request: MedusaStoreRequest,
  productId: string,
  market: CatalogMarket
): Promise<PublishedProductCatalogSourceRead> => {
  try {
    const salesChannelId = resolvePublishableKeySalesChannelId(
      request.publishable_key_context?.sales_channel_ids
    )
    const productService = request.scope.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    const products = await productService.listProducts(
      { id: productId, status: ProductStatus.PUBLISHED },
      {
        relations: ["sales_channels"],
        select: ["id", "metadata", "updated_at"],
        take: 2,
      }
    )
    if (products.length === 0) {
      return { kind: "missing" }
    }
    if (products.length !== 1) {
      return { kind: "unavailable" }
    }

    const snapshot = parseProductPublicationSnapshot(products[0])
    const assignment = snapshot.assignments[market]
    if (!isPublishedForChannel(assignment, salesChannelId)) {
      return { kind: "missing" }
    }
    const translation = await readExactCatalogTranslation({
      container: request.scope,
      entityId: productId,
      entityKind: "product",
      market,
    })
    if (translation.kind === "missing") {
      return { kind: "missing" }
    }
    if (translation.kind !== "found") {
      return { kind: "unavailable" }
    }

    return {
      kind: "found",
      source: {
        entityId: productId,
        marketCode: market,
        publicSlug: assignment.publicSlug,
        salesChannelId,
        sourceVersion: snapshot.sourceVersion,
        translation: translation.proof,
      },
    }
  } catch {
    return { kind: "unavailable" }
  }
}
