import { slugify } from "@techsio/std/string"
import type { TV } from "tailwind-variants"
import { createTV } from "tailwind-variants"

const TEXT_SIZE_REGEX = /-(size|sm|md|lg|\d?x?[sml])$/

export { slugify }

export const tv: TV = createTV({
  twMergeConfig: {
    theme: {
      text: [(value: string) => TEXT_SIZE_REGEX.test(value)],
    },
  },
})
