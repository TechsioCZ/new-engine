// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { csUiMessages } from "../src/messages/ui-messages-cs"
import { UiMessagesProvider } from "../src/messages/ui-messages-provider"
import { BulkActionBar } from "../src/molecules/bulk-action-bar"
import { SaveBar, type SaveBarStatus } from "../src/molecules/save-bar"
import { SectionCard } from "../src/molecules/section-card"
import { SidePanel } from "../src/molecules/side-panel"
import { createToaster, Toaster } from "../src/molecules/toast"
import { UnsavedChangesDialog } from "../src/molecules/unsaved-changes-dialog"

beforeAll(() => {
  // happy-dom does not implement the Popover API used for the toast portal host.
  if (!HTMLElement.prototype.showPopover) {
    HTMLElement.prototype.showPopover = () => undefined
  }
})

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)

const mounted: { container: HTMLElement; root: Root }[] = []

function render(node: ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  act(() => root.render(node))
  return { container }
}

const czech = (node: ReactNode) => (
  <UiMessagesProvider messages={csUiMessages}>{node}</UiMessagesProvider>
)

const button = (name: string) =>
  [...document.querySelectorAll("button")].find(
    (candidate) =>
      candidate.getAttribute("aria-label") === name ||
      candidate.textContent?.trim() === name
  )

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
  for (const node of document.querySelectorAll("[data-live-announcer]")) {
    node.remove()
  }
  localStorage.clear()
})

describe("SaveBar", () => {
  const enabled: Record<SaveBarStatus, boolean> = {
    idle: false,
    ready: true,
    dirty: true,
    invalid: false,
    saving: false,
    saved: false,
    proposed: false,
    error: true,
    conflict: false,
    "reload-required": true,
  }

  it.each(Object.entries(enabled))(
    "enables Save for a savable draft only (%s)",
    (status, savable) => {
      render(
        <SaveBar onSave={() => undefined} status={status as SaveBarStatus} />
      )
      const save = document.querySelector<HTMLButtonElement>(
        "[data-save-state] > button"
      )
      // A running save keeps the button in its loading state instead of disabling it.
      expect(save?.disabled).toBe(!(savable || status === "saving"))
    }
  )

  it("speaks Czech with the Czech catalog and offers the conflict action", () => {
    const onReloadLatest = vi.fn()
    render(
      czech(
        <SaveBar
          onReloadLatest={onReloadLatest}
          onSave={() => undefined}
          status="conflict"
        />
      )
    )
    expect(document.body.textContent).toContain(
      "Záznam mezitím změnil někdo jiný."
    )
    act(() => button("Načíst aktuální verzi")?.click())
    expect(onReloadLatest).toHaveBeenCalledOnce()
    expect(button("Uložit")).toBeDefined()
  })
})

describe("BulkActionBar", () => {
  it("renders nothing without a selection", () => {
    const { container } = render(
      <BulkActionBar onClear={() => undefined} selectedCount={0} />
    )
    expect(container.childElementCount).toBe(0)
  })

  it("counts and clears the selection in the catalog's words", () => {
    const onClear = vi.fn()
    render(czech(<BulkActionBar onClear={onClear} selectedCount={3} />))
    expect(document.body.textContent).toContain("Vybráno: 3")
    act(() => button("Zrušit výběr")?.click())
    expect(onClear).toHaveBeenCalledOnce()
  })
})

describe("UnsavedChangesDialog", () => {
  it("asks in Czech and answers through the callbacks", () => {
    const onDiscard = vi.fn()
    render(
      czech(
        <UnsavedChangesDialog
          canSave={false}
          onDiscard={onDiscard}
          onSave={() => undefined}
          onStay={() => undefined}
          open
        />
      )
    )
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(button("Uložit")?.disabled).toBe(true)
    act(() => button("Zahodit změny")?.click())
    expect(onDiscard).toHaveBeenCalledOnce()
  })
})

describe("SidePanel", () => {
  it("routes the close button through onCloseRequest", () => {
    const onOpenChange = vi.fn()
    let pending: (() => void) | undefined
    render(
      czech(
        <SidePanel
          onCloseRequest={(close) => {
            pending = close
          }}
          onOpenChange={onOpenChange}
          open
          title="Upravit"
        >
          Obsah
        </SidePanel>
      )
    )
    act(() => button("Zavřít")?.click())
    expect(onOpenChange).not.toHaveBeenCalled()
    act(() => pending?.())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes at once without a close guard", () => {
    const onOpenChange = vi.fn()
    render(
      <SidePanel onOpenChange={onOpenChange} open title="Edit">
        Body
      </SidePanel>
    )
    act(() => button("Close panel")?.click())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("remembers a keyboard resize under its storage key and Home resets it", () => {
    // happy-dom lays nothing out; give the viewport a width the panel can grow to.
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 1200,
    })
    render(
      <SidePanel
        onOpenChange={() => undefined}
        open
        title="Edit"
        widthStorageKey="test:panel-width"
      >
        Body
      </SidePanel>
    )
    const handle = document.querySelector<HTMLButtonElement>("[aria-controls]")
    expect(handle).not.toBeNull()
    act(() => {
      handle?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "End" })
      )
    })
    expect(localStorage.getItem("test:panel-width")).toBe("1200")
    act(() => {
      handle?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Home" })
      )
    })
    expect(localStorage.getItem("test:panel-width")).toBeNull()
  })

  it("flattens a SectionCard inside it", () => {
    render(
      <SidePanel onOpenChange={() => undefined} open title="Edit">
        <SectionCard title="Billing">Body</SectionCard>
      </SidePanel>
    )
    const card = document.querySelector("section.surface-card")
    expect(card?.closest("[data-surface-frame]")).not.toBeNull()
  })
})

describe("Toaster", () => {
  it("names its region from the catalog", async () => {
    const store = createToaster()
    await act(() => {
      store.create({ title: "Uloženo" })
    })
    render(czech(<Toaster store={store} />))
    expect(document.querySelector('[aria-label="Oznámení"]')).not.toBeNull()
  })
})
