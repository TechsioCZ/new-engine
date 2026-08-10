"use client"

import { Accordion } from "@techsio/ui-kit/molecules/accordion"
import { Tabs } from "@techsio/ui-kit/molecules/tabs"
import { useTranslations } from "next-intl"
import { Suspense } from "react"

import { ProductDetailHtmlContent } from "@/components/product-detail/product-detail-html-content"
import type { ProductDetailContentSection } from "@/components/product-detail/product-detail.types"
import {
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  PRODUCT_DETAIL_REVIEWS_TAB_VALUE,
} from "@/components/product-detail/sections/product-detail-review-utils"
import { ProductDetailReviews } from "@/components/product-detail/sections/product-detail-reviews"

const getAccordionSectionId = (value: string) =>
  `product-detail-information-${value}`

interface ProductDetailTabsProps {
  activeSectionValue?: string
  defaultSectionValue: string
  onSectionValueChange: (value: string | undefined) => void
  productId?: string | null
  sections: ProductDetailContentSection[]
}

const ProductDetailReviewsSlot = ({
  productId,
}: {
  productId?: string | null
}) => (
  <Suspense fallback={null}>
    <ProductDetailReviews {...(productId === undefined ? {} : { productId })} />
  </Suspense>
)

export const ProductDetailTabs = ({
  activeSectionValue,
  defaultSectionValue,
  onSectionValueChange,
  productId,
  sections,
}: ProductDetailTabsProps) => {
  const tCatalog = useTranslations("catalog")
  const selectedSectionValue = activeSectionValue ?? defaultSectionValue
  const hasProductId =
    productId !== null && productId !== undefined && productId !== ""
  const tabSections = hasProductId
    ? [
        ...sections,
        {
          html: "",
          key: PRODUCT_DETAIL_REVIEWS_TAB_VALUE,
          title: tCatalog("reviews.tab_label"),
        },
      ]
    : sections

  const handleAccordionChange = (value: string[]) => {
    const [sectionValue] = value
    onSectionValueChange(sectionValue)

    if (sectionValue === undefined || sectionValue === "") {
      return
    }

    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `#${CSS.escape(getAccordionSectionId(sectionValue))}`,
        )
        ?.scrollIntoView({ block: "start" })
    })
  }

  const reviewsSlot = (
    <ProductDetailReviewsSlot
      {...(productId === undefined ? {} : { productId })}
    />
  )

  return (
    <section id={hasProductId ? PRODUCT_DETAIL_REVIEWS_SECTION_ID : undefined}>
      <h2 className="mb-400 font-semibold text-3xl text-fg-primary">
        {tCatalog("product_detail.information_title")}
      </h2>

      <div className="hidden lg:block">
        <Tabs
          defaultValue={defaultSectionValue}
          fitted
          justify="start"
          onValueChange={onSectionValueChange}
          size="md"
          value={selectedSectionValue}
          variant="line"
        >
          <Tabs.List className="mb-200">
            {tabSections.map((section) => (
              <Tabs.Trigger
                className="h-full bg-tabs-trigger-bg font-normal data-[selected]:font-medium"
                key={section.key}
                value={section.key}
              >
                {section.title}
              </Tabs.Trigger>
            ))}
            <Tabs.Indicator className="origin-center scale-x-75" />
          </Tabs.List>

          {tabSections.map((section) => (
            <Tabs.Content
              className="bg-surface px-800 py-400"
              key={section.key}
              value={section.key}
            >
              {section.key === PRODUCT_DETAIL_REVIEWS_TAB_VALUE ? (
                reviewsSlot
              ) : (
                <ProductDetailHtmlContent html={section.html} />
              )}
            </Tabs.Content>
          ))}
        </Tabs>
      </div>

      <div className="lg:hidden">
        <Accordion
          collapsible
          onChange={handleAccordionChange}
          size="sm"
          value={
            activeSectionValue === undefined || activeSectionValue === ""
              ? []
              : [activeSectionValue]
          }
          variant="default"
        >
          {tabSections.map((section) => (
            <Accordion.Item key={section.key} value={section.key}>
              <Accordion.Header
                className="scroll-mt-product-detail-information-scroll-offset"
                id={getAccordionSectionId(section.key)}
              >
                <Accordion.Title>{section.title}</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                {section.key === PRODUCT_DETAIL_REVIEWS_TAB_VALUE ? (
                  reviewsSlot
                ) : (
                  <ProductDetailHtmlContent html={section.html} />
                )}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
