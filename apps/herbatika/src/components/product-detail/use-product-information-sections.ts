"use client"

import type { HttpTypes } from "@medusajs/types"
import type { ProductAttribute } from "@techsio/storefront-data/product-attributes/types"
import { useTranslations } from "next-intl"
import type {
  Product,
  ProductDetailContentSection,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types"
import { mergeBrandGpsrIntoProductContentSections } from "@/components/product-detail/utils/brand-gpsr"
import { resolveProductContentSections } from "@/components/product-detail/utils/metadata-parsers"
import {
  mergeProductBrandSection,
  mergeProductCodeIntoOtherSection,
  mergeProductParametersSection,
  type ProductFactLabels,
} from "@/components/product-detail/utils/product-fact-sections"
import {
  mergeWarrantyIntoProductContentSections,
  resolveProductWarranty,
} from "@/lib/storefront/product-attributes"
import type { Market } from "@/lib/url/types"

type UseProductInformationSectionsInput = Readonly<{
  brandPublicSlugsById?: Readonly<Record<string, string>>
  categories: readonly HttpTypes.StoreProductCategory[]
  locale: string
  market: Market
  offerState: ProductOfferState
  product: Product | null
  productAttributes: ProductAttribute[]
}>

/**
 * Builds the product information sections from product-level data only, so the
 * rendered section set is identical on every market. Localization applies to
 * the section titles and fact labels; catalog prose stays exact-locale.
 */
export const useProductInformationSections = ({
  brandPublicSlugsById = {},
  categories,
  locale,
  market,
  offerState,
  product,
  productAttributes,
}: UseProductInformationSectionsInput): ProductDetailContentSection[] => {
  const tCatalog = useTranslations("catalog")
  const otherSectionTitle = tCatalog("product_detail.sections.other")
  const labels: ProductFactLabels = {
    brandSectionTitle: tCatalog("product_detail.sections.brand"),
    brandVisitLabel: tCatalog("product_detail.brand.visit_all_products"),
    categoryLabel: tCatalog("product_detail.parameters.category"),
    codeLabel: tCatalog("product_detail.parameters.code"),
    compositionLabel: tCatalog("product_detail.sections.composition"),
    eanLabel: tCatalog("product_detail.parameters.ean"),
    inciLabel: tCatalog("product_detail.parameters.inci"),
    otherSectionTitle,
    parametersSectionTitle: tCatalog("product_detail.sections.parameters"),
    storageLabel: tCatalog("product_detail.parameters.storage"),
    volumeLabel: tCatalog("product_detail.parameters.volume"),
  }
  const contentSections = mergeBrandGpsrIntoProductContentSections(
    mergeWarrantyIntoProductContentSections(
      resolveProductContentSections(product, {
        composition: labels.compositionLabel,
        content: tCatalog("product_detail.sections.content"),
        description: tCatalog("product_detail.sections.description"),
        other: otherSectionTitle,
        usage: tCatalog("product_detail.sections.usage"),
        warning: tCatalog("product_detail.sections.warning"),
      }),
      resolveProductWarranty(productAttributes, locale),
      otherSectionTitle,
      tCatalog("product_detail.sections.warranty")
    ),
    product,
    otherSectionTitle,
    locale
  )

  return mergeProductCodeIntoOtherSection({
    labels,
    offerState,
    sections: mergeProductBrandSection({
      brandPublicSlugsById,
      labels,
      market,
      product,
      sections: mergeProductParametersSection({
        categories,
        labels,
        offerState,
        product,
        sections: contentSections,
      }),
    }),
  })
}
