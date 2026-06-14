export type QuoteAdminI18nNamespace = {
  actions: Record<
    | "addItems"
    | "cancel"
    | "continue"
    | "duplicate"
    | "manage"
    | "rejectQuote"
    | "remove"
    | "save"
    | "send"
    | "sendQuote"
    | "undo"
    | "updatePrice"
    | "viewOrder",
    string
  >
  badges: Record<"modified" | "new" | "removed", string>
  columns: Record<
    | "company"
    | "createdAt"
    | "email"
    | "id"
    | "sku"
    | "status"
    | "title"
    | "total",
    string
  >
  cost: Record<"discounts" | "shipping", string>
  customer: Record<"email" | "phone" | "spendingLimit" | "title", string>
  fields: Record<
    "company" | "items" | "name" | "price" | "qty" | "search" | "sku" | "title",
    string
  >
  form: Record<
    | "itemMessageHint"
    | "itemMessageLabel"
    | "messagePlaceholder"
    | "selectItem"
    | "unitPriceHint",
    string
  >
  menuItem: string
  messages: Record<"title", string>
  noRecords: Record<"message" | "title", string>
  prompts: Record<
    "rejectDescription" | "rejectTitle" | "sendDescription" | "sendTitle",
    string
  >
  sections: Record<
    | "company"
    | "customer"
    | "manageQuote"
    | "quoteSummary"
    | "quoteTotal"
    | "originalTotal",
    string
  >
  statuses: Record<
    | "accepted"
    | "customer_rejected"
    | "merchant_rejected"
    | "pending_customer"
    | "pending_merchant",
    string
  >
  toasts: Record<
    | "messageSent"
    | "quoteAcceptedReady"
    | "quoteRejected"
    | "quoteSent"
    | "quoteUpdated",
    string
  >
  totals: Record<"currentTotal" | "newTotal", string>
  validation: Record<
    | "genericError"
    | "missingQuoteId"
    | "previewNotFound"
    | "quantityLowerThanFulfillment"
    | "quoteNotFound",
    string
  >
}

export const quoteAdminI18n = {
  cs: {
    actions: {
      addItems: "Přidat položky",
      cancel: "Zrušit",
      continue: "Pokračovat",
      duplicate: "Duplikovat",
      manage: "Spravovat",
      rejectQuote: "Zamítnout nabídku",
      remove: "Odebrat",
      save: "Uložit",
      send: "Odeslat",
      sendQuote: "Odeslat nabídku",
      undo: "Vrátit",
      updatePrice: "Upravit cenu",
      viewOrder: "Zobrazit objednávku",
    },
    badges: {
      modified: "Upraveno",
      new: "Nové",
      removed: "Odebráno",
    },
    columns: {
      company: "Firma",
      createdAt: "Vytvořeno",
      email: "E-mail",
      id: "ID",
      sku: "SKU",
      status: "Stav",
      title: "Název",
      total: "Celkem",
    },
    cost: {
      discounts: "Slevy",
      shipping: "Doprava",
    },
    customer: {
      email: "E-mail",
      phone: "Telefon",
      spendingLimit: "Limit útraty",
      title: "Zákazník",
    },
    fields: {
      company: "Firma",
      items: "Položky",
      name: "Název",
      price: "Cena",
      qty: "Ks",
      search: "Hledat",
      sku: "SKU",
      title: "Název",
    },
    form: {
      itemMessageHint: "Vyberte položku nabídky, ke které chcete napsat zprávu",
      itemMessageLabel: "Vybrat položku nabídky",
      messagePlaceholder: "Napište zprávu zákazníkovi",
      selectItem: "Vyberte položku",
      unitPriceHint: "Přepsat jednotkovou cenu tohoto produktu",
    },
    menuItem: "Nabídky",
    messages: {
      title: "Zprávy",
    },
    noRecords: {
      message:
        "Momentálně nejsou žádné nabídky. Vytvořte nabídku ze storefrontu.",
      title: "Žádné nabídky",
    },
    prompts: {
      rejectDescription:
        "Chystáte se zamítnout nabídku zákazníka. Chcete pokračovat?",
      rejectTitle: "Zamítnout nabídku?",
      sendDescription:
        "Chystáte se odeslat tuto nabídku zákazníkovi. Chcete pokračovat?",
      sendTitle: "Odeslat nabídku?",
    },
    sections: {
      company: "Firma",
      customer: "Zákazník",
      manageQuote: "Spravovat nabídku",
      originalTotal: "Původní total",
      quoteSummary: "Souhrn nabídky",
      quoteTotal: "Total nabídky",
    },
    statuses: {
      accepted: "Přijato",
      customer_rejected: "Zamítnuto zákazníkem",
      merchant_rejected: "Zamítnuto obchodníkem",
      pending_customer: "Čeká na zákazníka",
      pending_merchant: "Čeká na obchodníka",
    },
    toasts: {
      messageSent: "Zpráva byla odeslána zákazníkovi",
      quoteAcceptedReady:
        "Nabídka byla přijata zákazníkem. Objednávka je připravena ke zpracování.",
      quoteRejected: "Nabídka zákazníka byla zamítnuta",
      quoteSent: "Nabídka byla odeslána zákazníkovi",
      quoteUpdated: "Nabídka byla upravena",
    },
    totals: {
      currentTotal: "Aktuální total",
      newTotal: "Nový total",
    },
    validation: {
      genericError: "Chyba",
      missingQuoteId: "Chybí ID nabídky",
      previewNotFound: "Náhled nebyl nalezen",
      quantityLowerThanFulfillment:
        "Množství nemůže být nižší než již splněné množství",
      quoteNotFound: "Nabídka nebyla nalezena",
    },
  },
  en: {
    actions: {
      addItems: "Add items",
      cancel: "Cancel",
      continue: "Continue",
      duplicate: "Duplicate",
      manage: "Manage",
      rejectQuote: "Reject Quote",
      remove: "Remove",
      save: "Save",
      send: "Send",
      sendQuote: "Send Quote",
      undo: "Undo",
      updatePrice: "Update Price",
      viewOrder: "View Order",
    },
    badges: {
      modified: "Modified",
      new: "New",
      removed: "Removed",
    },
    columns: {
      company: "Company",
      createdAt: "Created at",
      email: "Email",
      id: "ID",
      sku: "SKU",
      status: "Status",
      title: "Title",
      total: "Total",
    },
    cost: {
      discounts: "Discounts",
      shipping: "Shipping",
    },
    customer: {
      email: "Email",
      phone: "Phone",
      spendingLimit: "Spending Limit",
      title: "Customer",
    },
    fields: {
      company: "Company",
      items: "Items",
      name: "Name",
      price: "Price",
      qty: "Qty",
      search: "Search",
      sku: "SKU",
      title: "Title",
    },
    form: {
      itemMessageHint: "Select a quote item to write a message around",
      itemMessageLabel: "Pick Quote Item",
      messagePlaceholder: "Write a message to the customer",
      selectItem: "Select Item",
      unitPriceHint: "Override the unit price of this product",
    },
    menuItem: "Quotes",
    messages: {
      title: "Messages",
    },
    noRecords: {
      message: "There are currently no quotes. Create one from the storefront.",
      title: "No quotes found",
    },
    prompts: {
      rejectDescription:
        "You are about to reject this customer's quote. Do you want to continue?",
      rejectTitle: "Reject quote?",
      sendDescription:
        "You are about to send this quote to the customer. Do you want to continue?",
      sendTitle: "Send quote?",
    },
    sections: {
      company: "Company",
      customer: "Customer",
      manageQuote: "Manage Quote",
      originalTotal: "Original Total",
      quoteSummary: "Quote Summary",
      quoteTotal: "Quote Total",
    },
    statuses: {
      accepted: "Accepted",
      customer_rejected: "Customer Rejected",
      merchant_rejected: "Merchant Rejected",
      pending_customer: "Pending Customer",
      pending_merchant: "Pending Merchant",
    },
    toasts: {
      messageSent: "Successfully sent message to customer",
      quoteAcceptedReady:
        "Quote accepted by customer. Order is ready for processing.",
      quoteRejected: "Successfully rejected customer's quote",
      quoteSent: "Successfully sent quote to customer",
      quoteUpdated: "Successfully updated quote",
    },
    totals: {
      currentTotal: "Current total",
      newTotal: "New total",
    },
    validation: {
      genericError: "Error",
      missingQuoteId: "Missing quote id",
      previewNotFound: "Preview not found",
      quantityLowerThanFulfillment:
        "Quantity cannot be lower than the fulfilled quantity",
      quoteNotFound: "Quote not found",
    },
  },
} satisfies Record<"cs" | "en", QuoteAdminI18nNamespace>
