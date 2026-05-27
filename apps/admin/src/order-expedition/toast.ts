import type { useToast } from "@techsio/ui-kit/molecules/toast"

export function showOrderExpeditionToast(
  toast: ReturnType<typeof useToast>,
  type: "error" | "success" | "warning",
  title: string,
  description?: string
) {
  toast.create({ description, title, type })
}
