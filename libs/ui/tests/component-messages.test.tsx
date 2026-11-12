// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { Rating } from "../src/atoms/rating"
import { Skeleton } from "../src/atoms/skeleton"
import { UiMessagesProvider } from "../src/messages/ui-messages-provider"
import { Chart } from "../src/molecules/chart"
import { Dialog } from "../src/molecules/dialog"
import { FileUpload } from "../src/molecules/file-upload"
import { Pagination } from "../src/molecules/pagination"
import { createToaster, Toaster } from "../src/molecules/toast"

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

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
  for (const node of document.querySelectorAll("[data-live-announcer]")) {
    node.remove()
  }
})

const csCatalog = {
  dialog: { close: "Zavřít dialog" },
  drawer: { close: "Zavřít zásuvku" },
  toast: { close: "Zavřít oznámení" },
  skeleton: { loading: "Načítání obsahu" },
  pagination: { translations: { nextTriggerLabel: "Další stránka" } },
  fileUpload: { clear: "Vymazat soubory" },
  chart: { emptyLabel: "Žádná data." },
  rating: {
    valueText: ({
      label,
      value,
      count,
    }: {
      label?: string
      value: number
      count: number
    }) => `${label ? `${label}: ` : ""}${value} z ${count}`,
  },
}

describe("component messages", () => {
  it("Dialog reads its close label from the provider", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <Dialog onOpenChange={() => undefined} open title="Titulek">
          Obsah
        </Dialog>
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[aria-label="Zavřít dialog"]')
    ).not.toBeNull()
  })

  it("Dialog keeps the English close label without a provider", () => {
    render(
      <Dialog onOpenChange={() => undefined} open title="Title">
        Body
      </Dialog>
    )
    expect(document.querySelector('[aria-label="Close dialog"]')).not.toBeNull()
  })

  it("an explicit closeLabel beats the provider", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <Dialog
          closeLabel="Explicit close"
          onOpenChange={() => undefined}
          open
          title="Titulek"
        >
          Obsah
        </Dialog>
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[aria-label="Explicit close"]')
    ).not.toBeNull()
    expect(document.querySelector('[aria-label="Zavřít dialog"]')).toBeNull()
  })

  it("Toaster close label comes from the provider", async () => {
    const store = createToaster()
    await act(() => {
      store.create({ title: "Uloženo" })
    })
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    mounted.push({ container, root })
    await act(() => {
      root.render(
        <UiMessagesProvider messages={csCatalog}>
          <Toaster store={store} />
        </UiMessagesProvider>
      )
    })
    expect(
      document.querySelector('button[aria-label="Zavřít oznámení"]')
    ).not.toBeNull()
  })

  it("Skeleton loading label comes from the provider", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <Skeleton.Rectangle />
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[aria-label="Načítání obsahu"]')
    ).not.toBeNull()
  })

  it("Pagination takes a zag translation from the provider, and its own prop wins", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <Pagination
          count={50}
          getPageUrl={({ page }) => `?page=${page}`}
          pageSize={10}
        />
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[aria-label="Další stránka"]')
    ).not.toBeNull()
  })

  it("Pagination's translations prop beats the provider", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <Pagination
          count={50}
          getPageUrl={({ page }) => `?page=${page}`}
          pageSize={10}
          translations={{ nextTriggerLabel: "Explicit next" }}
        />
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[aria-label="Explicit next"]')
    ).not.toBeNull()
    expect(document.querySelector('[aria-label="Další stránka"]')).toBeNull()
  })

  it("FileUpload clear label comes from the provider", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <FileUpload>
          <FileUpload.ClearTrigger />
        </FileUpload>
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('button[aria-label="Vymazat soubory"]')
    ).not.toBeNull()
  })

  it("Chart empty label comes from the provider", () => {
    const { container } = render(
      <UiMessagesProvider messages={csCatalog}>
        <Chart<{ x: string; y: number }>
          ariaLabel="Prodeje"
          data={[]}
          type="line"
          x="x"
          y="y"
        />
      </UiMessagesProvider>
    )
    expect(container.textContent).toContain("Žádná data.")
  })

  it("Rating value text comes from the provider", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <Rating count={5} displayOnly labelText="Kvalita" value={3} />
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[role="img"][aria-label="Kvalita: 3 z 5"]')
    ).not.toBeNull()
  })

  it("Rating keeps the English value text without a provider", () => {
    render(<Rating count={5} displayOnly labelText="Quality" value={3} />)
    expect(
      document.querySelector('[role="img"][aria-label="Quality: 3 out of 5"]')
    ).not.toBeNull()
  })

  it("compact Pagination text and a loading toast's title come from the provider", async () => {
    render(
      <UiMessagesProvider
        messages={{
          pagination: {
            compact: ({ page, totalPages }) => `${page} z ${totalPages}`,
          },
        }}
      >
        <Pagination
          compact
          count={50}
          getPageUrl={({ page }) => `?page=${page}`}
          pageSize={10}
        />
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[data-part="compact-text"]')?.textContent
    ).toBe("1 z 5")

    const store = createToaster()
    await act(() => {
      store.create({ type: "loading" })
    })
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    mounted.push({ container, root })
    await act(() => {
      root.render(
        <UiMessagesProvider messages={{ toast: { loading: "Načítání…" } }}>
          <Toaster store={store} />
        </UiMessagesProvider>
      )
    })
    expect(document.body.textContent).toContain("Načítání…")
  })

  it("an undefined entry in translations keeps the catalog's text", () => {
    render(
      <UiMessagesProvider messages={csCatalog}>
        <Pagination
          count={50}
          getPageUrl={({ page }) => `?page=${page}`}
          pageSize={10}
          translations={{ nextTriggerLabel: undefined }}
        />
      </UiMessagesProvider>
    )
    expect(
      document.querySelector('[aria-label="Další stránka"]')
    ).not.toBeNull()
  })
})
