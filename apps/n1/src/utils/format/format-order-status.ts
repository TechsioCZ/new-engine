export const getOrderStatusColor = (
  status: string,
): "success" | "danger" | "info" => {
  switch (status) {
    case "completed": {
      return "success"
    }
    case "canceled": {
      return "danger"
    }
    default: {
      return "info"
    }
  }
}

export const getOrderStatusLabel = (status: string): string => {
  switch (status) {
    case "archived": {
      return "Archivována"
    }
    case "canceled": {
      return "Zrušena"
    }
    case "completed": {
      return "Dokončena"
    }
    case "pending": {
      return "Čeká na zpracování"
    }
    case "requires_action": {
      return "Vyžaduje akci"
    }
    default: {
      return status
    }
  }
}
