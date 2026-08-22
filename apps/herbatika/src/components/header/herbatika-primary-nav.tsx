"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { Header } from "@techsio/ui-kit/organisms/header"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { StorefrontLink } from "@/components/storefront-link"
import { resolvePrimaryNavVisibleCount } from "./herbatika-primary-nav.overflow"
import type { HerbatikaHeaderCategoryLink } from "./use-herbatika-header-submenu"

const NAV_ITEM_CLASS_NAME =
  "flex h-full items-center whitespace-nowrap leading-none lg:max-header-tablet:p-header-item-desktop-lg lg:max-header-tablet:text-header-item-desktop-lg"

const MEASURE_ITEM_ATTRIBUTE = "[data-nav-measure='item']"
const MEASURE_TRIGGER_ATTRIBUTE = "[data-nav-measure='trigger']"

// Measuring must happen before paint so a long localized label never flashes clipped.
const useMeasurementEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

const readColumnGap = (element: HTMLElement) => {
  const columnGap = window.getComputedStyle(element).columnGap
  const parsedGap = Number.parseFloat(columnGap)

  return Number.isFinite(parsedGap) ? parsedGap : 0
}

const readMeasuredWidths = (measureRow: HTMLElement) => {
  const itemNodes = Array.from(
    measureRow.querySelectorAll<HTMLElement>(MEASURE_ITEM_ATTRIBUTE)
  )
  const triggerNode = measureRow.querySelector<HTMLElement>(
    MEASURE_TRIGGER_ATTRIBUTE
  )

  return {
    itemWidths: itemNodes.map((node) => node.getBoundingClientRect().width),
    triggerWidth: triggerNode?.getBoundingClientRect().width ?? 0,
  }
}

export type HerbatikaPrimaryNavProps = {
  activeRootHandle: string | null
  ariaLabel: string
  items: HerbatikaHeaderCategoryLink[]
  onActivateItem: (rootHandle: string) => void
  overflowLabel: string
  submenuRootHandles: ReadonlySet<string>
}

export function HerbatikaPrimaryNav({
  activeRootHandle,
  ariaLabel,
  items,
  onActivateItem,
  overflowLabel,
  submenuRootHandles,
}: HerbatikaPrimaryNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(items.length)

  useMeasurementEffect(() => {
    const nav = navRef.current
    const measureRow = measureRef.current

    if (!(nav && measureRow)) {
      return
    }

    const updateVisibleCount = () => {
      const { itemWidths, triggerWidth } = readMeasuredWidths(measureRow)

      setVisibleCount(
        Math.min(
          items.length,
          resolvePrimaryNavVisibleCount({
            availableWidth: nav.clientWidth,
            gap: readColumnGap(nav),
            itemWidths,
            triggerWidth,
          })
        )
      )
    }

    updateVisibleCount()

    // The nav observer reacts to viewport/actions resizes, the measure observer to
    // font loading and to labels changing when categories or the market locale load.
    const observer = new ResizeObserver(updateVisibleCount)
    observer.observe(nav)
    observer.observe(measureRow)

    return () => observer.disconnect()
  }, [items])

  const visibleItems = items.slice(0, visibleCount)
  const overflowItems = items.slice(visibleCount)

  return (
    <Header.Nav
      aria-label={ariaLabel}
      className="relative min-w-0 flex-nowrap overflow-hidden"
      ref={navRef}
      size="sm"
    >
      {visibleItems.map((item) => {
        const hasSubmenu = Boolean(
          item.rootHandle && submenuRootHandles.has(item.rootHandle)
        )

        return (
          <StorefrontLink
            aria-expanded={
              hasSubmenu ? activeRootHandle === item.rootHandle : undefined
            }
            aria-haspopup={hasSubmenu ? "dialog" : undefined}
            className="shrink-0 self-stretch"
            href={item.href}
            key={item.href}
            onFocus={() => onActivateItem(item.rootHandle)}
          >
            <Header.NavItem
              className={NAV_ITEM_CLASS_NAME}
              onMouseEnter={() => onActivateItem(item.rootHandle)}
            >
              {item.label}
            </Header.NavItem>
          </StorefrontLink>
        )
      })}

      {overflowItems.length > 0 ? (
        <Popover.Root
          gutter={0}
          id="herbatika-primary-nav-overflow"
          placement="bottom-end"
          size="sm"
        >
          <Popover.Trigger
            aria-label={overflowLabel}
            className="shrink-0 self-stretch px-0 py-0"
            onFocus={() => onActivateItem("")}
            theme="unstyled"
          >
            <Header.NavItem className={NAV_ITEM_CLASS_NAME}>
              <Icon icon="token-icon-header-menu" size="lg" />
            </Header.NavItem>
          </Popover.Trigger>

          <Popover.Positioner>
            <Popover.Content
              aria-label={overflowLabel}
              className="min-w-max px-0 py-200"
            >
              <ul className="flex flex-col">
                {overflowItems.map((item) => (
                  <li key={item.href}>
                    <StorefrontLink
                      className="block whitespace-nowrap px-350 py-200 font-bold text-fg-primary text-sm leading-none hover:text-primary"
                      href={item.href}
                    >
                      {item.label}
                    </StorefrontLink>
                  </li>
                ))}
              </ul>
            </Popover.Content>
          </Popover.Positioner>
        </Popover.Root>
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-0 overflow-hidden"
        ref={measureRef}
      >
        <div className="flex h-full w-max items-center">
          {items.map((item) => (
            <div
              className="shrink-0 self-stretch"
              data-nav-measure="item"
              key={item.href}
            >
              <Header.NavItem className={NAV_ITEM_CLASS_NAME}>
                {item.label}
              </Header.NavItem>
            </div>
          ))}

          <div className="shrink-0 self-stretch" data-nav-measure="trigger">
            <Header.NavItem className={NAV_ITEM_CLASS_NAME}>
              <Icon icon="token-icon-header-menu" size="lg" />
            </Header.NavItem>
          </div>
        </div>
      </div>
    </Header.Nav>
  )
}
