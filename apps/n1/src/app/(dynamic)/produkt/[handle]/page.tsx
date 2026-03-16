"use client"

import { HeurekaProduct } from "@techsio/analytics/heureka"
import { Link } from "@techsio/ui-kit/atoms/link"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { Heading } from "@/components/heading"
import { Gallery } from "@/components/organisms/gallery"
import { ProductInfoPanel } from "@/components/product-detail/product-info-panel"
import { ProductSizes } from "@/components/product-detail/product-sizes"
import { ProductTable } from "@/components/product-detail/product-table"
import { ProductTabs } from "@/components/product-detail/product-tabs"
import { RelatedProducts } from "@/components/product-detail/related-products"
import { useSuspenseProduct } from "@/hooks/use-product"
import { CATEGORY_MAP_BY_ID } from "@/lib/constants"
import { useAnalytics } from "@/providers/analytics-provider"
import {
  buildBreadcrumbs,
  buildProductBreadcrumbs,
} from "@/utils/helpers/build-breadcrumb"
import { selectVariant } from "@/utils/select-variant"
import { transformProductDetail } from "@/utils/transform/transform-product"

export default function ProductPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const handle = params.handle as string
  const variantParam = searchParams.get("variant")

  const { product: rawProduct } = useSuspenseProduct({ handle })
  const analytics = useAnalytics()

  // Track which variant we've already tracked to prevent duplicates
  const trackedVariantId = useRef<string | null>(null)

  const detail = rawProduct ? transformProductDetail(rawProduct) : null
  const selectedVariant = selectVariant(detail?.variants, variantParam)

  const title = selectedVariant
    ? `${detail?.title} - ${selectedVariant.title}`
    : detail?.title
  const quantity = selectedVariant?.inventory_quantity ?? 0

  // Unified analytics - ViewContent tracking (sends to Meta, Google, Leadhub)
  useEffect(() => {
    if (!(detail && selectedVariant)) {
      return
    }
    if (trackedVariantId.current === selectedVariant.id) {
      return
    }

    trackedVariantId.current = selectedVariant.id

    analytics.trackViewContent({
      productId: selectedVariant.id,
      productName: detail.title,
      value: selectedVariant.calculated_price?.calculated_amount_with_tax ?? 0,
      currency: (
        selectedVariant.calculated_price?.currency_code ?? "CZK"
      ).toUpperCase(),
      category: rawProduct?.categories?.[0]?.name,
    })
  }, [
    detail?.id,
    selectedVariant?.id,
    analytics,
    rawProduct?.categories,
    detail,
    selectedVariant?.calculated_price?.calculated_amount_with_tax,
    selectedVariant,
  ])

  if (!(rawProduct && detail)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-fg-secondary">Produkt nebyl nalezen</p>
      </div>
    )
  }

  const breadcrumbPath = buildProductBreadcrumbs(
    rawProduct.categories?.[0]?.id,
    CATEGORY_MAP_BY_ID,
    rawProduct.title,
    rawProduct.handle
  )

  const breadcrumbPathMobile = buildBreadcrumbs(
    rawProduct.categories?.[0]?.id,
    CATEGORY_MAP_BY_ID
  )

  const productTableRows = [
    {
      key: "kód produktu",
      value: detail.type_id,
    },
    {
      key: "hmotnost",
      value: detail.weight,
    },
    {
      key: "materiál",
      value: detail.material,
    },
    {
      key: "distributor",
      value: detail.producer?.title,
    },
    {
      key: "velikost",
      value: selectedVariant?.title,
    },
  ]

  const tabsData = [
    {
      value: "tab1",
      label: "produktové parametry",
      headline: "produktové parametry",
      content: <ProductTable rows={productTableRows} />,
    },
    {
      value: "tab2",
      label: "tabulka velikostí",
      headline: "tabulka velikostí",
      content: <ProductSizes attributes={detail.producer?.attributes} />,
    },
  ]

  return (
    <div className="container mx-auto p-400">
      <HeurekaProduct country="cz" />

      <div className="grid grid-cols-1 gap-700 md:grid-cols-[auto_1fr]">
        <header className="col-span-1 space-y-400 md:col-span-2">
          <Breadcrumb
            className="mb-400 hidden md:inline-flex"
            items={breadcrumbPath}
            linkAs={Link}
            size="md"
          />
          <Breadcrumb
            className="mb-400 md:hidden"
            items={breadcrumbPathMobile}
            linkAs={Link}
            size="md"
          />
          <Heading as="h1">{title}</Heading>
        </header>
        <div className="mx-auto aspect-square max-w-md">
          {detail.images && (
            <Gallery
              aspectRatio="square"
              carouselSize={150}
              images={detail.images}
              objectFit="cover"
              orientation="horizontal"
              size="md"
            />
          )}
        </div>
        <ProductInfoPanel
          detail={detail}
          handle={handle}
          quantity={quantity}
          selectedVariant={selectedVariant}
        />
      </div>
      <ProductTabs description={detail.description} tabs={tabsData} />
      <RelatedProducts
        categories={rawProduct.categories?.map((category) => category.id)}
      />
    </div>
  )
}
