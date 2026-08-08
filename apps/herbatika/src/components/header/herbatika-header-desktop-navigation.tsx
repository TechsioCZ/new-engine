"use client"

import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Header } from "@techsio/ui-kit/organisms/header"
import { useTranslations } from "next-intl"
import NextImage from "next/image"
import type { FocusEvent } from "react"
import { useState } from "react"

import NextLink from "@/components/app-link"

import { HerbatikaDesktopSubmenu } from "./herbatika-desktop-submenu"
import {
  HEADER_ACTION_ITEMS,
  PRIMARY_NAV_ITEMS,
} from "./herbatika-header.navigation"
import { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "./herbatika-header.submenu-data"

const SUBMENU_ROOT_HANDLES = new Set<string>(
  HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS.map((group) => group.rootHandle),
)

const resolveSubmenuRootHandleFromHref = (href: string) => {
  if (!href.startsWith("/c/")) {
    return null
  }

  const rootHandle = href.slice(3)

  return rootHandle !== "" && SUBMENU_ROOT_HANDLES.has(rootHandle)
    ? rootHandle
    : null
}

interface DesktopNavItemProps {
  activeRootHandle: string | null
  item: (typeof PRIMARY_NAV_ITEMS)[number]
  onActivate: (href: string) => void
}

const DesktopNavItem = ({
  activeRootHandle,
  item,
  onActivate,
}: DesktopNavItemProps) => {
  const rootHandle = resolveSubmenuRootHandleFromHref(item.href)
  const hasSubmenu = rootHandle !== null

  return (
    <NextLink
      aria-expanded={hasSubmenu ? activeRootHandle === rootHandle : undefined}
      aria-haspopup={hasSubmenu ? "dialog" : undefined}
      className="h-full shrink-0"
      href={item.href}
      onFocus={() => {
        onActivate(item.href)
      }}
    >
      <Header.NavItem
        className="flex h-full items-center whitespace-nowrap leading-none lg:max-header-tablet:p-header-item-desktop-lg lg:max-header-tablet:text-header-item-desktop-lg"
        onMouseEnter={() => {
          onActivate(item.href)
        }}
      >
        {item.label}
      </Header.NavItem>
    </NextLink>
  )
}

export const HerbatikaHeaderDesktopNavigation = () => {
  const t = useTranslations("navigation")
  const [activeRootHandle, setActiveRootHandle] = useState<string | null>(null)

  const handleActivateItem = (href: string) => {
    setActiveRootHandle(resolveSubmenuRootHandleFromHref(href))
  }

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const nextFocusedElement = event.relatedTarget
    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return
    }

    setActiveRootHandle(null)
  }

  return (
    <Header.Desktop
      className="relative min-h-header-nav bg-primary"
      onBlurCapture={handleBlur}
      onMouseLeave={() => {
        setActiveRootHandle(null)
      }}
    >
      <Header.Container className="mx-auto flex min-h-header-nav max-w-max-w items-center justify-between px-header-lg 2xl:px-header-2xl">
        <Header.Nav
          aria-label={t("primary_aria")}
          className="flex-nowrap overflow-x-auto [scrollbar-width:none] md:h-full [&::-webkit-scrollbar]:hidden"
          size="sm"
        >
          {PRIMARY_NAV_ITEMS.map((item) => (
            <DesktopNavItem
              activeRootHandle={activeRootHandle}
              item={item}
              key={item.href}
              onActivate={handleActivateItem}
            />
          ))}
        </Header.Nav>

        <Header.Actions className="gap-x-250" size="sm">
          {HEADER_ACTION_ITEMS.map((action) => (
            <LinkButton
              as={NextLink}
              className="h-fit rounded-xs bg-surface px-300 py-400 font-bold text-fg-primary text-sm leading-none hover:bg-highlight"
              href={action.href}
              key={action.href}
              size="sm"
              variant="secondary"
            >
              <NextImage
                alt={action.label}
                height={24}
                src={action.src}
                width={24}
              />
              {action.label}
            </LinkButton>
          ))}
        </Header.Actions>
      </Header.Container>

      <HerbatikaDesktopSubmenu
        activeRootHandle={activeRootHandle}
        onClose={() => {
          setActiveRootHandle(null)
        }}
      />
    </Header.Desktop>
  )
}
