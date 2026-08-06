"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"

import { SkeletonLoader } from "@/components/atoms/skeleton-loader"
import { useRegions } from "@/hooks/use-region"

const DEFAULT_REGION_ICON: IconType = "token-icon-globe"

const currencyToIcon: Record<string, IconType> = {
  CZK: "token-icon-cz",
  EUR: "token-icon-eu",
  USD: "token-icon-usa",
}

const renderSelectedRegion = (selectedItems: SelectItem[]) => {
  const [selectedItem] = selectedItems
  if (selectedItem === undefined) {
    return "Region"
  }

  const icon =
    typeof selectedItem.displayValue === "string"
      ? (currencyToIcon[selectedItem.displayValue] ?? DEFAULT_REGION_ICON)
      : DEFAULT_REGION_ICON

  return (
    <span className="flex items-center gap-1">
      <Icon icon={icon} />
      {selectedItem.displayValue}
    </span>
  )
}

export const RegionSelector = ({ className }: { className?: string }) => {
  const { regions, selectedRegion, setSelectedRegion, isLoading } = useRegions()

  if (isLoading || regions.length === 0) {
    return <SkeletonLoader className="hidden h-8 w-28 lg:block" variant="box" />
  }

  const handleChange = (details: { value: string[] }) => {
    const [regionId] = details.value
    const region = regions.find((r) => r.id === regionId)
    if (region !== undefined) {
      void setSelectedRegion(region)
    }
  }

  const items: SelectItem[] = regions.map((region) => ({
    displayValue: region.currency_code.toUpperCase(),
    label: (
      <span className="flex items-center gap-1">
        <Icon
          icon={
            currencyToIcon[region.currency_code.toUpperCase()] ??
            "token-icon-globe"
          }
        />
        {region.currency_code.toUpperCase()}
      </span>
    ),
    value: region.id,
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
      value={selectedRegion === null ? [] : [selectedRegion.id]}
      valueText={renderSelectedRegion}
    />
  )
}
