import type { Route } from "next"

export type AppHref = Route<string>

const STATIC_PATHS = new Set([
  "/",
  "/account",
  "/account/lists",
  "/account/orders",
  "/account/settings",
  "/auth/forgot-password",
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  "/blog",
  "/checkout",
  "/checkout/platba-navrat",
  "/faq",
  "/o-nas",
  "/reset-password",
  "/search",
  "/znacka",
])

const DYNAMIC_PATH_PATTERNS = [
  /^\/[^/]+$/,
  /^\/account\/orders\/[^/]+$/,
  /^\/blog\/[^/]+$/,
  /^\/c\/[^/]+$/,
  /^\/checkout\/[^/]+$/,
  /^\/p\/[^/]+$/,
  /^\/reviews\/product\/[^/]+$/,
  /^\/znacka\/[^/]+$/,
]

const hasSupportedProtocol = (href: string) =>
  /^(?:https?|mailto|tel):/i.test(href)

const isAppHref = (href: string): href is AppHref => {
  if (
    href.startsWith("#") ||
    href.startsWith("?") ||
    hasSupportedProtocol(href)
  ) {
    return true
  }

  if (!(href.startsWith("/") && !href.startsWith("//"))) {
    return false
  }

  const { pathname } = new URL(href, "https://herbatica.invalid")
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname

  return (
    STATIC_PATHS.has(normalizedPathname) ||
    DYNAMIC_PATH_PATTERNS.some((pattern) => pattern.test(normalizedPathname))
  )
}

export const appHref = (href: string): AppHref => {
  if (isAppHref(href)) {
    return href
  }

  throw new TypeError(`Invalid application href: ${href}`)
}
