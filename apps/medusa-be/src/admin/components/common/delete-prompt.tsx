import { Trash } from "@medusajs/icons"
import { Button, Prompt } from "@medusajs/ui"

type DeletePromptProps = {
  cancelText: string
  confirmText: string
  description: string
  handleDelete: () => Promise<void> | void
  loading: boolean
  open: boolean
  setOpen: (open: boolean) => void
  title: string
}

export const DeletePrompt = ({
  cancelText,
  confirmText,
  description,
  handleDelete,
  loading,
  open,
  setOpen,
  title,
}: DeletePromptProps) => {
  const handleConfirmDelete = async () => {
    try {
      await handleDelete()
      setOpen(false)
    } catch {
      // Mutation handlers surface the error; keep the prompt open.
    }
  }

  return (
    <Prompt onOpenChange={setOpen} open={open}>
      <Prompt.Content className="border-b p-4 pb-0 shadow-ui-fg-shadow">
        <Prompt.Title>{title}</Prompt.Title>
        <Prompt.Description>{description}</Prompt.Description>
        <Prompt.Footer>
          <Button
            isLoading={loading}
            onClick={handleConfirmDelete}
            variant="danger"
          >
            <Trash />
            {confirmText}
          </Button>
          <Button onClick={() => setOpen(false)} variant="secondary">
            {cancelText}
          </Button>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  )
}
