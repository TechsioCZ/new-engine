export type GatewayMethod = "DELETE" | "GET" | "POST"

type RouteRule = Readonly<{
  methods: readonly GatewayMethod[]
  pattern: RegExp
}>

const ID = "[A-Za-z0-9_-]{1,160}"

const ROUTE_RULES: readonly RouteRule[] = [
  { methods: ["GET"], pattern: /^\/store\/products$/ },
  {
    methods: ["GET"],
    pattern: new RegExp(
      `^/store/products/${ID}/(?:location-availability|product-attributes|reviews)$`
    ),
  },
  { methods: ["GET"], pattern: /^\/store\/catalog\/products$/ },
  {
    methods: ["GET"],
    pattern: /^\/store\/(?:collections|product-categories|regions)$/,
  },
  {
    methods: ["GET"],
    pattern: new RegExp(
      `^/store/(?:collections|product-categories|regions)/${ID}$`
    ),
  },
  { methods: ["POST"], pattern: /^\/store\/carts$/ },
  { methods: ["GET", "POST"], pattern: new RegExp(`^/store/carts/${ID}$`) },
  {
    methods: ["POST"],
    pattern: new RegExp(
      `^/store/carts/${ID}/(?:complete|customer|line-items|shipping-methods)$`
    ),
  },
  {
    methods: ["DELETE", "POST"],
    pattern: new RegExp(`^/store/carts/${ID}/line-items/${ID}$`),
  },
  { methods: ["GET"], pattern: /^\/store\/shipping-options$/ },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/store/shipping-options/${ID}/calculate$`),
  },
  { methods: ["GET"], pattern: /^\/store\/payment-providers$/ },
  { methods: ["POST"], pattern: /^\/store\/payment-collections$/ },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/store/payment-collections/${ID}/payment-sessions$`),
  },
  { methods: ["POST"], pattern: /^\/store\/customers$/ },
  { methods: ["GET", "POST"], pattern: /^\/store\/customers\/me$/ },
  {
    methods: ["GET", "POST"],
    pattern: /^\/store\/customers\/me\/addresses$/,
  },
  {
    methods: ["DELETE", "GET", "POST"],
    pattern: new RegExp(`^/store/customers/me/addresses/${ID}$`),
  },
  { methods: ["POST"], pattern: /^\/store\/customers\/me\/deactivate$/ },
  {
    methods: ["POST"],
    pattern: /^\/store\/customers\/deactivate\/confirm$/,
  },
  { methods: ["GET"], pattern: /^\/store\/orders$/ },
  { methods: ["GET"], pattern: new RegExp(`^/store/orders/${ID}$`) },
  { methods: ["GET"], pattern: /^\/store\/product-lists$/ },
  {
    methods: ["POST"],
    pattern: /^\/store\/product-lists\/(?:custom|favorites)$/,
  },
  { methods: ["POST"], pattern: /^\/store\/product-lists\/favorites\/items$/ },
  {
    methods: ["GET", "POST", "DELETE"],
    pattern: new RegExp(`^/store/product-lists/${ID}$`),
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/store/product-lists/${ID}/(?:cart|items)$`),
  },
  {
    methods: ["DELETE"],
    pattern: new RegExp(`^/store/product-lists/${ID}/items/${ID}$`),
  },
  {
    methods: ["DELETE", "POST"],
    pattern: new RegExp(`^/store/product-lists/items/${ID}$`),
  },
  {
    methods: ["POST"],
    pattern: new RegExp(
      `^/store/product-lists/items/${ID}/(?:change-quantity|increment)$`
    ),
  },
  { methods: ["POST"], pattern: /^\/store\/reviews$/ },
  {
    methods: ["POST"],
    pattern: /^\/store\/claims(?:\/order-access\/(?:request|verify))?$/,
  },
  {
    methods: ["GET"],
    pattern: /^\/store\/(?:packeta|ppl)\/widget-config$/,
  },
  { methods: ["GET"], pattern: /^\/store\/gls\/branches$/ },
] as const

export const allowedMethodsForPath = (path: string): readonly GatewayMethod[] =>
  ROUTE_RULES.find((rule) => rule.pattern.test(path))?.methods ?? []
