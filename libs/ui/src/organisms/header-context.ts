import { noop } from "@techsio/std/function"
import { createContext } from "react"

export type HeaderSize = "sm" | "md" | "lg"

export interface HeaderContextValue {
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  size?: HeaderSize | undefined
  toggleMobileMenu: () => void
}

export const HeaderContext = createContext<HeaderContextValue>({
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: noop,
  toggleMobileMenu: noop,
})
