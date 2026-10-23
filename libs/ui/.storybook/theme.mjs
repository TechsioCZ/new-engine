/** @import { Channel } from "storybook/internal/channels" */
import {
  brandAttr,
  brandSupportsDark,
  isBrandKey,
} from "../src/theme/theme-config.ts"

/** @typedef {Record<string, unknown>} Globals */

/** Canvas and standalone MDX must resolve the same two theme axes.
 * @param {HTMLElement} root
 * @param {Globals} globals
 * @param {unknown} [brandLock]
 */
export function applyPreviewTheme(root, globals, brandLock) {
  const requestedBrand = brandLock ?? globals.brand
  const brand =
    typeof requestedBrand === "string" && isBrandKey(requestedBrand)
      ? requestedBrand
      : "base"
  const requestedMode = globals.mode
  const mode =
    brandSupportsDark(brand) &&
    (requestedMode === "dark" || requestedMode === "system")
      ? requestedMode
      : "light"
  root.classList.remove("light", "dark")
  if (mode !== "system") {
    root.classList.add(mode)
  }
  const attr = brandAttr(brand)
  if (attr) {
    root.setAttribute("data-theme", attr)
  } else {
    root.removeAttribute("data-theme")
  }
}

/** Docs-only entries have no story decorator, including on their first visit.
 * @param {Pick<Channel, "last" | "on" | "off">} channel
 * @param {HTMLElement} root
 * @param {Globals} [initialGlobals]
 * @param {unknown} [brandLock]
 */
export function bindDocsTheme(channel, root, initialGlobals, brandLock) {
  /** @param {{globals: Globals}} event */
  const update = ({ globals }) => applyPreviewTheme(root, globals, brandLock)
  channel.on("globalsUpdated", update)
  // Channel history is an argument array. Replay it rather than parsing URL
  // globals (which would miss manager state and in-place toolbar changes).
  const latest =
    channel.last("globalsUpdated")?.[0] ?? channel.last("setGlobals")?.[0]
  update(latest ?? { globals: initialGlobals ?? {} })
  return () => channel.off("globalsUpdated", update)
}
