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
    Zimní: getCategoryIdsByHandles([
      "zimni",
      "kalhoty-category-469",
      "rukavice",
      "kulichy",
    ]),
    Obuv: getCategoryIdsByHandles(["street-category-22", "zabky"]),
    Sport: getCategoryIdsByHandles([
      "plavky",
      "silnicni-gravel-category-412",
      "snowboardy-category-450",
      "longboardy-category-463",
      "prilby-category-475",
    ]),
  }

  const categoryItems: NavItem[] = Object.entries(headerCategories).map(
    ([title, categoryIds]) => ({
      title,
      href: `/products?categories=${categoryIds.join(",")}`,
    })
  )

  const navigationItems: NavItem[] = [
    { title: "Domů", href: "/", prefetch: false },
    { title: "Produkty", href: "/products", prefetch: true },
    {
      title: "Oblíbené",
      role: "submenu" as const,
      children: categoryItems,
      prefetch: true,
    },
    { title: "O nás", href: "/about", prefetch: false },
    { title: "Kontakt", href: "/contact", prefetch: false },
  ]

  return <Header logo={logo} navigationItems={navigationItems} />
}
