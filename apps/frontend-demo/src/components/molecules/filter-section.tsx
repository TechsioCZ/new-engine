import { Button } from "@ui/atoms/button"
import type { ReactNode } from "react"
import { useState } from "react"

export interface FilterSectionProps<T = unknown> {
  title: string
  items?: T[]
  renderItem?: (item: T, index: number) => ReactNode
  children?: ReactNode
  defaultItemsShown?: number
  onClear?: (() => void) | undefined
  className?: string
}

export function FilterSection<T>({
  title,
  items,
  renderItem,
  children,
  defaultItemsShown,
  onClear,
  className,
}: FilterSectionProps<T>) {
  const [showAll, setShowAll] = useState(false)

  const hasItems = items && renderItem
  const hasMore =
    hasItems && defaultItemsShown && items.length > defaultItemsShown
  const visibleItems = hasItems
    ? showAll || !hasMore
      ? items
      : items.slice(0, defaultItemsShown)
    : []

  return (
    <div className="mb-filter-section-margin">
      <div className="mb-filter-section-header-margin flex items-center justify-between">
        <h3 className="font-filter-section-title text-filter-section-title">
          {title}
        </h3>
        {onClear && (
          <Button
            onClick={onClear}
            size="sm"
            theme="borderless"
            variant="tertiary"
          >
            Vymazat
          </Button>
        )}
      </div>
      <div className={className || ""}>
        {hasItems
          ? visibleItems.map((item, index) => renderItem(item, index))
          : children}
      </div>
      {hasMore && (
        <div className="mt-filter-section-view-more-margin">
          <Button
            onClick={() => setShowAll(!showAll)}
            size="sm"
            theme="borderless"
            variant="tertiary"
          >
            {showAll
              ? "Zobrazit méně"
              : `Zobrazit dalších ${items.length - defaultItemsShown}`}
          </Button>
        </div>
      )}
    </div>
  )
}
