"use client"
import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

import { useAuth } from "@/hooks/use-auth"

interface HeaderContextValue {
  isLoginFormOpen: boolean
  isProfileOpen: boolean
  isCartOpen: boolean
  setIsLoginFormOpen: (open: boolean) => void
  setIsProfileOpen: (open: boolean) => void
  setIsCartOpen: (open: boolean) => void
  toggleLoginForm: () => void
  toggleProfile: () => void
  toggleCart: () => void
  isAuthenticated: boolean
}

const HeaderContext = createContext<HeaderContextValue | undefined>(undefined)

export const HeaderProvider = ({ children }: { children: ReactNode }) => {
  const [isLoginFormOpen, setIsLoginFormOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  const toggleLoginForm = () => {
    setIsLoginFormOpen((prev) => !prev)
    if (!isLoginFormOpen) {
      setIsCartOpen(false)
    }
  }

  const toggleCart = () => {
    setIsCartOpen((prev) => !prev)
    if (!(isCartOpen && isProfileOpen)) {
      setIsLoginFormOpen(false)
      setIsProfileOpen(false)
    }
  }

  const toggleProfile = () => {
    setIsProfileOpen((prev) => !prev)
    if (!isCartOpen) {
      setIsLoginFormOpen(false)
    }
  }

  const contextValue = {
    isAuthenticated,
    isCartOpen,
    isLoginFormOpen,
    isProfileOpen,
    setIsCartOpen,
    setIsLoginFormOpen,
    setIsProfileOpen,
    toggleCart,
    toggleLoginForm,
    toggleProfile,
  }

  return <HeaderContext value={contextValue}>{children}</HeaderContext>
}

export const useHeaderContext = () => {
  const context = useContext(HeaderContext)
  if (!context) {
    throw new Error("useHeaderContext must be used within a HeaderProvider")
  }
  return context
}
