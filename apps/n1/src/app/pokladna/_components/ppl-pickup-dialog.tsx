"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"

import { type PplAccessPointData, PplWidget } from "./ppl-widget"

type PplPickupDialogProps = {
  /** Whether dialog is open (controlled) */
  open: boolean
  /** Current selected access point data */
  selectedPoint?: PplAccessPointData | null
  /** Callback when access point is selected */
  onSelect: (data: PplAccessPointData) => void
  /** Callback when dialog is closed without selection */
  onClose: () => void
  /** Initial address for map search */
  address?: string
}

/**
 * Dialog component for selecting PPL pickup points
 *
 * Uses Dialog from @libs/ui/molecules/dialog to display
 * PPL widget in a modal overlay for better UX
 *
 * Widget remounts automatically via conditional render {open && ...}
 */
export function PplPickupDialog({
  open,
  selectedPoint,
  onSelect,
  onClose,
  address,
}: PplPickupDialogProps) {
  const handleSelect = (data: PplAccessPointData) => {
    if (process.env["NODE_ENV"] === "development") {
      console.log("[PplPickupDialog] Access point selected:", data)
    }
    onSelect(data)
  }

  const handleOpenChange = ({ open: isOpen }: { open: boolean }) => {
    if (!isOpen) {
      onClose()
    }
  }

  return (
    <Dialog
      actions={
        <Button onClick={onClose} theme="outlined" variant="secondary">
          Zrušit
        </Button>
      }
      className="rounded-md border-border-secondary shadow-none"
      customTrigger
      description="Najděte nejbližší ParcelShop nebo ParcelBox pro vyzvednutí zásilky"
      onOpenChange={handleOpenChange}
      open={open}
      title="Vyberte výdejní místo PPL"
    >
      <div>
        {open && (
          <PplWidget
            address={address}
            country="CZ"
            mode="default"
            onSelect={handleSelect}
            selectedCode={selectedPoint?.code}
          />
        )}
      </div>
    </Dialog>
  )
}
