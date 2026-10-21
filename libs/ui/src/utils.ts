import type { TV } from "tailwind-variants"
import { createTV } from "tailwind-variants"

const TEXT_SIZE_REGEX = /-(size|sm|md|lg|\d?x?[sml])$/
const WHITESPACE_REGEX = /\s+/g
const NON_WORD_REGEX = /[^\w-]+/g
const MULTIPLE_DASHES_REGEX = /--+/g
const LEADING_DASHES_REGEX = /^-+/
const TRAILING_DASHES_REGEX = /-+$/

export const tv: TV = createTV({
  twMergeConfig: {
    theme: {
      text: [
        "popover-description",
        (value: string) => TEXT_SIZE_REGEX.test(value),
      ],
      "font-weight": [
        "button",
        "input",
        "input-placeholder",
        "label",
        "popover-title",
      ],
    },
    classGroups: {
      "outline-style": [
        { outline: [(value: string) => value.startsWith("(style:")] },
      ],
      p: [{ p: ["input-sm", "input-md", "input-lg"] }],
    },
  },
})

export function slugify(str: string) {
  return str
    .toString()
    .toLowerCase()
    .replace(WHITESPACE_REGEX, "-")
    .replace(NON_WORD_REGEX, "")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(LEADING_DASHES_REGEX, "")
    .replace(TRAILING_DASHES_REGEX, "")
}

/** Native fieldset inheritance, including every disabled ancestor and each
 * ancestor's first-legend exemption. Custom surfaces need the same result as
 * their hidden native input, not Zag's nearest-fieldset approximation. */
export function isEffectivelyDisabled(
  element: HTMLElement | null,
  disabled = false
): boolean {
  if (disabled || element?.matches(":disabled")) {
    return true
  }
  for (
    let ancestor = element?.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    if (ancestor.tagName !== "FIELDSET" || !ancestor.hasAttribute("disabled")) {
      continue
    }
    const firstLegend = Array.from(ancestor.children).find(
      (child) => child.tagName === "LEGEND"
    )
    if (!firstLegend?.contains(element)) {
      return true
    }
  }
  return false
}

// One observer per document, shared by every custom control. This also catches
// reparenting and first-legend changes rather than only a disabled prop change.
const disabledObservers = new WeakMap<
  Document,
  { observer: MutationObserver; listeners: Set<() => void> }
>()
export function subscribeEffectiveDisabled(
  element: HTMLElement | null,
  onChange: () => void
): () => void {
  const doc = element?.ownerDocument
  const Observer = doc?.defaultView?.MutationObserver
  if (!(doc && Observer)) {
    return () => undefined
  }
  let store = disabledObservers.get(doc)
  if (!store) {
    const listeners = new Set<() => void>()
    const observer = new Observer(() => {
      for (const listener of listeners) {
        listener()
      }
    })
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"],
    })
    store = { observer, listeners }
    disabledObservers.set(doc, store)
  }
  store.listeners.add(onChange)
  return () => {
    store.listeners.delete(onChange)
    if (!store.listeners.size) {
      store.observer.disconnect()
      disabledObservers.delete(doc)
    }
  }
}

/** Subscribe to the native control's actual owner form (including form=id).
 * Reconcile after the browser default action, unless any handler cancels reset.
 * Return a disposer; the component owns its initial/default state and must keep
 * controlled values authoritative when handling the callback. */
export function subscribeOwnerFormReset(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  onReset: () => void
): () => void {
  const form = control.form
  if (!form) {
    return () => undefined
  }
  let active = true
  const pending = new Set<ReturnType<typeof setTimeout>>()
  const reset = (event: Event) => {
    // Native dispatch may run a microtask checkpoint BETWEEN listeners. A task
    // waits for every listener (including later cancellation) and default reset.
    const timer = setTimeout(() => {
      pending.delete(timer)
      if (active && !event.defaultPrevented) {
        onReset()
      }
    }, 0)
    pending.add(timer)
  }
  form.addEventListener("reset", reset)
  return () => {
    active = false
    for (const timer of pending) {
      clearTimeout(timer)
    }
    pending.clear()
    form.removeEventListener("reset", reset)
  }
}
