const resources = {
  cs: {
    orderBusinessStatuses: {
      columns: {
        businessStatus: "Stav objednávky",
        created: "Vytvořeno",
        customer: "Zákazník",
        manualStatus: "Ruční stav",
        order: "Objednávka",
        total: "Celkem",
      },
      manualStatus: {
        clear: "Vymazat ruční stav",
        placeholder: "Upravit stav",
        saving: "Ukládám...",
      },
      menuItem: "Stavy objednávek",
      pagination: {
        next: "Další",
        of: "z",
        pages: "stránek",
        previous: "Předchozí",
        results: "výsledků",
      },
      statuses: {
        awaiting_payment: "Čeká na platbu",
        canceled: "Storno",
        delivered: "Doručená",
        new: "Nová",
        paid: "Zaplacená",
        processing: "Zpracovává se",
        shipped: "Expedovaná",
        waiting_for_supplier: "Čeká na dodavatele",
      },
      table: {
        empty: "Žádné objednávky nenalezeny.",
        loading: "Načítám...",
      },
      title: "Stavy objednávek",
      toast: {
        saveError: "Nepodařilo se uložit stav objednávky",
        saveSuccess: "Stav objednávky uložen",
      },
    },
  },
  en: {
    orderBusinessStatuses: {
      columns: {
        businessStatus: "Order status",
        created: "Created",
        customer: "Customer",
        manualStatus: "Manual status",
        order: "Order",
        total: "Total",
      },
      manualStatus: {
        clear: "Clear manual status",
        placeholder: "Update status",
        saving: "Saving...",
      },
      menuItem: "Order statuses",
      pagination: {
        next: "Next",
        of: "of",
        pages: "pages",
        previous: "Previous",
        results: "results",
      },
      statuses: {
        awaiting_payment: "Awaiting payment",
        canceled: "Canceled",
        delivered: "Delivered",
        new: "New",
        paid: "Paid",
        processing: "Processing",
        shipped: "Shipped",
        waiting_for_supplier: "Waiting for supplier",
      },
      table: {
        empty: "No orders found.",
        loading: "Loading...",
      },
      title: "Order statuses",
      toast: {
        saveError: "Failed to save order status",
        saveSuccess: "Order status saved",
      },
    },
  },
}

export default resources
