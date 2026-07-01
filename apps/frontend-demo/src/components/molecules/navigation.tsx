"use client"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { PopoverTemplate as Popover } from "@techsio/ui-kit/templates/popover"
import { slugify } from "@techsio/ui-kit/utils"
import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

export type NavItem = {
  title: string
  href?: string
  prefetch?: boolean
  icon?: IconType
  label?: string
  role?: "submenu" | "item"
  children?: NavItem[]
}

function NavigationItem({ item }: { item: NavItem }) {
  if (item.role === "submenu" && item.children) {
    return (
      <li>
        <Popover
          contentClassName="z-50 bg-nav-submenu-bg px-0 py-2 shadow-primary"
          id="submenu-category"
          showArrow={true}
          trigger={
            <div className="flex items-center gap-2">
              {item.icon && <Icon icon={item.icon} size="sm" />}
              <span className="text-sm">{item.title}</span>
              <Icon icon="token-icon-chevron-down" size="sm" />
            </div>
          }
          triggerClassName=""
        >
          <nav className="flex min-w-[200px] flex-col gap-nav-submenu">
            {item.children.map((child) => (
              <Link
                className="px-nav-submenu-padding hover:bg-nav-submenu-item-hover"
                href={child.href || "#"}
                key={slugify(child.title)}
                prefetch={child.prefetch}
              >
                {child.icon && <Icon icon={child.icon} size="sm" />}
                {child.title}
              </Link>
            ))}
          </nav>
        </Popover>
      </li>
    )
  }

  return (
    <li className="relative">
      <Link
        className="flex items-center gap-nav-link-icon-gap rounded-nav-item px-nav-item-x py-nav-item-y font-nav-item text-nav-fg text-nav-item transition-colors hover:bg-nav-item-hover-bg hover:text-nav-fg-hover"
        href={item.href || "#"}
        prefetch={item.prefetch ?? false}
      >
        {item.icon && <Icon icon={item.icon} size="sm" />}
        {item.title}
        {item.label && (
          <span className="ml-nav-badge-ml rounded-full bg-nav-badge-bg px-nav-badge-x py-nav-badge-y font-medium text-nav-badge text-nav-badge-fg">
            {item.label}
          </span>
        )}
      </Link>
    </li>
  )
}

interface NavigationProps extends ComponentPropsWithoutRef<"nav"> {
  items: NavItem[]
}

export function Navigation({ items, className, ...props }: NavigationProps) {
  return (
    <nav className="bg-nav-bg" {...props}>
      <ul className="flex items-center gap-nav-gap">
        {items.map((item) => (
          <NavigationItem item={item} key={slugify(item.title)} />
        ))}
      </ul>
    </nav>
  )
}
