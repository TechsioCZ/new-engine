import type { KeyboardEvent } from "react"

const interactiveSelector = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='switch']",
  "[role='textbox']",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

const isInteractiveTarget = (target: EventTarget | null, row: HTMLElement) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const interactiveElement = target.closest(interactiveSelector)

  return Boolean(interactiveElement && interactiveElement !== row)
}

export const getPaginationTranslations = (t: (key: string) => string) => ({
  next: t("pagination.next"),
  of: t("pagination.of"),
  pages: t("pagination.pages"),
  prev: t("pagination.previous"),
  results: t("pagination.results"),
})

export const onRowKeyboardActivate =
  (activate: () => void) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (isInteractiveTarget(event.target, event.currentTarget)) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      activate()
    }
  }
