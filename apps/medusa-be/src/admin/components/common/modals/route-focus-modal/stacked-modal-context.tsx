import { createContext } from "react"

interface StackedModalState {
  getIsOpen: (id: string) => boolean
  setIsOpen: (id: string, open: boolean) => void
  register: (id: string) => void
  unregister: (id: string) => void
}

export const StackedModalContext = createContext<StackedModalState | null>(null)
