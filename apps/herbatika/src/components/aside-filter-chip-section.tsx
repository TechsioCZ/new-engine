"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { AsideFilterButton } from "@/components/aside-filter-button"
import { SupportingText } from "@/components/text/supporting-text"

export interface AsideFilterChipItem {
  id: string
  label: string
  count: number
  checked: boolean
  disabled?: boolean
}

interface AsideFilterChipSectionProps {
  title?: string
  items: AsideFilterChipItem[]
  onToggle: (itemId: string) => void
  emptyMessage?: string
  loadingMessage?: string
  collapseAfter?: number
  isLoading?: boolean
}

export const AsideFilterChipSection = ({
  title,
  items,
  onToggle,
  emptyMessage,
  loadingMessage,
  collapseAfter,
  isLoading = false,
}: AsideFilterChipSectionProps) => {
  const t = useTranslations("catalog")
  const [isExpanded, setIsExpanded] = useState(false)

  const hasCollapseLimit = collapseAfter !== undefined && collapseAfter > 0
  const visibleItems =
    hasCollapseLimit && !isExpanded ? items.slice(0, collapseAfter) : items
  const statusMessage = isLoading ? loadingMessage : emptyMessage
  const hasStatusMessage =
    typeof statusMessage === "string" && statusMessage !== ""
  const hasItems = items.length > 0
  const canToggleCollapse = hasCollapseLimit && items.length > collapseAfter

  return (
    <section className="space-y-250">
      {title !== null && title !== undefined && title !== "" && (
        <h3 className="font-semibold text-xl leading-none">{title}</h3>
      )}

      {items.length === 0 && hasStatusMessage && (
        <SupportingText className="text-fg-secondary text-sm">
          {statusMessage}
        </SupportingText>
      )}

      {hasItems && (
        <>
          <div className="flex flex-wrap gap-250">
            {visibleItems.map((item) => (
              <AsideFilterButton
                checked={item.checked}
                count={item.count}
                disabled={isLoading || item.disabled === true}
                key={item.id}
                label={item.label}
                onClick={() => {
                  onToggle(item.id)
                }}
              />
            ))}
          </div>

          {canToggleCollapse && (
            <Button
              className="min-h-750 font-semibold text-fg-secondary text-sm underline hover:text-primary"
              onClick={() => {
                setIsExpanded((currentState) => !currentState)
              }}
              size="current"
              theme="unstyled"
              type="button"
              variant="secondary"
            >
              {isExpanded ? t("filters.show_less") : t("filters.show_more")}
            </Button>
          )}
        </>
      )}
    </section>
  )
}
