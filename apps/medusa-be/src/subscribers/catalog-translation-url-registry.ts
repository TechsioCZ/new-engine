import { createHash } from "node:crypto"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type {
  ITranslationModuleService,
  Query,
  TranslationDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  TranslationWorkflowEvents,
} from "@medusajs/framework/utils"
import { PRODUCT_CONTENT_MODULE } from "../modules/product-content"
import type ProductContentModuleService from "../modules/product-content/service"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { unpublishCatalogEntityAssignments } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import { parseProductPublicationSnapshot } from "../modules/url-registry-outbox/product-publication-assignment"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import {
  type CatalogMarket,
  readExactCatalogTranslation,
  resolveCatalogLocaleMarket,
  resolveCatalogTranslationEntityKind,
} from "../utils/catalog-translation"

type TranslationLifecycleEvent = Readonly<{ id: string }>

const TRANSLATION_EVENTS = [
  TranslationWorkflowEvents.CREATED,
  TranslationWorkflowEvents.UPDATED,
  TranslationWorkflowEvents.DELETED,
] as const

const invalidState = (message: string) =>
  new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)

const occurrenceTime = (eventName: string, translation: TranslationDTO) => {
  const candidate =
    eventName === TranslationWorkflowEvents.DELETED
      ? translation.deleted_at
      : translation.updated_at
  const parsed = new Date(candidate ?? translation.updated_at)
  if (Number.isNaN(parsed.getTime())) {
    throw invalidState("Catalog Translation mutation timestamp is invalid")
  }
  return parsed.toISOString()
}

const productTranslationEventId = (
  eventName: string,
  translation: TranslationDTO,
  occurredAt: string
) =>
  `sha256:${createHash("sha256")
    .update(
      JSON.stringify([
        "catalog-translation-invalidated",
        eventName,
        translation.id,
        occurredAt,
      ])
    )
    .digest("hex")}`

const productIsPublishedInMarket = async (
  container: SubscriberArgs["container"],
  productId: string,
  marketCode: CatalogMarket
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "updated_at", "sales_channels.id"],
    filters: { id: productId },
  })
  const product = data[0]
  if (data.length !== 1 || !product || product.id !== productId) {
    throw invalidState("Catalog product publication source is unavailable")
  }
  return (
    parseProductPublicationSnapshot(product).assignments[marketCode]
      ?.publicationStatus === "published"
  )
}

const enqueueProductTranslationInvalidation = async (input: {
  container: SubscriberArgs["container"]
  eventName: string
  marketCode: CatalogMarket
  outboxService: UrlRegistryOutboxModuleService
  productId: string
  translation: TranslationDTO
}) => {
  if (
    !(await productIsPublishedInMarket(
      input.container,
      input.productId,
      input.marketCode
    ))
  ) {
    return
  }
  const occurredAt = occurrenceTime(input.eventName, input.translation)
  await input.outboxService.enqueueProductLifecycleEvent({
    affectedMarketCodes: [input.marketCode],
    eventId: productTranslationEventId(
      input.eventName,
      input.translation,
      occurredAt
    ),
    marketAssignments: [
      {
        assignment: null,
        marketCode: input.marketCode,
        sourceVersion: `translation:${input.translation.id}:${occurredAt}`,
      },
    ],
    occurredAt,
    productId: input.productId,
    reason: "translation-invalidated",
  })
}

const productContentOwner = async (
  container: SubscriberArgs["container"],
  translation: TranslationDTO
) => {
  const contentService = container.resolve<ProductContentModuleService>(
    PRODUCT_CONTENT_MODULE
  )
  const contents = await contentService.listProductContents(
    { id: translation.reference_id },
    {
      select: ["id", "product_id", "deleted_at"],
      take: 2,
      withDeleted: true,
    }
  )
  const content = contents[0]
  if (contents.length !== 1 || !content) {
    throw invalidState("Product content Translation owner is unavailable")
  }
  return content
}

export default async function catalogTranslationUrlRegistryHandler({
  event,
  container,
}: SubscriberArgs<TranslationLifecycleEvent>) {
  if (
    !(
      TRANSLATION_EVENTS.includes(
        event.name as (typeof TRANSLATION_EVENTS)[number]
      ) &&
      event.data &&
      typeof event.data === "object"
    ) ||
    Object.keys(event.data).length !== 1 ||
    typeof event.data.id !== "string" ||
    event.data.id.length === 0
  ) {
    throw invalidState("Catalog Translation lifecycle event is invalid")
  }

  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const translations = await translationService.listTranslations(
    { id: event.data.id },
    {
      select: [
        "id",
        "reference",
        "reference_id",
        "locale_code",
        "translations",
        "created_at",
        "updated_at",
        "deleted_at",
      ],
      take: 2,
      withDeleted: true,
    }
  )
  const translation = translations[0]
  if (translations.length !== 1 || !translation) {
    throw invalidState("Catalog Translation lifecycle source is unavailable")
  }
  const marketCode = resolveCatalogLocaleMarket(translation.locale_code)
  if (!marketCode) {
    return
  }

  if (translation.reference === "product_content") {
    const content = await productContentOwner(container, translation)
    const exactProductTranslation = await readExactCatalogTranslation({
      container,
      entityId: content.product_id,
      entityKind: "product",
      market: marketCode,
    })
    if (exactProductTranslation.kind === "found") {
      return
    }
    if (exactProductTranslation.kind === "unavailable") {
      throw invalidState("Catalog Translation state is unavailable")
    }
    const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
      URL_REGISTRY_OUTBOX_MODULE
    )
    await enqueueProductTranslationInvalidation({
      container,
      eventName: event.name,
      marketCode,
      outboxService,
      productId: content.product_id,
      translation,
    })
    return
  }

  const entityKind = resolveCatalogTranslationEntityKind(translation.reference)
  if (!entityKind) {
    return
  }

  const exactTranslation = await readExactCatalogTranslation({
    container,
    entityId: translation.reference_id,
    entityKind,
    market: marketCode,
  })
  if (exactTranslation.kind === "found") {
    return
  }
  if (exactTranslation.kind === "unavailable") {
    throw invalidState("Catalog Translation state is unavailable")
  }

  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  if (entityKind === "product") {
    await enqueueProductTranslationInvalidation({
      container,
      eventName: event.name,
      marketCode,
      outboxService,
      productId: translation.reference_id,
      translation,
    })
    return
  }

  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  await unpublishCatalogEntityAssignments({
    assignmentService,
    entityId: translation.reference_id,
    entityKind,
    marketCode,
    outboxService,
  })
}

export const config: SubscriberConfig = {
  event: [...TRANSLATION_EVENTS],
}
