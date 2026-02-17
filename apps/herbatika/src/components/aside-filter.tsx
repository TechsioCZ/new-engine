"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Slider } from "@techsio/ui-kit/molecules/slider";
import { useEffect, useMemo, useState } from "react";
import {
  type AsideFilterChipItem,
  AsideFilterChipSection,
} from "@/components/aside-filter-chip-section";
import {
  type AsideFilterPriceBand,
  formatAmount,
  resolveBandIdsFromRange,
  resolveSelectedRangeFromBands,
  resolveSliderBounds,
} from "@/components/aside-filter-price-range";

type AsideFilterProps = {
  priceBands: AsideFilterPriceBand[];
  currencyCode: string;
  statusItems: AsideFilterChipItem[];
  formItems: AsideFilterChipItem[];
  brandItems: AsideFilterChipItem[];
  ingredientItems: AsideFilterChipItem[];
  onStatusToggle: (itemId: string) => void;
  onFormToggle: (itemId: string) => void;
  onBrandToggle: (itemId: string) => void;
  onIngredientToggle: (itemId: string) => void;
  onPriceBandSelectionChange: (bandIds: string[]) => void;
  activeFilterCount: number;
  isLoading?: boolean;
  onReset: () => void;
};

export function AsideFilter({
  priceBands,
  currencyCode,
  statusItems,
  formItems,
  brandItems,
  ingredientItems,
  onStatusToggle,
  onFormToggle,
  onBrandToggle,
  onIngredientToggle,
  onPriceBandSelectionChange,
  activeFilterCount,
  isLoading = false,
  onReset,
}: AsideFilterProps) {
  const sliderBounds = useMemo(
    () => resolveSliderBounds(priceBands),
    [priceBands],
  );

  const selectedRangeFromBands = useMemo(
    () => resolveSelectedRangeFromBands(priceBands, sliderBounds),
    [priceBands, sliderBounds],
  );

  const [sliderRange, setSliderRange] = useState<[number, number]>(
    selectedRangeFromBands,
  );

  useEffect(() => {
    setSliderRange(selectedRangeFromBands);
  }, [selectedRangeFromBands]);

  const safeSliderBounds = useMemo(() => {
    const min = Number.isFinite(sliderBounds.min) ? sliderBounds.min : 0;
    const maxCandidate = Number.isFinite(sliderBounds.max)
      ? sliderBounds.max
      : min + 1;

    return {
      min,
      max: maxCandidate > min ? maxCandidate : min + 1,
    };
  }, [sliderBounds.max, sliderBounds.min]);

  const safeSliderValue = useMemo<[number, number]>(() => {
    const currentMin = Number.isFinite(sliderRange[0])
      ? sliderRange[0]
      : safeSliderBounds.min;
    const currentMax = Number.isFinite(sliderRange[1])
      ? sliderRange[1]
      : safeSliderBounds.max;
    const normalizedMin = Math.max(
      safeSliderBounds.min,
      Math.min(safeSliderBounds.max, currentMin),
    );
    const normalizedMax = Math.max(
      safeSliderBounds.min,
      Math.min(safeSliderBounds.max, currentMax),
    );

    if (normalizedMin <= normalizedMax) {
      return [normalizedMin, normalizedMax];
    }

    return [normalizedMax, normalizedMin];
  }, [
    safeSliderBounds.max,
    safeSliderBounds.min,
    sliderRange[0],
    sliderRange[1],
  ]);

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
            <span>{formatAmount(safeSliderValue[0], currencyCode)}</span>
            <span>{formatAmount(safeSliderValue[1], currencyCode)}</span>
          </div>
          <Slider
            defaultValue={[safeSliderBounds.min, safeSliderBounds.max]}
            max={safeSliderBounds.max}
            min={safeSliderBounds.min}
            minStepsBetweenThumbs={0}
            onChange={(values) => {
              if (values[0] === undefined || values[1] === undefined) {
                return;
              }

              setSliderRange([Math.round(values[0]), Math.round(values[1])]);
            }}
            onChangeEnd={(values) => {
              if (values[0] === undefined || values[1] === undefined) {
                return;
              }

              const nextRange: [number, number] = [
                Math.round(values[0]),
                Math.round(values[1]),
              ];

              const nextBandIds = resolveBandIdsFromRange(
                nextRange,
                priceBands,
                safeSliderBounds,
              );
              onPriceBandSelectionChange(nextBandIds);
            }}
            size="sm"
            step={1}
            value={safeSliderValue}
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
export type { AsideFilterPriceBand } from "@/components/aside-filter-price-range";
