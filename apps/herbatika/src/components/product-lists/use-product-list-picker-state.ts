"use client"

import { useState } from "react"

interface ProductListPickerState {
  activeListKey: string | null
  newListTitle: string
  showNewListInput: boolean
}

const INITIAL_PICKER_STATE: ProductListPickerState = {
  activeListKey: null,
  newListTitle: "",
  showNewListInput: false,
}

export const useProductListPickerState = () => {
  const [isOpenState, setIsOpenState] = useState(false)
  const [pickerState, setPickerState] =
    useState<ProductListPickerState>(INITIAL_PICKER_STATE)

  const setActiveListKey = (activeListKey: string | null) => {
    setPickerState((current) => ({ ...current, activeListKey }))
  }
  const setNewListTitle = (newListTitle: string) => {
    setPickerState((current) => ({ ...current, newListTitle }))
  }
  const setShowNewListInput = (showNewListInput: boolean) => {
    setPickerState((current) => ({ ...current, showNewListInput }))
  }
  const clearNewListForm = () => {
    setPickerState((current) => ({
      ...current,
      newListTitle: "",
      showNewListInput: false,
    }))
  }
  const setIsOpen = (nextIsOpen: boolean) => {
    setIsOpenState(nextIsOpen)
    if (!nextIsOpen) {
      setPickerState(INITIAL_PICKER_STATE)
    }
  }

  return {
    ...pickerState,
    clearNewListForm,
    isOpen: isOpenState,
    setActiveListKey,
    setIsOpen,
    setNewListTitle,
    setShowNewListInput,
  }
}
