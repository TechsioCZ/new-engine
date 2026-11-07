// @vitest-environment happy-dom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../src/organisms/data-table"

let root: Root | undefined

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal("ResizeObserver", undefined)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function fixture({
  direction = "ltr",
  left = 173,
  keyboard = true,
  overflow = true,
}: {
  direction?: "ltr" | "rtl"
  left?: number
  keyboard?: boolean
  overflow?: boolean
} = {}) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  root = createRoot(canvas)
  await act(async () => {
    root?.render(
      <DataTable
        columns={[{ accessorKey: "name", header: "Name" }]}
        data={Array.from({ length: 30 }, (_, index) => ({
          name: `Row ${index}`,
        }))}
        enablePagination
      />
    )
    await Promise.resolve()
  })
  const nav = canvas.querySelector<HTMLElement>('nav[aria-label="pagination"]')
  const link = nav?.querySelector<HTMLAnchorElement>('a[aria-label="page 2"]')
  if (!(nav && link && nav.parentElement)) {
    throw new Error("Missing pagination fixture")
  }
  nav.style.direction = direction
  nav.style.scrollPaddingInlineStart = "6px"
  nav.style.scrollPaddingInlineEnd = "6px"
  nav.scrollTop = 19
  const ancestor = nav.parentElement
  ancestor.scrollLeft = 17
  ancestor.scrollTop = 29
  Object.defineProperties(nav, {
    clientLeft: { configurable: true, value: 0 },
    clientWidth: { configurable: true, value: 155 },
    scrollWidth: { configurable: true, value: overflow ? 228 : 155 },
  })
  vi.spyOn(nav, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(34.765_625, 0, 155.468_75, 52)
  )
  vi.spyOn(link, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(left - nav.scrollLeft, 6, 40, 40)
  )
  const nativeMatches = link.matches.bind(link)
  vi.spyOn(link, "matches").mockImplementation((selector) =>
    selector === ":focus-visible" ? keyboard : nativeMatches(selector)
  )
  return { nav, link, ancestor, canvas }
}

describe("DataTable pagination focus reveal", () => {
  it.each([
    { direction: "ltr" as const, left: 173, expected: 29.234_375 },
    { direction: "rtl" as const, left: 12, expected: -28.765_625 },
  ])(
    "reveals an overflowing $direction control without moving focus or ancestors",
    async ({ direction, left, expected }) => {
      const { nav, link, ancestor } = await fixture({ direction, left })
      await act(async () => link.focus())
      expect(nav.scrollLeft).toBe(expected)
      expect(document.activeElement).toBe(link)
      expect([ancestor.scrollLeft, ancestor.scrollTop, nav.scrollTop]).toEqual([
        17, 29, 19,
      ])
      expect(link.getAttribute("aria-current")).not.toBe("page")
    }
  )

  it.each([{ left: 80 }, { keyboard: false }, { overflow: false }])(
    "leaves visible, pointer-focused or non-overflowing controls alone: %j",
    async (options) => {
      const { nav, link } = await fixture(options)
      await act(async () => link.focus())
      expect(nav.scrollLeft).toBe(0)
      expect(document.activeElement).toBe(link)
    }
  )

  it("does not fight a manual scroll after focus", async () => {
    const { nav, link } = await fixture()
    await act(async () => link.focus())
    expect(nav.scrollLeft).toBeGreaterThan(0)
    nav.scrollLeft = 11
    await act(async () => nav.dispatchEvent(new Event("scroll")))
    expect(nav.scrollLeft).toBe(11)
    expect(document.activeElement).toBe(link)
  })
})
