/**
 * UnsavedChangesDialog — @techsio/ui-kit molecule.
 *
 * @component UnsavedChangesDialog
 * @componentVersion v1.0.0
 * @skill unsaved-changes-dialog-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the unsaved-changes-dialog-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { Button } from "../atoms/button"
import { useUiMessages } from "../messages/ui-messages-provider"
import { tv } from "../utils"
import { Dialog } from "./dialog"

const unsavedChangesDialogVariants = tv({
  slots: {
    // One row from sm up, so Save never drops below Stay and Discard on a desktop.
    actions:
      "flex w-full flex-wrap justify-end gap-unsaved-changes-dialog-actions sm:flex-nowrap",
    action: "whitespace-nowrap",
  },
})

export type UnsavedChangesDialogProps = {
  open: boolean
  /** Whether Save can send the draft now (a changed, valid draft). */
  canSave: boolean
  /** A save started from this dialog is running. */
  saving?: boolean
  onSave: () => void
  /** Drop the draft and leave. */
  onDiscard: () => void
  /** Keep the form open. Escape and a press outside mean the same. */
  onStay: () => void
}

/** The question asked before unsaved changes are left: Save, Discard changes or Stay. */
export function UnsavedChangesDialog({
  open,
  canSave,
  saving = false,
  onSave,
  onDiscard,
  onStay,
}: UnsavedChangesDialogProps) {
  const messages = useUiMessages().unsavedChanges
  const styles = unsavedChangesDialogVariants()
  return (
    <Dialog
      actions={
        <div className={styles.actions()} data-unsaved-changes-actions="">
          <Button
            appearance="outline"
            className={styles.action()}
            onClick={onStay}
            severity="secondary"
          >
            {messages.stay}
          </Button>
          <Button
            appearance="outline"
            className={styles.action()}
            onClick={onDiscard}
            severity="danger"
          >
            {messages.discard}
          </Button>
          <Button
            className={styles.action()}
            disabled={!(canSave || saving)}
            isLoading={saving}
            loadingText={messages.saving}
            onClick={onSave}
            severity="primary"
          >
            {messages.save}
          </Button>
        </div>
      }
      customTrigger
      description={messages.description}
      onOpenChange={({ open: next }) => {
        if (!next) {
          onStay()
        }
      }}
      open={open}
      role="alertdialog"
      // `sm` is too narrow for the three buttons side by side.
      size="md"
      title={messages.title}
    />
  )
}

UnsavedChangesDialog.displayName = "UnsavedChangesDialog"
