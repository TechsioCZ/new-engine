import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  new URL("../stories/molecules/popover.stories.tsx", import.meta.url),
  "utf8"
)

function story(name: string) {
  const start = source.indexOf(`export const ${name}:`)
  if (start < 0) {
    throw new Error(`Missing story ${name}`)
  }
  const end = source.indexOf("\nexport const ", start + 1)
  return source.slice(start, end < 0 ? undefined : end)
}

const boundedFixture = /<div\b[^>]*data-popover-bounds[^>]*>/g
const clippingOverflow = /\boverflow-(?:hidden|clip|auto|scroll)\b/
const boundedOptions =
  /placement="bottom"\s+portalled=\{false\}\s+slide=\{(true|false)\}/g

describe("Popover story fixture containment", () => {
  it("centers both bounded triggers without clipping away disabled-slide content", () => {
    const fixture = story("PositioningBehaviors")
    const bounds = [...fixture.matchAll(boundedFixture)]
    expect(bounds).toHaveLength(2)
    for (const [markup] of bounds) {
      expect(markup).toContain("flex justify-center")
      expect(markup).not.toMatch(clippingOverflow)
    }
    expect(
      [...fixture.matchAll(boundedOptions)].map((match) => match[1])
    ).toEqual(["true", "false"])
    expect(fixture).toContain(
      'bounded.closest<HTMLElement>("[data-popover-bounds]")'
    )
    expect(fixture).toContain(
      "expect(rect.left).toBeGreaterThanOrEqual(bounds.left)"
    )
    expect(fixture).toContain(
      "expect(rect.right).toBeLessThanOrEqual(bounds.right)"
    )
  })

  it("reserves separate panel rows even when same-width examples wrap above mobile", () => {
    const fixture = story("SameWidthDemo")
    expect(fixture).toContain("gap-x-400 gap-y-950")
    expect(fixture).toContain('<div className="pb-950">')
    expect(fixture).not.toContain("sm:pb-0")
    expect(fixture.match(/sameWidth=\{true\}/g)).toHaveLength(2)
  })

  it("exercises both same-width panels without weakening sibling-overlap checks", () => {
    const fixture = story("SameWidthDemo")
    expect(fixture).toContain(
      "for (const [index, trigger] of triggers.entries())"
    )
    expect(fixture).toContain("expectNoOverlap(panel, other)")
    expect(fixture).toContain(
      "Math.abs(rect.width - trigger.getBoundingClientRect().width)"
    )
    expect(fixture).toContain(
      "await waitFor(() => expect(trigger).toHaveFocus())"
    )
  })
})
