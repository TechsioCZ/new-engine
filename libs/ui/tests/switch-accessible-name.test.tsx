import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Switch } from "../src/molecules/switch"

const INPUT_TAG = /<input\b[^>]*>/

function inputTag(props: Parameters<typeof Switch>[0]) {
  const match = renderToStaticMarkup(h(Switch, props)).match(INPUT_TAG)
  if (!match) {
    throw new Error("Switch rendered no input")
  }
  return match[0]
}

describe("Switch accessible name", () => {
  it("names a label-less switch with the aria-label prop", () => {
    const tag = inputTag({ "aria-label": "Dark mode" })
    expect(tag).toContain('aria-label="Dark mode"')
    expect(tag).not.toContain("aria-labelledby")
  })

  it("keeps the visible label as the name when children and aria-label are both given", () => {
    const tag = inputTag({
      "aria-label": "Dark mode",
      children: "Notifications",
    })
    expect(tag).not.toContain("aria-label=")
    expect(tag).toContain("aria-labelledby=")
  })

  it("lets an explicit native inputProps aria-label win over the visible label", () => {
    const tag = inputTag({
      children: "Notifications",
      inputProps: { "aria-label": "Email alerts" },
    })
    expect(tag).toContain('aria-label="Email alerts"')
    expect(tag).not.toContain("aria-labelledby=")
  })
})
