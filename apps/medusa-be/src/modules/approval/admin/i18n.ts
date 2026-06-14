export type ApprovalAdminI18nNamespace = {
  actions: Record<"approve" | "cancel" | "delete" | "reject", string>
  columns: Record<
    "actions" | "company" | "id" | "items" | "status" | "updatedAt",
    string
  >
  filters: Record<"status", string>
  item: Record<"count" | "total", string>
  menuItem: string
  noRecords: Record<"message" | "title", string>
  prompts: Record<
    | "approveDescription"
    | "approveTitle"
    | "deleteDescription"
    | "deleteTitle"
    | "rejectDescription"
    | "rejectTitle",
    string
  >
  statuses: Record<"approved" | "pending" | "rejected", string>
}

export const approvalAdminI18n = {
  cs: {
    actions: {
      approve: "Schválit",
      cancel: "Zrušit",
      delete: "Smazat",
      reject: "Zamítnout",
    },
    columns: {
      actions: "Akce",
      company: "Firma",
      id: "ID",
      items: "Položky",
      status: "Stav",
      updatedAt: "Upraveno",
    },
    filters: {
      status: "Stav",
    },
    item: {
      count: "{{count}} položek",
      total: "Celkem za položku:",
    },
    menuItem: "Schvalování",
    noRecords: {
      message: "Momentálně nejsou žádná schválení.",
      title: "Žádná schválení",
    },
    prompts: {
      approveDescription: "Tuto akci nelze vrátit zpět.",
      approveTitle: "Opravdu chcete tento košík schválit?",
      deleteDescription:
        "Opravdu chcete tuto položku smazat? Tuto akci nelze vrátit zpět.",
      deleteTitle: "Potvrdit smazání",
      rejectDescription: "Tuto akci nelze vrátit zpět.",
      rejectTitle: "Opravdu chcete tento košík zamítnout?",
    },
    statuses: {
      approved: "Schváleno",
      pending: "Čeká",
      rejected: "Zamítnuto",
    },
  },
  en: {
    actions: {
      approve: "Approve",
      cancel: "Cancel",
      delete: "Delete",
      reject: "Reject",
    },
    columns: {
      actions: "Actions",
      company: "Company",
      id: "ID",
      items: "Items",
      status: "Status",
      updatedAt: "Updated at",
    },
    filters: {
      status: "Status",
    },
    item: {
      count: "{{count}} item(s)",
      total: "Item total:",
    },
    menuItem: "Approvals",
    noRecords: {
      message: "There are currently no approvals.",
      title: "No approvals found",
    },
    prompts: {
      approveDescription: "This action cannot be undone.",
      approveTitle: "Are you sure you want to approve this cart?",
      deleteDescription:
        "Are you sure you want to delete this item? This action cannot be undone.",
      deleteTitle: "Confirm Deletion",
      rejectDescription: "This action cannot be undone.",
      rejectTitle: "Are you sure you want to reject this cart?",
    },
    statuses: {
      approved: "Approved",
      pending: "Pending",
      rejected: "Rejected",
    },
  },
} satisfies Record<"cs" | "en", ApprovalAdminI18nNamespace>
