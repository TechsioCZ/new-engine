/**
 * DetailViewModeToggle — @techsio/ui-kit molecule.
 *
 * @component DetailViewModeToggle
 * @componentVersion v1.0.0
 * @skill detail-view-mode-toggle-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the detail-view-mode-toggle-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { Ref } from "react"
import { Button } from "../atoms/button"
import { useUiMessages } from "../messages/ui-messages-provider"
import { tv } from "../utils"

const detailViewModeToggleVariants = tv({
  // A fieldset is the semantic group; its browser frame is reset to a plain button row.
  base: "m-0 inline-flex min-w-0 gap-detail-view-mode-toggle border-0 p-0",
})

export type DetailViewMode = "page" | "panel"

export type DetailViewModeToggleProps = {
  value: DetailViewMode
  onValueChange: (value: DetailViewMode) => void
  size?: "sm" | "md"
  className?: string
  ref?: Ref<HTMLFieldSetElement>
}

/**
 * Two-way switch between opening a list's records as a full page or in a side panel. The app
 * owns the value and where the choice is remembered.
 */
export function DetailViewModeToggle({
  value,
  onValueChange,
  size = "sm",
  className,
  ref,
}: DetailViewModeToggleProps) {
  const messages = useUiMessages().detailViewMode
  const option = (mode: DetailViewMode, label: string) => {
    const active = value === mode
    return (
      <Button
        appearance="outline"
        aria-pressed={active}
        onClick={() => {
          if (!active) {
            onValueChange(mode)
          }
        }}
        severity={active ? "primary" : "secondary"}
        size={size}
      >
        {label}
      </Button>
    )
  }
  return (
    <fieldset
      aria-label={messages.label}
      className={detailViewModeToggleVariants({ className })}
      ref={ref}
    >
      {option("page", messages.page)}
      {option("panel", messages.panel)}
    </fieldset>
  )
}

DetailViewModeToggle.displayName = "DetailViewModeToggle"
