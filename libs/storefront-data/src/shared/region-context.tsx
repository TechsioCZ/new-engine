"use client"

import type { ReactNode } from "react"
import { createContext, useContext } from "react"
import type { RegionInfo } from "./region"

const RegionContext = createContext<RegionInfo | null>(null)

type RegionProviderProps = {
  children: ReactNode
  region: RegionInfo | null
}

/**
 * Provides region information to all storefront-data hooks.
 *
 * When wrapped in this provider, hooks automatically use the provided region.
 * Props passed directly to hooks take precedence over context values.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { regionId, countryCode } = useMyRegionQuery()
 *   const region = regionId ? { region_id: regionId, country_code: countryCode } : null
 *
 *   return (
 *     <RegionProvider region={region}>
 *       <MyApp />
 *     </RegionProvider>
 *   )
 * }
 * ```
 */
export function RegionProvider({ children, region }: RegionProviderProps) {
  return (
    <RegionContext.Provider value={region}>{children}</RegionContext.Provider>
  )
}

/**
 * Returns the current region from context, or null if not available.
 *
 * This hook is used internally by storefront-data hooks to automatically
 * inject region information. It does NOT throw if used outside of RegionProvider -
 * it simply returns null, allowing hooks to fall back to props or disable queries.
 *
 * @returns RegionInfo | null
 */
export function useRegionContext(): RegionInfo | null {
  return useContext(RegionContext)
}
