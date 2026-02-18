"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Slider } from "@techsio/ui-kit/molecules/slider";
import { useEffect, useMemo, useState } from "react";
import {
  type AsideFilterChipItem,
  AsideFilterChipSection,
} from "@/components/aside-filter-chip-section";

type AsideFilterPriceBounds = {
  min: number;
  max: number;
};

type AsideFilterPriceRange = {
  min?: number;
  max?: number;
};

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
};

const toSafeBounds = (
  bounds: AsideFilterPriceBounds | null,
): AsideFilterPriceBounds | null => {
  if (!bounds) {
    return null;
  }

  const min = Number.isFinite(bounds.min) ? bounds.min : 0;
  const maxCandidate = Number.isFinite(bounds.max) ? bounds.max : min + 1;
  const max = maxCandidate > min ? maxCandidate : min + 1;

  return {
    min: Math.floor(min),
    max: Math.ceil(max),
  };
};

const resolveRangeFromSelection = (
  selectedRange: AsideFilterPriceRange,
  bounds: AsideFilterPriceBounds,
): [number, number] => {
  const selectedMin =
    typeof selectedRange.min === "number"
      ? clampNumber(selectedRange.min, bounds.min, bounds.max)
      : bounds.min;
  const selectedMax =
    typeof selectedRange.max === "number"
      ? clampNumber(selectedRange.max, bounds.min, bounds.max)
      : bounds.max;

  if (selectedMin <= selectedMax) {
    return [selectedMin, selectedMax];
  }

  return [selectedMax, selectedMin];
};

const resolveRangeWithinBounds = (
  range: [number, number],
  bounds: AsideFilterPriceBounds,
): [number, number] => {
  return resolveRangeFromSelection(
    {
      min: range[0],
      max: range[1],
    },
    bounds,
  );
};

const resolveBoundsForRender = (
  currentBounds: AsideFilterPriceBounds,
  incomingBounds: AsideFilterPriceBounds | null,
  hasActivePriceFilter: boolean,
): AsideFilterPriceBounds => {
  if (!incomingBounds) {
    return currentBounds;
  }

  if (!hasActivePriceFilter) {
    return incomingBounds;
  }

  return {
    min: Math.min(currentBounds.min, incomingBounds.min),
    max: Math.max(currentBounds.max, incomingBounds.max),
  };
};

const normalizeCommittedRange = (
  nextRange: [number, number],
  bounds: AsideFilterPriceBounds,
): AsideFilterPriceRange => {
  const rangeMin = clampNumber(nextRange[0], bounds.min, bounds.max);
  const rangeMax = clampNumber(nextRange[1], bounds.min, bounds.max);
  const normalizedMin = rangeMin <= bounds.min ? undefined : rangeMin;
  const normalizedMax = rangeMax >= bounds.max ? undefined : rangeMax;

  return {
    min: normalizedMin,
    max: normalizedMax,
  };
};

const formatAmount = (amount: number, currencyCode: string): string => {
  const locale = currencyCode === "CZK" ? "cs-CZ" : "sk-SK";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currencyCode}`;
  }
};

type AsideFilterProps = {
  priceBounds: AsideFilterPriceBounds | null;
  selectedPriceRange: AsideFilterPriceRange;
  currencyCode: string;
  statusItems: AsideFilterChipItem[];
  formItems: AsideFilterChipItem[];
  brandItems: AsideFilterChipItem[];
  ingredientItems: AsideFilterChipItem[];
  onStatusToggle: (itemId: string) => void;
  onFormToggle: (itemId: string) => void;
  onBrandToggle: (itemId: string) => void;
  onIngredientToggle: (itemId: string) => void;
  onPriceRangeCommit: (range: AsideFilterPriceRange) => void;
  activeFilterCount: number;
  isLoading?: boolean;
  onReset: () => void;
};

export function AsideFilter({
  priceBounds,
  selectedPriceRange,
  currencyCode,
  statusItems,
  formItems,
  brandItems,
  ingredientItems,
  onStatusToggle,
  onFormToggle,
  onBrandToggle,
  onIngredientToggle,
  onPriceRangeCommit,
  activeFilterCount,
  isLoading = false,
  onReset,
}: AsideFilterProps) {
  const incomingPriceBounds = useMemo(
    () => toSafeBounds(priceBounds),
    [priceBounds],
  );
  const hasActivePriceFilter =
    typeof selectedPriceRange.min === "number" ||
    typeof selectedPriceRange.max === "number";
  const [priceBoundsForRender, setPriceBoundsForRender] =
    useState<AsideFilterPriceBounds>(
      incomingPriceBounds ?? {
        min: 0,
        max: 1,
      },
    );

  useEffect(() => {
    setPriceBoundsForRender((currentBounds) =>
      resolveBoundsForRender(
        currentBounds,
        incomingPriceBounds,
        hasActivePriceFilter,
      ),
    );
  }, [hasActivePriceFilter, incomingPriceBounds]);

  const selectedRange = useMemo(
    () => resolveRangeFromSelection(selectedPriceRange, priceBoundsForRender),
    [priceBoundsForRender, selectedPriceRange],
  );

  const [sliderRange, setSliderRange] = useState<[number, number]>(
    selectedRange,
  );
  const sliderRangeForRender = useMemo(
    () => resolveRangeWithinBounds(sliderRange, priceBoundsForRender),
    [priceBoundsForRender, sliderRange],
  );

  useEffect(() => {
    setSliderRange(selectedRange);
  }, [selectedRange]);

  const chipButtonClass = (checked: boolean, disabled?: boolean) => {
    return [
      "rounded-full px-250 py-100 text-sm font-medium leading-tight transition-colors",
      checked ? "bg-primary text-fg-reverse" : "bg-highlight text-primary",
      disabled ? "opacity-55" : "hover:bg-highlight-hover",
    ].join(" ");
  };

  return (
    <aside className="rounded-2xl border border-border-secondary bg-surface p-500 text-fg-primary xl:sticky xl:top-400">
      <div className="space-y-500">
        <section className="space-y-300">
          <h2 className="text-2xl font-bold uppercase leading-none">Cena</h2>
          <div className="flex items-center justify-between text-lg font-medium text-fg-secondary">
            <span>{formatAmount(sliderRangeForRender[0], currencyCode)}</span>
            <span>{formatAmount(sliderRangeForRender[1], currencyCode)}</span>
          </div>
          <Slider
            defaultValue={[
              priceBoundsForRender.min,
              priceBoundsForRender.max,
            ]}
            max={priceBoundsForRender.max}
            min={priceBoundsForRender.min}
            minStepsBetweenThumbs={0}
            onChange={(values) => {
              if (values[0] === undefined || values[1] === undefined) {
                return;
              }

              setSliderRange(
                resolveRangeWithinBounds(
                  [Math.round(values[0]), Math.round(values[1])],
                  priceBoundsForRender,
                ),
              );
            }}
            onChangeEnd={(values) => {
              if (values[0] === undefined || values[1] === undefined) {
                return;
              }

              const nextRange = resolveRangeWithinBounds(
                [Math.round(values[0]), Math.round(values[1])],
                priceBoundsForRender,
              );
              onPriceRangeCommit(
                normalizeCommittedRange(nextRange, priceBoundsForRender),
              );
            }}
            size="sm"
            step={1}
            value={sliderRangeForRender}
          />
        </section>

        <section className="space-y-250">
          <div className="flex flex-wrap gap-200">
            {statusItems.map((item) => (
              <Button
                className={chipButtonClass(item.checked, item.disabled)}
                disabled={isLoading || item.disabled}
                key={item.id}
                onClick={() => onStatusToggle(item.id)}
                size="current"
                theme="unstyled"
                type="button"
              >
                {`${item.label} (${item.count})`}
              </Button>
            ))}
          </div>
        </section>

        <div>
          <AsideFilterChipSection
            emptyMessage="Formy sa načítavajú."
            isLoading={isLoading}
            items={formItems}
            onToggle={onFormToggle}
            title="Forma"
          />
        </div>

        <div>
          <AsideFilterChipSection
            collapseAfter={12}
            emptyMessage="Značky zatiaľ nie sú dostupné."
            isLoading={isLoading}
            items={brandItems}
            onToggle={onBrandToggle}
            title="Značka"
          />
        </div>

        <div>
          <AsideFilterChipSection
            collapseAfter={12}
            emptyMessage="Aktívne látky sa načítavajú."
            isLoading={isLoading}
            items={ingredientItems}
            onToggle={onIngredientToggle}
            title="Aktívna látka"
          />
        </div>

        <div className="space-y-250">
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
        </div>
      </div>
    </aside>
  );
}

export type { AsideFilterChipItem };
export type { AsideFilterPriceBounds, AsideFilterPriceRange };
