export type Market = "sk" | "cz" | "hu" | "ro"

export type TypePrefixKey =
  | "products"
  | "categories"
  | "brands"
  | "collections"
  | "campaigns"
  | "advice"
  | "information"

export type FlowRootKey = "search" | "cart" | "checkout" | "account" | "reviews"

export type StaticRootPageKey =
  | "about"
  | "contact"
  | "faq"
  | "shipping"
  | "returns"
  | "terms"
  | "privacy"
  | "cookies"

export type CheckoutChildKey =
  | "contact"
  | "shipping"
  | "payment"
  | "review"
  | "paymentReturn"
  | "confirmation"
  | "checkoutResult"

export type AccountChildKey =
  | "lists"
  | "orders"
  | "settings"
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"

export type ReviewChildKey = "product"

export type SegmentGroup<Key extends string> = Readonly<Record<Key, string>>

export type MarketRouteSegments = Readonly<{
  typePrefixes: SegmentGroup<TypePrefixKey>
  flowRoots: SegmentGroup<FlowRootKey>
  staticRootPages: SegmentGroup<StaticRootPageKey>
  children: Readonly<{
    checkout: SegmentGroup<CheckoutChildKey>
    account: SegmentGroup<AccountChildKey>
    reviews: SegmentGroup<ReviewChildKey>
  }>
}>

export type RouteSegmentRegistry = Readonly<Record<Market, MarketRouteSegments>>

export type SegmentRegistryG1 = Readonly<{
  gate: "G1"
  status: "proposed-unverified"
  requiredBeforePublication: true
  marketEvidence: Readonly<
    Record<
      Market,
      Readonly<{
        editorialApproval: null
        legalApproval: null
        frozenRegistryHash: null
      }>
    >
  >
}>

export type RootSegmentMatch =
  | Readonly<{ group: "type-prefix"; key: TypePrefixKey }>
  | Readonly<{ group: "flow-root"; key: FlowRootKey }>
  | Readonly<{ group: "static-root-page"; key: StaticRootPageKey }>
