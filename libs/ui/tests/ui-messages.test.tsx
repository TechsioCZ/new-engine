// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Label } from "../src/atoms/label"
import { enUiMessages, mergeUiMessages } from "../src/messages/ui-messages"
import {
  UiMessagesProvider,
  useUiMessages,
} from "../src/messages/ui-messages-provider"

const mounted: { container: HTMLElement; root: Root }[] = []

function render(node: ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  act(() => root.render(node))
  return { container }
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
})

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)

const Probe = () => {
  const messages = useUiMessages()
  return (
    <output>
      {messages.label.required}|{messages.dialog.close}|
      {messages.dataTable.selectRowLabel("Row 1")}|{messages.locale ?? "-"}
    </output>
  )
}

describe("ui messages", () => {
  it("reads English without a provider", () => {
    const { container } = render(<Probe />)
    expect(container.textContent).toBe("(required)|Close dialog|Select Row 1|-")
  })

  it("layers a partial catalog over English and nested providers over outer ones", () => {
    const { container } = render(
      <UiMessagesProvider
        locale="cs-CZ"
        messages={{ label: { required: "(povinné)" } }}
      >
        <UiMessagesProvider
          messages={{
            dataTable: { selectRowLabel: (row) => `Vybrat ${row}` },
          }}
        >
          <Probe />
        </UiMessagesProvider>
      </UiMessagesProvider>
    )
    expect(container.textContent).toBe(
      "(povinné)|Close dialog|Vybrat Row 1|cs-CZ"
    )
  })

  it("keeps the base text for undefined entries and does not mutate it", () => {
    const merged = mergeUiMessages(enUiMessages, {
      dialog: { close: undefined, open: "Otevřít" },
    })
    expect(merged.dialog).toEqual({ open: "Otevřít", close: "Close dialog" })
    expect(enUiMessages.dialog.open).toBe("Open")
  })

  it("gives Label the catalog's required text, and an explicit prop wins", () => {
    const { container } = render(
      <UiMessagesProvider messages={{ label: { required: "(povinné)" } }}>
        <Label htmlFor="a" required>
          Name
        </Label>
        <Label htmlFor="b" required requiredLabel="(nutné)">
          Code
        </Label>
        <Label htmlFor="c" required requiredLabel="">
          Note
        </Label>
      </UiMessagesProvider>
    )
    const labels = [...container.querySelectorAll("label")].map(
      (label) => label.textContent
    )
    expect(labels).toEqual(["Name* (povinné)", "Code* (nutné)", "Note*"])
  })

  it("renders Label's English required text on the server without a provider", () => {
    const html = renderToStaticMarkup(
      <Label htmlFor="a" required>
        Name
      </Label>
    )
    expect(html).toContain("(required)")
  })

  it("lets one provider set the language of a second copy of the kit", async () => {
    vi.resetModules()
    const copy = await import("../src/messages/ui-messages-provider")
    expect(copy.useUiMessages).not.toBe(useUiMessages)
    const SecondCopyProbe = () => (
      <output>{copy.useUiMessages().dialog.close}</output>
    )
    const { container } = render(
      <UiMessagesProvider messages={{ dialog: { close: "Zavřít" } }}>
        <SecondCopyProbe />
      </UiMessagesProvider>
    )
    expect(container.textContent).toBe("Zavřít")
  })
})
