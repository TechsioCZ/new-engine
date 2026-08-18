import type {
  AccountChildKey,
  CheckoutChildKey,
  FlowRootKey,
  Market,
  ReviewChildKey,
  StaticRootPageKey,
  TypePrefixKey,
} from "./types"

export const MARKETS = [
  "sk",
  "cz",
  "hu",
  "ro",
] as const satisfies readonly Market[]

export const TYPE_PREFIX_KEYS = [
  "products",
  "categories",
  "brands",
  "collections",
  "campaigns",
  "advice",
  "information",
] as const satisfies readonly TypePrefixKey[]

export const FLOW_ROOT_KEYS = [
  "search",
  "cart",
  "checkout",
  "account",
  "reviews",
] as const satisfies readonly FlowRootKey[]

export const STATIC_ROOT_PAGE_KEYS = [
  "about",
  "contact",
  "faq",
  "shipping",
  "returns",
  "terms",
  "privacy",
  "cookies",
] as const satisfies readonly StaticRootPageKey[]

export const LEGAL_STATIC_ROOT_PAGE_KEYS = [
  "terms",
  "privacy",
  "cookies",
] as const satisfies readonly StaticRootPageKey[]

export const CHECKOUT_CHILD_KEYS = [
  "contact",
  "shipping",
  "payment",
  "review",
  "paymentReturn",
  "confirmation",
  "checkoutResult",
] as const satisfies readonly CheckoutChildKey[]

export const ACCOUNT_CHILD_KEYS = [
  "lists",
  "orders",
  "settings",
  "login",
  "register",
  "forgotPassword",
  "resetPassword",
] as const satisfies readonly AccountChildKey[]

export const REVIEW_CHILD_KEYS = [
  "product",
] as const satisfies readonly ReviewChildKey[]
