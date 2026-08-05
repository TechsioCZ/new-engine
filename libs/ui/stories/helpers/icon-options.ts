import type { IconType } from "../../src/atoms/icon"

export const iconOptions: (IconType | undefined)[] = [
  undefined,
  "icon-[mdi--plus]",
  "icon-[mdi--pencil]",
  "icon-[mdi--delete]",
  "icon-[mdi--send]",
  "icon-[mdi--magnify]",
  "icon-[mdi--thumb-up]",
  "icon-[mdi--cart]",
  "icon-[mdi--check]",
  "icon-[mdi--close]",
]

export const iconLabels: Record<string, string> = {
  "icon-[mdi--cart]": "Cart",
  "icon-[mdi--check]": "Check",
  "icon-[mdi--close]": "Close",
  "icon-[mdi--delete]": "Delete",
  "icon-[mdi--magnify]": "Search",
  "icon-[mdi--pencil]": "Pencil",
  "icon-[mdi--plus]": "Plus",
  "icon-[mdi--send]": "Send",
  "icon-[mdi--thumb-up]": "Thumb Up",
  undefined: "None",
}
