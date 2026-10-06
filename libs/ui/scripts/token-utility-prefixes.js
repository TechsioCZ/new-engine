/**
 * Tailwind v4 utility prefixes grouped by the theme namespace they read.
 *
 * The token checkers compose their own namespace tables from these groups.
 * Their tables differ on purpose, so each checker lists its own additions
 * and exclusions instead of sharing one union.
 */

// Ordered so `bg`, `text`, `border` and `ring` lead every color table.
export const COLOR_PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "ring-offset",
  "fill",
  "stroke",
  "outline",
  "shadow",
  "accent",
  "caret",
  "decoration",
]

export const PADDING_PREFIXES = [
  "p",
  "px",
  "py",
  "pt",
  "pb",
  "pl",
  "pr",
  "ps",
  "pe",
]
export const MARGIN_PREFIXES = [
  "m",
  "mx",
  "my",
  "mt",
  "mb",
  "ml",
  "mr",
  "ms",
  "me",
]
export const WIDTH_PREFIXES = ["w", "min-w", "max-w"]
export const HEIGHT_PREFIXES = ["h", "min-h", "max-h"]
export const SIZING_PREFIXES = [...WIDTH_PREFIXES, ...HEIGHT_PREFIXES]
export const GAP_PREFIXES = ["gap", "gap-x", "gap-y"]
export const SPACE_PREFIXES = ["space-x", "space-y"]
export const INSET_PREFIXES = [
  "inset",
  "inset-x",
  "inset-y",
  "top",
  "right",
  "bottom",
  "left",
]

// Namespaces whose utilities have exactly one prefix in every checker.
export const SINGLE_PREFIX_NAMESPACES = {
  text: ["text"],
  "font-weight": ["font"],
  font: ["font"],
  radius: ["rounded"],
  shadow: ["shadow"],
  opacity: ["opacity"],
  border: ["border"],
}

/** @param {string[]} prefixes */
export const negated = (prefixes) => prefixes.map((prefix) => `-${prefix}`)

/**
 * @param {string[]} prefixes
 * @param {string[]} excluded
 */
export const without = (prefixes, excluded) =>
  prefixes.filter((prefix) => !excluded.includes(prefix))
