import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import type { ReactNode } from "react"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  confirmVariant?: "primary" | "danger" | "secondary"
  isLoading?: boolean
  loadingText?: string
  onConfirm: () => void
  onCancel?: () => void
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Potvrdit",
  cancelText = "Zrušit",
  confirmVariant = "danger",
  isLoading = false,
  loadingText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog
      actions={
        <>
          <Button
            disabled={isLoading}
            onClick={handleCancel}
            size="sm"
            variant="secondary"
          >
            {cancelText}
          </Button>
          <Button
            disabled={isLoading}
            onClick={handleConfirm}
            size="sm"
            variant={confirmVariant}
          >
            {isLoading ? (loadingText ?? confirmText) : confirmText}
          </Button>
        </>
      }
      className="shadow-none"
      closeOnEscape={!isLoading}
      closeOnInteractOutside={!isLoading}
      customTrigger
      description={description}
      onOpenChange={({ open: nextOpen }) => {
        onOpenChange(nextOpen)
      }}
      open={open}
      placement="center"
      role="alertdialog"
      size="sm"
      title={title}
    />
  )
}
