import type { IconType } from "../../src/atoms/icon"

/** Curated names stay visible in Controls and in the searchable Icon gallery. */
export const iconCatalog: {
  icon: IconType
  label: string
  category: string
}[] = [
  { icon: "token-icon-home", label: "Home", category: "Navigation" },
  { icon: "token-icon-search", label: "Search", category: "Navigation" },
  { icon: "token-icon-menu", label: "Menu", category: "Navigation" },
  {
    icon: "token-icon-chevron-down",
    label: "Chevron down",
    category: "Navigation",
  },
  {
    icon: "token-icon-chevron-up",
    label: "Chevron up",
    category: "Navigation",
  },
  {
    icon: "token-icon-chevron-left",
    label: "Chevron left",
    category: "Navigation",
  },
  {
    icon: "token-icon-chevron-right",
    label: "Chevron right",
    category: "Navigation",
  },
  { icon: "token-icon-close", label: "Close", category: "Actions" },
  { icon: "token-icon-plus", label: "Add", category: "Actions" },
  { icon: "token-icon-minus", label: "Remove", category: "Actions" },
  { icon: "token-icon-save", label: "Save", category: "Actions" },
  { icon: "token-icon-trash", label: "Delete", category: "Actions" },
  { icon: "token-icon-copy", label: "Copy", category: "Actions" },
  { icon: "token-icon-clipboard", label: "Clipboard", category: "Actions" },
  { icon: "token-icon-undo", label: "Undo", category: "Actions" },
  { icon: "token-icon-redo", label: "Redo", category: "Actions" },
  { icon: "token-icon-eye", label: "View", category: "Actions" },
  {
    icon: "token-icon-ellipsis-horizontal",
    label: "More actions",
    category: "Actions",
  },
  { icon: "token-icon-folder", label: "Folder", category: "Content" },
  { icon: "token-icon-folder-open", label: "Open folder", category: "Content" },
  { icon: "token-icon-file-document", label: "Document", category: "Content" },
  {
    icon: "token-icon-shopping-bag",
    label: "Shopping bag",
    category: "Content",
  },
  { icon: "token-icon-cart", label: "Cart", category: "Content" },
  { icon: "token-icon-cpu", label: "Processor", category: "Content" },
  { icon: "token-icon-smartphone", label: "Smartphone", category: "Content" },
  { icon: "token-icon-heart", label: "Favorite", category: "Content" },
  { icon: "token-icon-star", label: "Star", category: "Content" },
  { icon: "token-icon-star-half", label: "Half star", category: "Content" },
  { icon: "token-icon-error", label: "Error", category: "Status" },
  { icon: "token-icon-success", label: "Success", category: "Status" },
  { icon: "token-icon-warning", label: "Warning", category: "Status" },
  { icon: "token-icon-info", label: "Information", category: "Status" },
  { icon: "token-icon-check", label: "Check", category: "Status" },
  { icon: "token-icon-check-bold", label: "Bold check", category: "Status" },
  {
    icon: "token-icon-check-circle",
    label: "Check circle",
    category: "Status",
  },
  { icon: "token-icon-alert", label: "Alert", category: "Status" },
  {
    icon: "token-icon-alert-circle",
    label: "Alert circle",
    category: "Status",
  },
  {
    icon: "token-icon-information",
    label: "Information circle",
    category: "Status",
  },
  { icon: "token-icon-circle", label: "Circle", category: "Status" },
  { icon: "token-icon-play", label: "Play", category: "Media" },
  { icon: "token-icon-pause", label: "Pause", category: "Media" },
  { icon: "token-icon-spinner", label: "Loading spinner", category: "Media" },
  {
    icon: "token-icon-input-error",
    label: "Input error",
    category: "Form controls",
  },
  {
    icon: "token-icon-input-success",
    label: "Input success",
    category: "Form controls",
  },
  {
    icon: "token-icon-input-warning",
    label: "Input warning",
    category: "Form controls",
  },
  {
    icon: "token-icon-input-info",
    label: "Input information",
    category: "Form controls",
  },
  {
    icon: "token-icon-increment",
    label: "Increment",
    category: "Form controls",
  },
  {
    icon: "token-icon-decrement",
    label: "Decrement",
    category: "Form controls",
  },
  { icon: "icon-[mdi--plus]", label: "Plus", category: "Iconify examples" },
  { icon: "icon-[mdi--pencil]", label: "Pencil", category: "Iconify examples" },
  { icon: "icon-[mdi--delete]", label: "Delete", category: "Iconify examples" },
  { icon: "icon-[mdi--send]", label: "Send", category: "Iconify examples" },
  {
    icon: "icon-[mdi--magnify]",
    label: "Search",
    category: "Iconify examples",
  },
  {
    icon: "icon-[mdi--thumb-up]",
    label: "Thumb up",
    category: "Iconify examples",
  },
  { icon: "icon-[mdi--cart]", label: "Cart", category: "Iconify examples" },
  { icon: "icon-[mdi--check]", label: "Check", category: "Iconify examples" },
  { icon: "icon-[mdi--close]", label: "Close", category: "Iconify examples" },
]

export const iconOptions: (IconType | undefined)[] = [
  undefined,
  ...iconCatalog.map(({ icon }) => icon),
]

export const iconLabels: Record<string, string> = {
  undefined: "None",
  ...Object.fromEntries(
    iconCatalog.map(({ icon, label, category }) => [
      icon,
      `${label} · ${category}`,
    ])
  ),
}
