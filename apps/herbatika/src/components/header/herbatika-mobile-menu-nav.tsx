"use client"

import { usePathname } from "next/navigation"

import { HerbatikaMobileMenuEntries } from "./herbatika-mobile-menu-entries"
import {
  buildMobileMenuEntries,
  resolveExpandedValues,
} from "./herbatika-mobile-menu-model"
import { useHerbatikaHeaderSubmenu } from "./use-herbatika-header-submenu"

export const HerbatikaMobileMenuNav = () => {
  const pathname = usePathname()
  const { groupsByRootHandle } = useHerbatikaHeaderSubmenu()
  const mobileMenuEntries = buildMobileMenuEntries(groupsByRootHandle)
  const initialExpandedValues = resolveExpandedValues(
    pathname,
    mobileMenuEntries,
  )
  const expansionKey = `${pathname}:${initialExpandedValues[0] ?? ""}`

  return (
    <HerbatikaMobileMenuEntries
      initialExpandedValues={initialExpandedValues}
      key={expansionKey}
      mobileMenuEntries={mobileMenuEntries}
    />
  )
}
