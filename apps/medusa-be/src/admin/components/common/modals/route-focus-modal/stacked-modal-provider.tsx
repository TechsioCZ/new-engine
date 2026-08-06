import { useState } from "react"
import type { PropsWithChildren } from "react"

import { StackedModalContext } from "./stacked-modal-context"

type StackedModalProviderProps = PropsWithChildren<{
  onOpenChange: (open: boolean) => void
}>

const useStackedModalValue = (onOpenChange: (open: boolean) => void) => {
  const [state, setState] = useState<Record<string, boolean>>({})

  const getIsOpen = (id: string) => state[id] ?? false

  const setIsOpen = (id: string, open: boolean) => {
    setState((prevState) => ({
      ...prevState,
      [id]: open,
    }))

    onOpenChange(open)
  }

  const register = (id: string) => {
    setState((prevState) => ({
      ...prevState,
      [id]: false,
    }))
  }

  const unregister = (id: string) => {
    setState((prevState) =>
      Object.fromEntries(
        Object.entries(prevState).filter(([key]) => key !== id),
      ),
    )
  }

  return { getIsOpen, register, setIsOpen, unregister }
}

export const StackedModalProvider = ({
  children,
  onOpenChange,
}: StackedModalProviderProps) => {
  const contextValue = useStackedModalValue(onOpenChange)

  return (
    <StackedModalContext.Provider value={contextValue}>
      {children}
    </StackedModalContext.Provider>
  )
}
