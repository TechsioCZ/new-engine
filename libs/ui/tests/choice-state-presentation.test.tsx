// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss, { type AnyNode } from "postcss"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { compile } from "tailwindcss"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ColorSelect } from "../src/molecules/color-select"
import { radioCardVariants } from "../src/molecules/radio-card"

// DOM, generated-selector and token contracts only; no paint/contrast claims.
const roots: Root[] = []
const colorAlteringClasses = /grayscale|opacity-|brightness-/
const hoverPseudo = /(?<!\\):hover/g
const colors = [
  { color: "#1e3a8a", label: "Navy", selected: true },
  { color: "#16a34a", label: "Forest", disabled: true },
  { color: "#d4b896", label: "Sand" },
]

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing choice-state fixture")
  }
  return value
}

async function compiledSelector(
  candidate: string,
  token: string,
  property: string
) {
  const compiler = await compile(
    `@theme { --color-${token}: var(--test-paint); }\n@tailwind utilities;`
  )
  const css = postcss.parse(compiler.build([candidate]))
  let selector = ""
  css.walkDecls(property, (declaration) => {
    let current: AnyNode | undefined = declaration.parent
    let nested = "&"
    while (current) {
      if (current.type === "rule") {
        nested = nested.replaceAll("&", current.selector)
      }
      current = current.parent
    }
    selector = nested
  })
  if (!selector) {
    throw new Error(`Missing compiled ${property} rule for ${candidate}`)
  }
  return selector
}

async function mount(children: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(children))
  return canvas
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("ColorSelect state cues", () => {
  it("uses a dashed border only on disabled swatch controls", () => {
    const css = postcss.parse(
      readFileSync(
        resolve(
          dirname(fileURLToPath(import.meta.url)),
          "../src/tokens/components/molecules/_color-select.css"
        ),
        "utf8"
      )
    )
    const selectors: string[] = []
    css.walkAtRules("utility", (utility) => {
      if (utility.params === "color-select-disabled") {
        utility.walkDecls("border-style", (declaration) => {
          expect(declaration.value).toBe("dashed")
          const parent = declaration.parent
          if (parent?.type === "rule") {
            selectors.push(parent.selector)
          }
        })
      }
    })
    expect(selectors).toEqual(["&:disabled"])
  })

  it.each(["enabled", "readonly", "disabled"] as const)(
    "%s preserves branded fills, captions and native disabled distinctions",
    async (state) => {
      const onColorClick = vi.fn()
      const canvas = await mount(
        <form>
          <ColorSelect
            colors={colors}
            disabled={state === "disabled"}
            name="fabric"
            onColorClick={onColorClick}
            readOnly={state === "readonly"}
          />
        </form>
      )
      const radios = canvas.querySelectorAll<HTMLButtonElement>("button")
      expect(radios).toHaveLength(colors.length)
      for (const [index, item] of colors.entries()) {
        const radio = required(radios[index])
        const fill = required(radio.firstElementChild as HTMLElement | null)
        const reference = document.createElement("span")
        reference.style.backgroundColor = item.color
        expect(fill.style.backgroundColor).toBe(reference.style.backgroundColor)
        expect(fill.classList.contains("forced-color-adjust-none")).toBe(true)
        expect(radio.className).not.toMatch(colorAlteringClasses)
        expect(radio.classList.contains("select-disabled")).toBe(false)
        expect(radio.classList.contains("color-select-disabled")).toBe(true)
        expect(radio.classList.contains("disabled:shadow-none")).toBe(true)
        expect(radio.disabled).toBe(state === "disabled" || !!item.disabled)
        expect(radio.getAttribute("aria-checked")).toBe(String(!!item.selected))
        expect(radio.parentElement?.textContent).toContain(item.label)
        expect(
          radio.classList.contains("hover:border-color-select-border-hover")
        ).toBe(false)
        expect(
          radio.classList.contains(
            "not-disabled:not-data-readonly:not-data-[selected=true]:hover:border-color-select-border-hover"
          )
        ).toBe(true)
        expect(
          radio.classList.contains("focus-visible:outline-color-select-ring")
        ).toBe(true)
      }
      const form = required(canvas.querySelector("form"))
      expect(new FormData(form).getAll("fabric")).toEqual(
        state === "disabled" ? [] : ["#1e3a8a"]
      )
      await act(() => required(radios[2]).click())
      expect(onColorClick.mock.calls).toEqual(
        state === "enabled" ? [["#d4b896"]] : []
      )
    }
  )

  it("limits swatch hover to editable, enabled, unselected controls", async () => {
    const canvas = await mount(<ColorSelect colors={colors} />)
    const radio = required(canvas.querySelector<HTMLButtonElement>("button"))
    const candidate = required(
      [...radio.classList].find((value) =>
        value.endsWith(":border-color-select-border-hover")
      )
    )
    // Exercise the state exclusions without pretending the DOM emulator paints hover.
    const selector = (
      await compiledSelector(
        candidate,
        "color-select-border-hover",
        "border-color"
      )
    ).replaceAll(hoverPseudo, "")
    radio.removeAttribute("data-selected")
    expect(radio.matches(selector)).toBe(true)
    radio.setAttribute("data-selected", "true")
    expect(radio.matches(selector)).toBe(false)
    radio.removeAttribute("data-selected")
    radio.setAttribute("data-readonly", "")
    expect(radio.matches(selector)).toBe(false)
    radio.removeAttribute("data-readonly")
    radio.disabled = true
    expect(radio.matches(selector)).toBe(false)
  })

  it("keeps readonly swatch focus distinct from selected value and group recovery focus", async () => {
    const onColorClick = vi.fn()
    const canvas = await mount(
      <ColorSelect colors={colors} onColorClick={onColorClick} readOnly />
    )
    const sand = required(
      canvas.querySelector<HTMLButtonElement>(
        '[aria-label="Select color Sand"]'
      )
    )
    const group = required(canvas.querySelector('[role="radiogroup"]'))
    await act(() => {
      sand.focus()
      sand.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
      sand.click()
    })
    expect(document.activeElement).toBe(sand)
    expect(sand.tabIndex).toBe(0)
    expect(sand.getAttribute("aria-checked")).toBe("false")
    expect(
      canvas.querySelector('[aria-checked="true"]')?.getAttribute("aria-label")
    ).toBe("Select color Navy")
    expect(group.getAttribute("aria-readonly")).toBe("true")
    expect(
      group.classList.contains("focus-visible:outline-color-select-ring")
    ).toBe(true)
    expect(onColorClick).not.toHaveBeenCalled()
  })
})

describe("RadioCard hover ownership", () => {
  it.each(["outline", "subtle", "solid"] as const)(
    "%s reserves editable hover paint for enabled, non-readonly cards",
    (variant) => {
      const classes = radioCardVariants({ variant }).item().split(" ")
      const hover = classes.filter((value) => value.startsWith("data-hover:"))
      expect(hover).toHaveLength(4)
      for (const value of hover) {
        expect(value).toContain(
          "data-hover:not-data-readonly:not-data-disabled:"
        )
      }
      expect(classes).toContain("data-focus-visible:outline-radio-card-ring")
      expect(classes).toContain(
        "data-invalid:border-radio-card-item-border-error"
      )
      expect(classes).toContain(
        `data-[state=checked]:border-radio-card-item-border-${variant}-checked`
      )
    }
  )

  it("compiles the guarded hover selector so readonly/disabled cannot match editable paint", async () => {
    const candidate = required(
      radioCardVariants()
        .item()
        .split(" ")
        .find((value) => value.endsWith(":bg-radio-card-item-bg-hover"))
    )
    const selector = await compiledSelector(
      candidate,
      "radio-card-item-bg-hover",
      "background-color"
    )
    const item = document.createElement("label")
    item.className = candidate
    item.setAttribute("data-hover", "")
    expect(item.matches(selector)).toBe(true)
    for (const state of ["data-readonly", "data-disabled"]) {
      item.setAttribute(state, "")
      expect(item.matches(selector)).toBe(false)
      item.removeAttribute(state)
    }
  })

  it.each(["outline", "subtle", "solid"] as const)(
    "%s keeps invalid borders out of editable hover rules",
    async (variant) => {
      const candidates = radioCardVariants({ variant })
        .item()
        .split(" ")
        .filter(
          (value) =>
            value.startsWith("data-hover:") && value.includes(":border-")
        )
      expect(candidates).toHaveLength(2)
      for (const candidate of candidates) {
        const token = required(candidate.split(":").at(-1)).slice(
          "border-".length
        )
        const selector = await compiledSelector(
          candidate,
          token,
          "border-color"
        )
        const item = document.createElement("label")
        item.className = candidate
        item.setAttribute("data-state", "checked")
        item.setAttribute("data-hover", "")
        expect(item.matches(selector)).toBe(true)
        for (const state of [
          "data-invalid",
          "data-readonly",
          "data-disabled",
        ]) {
          item.setAttribute(state, "")
          expect(item.matches(selector)).toBe(false)
          item.removeAttribute(state)
        }
      }
    }
  )

  it("does not apply the editable outline hover text pairing to readonly cards", () => {
    const css = postcss.parse(
      readFileSync(
        resolve(
          dirname(fileURLToPath(import.meta.url)),
          "../src/tokens/components/molecules/_radio-card.css"
        ),
        "utf8"
      )
    )
    let selector = ""
    css.walkAtRules("utility", (utility) => {
      if (utility.params !== "radio-card-outline-readable") {
        return
      }
      utility.walkRules((rule) => {
        if (rule.parent === utility) {
          selector = rule.selector.replace("&", ".radio-card-outline-readable")
        }
      })
    })
    expect(selector).not.toBe("")
    const item = document.createElement("label")
    item.className = "radio-card-outline-readable"
    item.setAttribute("data-state", "checked")
    item.setAttribute("data-hover", "")
    expect(item.matches(selector)).toBe(true)
    item.setAttribute("data-readonly", "")
    expect(item.matches(selector)).toBe(false)
  })
})
