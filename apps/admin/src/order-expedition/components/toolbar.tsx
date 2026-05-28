import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import type {
  OrderExpeditionBlockingOrder,
  OrderExpeditionCarrierKey,
  OrderExpeditionTargetStatus,
} from "../../admin-types"
import { AdminSelectField } from "../../components/admin-select-field"
import { AdminToolbarButton } from "../../components/admin-toolbar-button"
import { MANUAL_STATUS_ITEMS, type ManualStatusValue } from "../model/statuses"
import type { TargetStatusOption } from "../model/target-statuses"

export function OrderDashboardToolbar({
  bulkManualStatus,
  bulkManualStatusPending,
  carrier,
  carrierItems,
  isMedusaStatusPending,
  isPrintPending,
  onBulkManualStatusChange,
  onCarrierChange,
  onMedusaStatusChange,
  onOpenBulkManualStatusDialog,
  onPrint,
  onUseMedusaStatus,
  selectedCount,
  selectedTargetStatusBlockers,
  targetStatus,
  targetStatusOptions,
}: {
  bulkManualStatus: ManualStatusValue | ""
  bulkManualStatusPending: boolean
  carrier: OrderExpeditionCarrierKey | "all"
  carrierItems: SelectItem[]
  isMedusaStatusPending: boolean
  isPrintPending: boolean
  onBulkManualStatusChange: (value: string) => void
  onCarrierChange: (value: string) => void
  onMedusaStatusChange: (value: string) => void
  onOpenBulkManualStatusDialog: () => void
  onPrint: () => void
  onUseMedusaStatus: () => void
  selectedCount: number
  selectedTargetStatusBlockers: OrderExpeditionBlockingOrder[]
  targetStatus: OrderExpeditionTargetStatus | ""
  targetStatusOptions: TargetStatusOption[]
}) {
  return (
    <div className="border-border-primary border-b p-400">
      <div className="flex flex-wrap items-end gap-300">
        <AdminSelectField
          className="w-48"
          items={carrierItems}
          label="Dopravce"
          onValueChange={onCarrierChange}
          size="sm"
          value={carrier}
        />
        <span className="flex h-form-control-sm items-center text-fg-secondary text-sm">
          {selectedCount} vybrano
        </span>
        <AdminToolbarButton
          className="gap-100"
          disabled={selectedCount === 0}
          isLoading={isPrintPending}
          onClick={onPrint}
        >
          <Icon icon="token-icon-order-print" size="sm" />
          PDF
        </AdminToolbarButton>
        <AdminSelectField
          className="w-52"
          disabled={selectedCount === 0}
          items={MANUAL_STATUS_ITEMS}
          label={<span className="whitespace-nowrap">Manualni status</span>}
          onValueChange={onBulkManualStatusChange}
          size="sm"
          value={bulkManualStatus}
        />
        <AdminToolbarButton
          className="gap-100"
          disabled={selectedCount === 0 || !bulkManualStatus}
          isLoading={bulkManualStatusPending}
          onClick={onOpenBulkManualStatusDialog}
        >
          <Icon icon="token-icon-order-status" size="sm" />
          Pouzit manualni status
        </AdminToolbarButton>
        <AdminSelectField
          className="w-44"
          disabled={selectedCount === 0}
          items={targetStatusOptions}
          label={<span className="whitespace-nowrap">Medusa status</span>}
          onValueChange={onMedusaStatusChange}
          size="sm"
          value={targetStatus}
        />
        <AdminToolbarButton
          className="gap-100"
          disabled={
            selectedCount === 0 ||
            !targetStatus ||
            selectedTargetStatusBlockers.length > 0
          }
          isLoading={isMedusaStatusPending}
          onClick={onUseMedusaStatus}
          theme="solid"
        >
          <Icon icon="token-icon-order-status" size="sm" />
          Pouzit Medusa status
        </AdminToolbarButton>
      </div>
    </div>
  )
}
