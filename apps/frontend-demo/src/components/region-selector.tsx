"use client"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { type SelectItem } from "@techsio/ui-kit/molecules/select"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"

import { SkeletonLoader } from "@/components/atoms/skeleton-loader"
import { useRegions } from "@/hooks/use-region"

const currencyToIcon: Record<string, IconType> = {
  CZK: "token-icon-cz",
  EUR: "token-icon-eu",
  USD: "token-icon-usa",
}

export function RegionSelector({ className }: { className?: string }) {
  const { regions, selectedRegion, setSelectedRegion, isLoading } = useRegions()

  if (isLoading || !regions.length) {
    return <SkeletonLoader className="hidden h-8 w-28 lg:block" variant="box" />
  }

  const handleChange = (details: { value: string[] }) => {
    const regionId = details.value[0]
    const region = regions.find((r) => r.id === regionId)
    if (region) {
      void setSelectedRegion(region)
    }
  }

  const items: SelectItem[] = regions.map((region) => ({
    value: region.id,
    label: (
      <span className="flex items-center gap-1">
        <Icon
          icon={
            currencyToIcon[region.currency_code.toUpperCase()] ||
            "token-icon-globe"
          }
        />
        {region.currency_code.toUpperCase()}
      </span>
    ),
    displayValue: region.currency_code.toUpperCase(),
  }))

  return (
    <SelectTemplate
      className={className}
      items={items}
      label="Region"
      labelProps={{ className: "sr-only" }}
      onValueChange={handleChange}
      placeholder="Region"
      size="xs"
      value={selectedRegion ? [selectedRegion.id] : []}
      valueText={(selectedItems) =>
        selectedItems[0] ? (
          <span className="flex items-center gap-1">
            <Icon
              icon={
                currencyToIcon[selectedItems[0].displayValue as string] ||
                "token-icon-globe"
              }
            />
            {selectedItems[0].displayValue}
          </span>
        ) : (
          "Region"
        )
      }
    />
  )
}
