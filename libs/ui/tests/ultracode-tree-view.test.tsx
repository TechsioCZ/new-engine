// @vitest-environment happy-dom
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { type TreeNode, TreeView } from "../src/molecules/tree-view"
import { Controlled } from "../stories/molecules/tree-view.stories"

function markup(children: ReactNode) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(children)
  return canvas
}

const folder: TreeNode = {
  id: "folder",
  name: "Folder",
  selectable: false,
  children: [{ id: "file", name: "File" }],
}
const data = [folder]

function fixture({
  expandedValue = ["folder"],
  selectedValue = ["folder", "file"],
  selectionBehavior = "all",
}: {
  expandedValue?: string[]
  selectedValue?: string[]
  selectionBehavior?: "all" | "leaf-only" | "custom"
} = {}) {
  return markup(
    <TreeView
      data={data}
      expandedValue={expandedValue}
      selectedValue={selectedValue}
      selectionBehavior={selectionBehavior}
      selectionMode="multiple"
    >
      <TreeView.Label>Files</TreeView.Label>
      <TreeView.Tree>
        <TreeView.Node indexPath={[0]} node={folder} />
      </TreeView.Tree>
    </TreeView>
  )
}

function selectedItems(canvas: HTMLElement) {
  return Array.from(
    canvas.querySelectorAll<HTMLElement>('[role="treeitem"][data-selected]')
  ).map((item) => item.dataset.value)
}

describe("TreeView council readability regressions", () => {
  it("initially reveals the controlled story's selected file and its full path", () => {
    if (!Controlled.render) {
      throw new Error("Controlled TreeView must retain its authored example")
    }
    const canvas = markup(
      Controlled.render(Controlled.args as never, {} as never)
    )
    const selected = canvas.querySelector(
      '[data-part="item"][data-value="button.tsx"]'
    )

    expect(selected).not.toBeNull()
    expect(selected?.getAttribute("aria-selected")).toBe("true")
    expect(
      selected?.closest(
        '[hidden], [data-part="branch-content"][data-state="closed"]'
      )
    ).toBeNull()
    for (const value of ["src", "components", "atoms"]) {
      const branch = canvas.querySelector(
        `[role="treeitem"][data-part="branch"][data-value="${value}"]`
      )
      expect(branch?.getAttribute("aria-expanded")).toBe("true")
      expect(branch?.contains(selected)).toBe(true)
      expect(
        branch
          ?.querySelector('[data-part="branch-indicator"]')
          ?.getAttribute("aria-expanded")
      ).toBe("true")
    }
  })

  it("does not force controlled branches open just because a child is selected", () => {
    const canvas = fixture({ expandedValue: [], selectedValue: ["file"] })
    const file = canvas.querySelector('[data-part="item"][data-value="file"]')

    expect(selectedItems(canvas)).toEqual(["file"])
    const branch = canvas.querySelector(
      '[role="treeitem"][data-part="branch"][data-value="folder"]'
    )
    expect(branch?.getAttribute("aria-expanded")).toBe("false")
    expect(
      branch
        ?.querySelector('[data-part="branch-indicator"]')
        ?.getAttribute("aria-expanded")
    ).toBe("false")
    expect(
      file?.closest('[data-part="branch-content"][data-state="closed"]')
    ).not.toBeNull()
  })

  it.each(["leaf-only", "custom"] as const)(
    "keeps ineligible branches unselected in %s mode",
    (selectionBehavior) => {
      const canvas = fixture({ selectionBehavior })

      expect(selectedItems(canvas)).toEqual(["file"])
      const branch = canvas.querySelector(
        '[role="treeitem"][data-part="branch"][data-value="folder"]'
      )
      expect(branch?.getAttribute("aria-selected")).toBe("false")
      expect(branch?.hasAttribute("data-selected")).toBe(false)
      expect(branch?.getAttribute("aria-expanded")).toBe("true")

      const control = branch?.querySelector('[data-part="branch-control"]')
      expect(control?.getAttribute("role")).toBe("button")
      expect(control?.getAttribute("tabindex")).toBe("0")

      const disclosure = branch?.querySelector('[data-part="branch-indicator"]')
      expect(disclosure?.tagName).toBe("BUTTON")
      expect(disclosure?.getAttribute("aria-label")).toBe("Collapse Folder")
      expect(disclosure?.getAttribute("aria-expanded")).toBe("true")
      expect(disclosure?.hasAttribute("aria-hidden")).toBe(false)
      expect(disclosure?.getAttribute("tabindex")).toBe("-1")
    }
  )

  it("still permits branch selection in all mode", () => {
    expect(selectedItems(fixture())).toEqual(["folder", "file"])
  })
})
