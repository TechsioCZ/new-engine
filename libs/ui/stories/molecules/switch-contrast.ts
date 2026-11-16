import { expect, userEvent } from "storybook/test"

// Canvas converts modern CSS colors to sRGB; alpha must be composited against
// the actual ancestors, especially Akros's translucent unchecked track.
export async function checkSwitchThumbContrast(root: HTMLElement) {
  if (matchMedia("(forced-colors: active)").matches) {
    return
  }
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) {
    throw new Error("Missing contrast color conversion context")
  }
  const rgba = (color: string) => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    return Array.from(context.getImageData(0, 0, 1, 1).data, (value, index) =>
      index === 3 ? value / 255 : value
    )
  }
  const background = (element: Element | null): number[] => {
    if (!element) {
      return [255, 255, 255, 1]
    }
    const foreground = rgba(getComputedStyle(element).backgroundColor)
    const alpha = foreground[3] ?? 1
    if (alpha === 1) {
      return foreground
    }
    const below = background(element.parentElement)
    return foreground
      .slice(0, 3)
      .map(
        (value, index) => value * alpha + (below[index] ?? 255) * (1 - alpha)
      )
      .concat(1)
  }
  const luminance = (rgb: number[]) =>
    rgb.slice(0, 3).reduce((sum, value, index) => {
      const channel = value / 255
      const linear =
        channel <= 0.040_45
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0)
    }, 0)
  const thumbs = root.querySelectorAll<HTMLElement>(
    '[data-part="thumb"]:not([data-disabled])'
  )
  for (const thumb of thumbs) {
    const track = thumb.parentElement
    if (!track) {
      throw new Error("Missing switch track")
    }
    for (const hover of [false, true]) {
      if (hover) {
        await userEvent.hover(track)
      }
      // Allow the tokenized color transition to settle before measuring.
      await new Promise((resolve) => setTimeout(resolve, 220))
      const thumbLuminance = luminance(background(thumb))
      const trackLuminance = luminance(background(track))
      const ratio =
        (Math.max(thumbLuminance, trackLuminance) + 0.05) /
        (Math.min(thumbLuminance, trackLuminance) + 0.05)
      await expect(ratio).toBeGreaterThanOrEqual(3)
      if (hover) {
        await userEvent.unhover(track)
      }
    }
  }
}
