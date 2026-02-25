import { Trash } from "@medusajs/icons"
import { Button, Prompt } from "@medusajs/ui"

interface DeletePromptProps {
  handleDelete: () => void
  loading: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

export const DeletePrompt = ({
  handleDelete,
  loading,
  open,
  setOpen,
}: DeletePromptProps) => {
  const handleConfirmDelete = async () => {
    handleDelete()
    setOpen(false)
  }

  return (
    <Prompt onOpenChange={setOpen} open={open}>
      <Prompt.Content className="border-b p-4 pb-0 shadow-ui-fg-shadow">
        <Prompt.Title>Confirm Deletion</Prompt.Title>
        <Prompt.Description>
          Are you sure you want to delete this item? This action cannot be
          undone.
        </Prompt.Description>
        <Prompt.Footer>
          <Button
            isLoading={loading}
            onClick={handleConfirmDelete}
            variant="danger"
          >
            <Trash />
            Delete
          </Button>
          <Button onClick={() => setOpen(false)} variant="secondary">
            Cancel
          </Button>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  )
}
