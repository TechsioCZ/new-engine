import type { Api } from "@zag-js/collapsible"
import type { PropTypes } from "@zag-js/react"
import { createContext, useContext } from "react"

export type VerticalNavigationSize = "sm" | "md"
export type VerticalNavigationTone = "plain" | "subtle" | "accent"
export type VerticalNavigationVariant = "primary" | "secondary"

export const VerticalNavigationContext = createContext<{
  size: VerticalNavigationSize
  maxIndentDepth: number
  dir?: "ltr" | "rtl"
} | null>(null)
export const VerticalNavigationDepthContext = createContext(0)
export const VerticalNavigationBranchContext = createContext<{
  api: Api<PropTypes>
  containsCurrent: boolean
} | null>(null)

export function useVerticalNavigationContext() {
  const context = useContext(VerticalNavigationContext)
  if (!context) {
    throw new Error(
      "VerticalNavigation parts must be used within VerticalNavigation.Root"
    )
  }
  return context
}

export function useVerticalNavigationBranchContext() {
  const context = useContext(VerticalNavigationBranchContext)
  if (!context) {
    throw new Error(
      "VerticalNavigation branch parts must be used within VerticalNavigation.Branch"
    )
  }
  return context
}
