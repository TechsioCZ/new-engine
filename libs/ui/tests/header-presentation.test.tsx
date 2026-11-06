// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss, { type AtRule } from "postcss"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import meta, {
  LocalizedHamburger,
  NarrowContainer,
  Sizes,
} from "../stories/organisms/header.stories"

const WHITESPACE = /\s+/g

function Fixture({ story }: { story: typeof Sizes }) {
  const args = { ...meta.args, ...story.args }
  return story.render ? story.render(args, {} as never) : meta.render(args)
}

function canvasFor(story: typeof Sizes) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(<Fixture story={story} />)
  return canvas
}

const css = postcss.parse(
  readFileSync("src/tokens/components/organisms/_header.css", "utf8")
)
const previewCss = postcss.parse(
  readFileSync("stories/organisms/header.preview.css", "utf8")
)

function utility(name: string) {
  const node = css.nodes.find(
    (entry): entry is AtRule =>
      entry.type === "atrule" &&
      entry.name === "utility" &&
      entry.params === name
  )
  if (!node) {
    throw new Error(`Missing Header utility: ${name}`)
  }
  return node
}

// SSR/CSS contracts and DOM interactions only; happy-dom cannot prove geometry.
describe("Header hierarchy and overlay framing", () => {
  it.each(["sm", "md", "lg"] as const)(
    "inherits %s typography for the brand without removing real links or actions",
    (size) => {
      const canvas = canvasFor(Sizes)
      const frame = canvas.querySelector(`[data-header-preview-size="${size}"]`)
      const header = frame?.querySelector("header")
      expect(header?.classList.contains(`text-header-${size}`)).toBe(true)
      const brand = header?.querySelector('a[href="/"]')
      expect(brand?.textContent).toBe("Workshop")
      expect(brand?.classList.contains("link-current-size")).toBe(true)
      expect(brand?.classList.contains("font-semibold")).toBe(true)
      expect(brand?.classList.contains("text-link-md")).toBe(false)
      for (const mode of ["main", "mobile"]) {
        const nav = header?.querySelector(
          `nav[aria-label="Header ${size} ${mode} navigation"]`
        )
        expect(
          Array.from(nav?.querySelectorAll("a") ?? []).map((link) =>
            link.getAttribute("href")
          )
        ).toEqual(["/catalog", "/services", "/contact"])
        expect(nav?.querySelector('[aria-current="page"]')?.textContent).toBe(
          "Catalog"
        )
      }
      expect(header?.querySelector(".header-desktop")?.textContent).toContain(
        "Account"
      )
    }
  )

  it("retains all three labelled frames and absolute overlay panels", () => {
    const canvas = canvasFor(Sizes)
    expect(
      Array.from(canvas.querySelectorAll("h2"), (node) => node.textContent)
    ).toEqual(["Small (sm)", "Medium (md)", "Large (lg)"])
    expect(canvas.querySelectorAll(".header-size-preview")).toHaveLength(3)
    const ids = new Set<string>()
    for (const trigger of canvas.querySelectorAll("button[aria-controls]")) {
      const id = trigger.getAttribute("aria-controls") ?? ""
      ids.add(id)
      const panel = canvas.querySelector(`[id="${id}"]`)
      expect(panel?.classList.contains("absolute")).toBe(true)
      expect(panel?.classList.contains("top-full")).toBe(true)
      expect(trigger.getAttribute("aria-expanded")).toBe("false")
    }
    expect(ids.size).toBe(3)
  })

  it("scopes compact nav gaps to the panel rather than the viewport", () => {
    const panel = utility("header-mobile").toString()
    for (const size of ["sm", "md", "lg"]) {
      expect(panel).toContain(
        `--spacing-header-nav-${size}: var(--spacing-header-mobile-nav-${size})`
      )
    }
    expect(panel).toContain("padding-block: var(--padding-header-mobile)")
    expect(panel).toContain("var(--border-width-header-mobile) solid")
    expect(panel).toContain("var(--color-header-mobile-border)")
    expect(panel).toContain("@container (width >= 48rem)")
    expect(css.toString()).not.toContain("@media")
    expect(utility("header-desktop").toString()).toContain(
      "@container (width >= 48rem)"
    )
    expect(utility("header-hamburger").toString()).toContain("&[aria-controls]")
  })

  it("reserves the three-link overlay height only in the open comparison frame", () => {
    const source = previewCss.toString()
    expect(source).toContain('&:has(.header-mobile[data-open="true"])')
    expect(source).toContain("padding-block-end: calc(")
    expect(source.replaceAll(WHITESPACE, "")).toContain(
      "3lh+6*var(--header-preview-item-padding)"
    )
    expect(source).toContain("var(--header-preview-nav-gap)")
    expect(source).toContain("var(--padding-header-mobile)")
    expect(source).toContain("var(--border-width-header-mobile)")
    for (const size of ["sm", "md", "lg"]) {
      expect(source).toContain(`&[data-header-preview-size="${size}"]`)
      expect(source).toContain(`var(--padding-header-item-${size})`)
      expect(source).toContain(`var(--spacing-header-mobile-nav-${size})`)
    }
    previewCss.walkDecls((declaration) => {
      expect([
        "display",
        "visibility",
        "overflow",
        "overflow-y",
        "position",
      ]).not.toContain(declaration.prop)
    })
  })

  it("insets the localized focus target and separates the auxiliary control", () => {
    const canvas = canvasFor(LocalizedHamburger)
    expect(canvas.firstElementChild?.classList.contains("gap-300")).toBe(true)
    expect(canvas.firstElementChild?.classList.contains("p-200")).toBe(true)
    expect(canvas.querySelector("header")?.classList.contains("p-200")).toBe(
      true
    )
    expect(canvas.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Otevřít nabídku"
    )
  })

  it.each(["sm", "md", "lg"] as const)(
    "keeps every comparison row when the %s overlay is open",
    async (size) => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
      const canvas = document.createElement("div")
      document.body.append(canvas)
      const root = createRoot(canvas)
      try {
        await act(async () => root.render(<Fixture story={Sizes} />))
        const frame = canvas.querySelector(
          `[data-header-preview-size="${size}"]`
        )
        const trigger = frame?.querySelector<HTMLButtonElement>(
          "button[aria-controls]"
        )
        if (!trigger) {
          throw new Error("Missing size-specific mobile trigger")
        }
        await act(async () => trigger.click())
        expect(
          frame?.querySelector('.header-mobile[data-open="true"]')
        ).not.toBeNull()
        expect(
          canvas.querySelectorAll('.header-mobile[data-open="true"]')
        ).toHaveLength(1)
        expect(canvas.querySelectorAll(".header-size-preview")).toHaveLength(3)
        expect(canvas.querySelectorAll("h2")).toHaveLength(3)
        expect(canvas.querySelectorAll("header")).toHaveLength(3)
        expect(
          canvas.querySelector(
            ".header-size-preview[hidden], .header-size-preview[inert], .header-size-preview[aria-hidden]"
          )
        ).toBeNull()
      } finally {
        await act(async () => root.unmount())
        canvas.remove()
        vi.unstubAllGlobals()
      }
    }
  )

  it.each([LocalizedHamburger, NarrowContainer])(
    "preserves default prevention, ARIA targeting, Escape, and focus return",
    async (story) => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
      const canvas = document.createElement("div")
      document.body.append(canvas)
      const root = createRoot(canvas)
      try {
        await act(async () => root.render(<Fixture story={story} />))
        const trigger = canvas.querySelector<HTMLButtonElement>(
          "button[aria-controls]"
        )
        if (!trigger) {
          throw new Error("Missing mobile menu trigger")
        }
        const id = trigger.getAttribute("aria-controls") ?? ""
        const panel = document.getElementById(id)
        expect(panel).not.toBeNull()
        if (story === LocalizedHamburger) {
          expect(trigger.getAttribute("data-ref-attached")).toBe("true")
          await act(async () => trigger.click())
          expect(trigger.getAttribute("aria-expanded")).toBe("false")
          const allow = Array.from(canvas.querySelectorAll("button")).find(
            (button) => button.textContent === "Allow menu opening"
          )
          if (!allow) {
            throw new Error("Missing default-prevention fixture control")
          }
          await act(async () => allow.click())
        }
        await act(async () => trigger.click())
        expect(trigger.getAttribute("aria-expanded")).toBe("true")
        expect(panel?.getAttribute("data-open")).toBe("true")
        panel?.querySelector("a")?.focus()
        await act(() => {
          document.activeElement?.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            })
          )
        })
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
        expect(panel?.getAttribute("data-open")).toBe("false")
        expect(document.activeElement).toBe(trigger)
      } finally {
        await act(async () => root.unmount())
        canvas.remove()
        vi.unstubAllGlobals()
      }
    }
  )
})
