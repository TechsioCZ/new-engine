import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { useToast } from "@techsio/ui-kit/molecules/toast"
import type { OrderExpeditionBlockingOrder } from "../../admin-types"
import {
  bulkUpdateOrderBusinessStatus,
  downloadOrderExpeditionPdf,
  invalidateOrderExpeditionQueries,
  updateOrderBusinessStatus,
  updateOrderExpeditionStatus,
} from "../api/mutations"
import { showOrderExpeditionToast } from "../toast"

export function useOrderExpeditionMutations({
  onBulkManualStatusSuccess,
  onMedusaStatusSuccess,
  selectedCount,
  setBlockingOrders,
  toast,
}: {
  onBulkManualStatusSuccess: () => void
  onMedusaStatusSuccess: () => void
  selectedCount: number
  setBlockingOrders: (orders: OrderExpeditionBlockingOrder[]) => void
  toast: ReturnType<typeof useToast>
}) {
  const queryClient = useQueryClient()

  const printMutation = useMutation({
    mutationFn: downloadOrderExpeditionPdf,
    onError: (error) => {
      showOrderExpeditionToast(
        toast,
        "error",
        "PDF se nepodarilo vytvorit",
        error instanceof Error ? error.message : undefined
      )
    },
    onSuccess: () => {
      showOrderExpeditionToast(toast, "success", "PDF bylo vygenerovano")
    },
  })

  const medusaStatusMutation = useMutation({
    mutationFn: updateOrderExpeditionStatus,
    onError: (error) => {
      showOrderExpeditionToast(
        toast,
        "error",
        "Medusa status se nepodarilo ulozit",
        error instanceof Error ? error.message : undefined
      )
    },
    onSuccess: async (result) => {
      if (!result.ok) {
        setBlockingOrders(result.blockedOrders)
        showOrderExpeditionToast(toast, "error", result.message)
        return
      }

      showOrderExpeditionToast(
        toast,
        "success",
        `${selectedCount} objednavek aktualizovano`
      )
      onMedusaStatusSuccess()
      await invalidateOrderExpeditionQueries(queryClient)
    },
  })

  const manualStatusMutation = useMutation({
    mutationFn: updateOrderBusinessStatus,
    onError: (error) => {
      showOrderExpeditionToast(
        toast,
        "error",
        "Manualni status se nepodarilo ulozit",
        error instanceof Error ? error.message : undefined
      )
    },
    onSuccess: async () => {
      showOrderExpeditionToast(toast, "success", "Manualni status ulozen")
      await invalidateOrderExpeditionQueries(queryClient)
    },
  })

  const bulkManualStatusMutation = useMutation({
    mutationFn: bulkUpdateOrderBusinessStatus,
    onError: (error) => {
      showOrderExpeditionToast(
        toast,
        "error",
        "Bulk manualni status se nepodarilo ulozit",
        error instanceof Error ? error.message : undefined
      )
    },
    onSuccess: async (result) => {
      setBlockingOrders(result.skipped)
      showOrderExpeditionToast(
        toast,
        "success",
        `Manualni status ulozen pro ${result.count} objednavek`,
        `${result.skipped_count} preskoceno`
      )
      onBulkManualStatusSuccess()
      await invalidateOrderExpeditionQueries(queryClient)
    },
  })

  return {
    bulkManualStatusMutation,
    manualStatusMutation,
    medusaStatusMutation,
    printMutation,
  }
}
