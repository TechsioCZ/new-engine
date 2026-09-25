/**
 * Fixtures for the `Pages/Akros admin/*` stories.
 *
 * Shaped after the Akros back office: orders paid through Comgate or on
 * delivery, shipped to parcel boxes and pickup points with their own IDs,
 * handed to ABRA as a text line; products and the category tree owned by
 * ABRA and completed in the CMS; B2C and B2B customers side by side.
 * Values are fictional but realistic (CZK, Czech carriers, IČO/DIČ).
 */
import type { TreeNode } from "../../../src/molecules/tree-view"

export const czk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
})

export const count = new Intl.NumberFormat("cs-CZ")

/* ------------------------------------------------------------------ nav --- */

export const akrosNav: TreeNode[] = [
  {
    id: "home",
    name: "Home",
    icons: { leaf: "icon-[mdi--view-dashboard-outline]" },
  },
  {
    id: "orders",
    name: "Orders",
    icons: { leaf: "icon-[mdi--receipt-text-outline]" },
  },
  {
    id: "customers-group",
    name: "Customers",
    icons: { branch: "icon-[mdi--account-group-outline]" },
    children: [
      {
        id: "customers",
        name: "All customers",
        icons: { leaf: "icon-[mdi--account-multiple-outline]" },
      },
      {
        id: "customers-duplicates",
        name: "Possible duplicates",
        icons: { leaf: "icon-[mdi--account-multiple-check-outline]" },
      },
      {
        id: "carts",
        name: "Carts",
        icons: { leaf: "icon-[mdi--cart-outline]" },
      },
    ],
  },
  {
    id: "catalog",
    name: "Catalog",
    icons: { branch: "icon-[mdi--tag-outline]" },
    children: [
      {
        id: "products",
        name: "Products",
        icons: { leaf: "icon-[mdi--package-variant-closed]" },
      },
      {
        id: "categories",
        name: "Categories",
        icons: { leaf: "icon-[mdi--file-tree-outline]" },
      },
      {
        id: "feeds",
        name: "Product feeds",
        icons: { leaf: "icon-[mdi--rss]" },
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    icons: { branch: "icon-[mdi--bullhorn-outline]" },
    children: [
      {
        id: "banner",
        name: "Main banner",
        icons: { leaf: "icon-[mdi--image-area]" },
      },
      {
        id: "content",
        name: "Pages & blog",
        icons: { leaf: "icon-[mdi--file-document-outline]" },
      },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    icons: { branch: "icon-[mdi--cog-outline]" },
    children: [
      {
        id: "shipping-payments",
        name: "Shipping & payment",
        icons: { leaf: "icon-[mdi--truck-outline]" },
      },
      {
        id: "emails",
        name: "Customer emails",
        icons: { leaf: "icon-[mdi--email-outline]" },
      },
    ],
  },
]

/* ------------------------------------------------------------ dashboard --- */

export type DailyMetric = { day: string; metric: string; value: number }

const days = [
  "1 Sep",
  "2 Sep",
  "3 Sep",
  "4 Sep",
  "5 Sep",
  "6 Sep",
  "7 Sep",
  "8 Sep",
  "9 Sep",
  "10 Sep",
  "11 Sep",
  "12 Sep",
  "13 Sep",
  "14 Sep",
]

const revenueSeries = [
  182, 204, 197, 221, 176, 98, 84, 236, 241, 219, 258, 202, 104, 91,
]
const orderSeries = [61, 68, 64, 73, 59, 34, 29, 79, 81, 72, 86, 67, 36, 31]
const visitSeries = [
  2140, 2310, 2270, 2480, 2050, 1320, 1190, 2610, 2690, 2440, 2830, 2290, 1410,
  1260,
]

/** Revenue in thousands of CZK, split B2C / B2B so the chart can stack it. */
export const revenueByDay: DailyMetric[] = days.flatMap((day, index) => {
  const total = revenueSeries[index] ?? 0
  const b2b = Math.round(total * 0.58)
  return [
    { day, metric: "B2B", value: b2b },
    { day, metric: "B2C", value: total - b2b },
  ]
})

export const ordersByDay: DailyMetric[] = days.map((day, index) => ({
  day,
  metric: "Orders",
  value: orderSeries[index] ?? 0,
}))

export const visitsByDay: DailyMetric[] = days.map((day, index) => ({
  day,
  metric: "Visits",
  value: visitSeries[index] ?? 0,
}))

export const trafficSources = [
  { source: "Organic search", visits: 11_840 },
  { source: "Google Ads", visits: 7310 },
  { source: "Direct", visits: 5920 },
  { source: "Comparison sites", visits: 3480 },
  { source: "Email", visits: 1740 },
]

export const customerMix = [
  { segment: "B2C returning", customers: 1184 },
  { segment: "B2C new", customers: 642 },
  { segment: "B2B", customers: 418 },
]

/* --------------------------------------------------------------- orders --- */

export type OrderState =
  | "new"
  | "processing"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled"

export type PaymentMethod = "comgate" | "transfer" | "cod" | "invoice"

export type PaymentState = "paid" | "unpaid" | "pending" | "failed" | "refunded"

export type AbraState = "not-sent" | "queued" | "sent" | "error"

export type Carrier =
  | "Zásilkovna"
  | "PPL ParcelBox"
  | "PPL"
  | "Balíkovna"
  | "Personal pickup"

export type AkOrder = {
  id: string
  number: string
  customer: string
  company?: string
  customerType: "B2C" | "B2B"
  email: string
  phone: string
  total: number
  items: number
  state: OrderState
  paymentMethod: PaymentMethod
  payment: PaymentState
  /** Comgate transaction id — only for online payments. */
  transactionId?: string
  carrier: Carrier
  /** Parcel box / pickup point — only for point-based carriers. */
  pointId?: string
  pointName?: string
  abra: AbraState
  abraDocument?: string
  abraError?: string
  placedAt: string
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  comgate: "Comgate (card / bank button)",
  transfer: "Bank transfer",
  cod: "Cash on delivery",
  invoice: "Invoice (B2B)",
}

export const orderStateOptions = [
  { label: "New", value: "new" },
  { label: "Processing", value: "processing" },
  { label: "Ready to ship", value: "ready" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
]

export const paymentStateOptions = [
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Awaiting gateway", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
]

export const paymentMethodOptions = [
  { label: "Comgate", value: "comgate" },
  { label: "Bank transfer", value: "transfer" },
  { label: "Cash on delivery", value: "cod" },
  { label: "Invoice (B2B)", value: "invoice" },
]

export const carrierOptions = [
  { label: "Zásilkovna", value: "Zásilkovna" },
  { label: "PPL ParcelBox", value: "PPL ParcelBox" },
  { label: "PPL", value: "PPL" },
  { label: "Balíkovna", value: "Balíkovna" },
  { label: "Personal pickup", value: "Personal pickup" },
]

export const abraStateOptions = [
  { label: "Not sent", value: "not-sent" },
  { label: "Queued", value: "queued" },
  { label: "In ABRA", value: "sent" },
  { label: "Transfer failed", value: "error" },
]

export const akOrders: AkOrder[] = [
  {
    id: "o-10431",
    number: "2026-10431",
    customer: "Jana Procházková",
    customerType: "B2C",
    email: "jana.prochazkova@email.cz",
    phone: "+420 603 118 442",
    total: 2486,
    items: 3,
    state: "new",
    paymentMethod: "comgate",
    payment: "unpaid",
    transactionId: "AB12-CD34-EF56",
    carrier: "Zásilkovna",
    pointId: "Z-11873",
    pointName: "Praha 4, Budějovická 1667/64 (Albert)",
    abra: "not-sent",
    placedAt: "2026-09-14 09:12",
  },
  {
    id: "o-10430",
    number: "2026-10430",
    customer: "Petr Svoboda",
    company: "Svoboda Elektro s.r.o.",
    customerType: "B2B",
    email: "nakup@svoboda-elektro.cz",
    phone: "+420 777 210 998",
    total: 38_920,
    items: 14,
    state: "processing",
    paymentMethod: "invoice",
    payment: "unpaid",
    carrier: "PPL",
    abra: "sent",
    abraDocument: "OP-2026/08812",
    placedAt: "2026-09-14 08:47",
  },
  {
    id: "o-10429",
    number: "2026-10429",
    customer: "Lucie Králová",
    customerType: "B2C",
    email: "lucie.kralova@seznam.cz",
    phone: "+420 732 554 120",
    total: 1190,
    items: 2,
    state: "ready",
    paymentMethod: "comgate",
    payment: "paid",
    transactionId: "QX77-PL21-MM90",
    carrier: "PPL ParcelBox",
    pointId: "KM12065427",
    pointName: "ParcelBox Brno, Kotlářská 51a",
    abra: "sent",
    abraDocument: "OP-2026/08809",
    placedAt: "2026-09-13 21:05",
  },
  {
    id: "o-10428",
    number: "2026-10428",
    customer: "Martin Dvořák",
    customerType: "B2C",
    email: "m.dvorak@gmail.com",
    phone: "+420 604 887 301",
    total: 3640,
    items: 5,
    state: "new",
    paymentMethod: "comgate",
    payment: "failed",
    transactionId: "ZT48-KW10-RR22",
    carrier: "Balíkovna",
    pointId: "B-73411",
    pointName: "Balíkovna Ostrava 1, Poštovní 1368/20",
    abra: "not-sent",
    placedAt: "2026-09-13 18:30",
  },
  {
    id: "o-10427",
    number: "2026-10427",
    customer: "Eva Horáková",
    company: "Horák & syn, v.o.s.",
    customerType: "B2B",
    email: "eva@horakasyn.cz",
    phone: "+420 721 330 415",
    total: 12_760,
    items: 8,
    state: "shipped",
    paymentMethod: "transfer",
    payment: "paid",
    carrier: "PPL",
    abra: "sent",
    abraDocument: "OP-2026/08801",
    placedAt: "2026-09-13 11:22",
  },
  {
    id: "o-10426",
    number: "2026-10426",
    customer: "Tomáš Beneš",
    customerType: "B2C",
    email: "tomas.benes@post.cz",
    phone: "+420 608 402 776",
    total: 874,
    items: 1,
    state: "processing",
    paymentMethod: "cod",
    payment: "unpaid",
    carrier: "Zásilkovna",
    pointId: "Z-4402",
    pointName: "Plzeň, Americká 42 (Trafika U Nádraží)",
    abra: "error",
    abraError: "Customer address has no ZIP code — ABRA rejected the order.",
    placedAt: "2026-09-12 16:48",
  },
  {
    id: "o-10425",
    number: "2026-10425",
    customer: "Kateřina Veselá",
    customerType: "B2C",
    email: "katka.vesela@email.cz",
    phone: "+420 739 115 604",
    total: 5320,
    items: 6,
    state: "delivered",
    paymentMethod: "comgate",
    payment: "paid",
    transactionId: "HB91-TT03-LA58",
    carrier: "PPL ParcelBox",
    pointId: "KM12001822",
    pointName: "ParcelBox Praha 7, Dukelských hrdinů 47",
    abra: "sent",
    abraDocument: "OP-2026/08790",
    placedAt: "2026-09-11 13:10",
  },
  {
    id: "o-10424",
    number: "2026-10424",
    customer: "Ondřej Marek",
    customerType: "B2C",
    email: "ondrej.marek@seznam.cz",
    phone: "+420 776 204 519",
    total: 1455,
    items: 2,
    state: "new",
    paymentMethod: "comgate",
    payment: "pending",
    transactionId: "VN63-GH88-OP14",
    carrier: "Personal pickup",
    pointId: "AKR-PHA",
    pointName: "Akros showroom Praha 9",
    abra: "not-sent",
    placedAt: "2026-09-14 09:40",
  },
  {
    id: "o-10423",
    number: "2026-10423",
    customer: "Radek Fiala",
    company: "Fiala stavby s.r.o.",
    customerType: "B2B",
    email: "objednavky@fialastavby.cz",
    phone: "+420 602 991 037",
    total: 21_300,
    items: 11,
    state: "cancelled",
    paymentMethod: "comgate",
    payment: "refunded",
    transactionId: "CC20-RF17-UU41",
    carrier: "PPL",
    abra: "sent",
    abraDocument: "OP-2026/08774",
    placedAt: "2026-09-10 10:02",
  },
]

export type AkOrderLine = {
  code: string
  name: string
  saleUnit: number
  qty: number
  unitPrice: number
}

export const akOrderLines: AkOrderLine[] = [
  {
    code: "SRB-4X40-ZN",
    name: "Wood screw 4 × 40 mm, zinc, countersunk",
    saleUnit: 100,
    qty: 200,
    unitPrice: 1.9,
  },
  {
    code: "PAS-STAH-200",
    name: "Cable tie 200 × 4.8 mm, black",
    saleUnit: 50,
    qty: 100,
    unitPrice: 2.4,
  },
  {
    code: "RUK-NIT-L",
    name: "Nitrile work gloves, size L",
    saleUnit: 10,
    qty: 10,
    unitPrice: 164.6,
  },
]

export type OrderEvent = {
  id: string
  title: string
  detail: string
  at: string
}

export const unpaidOrderEvents: OrderEvent[] = [
  {
    id: "e-4",
    title: "Payment reminder sent",
    detail: "Automatic email with a new Comgate payment link",
    at: "14 Sep, 11:12",
  },
  {
    id: "e-3",
    title: "Comgate: payment not completed",
    detail: "Customer left the gateway · transaction AB12-CD34-EF56 CANCELLED",
    at: "14 Sep, 09:19",
  },
  {
    id: "e-2",
    title: "Redirected to Comgate",
    detail: "Card payment · 2 486 Kč",
    at: "14 Sep, 09:13",
  },
  {
    id: "e-1",
    title: "Order placed",
    detail: "Web · Zásilkovna Z-11873",
    at: "14 Sep, 09:12",
  },
]

/* ------------------------------------------------------------ customers --- */

export type AkCustomer = {
  id: string
  name: string
  email: string
  phone: string
  type: "B2C" | "B2B"
  company?: string
  ico?: string
  dic?: string
  city: string
  orders: number
  revenue: number
  lastOrder: string
  registeredAt: string
  priceList: string
  /** Shared key for records that look like the same person. */
  duplicateGroup?: string
}

export const customerTypeOptions = [
  { label: "B2C", value: "B2C" },
  { label: "B2B", value: "B2B" },
]

export const akCustomers: AkCustomer[] = [
  {
    id: "c-2081",
    name: "Jana Procházková",
    email: "jana.prochazkova@email.cz",
    phone: "+420 603 118 442",
    type: "B2C",
    city: "Praha",
    orders: 7,
    revenue: 14_860,
    lastOrder: "2026-09-14",
    registeredAt: "2023-03-02",
    priceList: "Retail",
    duplicateGroup: "prochazkova",
  },
  {
    id: "c-3310",
    name: "Jana Procházková",
    email: "prochazkova.jana@gmail.com",
    phone: "+420 603 118 442",
    type: "B2C",
    city: "Praha 4",
    orders: 1,
    revenue: 1120,
    lastOrder: "2025-11-20",
    registeredAt: "2025-11-20",
    priceList: "Retail",
    duplicateGroup: "prochazkova",
  },
  {
    id: "c-1402",
    name: "Petr Svoboda",
    email: "nakup@svoboda-elektro.cz",
    phone: "+420 777 210 998",
    type: "B2B",
    company: "Svoboda Elektro s.r.o.",
    ico: "27114821",
    dic: "CZ27114821",
    city: "Kladno",
    orders: 64,
    revenue: 1_284_300,
    lastOrder: "2026-09-14",
    registeredAt: "2019-06-11",
    priceList: "B2B — tier 2",
  },
  {
    id: "c-2950",
    name: "Lucie Králová",
    email: "lucie.kralova@seznam.cz",
    phone: "+420 732 554 120",
    type: "B2C",
    city: "Brno",
    orders: 12,
    revenue: 18_430,
    lastOrder: "2026-09-13",
    registeredAt: "2022-01-17",
    priceList: "Retail",
  },
  {
    id: "c-1877",
    name: "Eva Horáková",
    email: "eva@horakasyn.cz",
    phone: "+420 721 330 415",
    type: "B2B",
    company: "Horák & syn, v.o.s.",
    ico: "45310289",
    dic: "CZ45310289",
    city: "Olomouc",
    orders: 38,
    revenue: 402_760,
    lastOrder: "2026-09-13",
    registeredAt: "2020-09-04",
    priceList: "B2B — tier 1",
  },
  {
    id: "c-3122",
    name: "Radek Fiala",
    email: "radek.fiala@seznam.cz",
    phone: "+420 602 991 037",
    type: "B2C",
    city: "Hradec Králové",
    orders: 9,
    revenue: 46_900,
    lastOrder: "2026-08-29",
    registeredAt: "2024-02-12",
    priceList: "Retail",
    duplicateGroup: "fiala",
  },
  {
    id: "c-3301",
    name: "Radek Fiala",
    email: "objednavky@fialastavby.cz",
    phone: "+420 602 991 037",
    type: "B2B",
    company: "Fiala stavby s.r.o.",
    ico: "08831247",
    dic: "CZ08831247",
    city: "Hradec Králové",
    orders: 3,
    revenue: 58_100,
    lastOrder: "2026-09-10",
    registeredAt: "2025-10-01",
    priceList: "B2B — tier 3",
    duplicateGroup: "fiala",
  },
  {
    id: "c-2716",
    name: "Tomáš Beneš",
    email: "tomas.benes@post.cz",
    phone: "+420 608 402 776",
    type: "B2C",
    city: "Plzeň",
    orders: 4,
    revenue: 5210,
    lastOrder: "2026-09-12",
    registeredAt: "2024-07-30",
    priceList: "Retail",
  },
]

/* ---------------------------------------------------------------- carts --- */

export type CartState = "active" | "saved" | "shared" | "abandoned" | "ordered"

export type AkCart = {
  id: string
  name: string
  customer: string
  customerType: "B2C" | "B2B"
  items: number
  total: number
  state: CartState
  updatedAt: string
  /** Staff member who prepared the cart for the customer, if any. */
  preparedBy?: string
}

export const cartStateOptions = [
  { label: "Active", value: "active" },
  { label: "Saved", value: "saved" },
  { label: "Shared", value: "shared" },
  { label: "Abandoned", value: "abandoned" },
  { label: "Ordered", value: "ordered" },
]

export const akCarts: AkCart[] = [
  {
    id: "k-901",
    name: "Hala Kladno — spojovací materiál",
    customer: "Svoboda Elektro s.r.o.",
    customerType: "B2B",
    items: 22,
    total: 48_310,
    state: "saved",
    updatedAt: "2026-09-14 08:20",
  },
  {
    id: "k-902",
    name: "Nabídka pro Fiala stavby",
    customer: "Fiala stavby s.r.o.",
    customerType: "B2B",
    items: 9,
    total: 17_640,
    state: "shared",
    updatedAt: "2026-09-13 15:02",
    preparedBy: "Nora Kessler",
  },
  {
    id: "k-903",
    name: "Cart",
    customer: "Martin Dvořák",
    customerType: "B2C",
    items: 5,
    total: 3640,
    state: "abandoned",
    updatedAt: "2026-09-13 18:31",
  },
  {
    id: "k-904",
    name: "Dílna — měsíční nákup",
    customer: "Horák & syn, v.o.s.",
    customerType: "B2B",
    items: 14,
    total: 12_760,
    state: "ordered",
    updatedAt: "2026-09-13 11:22",
  },
  {
    id: "k-905",
    name: "Cart",
    customer: "Lucie Králová",
    customerType: "B2C",
    items: 2,
    total: 1190,
    state: "active",
    updatedAt: "2026-09-14 09:51",
  },
]

/* ------------------------------------------------------------- products --- */

export type AkProduct = {
  id: string
  /** ABRA stock card code — the join key between ABRA and the CMS. */
  code: string
  name: string
  category: string
  price: number
  stock: number
  /** Indivisible sale unit — the product is only sold in multiples of this. */
  saleUnit: number
  minQty: number
  /** Parcel dimensions in cm and weight in kg, used to pick a carrier. */
  length?: number
  width?: number
  height?: number
  weight?: number
  hasImage: boolean
  hasDescription: boolean
  importedAt: string
}

export const akProducts: AkProduct[] = [
  {
    id: "p-1",
    code: "SRB-4X40-ZN",
    name: "Wood screw 4 × 40 mm, zinc, countersunk",
    category: "Fasteners › Wood screws",
    price: 1.9,
    stock: 48_000,
    saleUnit: 100,
    minQty: 100,
    length: 12,
    width: 8,
    height: 4,
    weight: 0.42,
    hasImage: true,
    hasDescription: true,
    importedAt: "2026-06-02",
  },
  {
    id: "p-2",
    code: "PAS-STAH-200",
    name: "Cable tie 200 × 4.8 mm, black",
    category: "Electrical › Cable management",
    price: 2.4,
    stock: 12_500,
    saleUnit: 50,
    minQty: 50,
    length: 22,
    width: 6,
    height: 2,
    weight: 0.11,
    hasImage: true,
    hasDescription: true,
    importedAt: "2026-06-02",
  },
  {
    id: "p-3",
    code: "RUK-NIT-L",
    name: "Nitrile work gloves, size L",
    category: "Safety › Gloves",
    price: 164.6,
    stock: 860,
    saleUnit: 10,
    minQty: 10,
    length: 26,
    width: 13,
    height: 7,
    weight: 0.5,
    hasImage: true,
    hasDescription: false,
    importedAt: "2026-08-01",
  },
  {
    id: "p-4",
    code: "KOT-CHEM-300",
    name: "Chemical anchor, polyester, 300 ml",
    category: "Fasteners › Anchors",
    price: 219,
    stock: 340,
    saleUnit: 1,
    minQty: 1,
    hasImage: false,
    hasDescription: false,
    importedAt: "2026-09-01",
  },
  {
    id: "p-5",
    code: "PAS-IZOL-19",
    name: "Insulating tape 19 mm × 20 m, blue",
    category: "Electrical › Tapes",
    price: 34.9,
    stock: 2100,
    saleUnit: 10,
    minQty: 10,
    length: 10,
    width: 10,
    height: 12,
    weight: 0.38,
    hasImage: true,
    hasDescription: true,
    importedAt: "2026-06-02",
  },
  {
    id: "p-6",
    code: "ZEB-HLI-2500",
    name: "Aluminium ladder, 3 × 9 rungs",
    category: "Tools › Ladders",
    price: 5890,
    stock: 18,
    saleUnit: 1,
    minQty: 1,
    hasImage: true,
    hasDescription: false,
    importedAt: "2026-09-01",
  },
  {
    id: "p-7",
    code: "HMO-UNI-M8",
    name: "Universal dowel M8 × 50",
    category: "Fasteners › Anchors",
    price: 3.2,
    stock: 22_400,
    saleUnit: 25,
    minQty: 25,
    hasImage: false,
    hasDescription: false,
    importedAt: "2026-09-01",
  },
]

/** A product is complete in the CMS once every CMS-owned field is filled. */
export function missingCmsFields(product: AkProduct): string[] {
  const missing: string[] = []
  if (!product.hasImage) {
    missing.push("image")
  }
  if (!product.hasDescription) {
    missing.push("description")
  }
  if (product.length === undefined || product.weight === undefined) {
    missing.push("shipping dimensions")
  }
  return missing
}

/* ----------------------------------------------------------- categories --- */

export type AkCategory = {
  id: string
  name: string
  abraCode: string
  products: number
  hasImage: boolean
  children?: AkCategory[]
}

export const akCategories: AkCategory[] = [
  {
    id: "cat-fasteners",
    name: "Fasteners",
    abraCode: "100",
    products: 1842,
    hasImage: true,
    children: [
      {
        id: "cat-wood-screws",
        name: "Wood screws",
        abraCode: "100.10",
        products: 624,
        hasImage: true,
      },
      {
        id: "cat-anchors",
        name: "Anchors",
        abraCode: "100.20",
        products: 318,
        hasImage: false,
      },
      {
        id: "cat-bolts",
        name: "Bolts & nuts",
        abraCode: "100.30",
        products: 900,
        hasImage: true,
      },
    ],
  },
  {
    id: "cat-electrical",
    name: "Electrical",
    abraCode: "200",
    products: 1106,
    hasImage: true,
    children: [
      {
        id: "cat-cable",
        name: "Cable management",
        abraCode: "200.10",
        products: 402,
        hasImage: true,
      },
      {
        id: "cat-tapes",
        name: "Tapes",
        abraCode: "200.20",
        products: 96,
        hasImage: false,
      },
      {
        id: "cat-lighting",
        name: "Work lighting",
        abraCode: "200.30",
        products: 0,
        hasImage: false,
      },
    ],
  },
  {
    id: "cat-safety",
    name: "Safety",
    abraCode: "300",
    products: 512,
    hasImage: false,
    children: [
      {
        id: "cat-gloves",
        name: "Gloves",
        abraCode: "300.10",
        products: 204,
        hasImage: true,
      },
      {
        id: "cat-eyewear",
        name: "Eyewear",
        abraCode: "300.20",
        products: 88,
        hasImage: false,
      },
    ],
  },
  {
    id: "cat-tools",
    name: "Tools",
    abraCode: "400",
    products: 734,
    hasImage: true,
    children: [
      {
        id: "cat-ladders",
        name: "Ladders",
        abraCode: "400.10",
        products: 41,
        hasImage: true,
      },
    ],
  },
]

/* ------------------------------------------------- shipping & payment --- */

export type ShippingMethod = {
  id: string
  name: string
  carrier: Carrier
  /** Needs a parcel box / pickup point picked in checkout. */
  pointBased: boolean
  price: number
  /** Order total (CZK) from which the method is free; 0 = never free. */
  freeFrom: number
  maxWeight: number
  /** Longest parcel side in cm. */
  maxLength: number
  customers: "all" | "B2C" | "B2B"
  payments: PaymentMethod[]
  enabled: boolean
  /** The literal line ABRA receives — ABRA knows nothing else about it. */
  abraText: string
}

export const shippingMethods: ShippingMethod[] = [
  {
    id: "sh-zasilkovna",
    name: "Zásilkovna — pickup point",
    carrier: "Zásilkovna",
    pointBased: true,
    price: 79,
    freeFrom: 2000,
    maxWeight: 10,
    maxLength: 70,
    customers: "all",
    payments: ["comgate", "transfer", "cod"],
    enabled: true,
    abraText: "Doprava: Zásilkovna výdejní místo",
  },
  {
    id: "sh-parcelbox",
    name: "PPL ParcelBox",
    carrier: "PPL ParcelBox",
    pointBased: true,
    price: 89,
    freeFrom: 2000,
    maxWeight: 20,
    maxLength: 60,
    customers: "all",
    payments: ["comgate", "transfer"],
    enabled: true,
    abraText: "Doprava: PPL ParcelBox",
  },
  {
    id: "sh-ppl",
    name: "PPL — courier to address",
    carrier: "PPL",
    pointBased: false,
    price: 139,
    freeFrom: 5000,
    maxWeight: 31.5,
    maxLength: 200,
    customers: "all",
    payments: ["comgate", "transfer", "cod", "invoice"],
    enabled: true,
    abraText: "Doprava: PPL kurýr",
  },
  {
    id: "sh-balikovna",
    name: "Balíkovna",
    carrier: "Balíkovna",
    pointBased: true,
    price: 69,
    freeFrom: 0,
    maxWeight: 20,
    maxLength: 100,
    customers: "B2C",
    payments: ["comgate", "cod"],
    enabled: false,
    abraText: "Doprava: Balíkovna",
  },
  {
    id: "sh-pickup",
    name: "Personal pickup — Akros Praha 9",
    carrier: "Personal pickup",
    pointBased: false,
    price: 0,
    freeFrom: 0,
    maxWeight: 500,
    maxLength: 600,
    customers: "all",
    payments: ["comgate", "transfer", "invoice"],
    enabled: true,
    abraText: "Doprava: Osobní odběr Praha 9",
  },
]

export type PaymentConfig = {
  id: PaymentMethod
  name: string
  fee: number
  customers: "all" | "B2C" | "B2B"
  maxOrder: number
  enabled: boolean
  abraText: string
}

export const paymentConfigs: PaymentConfig[] = [
  {
    id: "comgate",
    name: "Card or bank button (Comgate)",
    fee: 0,
    customers: "all",
    maxOrder: 200_000,
    enabled: true,
    abraText: "Platba: Comgate online",
  },
  {
    id: "transfer",
    name: "Bank transfer in advance",
    fee: 0,
    customers: "all",
    maxOrder: 500_000,
    enabled: true,
    abraText: "Platba: převodem předem",
  },
  {
    id: "cod",
    name: "Cash on delivery",
    fee: 39,
    customers: "B2C",
    maxOrder: 20_000,
    enabled: true,
    abraText: "Platba: dobírka",
  },
  {
    id: "invoice",
    name: "Invoice, 14 days",
    fee: 0,
    customers: "B2B",
    maxOrder: 300_000,
    enabled: true,
    abraText: "Platba: faktura splatnost 14 dní",
  },
]

/* ---------------------------------------------------------------- banner --- */

export type BannerSlide = {
  id: string
  title: string
  subtitle: string
  cta: string
  link: string
  image: string
  from: string
  to: string
  live: boolean
}

export const bannerSlides: BannerSlide[] = [
  {
    id: "b-1",
    title: "Autumn fastener week",
    subtitle: "−15 % on wood screws and anchors until 30 September",
    cta: "Shop fasteners",
    link: "/kategorie/sparovaci-material",
    image:
      "https://images.unsplash.com/photo-1581147036324-c1c89c2c8b5c?w=1600",
    from: "2026-09-15",
    to: "2026-09-30",
    live: true,
  },
  {
    id: "b-2",
    title: "Free delivery to ParcelBox",
    subtitle: "On every order over 2 000 Kč",
    cta: "How it works",
    link: "/doprava-a-platba",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600",
    from: "2026-09-01",
    to: "2026-12-31",
    live: true,
  },
  {
    id: "b-3",
    title: "New: work lighting range",
    subtitle: "LED floodlights and head torches from 390 Kč",
    cta: "Discover",
    link: "/kategorie/pracovni-osvetleni",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600",
    from: "2026-10-01",
    to: "2026-10-31",
    live: false,
  },
]

/* ---------------------------------------------------------------- content --- */

export type AkContent = {
  id: string
  title: string
  kind: "page" | "article"
  slug: string
  status: "published" | "draft" | "scheduled"
  seoOk: boolean
  updatedAt: string
}

export const akContent: AkContent[] = [
  {
    id: "pg-1",
    title: "About Akros",
    kind: "page",
    slug: "/o-nas",
    status: "published",
    seoOk: true,
    updatedAt: "2026-05-12",
  },
  {
    id: "pg-2",
    title: "Contact",
    kind: "page",
    slug: "/kontakt",
    status: "published",
    seoOk: true,
    updatedAt: "2026-08-02",
  },
  {
    id: "pg-3",
    title: "Shipping & payment",
    kind: "page",
    slug: "/doprava-a-platba",
    status: "published",
    seoOk: false,
    updatedAt: "2026-09-01",
  },
  {
    id: "ar-1",
    title: "How to choose the right wall anchor",
    kind: "article",
    slug: "/blog/jak-vybrat-hmozdinku",
    status: "published",
    seoOk: true,
    updatedAt: "2026-07-18",
  },
  {
    id: "ar-2",
    title: "Chemical anchors: when a dowel is not enough",
    kind: "article",
    slug: "/blog/chemicke-kotvy",
    status: "scheduled",
    seoOk: true,
    updatedAt: "2026-09-12",
  },
  {
    id: "ar-3",
    title: "Workshop safety checklist",
    kind: "article",
    slug: "/blog/bezpecnost-v-dilne",
    status: "draft",
    seoOk: false,
    updatedAt: "2026-09-13",
  },
]

/* ----------------------------------------------------------------- feeds --- */

export type ProductFeed = {
  id: string
  name: string
  format: string
  url: string
  products: number
  errors: number
  generatedAt: string
  schedule: string
  healthy: boolean
}

export const productFeeds: ProductFeed[] = [
  {
    id: "f-google",
    name: "Google Merchant Center",
    format: "Google XML",
    url: "https://www.akros.cz/feeds/google.xml",
    products: 4188,
    errors: 0,
    generatedAt: "2026-09-14 06:00",
    schedule: "Every 6 hours",
    healthy: true,
  },
  {
    id: "f-heureka",
    name: "Heureka.cz",
    format: "Heureka XML",
    url: "https://www.akros.cz/feeds/heureka.xml",
    products: 4102,
    errors: 86,
    generatedAt: "2026-09-14 06:00",
    schedule: "Every 6 hours",
    healthy: false,
  },
  {
    id: "f-zbozi",
    name: "Zboží.cz",
    format: "Zboží XML",
    url: "https://www.akros.cz/feeds/zbozi.xml",
    products: 4102,
    errors: 0,
    generatedAt: "2026-09-14 06:00",
    schedule: "Every 6 hours",
    healthy: true,
  },
  {
    id: "f-meta",
    name: "Meta catalogue",
    format: "CSV",
    url: "https://www.akros.cz/feeds/meta.csv",
    products: 3950,
    errors: 0,
    generatedAt: "2026-09-14 00:00",
    schedule: "Daily at 00:00",
    healthy: true,
  },
]

/* ---------------------------------------------------------------- emails --- */

export type EmailTemplate = {
  id: string
  name: string
  trigger: string
  audience: "all" | "B2C" | "B2B"
  enabled: boolean
  subject: string
  updatedAt: string
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: "em-confirm",
    name: "Order confirmation",
    trigger: "Order placed",
    audience: "all",
    enabled: true,
    subject: "Objednávka {{order.number}} přijata",
    updatedAt: "2026-06-10",
  },
  {
    id: "em-unpaid",
    name: "Payment not completed",
    trigger: "Comgate payment cancelled or failed",
    audience: "all",
    enabled: true,
    subject: "Dokončete platbu objednávky {{order.number}}",
    updatedAt: "2026-09-02",
  },
  {
    id: "em-paid",
    name: "Payment received",
    trigger: "Payment marked paid",
    audience: "all",
    enabled: true,
    subject: "Platba za objednávku {{order.number}} přijata",
    updatedAt: "2026-06-10",
  },
  {
    id: "em-shipped",
    name: "Order shipped",
    trigger: "Order state → Shipped",
    audience: "all",
    enabled: true,
    subject: "Objednávka {{order.number}} je na cestě",
    updatedAt: "2026-06-10",
  },
  {
    id: "em-pickup",
    name: "Ready at pickup point",
    trigger: "Carrier: parcel stored at point",
    audience: "all",
    enabled: true,
    subject: "Zásilka čeká na {{shipping.point_name}}",
    updatedAt: "2026-07-21",
  },
  {
    id: "em-cart",
    name: "Shared cart",
    trigger: "Staff shares a prepared cart",
    audience: "B2B",
    enabled: true,
    subject: "Připravili jsme pro vás košík {{cart.name}}",
    updatedAt: "2026-08-14",
  },
  {
    id: "em-b2b",
    name: "B2B account approved",
    trigger: "Customer moved to B2B",
    audience: "B2B",
    enabled: false,
    subject: "Váš firemní účet je aktivní",
    updatedAt: "2026-05-03",
  },
]

export const emailVariables = [
  { token: "{{customer.first_name}}", sample: "Jana" },
  { token: "{{order.number}}", sample: "2026-10431" },
  { token: "{{order.total}}", sample: "2 486 Kč" },
  { token: "{{payment.link}}", sample: "https://payments.comgate.cz/…" },
  { token: "{{shipping.method}}", sample: "Zásilkovna — pickup point" },
  { token: "{{shipping.point_name}}", sample: "Praha 4, Budějovická 1667/64" },
  { token: "{{shipping.point_id}}", sample: "Z-11873" },
]
