/**
 * BulkActionBar — @techsio/ui-kit molecule.
 *
 * @component BulkActionBar
 * @componentVersion v1.0.0
 * @skill bulk-action-bar-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the bulk-action-bar-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, Ref } from "react"
import { Button } from "../atoms/button"
import { useUiMessages } from "../messages/ui-messages-provider"
import { tv } from "../utils"

const bulkActionBarVariants = tv({
  slots: {
    root: "flex flex-wrap items-center gap-bulk-action-bar rounded-bulk-action-bar bg-bulk-action-bar-bg p-bulk-action-bar text-bulk-action-bar-fg",
    count:
      "font-bulk-action-bar-count text-bulk-action-bar-count-size tabular-nums",
    actions: "flex flex-wrap items-center gap-bulk-action-bar-actions",
    clear: "ms-auto",
  },
})

export type BulkActionBarProps = HTMLAttributes<HTMLDivElement> & {
  /** Rows currently selected. The bar renders nothing at zero. */
  selectedCount: number
  /** Clears the selection. */
  onClear: () => void
  /** Overrides the catalog's `bulkActionBar.selected`. */
  selectedLabel?: string
  /** Overrides the catalog's `bulkActionBar.clear`. */
  clearLabel?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * Actions for the selected rows of a table. Appears above the table only while rows are selected,
 * so the table's own toolbar never changes shape. Children are the actions, primary first,
 * destructive last.
 */
export function BulkActionBar({
  selectedCount,
  onClear,
  selectedLabel,
  clearLabel,
  className,
  children,
  ref,
  ...props
}: BulkActionBarProps) {
  const messages = useUiMessages()
  if (selectedCount === 0) {
    return null
  }
  const styles = bulkActionBarVariants()
  return (
    <div className={styles.root({ className })} ref={ref} {...props}>
      <span className={styles.count()}>
        {selectedLabel ?? messages.bulkActionBar.selected(selectedCount)}
      </span>
      <div className={styles.actions()}>{children}</div>
      <Button
        appearance="ghost"
        className={styles.clear()}
        onClick={onClear}
        severity="secondary"
        size="sm"
      >
        {clearLabel ?? messages.bulkActionBar.clear}
      </Button>
    </div>
  )
}

BulkActionBar.displayName = "BulkActionBar"
