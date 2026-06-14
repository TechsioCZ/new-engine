export type PplWidgetConfig = {
  accessPointCode?: string
  allowedCountries?: string[]
  centeredToAddress?: string
  centeredToLat?: number
  centeredToLon?: number
  closeButtonVisible?: boolean
  codRequired?: boolean
  countriesMenuDisabled?: boolean
  defaultCountry?: string
  defaultLang?: string
  disabledAccessPointTypes?: string[]
  packageHeight?: number
  packageLength?: number
  packageWeight?: number
  packageWidth?: number
  viewMode?: "inline" | "modal"
}

export type PplAccessPoint = {
  acceptedSizes?: string[] | null
  address?: {
    city?: string | null
    country?: string | null
    countryCode?: string | null
    gps?: { lat?: number; lon?: number } | null
    street?: string | null
    zipCode?: string | null
  } | null
  capacityStatus?: string | null
  code?: string | null
  name?: string | null
  paymentMethods?: {
    card?: boolean
    cash?: boolean
    onlineRequired?: boolean
  } | null
  type?: string | null
}

export type PplWidgetError = {
  code: string
  message: string
}

export type PplWidgetHandle = {
  close: () => void
  getSelectedAccessPoint: () => PplAccessPoint | null
  open: () => void
  reset: () => void
}

export type PplWidgetElement = HTMLElement & {
  close?: () => void
  configure?: (options: Partial<PplWidgetConfig>) => void
  getSelectedAccessPoint?: () => PplAccessPoint | null
  open?: () => void
  reset?: () => void
}
