"use client"

import type { IconType } from "@techsio/ui-kit/atoms/icon"

import { Header } from "@/components/header"
import type { NavItem } from "@/components/molecules/navigation"
import { getCategoryIdsByHandles } from "@/utils/category-helpers"

interface HeaderWrapperProps {
  logo: {
    text?: string
    icon?: IconType
  }
}

export function HeaderWrapper({ logo }: HeaderWrapperProps) {
  const headerCategories = {
    Město: getCategoryIdsByHandles(["kosile", "svetry", "street"]),
    Obuv: getCategoryIdsByHandles(["street-category-22", "zabky"]),
    Sport: getCategoryIdsByHandles([
      "plavky",
      "silnicni-gravel-category-412",
      "snowboardy-category-450",
      "longboardy-category-463",
      "prilby-category-475",
    ]),
    Zimní: getCategoryIdsByHandles([
      "zimni",
      "kalhoty-category-469",
      "rukavice",
      "kulichy",
    ]),
  }

  const categoryItems: NavItem[] = Object.entries(headerCategories).map(
    ([title, categoryIds]) => ({
      href: `/products?categories=${categoryIds.join(",")}`,
      title,
    })
  )

  const navigationItems: NavItem[] = [
    { href: "/", prefetch: false, title: "Domů" },
    { href: "/products", prefetch: true, title: "Produkty" },
    {
      children: categoryItems,
      prefetch: true,
      role: "submenu" as const,
      title: "Oblíbené",
    },
    { href: "/about", prefetch: false, title: "O nás" },
    { href: "/contact", prefetch: false, title: "Kontakt" },
  ]

  return <Header logo={logo} navigationItems={navigationItems} />
}
