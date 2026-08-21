import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  locale: "sk-SK",
  useHerbatikaHeaderSubmenu: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key: string) => key,
}))
vi.mock("next/image", () => ({ default: () => null }))
vi.mock("@techsio/ui-kit/atoms/link", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))
vi.mock("@techsio/ui-kit/molecules/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("@/components/storefront-link", () => ({
  StorefrontLink: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))
vi.mock("./use-herbatika-header-submenu", () => ({
  useHerbatikaHeaderSubmenu: mocks.useHerbatikaHeaderSubmenu,
}))

import { HerbatikaDesktopSubmenu } from "./herbatika-desktop-submenu"

const featuredItems = [
  {
    childItems: [],
    href: "/salvie",
    id: "salvie",
    label: "Șalvie",
  },
  {
    childItems: [],
    href: "/sare",
    id: "sare",
    label: "Sare",
  },
]

const renderLabels = (locale: "cs-CZ" | "hu-HU" | "ro-RO" | "sk-SK") => {
  mocks.locale = locale
  return renderToStaticMarkup(
    <HerbatikaDesktopSubmenu activeRootHandle="trapi-ma" onClose={vi.fn()} />
  )
}

describe("Herbatika desktop submenu ordering", () => {
  beforeEach(() => {
    mocks.useHerbatikaHeaderSubmenu.mockReturnValue({
      categoriesQuery: { error: null, isLoading: false },
      groupsByRootHandle: new Map([
        ["trapi-ma", { featuredItems, rootHandle: "trapi-ma" }],
      ]),
    })
  })

  it.each([
    ["sk-SK", "Șalvie", "Sare"],
    ["cs-CZ", "Șalvie", "Sare"],
    ["hu-HU", "Șalvie", "Sare"],
    ["ro-RO", "Sare", "Șalvie"],
  ] as const)("orders desktop categories with the exact %s collation", (locale, first, second) => {
    const html = renderLabels(locale)

    expect(html.indexOf(first)).toBeLessThan(html.indexOf(second))
  })
})
