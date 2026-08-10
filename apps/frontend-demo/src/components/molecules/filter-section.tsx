import { Button } from "@techsio/ui-kit/atoms/button"
import type { ReactNode } from "react"
import { useState } from "react"

const getVisibleItems = <T,>(
  items: T[] | undefined,
  defaultItemsShown: number | undefined,
  showAll: boolean,
  hasMore: boolean,
): T[] => {
  if (
    items === undefined ||
    showAll ||
    !hasMore ||
    defaultItemsShown === undefined
  ) {
    return items ?? []
  }

  return items.slice(0, defaultItemsShown)
}

export interface FilterSectionProps<T = unknown> {
  title: string
  items?: T[]
  renderItem?: (item: T, index: number) => ReactNode
  children?: ReactNode
  defaultItemsShown?: number
  onClear?: (() => void) | undefined
  className?: string
}

export const FilterSection = <T,>({
  title,
  items,
  renderItem,
  children,
  defaultItemsShown,
  onClear,
  className,
}: FilterSectionProps<T>) => {
  const [showAll, setShowAll] = useState(false)
  const hasItems = items !== undefined && renderItem !== undefined
  const hasMore =
    hasItems &&
    defaultItemsShown !== undefined &&
    items.length > defaultItemsShown
  const visibleItems = getVisibleItems(
    items,
    defaultItemsShown,
    showAll,
    hasMore,
  )
  const renderedItems: ReactNode[] = []
  if (hasItems) {
    for (const [index, item] of visibleItems.entries()) {
      renderedItems.push(renderItem(item, index))
    }
  }

  return (
    <div className="mb-filter-section-margin">
      <div className="mb-filter-section-header-margin flex items-center justify-between">
        <h3 className="font-filter-section-title text-filter-section-title">
          {title}
        </h3>
        {onClear !== undefined && (
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
      <div className={className ?? ""}>
        {hasItems ? renderedItems : children}
      </div>
      {hasMore && defaultItemsShown !== undefined && (
        <div className="mt-filter-section-view-more-margin">
          <Button
            onClick={() => {
              setShowAll((current) => !current)
            }}
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
