import { createStore } from "@zag-js/toast"
import type { ReactNode } from "react"

export const toaster = createStore<ReactNode>({
  gap: 16,
  offsets: "24px",
  placement: "bottom-end",
})
