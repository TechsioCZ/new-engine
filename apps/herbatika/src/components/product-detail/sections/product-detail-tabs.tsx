"use client";

import { Accordion } from "@techsio/ui-kit/molecules/accordion";
import { Tabs } from "@techsio/ui-kit/molecules/tabs";
import { ProductDetailHtmlContent } from "@/components/product-detail/product-detail-html-content";
import type { ProductDetailContentSection } from "@/components/product-detail/product-detail.types";

type ProductDetailTabsProps = {
  defaultSectionValue: string;
  sections: ProductDetailContentSection[];
};

export function ProductDetailTabs({
  defaultSectionValue,
  sections,
}: ProductDetailTabsProps) {
  return (
    <section>
      <h2 className="mb-400 text-3xl font-semibold text-fg-primary">Informácie o produkte</h2>

      <div className="hidden lg:block">
        <Tabs defaultValue={defaultSectionValue} fitted justify="start" variant="line" size="md">
          <Tabs.List className="mb-200">
            {sections.map((section) => (
              <Tabs.Trigger key={section.key} value={section.key} className="bg-tabs-trigger-bg h-full font-normal data-[selected]:font-medium">
                {section.title}
              </Tabs.Trigger>
            ))}
            <Tabs.Indicator className="origin-center scale-x-75"/>
          </Tabs.List>

          {sections.map((section) => (
            <Tabs.Content className="px-800 py-400 bg-surface" key={section.key} value={section.key}>
              <ProductDetailHtmlContent
                fallback="Obsah sekcie bude čoskoro doplnený."
                html={section.html}
              />
            </Tabs.Content>
          ))}
        </Tabs>
      </div>

      <div className="lg:hidden">
        <Accordion size="sm" variant="default">
          {sections.map((section) => (
            <Accordion.Item key={section.key} value={section.key}>
              <Accordion.Header>
                <Accordion.Title>{section.title}</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <ProductDetailHtmlContent
                  fallback="Obsah sekcie bude čoskoro doplnený."
                  html={section.html}
                />
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
