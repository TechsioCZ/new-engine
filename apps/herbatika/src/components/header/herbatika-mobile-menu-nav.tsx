"use client"

import { Accordion } from "@techsio/ui-kit/molecules/accordion"
import { Header, HeaderContext } from "@techsio/ui-kit/organisms/header"
import { usePathname } from "next/navigation"
import { useContext, useEffect, useState } from "react"
import { StorefrontLink } from "@/components/storefront-link"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "./herbatika-header.submenu-data"
import {
  type HerbatikaHeaderCategoryLink,
  useHerbatikaHeaderSubmenu,
} from "./use-herbatika-header-submenu"

type HerbatikaMobileMenuChildItem = {
  href: string
  id: string
  label: string
}

type HerbatikaMobileMenuLinkEntry = {
  href: string
  label: string
  type: "link"
}

type HerbatikaMobileMenuGroupEntry = {
  href: string
  items: readonly HerbatikaMobileMenuChildItem[]
  label: string
  type: "group"
  value: string
}

type HerbatikaMobileMenuEntry =
  | HerbatikaMobileMenuLinkEntry
  | HerbatikaMobileMenuGroupEntry

const SUBMENU_ROOT_HANDLES = new Set<string>(
  HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS.map((group) => group.rootHandle)
)

const resolveMobileChildItems = (
  featuredItems: Array<{
    href: string
    id: string
    label: string
  }>
): readonly HerbatikaMobileMenuChildItem[] =>
  featuredItems.map((item) => ({
    href: item.href,
    id: item.id,
    label: item.label,
  }))

const buildMobileMenuEntries = (
  groupsByRootHandle: ReturnType<
    typeof useHerbatikaHeaderSubmenu
  >["groupsByRootHandle"],
  primaryNavItems: readonly HerbatikaHeaderCategoryLink[]
): readonly HerbatikaMobileMenuEntry[] =>
  primaryNavItems.map((item) => {
    const rootHandle = item.rootHandle

    if (!(rootHandle && SUBMENU_ROOT_HANDLES.has(rootHandle))) {
      return {
        href: item.href,
        label: item.label,
        type: "link",
      } satisfies HerbatikaMobileMenuLinkEntry
    }

    const submenuGroup = groupsByRootHandle.get(rootHandle)

    return {
      href: item.href,
      items: resolveMobileChildItems(submenuGroup?.featuredItems ?? []),
      label: item.label,
      type: "group",
      value: rootHandle,
    } satisfies HerbatikaMobileMenuGroupEntry
  })

const resolveExpandedValues = (
  pathname: string | null,
  mobileMenuEntries: readonly HerbatikaMobileMenuEntry[]
) => {
  const activeGroup = mobileMenuEntries.find(
    (entry) =>
      entry.type === "group" &&
      (pathname === entry.href ||
        entry.items.some((item) => item.href === pathname))
  )

  if (!activeGroup || activeGroup.type !== "group") {
    return []
  }

  return [activeGroup.value]
}

const areExpandedValuesEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index])

export function HerbatikaMobileMenuNav({
  categoryPublicSlugsById,
}: {
  categoryPublicSlugsById?: PublicEntitySlugMap
}) {
  const pathname = usePathname()
  const { setIsMobileMenuOpen } = useContext(HeaderContext)
  const { groupsByRootHandle, primaryNavItems } = useHerbatikaHeaderSubmenu(
    categoryPublicSlugsById
  )
  const mobileMenuEntries = buildMobileMenuEntries(
    groupsByRootHandle,
    primaryNavItems
  )
  const [expandedValues, setExpandedValues] = useState<string[]>(() =>
    resolveExpandedValues(pathname, mobileMenuEntries)
  )

  useEffect(() => {
    const nextExpandedValues = resolveExpandedValues(
      pathname,
      mobileMenuEntries
    )

    setExpandedValues((currentExpandedValues) =>
      areExpandedValuesEqual(currentExpandedValues, nextExpandedValues)
        ? currentExpandedValues
        : nextExpandedValues
    )
  }, [mobileMenuEntries, pathname])

  const handleClose = () => setIsMobileMenuOpen(false)

  return (
    <Header.Nav className="w-full min-w-0 gap-y-0">
      <Accordion
        className="w-full"
        collapsible
        data-herbatika-mobile-menu-accordion=""
        multiple={false}
        onChange={setExpandedValues}
        size="md"
        value={expandedValues}
        variant="borderless"
      >
        {mobileMenuEntries.map((entry) =>
          entry.type === "group" ? (
            <Accordion.Item key={entry.href} value={entry.value}>
              <Accordion.Header>
                <Accordion.Title className="font-semibold">
                  <StorefrontLink href={entry.href} onClick={handleClose}>
                    {entry.label}
                  </StorefrontLink>
                </Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <ul className="flex flex-col">
                  {entry.items.map((item) => (
                    <li key={item.id}>
                      <StorefrontLink
                        className="block border-border-secondary/40 px-350 py-150 text-sm hover:bg-surface hover:text-primary"
                        href={item.href}
                        onClick={handleClose}
                      >
                        {item.label}
                      </StorefrontLink>
                    </li>
                  ))}
                </ul>
              </Accordion.Content>
            </Accordion.Item>
          ) : (
            <Header.NavItem
              className="w-full min-w-0 border-border-secondary border-b bg-primary text-md hover:bg-accordion-bg-hover hover:text-fg-reverse"
              key={entry.href}
            >
              <StorefrontLink
                className="block w-full min-w-0"
                href={entry.href}
                onClick={handleClose}
              >
                {entry.label}
              </StorefrontLink>
            </Header.NavItem>
          )
        )}
      </Accordion>
    </Header.Nav>
  )
}
