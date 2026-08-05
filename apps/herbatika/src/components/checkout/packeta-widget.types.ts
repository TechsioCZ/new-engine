type PacketaWidgetLanguage =
  | "bg"
  | "cs"
  | "da"
  | "de"
  | "el"
  | "en"
  | "es"
  | "et"
  | "fi"
  | "fr"
  | "hr"
  | "hu"
  | "it"
  | "lt"
  | "lv"
  | "nl"
  | "pl"
  | "pt"
  | "ro"
  | "ru"
  | "sk"
  | "sl"
  | "sv"
  | "uk"

interface PacketaWidgetVendor {
  carrierId?: string
  country?: string
  currency?: string
  group?: "" | "alzabox" | "zbox"
  price?: number
  selected?: boolean
}

export interface PacketaWidgetOptions {
  appIdentity?: string
  country?: string
  defaultCurrency?: string
  defaultPrice?: number
  language?: PacketaWidgetLanguage
  latitude?: number
  longitude?: number
  vendors?: PacketaWidgetVendor[]
  webUrl?: string
  weight?: number
}

export interface PacketaPickupPoint {
  carrierId?: string | null
  carrierPickupPointId?: string | null
  city?: string | null
  country?: string | null
  error?: string | null
  gps?: { lat?: number; lon?: number } | null
  group?: string | null
  id?: string | null
  name?: string | null
  pickupPointType?: string | null
  place?: string | null
  street?: string | null
  warning?: string | null
  zip?: string | null
}

export interface PacketaWidgetError {
  code: string
  message: string
}

export interface PacketaWidgetHandle {
  close: () => void
  open: () => void
}

export interface PacketaWidgetGlobal {
  Widget: {
    close: () => void
    pick: (
      apiKey: string,
      callback: (point: PacketaPickupPoint | null) => void,
      options?: PacketaWidgetOptions,
      inElement?: HTMLElement
    ) => void
  }
}

declare global {
  // Window augmentation requires interface merging.
  interface Window {
    Packeta?: PacketaWidgetGlobal
  }
}
