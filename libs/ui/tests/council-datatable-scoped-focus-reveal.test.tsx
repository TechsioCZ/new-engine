// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../src/organisms/data-table"

const roots: Root[] = []

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing scoped focus fixture element")
  }
  return value
}

function rect(left: number, width: number): DOMRect {
  return new DOMRect(left, 0, width, 40)
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal("ResizeObserver", undefined)
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === "SECTION" ? 360 : 0
    }
  )
  vi.spyOn(HTMLElement.prototype, "clientLeft", "get").mockReturnValue(2)
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === "SECTION" ? 1000 : 0
    }
  )
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.tagName === "SECTION") {
        return rect(100, 364)
      }
      if (this.dataset.leafColumn === "start") {
        return rect(0, 80)
      }
      if (this.dataset.leafColumn === "end") {
        return rect(0, 60)
      }
      return rect(0, 100)
    }
  )
})

afterEach(async () => {
  await interact(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function interact(action: () => unknown) {
  await act(async () => {
    action()
    // Flush mutation-observer delivery and asynchronous edit completion too.
    await Promise.resolve()
  })
}

async function mount(element: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await interact(() => root.render(element))
  return canvas
}

function geometry(field: HTMLElement, left: number, width = 220) {
  const scroller = required(field.closest("section"))
  const initialScroll = scroller.scrollLeft
  Object.defineProperty(field, "getBoundingClientRect", {
    configurable: true,
    value: () => rect(left - (scroller.scrollLeft - initialScroll), width),
  })
  field.style.outline = "2px solid blue"
  field.style.outlineOffset = "2px"
  return scroller
}

const columns = [
  { accessorKey: "email", header: "Email", meta: { width: 300 } },
]
const data = [{ email: "nasa@example.test" }]

describe("DataTable scoped horizontal field focus reveal", () => {
  it("reveals an inline header filter including its outline, without changing focus or selection", async () => {
    const onFocus = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        renderHeaderFilter={() => (
          <input
            aria-label="Email filter"
            defaultValue="nasa"
            onFocus={onFocus}
          />
        )}
      />
    )
    const field = required(canvas.querySelector<HTMLInputElement>("input"))
    const scroller = geometry(field, 404)
    const ancestor = required(scroller.parentElement)
    ancestor.scrollLeft = 17
    ancestor.scrollTop = 29
    scroller.scrollTop = 31
    field.setSelectionRange(1, 3, "backward")
    await interact(() => field.focus())
    // Viewport content edge is x462; the field's right edge plus outline is x628.
    expect(scroller.scrollLeft).toBe(166)
    expect(field.getBoundingClientRect().right).toBe(458)
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe("nasa")
    expect([
      field.selectionStart,
      field.selectionEnd,
      field.selectionDirection,
    ]).toEqual([1, 3, "backward"])
    expect(onFocus).toHaveBeenCalledOnce()
    expect([
      ancestor.scrollLeft,
      ancestor.scrollTop,
      scroller.scrollTop,
    ]).toEqual([17, 29, 31])
  })

  it("keeps a pressed trigger stationary until its click activates the focused field", async () => {
    const activated = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        renderHeaderFilter={() => (
          <div>
            <input aria-label="Skills" defaultValue="React" />
            <button aria-label="Open choices" onClick={activated} type="button">
              Open choices
            </button>
          </div>
        )}
      />
    )
    const field = required(canvas.querySelector<HTMLInputElement>("input"))
    const trigger = required(
      canvas.querySelector<HTMLButtonElement>(
        'button[aria-label="Open choices"]'
      )
    )
    const scroller = geometry(field, 411)
    const matches = scroller.matches.bind(scroller)
    let pressed = true
    vi.spyOn(scroller, "matches").mockImplementation((selector) =>
      selector === ":active" ? pressed : matches(selector)
    )
    await interact(() => field.focus())
    expect(scroller.scrollLeft).toBe(0)
    expect(document.activeElement).toBe(field)
    pressed = false
    await interact(() => trigger.click())
    expect(activated).toHaveBeenCalledOnce()
    expect(scroller.scrollLeft).toBe(173)
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe("React")
  })

  it("does not reveal a stale focused field when another column activates its popup", async () => {
    const activated = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={[
          ...columns,
          { id: "role", header: "Role", accessorFn: () => "Admin" },
        ]}
        data={data}
        enableColumnFilters
        renderHeaderFilter={(column) =>
          column.id === "email" ? (
            <input aria-label="Previous filter" defaultValue="nasa" />
          ) : (
            <button aria-label="Other popup" onClick={activated} type="button">
              Open
            </button>
          )
        }
      />
    )
    const field = required(canvas.querySelector<HTMLInputElement>("input"))
    const trigger = required(
      canvas.querySelector<HTMLButtonElement>(
        'button[aria-label="Other popup"]'
      )
    )
    const scroller = geometry(field, 411)
    await interact(() => field.focus())
    scroller.scrollLeft = 600
    // Menu triggers can retain the previous input's focus until opening.
    await interact(() => trigger.click())
    expect(activated).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(field)
    expect(scroller.scrollLeft).toBe(600)
  })

  it("reveals a left-clipped RTL filter using negative native scrollLeft", async () => {
    const canvas = await mount(
      <div dir="rtl">
        <DataTable
          columns={columns}
          data={data}
          enableColumnFilters
          renderHeaderFilter={() => <input aria-label="Email filter" />}
        />
      </div>
    )
    const field = required(canvas.querySelector<HTMLInputElement>("input"))
    const scroller = geometry(field, -120)
    scroller.style.direction = "rtl"
    await interact(() => field.focus())
    expect(scroller.scrollLeft).toBe(-226)
    expect(field.getBoundingClientRect().left).toBe(106)
    expect(document.activeElement).toBe(field)
  })

  it.each([
    { left: 106, width: 220, overflow: true, expected: 0 },
    { left: 404, width: 353, overflow: true, expected: 0 },
    { left: 404, width: 220, overflow: false, expected: 0 },
    { left: 98, width: 220, overflow: true, expected: -8 },
  ])(
    "does only the necessary reveal for %j",
    async ({ left, width, overflow, expected }) => {
      const canvas = await mount(
        <DataTable
          columns={columns}
          data={data}
          enableColumnFilters
          renderHeaderFilter={() => <input aria-label="Email filter" />}
        />
      )
      const field = required(canvas.querySelector<HTMLInputElement>("input"))
      const scroller = geometry(field, left, width)
      if (!overflow) {
        Object.defineProperty(scroller, "scrollWidth", { value: 360 })
      }
      await interact(() => field.focus())
      expect(scroller.scrollLeft).toBe(expected)
    }
  )

  it("reveals an always-live column cell editor outside the row-edit wrapper", async () => {
    const canvas = await mount(
      <DataTable
        columns={[
          {
            accessorKey: "email",
            header: "Email",
            cell: () => (
              <input aria-label="Always-live email" defaultValue="nasa" />
            ),
          },
        ]}
        data={data}
      />
    )
    const field = required(canvas.querySelector<HTMLInputElement>("input"))
    expect(field.closest("[data-editor-control]")).toBeNull()
    const scroller = geometry(field, 411)
    await interact(() => field.focus())
    expect(scroller.scrollLeft).toBe(173)
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe("nasa")
  })

  it.each(["default", "custom"] as const)(
    "reveals a %s editor without remounting, changing its draft, or pulling back deliberate scrolling",
    async (kind) => {
      const onCellEditCommit = vi.fn()
      const onEditCommit = vi.fn()
      const onFocus = vi.fn()
      const canvas = await mount(
        <DataTable
          columns={[
            {
              accessorKey: "email",
              header: "Email",
              meta: {
                width: 300,
                editable: true,
                ...(kind === "custom"
                  ? {
                      renderEditor: ({ value, setValue }) => (
                        <input
                          aria-label="Custom email"
                          onChange={(event) =>
                            setValue(event.currentTarget.value)
                          }
                          onFocus={onFocus}
                          value={String(value ?? "")}
                        />
                      ),
                    }
                  : {}),
              },
            },
          ]}
          data={data}
          enableInlineEdit
          onCellEditCommit={onCellEditCommit}
          onEditCommit={onEditCommit}
        />
      )
      await interact(() =>
        required(
          canvas.querySelector<HTMLButtonElement>(
            'button[aria-label="Edit row 0"]'
          )
        ).click()
      )
      const field = required(
        canvas.querySelector<HTMLInputElement>("[data-editor-control] input")
      )
      const scroller = required(field.closest("section"))
      scroller.scrollLeft = 0
      geometry(field, 411)
      await interact(() => {
        field.blur()
        field.setSelectionRange(2, 6)
        field.focus()
      })
      // The edit-actions column reserves another 100px at the inline end.
      expect(scroller.scrollLeft).toBe(273)
      expect(document.activeElement).toBe(field)
      expect(field.value).toBe("nasa@example.test")
      expect([field.selectionStart, field.selectionEnd]).toEqual([2, 6])
      if (kind === "custom") {
        expect(onFocus).toHaveBeenCalledTimes(2)
      }
      scroller.scrollLeft = 41
      await interact(() => scroller.dispatchEvent(new Event("scroll")))
      await interact(() => {
        required(
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
            ?.set
        ).call(field, "updated@example.test")
        field.dispatchEvent(new Event("input", { bubbles: true }))
      })
      expect(scroller.scrollLeft).toBe(41)
      expect(canvas.querySelector("[data-editor-control] input")).toBe(field)
      expect(document.activeElement).toBe(field)
      expect(field.value).toBe("updated@example.test")
      expect(onCellEditCommit).not.toHaveBeenCalled()
      expect(onEditCommit).not.toHaveBeenCalled()
      await interact(() =>
        required(
          canvas.querySelector<HTMLButtonElement>(
            'button[aria-label="Save row"]'
          )
        ).click()
      )
      expect(onEditCommit).toHaveBeenCalledOnce()
      expect(onEditCommit.mock.calls[0]?.[0].draft).toEqual({
        email: "updated@example.test",
      })
    }
  )

  it.each(["ltr", "rtl"] as const)(
    "respects both pinned bands and leaves pinned filters alone in %s",
    async (direction) => {
      const canvas = await mount(
        <DataTable
          columnPinning={{ start: ["start"], end: ["end"] }}
          columns={[
            { accessorKey: "start", header: "Start", meta: { width: 100 } },
            { accessorKey: "middle", header: "Middle", meta: { width: 300 } },
            { accessorKey: "end", header: "End", meta: { width: 100 } },
          ]}
          data={[{ start: "Identity", middle: "Value", end: "Status" }]}
          enableColumnFilters
          renderHeaderFilter={(column) => <input aria-label={column.id} />}
        />
      )
      const field = required(
        canvas.querySelector<HTMLInputElement>('input[aria-label="middle"]')
      )
      const scroller = geometry(field, direction === "ltr" ? 404 : 40, 120)
      scroller.style.direction = direction
      expect(scroller.style.scrollPaddingInlineStart).toBe("80px")
      expect(scroller.style.scrollPaddingInlineEnd).toBe("60px")
      await interact(() => field.focus())
      expect(scroller.scrollLeft).toBe(direction === "ltr" ? 126 : -126)
      const previousScroll = scroller.scrollLeft
      const pinned = required(
        canvas.querySelector<HTMLInputElement>('input[aria-label="start"]')
      )
      geometry(pinned, 50, 80)
      await interact(() => pinned.focus())
      expect(scroller.scrollLeft).toBe(previousScroll)
      expect(scroller.style.scrollPaddingInlineStart).toBe("80px")
      expect(scroller.style.scrollPaddingInlineEnd).toBe("60px")
    }
  )

  it("reveals an unpinned filter in a vertically sticky header", async () => {
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        renderHeaderFilter={() => <input aria-label="Sticky header field" />}
        stickyHeader
      />
    )
    const field = required(canvas.querySelector<HTMLInputElement>("input"))
    const scroller = geometry(field, 404)
    await interact(() => field.focus())
    expect(scroller.scrollLeft).toBe(166)
  })

  it("retains a default filter's node, value callback, and explicit column width", async () => {
    const onColumnFiltersChange = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        onColumnFiltersChange={onColumnFiltersChange}
      />
    )
    const field = required(
      canvas.querySelector<HTMLInputElement>(
        'input[aria-label="Filter value for Email"]'
      )
    )
    const scroller = geometry(field, 404)
    const column = required(canvas.querySelector("col"))
    expect(column.style.width).toBe("300px")
    await interact(() => field.focus())
    expect(scroller.scrollLeft).toBe(166)
    expect(onColumnFiltersChange).not.toHaveBeenCalled()
    await interact(() => {
      required(
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
          ?.set
      ).call(field, "nasa")
      field.dispatchEvent(new Event("input", { bubbles: true }))
    })
    expect(onColumnFiltersChange).toHaveBeenCalledOnce()
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith([
      { id: "email", value: { operator: "contains", value: "nasa" } },
    ])
    expect(
      canvas.querySelector('input[aria-label="Filter value for Email"]')
    ).toBe(field)
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe("nasa")
    expect(scroller.scrollLeft).toBe(166)
    expect(column.style.width).toBe("300px")
  })

  it("lets a nested DataTable reveal only its own field", async () => {
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        renderHeaderFilter={() => (
          <DataTable
            columns={columns}
            data={data}
            enableColumnFilters
            renderHeaderFilter={() => <input aria-label="Inner table field" />}
          />
        )}
      />
    )
    const field = required(
      canvas.querySelector<HTMLInputElement>(
        'input[aria-label="Inner table field"]'
      )
    )
    const inner = geometry(field, 404)
    const outer = required(canvas.querySelector("section"))
    expect(inner).not.toBe(outer)
    await interact(() => field.focus())
    expect(inner.scrollLeft).toBe(166)
    expect(outer.scrollLeft).toBe(0)
    expect(document.activeElement).toBe(field)
  })

  it("honors a caller's focus redirection without revealing the abandoned field", async () => {
    const destination = document.createElement("input")
    document.body.append(destination)
    const onFocus = vi.fn(() => destination.focus())
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        renderHeaderFilter={() => (
          <input aria-label="Redirected" onFocus={onFocus} />
        )}
      />
    )
    const field = required(canvas.querySelector<HTMLInputElement>("input"))
    const scroller = geometry(field, 404)
    await interact(() => field.focus())
    expect(document.activeElement).toBe(destination)
    expect(onFocus).toHaveBeenCalledOnce()
    expect(scroller.scrollLeft).toBe(0)
  })

  it("ignores nested table controls and body-portalled fields despite React focus bubbling", async () => {
    const portal = document.createElement("div")
    document.body.append(portal)
    const onFocus = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        renderHeaderFilter={() => (
          <>
            <table>
              <tbody>
                <tr>
                  <td>
                    <input aria-label="Nested table" onFocus={onFocus} />
                  </td>
                </tr>
              </tbody>
            </table>
            {createPortal(
              <input aria-label="Portal popup" onFocus={onFocus} />,
              portal
            )}
          </>
        )}
      />
    )
    const nested = required(
      canvas.querySelector<HTMLInputElement>('input[aria-label="Nested table"]')
    )
    const scroller = geometry(nested, 404)
    const popup = required(portal.querySelector("input"))
    Object.defineProperty(popup, "getBoundingClientRect", {
      value: () => rect(404, 220),
    })
    await interact(() => nested.focus())
    expect(scroller.scrollLeft).toBe(0)
    await interact(() => popup.focus())
    expect(scroller.scrollLeft).toBe(0)
    expect(onFocus).toHaveBeenCalledTimes(2)
  })
})
