/**
 * Shared fixtures for the `Pages/*` composition stories.
 *
 * These stories document *layout and interaction patterns* for admin surfaces
 * (CMS, e-shop back office, CRM). The data is intentionally small but shaped
 * like real back-office data: stable ids, enum-ish statuses and ISO dates, so
 * the DataTable column `meta.type` declarations stay honest.
 */
import type { TreeNode } from "../../src/molecules/tree-view"

/* ------------------------------------------------------------------ nav --- */

export const adminNav: TreeNode[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    icons: { leaf: "icon-[mdi--view-dashboard-outline]" },
  },
  {
    id: "catalog",
    name: "Catalog",
    icons: { branch: "icon-[mdi--tag-outline]" },
    children: [
      {
        id: "catalog-products",
        name: "Products",
        icons: { leaf: "icon-[mdi--package-variant-closed]" },
      },
      {
        id: "catalog-categories",
        name: "Categories",
        icons: { leaf: "icon-[mdi--file-tree-outline]" },
      },
      {
        id: "catalog-brands",
        name: "Brands",
        icons: { leaf: "icon-[mdi--copyright]" },
      },
    ],
  },
  {
    id: "content",
    name: "Content",
    icons: { branch: "icon-[mdi--text-box-outline]" },
    children: [
      {
        id: "content-pages",
        name: "Pages",
        icons: { leaf: "icon-[mdi--file-document-outline]" },
      },
      {
        id: "content-articles",
        name: "Articles",
        icons: { leaf: "icon-[mdi--newspaper-variant-outline]" },
      },
      {
        id: "content-media",
        name: "Media library",
        icons: { leaf: "icon-[mdi--image-multiple-outline]" },
      },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    icons: { branch: "icon-[mdi--cart-outline]" },
    children: [
      {
        id: "sales-orders",
        name: "Orders",
        icons: { leaf: "icon-[mdi--receipt-text-outline]" },
      },
      {
        id: "sales-returns",
        name: "Returns",
        icons: { leaf: "icon-[mdi--keyboard-return]" },
      },
      {
        id: "sales-discounts",
        name: "Discounts",
        icons: { leaf: "icon-[mdi--sale]" },
      },
    ],
  },
  {
    id: "customers",
    name: "Customers",
    icons: { leaf: "icon-[mdi--account-group-outline]" },
  },
  {
    id: "settings",
    name: "Settings",
    icons: { branch: "icon-[mdi--cog-outline]" },
    children: [
      {
        id: "settings-team",
        name: "Team & roles",
        icons: { leaf: "icon-[mdi--account-key-outline]" },
      },
      {
        id: "settings-channels",
        name: "Sales channels",
        icons: { leaf: "icon-[mdi--storefront-outline]" },
      },
    ],
  },
]

export const categoryTree: TreeNode[] = [
  {
    id: "root-apparel",
    name: "Apparel",
    children: [
      { id: "apparel-tshirts", name: "T-shirts" },
      { id: "apparel-hoodies", name: "Hoodies" },
      {
        id: "apparel-outerwear",
        name: "Outerwear",
        children: [
          { id: "outerwear-jackets", name: "Jackets" },
          { id: "outerwear-coats", name: "Coats" },
        ],
      },
    ],
  },
  {
    id: "root-footwear",
    name: "Footwear",
    children: [
      { id: "footwear-sneakers", name: "Sneakers" },
      { id: "footwear-boots", name: "Boots" },
    ],
  },
  { id: "root-accessories", name: "Accessories" },
]

/* -------------------------------------------------------------- content --- */

export type ContentStatus = "published" | "draft" | "scheduled" | "archived"

export type ContentEntry = {
  id: string
  title: string
  slug: string
  section: string
  status: ContentStatus
  author: string
  updatedAt: string
  views: number
}

export const contentStatusOptions = [
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Archived", value: "archived" },
]

export const sectionOptions = [
  { label: "Landing", value: "Landing" },
  { label: "Help center", value: "Help center" },
  { label: "Legal", value: "Legal" },
  { label: "Campaign", value: "Campaign" },
]

export const contentEntries: ContentEntry[] = [
  {
    id: "pg-1001",
    title: "Autumn collection 2026",
    slug: "/autumn-collection",
    section: "Campaign",
    status: "published",
    author: "Nora Kessler",
    updatedAt: "2026-09-04",
    views: 48_210,
  },
  {
    id: "pg-1002",
    title: "Size guide",
    slug: "/help/size-guide",
    section: "Help center",
    status: "published",
    author: "Ivan Petrov",
    updatedAt: "2026-08-28",
    views: 12_884,
  },
  {
    id: "pg-1003",
    title: "Black Friday teaser",
    slug: "/campaign/black-friday",
    section: "Campaign",
    status: "scheduled",
    author: "Nora Kessler",
    updatedAt: "2026-09-10",
    views: 0,
  },
  {
    id: "pg-1004",
    title: "Returns & refunds",
    slug: "/legal/returns",
    section: "Legal",
    status: "published",
    author: "Alicia Moreau",
    updatedAt: "2026-07-19",
    views: 9204,
  },
  {
    id: "pg-1005",
    title: "Homepage — hero test B",
    slug: "/",
    section: "Landing",
    status: "draft",
    author: "Tom Hayes",
    updatedAt: "2026-09-11",
    views: 0,
  },
  {
    id: "pg-1006",
    title: "Shipping & delivery",
    slug: "/help/shipping",
    section: "Help center",
    status: "published",
    author: "Ivan Petrov",
    updatedAt: "2026-06-02",
    views: 21_559,
  },
  {
    id: "pg-1007",
    title: "Privacy policy",
    slug: "/legal/privacy",
    section: "Legal",
    status: "published",
    author: "Alicia Moreau",
    updatedAt: "2026-05-14",
    views: 4310,
  },
  {
    id: "pg-1008",
    title: "Summer sale 2025",
    slug: "/campaign/summer-2025",
    section: "Campaign",
    status: "archived",
    author: "Nora Kessler",
    updatedAt: "2025-09-01",
    views: 63_902,
  },
  {
    id: "pg-1009",
    title: "Loyalty programme",
    slug: "/loyalty",
    section: "Landing",
    status: "draft",
    author: "Tom Hayes",
    updatedAt: "2026-09-09",
    views: 0,
  },
  {
    id: "pg-1010",
    title: "Care instructions",
    slug: "/help/care",
    section: "Help center",
    status: "published",
    author: "Ivan Petrov",
    updatedAt: "2026-04-23",
    views: 7731,
  },
  {
    id: "pg-1011",
    title: "Store locator",
    slug: "/stores",
    section: "Landing",
    status: "published",
    author: "Nora Kessler",
    updatedAt: "2026-08-15",
    views: 15_042,
  },
  {
    id: "pg-1012",
    title: "Terms of service",
    slug: "/legal/terms",
    section: "Legal",
    status: "published",
    author: "Alicia Moreau",
    updatedAt: "2026-05-14",
    views: 3982,
  },
]

/* ------------------------------------------------------------- products --- */

export type ProductStatus = "active" | "draft" | "discontinued"

export type Product = {
  id: string
  sku: string
  name: string
  category: string
  price: number
  stock: number
  status: ProductStatus
  featured: boolean
  updatedAt: string
}

export const productStatusOptions = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Discontinued", value: "discontinued" },
]

export const productCategoryOptions = [
  { label: "T-shirts", value: "T-shirts" },
  { label: "Hoodies", value: "Hoodies" },
  { label: "Jackets", value: "Jackets" },
  { label: "Sneakers", value: "Sneakers" },
  { label: "Accessories", value: "Accessories" },
]

export const products: Product[] = [
  {
    id: "sku-001",
    sku: "TS-CORE-BLK",
    name: "Core cotton tee",
    category: "T-shirts",
    price: 29,
    stock: 412,
    status: "active",
    featured: true,
    updatedAt: "2026-09-08",
  },
  {
    id: "sku-002",
    sku: "HD-HEAVY-GRY",
    name: "Heavyweight hoodie",
    category: "Hoodies",
    price: 89,
    stock: 58,
    status: "active",
    featured: true,
    updatedAt: "2026-09-02",
  },
  {
    id: "sku-003",
    sku: "JK-SHELL-NVY",
    name: "Shell jacket",
    category: "Jackets",
    price: 219,
    stock: 0,
    status: "active",
    featured: false,
    updatedAt: "2026-08-30",
  },
  {
    id: "sku-004",
    sku: "SN-RUN-WHT",
    name: "Runner low",
    category: "Sneakers",
    price: 139,
    stock: 96,
    status: "active",
    featured: false,
    updatedAt: "2026-09-05",
  },
  {
    id: "sku-005",
    sku: "AC-CAP-BLK",
    name: "Logo cap",
    category: "Accessories",
    price: 25,
    stock: 233,
    status: "active",
    featured: false,
    updatedAt: "2026-07-21",
  },
  {
    id: "sku-006",
    sku: "TS-STRIPE-ECR",
    name: "Striped tee",
    category: "T-shirts",
    price: 35,
    stock: 12,
    status: "draft",
    featured: false,
    updatedAt: "2026-09-11",
  },
  {
    id: "sku-007",
    sku: "HD-ZIP-OLV",
    name: "Zip hoodie",
    category: "Hoodies",
    price: 99,
    stock: 7,
    status: "active",
    featured: false,
    updatedAt: "2026-08-12",
  },
  {
    id: "sku-008",
    sku: "SN-TRAIL-BRN",
    name: "Trail mid",
    category: "Sneakers",
    price: 179,
    stock: 44,
    status: "discontinued",
    featured: false,
    updatedAt: "2026-03-17",
  },
]

/* --------------------------------------------------------------- orders --- */

export type OrderStatus =
  | "paid"
  | "pending"
  | "fulfilled"
  | "refunded"
  | "cancelled"

export type Order = {
  id: string
  number: string
  customer: string
  email: string
  channel: string
  items: number
  total: number
  status: OrderStatus
  placedAt: string
}

export const orderStatusOptions = [
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
]

export const channelOptions = [
  { label: "Web", value: "Web" },
  { label: "Mobile app", value: "Mobile app" },
  { label: "Marketplace", value: "Marketplace" },
  { label: "Retail POS", value: "Retail POS" },
]

export const orders: Order[] = [
  {
    id: "ord-5001",
    number: "#10241",
    customer: "Marta Nováková",
    email: "marta.n@example.com",
    channel: "Web",
    items: 3,
    total: 248,
    status: "paid",
    placedAt: "2026-09-11",
  },
  {
    id: "ord-5002",
    number: "#10240",
    customer: "Jonas Berg",
    email: "jberg@example.com",
    channel: "Mobile app",
    items: 1,
    total: 89,
    status: "fulfilled",
    placedAt: "2026-09-11",
  },
  {
    id: "ord-5003",
    number: "#10239",
    customer: "Priya Raman",
    email: "priya@example.com",
    channel: "Marketplace",
    items: 5,
    total: 612,
    status: "pending",
    placedAt: "2026-09-10",
  },
  {
    id: "ord-5004",
    number: "#10238",
    customer: "Luis Ferreira",
    email: "luis.f@example.com",
    channel: "Web",
    items: 2,
    total: 154,
    status: "refunded",
    placedAt: "2026-09-10",
  },
  {
    id: "ord-5005",
    number: "#10237",
    customer: "Anna Weber",
    email: "a.weber@example.com",
    channel: "Retail POS",
    items: 4,
    total: 388,
    status: "fulfilled",
    placedAt: "2026-09-09",
  },
  {
    id: "ord-5006",
    number: "#10236",
    customer: "Tomáš Dvořák",
    email: "t.dvorak@example.com",
    channel: "Web",
    items: 1,
    total: 29,
    status: "cancelled",
    placedAt: "2026-09-09",
  },
  {
    id: "ord-5007",
    number: "#10235",
    customer: "Sofia Rossi",
    email: "sofia.r@example.com",
    channel: "Mobile app",
    items: 6,
    total: 741,
    status: "paid",
    placedAt: "2026-09-08",
  },
  {
    id: "ord-5008",
    number: "#10234",
    customer: "Erik Hansen",
    email: "erik.h@example.com",
    channel: "Web",
    items: 2,
    total: 118,
    status: "fulfilled",
    placedAt: "2026-09-08",
  },
]

export type OrderLine = {
  id: string
  orderId: string
  product: string
  sku: string
  qty: number
  unitPrice: number
}

export const orderLines: OrderLine[] = [
  {
    id: "ln-1",
    orderId: "ord-5001",
    product: "Core cotton tee",
    sku: "TS-CORE-BLK",
    qty: 2,
    unitPrice: 29,
  },
  {
    id: "ln-2",
    orderId: "ord-5001",
    product: "Logo cap",
    sku: "AC-CAP-BLK",
    qty: 1,
    unitPrice: 25,
  },
  {
    id: "ln-3",
    orderId: "ord-5002",
    product: "Heavyweight hoodie",
    sku: "HD-HEAVY-GRY",
    qty: 1,
    unitPrice: 89,
  },
  {
    id: "ln-4",
    orderId: "ord-5003",
    product: "Runner low",
    sku: "SN-RUN-WHT",
    qty: 3,
    unitPrice: 139,
  },
  {
    id: "ln-5",
    orderId: "ord-5003",
    product: "Striped tee",
    sku: "TS-STRIPE-ECR",
    qty: 2,
    unitPrice: 35,
  },
  {
    id: "ln-6",
    orderId: "ord-5005",
    product: "Shell jacket",
    sku: "JK-SHELL-NVY",
    qty: 1,
    unitPrice: 219,
  },
  {
    id: "ln-7",
    orderId: "ord-5007",
    product: "Trail mid",
    sku: "SN-TRAIL-BRN",
    qty: 2,
    unitPrice: 179,
  },
]

/* ------------------------------------------------------------ customers --- */

export type CustomerTier = "lead" | "customer" | "vip" | "churned"

export type Customer = {
  id: string
  name: string
  company: string
  email: string
  phone: string
  tier: CustomerTier
  owner: string
  orders: number
  lifetimeValue: number
  lastActivity: string
}

export const tierOptions = [
  { label: "Lead", value: "lead" },
  { label: "Customer", value: "customer" },
  { label: "VIP", value: "vip" },
  { label: "Churned", value: "churned" },
]

export const ownerOptions = [
  { label: "Nora Kessler", value: "Nora Kessler" },
  { label: "Tom Hayes", value: "Tom Hayes" },
  { label: "Alicia Moreau", value: "Alicia Moreau" },
]

export const customers: Customer[] = [
  {
    id: "cus-01",
    name: "Marta Nováková",
    company: "Nova Retail s.r.o.",
    email: "marta.n@example.com",
    phone: "+420 606 112 004",
    tier: "vip",
    owner: "Nora Kessler",
    orders: 34,
    lifetimeValue: 18_420,
    lastActivity: "2026-09-11",
  },
  {
    id: "cus-02",
    name: "Jonas Berg",
    company: "Bergson AB",
    email: "jberg@example.com",
    phone: "+46 70 555 0198",
    tier: "customer",
    owner: "Tom Hayes",
    orders: 12,
    lifetimeValue: 4380,
    lastActivity: "2026-09-10",
  },
  {
    id: "cus-03",
    name: "Priya Raman",
    company: "Raman Imports",
    email: "priya@example.com",
    phone: "+44 7700 900123",
    tier: "vip",
    owner: "Nora Kessler",
    orders: 51,
    lifetimeValue: 41_205,
    lastActivity: "2026-09-09",
  },
  {
    id: "cus-04",
    name: "Luis Ferreira",
    company: "Atlântico Lda",
    email: "luis.f@example.com",
    phone: "+351 912 345 678",
    tier: "customer",
    owner: "Alicia Moreau",
    orders: 8,
    lifetimeValue: 2110,
    lastActivity: "2026-08-30",
  },
  {
    id: "cus-05",
    name: "Anna Weber",
    company: "Weber Sport GmbH",
    email: "a.weber@example.com",
    phone: "+49 151 23456789",
    tier: "lead",
    owner: "Tom Hayes",
    orders: 0,
    lifetimeValue: 0,
    lastActivity: "2026-09-05",
  },
  {
    id: "cus-06",
    name: "Erik Hansen",
    company: "Nordbutik AS",
    email: "erik.h@example.com",
    phone: "+47 401 22 333",
    tier: "churned",
    owner: "Alicia Moreau",
    orders: 5,
    lifetimeValue: 940,
    lastActivity: "2026-02-18",
  },
]

export type ActivityEntry = {
  id: string
  customerId: string
  kind: "note" | "email" | "call" | "order"
  title: string
  detail: string
  at: string
}

export const activities: ActivityEntry[] = [
  {
    id: "act-1",
    customerId: "cus-01",
    kind: "order",
    title: "Order #10241 placed",
    detail: "3 items · 248 €",
    at: "2026-09-11 09:42",
  },
  {
    id: "act-2",
    customerId: "cus-01",
    kind: "email",
    title: "Autumn preview sent",
    detail: "Opened twice, one click-through.",
    at: "2026-09-08 14:10",
  },
  {
    id: "act-3",
    customerId: "cus-01",
    kind: "call",
    title: "Quarterly check-in",
    detail: "Wants NET-30 terms for Q4 volume.",
    at: "2026-09-01 11:00",
  },
  {
    id: "act-4",
    customerId: "cus-01",
    kind: "note",
    title: "Contract note",
    detail: "Legal reviewing the updated framework agreement.",
    at: "2026-08-27 16:25",
  },
]

/* ---------------------------------------------------------- analytics ----- */

export type RevenuePoint = { month: string; revenue: number; channel: string }

export const revenueByChannel: RevenuePoint[] = [
  { month: "Apr", revenue: 128_000, channel: "Web" },
  { month: "May", revenue: 141_500, channel: "Web" },
  { month: "Jun", revenue: 137_200, channel: "Web" },
  { month: "Jul", revenue: 158_900, channel: "Web" },
  { month: "Aug", revenue: 166_400, channel: "Web" },
  { month: "Sep", revenue: 181_300, channel: "Web" },
  { month: "Apr", revenue: 52_000, channel: "Mobile app" },
  { month: "May", revenue: 61_800, channel: "Mobile app" },
  { month: "Jun", revenue: 68_400, channel: "Mobile app" },
  { month: "Jul", revenue: 74_100, channel: "Mobile app" },
  { month: "Aug", revenue: 88_900, channel: "Mobile app" },
  { month: "Sep", revenue: 101_600, channel: "Mobile app" },
  { month: "Apr", revenue: 33_400, channel: "Marketplace" },
  { month: "May", revenue: 30_200, channel: "Marketplace" },
  { month: "Jun", revenue: 36_900, channel: "Marketplace" },
  { month: "Jul", revenue: 41_300, channel: "Marketplace" },
  { month: "Aug", revenue: 39_800, channel: "Marketplace" },
  { month: "Sep", revenue: 44_500, channel: "Marketplace" },
]

/* --------------------------------------------------------- formatters ----- */

export const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export const compactNumber = new Intl.NumberFormat("en-GB", {
  notation: "compact",
})

/* ----------------------------------------------------------- storefront --- */

export type StorefrontProduct = {
  id: string
  name: string
  brand: string
  price: string
  originalPrice?: string
  image: string
  rating: number
  reviewCount: number
  stock: "in-stock" | "limited-stock" | "out-of-stock"
  stockLabel: string
  badge?: { label: string; variant: "success" | "danger" | "info" | "outline" }
}

const storefrontImages = {
  tshirt: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
  camera: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600",
  backpack: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
  jacket: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600",
  sunglasses:
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600",
}

export const storefrontProducts: StorefrontProduct[] = [
  {
    id: "sf-1",
    name: "Core cotton tee",
    brand: "Northwind",
    price: "29 €",
    image: storefrontImages.tshirt,
    rating: 4.5,
    reviewCount: 128,
    stock: "in-stock",
    stockLabel: "In stock",
    badge: { label: "New", variant: "success" },
  },
  {
    id: "sf-2",
    name: "Runner low",
    brand: "Northwind Sport",
    price: "139 €",
    originalPrice: "179 €",
    image: storefrontImages.shoes,
    rating: 4.8,
    reviewCount: 542,
    stock: "limited-stock",
    stockLabel: "Only 3 left",
    badge: { label: "−22%", variant: "danger" },
  },
  {
    id: "sf-3",
    name: "Field watch 38",
    brand: "Meridian",
    price: "249 €",
    image: storefrontImages.watch,
    rating: 4.2,
    reviewCount: 64,
    stock: "in-stock",
    stockLabel: "In stock",
  },
  {
    id: "sf-4",
    name: "Studio headphones",
    brand: "Aural",
    price: "199 €",
    image: storefrontImages.headphones,
    rating: 4.6,
    reviewCount: 311,
    stock: "in-stock",
    stockLabel: "In stock",
    badge: { label: "Staff pick", variant: "info" },
  },
  {
    id: "sf-5",
    name: "Rangefinder 35",
    brand: "Lumen",
    price: "1 299 €",
    image: storefrontImages.camera,
    rating: 5,
    reviewCount: 23,
    stock: "out-of-stock",
    stockLabel: "Out of stock",
  },
  {
    id: "sf-6",
    name: "Daypack 22L",
    brand: "Northwind",
    price: "89 €",
    image: storefrontImages.backpack,
    rating: 4.4,
    reviewCount: 187,
    stock: "in-stock",
    stockLabel: "In stock",
  },
  {
    id: "sf-7",
    name: "Shell jacket",
    brand: "Northwind",
    price: "219 €",
    originalPrice: "259 €",
    image: storefrontImages.jacket,
    rating: 4.7,
    reviewCount: 96,
    stock: "limited-stock",
    stockLabel: "Low stock",
    badge: { label: "−15%", variant: "danger" },
  },
  {
    id: "sf-8",
    name: "Polarised sunglasses",
    brand: "Meridian",
    price: "119 €",
    image: storefrontImages.sunglasses,
    rating: 4.1,
    reviewCount: 58,
    stock: "in-stock",
    stockLabel: "In stock",
  },
]

export const productGallery = [
  {
    id: "pg-main",
    src: storefrontImages.shoes,
    alt: "Runner low, three-quarter view",
  },
  {
    id: "pg-2",
    src: storefrontImages.tshirt,
    alt: "Runner low, styled with a tee",
  },
  {
    id: "pg-3",
    src: storefrontImages.backpack,
    alt: "Runner low, packed for travel",
  },
  {
    id: "pg-4",
    src: storefrontImages.jacket,
    alt: "Runner low, outdoor setting",
  },
]

export const storefrontNav = [
  { id: "new", label: "New in" },
  { id: "men", label: "Men" },
  { id: "women", label: "Women" },
  { id: "footwear", label: "Footwear" },
  { id: "accessories", label: "Accessories" },
  { id: "sale", label: "Sale" },
]

export const brandFacets = [
  { label: "Northwind", value: "northwind", count: 42 },
  { label: "Northwind Sport", value: "northwind-sport", count: 18 },
  { label: "Meridian", value: "meridian", count: 11 },
  { label: "Aural", value: "aural", count: 7 },
  { label: "Lumen", value: "lumen", count: 4 },
]

export const sizeFacets = ["XS", "S", "M", "L", "XL", "XXL"]

export const colorFacets = [
  { id: "black", color: "#111827", label: "Black", count: 24 },
  { id: "sand", color: "#d8cbb4", label: "Sand", count: 16 },
  { id: "navy", color: "#1e3a5f", label: "Navy", count: 12 },
  { id: "olive", color: "#4d5a3a", label: "Olive", count: 9 },
  { id: "rust", color: "#a34a2a", label: "Rust", count: 5 },
]

export const sortOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "price-asc" },
  { label: "Price: high to low", value: "price-desc" },
  { label: "Top rated", value: "rating" },
]

/* ------------------------------------------------------------- workflow --- */

export type BoardCard = {
  id: string
  title: string
  meta: string
  owner: string
  priority: "low" | "normal" | "high"
}

export const boardColumns: { id: string; title: string; cards: BoardCard[] }[] =
  [
    {
      id: "new",
      title: "New",
      cards: [
        {
          id: "t-1",
          title: "Refund request #10238",
          meta: "Luis Ferreira · 154 €",
          owner: "Unassigned",
          priority: "high",
        },
        {
          id: "t-2",
          title: "Missing size chart — hoodies",
          meta: "Reported by support",
          owner: "Unassigned",
          priority: "normal",
        },
      ],
    },
    {
      id: "progress",
      title: "In progress",
      cards: [
        {
          id: "t-3",
          title: "Marketplace feed rejects 12 SKUs",
          meta: "Integration · since 09-09",
          owner: "Tom Hayes",
          priority: "high",
        },
        {
          id: "t-4",
          title: "Autumn landing copy review",
          meta: "Content · due 09-14",
          owner: "Nora Kessler",
          priority: "normal",
        },
      ],
    },
    {
      id: "review",
      title: "In review",
      cards: [
        {
          id: "t-5",
          title: "Checkout address validation",
          meta: "Engineering · PR #482",
          owner: "Alicia Moreau",
          priority: "normal",
        },
      ],
    },
    {
      id: "done",
      title: "Done",
      cards: [
        {
          id: "t-6",
          title: "Black Friday teaser scheduled",
          meta: "Content · 09-10",
          owner: "Nora Kessler",
          priority: "low",
        },
        {
          id: "t-7",
          title: "Retail POS sync restored",
          meta: "Ops · 09-08",
          owner: "Tom Hayes",
          priority: "high",
        },
      ],
    },
  ]
