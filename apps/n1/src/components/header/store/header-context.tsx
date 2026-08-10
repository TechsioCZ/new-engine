"use client"
import { createContext, useContext, useReducer } from "react"
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

interface HeaderState {
  isCartOpen: boolean
  isLoginFormOpen: boolean
  isProfileOpen: boolean
}

const initialHeaderState: HeaderState = {
  isCartOpen: false,
  isLoginFormOpen: false,
  isProfileOpen: false,
}

const HeaderStateContext = createContext<HeaderState | undefined>(undefined)
const HeaderDispatchContext = createContext<
  ((update: Partial<HeaderState>) => void) | undefined
>(undefined)
const HeaderAuthContext = createContext<boolean | undefined>(undefined)

const mergeHeaderState = (
  state: HeaderState,
  update: Partial<HeaderState>,
): HeaderState => ({ ...state, ...update })

export const HeaderProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(mergeHeaderState, initialHeaderState)
  const { isAuthenticated } = useAuth()

  return (
    <HeaderAuthContext value={isAuthenticated}>
      <HeaderDispatchContext value={dispatch}>
        <HeaderStateContext value={state}>{children}</HeaderStateContext>
      </HeaderDispatchContext>
    </HeaderAuthContext>
  )
}

export const useHeaderContext = (): HeaderContextValue => {
  const state = useContext(HeaderStateContext)
  const dispatch = useContext(HeaderDispatchContext)
  const isAuthenticated = useContext(HeaderAuthContext)
  if (
    state === undefined ||
    dispatch === undefined ||
    isAuthenticated === undefined
  ) {
    throw new Error("useHeaderContext must be used within a HeaderProvider")
  }

  return {
    ...state,
    isAuthenticated,
    setIsCartOpen: (isCartOpen) => {
      dispatch({ isCartOpen })
    },
    setIsLoginFormOpen: (isLoginFormOpen) => {
      dispatch({ isLoginFormOpen })
    },
    setIsProfileOpen: (isProfileOpen) => {
      dispatch({ isProfileOpen })
    },
    toggleCart: () => {
      dispatch({
        isCartOpen: !state.isCartOpen,
        ...(state.isCartOpen && state.isProfileOpen
          ? {}
          : { isLoginFormOpen: false, isProfileOpen: false }),
      })
    },
    toggleLoginForm: () => {
      dispatch({
        isLoginFormOpen: !state.isLoginFormOpen,
        ...(state.isLoginFormOpen ? {} : { isCartOpen: false }),
      })
    },
    toggleProfile: () => {
      dispatch({
        isProfileOpen: !state.isProfileOpen,
        ...(state.isCartOpen ? {} : { isLoginFormOpen: false }),
      })
    },
  }
}
