export default {
  cs: {
    translation: {
      orderCommercialValues: {
        actions: {
          cancel: "Zrušit",
          confirm: "Potvrdit",
          edit: "Upravit",
          preview: "Přepočítat",
        },
        blockers: {
          activeOrderChangeExists:
            "Objednávka už má aktivní změnu {{orderChangeId}}.",
          orderStatusNotEditable:
            "Stav objednávky {{status}} neumožňuje úpravu.",
          unknown: "Objednávku teď nelze upravit.",
        },
        discount: {
          amount: "Částka",
          none: "Žádná",
        },
        errors: {
          invalidValues: "Zadané obchodní hodnoty nejsou platné.",
          loadFailed: "Obchodní hodnoty se nepodařilo načíst.",
          previewFailed: "Přepočet se nepodařil.",
          saveFailed: "Uložení se nepodařilo.",
        },
        fields: {
          internalNote: "Interní poznámka",
          itemDiscount: "Sleva na položku",
          orderDiscount: "Sleva na objednávku",
          unitPrice: "Jednotková cena",
        },
        item: {
          fallbackName: "Položka objednávky",
          line: "Řádek",
          quantity: "Množství",
          sku: "SKU {{sku}}",
        },
        status: {
          loading: "Načítání...",
          locked: "Zamčeno",
          requested: "Změna objednávky byla vyžádána.",
          confirmed: "Změna objednávky byla potvrzena.",
        },
        title: "Obchodní hodnoty",
        totals: {
          delta: "Rozdíl",
          new: "Nový total",
          orderDiscount: "Celková sleva na objednávku",
          original: "Původní total",
        },
      },
    },
  },
  en: {
    translation: {
      orderCommercialValues: {
        actions: {
          cancel: "Cancel",
          confirm: "Confirm",
          edit: "Edit",
          preview: "Preview",
        },
        blockers: {
          activeOrderChangeExists:
            "The order already has active order change {{orderChangeId}}.",
          orderStatusNotEditable:
            "Order status {{status}} does not allow editing.",
          unknown: "The order cannot be edited right now.",
        },
        discount: {
          amount: "Amount",
          none: "None",
        },
        errors: {
          invalidValues: "The commercial values are invalid.",
          loadFailed: "Failed to load commercial values.",
          previewFailed: "Preview failed.",
          saveFailed: "Save failed.",
        },
        fields: {
          internalNote: "Internal note",
          itemDiscount: "Item discount",
          orderDiscount: "Order discount",
          unitPrice: "Unit price",
        },
        item: {
          fallbackName: "Order item",
          line: "Line",
          quantity: "Qty",
          sku: "SKU {{sku}}",
        },
        status: {
          loading: "Loading...",
          locked: "Locked",
          requested: "Order edit requested.",
          confirmed: "Order edit confirmed.",
        },
        title: "Commercial values",
        totals: {
          delta: "Delta",
          new: "New total",
          orderDiscount: "Order discount total",
          original: "Original total",
        },
      },
    },
  },
}
