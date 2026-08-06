"use client"

import { HeurekaProduct } from "@techsio/analytics/heureka"
import { BreadcrumbTemplate } from "@techsio/ui-kit/templates/breadcrumb"
import { GalleryTemplate } from "@techsio/ui-kit/templates/gallery"
import Image from "next/image"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

import { Heading } from "@/components/heading"
import { ProductInfoPanel } from "@/components/product-detail/product-info-panel"
import { ProductSizes } from "@/components/product-detail/product-sizes"
import { ProductTable } from "@/components/product-detail/product-table"
import { ProductTabs } from "@/components/product-detail/product-tabs"
import { RelatedProducts } from "@/components/product-detail/related-products"
import { useSuspenseProduct } from "@/hooks/use-product"
import { CATEGORY_MAP_BY_ID } from "@/lib/constants"
import { useAnalytics } from "@/providers/analytics-provider"
import type { ProductDetail, ProductVariantDetail } from "@/types/product"
import {
  buildBreadcrumbs,
  buildProductBreadcrumbs,
} from "@/utils/helpers/build-breadcrumb"
import { selectVariant } from "@/utils/select-variant"
import { transformProductDetail } from "@/utils/transform/transform-product"

type RawProduct = NonNullable<ReturnType<typeof useSuspenseProduct>["data"]>

interface ProductContentProps {
  handle: string
  rawProduct: RawProduct
  variantParam: string | null
}

interface TrackProductViewOptions {
  categoryName: string | undefined
  detail: ProductDetail
  selectedVariant: ProductVariantDetail | null
}

const useTrackProductView = ({
  categoryName,
  detail,
  selectedVariant,
}: TrackProductViewOptions) => {
  const analytics = useAnalytics()
  const trackedVariantId = useRef<string | null>(null)

  useEffect(() => {
    if (
      selectedVariant === null ||
      trackedVariantId.current === selectedVariant.id
    ) {
      return
    }

    trackedVariantId.current = selectedVariant.id
    analytics.trackViewContent({
      currency: (
        selectedVariant.calculated_price?.currency_code ?? "CZK"
      ).toUpperCase(),
      productId: selectedVariant.id,
      productName: detail.title,
      value: selectedVariant.calculated_price?.calculated_amount_with_tax ?? 0,
      ...(typeof categoryName === "string" && categoryName.length > 0
        ? { category: categoryName }
        : {}),
    })
  }, [analytics, categoryName, detail.title, selectedVariant])
}

const ProductContent = ({
  handle,
  rawProduct,
  variantParam,
}: ProductContentProps) => {
  const detail = transformProductDetail(rawProduct)
  const selectedVariant = selectVariant(detail.variants, variantParam)
  useTrackProductView({
    categoryName: rawProduct.categories?.[0]?.name,
    detail,
    selectedVariant,
  })

  // Transformed items carry only id and src, but the gallery renders each
  // slide through next/image, which throws without width/height or fill.
  // The carousel slide is positioned, so fill resolves against it.
  const galleryImages =
    detail?.images?.map((image) => ({
      ...image,
      imageProps: { fill: true, sizes: "(max-width: 448px) 100vw, 448px" },
    })) ?? []

  const title = selectedVariant
    ? `${detail?.title} - ${selectedVariant.title}`
    : detail?.title
  const quantity = selectedVariant?.inventory_quantity ?? 0

  const breadcrumbPath = buildProductBreadcrumbs(
    rawProduct.categories?.[0]?.id,
    CATEGORY_MAP_BY_ID,
    rawProduct.title,
    rawProduct.handle,
  )

  const breadcrumbPathMobile = buildBreadcrumbs(
    rawProduct.categories?.[0]?.id,
    CATEGORY_MAP_BY_ID,
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
      value: detail.brand?.title,
    },
    {
      key: "velikost",
      value: selectedVariant?.title,
    },
  ]

  const tabsData = [
    {
      content: <ProductTable rows={productTableRows} />,
      headline: "produktové parametry",
      label: "produktové parametry",
      value: "tab1",
    },
    {
      content: <ProductSizes attributes={detail.brand?.attributes} />,
      headline: "tabulka velikostí",
      label: "tabulka velikostí",
      value: "tab2",
    },
  ]

  return (
    <div className="container mx-auto p-400">
      <HeurekaProduct country="cz" />

      <div className="grid grid-cols-1 gap-700 md:grid-cols-[auto_1fr]">
        <header className="col-span-1 space-y-400 md:col-span-2">
          <BreadcrumbTemplate
            className="mb-400 hidden md:inline-flex"
            items={breadcrumbPath}
            size="md"
          />
          <BreadcrumbTemplate
            className="mb-400 md:hidden"
            items={breadcrumbPathMobile}
            size="md"
          />
          <Heading as="h1">{title}</Heading>
        </header>
        <div className="mx-auto aspect-square max-w-md">
          {galleryImages.length > 0 && (
            <GalleryTemplate
              aspectRatio="square"
              carouselHeight={150}
              carouselWidth={150}
              imageAs={Image}
              items={galleryImages}
              objectFit="cover"
              orientation="horizontal"
              size="md"
              thumbnailImageAs={Image}
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

const ProductPage = () => {
  const params = useParams()
  const searchParams = useSearchParams()
  const { handle: handleParam } = params
  if (typeof handleParam !== "string" || handleParam.length === 0) {
    throw new Error("Handle produktu je povinný")
  }

  const { data: rawProduct } = useSuspenseProduct({ handle: handleParam })
  if (rawProduct === undefined || rawProduct === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-fg-secondary">Produkt nebyl nalezen</p>
      </div>
    )
  }

  return (
    <ProductContent
      handle={handleParam}
      rawProduct={rawProduct}
      variantParam={searchParams.get("variant")}
    />
  )
}

export default ProductPage
