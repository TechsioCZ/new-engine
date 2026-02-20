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
    <section className="rounded-xl border border-border-secondary bg-surface p-500 lg:p-600">
      <h2 className="mb-400 text-xl font-semibold text-fg-primary">Informácie o produkte</h2>

      <div className="hidden lg:block">
        <Tabs defaultValue={defaultSectionValue} fitted justify="start" variant="line">
          <Tabs.List>
            {sections.map((section) => (
              <Tabs.Trigger key={section.key} value={section.key}>
                {section.title}
              </Tabs.Trigger>
            ))}
            <Tabs.Indicator />
          </Tabs.List>

          {sections.map((section) => (
            <Tabs.Content className="pt-400" key={section.key} value={section.key}>
              <ProductDetailHtmlContent
                fallback="Obsah sekcie bude čoskoro doplnený."
                html={section.html}
              />
            </Tabs.Content>
          ))}
        </Tabs>
      </div>

      <div className="lg:hidden">
        <Accordion defaultValue={[defaultSectionValue]} size="sm" variant="default">
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
