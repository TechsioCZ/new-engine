type OrderStatus =
  | "pending"
  | "completed"
  | "canceled"
  | "archived"
  | "requires_action"

const orderStatusMap: Record<OrderStatus, string> = {
  pending: "Čeká na zpracování",
  completed: "Dokončena",
  canceled: "Zrušena",
  archived: "Archivována",
  requires_action: "Vyžaduje akci",
}

export function getOrderStatusColor(
  status: string
): "success" | "danger" | "info" {
  switch (status) {
    case "completed":
      return "success"
    case "canceled":
      return "danger"
    default:
      return "info"
  }
}

export function getOrderStatusLabel(status: string): string {
  return orderStatusMap[status as OrderStatus] || status
}
