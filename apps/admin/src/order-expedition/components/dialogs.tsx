import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import type {
  OrderExpeditionBlockingOrder,
  OrderExpeditionOrder,
  OrderExpeditionTargetStatus,
} from "../../admin-types"
import { BulkManualStatusPreview, MedusaStatusPreview } from "./messages"

export function OrderDashboardDialogs({
  bulkManualStatusLabel,
  bulkManualStatusPending,
  bulkManualStatusPreview,
  isBulkDialogOpen,
  isMedusaStatusDialogOpen,
  medusaStatusLabel,
  medusaStatusPending,
  onBulkConfirm,
  onBulkDialogOpenChange,
  onMedusaConfirm,
  onMedusaStatusDialogOpenChange,
  selectedOrders,
  targetStatus,
}: {
  bulkManualStatusLabel: string
  bulkManualStatusPending: boolean
  bulkManualStatusPreview: {
    skipped: OrderExpeditionBlockingOrder[]
    updatable: OrderExpeditionOrder[]
  }
  isBulkDialogOpen: boolean
  isMedusaStatusDialogOpen: boolean
  medusaStatusLabel: string
  medusaStatusPending: boolean
  onBulkConfirm: () => void
  onBulkDialogOpenChange: (open: boolean) => void
  onMedusaConfirm: () => void
  onMedusaStatusDialogOpenChange: (open: boolean) => void
  selectedOrders: OrderExpeditionOrder[]
  targetStatus: OrderExpeditionTargetStatus | ""
}) {
  return (
    <>
      <Dialog
        actions={
          <>
            <Button
              onClick={() => onBulkDialogOpenChange(false)}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Zrusit
            </Button>
            <Button
              disabled={!bulkManualStatusPreview.updatable.length}
              isLoading={bulkManualStatusPending}
              onClick={onBulkConfirm}
              size="sm"
            >
              Pouzit
            </Button>
          </>
        }
        customTrigger
        description="Aktualizovany budou jen objednavky, ktere zmena manualniho statusu neblokuje."
        onOpenChange={(details) => onBulkDialogOpenChange(details.open)}
        open={isBulkDialogOpen}
        title="Pouzit manualni status"
      >
        <BulkManualStatusPreview
          label={bulkManualStatusLabel}
          preview={bulkManualStatusPreview}
        />
      </Dialog>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => onMedusaStatusDialogOpenChange(false)}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Zrusit
            </Button>
            <Button
              disabled={!targetStatus}
              isLoading={medusaStatusPending}
              onClick={onMedusaConfirm}
              size="sm"
              variant={targetStatus === "canceled" ? "danger" : "primary"}
            >
              Pouzit
            </Button>
          </>
        }
        customTrigger
        description="Tahle akce meni Medusa lifecycle status vybranych objednavek. Pouzij ji jen kdyz chces zmenit technicky stav objednavky."
        onOpenChange={(details) => onMedusaStatusDialogOpenChange(details.open)}
        open={isMedusaStatusDialogOpen}
        title="Pouzit Medusa status"
      >
        <MedusaStatusPreview
          label={medusaStatusLabel}
          orders={selectedOrders}
        />
      </Dialog>
    </>
  )
}
