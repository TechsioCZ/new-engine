import type { ItemProps, connect } from "@zag-js/radio-group"
import { createContext, createElement, useContext } from "react"
import type { ReactNode } from "react"

import type {
  RadioCardAlign,
  RadioCardItemOrientation,
  RadioCardJustify,
  RadioCardSize,
  RadioCardValidateStatus,
  RadioCardVariant,
} from "./radio-card-variants"

export interface RadioCardContextValue {
  align: RadioCardAlign
  api: ReturnType<typeof connect>
  disabled: boolean
  itemOrientation: RadioCardItemOrientation
  justify: RadioCardJustify
  required: boolean
  size: RadioCardSize
  validateStatus: RadioCardValidateStatus
  variant: RadioCardVariant
}

interface RadioCardProviderProps extends RadioCardContextValue {
  children: ReactNode
}

const RadioCardContext = createContext<RadioCardContextValue | null>(null)

export const radioCardProvider = ({
  children,
  ...value
}: RadioCardProviderProps) =>
  createElement(RadioCardContext.Provider, { value }, children)

export const useRadioCardContext = () => {
  const context = useContext(RadioCardContext)
  if (context === null) {
    throw new Error("RadioCard components must be used within RadioCard")
  }
  return context
}

interface RadioCardItemContextValue {
  itemProps: ItemProps
}

interface RadioCardItemProviderProps extends RadioCardItemContextValue {
  children: ReactNode
}

const RadioCardItemContext = createContext<RadioCardItemContextValue | null>(
  null,
)

export const radioCardItemProvider = ({
  children,
  ...value
}: RadioCardItemProviderProps) =>
  createElement(RadioCardItemContext.Provider, { value }, children)

export const useRadioCardItemContext = () => {
  const context = useContext(RadioCardItemContext)
  if (context === null) {
    throw new Error(
      "RadioCard item components must be used within RadioCard.Item",
    )
  }
  return context
}
