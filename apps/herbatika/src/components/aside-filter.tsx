"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Link } from "@techsio/ui-kit/atoms/link";
import { Accordion } from "@techsio/ui-kit/molecules/accordion";
import NextLink from "next/link";

export type AsideFilterCategoryItem = {
  id: string;
  label: string;
  href: string;
  isActive: boolean;
};

export type AsideFilterPriceBand = {
  id: string;
  label: string;
  checked: boolean;
  count: number;
  disabled?: boolean;
};

type AsideFilterProps = {
  categoryItems: AsideFilterCategoryItem[];
  priceBands: AsideFilterPriceBand[];
  onlyInStock: boolean;
  onOnlyInStockChange: (value: boolean) => void;
  onPriceBandToggle: (bandId: string) => void;
  activeFilterCount: number;
  inStockCount: number;
  outOfStockCount: number;
  isLoading?: boolean;
  onReset: () => void;
};

export function AsideFilter({
  categoryItems,
  priceBands,
  onlyInStock,
  onOnlyInStockChange,
  onPriceBandToggle,
  activeFilterCount,
  inStockCount,
  outOfStockCount,
  isLoading = false,
  onReset,
}: AsideFilterProps) {
  return (
    <aside className="space-y-4 rounded-xl border border-border-secondary bg-surface p-4 text-fg-primary xl:sticky xl:top-4">
      <header className="space-y-2 border-border-secondary border-b pb-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Filtre</h2>
          {activeFilterCount > 0 && (
            <Badge variant="info">{`${activeFilterCount} aktívne`}</Badge>
          )}
        </div>
        <ExtraText className="text-fg-secondary text-xs">
          Filter sidebar používa dáta z kategórií, cien variantov a metadata
          skladovosti.
        </ExtraText>
      </header>

      <Accordion
        defaultValue={["price", "availability", "categories"]}
        multiple
        size="sm"
        variant="default"
      >
        <Accordion.Item value="price">
          <Accordion.Header>
            <Accordion.Title>Cena</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-2 pb-2">
              {priceBands.length === 0 && (
                <ExtraText className="text-fg-secondary text-xs">
                  Ceny zatiaľ nie sú dostupné.
                </ExtraText>
              )}

              {priceBands.map((priceBand) => (
                <label
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border-secondary px-2 py-1.5 hover:bg-overlay"
                  htmlFor={`price-band-${priceBand.id}`}
                  key={priceBand.id}
                >
                  <span className="flex items-center gap-2">
                    <Checkbox
                      checked={priceBand.checked}
                      disabled={isLoading || priceBand.disabled}
                      id={`price-band-${priceBand.id}`}
                      name="price-band"
                      onChange={() => onPriceBandToggle(priceBand.id)}
                    />
                    <span className="text-sm">{priceBand.label}</span>
                  </span>
                  <span className="text-fg-secondary text-xs">
                    {priceBand.count}
                  </span>
                </label>
              ))}
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="availability">
          <Accordion.Header>
            <Accordion.Title>Dostupnosť</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-2 pb-2">
              <label
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border-secondary px-2 py-1.5 hover:bg-overlay"
                htmlFor="availability-in-stock"
              >
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={onlyInStock}
                    disabled={isLoading}
                    id="availability-in-stock"
                    name="availability"
                    onChange={(event) =>
                      onOnlyInStockChange(event.currentTarget.checked)
                    }
                  />
                  <span className="text-sm">Len skladom</span>
                </span>
                <span className="text-fg-secondary text-xs">
                  {inStockCount}
                </span>
              </label>

              <div className="flex items-center justify-between rounded-md border border-border-secondary px-2 py-1.5">
                <ExtraText className="text-fg-secondary text-xs">
                  Momentálne nedostupné
                </ExtraText>
                <span className="text-fg-secondary text-xs">
                  {outOfStockCount}
                </span>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="categories">
          <Accordion.Header>
            <Accordion.Title>Kategórie</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-1 pb-2">
              {categoryItems.length === 0 && (
                <ExtraText className="text-fg-secondary text-xs">
                  Kategórie sa načítavajú.
                </ExtraText>
              )}

              {categoryItems.map((category) => (
                <div
                  className="flex items-center justify-between rounded-md border border-border-secondary px-2 py-1.5"
                  key={category.id}
                >
                  <Link
                    as={NextLink}
                    className={
                      category.isActive
                        ? "font-medium text-primary text-sm"
                        : "text-fg-primary text-sm hover:text-primary"
                    }
                    href={category.href}
                  >
                    {category.label}
                  </Link>
                  {category.isActive && (
                    <Badge variant="success">aktívna</Badge>
                  )}
                </div>
              ))}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>

      <Button
        block
        disabled={activeFilterCount === 0}
        onClick={onReset}
        size="sm"
        theme="outlined"
        variant="secondary"
      >
        Vymazať filtre
      </Button>
    </aside>
  );
}
