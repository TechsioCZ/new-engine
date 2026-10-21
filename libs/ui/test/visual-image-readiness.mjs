/** Runs in the browser via page.evaluate; keep this function self-contained.
 * Broken sources are expected only in the native-fallback and fallback-ref demos,
 * after the component has hidden it and rendered its accessible replacement.
 * Other stories, URLs and incomplete fallback states must still fail capture.
 * @param {string} storyId
 */
export async function assertDecodedVisualImages(storyId) {
  const expectedBrokenSource = new Map([
    [
      "molecules-carousel--native-media-fallbacks",
      "data:image/png;base64,invalid",
    ],
    [
      "molecules-productcard--native-media-fallback",
      "data:image/png;base64,invalid",
    ],
    ["atoms-image--primitive-refs", "data:image/png;base64,not-an-image"],
  ]).get(storyId)
  /** @param {Element | null | undefined} replacement */
  function isRenderedAccessibleReplacement(replacement) {
    if (
      !(
        replacement?.getAttribute("aria-label")?.trim() &&
        Array.from(replacement.getClientRects()).some(
          (box) => box.width > 0 && box.height > 0
        )
      )
    ) {
      return false
    }
    for (let element = replacement; element; element = element.parentElement) {
      const style = getComputedStyle(element)
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        Number(style.opacity) === 0 ||
        element.getAttribute("aria-hidden") === "true" ||
        element.hasAttribute("inert")
      ) {
        return false
      }
    }
    return true
  }
  for (const image of document.images) {
    const style = getComputedStyle(image)
    if (
      !(image.currentSrc && image.getClientRects().length) ||
      style.display === "none" ||
      style.visibility === "hidden"
    ) {
      continue
    }
    if (
      !(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
    ) {
      const media = image.closest('[data-image-state="error"]')
      const fallback = media?.querySelector('[data-image-fallback][role="img"]')
      if (
        image.currentSrc === expectedBrokenSource &&
        image.complete &&
        image.getAttribute("aria-hidden") === "true" &&
        style.opacity === "0" &&
        isRenderedAccessibleReplacement(fallback)
      ) {
        continue
      }
      throw new Error(`Visible image failed to load: ${image.currentSrc}`)
    }
    await image.decode()
  }
}
