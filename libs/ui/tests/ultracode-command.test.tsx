// @vitest-environment happy-dom
import { type ComponentProps, createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { Command } from "../src/molecules/command"
import hotkeyMeta from "../stories/molecules/command-hotkeys.stories"

vi.mock("../src/molecules/dialog", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/molecules/dialog")>()
  return {
    ...actual,
    Dialog: (props: ComponentProps<typeof actual.Dialog>) =>
      h(actual.Dialog, { ...props, open: true, portal: false }),
  }
})

function paletteMarkup() {
  const container = document.createElement("div")
  container.innerHTML = renderToStaticMarkup(
    hotkeyMeta.render({ initiallyOpen: true, showAvailability: false }, {
      viewMode: "story",
    } as never)
  )
  return container
}

function queryMarkup(query = "") {
  return renderToStaticMarkup(
    <Command
      inputValue={query}
      items={[
        { value: "overview", label: "Overview" },
        { value: "orders", label: "Orders", keywords: ["invoice"] },
        { value: "help", label: "Help", keywords: ["documentation"] },
      ]}
    >
      <Command.Label>Actions</Command.Label>
      <Command.Control>
        <Command.Input placeholder="Search actions…" />
      </Command.Control>
      <Command.List>
        <Command.Context>
          {(api) =>
            api.collection.items.map((item) => (
              <Command.Item item={item} key={item.value}>
                <Command.ItemText />
              </Command.Item>
            ))
          }
        </Command.Context>
      </Command.List>
      <Command.Empty>No matching actions</Command.Empty>
    </Command>
  )
}

describe("Command palette presentation", () => {
  it("deliberately aligns mobile hints in two rows and retains desktop wrapping", () => {
    const palette = paletteMarkup()
    const footer = [...palette.querySelectorAll("p")].find((paragraph) =>
      paragraph.textContent?.includes("to navigate")
    )
    expect(footer).toBeDefined()
    expect(footer?.classList.contains("grid")).toBe(true)
    expect(footer?.classList.contains("grid-cols-2")).toBe(true)
    expect(footer?.classList.contains("sm:flex")).toBe(true)
    expect(footer?.classList.contains("sm:flex-wrap")).toBe(true)
    expect(footer?.children).toHaveLength(3)
    expect(footer?.children[0]?.classList.contains("col-span-2")).toBe(true)
    for (const [index, text] of [
      "to navigate",
      "to run",
      "to close",
    ].entries()) {
      const hint = footer?.children[index]
      expect(hint?.textContent).toContain(text)
      expect(hint?.querySelector("kbd")).not.toBeNull()
      expect(hint?.classList.contains("inline-flex")).toBe(true)
      expect(hint?.getAttribute("aria-hidden")).toBeNull()
    }
  })

  it("keeps the named search, grouped actions and dialog dismissal in the fixture", () => {
    const palette = paletteMarkup()
    const dialog = palette.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    if (!dialog) {
      throw new Error("Missing Command palette dialog")
    }
    expect(dialog.querySelector("h2")?.textContent).toBe("Command palette")
    expect(
      dialog.querySelector('button[aria-label="Close dialog"]')
    ).not.toBeNull()
    const input = dialog.querySelector('input[role="combobox"]')
    expect(input).not.toBeNull()
    if (!input) {
      throw new Error("Missing Command palette search input")
    }
    expect(input.getAttribute("placeholder")).toBe("Search actions…")
    expect(input.id).toBeTruthy()
    const label = [...dialog.querySelectorAll("label")].find(
      (element) => element.htmlFor === input.id
    )
    expect(label?.textContent).toBe("Actions")
    const options = [...dialog.querySelectorAll('[role="option"]')]
    expect(options.map((option) => option.textContent)).toEqual([
      "Save document",
      "Help",
    ])
    expect(dialog.textContent).toContain("Document")
    expect(dialog.textContent).toContain("Support")
    expect(input.hasAttribute("aria-activedescendant")).toBe(false)
  })
})

describe("Command query compatibility", () => {
  it.each([
    ["invoice", "Orders"],
    ["documentation", "Help"],
  ])(
    "retains full keyword query %s and its matching action",
    (query, label) => {
      const container = document.createElement("div")
      container.innerHTML = queryMarkup(query)
      expect(container.querySelector("input")?.value).toBe(query)
      const options = [...container.querySelectorAll('[role="option"]')]
      expect(options.map((option) => option.textContent)).toEqual([label])
      expect(container.querySelector("output")?.textContent).toBe("")
    }
  )

  it("does not imply an invisible Enter target before typing or navigation", () => {
    const container = document.createElement("div")
    container.innerHTML = queryMarkup()
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(3)
    expect(container.querySelector("[data-highlighted]")).toBeNull()
    expect(
      container.querySelector("input")?.hasAttribute("aria-activedescendant")
    ).toBe(false)
  })

  it("preserves visible empty-state feedback", () => {
    const container = document.createElement("div")
    container.innerHTML = queryMarkup("unmatched query")
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0)
    expect(container.querySelector("output")?.textContent).toBe(
      "No matching actions"
    )
    expect(container.querySelector("output")?.hasAttribute("data-empty")).toBe(
      true
    )
  })
})
