// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import { act, type CSSProperties, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ColorSelect } from "../src/molecules/color-select"

const roots: Root[] = []
const css = postcss.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../src/tokens/components/molecules/_color-select.css"
    ),
    "utf8"
  )
)
const whitespace = /\s+/g
const longLabel = "UnbrokenLocalizedColorNameThatCannotWrapAtSpaces"
const colors = [
  { color: "#ffffff", label: longLabel, count: 1_000_000, selected: true },
  { color: "#92400e", label: "Chestnut", disabled: true },
  { color: "#c00040", label: "Weißaluminiumperleffekt", count: 0 },
]

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing ColorSelect fixture")
  }
  return value
}

async function mount(children: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(children))
  return canvas
}

function groupIn(canvas: HTMLElement) {
  return required(canvas.querySelector<HTMLElement>('[role="radiogroup"]'))
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("ColorSelect compact presentation repairs", () => {
  it.each([0, 1, 2, 3, 5])(
    "caps sparse tracks at the actual option count (%i), with a valid empty fallback",
    async (count) => {
      const canvas = await mount(
        <ColorSelect
          colors={Array.from({ length: count }, (_, index) => ({
            id: String(index),
            color: `rgb(${index}, 0, 0)`,
          }))}
        />
      )
      const group = groupIn(canvas)
      expect(group.style.getPropertyValue("--color-select-option-count")).toBe(
        String(Math.max(1, count))
      )
      expect(group.classList.contains("color-select-grid")).toBe(true)
      expect(group.classList.contains("p-color-select-group")).toBe(true)
      expect(group.querySelectorAll("button")).toHaveLength(count)
    }
  )

  it("uses the responsive column maximum and a stable symmetric focus inset", () => {
    let columns: string | undefined
    css.walkAtRules("utility", (rule) => {
      if (rule.params !== "color-select-grid") {
        return
      }
      for (const node of rule.nodes ?? []) {
        if (node.type === "decl" && node.prop === "grid-template-columns") {
          columns = node.value.replace(whitespace, "")
        }
      }
    })
    expect(columns).toBe(
      "repeat(min(var(--cols-num),var(--color-select-option-count,var(--cols-num))),minmax(0,1fr))"
    )
    let padding: string | undefined
    css.walkDecls("--padding-color-select-group", (declaration) => {
      padding = declaration.value
    })
    expect(padding).toBe("var(--spacing-color-select-sm)")
  })

  it("preserves consumer layout styles, direction and padding overrides", async () => {
    const canvas = await mount(
      <ColorSelect
        className="p-0"
        colors={colors}
        dir="rtl"
        style={
          {
            "--cols-num": 1,
            "--color-select-option-count": 2,
            maxWidth: "22rem",
          } as CSSProperties
        }
      />
    )
    const group = groupIn(canvas)
    expect(group.dir).toBe("rtl")
    expect(group.classList.contains("p-0")).toBe(true)
    expect(group.style.maxWidth).toBe("22rem")
    expect(group.style.getPropertyValue("--cols-num")).toBe("1")
    expect(group.style.getPropertyValue("--color-select-option-count")).toBe(
      "2"
    )
  })

  it("retains complete captions, zero counts, exact colors and submitted selections", async () => {
    const canvas = await mount(<ColorSelect colors={colors} name="fabric" />)
    expect(canvas.textContent).toContain(longLabel)
    expect(canvas.textContent).toContain("Weißaluminiumperleffekt")
    expect(canvas.textContent).toContain("(1000000)")
    expect(canvas.textContent).toContain("(0)")
    const radios = canvas.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true")
    expect(radios).toHaveLength(colors.length)
    for (const [index, { color }] of colors.entries()) {
      const reference = document.createElement("span")
      reference.style.backgroundColor = color
      expect(radios[index]?.querySelector("span")?.style.backgroundColor).toBe(
        reference.style.backgroundColor
      )
    }
    expect(radios[1]?.disabled).toBe(true)
    const value = required(
      canvas.querySelector<HTMLInputElement>('input[name="fabric"]')
    )
    expect(value.value).toBe("#ffffff")
    expect(value.disabled).toBe(false)
  })

  it("keeps arrow focus, disabled-option skipping and RTL navigation intact", async () => {
    const onColorClick = vi.fn()
    const canvas = await mount(
      <ColorSelect colors={colors} onColorClick={onColorClick} />
    )
    const radios = canvas.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    const first = required(radios[0])
    const last = required(radios[2])
    await act(() => {
      first.focus()
      first.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
    })
    expect(document.activeElement).toBe(last)
    expect(onColorClick).toHaveBeenLastCalledWith("#c00040")
    expect(last.tabIndex).toBe(0)
    expect(first.tabIndex).toBe(-1)
    // Model the browser's computed RTL direction without relying on DOM-emulator inheritance.
    vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
      direction: "rtl",
    } as CSSStyleDeclaration)
    await act(() => {
      last.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
    })
    expect(document.activeElement).toBe(first)
    expect(onColorClick).toHaveBeenLastCalledWith("#ffffff")
  })

  it("keeps read-only selection and linked validation while ignoring activation", async () => {
    const onColorClick = vi.fn()
    const canvas = await mount(
      <ColorSelect
        colors={colors}
        helpText="Confirm the fabric with support."
        name="fabric"
        onColorClick={onColorClick}
        readOnly
        validateStatus="error"
      />
    )
    const group = groupIn(canvas)
    const last = required(
      group.querySelectorAll<HTMLButtonElement>("button")[2]
    )
    await act(() => {
      last.click()
      last.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
    })
    expect(onColorClick).not.toHaveBeenCalled()
    expect(group.getAttribute("aria-readonly")).toBe("true")
    expect(last.disabled).toBe(false)
    expect(last.getAttribute("aria-invalid")).toBe("true")
    const errorId = required(last.getAttribute("aria-errormessage"))
    expect(document.getElementById(errorId)?.textContent).toContain(
      "Confirm the fabric with support."
    )
    expect(last.getAttribute("aria-describedby")).toContain(errorId)
    expect(
      canvas.querySelector<HTMLInputElement>('input[name="fabric"]')?.value
    ).toBe("#ffffff")
  })
})
