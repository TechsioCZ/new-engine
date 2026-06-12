"use client";

import { Accordion } from "@techsio/ui-kit/molecules/accordion";
import { Tabs } from "@techsio/ui-kit/molecules/tabs";
import { ProductDetailHtmlContent } from "@/components/product-detail/product-detail-html-content";
import type { ProductDetailContentSection } from "@/components/product-detail/product-detail.types";
import {
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  PRODUCT_DETAIL_REVIEWS_TAB_VALUE,
} from "@/components/product-detail/sections/product-detail-review-utils";
import { ProductDetailReviews } from "@/components/product-detail/sections/product-detail-reviews";

type ProductDetailTabsProps = {
  activeSectionValue: string;
  defaultSectionValue: string;
  onSectionValueChange: (value: string) => void;
  productId?: string | null;
  sections: ProductDetailContentSection[];
};

export function ProductDetailTabs({
  activeSectionValue,
  defaultSectionValue,
  onSectionValueChange,
  productId,
  sections,
}: ProductDetailTabsProps) {
  const tabSections = productId
    ? [
        ...sections,
        {
          key: PRODUCT_DETAIL_REVIEWS_TAB_VALUE,
          title: "Hodnotenie",
          html: "",
        },
      ]
    : sections;

  return (
    <section id={productId ? PRODUCT_DETAIL_REVIEWS_SECTION_ID : undefined}>
      <h2 className="mb-400 text-3xl font-semibold text-fg-primary">
        Informácie o produkte
      </h2>

      <div className="hidden lg:block">
        <Tabs
          defaultValue={defaultSectionValue}
          fitted
          justify="start"
          onValueChange={onSectionValueChange}
          size="md"
          value={activeSectionValue}
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
                <ProductDetailReviews productId={productId} />
              ) : (
                <ProductDetailHtmlContent
                  fallback="Obsah sekcie bude čoskoro doplnený."
                  html={section.html}
                />
              )}
            </Tabs.Content>
          ))}
        </Tabs>
      </div>

      <div className="lg:hidden">
        <Accordion
          onChange={(value) => {
            const nextValue = value[0];
            if (nextValue) {
              onSectionValueChange(nextValue);
            }
          }}
          size="sm"
          value={[activeSectionValue]}
          variant="default"
        >
          {tabSections.map((section) => (
            <Accordion.Item key={section.key} value={section.key}>
              <Accordion.Header>
                <Accordion.Title>{section.title}</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                {section.key === PRODUCT_DETAIL_REVIEWS_TAB_VALUE ? (
                  <ProductDetailReviews productId={productId} />
                ) : (
                  <ProductDetailHtmlContent
                    fallback="Obsah sekcie bude čoskoro doplnený."
                    html={section.html}
                  />
                )}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
