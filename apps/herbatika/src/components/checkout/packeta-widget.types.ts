export type PacketaWidgetLanguage =
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
  | "uk";

export type PacketaWidgetVendor = {
  carrierId?: string;
  country?: string;
  currency?: string;
  group?: "" | "alzabox" | "zbox";
  price?: number;
  selected?: boolean;
};

export type PacketaWidgetOptions = {
  appIdentity?: string;
  country?: string;
  defaultCurrency?: string;
  defaultPrice?: number;
  language?: PacketaWidgetLanguage;
  latitude?: number;
  longitude?: number;
  vendors?: PacketaWidgetVendor[];
  webUrl?: string;
  weight?: number;
};

export type PacketaPickupPoint = {
  carrierId?: string | null;
  carrierPickupPointId?: string | null;
  city?: string | null;
  country?: string | null;
  error?: string | null;
  gps?: { lat?: number; lon?: number } | null;
  group?: string | null;
  id?: string | null;
  name?: string | null;
  pickupPointType?: string | null;
  place?: string | null;
  street?: string | null;
  warning?: string | null;
  zip?: string | null;
};

export type PacketaWidgetError = {
  code: string;
  message: string;
};

export type PacketaWidgetHandle = {
  close: () => void;
  open: () => void;
};

export type PacketaWidgetGlobal = {
  Widget: {
    close: () => void;
    pick: (
      apiKey: string,
      callback: (point: PacketaPickupPoint | null) => void,
      options?: PacketaWidgetOptions,
      inElement?: HTMLElement,
    ) => void;
  };
};

declare global {
  interface Window {
    Packeta?: PacketaWidgetGlobal;
  }
}
