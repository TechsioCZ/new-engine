/**
 * Czech catalog of every word @techsio/ui-kit shows or announces on its own. Pass it once:
 *
 *   <UiMessagesProvider locale="cs-CZ" messages={csUiMessages}>…</UiMessagesProvider>
 *
 * It is complete (`UiMessages`, not a partial input), so a new kit message cannot ship without its
 * Czech text. The `translations` entries are the zag-js machine labels in Czech.
 *
 * This module is plain data, safe to import from server code.
 */
import type { UiDateSegment, UiMessages } from "./ui-messages"

const segments: Record<UiDateSegment, string> = {
  era: "Letopočet",
  year: "Rok",
  month: "Měsíc",
  day: "Den",
  hour: "Hodina",
  minute: "Minuta",
  second: "Sekunda",
  dayPeriod: "Část dne",
  timeZoneName: "Časové pásmo",
}

type DateView = "day" | "month" | "year"

const viewName = (view: DateView): string => {
  if (view === "year") {
    return "zobrazení let"
  }
  return view === "month" ? "zobrazení měsíců" : "zobrazení dnů"
}

export const csUiMessages: UiMessages = {
  locale: "cs-CZ",
  label: { required: "(povinné)" },
  skeleton: { loading: "Načítání obsahu" },
  rating: {
    label: "Hodnocení",
    averageDescription: "Průměrné hodnocení",
    valueText: ({ label, value, count }) =>
      `${label ? `${label}: ` : ""}${value} z ${count}`,
    itemValueText: (value) => `Hodnocení ${value}`,
    translations: {
      ratingValueText: (index) => `Hodnocení ${index}`,
    },
  },
  numericInput: {
    translations: {
      incrementLabel: "Zvýšit hodnotu",
      decrementLabel: "Snížit hodnotu",
    },
  },
  accordion: {},
  carousel: {
    translations: {
      nextTrigger: "Další snímek",
      prevTrigger: "Předchozí snímek",
      indicator: (index) => `Přejít na snímek ${index + 1}`,
      item: (index, count) => `${index + 1} z ${count}`,
      autoplayStart: "Spustit automatické přehrávání",
      autoplayStop: "Zastavit automatické přehrávání",
    },
  },
  player: {
    label: "Přehrávač médií",
    play: "Přehrát",
    pause: "Pozastavit",
    mute: "Ztlumit",
    unmute: "Zapnout zvuk",
    enterFullscreen: "Na celou obrazovku",
    exitFullscreen: "Ukončit celou obrazovku",
    seekForwardAnnouncement: "Posunuto vpřed",
    seekBackwardAnnouncement: "Posunuto zpět",
    enterPictureInPicture: "Obraz v obraze",
    exitPictureInPicture: "Ukončit obraz v obraze",
    loading: "Načítání média…",
    error: "Médium se nepodařilo načíst.",
    retry: "Zkusit znovu",
    enableCaptions: "Zapnout titulky",
    disableCaptions: "Vypnout titulky",
    settings: "Nastavení přehrávání",
    playbackSpeed: "Rychlost přehrávání",
    normalSpeed: "Normální",
    subtitles: "Titulky",
    subtitlesOff: "Vypnuto",
    videoQuality: "Kvalita videa",
    autoQuality: "Automaticky",
    chapters: "Kapitoly",
    seekForward: (seconds) => `Posunout vpřed o ${seconds} s`,
    seekBackward: (seconds) => `Posunout zpět o ${seconds} s`,
    seek: "Posun",
    timeValueText: ({ currentTime, duration }) =>
      `${currentTime} z ${duration}`,
    live: "Živě",
    volume: "Hlasitost",
  },
  cascadeSelect: {
    placeholder: "Vyberte možnost",
    clear: "Zrušit výběr",
    rootLabel: "Možnosti",
  },
  chart: {
    dataTableLabel: "Zobrazit data grafu",
    emptyLabel: "Žádná data k zobrazení.",
    invalidLabel:
      "Hodnoty koláčového grafu musí být konečná nezáporná čísla s kladným součtem.",
    seriesHeader: "Řada",
    categoryHeader: "Kategorie",
    valueHeader: "Hodnota",
  },
  colorSelect: {
    label: "Barva",
    selectColor: (color) => `Vybrat barvu ${color}`,
    readOnly: "Výběr barvy jen pro čtení",
  },
  combobox: {
    placeholder: "Vyberte možnost",
    noResults: "Pro „{inputValue}“ nic nenalezeno",
    loading: "Načítání výsledků",
    retry: "Zkusit znovu",
    clear: "Vymazat hodnotu",
    chooseSuggestion: "Vyberte jednu z nabízených možností.",
    selectedValues: "Vybrané hodnoty",
    selectedStatus: (selected) => `Vybráno: ${selected}`,
    removeValue: (value) => `Odebrat ${value}`,
    translations: {
      triggerLabel: "Zobrazit návrhy",
      clearTriggerLabel: "Vymazat",
    },
  },
  datePicker: {
    segments,
    emptySegment: "Prázdné",
    incompleteValue: "Před odesláním vyplňte celé datum a čas.",
    unavailableValue: "Zadejte dostupné datum a čas.",
    outOfRange: ({ min, max }) =>
      `Zvolte dostupné datum a čas${min ? ` od ${min}` : ""}${max ? ` do ${max}` : ""}.`,
    start: "Začátek",
    end: "Konec",
    time: "Čas",
    startTime: "Čas začátku",
    endTime: "Čas konce",
    startAndEndTimes: "Čas začátku a konce",
    dayPeriod: "Část dne",
    am: "dop.",
    pm: "odp.",
    dayPeriodOf: (field) => `${field}, část dne`,
    cancel: "Zrušit",
    confirm: "Potvrdit",
    translations: {
      clearTrigger: "Vymazat datum",
      content: "Kalendář",
      dayCell: (state) => {
        if (state.unavailable) {
          return `Nedostupné. ${state.valueText}`
        }
        if (state.firstInRange) {
          return `Začátek rozsahu ${state.valueText}`
        }
        if (state.lastInRange) {
          return `Konec rozsahu ${state.valueText}`
        }
        if (state.inRange) {
          return `V rozsahu. ${state.valueText}`
        }
        return state.selected
          ? `Vybrané datum. ${state.valueText}`
          : `Vybrat ${state.valueText}`
      },
      monthSelect: "Vybrat měsíc",
      yearSelect: "Vybrat rok",
      nextTrigger: (view) => {
        if (view === "year") {
          return "Další desetiletí"
        }
        return view === "month" ? "Další rok" : "Další měsíc"
      },
      prevTrigger: (view) => {
        if (view === "year") {
          return "Předchozí desetiletí"
        }
        return view === "month" ? "Předchozí rok" : "Předchozí měsíc"
      },
      presetTrigger: ([start = "", end = ""]) => `Vybrat ${start} až ${end}`,
      trigger: (open) => (open ? "Zavřít kalendář" : "Otevřít kalendář"),
      viewTrigger: (view, nextView) =>
        nextView === undefined
          ? viewName(view)
          : `Přepnout na ${viewName(nextView)}`,
      weekColumnHeader: "Týd.",
      weekNumberCell: (weekNumber) => `Týden ${weekNumber}`,
    },
  },
  dialog: { open: "Otevřít", close: "Zavřít dialog" },
  drawer: { close: "Zavřít panel" },
  fileUpload: {
    processingFailed:
      "Soubory se nepodařilo zpracovat. Pro nový pokus je vyberte znovu.",
    readOnly: "Soubory jen pro čtení. Nahrávání ani odebírání není dostupné.",
    clear: "Odebrat soubory",
    translations: {
      dropzone: "Oblast pro přetažení souborů",
      itemPreview: (file) => `Náhled souboru ${file.name}`,
      deleteFile: (file) => `Odebrat soubor ${file.name}`,
    },
  },
  formErrorSummary: { title: "Formulář obsahuje chyby" },
  menu: { trigger: "Nabídka" },
  pagination: {
    unavailable: "Stránka není dostupná. Zvolte stránku v rámci výsledků.",
    compact: ({ page, totalPages }) => `${page} z ${totalPages}`,
    translations: {
      rootLabel: "Stránkování",
      firstTriggerLabel: "První stránka",
      prevTriggerLabel: "Předchozí stránka",
      nextTriggerLabel: "Další stránka",
      lastTriggerLabel: "Poslední stránka",
      itemLabel: ({ page }) => `Strana ${page}`,
    },
  },
  phoneInput: {
    placeholder: "Telefonní číslo",
    invalid: "Zadejte platné telefonní číslo.",
    countries: {
      SK: "Slovensko",
      CZ: "Česko",
      HU: "Maďarsko",
      RO: "Rumunsko",
      PL: "Polsko",
      AT: "Rakousko",
      DE: "Německo",
    },
  },
  popover: {
    close: "Zavřít",
    details: "Podrobnosti",
    translations: { closeTriggerLabel: "Zavřít" },
  },
  searchForm: {
    placeholder: "Hledat…",
    search: "Hledat",
    clear: (query) => `Vymazat hledání: ${query}`,
  },
  select: {
    placeholder: "Vyberte možnost",
    clear: "Zrušit výběr",
    readOnly: "Výběr jen pro čtení",
    translations: { clearTriggerLabel: "Zrušit výběr" },
  },
  steps: { progress: "Průběh kroků", complete: "Hotovo" },
  tabs: { translations: { listLabel: "Karty" } },
  toast: {
    close: "Zavřít oznámení",
    loading: "Probíhá…",
    region: "Oznámení",
  },
  bulkActionBar: {
    selected: (count) => `Vybráno: ${count}`,
    clear: "Zrušit výběr",
  },
  saveBar: {
    save: "Uložit",
    saving: "Ukládám…",
    saved: "Uloženo",
    unsaved: "Neuložené změny",
    invalid: "Neuložené změny – opravte zvýrazněná pole",
    failed: "Uložení se nezdařilo. Zkuste to znovu.",
    proposed: "Odesláno ke schválení – změna zatím nebyla provedena",
    conflict: "Záznam mezitím změnil někdo jiný.",
    reloadLatest: "Načíst aktuální verzi",
    reloadRequired:
      "Mezitím byla nasazena nová verze aplikace. Načtěte stránku, vaše úpravy se obnoví.",
    reloadKeepingDrafts: "Načíst novou verzi a obnovit úpravy",
  },
  unsavedChanges: {
    title: "Neuložené změny",
    description: "Máte neuložené změny. Chcete je před odchodem uložit?",
    save: "Uložit",
    saving: "Ukládám…",
    discard: "Zahodit změny",
    stay: "Zůstat",
  },
  sidePanel: {
    close: "Zavřít",
    resize:
      "Změnit šířku panelu. Šipkami vlevo a vpravo šířku změníte, klávesou Home ji vrátíte.",
    draftKept: "Neuložené změny zůstaly zachované.",
    closeWithoutSaving: "Zavřít bez uložení",
  },
  detailViewMode: {
    label: "Otevírat detail",
    page: "Na celé stránce",
    panel: "V postranním panelu",
  },
  tour: {
    guidance: "Průvodce",
    translations: {
      progressText: ({ current, total }) => `${current + 1} z ${total}`,
      nextStep: "Další",
      prevStep: "Zpět",
      close: "Zavřít",
      skip: "Přeskočit průvodce",
    },
  },
  treeView: {
    expand: (name) => `Rozbalit ${name}`,
    collapse: (name) => `Sbalit ${name}`,
    translations: {
      treeLabel: "Strom",
      renameInputLabel: "Přejmenovat",
    },
  },
  dataTable: {
    scrollLabel: "Posouvatelné záznamy",
    searchPlaceholder: "Hledat…",
    searchLabel: "Hledat",
    clearSearchLabel: "Vymazat hledání",
    searchButtonLabel: "Odeslat hledání",
    columnsLabel: "Nastavení sloupců",
    emptyTitle: "Žádné záznamy",
    emptyDescription: "Nejsou žádná data k zobrazení.",
    pageSizeLabel: "Řádků na stránku",
    actionsLabel: "Akce",
    filtersLabel: "Filtry sloupců",
    selectAllLabel: "Vybrat všechny řádky",
    selectionLabel: "Vybrat řádky",
    reorderLabel: "Změnit pořadí řádků",
    loadingLabel: "Načítání dat",
    operatorLabels: {
      contains: "Obsahuje",
      notContains: "Neobsahuje",
      equals: "Rovná se",
      notEquals: "Nerovná se",
      startsWith: "Začíná na",
      endsWith: "Končí na",
      empty: "Je prázdné",
      notEmpty: "Není prázdné",
      between: "Mezi",
    },
    numberOperatorLabels: {
      equals: "=",
      notEquals: "≠",
      gt: ">",
      gte: "≥",
      lt: "<",
      lte: "≤",
      between: "Mezi",
      empty: "Je prázdné",
      notEmpty: "Není prázdné",
    },
    rowFallbackLabel: (rowId) => `řádek ${rowId}`,
    editingLabel: "Upravuje se řádek – ostatní ovládání tabulky je uzamčené",
    rangeLabel: ({ start, end, total }) => `${start}–${end} z ${total}`,
    pageLabel: ({ page, pageCount }) =>
      pageCount == null ? `Strana ${page}` : `Strana ${page} z ${pageCount}`,
    previousPageLabel: "Předchozí stránka",
    nextPageLabel: "Další stránka",
    paginationPendingLabel:
      "Stránka není dostupná – načítá se dostupná stránka.",
    invalidRangeLabel: "Zadejte platná data, začátek nejpozději v den konce.",
    savePendingLabel: "Ukládám řádek…",
    saveErrorLabel:
      "Řádek se nepodařilo uložit. Změny zůstaly zachované, zkuste znovu Uložit.",
    requiredLabel: "Před uložením řádku vyplňte hodnotu.",
    selectRowLabel: (rowLabel) => `Vybrat ${rowLabel}`,
    editRowLabel: (rowLabel) => `Upravit ${rowLabel}`,
    dragHandleLabel: (label) => `Přetažením změníte pořadí: ${label}`,
    reorderInstructions:
      "Pořadí změníte tak, že zaměříte úchyt a stisknete mezerník nebo Enter. " +
      "Řádky posouvejte šipkami nahoru a dolů, sloupce šipkami vlevo a vpravo. " +
      "Mezerníkem nebo Enterem položku pustíte, klávesou Escape akci zrušíte.",
    reorderPickedUp: ({ label, position }) =>
      `Zvednuto: ${label}, pozice ${position}.`,
    reorderMoving: ({ label, target, side }) =>
      `${label} se přesune ${side === "before" ? "před" : "za"} ${target}.`,
    reorderDropped: ({ label, position }) =>
      `Puštěno: ${label}, pozice ${position}.`,
    reorderCanceled: (label) => `Změna pořadí zrušena: ${label}.`,
    resizeColumnLabel: (column) => `Změnit šířku sloupce ${column}`,
    resizeColumnDescription:
      "Šířku měníte šipkami vlevo a vpravo, s klávesou Shift po 50 pixelech. Enter šířku obnoví.",
    cancelEditLabel: "Zrušit úpravy",
    saveRowLabel: "Uložit řádek",
    expandRowLabel: "Rozbalit řádek",
    collapseRowLabel: "Sbalit řádek",
    filterLabel: (column) => `Filtrovat ${column}`,
    filterConditionLabel: (column) => `Podmínka filtru pro ${column}`,
    filterConditionValueLabel: ({ column, condition }) =>
      `Podmínka filtru pro ${column}: ${condition}`,
    filterValueLabel: (column) => `Hodnota filtru pro ${column}`,
    filterUpperBoundLabel: (column) => `Horní mez filtru pro ${column}`,
    filterFromLabel: (column) => `Filtrovat ${column} od`,
    filterToLabel: (column) => `Filtrovat ${column} do`,
    filterValuePlaceholder: "Hodnota",
    filterFromPlaceholder: "Od",
    filterToPlaceholder: "Do",
    filterAllLabel: "Vše",
    booleanTrueLabel: "Ano",
    booleanFalseLabel: "Ne",
    editCellLabel: (column) => `Upravit ${column}`,
    editCellFromLabel: (column) => `Upravit ${column} od`,
    editCellToLabel: (column) => `Upravit ${column} do`,
  },
  gallery: {
    images: "Obrázky produktu",
    showSlide: (index) => `Zobrazit snímek ${index}`,
  },
  header: { toggleMenu: "Přepnout mobilní nabídku" },
  facetFilterPanel: {
    activeFilters: "Aktivní filtry",
    reset: "Zrušit filtry",
    showMore: (hiddenCount) => `Zobrazit dalších ${hiddenCount}`,
    showLess: "Zobrazit méně",
    minimum: (group) => `${group} – minimum`,
    maximum: (group) => `${group} – maximum`,
  },
  productCard: {
    originalPrice: "Původní cena",
    currentPrice: "Aktuální cena",
    addToCart: "Do košíku",
    viewDetails: "Zobrazit detail",
    addToWishlist: "Přidat do oblíbených",
  },
  themeToggle: {
    brand: "Značka",
    mode: "Režim",
    light: "Světlý",
    dark: "Tmavý",
    system: "Podle systému",
  },
}
