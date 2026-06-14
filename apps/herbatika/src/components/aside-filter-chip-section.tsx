"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useMemo, useState } from "react"
import { AsideFilterButton } from "@/components/aside-filter-button"
import { SupportingText } from "@/components/text/supporting-text"

export type AsideFilterChipItem = {
  id: string
  label: string
  count: number
  checked: boolean
  disabled?: boolean
}

type AsideFilterChipSectionProps = {
  title?: string
  items: AsideFilterChipItem[]
  onToggle: (itemId: string) => void
  emptyMessage?: string
  collapseAfter?: number
  isLoading?: boolean
}

export function AsideFilterChipSection({
  title,
  items,
  onToggle,
  emptyMessage,
  collapseAfter,
  isLoading = false,
}: AsideFilterChipSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const visibleItems = useMemo(() => {
    if (!collapseAfter || collapseAfter <= 0 || isExpanded) {
      return items
    }

    return items.slice(0, collapseAfter)
  }, [collapseAfter, isExpanded, items])

  return (
    <section className="space-y-250">
      {title && <h3 className="font-semibold text-xl leading-none">{title}</h3>}

      {items.length === 0 && emptyMessage && (
        <SupportingText className="text-fg-secondary text-sm">
          {emptyMessage}
        </SupportingText>
      )}

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap gap-250">
            {visibleItems.map((item) => (
              <AsideFilterButton
                checked={item.checked}
                count={item.count}
                disabled={isLoading || item.disabled}
                key={item.id}
                label={item.label}
                onClick={() => onToggle(item.id)}
              />
            ))}
          </div>

          {typeof collapseAfter === "number" &&
            collapseAfter > 0 &&
            items.length > collapseAfter && (
              <Button
                className="min-h-750 font-semibold text-fg-secondary text-sm underline hover:text-primary"
                onClick={() => setIsExpanded((currentState) => !currentState)}
                size="current"
                theme="unstyled"
                type="button"
                variant="secondary"
              >
                {isExpanded ? "Zobraziť menej" : "Zobraziť viac"}
              </Button>
            )}
        </>
      )}
    </section>
  )
}
