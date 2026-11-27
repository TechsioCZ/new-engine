/**
 * SaveBar — @techsio/ui-kit molecule.
 *
 * @component SaveBar
 * @componentVersion v1.0.0
 * @skill save-bar-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the save-bar-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { Button } from "../atoms/button"
import { StatusText } from "../atoms/status-text"
import { useUiMessages } from "../messages/ui-messages-provider"
import { useUIDefaults } from "../theme/ui-provider"
import { tv } from "../utils"

const saveBarVariants = tv({
  slots: {
    root: "flex flex-wrap items-center justify-end gap-save-bar",
    status: "flex flex-wrap items-center gap-save-bar-status",
    save: "shrink-0 whitespace-nowrap",
  },
  variants: {
    size: { sm: {}, md: {} },
  },
  defaultVariants: { size: "md" },
})

/**
 * Where an edit form's draft stands.
 * - `idle`: nothing changed. `ready`: opened with valid values Save can send at once, nothing typed.
 * - `dirty`: changed and valid. `invalid`: changed, but the form's validation holds it back.
 * - `saving`, `saved`, `error` (the last save failed).
 * - `proposed`: accepted for approval, not applied yet.
 * - `conflict`: someone else changed the record since the draft was opened.
 * - `reload-required`: a new release replaced the loaded one; saving needs a page reload.
 */
export type SaveBarStatus =
  | "idle"
  | "ready"
  | "dirty"
  | "invalid"
  | "saving"
  | "saved"
  | "proposed"
  | "error"
  | "conflict"
  | "reload-required"

/** States in which the Save button sends the draft. */
const savable = new Set<SaveBarStatus>([
  "dirty",
  "ready",
  "error",
  "reload-required",
])

export type SaveBarProps = Omit<HTMLAttributes<HTMLDivElement>, "onSave"> & {
  status: SaveBarStatus
  /** The one action that sends the whole draft. */
  onSave: () => void
  /** `conflict` only: drop the draft and load the version someone else saved. */
  onReloadLatest?: () => void
  /** `reload-required` only: reload the page and restore the draft. Without it the state is only described. */
  onReloadKeepingDrafts?: () => void
  /** `error` only: the form's own failure text instead of the catalog's. */
  error?: ReactNode
  /** Match the buttons next to it. */
  size?: "sm" | "md"
  ref?: Ref<HTMLDivElement>
}

/**
 * The save control of an edit form: one primary Save button with the draft's status beside it.
 * The button is enabled only for a savable draft, shows the loading state while the save runs, and
 * one click sends one save. Put it last in the form's footer (in a SidePanel, last in `actions`).
 */
export function SaveBar({
  status,
  onSave,
  onReloadLatest,
  onReloadKeepingDrafts,
  error,
  size: sizeProp,
  className,
  ref,
  ...props
}: SaveBarProps) {
  const messages = useUiMessages().saveBar
  const { size } = useUIDefaults("SaveBar", { size: sizeProp }, saveBarVariants)
  const styles = saveBarVariants({ size })
  const secondary = (label: string, onClick: () => void) => (
    <Button
      appearance="outline"
      onClick={onClick}
      severity="secondary"
      size={size}
    >
      {label}
    </Button>
  )
  const statusContent = (() => {
    switch (status) {
      case "dirty":
        return <StatusText size="sm">{messages.unsaved}</StatusText>
      case "saved":
        return (
          <StatusText size="sm" status="success">
            {messages.saved}
          </StatusText>
        )
      case "invalid":
        return (
          <StatusText size="sm" status="warning">
            {messages.invalid}
          </StatusText>
        )
      case "proposed":
        return <StatusText size="sm">{messages.proposed}</StatusText>
      case "error":
        return (
          <StatusText size="sm" status="error">
            {error ?? messages.failed}
          </StatusText>
        )
      case "conflict":
        return (
          <>
            <StatusText size="sm" status="warning">
              {messages.conflict}
            </StatusText>
            {onReloadLatest && secondary(messages.reloadLatest, onReloadLatest)}
          </>
        )
      case "reload-required":
        return (
          <>
            <StatusText size="sm" status="warning">
              {messages.reloadRequired}
            </StatusText>
            {onReloadKeepingDrafts &&
              secondary(messages.reloadKeepingDrafts, onReloadKeepingDrafts)}
          </>
        )
      default:
        // idle and ready say nothing; the button itself shows a running save.
        return null
    }
  })()
  return (
    <div
      className={styles.root({ className })}
      data-save-state={status}
      ref={ref}
      {...props}
    >
      <div aria-live="polite" className={styles.status()}>
        {statusContent}
      </div>
      <Button
        className={styles.save()}
        disabled={!(savable.has(status) || status === "saving")}
        isLoading={status === "saving"}
        loadingText={messages.saving}
        onClick={onSave}
        severity="primary"
        size={size}
      >
        {messages.save}
      </Button>
    </div>
  )
}

SaveBar.displayName = "SaveBar"
