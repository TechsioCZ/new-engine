import { useContext } from "react"

import { StackedModalContext } from "./stacked-modal-context"
import type { StackedModalState } from "./stacked-modal-context"

export const useStackedModal = (): StackedModalState => {
  const context = useContext(StackedModalContext)

  if (!context) {
    throw new Error(
      "useStackedModal must be used within a StackedModalProvider",
    )
  }

  return context
}
