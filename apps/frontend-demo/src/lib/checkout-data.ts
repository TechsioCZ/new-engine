import type { Country, PaymentMethod, ShippingMethod } from "@/types/checkout"

const STANDARD_DELIVERY_MESSAGE = "Doručení za 2-3 pracovní dny"

const getDeliveryDate = (daysToAdd: number) => {
  const date = new Date()
  date.setDate(date.getDate() + daysToAdd)
  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    weekday: "short",
  })
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    delivery: STANDARD_DELIVERY_MESSAGE,
    deliveryDate: `Doručení ${getDeliveryDate(2)} - ${getDeliveryDate(3)}`,
    description: "Doručení na adresu",
    id: "ppl",
    image: "/assets/ppl.webp",
    name: "PPL",
    price: 89,
    priceFormatted: "89 Kč",
  },
  {
    delivery: "Doručení za 1-2 pracovní dny",
    deliveryDate: `Doručení ${getDeliveryDate(1)} - ${getDeliveryDate(2)}`,
    description: "Expresní doručení",
    id: "dhl",
    image: "/assets/dhl.webp",
    name: "DHL",
    price: 129,
    priceFormatted: "129 Kč",
  },
  {
    delivery: STANDARD_DELIVERY_MESSAGE,
    deliveryDate: `Doručení ${getDeliveryDate(2)} - ${getDeliveryDate(3)}`,
    description: "Výdejní místa po celé ČR",
    id: "zasilkovna",
    image: "/assets/zasilkovna.webp",
    name: "Zásilkovna",
    price: 65,
    priceFormatted: "65 Kč",
  },
  {
    delivery: STANDARD_DELIVERY_MESSAGE,
    deliveryDate: `Doručení ${getDeliveryDate(2)} - ${getDeliveryDate(3)}`,
    description: "Široká síť výdejních míst",
    id: "balikovna",
    image: "/assets/balikovna.webp",
    name: "Balíkovna",
    price: 59,
    priceFormatted: "59 Kč",
  },
  {
    delivery: "Připraveno ihned",
    deliveryDate: "Vyzvednutí dnes",
    description: "Vyzvednutí na prodejně",
    id: "personal",
    image: "/assets/instore.webp",
    name: "Osobní odběr",
    price: 0,
    priceFormatted: "Zdarma",
  },
]

export const PAYMENT_METHODS: PaymentMethod[] = [
  { fee: 0, id: "comgate", image: "/assets/comgate.webp", name: "Comgate" },
  { fee: 0, id: "gopay", image: "/assets/gpay.webp", name: "GoPay" },
  { fee: 50, id: "paypal", image: "/assets/paypal.webp", name: "PayPal" },
  { fee: 30, id: "cash", image: "/assets/cash.webp", name: "Dobírkou" },
  { fee: 0, id: "skippay", image: "/assets/skippay.webp", name: "SkipPay" },
  { fee: 0, id: "stripe", image: "/assets/stripe.webp", name: "Stripe" },
  { fee: 0, id: "card", image: "/assets/card.webp", name: "Platební kartou" },
  { fee: 0, id: "qr", image: "/assets/qr.webp", name: "QR platba" },
]

export const COUNTRIES: Country[] = [
  { label: "Česká republika", value: "cz" },
  { label: "Slovensko", value: "sk" },
  { label: "Polsko", value: "pl" },
  { label: "Německo", value: "de" },
  { label: "Rakousko", value: "at" },
]
