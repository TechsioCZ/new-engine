import { slugify as slugifyString } from "@techsio/std/string"
import type { TV } from "tailwind-variants"
import { createTV } from "tailwind-variants"

const TEXT_SIZE_REGEX = /-(size|sm|md|lg|\d?x?[sml])$/

// Wrapped with an explicit signature: @techsio/std is a private, bundled
// devDependency, so the published d.ts must not import from it. Declared
// under a distinct name because no-local-canonical-helper reserves the
// canonical one for @techsio/std itself.
const slugifyValue = (value: string): string => slugifyString(value)

export { slugifyValue as slugify }

export const tv: TV = createTV({
  twMergeConfig: {
    theme: {
      text: [(value: string) => TEXT_SIZE_REGEX.test(value)],
    },
  },
})
