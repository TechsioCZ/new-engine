// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type ColumnDef, DataTable } from "../src/organisms/data-table"

const roots: Root[] = []

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing native date fixture element")
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

function input(canvas: HTMLElement, label: string) {
  return required(
    canvas.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  )
}

async function click(canvas: HTMLElement, label: string) {
  await act(() =>
    required(
      canvas.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    ).click()
  )
}

function change(field: HTMLInputElement, value: string) {
  required(
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  ).call(field, value)
  field.dispatchEvent(new Event("input", { bubbles: true }))
}

async function key(field: HTMLInputElement, value: string) {
  const event = new KeyboardEvent("keydown", {
    key: value,
    bubbles: true,
    cancelable: true,
  })
  await act(() => field.dispatchEvent(event))
  return event
}

function emptyPresentation(field: HTMLInputElement) {
  return required(field.closest("[data-date-editor]")).hasAttribute(
    "data-empty"
  )
}

type RangeRecord = {
  period: { from: string; to: string }
  published?: string
}
const rangeColumns: ColumnDef<RangeRecord, unknown>[] = [
  {
    accessorKey: "period",
    header: "Period",
    cell: () => "Period",
    meta: { type: "dateRange", editable: true, required: true },
  },
]

describe("DataTable empty native date presentation", () => {
  it.each([undefined, null, ""])(
    "offers the same empty affordance for a single date with value %s",
    async (value) => {
      const canvas = await mount(
        <DataTable
          columns={[
            {
              accessorKey: "date",
              header: "Date",
              meta: { type: "date", editable: true },
            },
          ]}
          data={[{ date: value }]}
          enableInlineEdit
        />
      )
      await click(canvas, "Edit row 0")
      const field = input(canvas, "Edit Date")
      expect(field.type).toBe("date")
      expect(field.value).toBe("")
      expect(emptyPresentation(field)).toBe(true)
    }
  )

  it.each(["sm", "md", "lg"] as const)(
    "retains both native endpoints, focus and validation links across empty transitions (%s)",
    async (size) => {
      const period = Object.freeze({ from: "", to: "" })
      const onEditCommit = vi.fn()
      const canvas = await mount(
        <DataTable
          columns={rangeColumns}
          data={[{ period }]}
          enableInlineEdit
          onEditCommit={onEditCommit}
          size={size}
        />
      )
      await click(canvas, "Edit row 0")
      const from = input(canvas, "Edit Period: Start")
      const to = input(canvas, "Edit Period: End")
      const fromControl = from.parentElement
      const toControl = to.parentElement
      expect(emptyPresentation(from)).toBe(true)
      expect(emptyPresentation(to)).toBe(true)
      await click(canvas, "Save row")
      expect(onEditCommit).not.toHaveBeenCalled()
      const errorId = required(from.getAttribute("aria-errormessage"))
      expect(document.getElementById(errorId)?.textContent).toBe(
        "Enter a value before saving this row."
      )
      for (const field of [from, to]) {
        expect(field.getAttribute("aria-describedby")).toBe(errorId)
        expect(field.getAttribute("aria-errormessage")).toBe(errorId)
        expect(field.getAttribute("aria-invalid")).toBe("true")
        expect(field.type).toBe("date")
        expect(field.labels?.[0]?.control).toBe(field)
        expect(field.parentElement?.getAttribute("data-size")).toBe(size)
      }
      for (const [field, label, value] of [
        [from, "Edit Period: Start", "2026-07-11"],
        [to, "Edit Period: End", "2026-07-14"],
      ] as const) {
        await act(() => field.focus())
        await act(() => change(field, value))
        expect(input(canvas, label)).toBe(field)
        expect(document.activeElement).toBe(field)
        expect(emptyPresentation(field)).toBe(false)
        await act(() => change(field, ""))
        expect(input(canvas, label)).toBe(field)
        expect(document.activeElement).toBe(field)
        expect(emptyPresentation(field)).toBe(true)
        await act(() => field.blur())
        expect(emptyPresentation(field)).toBe(true)
        await act(() => change(field, value))
      }
      expect(from.parentElement).toBe(fromControl)
      expect(to.parentElement).toBe(toControl)
      expect(to.min).toBe("2026-07-11")
      expect(period).toEqual({ from: "", to: "" })
      expect((await key(to, "Enter")).defaultPrevented).toBe(true)
      expect(onEditCommit).toHaveBeenCalledOnce()
      expect(onEditCommit.mock.calls[0]?.[0].draft.period).toEqual({
        from: "2026-07-11",
        to: "2026-07-14",
      })
      expect(period).toEqual({ from: "", to: "" })
    }
  )

  it("keeps a single date mounted and focused when cleared, and Escape discards the draft", async () => {
    const onEditCommit = vi.fn()
    const onEditCancel = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={[
          {
            accessorKey: "date",
            header: "Date",
            meta: { type: "date", editable: true },
          },
        ]}
        data={[{ date: "2026-07-11" }]}
        enableInlineEdit
        onEditCancel={onEditCancel}
        onEditCommit={onEditCommit}
      />
    )
    await click(canvas, "Edit row 0")
    const field = input(canvas, "Edit Date")
    const control = field.parentElement
    expect(emptyPresentation(field)).toBe(false)
    await act(() => field.focus())
    await act(() => change(field, ""))
    expect(input(canvas, "Edit Date")).toBe(field)
    expect(field.parentElement).toBe(control)
    expect(document.activeElement).toBe(field)
    expect(emptyPresentation(field)).toBe(true)
    await act(() => change(field, "2026-07-14"))
    expect(input(canvas, "Edit Date")).toBe(field)
    expect(document.activeElement).toBe(field)
    expect(emptyPresentation(field)).toBe(false)
    expect((await key(field, "Escape")).defaultPrevented).toBe(true)
    expect(onEditCancel).toHaveBeenCalledWith({ rowId: "0", dirty: true })
    expect(onEditCommit).not.toHaveBeenCalled()
    await click(canvas, "Edit row 0")
    expect(input(canvas, "Edit Date").value).toBe("2026-07-11")
  })

  it("disables the original native endpoints while saving without wrapping readonly dates", async () => {
    let finishSave: () => void = () => {
      throw new Error("Save has not started")
    }
    const canvas = await mount(
      <DataTable
        columns={[
          ...rangeColumns,
          {
            accessorKey: "published",
            header: "Published",
            meta: { type: "date" },
          },
        ]}
        data={[
          {
            period: { from: "2026-07-11", to: "2026-07-14" },
            published: "2026-07-01",
          },
        ]}
        enableInlineEdit
        onEditCommit={() =>
          new Promise<void>((resolve) => {
            finishSave = resolve
          })
        }
      />
    )
    await click(canvas, "Edit row 0")
    const from = input(canvas, "Edit Period: Start")
    const to = input(canvas, "Edit Period: End")
    expect(canvas.querySelectorAll("[data-date-editor]")).toHaveLength(2)
    expect(canvas.querySelector('[aria-label="Edit Published"]')).toBeNull()
    expect(
      canvas.querySelector(".data-table-readonly-value")?.textContent
    ).toBe("2026-07-01")
    await click(canvas, "Save row")
    for (const [field, label] of [
      [from, "Edit Period: Start"],
      [to, "Edit Period: End"],
    ] as const) {
      expect(input(canvas, label)).toBe(field)
      expect(field.disabled).toBe(true)
      expect(field.type).toBe("date")
      expect(emptyPresentation(field)).toBe(false)
    }
    await act(() => finishSave())
    expect(canvas.querySelector("[data-date-editor]")).toBeNull()
  })

  it.each(["column", "table"] as const)(
    "leaves %s editor overrides in charge of date controls",
    async (override) => {
      const renderEditor = () => <button type="button">Consumer date</button>
      const canvas = await mount(
        <DataTable
          columns={[
            {
              accessorKey: "date",
              header: "Date",
              meta: {
                type: "date",
                editable: true,
                renderEditor: override === "column" ? renderEditor : undefined,
              },
            },
          ]}
          data={[{ date: "" }]}
          editorRenderers={override === "table" ? { date: renderEditor } : {}}
          enableInlineEdit
        />
      )
      await click(canvas, "Edit row 0")
      expect(canvas.textContent).toContain("Consumer date")
      expect(canvas.querySelector("[data-date-editor]")).toBeNull()
      expect(canvas.querySelector('input[type="date"]')).toBeNull()
    }
  )

  it.each([
    ["datetime", "datetime-local"],
    ["time", "time"],
  ] as const)(
    "leaves the native %s editor outside the date treatment",
    async (type, nativeType) => {
      const canvas = await mount(
        <DataTable
          columns={[
            {
              accessorKey: "value",
              header: "Value",
              meta: { type, editable: true },
            },
          ]}
          data={[{ value: "" }]}
          enableInlineEdit
        />
      )
      await click(canvas, "Edit row 0")
      expect(input(canvas, "Edit Value").type).toBe(nativeType)
      expect(canvas.querySelector("[data-date-editor]")).toBeNull()
    }
  )

  it("distinguishes empty endpoints from a populated date without replacing native controls", async () => {
    const canvas = await mount(
      <DataTable
        columns={rangeColumns}
        data={[{ period: { from: "", to: "2026-07-11" } }]}
        enableInlineEdit
      />
    )
    await click(canvas, "Edit row 0")
    const from = input(canvas, "Edit Period: Start")
    const to = input(canvas, "Edit Period: End")
    expect(from.type).toBe("date")
    expect(to.type).toBe("date")
    expect(from.value).toBe("")
    expect(to.value).toBe("2026-07-11")
    expect(emptyPresentation(from)).toBe(true)
    expect(emptyPresentation(to)).toBe(false)
    expect(from.labels?.[0]?.textContent).toBe("Start")
    expect(to.labels?.[0]?.textContent).toBe("End")
    for (const field of [from, to]) {
      const placeholder = required(
        field.parentElement?.querySelector<HTMLElement>("[data-empty-label]")
      )
      expect(placeholder.getAttribute("aria-hidden")).toBe("true")
      expect(placeholder.getAttribute("data-empty-label")).toBe("No date")
      expect(placeholder.tabIndex).toBe(-1)
      expect(placeholder.classList.contains("pointer-events-none")).toBe(true)
    }
  })
})
