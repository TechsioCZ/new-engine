import { expect } from "@playwright/test"

/** Geometry only; callers separately assert visibility. Keep self-contained for
 * browser serialization. Offscreen scroll content is NOT allowed for a required
 * checkpoint target: it must fit both the viewport and every clipping ancestor.
 * @param {Element} element
 */
export function viewportOverhang(element) {
  const doc = element.ownerDocument ?? document
  const box = element.getBoundingClientRect()
  const getStyle = (node) => doc.defaultView.getComputedStyle(node)
  const establishesFixedBlock = (style) =>
    [
      "transform",
      "translate",
      "rotate",
      "scale",
      "perspective",
      "filter",
      "backdropFilter",
    ].some((property) => style[property] && style[property] !== "none") ||
    style.contain
      .split(" ")
      .some((value) =>
        ["layout", "paint", "strict", "content"].includes(value)
      ) ||
    style.willChange
      .split(",")
      .some((value) =>
        [
          "transform",
          "translate",
          "rotate",
          "scale",
          "perspective",
          "filter",
          "backdrop-filter",
          "contain",
        ].includes(value.trim())
      ) ||
    ["auto", "hidden"].includes(style.contentVisibility)
  const positioned = (style) =>
    ["absolute", "fixed"].includes(style.position) ? style.position : null
  const propagatedBodyOverflow = (parent, style) => {
    if (parent !== doc.body) {
      return false
    }
    const rootStyle = getStyle(doc.documentElement)
    return (
      rootStyle.overflowX === "visible" &&
      rootStyle.overflowY === "visible" &&
      rootStyle.contain === "none" &&
      style.contain === "none"
    )
  }
  let escaping = element.parentElement ? positioned(getStyle(element)) : null
  let left = 0
  let top = 0
  let right = doc.documentElement.clientWidth
  let bottom = doc.documentElement.clientHeight
  for (
    let parent = element.parentElement;
    parent && parent !== doc.documentElement;
    parent = parent.parentElement
  ) {
    const style = getStyle(parent)
    // Absolute/fixed subtrees escape overflow between them and their containing
    // block. A merely positioned ancestor does not contain viewport-fixed content.
    if (
      escaping &&
      !establishesFixedBlock(style) &&
      !(escaping === "absolute" && style.position !== "static")
    ) {
      continue
    }
    escaping = positioned(style)
    if (
      propagatedBodyOverflow(parent, style) ||
      ["inline", "contents"].includes(style.display)
    ) {
      continue
    }
    const bounds = parent.getBoundingClientRect()
    // Scrollports exclude borders and scrollbar gutters; client metrics are
    // local CSS pixels, whereas DOMRects include axis-aligned ancestor scaling.
    const scaleX = parent.offsetWidth ? bounds.width / parent.offsetWidth : 1
    const scaleY = parent.offsetHeight ? bounds.height / parent.offsetHeight : 1
    const clipLeft = bounds.left + parent.clientLeft * scaleX
    const clipTop = bounds.top + parent.clientTop * scaleY
    if (["auto", "scroll", "hidden", "clip"].includes(style.overflowX)) {
      left = Math.max(left, clipLeft)
      right = Math.min(right, clipLeft + parent.clientWidth * scaleX)
    }
    if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY)) {
      top = Math.max(top, clipTop)
      bottom = Math.min(bottom, clipTop + parent.clientHeight * scaleY)
    }
  }
  return Math.max(
    left - box.left,
    top - box.top,
    box.right - right,
    box.bottom - bottom
  )
}

/** @import { Locator } from "@playwright/test" */
/** @param {Locator} locator */
export async function assertWithinViewport(locator) {
  await expect
    .poll(() => locator.evaluate(viewportOverhang), {
      message:
        "Element must lie within the viewport (1 CSS px rounding), including ancestor clips",
    })
    .toBeLessThanOrEqual(1)
}
