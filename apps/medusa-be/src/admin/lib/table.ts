import type { KeyboardEvent } from "react"

export const getPaginationTranslations = (t: (key: string) => string) => ({
  next: t("pagination.next"),
  of: t("pagination.of"),
  pages: t("pagination.pages"),
  prev: t("pagination.previous"),
  results: t("pagination.results"),
})

export const onRowKeyboardActivate =
  (activate: () => void) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      activate()
    }
  }
