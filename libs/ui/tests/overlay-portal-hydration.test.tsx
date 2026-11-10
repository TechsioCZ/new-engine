// @vitest-environment happy-dom
import { act, Profiler, type ReactElement, useId } from "react"
import { createPortal } from "react-dom"
import { createRoot, hydrateRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Tooltip } from "../src/atoms/tooltip"
import { CascadeSelect } from "../src/molecules/cascade-select"
import { Combobox } from "../src/molecules/combobox"
import { DatePicker } from "../src/molecules/date-picker"
import { Dialog } from "../src/molecules/dialog"
import { Drawer } from "../src/molecules/drawer"
import { Menu } from "../src/molecules/menu"
import { Popover } from "../src/molecules/popover"
import { Select } from "../src/molecules/select"
import { Toaster } from "../src/molecules/toast"
import { Tour } from "../src/molecules/tour"

/**
 * Overlays portal during render whenever `document` exists, so a hydrating client renders a
 * portal where the server rendered the same markup inline. That alone is not a mismatch: a
 * portal's children hydrate from the parent's cursor, so React adopts the inline server nodes
 * and moves them into the portal target when hydration commits.
 *
 * What does mismatch is a portal that changes the shape of the tree. `useId` is derived from the
 * position in the tree, and React reports the differing ids as an attribute mismatch that it does
 * not patch up: the DOM keeps the server ids while the client looks its own ids up. These tests
 * pin both for the closed and the open state of every overlay, and keep the first client-only
 * render portalled so nothing is painted inline first.
 */

const LAYERS = '[data-part="positioner"], [data-part="backdrop"]'

const items = [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
]

/** The ids the client rendered last; each must resolve to an element once hydration is done. */
let clientIds: string[] = []

/** Overlay content with its own useId, like a nested field: its id depends on the tree shape. */
function IdProbe() {
  const id = useId()
  clientIds.push(id)
  return <span id={id}>content</span>
}

type OverlayCase = {
  name: string
  /** Toaster and Tour have no declarative open state. */
  states?: boolean[]
  /**
   * Layers React re-creates after adopting them. A popup inside a modal moves into the modal's
   * content once that element exists, on a client-only render too.
   */
  recreated?: number
  render: (open: boolean) => ReactElement
}

const overlays: OverlayCase[] = [
  {
    name: "Dialog",
    render: (open) => (
      <Dialog open={open} title="Title">
        <IdProbe />
      </Dialog>
    ),
  },
  {
    name: "Drawer",
    render: (open) => (
      <Drawer defaultOpen={open}>
        <Drawer.Trigger>Open cart</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Title>Cart</Drawer.Title>
              <IdProbe />
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer>
    ),
  },
  {
    name: "Drawer without a backdrop",
    render: (open) => (
      <Drawer defaultOpen={open} modal={false}>
        <Drawer.Trigger>Open cart</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Title>Cart</Drawer.Title>
              <IdProbe />
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer>
    ),
  },
  {
    name: "Drawer with a conditional backdrop",
    render: (open) => (
      <Drawer defaultOpen={open} modal={false}>
        <Drawer.Trigger>Open cart</Drawer.Trigger>
        <Drawer.Portal>
          {false}
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Title>Cart</Drawer.Title>
              <IdProbe />
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer>
    ),
  },
  {
    name: "Popover",
    render: (open) => (
      <Popover defaultOpen={open}>
        <Popover.Trigger>Filters</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Title>Filters</Popover.Title>
            <Popover.CloseTrigger />
            <IdProbe />
          </Popover.Content>
        </Popover.Positioner>
      </Popover>
    ),
  },
  {
    name: "Tooltip",
    render: (open) => (
      <Tooltip content={<IdProbe />} defaultOpen={open}>
        <button type="button">Target</button>
      </Tooltip>
    ),
  },
  {
    name: "Select",
    render: (open) => (
      <Select defaultOpen={open} items={items}>
        <Select.Label>Country</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Choose" />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {items.map((item) => (
              <Select.Item item={item} key={item.value}>
                <Select.ItemText />
              </Select.Item>
            ))}
            <IdProbe />
          </Select.Content>
        </Select.Positioner>
      </Select>
    ),
  },
  {
    name: "Combobox",
    render: (open) => (
      <Combobox defaultOpen={open} items={items} label="Fruit" />
    ),
  },
  {
    name: "Menu with a submenu",
    render: (open) => (
      <Menu
        defaultOpen={open}
        items={[
          { type: "action", value: "edit", label: "Edit" },
          {
            type: "submenu",
            value: "more",
            label: "More",
            items: [{ type: "action", value: "copy", label: "Copy" }],
          },
        ]}
      />
    ),
  },
  {
    name: "CascadeSelect",
    render: (open) => (
      <CascadeSelect
        defaultOpen={open}
        items={[
          {
            label: "Electronics",
            value: "electronics",
            children: [{ label: "Phones", value: "phones" }],
          },
        ]}
      >
        <CascadeSelect.Label>Category</CascadeSelect.Label>
        <CascadeSelect.Control>
          <CascadeSelect.Trigger>
            <CascadeSelect.ValueText placeholder="Choose" />
          </CascadeSelect.Trigger>
        </CascadeSelect.Control>
        <CascadeSelect.Positioner>
          <CascadeSelect.Content>
            <CascadeSelect.Node />
          </CascadeSelect.Content>
        </CascadeSelect.Positioner>
      </CascadeSelect>
    ),
  },
  {
    name: "DatePicker",
    render: (open) => (
      <DatePicker.Root defaultOpen={open}>
        <DatePicker.Label>Date</DatePicker.Label>
        <DatePicker.Control>
          <DatePicker.Segments />
          <DatePicker.IndicatorGroup>
            <DatePicker.Trigger />
          </DatePicker.IndicatorGroup>
        </DatePicker.Control>
        <DatePicker.Positioner>
          <DatePicker.Content>
            <DatePicker.Calendar />
            <IdProbe />
          </DatePicker.Content>
        </DatePicker.Positioner>
      </DatePicker.Root>
    ),
  },
  {
    name: "Select inside an open modal Dialog",
    recreated: 1,
    render: (open) => (
      <Dialog open title="Title">
        <Select defaultOpen={open} items={items}>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Choose" />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {items.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select>
      </Dialog>
    ),
  },
  {
    name: "Tour with one portal child",
    states: [false],
    render: () => (
      <Tour
        steps={[
          {
            id: "welcome",
            type: "dialog",
            title: "Welcome",
            description: "Start here.",
          },
        ]}
      >
        <Tour.Trigger>Start guide</Tour.Trigger>
        <Tour.Portal>
          <IdProbe />
        </Tour.Portal>
      </Tour>
    ),
  },
  { name: "Toaster", states: [false], render: () => <Toaster /> },
]

/** Siblings on both sides: a portal that claimed the wrong server node would take `after`. */
function page(overlay: ReactElement) {
  return (
    <main>
      <p>before</p>
      {overlay}
      <p>after</p>
    </main>
  )
}

/** The kit and Zag's Portal pick the server path from these two globals. */
function renderOnServer(element: ReactElement) {
  const client = { window: globalThis.window, document: globalThis.document }
  vi.stubGlobal("window", undefined)
  vi.stubGlobal("document", undefined)
  try {
    return renderToString(element)
  } finally {
    vi.stubGlobal("window", client.window)
    vi.stubGlobal("document", client.document)
  }
}

let root: Root | undefined

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  // happy-dom does not implement the Popover API used for the toast portal host.
  if (!HTMLElement.prototype.showPopover) {
    HTMLElement.prototype.showPopover = () => undefined
  }
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function hydrate(element: ReactElement) {
  const container = document.createElement("div")
  container.innerHTML = renderOnServer(element)
  document.body.append(container)
  const serverLayers = Array.from(container.querySelectorAll(LAYERS))
  const recoverableErrors: string[] = []
  const consoleErrors: string[] = []
  clientIds = []
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(" "))
  })
  const onRecoverableError = (error: unknown) => {
    recoverableErrors.push(
      error instanceof Error ? error.message : String(error)
    )
  }
  // An async act also flushes the updates the Zag machines schedule from microtasks.
  root = await act(async () =>
    hydrateRoot(container, element, { onRecoverableError })
  )
  return {
    container,
    serverLayers,
    recoverableErrors,
    consoleErrors,
  }
}

function ClientOnlyPortal() {
  return typeof document === "undefined"
    ? null
    : createPortal(<p data-part="positioner">client only</p>, document.body)
}

describe("overlay portals on a hydrating client", () => {
  it("detects a portal whose content the server did not render", async () => {
    const result = await hydrate(page(<ClientOnlyPortal />))

    expect(result.recoverableErrors.join("\n")).toContain("Hydration failed")
  })

  for (const overlay of overlays) {
    for (const open of overlay.states ?? [false, true]) {
      it(`hydrates ${overlay.name} ${open ? "open" : "closed"} without a mismatch`, async () => {
        const result = await hydrate(page(overlay.render(open)))

        expect(result.recoverableErrors).toEqual([])
        expect(result.consoleErrors).toEqual([])
        // React adopted the server's inline layers and moved them into the portal target: the
        // same nodes, portalled once, with no inline copy left and no neighbour taken.
        expect(
          result.serverLayers.filter((layer) => !layer.isConnected)
        ).toHaveLength(overlay.recreated ?? 0)
        expect(result.container.querySelectorAll(LAYERS)).toHaveLength(0)
        expect(document.querySelectorAll(LAYERS)).toHaveLength(
          result.serverLayers.length
        )
        expect(result.container.textContent?.endsWith("after")).toBe(true)
        expect(clientIds.filter((id) => !document.getElementById(id))).toEqual(
          []
        )
      })
    }
  }
})

describe("overlay portal targets", () => {
  async function mount(element: ReactElement) {
    const container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root?.render(element))
    return container
  }

  function drawer(portal: Parameters<typeof Drawer.Portal>[0]) {
    return (
      <Drawer defaultOpen>
        <Drawer.Portal {...portal}>
          <Drawer.Backdrop />
          <Drawer.Positioner />
        </Drawer.Portal>
      </Drawer>
    )
  }

  it("portals into document.body by default, in source order", async () => {
    const container = await mount(drawer({}))

    expect(
      Array.from(document.body.children, (node) =>
        node === container ? "root" : node.getAttribute("data-part")
      )
    ).toEqual(["root", "backdrop", "positioner"])
  })

  it("portals into the container ref", async () => {
    const target = document.createElement("section")
    document.body.append(target)
    await mount(drawer({ container: { current: target } }))

    expect(target.querySelectorAll(LAYERS)).toHaveLength(2)
  })

  it("renders in place when disabled", async () => {
    const container = await mount(drawer({ disabled: true }))

    expect(container.querySelectorAll(LAYERS)).toHaveLength(2)
  })

  it("keeps a nested Dialog on document.body, outside its parent's content", async () => {
    await mount(
      <Dialog open title="Parent">
        <Dialog open title="Child" />
      </Dialog>
    )

    const positioners = document.querySelectorAll('[data-part="positioner"]')
    expect(positioners).toHaveLength(2)
    for (const positioner of positioners) {
      expect(positioner.parentElement).toBe(document.body)
    }
  })
})

describe("overlay portals on a client-only render", () => {
  for (const overlay of overlays) {
    for (const open of overlay.states ?? [false, true]) {
      it(`portals ${overlay.name} ${open ? "open" : "closed"} on its first commit`, async () => {
        const expectedLayers = renderOnServer(page(overlay.render(open))).match(
          /data-part="(positioner|backdrop)"/g
        )
        const container = document.createElement("div")
        document.body.append(container)
        let firstCommit: { inline: number; total: number } | undefined
        root = createRoot(container)
        const tree = (
          <Profiler
            id="overlay"
            onRender={() => {
              firstCommit ??= {
                inline: container.querySelectorAll(LAYERS).length,
                total: document.querySelectorAll(LAYERS).length,
              }
            }}
          >
            {page(overlay.render(open))}
          </Profiler>
        )
        await act(async () => root?.render(tree))

        expect(firstCommit).toEqual({
          inline: 0,
          total: expectedLayers?.length ?? 0,
        })
      })
    }
  }
})
