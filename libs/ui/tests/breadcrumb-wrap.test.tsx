// @vitest-environment happy-dom
import { Fragment } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Breadcrumb } from "../src/molecules/breadcrumb"

function trail(fragment: boolean, collapsed = false) {
  const middle = collapsed ? (
    <Breadcrumb.Ellipsis data-testid="middle" />
  ) : (
    <Breadcrumb.Item data-testid="middle">
      <Breadcrumb.Link href="/components">Components</Breadcrumb.Link>
    </Breadcrumb.Item>
  )
  const first = (
    <Breadcrumb.Item data-testid="first">
      <Breadcrumb.Link href="/docs">Docs</Breadcrumb.Link>
    </Breadcrumb.Item>
  )
  const separator = <Breadcrumb.Separator data-testid="first-separator" />
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    <Breadcrumb>
      <Breadcrumb.List>
        {fragment ? (
          <Fragment key="ancestors">
            {first}
            {separator}
          </Fragment>
        ) : (
          [first, separator]
        )}
        {middle}
        <Breadcrumb.Separator data-testid="last-separator" />
        <Breadcrumb.Item data-testid="current">
          <Breadcrumb.CurrentLink>Breadcrumb</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  )
  return canvas
}

describe("Breadcrumb wrapping", () => {
  it.each([false, true])(
    "keeps separators with the following item across fragments=%s",
    (fragment) => {
      const canvas = trail(fragment)
      const segments = [...canvas.querySelectorAll(".breadcrumb-segment")]
      expect(segments).toHaveLength(2)
      expect(
        canvas
          .querySelector("nav > ol > li:first-child")
          ?.getAttribute("data-testid")
      ).toBe("first")
      for (const [index, segment] of segments.entries()) {
        const list = segment.querySelector("ol")
        const [separator, item] = [...(list?.children ?? [])]
        expect(separator?.getAttribute("aria-hidden")).toBe("true")
        expect(item?.getAttribute("data-testid")).toBe(
          index === 0 ? "middle" : "current"
        )
        expect(item?.getAttribute("role")).toBe("listitem")
      }
      expect(canvas.querySelectorAll('a[href="/docs"]')).toHaveLength(1)
      expect(canvas.querySelectorAll('a[href="/components"]')).toHaveLength(1)
      expect(canvas.querySelector('[aria-current="page"]')?.textContent).toBe(
        "Breadcrumb"
      )
    }
  )

  it("keeps a collapsed segment presentation-only without taking its following separator", () => {
    const canvas = trail(true, true)
    const segments = [...canvas.querySelectorAll(".breadcrumb-segment")]
    expect(segments).toHaveLength(2)
    expect(
      segments[0]
        ?.querySelector("ol > li:first-child")
        ?.getAttribute("data-testid")
    ).toBe("first-separator")
    expect(
      segments[0]?.querySelector('[data-testid="middle"]')?.getAttribute("role")
    ).toBe("presentation")
    expect(
      segments[1]
        ?.querySelector("ol > li:first-child")
        ?.getAttribute("data-testid")
    ).toBe("last-separator")
    expect(
      segments[1]
        ?.querySelector('[data-testid="current"]')
        ?.getAttribute("role")
    ).toBe("listitem")
  })
})
