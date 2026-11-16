"use client"

import { useSyncExternalStore } from "react"
import {
  isEffectivelyDisabled,
  subscribeEffectiveDisabled,
} from "./form-control-lifecycle"

/** Subscribe with a custom surface, not a machine-disabled native input: using
 * the latter would feed the machine's own disabled attribute back into itself. */
export function useEffectiveDisabled(
  element: HTMLElement | null,
  disabled = false
) {
  return useSyncExternalStore(
    (onChange) => subscribeEffectiveDisabled(element, onChange),
    () => isEffectivelyDisabled(element, disabled),
    () => disabled
  )
}
