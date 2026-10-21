"use client"

import {
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type Ref,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react"
import {
  isEffectivelyDisabled,
  subscribeEffectiveDisabled,
  subscribeOwnerFormReset,
} from "./form-control-lifecycle"

/** @internal Keep React responsible for native restoration after rejected proposals. */
export function getControlledChoiceInputProps(
  props: ComponentPropsWithRef<"input">,
  checked: boolean,
  indeterminate?: boolean
): ComponentPropsWithRef<"input"> {
  const { defaultChecked: _defaultChecked, ...inputProps } = props
  return {
    ...inputProps,
    checked,
    onChange(event) {
      // Native activation clears the mixed property even when checked is refused.
      if (indeterminate !== undefined) {
        event.currentTarget.indeterminate = indeterminate
      }
      props.onChange?.(event)
    },
  }
}

/** React 19 ref cleanup, including callback disposers and object refs. */
export function useChoiceInputRef(
  ref: Ref<HTMLInputElement> | undefined,
  indeterminate?: boolean
) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mixedRef = useRef(indeterminate)
  useLayoutEffect(() => {
    mixedRef.current = indeterminate
    if (inputRef.current && indeterminate !== undefined) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])
  return useMemo(
    () => (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (node && mixedRef.current !== undefined) {
        node.indeterminate = mixedRef.current
      }
      const cleanup = typeof ref === "function" ? ref(node) : undefined
      if (ref && typeof ref !== "function") {
        ref.current = node
      }
      return () => {
        inputRef.current = null
        if (typeof cleanup === "function") {
          cleanup()
        } else if (typeof ref === "function") {
          ref(null)
        } else if (ref) {
          ref.current = null
        }
      }
    },
    [ref]
  )
}

const eventHandlerPattern = /^on[A-Z]/

/** Consumer observation precedes cancellable machine actions. */
export function mergeChoiceInputProps(
  consumer: ComponentPropsWithRef<"input">,
  machine: ComponentPropsWithRef<"input">
): ComponentPropsWithRef<"input"> {
  const merged = { ...machine, ...consumer }
  for (const key of Object.keys(machine)) {
    if (!eventHandlerPattern.test(key)) {
      continue
    }
    const name = key as keyof typeof merged
    const machineHandler = machine[name]
    const consumerHandler = consumer[name]
    if (typeof machineHandler !== "function" || key === "ref") {
      continue
    }
    Object.assign(merged, {
      [key]: (event: { defaultPrevented: boolean }) => {
        if (typeof consumerHandler === "function") {
          ;(consumerHandler as (event: unknown) => void)(event)
        }
        if (!event.defaultPrevented) {
          ;(machineHandler as (event: unknown) => void)(event)
        }
      },
    })
  }
  return merged
}

/** Native keyboard selection is inconsistent in mobile WebKit. Own arrows on
 * every platform, prevent native selection, and activate exactly one target. */
export function handleChoiceArrowKey(event: KeyboardEvent<HTMLInputElement>) {
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return
  }
  const input = event.currentTarget
  const root = input.closest<HTMLElement>('[data-part="root"]')
  if (!root) {
    return
  }
  const rtl = root.dir === "rtl"
  const direction = {
    ArrowDown: 1,
    ArrowUp: -1,
    ArrowRight: rtl ? -1 : 1,
    ArrowLeft: rtl ? 1 : -1,
  }[event.key]
  if (!direction) {
    return
  }
  const inputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  ).filter((node) => !isEffectivelyDisabled(node))
  const index = inputs.indexOf(input)
  if (index < 0 || !inputs.length) {
    return
  }
  event.preventDefault()
  const next = inputs[(index + direction + inputs.length) % inputs.length]
  next?.focus()
  next?.click()
}

const silentResets = new WeakSet<object>()

/** Native resets update uncontrolled state without proposing a user change. */
export function runSilentChoiceReset(context: object, update: () => void) {
  const alreadyResetting = silentResets.has(context)
  silentResets.add(context)
  try {
    update()
  } finally {
    if (!alreadyResetting) {
      silentResets.delete(context)
    }
  }
}

export function isSilentChoiceReset(context: object): boolean {
  return silentResets.has(context)
}

/** Shared fieldset inheritance and cancellation-safe native owner reset. */
export function trackChoiceFormControl(
  root: HTMLElement | null,
  onReset: () => void,
  onDisabled: (disabled: boolean) => void
) {
  if (!root) {
    return
  }
  let input: HTMLInputElement | null = null
  let stopReset: () => void = () => undefined
  const update = () => {
    onDisabled(isEffectivelyDisabled(root))
    const next = root.querySelector<HTMLInputElement>("input")
    if (next !== input) {
      stopReset()
      input = next
      stopReset = input
        ? subscribeOwnerFormReset(input, onReset)
        : () => undefined
    }
  }
  update()
  const stopDisabled = subscribeEffectiveDisabled(root, update)
  return () => {
    stopDisabled()
    stopReset()
  }
}

/** @internal Recover focus, not selection, when a focused choice is invalidated. */
export function useChoiceFocusRecovery(selector = 'input[type="radio"]') {
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) {
      return
    }
    const doc = root.ownerDocument
    let focused: HTMLElement | null = null
    let previous: HTMLElement[] = []
    const inputs = () =>
      Array.from(root.querySelectorAll<HTMLElement>(selector))
    const isEnabled = (input: HTMLElement) =>
      !input.matches(
        ":disabled, [aria-disabled=true], [data-disabled]:not([data-disabled=false])"
      )
    const recordFocus = () => {
      const current = inputs()
      focused = current.find((input) => input === doc.activeElement) ?? null
      previous = current
    }
    recordFocus()
    doc.addEventListener("focusin", recordFocus)
    const observer = new MutationObserver(() => {
      if (!focused) {
        return
      }
      if (focused.isConnected && isEnabled(focused)) {
        previous = inputs()
        return
      }
      if (doc.activeElement !== doc.body && doc.activeElement !== focused) {
        focused = null
        return
      }
      const current = inputs()
      const enabled = current.filter(isEnabled)
      const index = previous.indexOf(focused)
      const next =
        previous.slice(index + 1).find((input) => enabled.includes(input)) ??
        previous
          .slice(0, index)
          .reverse()
          .find((input) => enabled.includes(input)) ??
        enabled[Math.min(index, enabled.length - 1)]
      focused = null
      const target = next ?? root
      target.focus({ preventScroll: true })
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "data-disabled"],
    })
    return () => {
      doc.removeEventListener("focusin", recordFocus)
      observer.disconnect()
    }
  }, [selector])
  return rootRef
}
