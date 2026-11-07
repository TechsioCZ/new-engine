// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type ColumnDef, DataTable } from "../src/organisms/data-table"

const roots: Root[] = []

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing DataTable fixture element")
  }
  return value
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
    }
  )
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

async function mount(element: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(element))
  return canvas
}

function button(canvas: HTMLElement, label: string) {
  return required(
    canvas.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  )
}

function input(canvas: HTMLElement, label: string) {
  return required(
    canvas.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  )
}

async function click(canvas: HTMLElement, label: string) {
  await act(() => button(canvas, label).click())
}

function change(field: HTMLInputElement, value: string) {
  const setter = required(
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  )
  setter.call(field, value)
  field.dispatchEvent(new Event("input", { bubbles: true }))
}

function feedback(field: HTMLInputElement) {
  const errorId = field.getAttribute("aria-errormessage")
  const descriptionId = field.getAttribute("aria-describedby")
  let errorReference: string | null = null
  if (errorId !== null || descriptionId !== null) {
    const linked =
      errorId &&
      errorId === descriptionId &&
      document.getElementById(errorId)?.textContent
    errorReference = linked ? "linked" : "broken"
  }
  return {
    ariaInvalid: field.getAttribute("aria-invalid"),
    dangerBorder: field.classList.contains("border-input-border-danger-base"),
    errorReference,
  }
}

const validFeedback = {
  ariaInvalid: null,
  dangerBorder: false,
  errorReference: null,
}
const invalidFeedback = {
  ariaInvalid: "true",
  dangerBorder: true,
  errorReference: "linked",
}

type RangeRecord = { period: { from: string; to: string } }
const rangeColumns: ColumnDef<RangeRecord, unknown>[] = [
  {
    accessorKey: "period",
    header: "Period",
    cell: () => "Period",
    meta: { type: "dateRange", editable: true, required: true },
  },
]

describe("DataTable native editor feedback", () => {
  it.each([
    { size: "sm", tableLayout: "auto" },
    { size: "md", tableLayout: "fixed" },
    { size: "lg", tableLayout: "auto" },
  ] as const)(
    "labels and separates range endpoints without moving editor focus (%s)",
    async ({ size, tableLayout }) => {
      const canvas = await mount(
        <DataTable
          columns={rangeColumns}
          data={[{ period: { from: "2026-04-01", to: "2026-04-03" } }]}
          enableInlineEdit
          size={size}
          tableLayout={tableLayout}
        />
      )
      await click(canvas, "Edit row 0")
      const from = input(canvas, "Edit Period: Start")
      const to = input(canvas, "Edit Period: End")
      const range = required(from.closest("[data-date-range-editor]"))
      expect(range.contains(to)).toBe(true)
      expect(range.classList.contains("gap-data-table-date-range")).toBe(true)
      expect(range.classList.contains("flex-col")).toBe(true)
      for (const [field, text] of [
        [from, "Start"],
        [to, "End"],
      ] as const) {
        const label = required(field.labels?.[0])
        expect(label.textContent).toBe(text)
        expect(field.getAttribute("aria-label")).toContain(text)
        expect(label.control).toBe(field)
        expect(label.htmlFor).toBe(field.id)
        expect(label.classList.contains("gap-data-table-editor")).toBe(true)
        const caption = required(label.querySelector("span"))
        expect(caption.textContent).toBe(text)
        expect(
          caption.classList.contains(
            "text-(length:--text-data-table-editor-label)"
          )
        ).toBe(true)
        expect(
          caption.classList.contains("text-data-table-editor-label-fg")
        ).toBe(true)
      }
      expect(document.activeElement).toBe(from)
      await act(() => change(from, "2026-04-02"))
      expect(document.activeElement).toBe(from)
      expect(to.min).toBe("2026-04-02")
      expect(to.value).toBe("2026-04-03")
      await click(canvas, "Cancel edit")
      expect(document.activeElement).toBe(button(canvas, "Edit row 0"))
    }
  )

  it.each(["string", "date", "datetime", "time"] as const)(
    "uses Input's error variant for a required %s editor only after validation",
    async (type) => {
      const canvas = await mount(
        <DataTable
          columns={[
            {
              accessorKey: "value",
              header: "Value",
              meta: { type, editable: true, required: true },
            },
          ]}
          data={[{ value: "" }]}
          enableInlineEdit
        />
      )
      await click(canvas, "Edit row 0")
      expect(feedback(input(canvas, "Edit Value"))).toEqual(validFeedback)
      await click(canvas, "Save row")
      expect(feedback(input(canvas, "Edit Value"))).toEqual(invalidFeedback)
      await click(canvas, "Cancel edit")
      await click(canvas, "Edit row 0")
      expect(feedback(input(canvas, "Edit Value"))).toEqual(validFeedback)
    }
  )

  it.each([
    { from: "", to: "" },
    { from: "2026-04-01", to: "2026-03-29" },
  ])(
    "marks both range fields and keeps native dates editable: %j",
    async (period) => {
      const onEditCommit = vi.fn()
      const canvas = await mount(
        <DataTable
          columns={rangeColumns}
          data={[{ period }]}
          enableInlineEdit
          onEditCommit={onEditCommit}
        />
      )
      await click(canvas, "Edit row 0")
      const from = input(canvas, "Edit Period: Start")
      const to = input(canvas, "Edit Period: End")
      expect(from.type).toBe("date")
      expect(to.type).toBe("date")
      expect(from.value).toBe(period.from)
      expect(to.value).toBe(period.to)
      expect(feedback(from)).toEqual(validFeedback)
      expect(feedback(to)).toEqual(validFeedback)
      await click(canvas, "Save row")
      expect(onEditCommit).not.toHaveBeenCalled()
      expect(feedback(from)).toEqual(invalidFeedback)
      expect(feedback(to)).toEqual(invalidFeedback)
      expect(from.getAttribute("aria-errormessage")).toBe(
        to.getAttribute("aria-errormessage")
      )
      await act(() => {
        change(from, "2026-04-02")
        change(to, "2026-04-05")
      })
      expect(to.min).toBe("2026-04-02")
      expect(feedback(from)).toEqual(validFeedback)
      expect(feedback(to)).toEqual(validFeedback)
      await click(canvas, "Save row")
      expect(onEditCommit).toHaveBeenCalledOnce()
      expect(onEditCommit.mock.calls[0]?.[0].draft.period).toEqual({
        from: "2026-04-02",
        to: "2026-04-05",
      })
    }
  )

  it.each(["from", "to"])(
    "preserves Enter commit and Escape cancel from the range's %s field",
    async (endpoint) => {
      const onEditCommit = vi.fn()
      const onEditCancel = vi.fn()
      const period = { from: "2026-04-01", to: "2026-04-03" }
      const canvas = await mount(
        <DataTable
          columns={rangeColumns}
          data={[{ period }]}
          enableInlineEdit
          onEditCancel={onEditCancel}
          onEditCommit={onEditCommit}
        />
      )
      await click(canvas, "Edit row 0")
      const enter = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
      await act(() => {
        input(
          canvas,
          `Edit Period: ${endpoint === "from" ? "Start" : "End"}`
        ).dispatchEvent(enter)
      })
      expect(enter.defaultPrevented).toBe(true)
      expect(onEditCommit).toHaveBeenCalledOnce()
      expect(onEditCommit.mock.calls[0]?.[0].draft.period).toEqual(period)
      await click(canvas, "Edit row 0")
      await act(() => {
        change(input(canvas, "Edit Period: End"), "2026-04-05")
      })
      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
      await act(() => {
        input(
          canvas,
          `Edit Period: ${endpoint === "from" ? "Start" : "End"}`
        ).dispatchEvent(escapeEvent)
      })
      expect(escapeEvent.defaultPrevented).toBe(true)
      expect(onEditCancel).toHaveBeenCalledWith({ rowId: "0", dirty: true })
      expect(onEditCommit).toHaveBeenCalledOnce()
      await click(canvas, "Edit row 0")
      expect(input(canvas, "Edit Period: End").value).toBe(period.to)
    }
  )

  it.each([true, false])(
    "top-aligns editing actions without changing idle cells (stickyActions=%s)",
    async (stickyActions) => {
      const canvas = await mount(
        <DataTable
          columns={rangeColumns}
          data={[
            { period: { from: "", to: "" } },
            { period: { from: "", to: "" } },
          ]}
          enableInlineEdit
          stickyActions={stickyActions}
        />
      )
      const idle = required(button(canvas, "Edit row 1").closest("td"))
      expect(idle.hasAttribute("data-editing")).toBe(false)
      await click(canvas, "Edit row 0")
      const actions = required(button(canvas, "Save row").closest("td"))
      expect(actions.getAttribute("data-editing")).toBe("true")
      expect(actions.classList.contains("data-editing:align-top")).toBe(true)
      expect(actions.classList.contains("data-table-frozen-cell")).toBe(
        stickyActions
      )
      await click(canvas, "Save row")
      expect(actions.getAttribute("data-editing")).toBe("true")
      expect(button(canvas, "Edit row 1").disabled).toBe(true)
      await click(canvas, "Cancel edit")
      expect(actions.hasAttribute("data-editing")).toBe(false)
      expect(button(canvas, "Edit row 1").disabled).toBe(false)
    }
  )
})

describe("DataTable drag handle discoverability", () => {
  it("shows row and column grips at rest while preserving hover and focus affordances", async () => {
    const canvas = await mount(
      <DataTable
        columns={[{ accessorKey: "name", header: "Name" }]}
        data={[{ name: "Ada" }, { name: "Grace" }]}
        enableColumnReorder
        enableRowReorder
      />
    )
    const columnGrip = button(canvas, "Drag to reorder Name")
    const rowGrip = button(canvas, "Drag to reorder row 0")
    expect(columnGrip.closest("thead")).not.toBeNull()
    expect(rowGrip.closest("tbody")).not.toBeNull()
    for (const grip of [columnGrip, rowGrip]) {
      expect(grip.classList.contains("opacity-0")).toBe(false)
      expect(grip.classList.contains("opacity-data-table-drag-handle")).toBe(
        true
      )
      expect(grip.classList.contains("text-data-table-drag-handle-fg")).toBe(
        true
      )
      expect(grip.classList.contains("hover:opacity-100")).toBe(true)
      expect(grip.classList.contains("focus-visible:opacity-100")).toBe(true)
      expect(grip.classList.contains("hover:bg-data-table-row-bg-hover")).toBe(
        true
      )
      expect(grip.classList.contains("motion-reduce:transition-none")).toBe(
        true
      )
      for (const group of ["header", "row"]) {
        expect(
          grip.classList.contains(`group-hover/${group}:opacity-100`)
        ).toBe(true)
        expect(
          grip.classList.contains(`group-focus-within/${group}:opacity-100`)
        ).toBe(true)
        expect(
          grip.classList.contains(`group-data-dragging/${group}:opacity-100`)
        ).toBe(true)
      }
      expect(grip.type).toBe("button")
      expect(grip.disabled).toBe(false)
      expect(grip.tabIndex).toBe(0)
      await act(() => grip.focus())
      expect(document.activeElement).toBe(grip)
    }
  })
})

describe("DataTable grouped fixed-width structure", () => {
  it("keeps explicit footer captions below the body and leaf-only resize controls in the header", async () => {
    const canvas = await mount(
      <DataTable
        columns={[
          {
            id: "identity",
            header: "Identity",
            footer: "People",
            columns: [
              {
                accessorKey: "firstName",
                header: "First name",
                meta: { width: 200 },
              },
              {
                accessorKey: "lastName",
                header: "Last name",
                meta: { width: 200 },
              },
            ],
          },
          {
            accessorKey: "email",
            header: "Email",
            footer: "Contact details",
            meta: { width: 900 },
          },
        ]}
        data={[
          { firstName: "Ada", lastName: "Lovelace", email: "ada@calc.io" },
        ]}
        enableColumnResizing
        stickyHeader
        tableLayout="fixed"
      />
    )
    expect(canvas.querySelector("thead")?.textContent).toContain("Identity")
    expect(canvas.querySelector("thead")?.textContent).not.toContain("People")
    expect(canvas.querySelector("tfoot")?.textContent).toContain("People")
    expect(canvas.querySelector("tfoot")?.textContent).toContain(
      "Contact details"
    )
    expect(canvas.querySelectorAll("tbody tr")).toHaveLength(1)
    expect(canvas.querySelectorAll("colgroup col")).toHaveLength(3)
    expect(canvas.querySelector('[aria-label="Resize Identity"]')).toBeNull()
    expect(button(canvas, "Resize First name").closest("thead")).not.toBeNull()
    expect(button(canvas, "Resize Last name").closest("thead")).not.toBeNull()
    expect(button(canvas, "Resize Email").closest("thead")).not.toBeNull()
  })
})
