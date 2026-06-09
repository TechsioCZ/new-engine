import { Trash } from "@medusajs/icons"
import { Button, Prompt } from "@medusajs/ui"

interface DeletePromptProps {
  cancelText: string
  confirmText: string
  description: string
  handleDelete: () => void
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
    handleDelete()
    setOpen(false)
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
