import type { Country, ShippingMethod } from "@/types/checkout"

const getDeliveryDate = (daysToAdd: number) => {
  const date = new Date()
  date.setDate(date.getDate() + daysToAdd)
  return date.toLocaleDateString("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  })
}

type ShippingMethodMetadata = ShippingMethod & {
  providerIds?: string[]
  typeCodes?: string[]
  nameAliases?: string[]
}

const normalizeShippingKey = (value?: string | null) =>
  value?.trim().toLowerCase()

const hasNormalizedMatch = (
  values: string[] | undefined,
  target: string | null | undefined
) => {
  const normalizedTarget = normalizeShippingKey(target)
  return Boolean(
    normalizedTarget &&
      values?.some((value) => normalizeShippingKey(value) === normalizedTarget)
  )
}

export const SHIPPING_METHODS: ShippingMethodMetadata[] = [
  {
    id: "ppl",
    name: "PPL",
    description: "Doručení na adresu",
    price: 89,
    priceFormatted: "89 Kč",
    delivery: "Doručení za 2-3 pracovní dny",
    deliveryDate: `Doručení ${getDeliveryDate(2)} - ${getDeliveryDate(3)}`,
    image: "/assets/ppl.webp",
    providerIds: ["ppl_ppl"],
    typeCodes: [
      "ppl-private",
      "ppl-private-cod",
      "ppl-parcel-smart",
      "ppl-parcel-smart-cod",
    ],
    nameAliases: ["ppl private", "ppl parcel smart", "ppl parcel smart cod"],
  },
  {
    id: "dhl",
    name: "DHL",
    description: "Expresní doručení",
    price: 129,
    priceFormatted: "129 Kč",
    delivery: "Doručení za 1-2 pracovní dny",
    deliveryDate: `Doručení ${getDeliveryDate(1)} - ${getDeliveryDate(2)}`,
    image: "/assets/dhl.webp",
    providerIds: ["dhl_dhl"],
    typeCodes: ["dhl", "dhl-cod"],
  },
  {
    id: "zasilkovna",
    name: "Zásilkovna",
    description: "Výdejní místa po celé ČR",
    price: 65,
    priceFormatted: "65 Kč",
    delivery: "Doručení za 2-3 pracovní dny",
    deliveryDate: `Doručení ${getDeliveryDate(2)} - ${getDeliveryDate(3)}`,
    image: "/assets/zasilkovna.webp",
    providerIds: ["packeta_packeta", "zasilkovna_zasilkovna"],
    typeCodes: ["zasilkovna", "zasilkovna-cod", "packeta"],
    nameAliases: ["packeta", "zasilkovna", "zásilkovna"],
  },
  {
    id: "balikovna",
    name: "Balíkovna",
    description: "Široká síť výdejních míst",
    price: 59,
    priceFormatted: "59 Kč",
    delivery: "Doručení za 2-3 pracovní dny",
    deliveryDate: `Doručení ${getDeliveryDate(2)} - ${getDeliveryDate(3)}`,
    image: "/assets/balikovna.webp",
    providerIds: ["balikovna_baliko", "ceskaposta_baliko"],
    typeCodes: ["balikovna", "balikovna-cod", "cp-balikovna"],
    nameAliases: ["balikovna", "balíkovna"],
  },
  {
    id: "personal",
    name: "Osobní odběr",
    description: "Vyzvednutí na prodejně",
    price: 0,
    priceFormatted: "Zdarma",
    delivery: "Připraveno ihned",
    deliveryDate: "Vyzvednutí dnes",
    image: "/assets/instore.webp",
    providerIds: ["manual_manual", "in_store_in_store"],
    typeCodes: ["pickup", "personal-pickup", "store-pickup"],
    nameAliases: ["osobni odber", "osobní odběr", "pickup"],
  },
]

export const resolveShippingMethodMetadata = (input: {
  providerId?: string
  typeCode?: string
  name?: string
}) => {
  const providerId = input.providerId
  const typeCode = input.typeCode
  const normalizedName = normalizeShippingKey(input.name)

  return (
    SHIPPING_METHODS.find((method) =>
      hasNormalizedMatch(method.typeCodes, typeCode)
    ) ??
    SHIPPING_METHODS.find((method) =>
      hasNormalizedMatch(method.providerIds, providerId)
    ) ??
    SHIPPING_METHODS.find(
      (method) =>
        normalizeShippingKey(method.name) === normalizedName ||
        hasNormalizedMatch(method.nameAliases, normalizedName)
    )
  )
}

export const COUNTRIES: Country[] = [
  { label: "Česká republika", value: "cz" },
  { label: "Slovensko", value: "sk" },
  { label: "Polsko", value: "pl" },
  { label: "Německo", value: "de" },
  { label: "Rakousko", value: "at" },
]
