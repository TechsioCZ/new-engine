"use client"

import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { Header } from "@/components/header"
import type { NavItem } from "@/components/molecules/navigation"
import { useCategoryRegistry } from "@/hooks/use-category-registry"
import { getCategoryIdsByHandles } from "@/lib/categories/selectors"

type HeaderWrapperProps = {
  logo: {
    text?: string
    icon?: IconType
  }
}

export function HeaderWrapper({ logo }: HeaderWrapperProps) {
  const { categoryRegistry } = useCategoryRegistry()
  const headerCategories = {
    Město: getCategoryIdsByHandles(categoryRegistry, [
      "kosile",
      "svetry",
      "street",
    ]),
    Zimní: getCategoryIdsByHandles(categoryRegistry, [
      "zimni",
      "kalhoty-category-469",
      "rukavice",
      "kulichy",
    ]),
    Obuv: getCategoryIdsByHandles(categoryRegistry, [
      "street-category-22",
      "zabky",
    ]),
    Sport: getCategoryIdsByHandles(categoryRegistry, [
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
      href:
        categoryIds.length > 0
          ? `/products?categories=${categoryIds.join(",")}`
          : "/products",
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
