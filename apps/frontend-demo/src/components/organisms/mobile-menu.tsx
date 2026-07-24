"use client"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { useEffect, useState } from "react"

import type { NavItem } from "../molecules/navigation"
import { RegionSelector } from "../region-selector"
import { ThemeToggle } from "../theme-toggle"

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  navigationItems: NavItem[]
}

export function MobileMenu({
  isOpen,
  onClose,
  navigationItems,
}: MobileMenuProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-mobile-menu-overlay-bg transition-mobile-menu-overlay"
        //onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-mobile-menu-panel-max-w bg-mobile-menu-panel-bg shadow-mobile-menu-panel transition-mobile-menu-panel">
        <div className="flex items-center justify-between border-mobile-menu-border border-b p-mobile-menu-header-padding">
          <h2 className="font-mobile-menu-title-weight text-mobile-menu-text text-mobile-menu-title-size">
            Nabídka
          </h2>
          <Button
            className="rounded-mobile-menu-close p-mobile-menu-close-padding transition-colors hover:bg-mobile-menu-close-hover-bg"
            icon="token-icon-close"
            onClick={onClose}
            theme="borderless"
          />
        </div>
        <nav className="flex flex-col p-mobile-menu-nav-padding">
          {navigationItems.map((item) => (
            <div key={item.title}>
              {item.role === "submenu" && item.children ? (
                <>
                  <Button
                    className="flex w-full items-center justify-between rounded-mobile-menu-item px-mobile-menu-item-x py-mobile-menu-item-y font-mobile-menu-item-weight text-mobile-menu-item-size text-mobile-menu-text transition-colors hover:bg-mobile-menu-item-hover-bg"
                    onClick={() => toggleExpanded(item.title)}
                    theme="borderless"
                  >
                    {item.title}
                    <Icon
                      icon={
                        expandedItems.includes(item.title)
                          ? "token-icon-chevron-up"
                          : "token-icon-chevron-down"
                      }
                      size="sm"
                    />
                  </Button>
                  {expandedItems.includes(item.title) && (
                    <ul className="mt-mobile-menu-submenu-gap ml-mobile-menu-submenu-indent flex flex-col gap-mobile-menu-submenu-gap">
                      {item.children.map((child) => (
                        <Link
                          className="block rounded-mobile-menu-item px-mobile-menu-item-x py-mobile-menu-item-y text-mobile-menu-submenu-size text-mobile-menu-text transition-colors hover:bg-mobile-menu-item-hover-bg"
                          href={child.href}
                          key={child.title}
                          onClick={onClose}
                        >
                          {child.title}
                          {child.label && (
                            <Badge className="ml-2" variant="danger">
                              {child.label}
                            </Badge>
                          )}
                        </Link>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  className="block rounded-mobile-menu-item px-mobile-menu-item-x py-mobile-menu-item-y font-mobile-menu-item-weight text-mobile-menu-item-size text-mobile-menu-text transition-colors hover:bg-mobile-menu-item-hover-bg"
                  href={item.href || "#"}
                  onClick={onClose}
                >
                  {item.title}
                </Link>
              )}
            </div>
          ))}

          {/* Divider */}
          <div className="my-mobile-menu-divider-margin border-mobile-menu-divider border-t" />

          {/* Settings section */}
          <div className="mb-mobile-menu-divider-margin space-y-mobile-menu-item-y">
            <div className="flex items-center justify-between px-mobile-menu-item-x">
              <span className="text-mobile-menu-submenu-size text-mobile-menu-text-secondary">
                Region
              </span>
              <RegionSelector className="z-50 max-w-4xl" />
            </div>
            <div className="flex items-center justify-between px-mobile-menu-item-x">
              <span className="text-mobile-menu-submenu-size text-mobile-menu-text-secondary">
                Téma
              </span>
              <ThemeToggle />
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}
