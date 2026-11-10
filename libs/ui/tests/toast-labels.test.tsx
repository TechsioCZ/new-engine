// @vitest-environment happy-dom
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { createToaster, Toaster } from "../src/molecules/toast"

beforeAll(() => {
  // happy-dom does not implement the Popover API used for the toast portal host.
  if (!HTMLElement.prototype.showPopover) {
    HTMLElement.prototype.showPopover = () => undefined
  }
})

let mounted: { root: Root; container: HTMLElement } | null = null

async function mount(element: ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(() => {
    root.render(element)
  })
  mounted = { root, container }
}

afterEach(async () => {
  if (mounted) {
    const { root, container } = mounted
    await act(() => {
      root.unmount()
    })
    container.remove()
    mounted = null
  }
  for (const node of document.querySelectorAll("[data-live-announcer]")) {
    node.remove()
  }
})

describe("Toaster labels", () => {
  it("names the toast region with the label prop", async () => {
    const store = createToaster()
    await mount(<Toaster label="Order alerts" store={store} />)
    expect(document.querySelector('[aria-label="Order alerts"]')).not.toBeNull()
  })

  it("keeps zag's region name when no label is given", async () => {
    const store = createToaster()
    await mount(<Toaster store={store} />)
    const region = document.querySelector('[aria-label^="Notifications"]')
    expect(region).not.toBeNull()
  })

  it("applies closeLabel to each toast close button", async () => {
    const store = createToaster()
    await act(() => {
      store.create({ title: "Saved" })
    })
    await mount(<Toaster closeLabel="Dismiss message" store={store} />)
    expect(
      document.querySelector('button[aria-label="Dismiss message"]')
    ).not.toBeNull()
    expect(
      document.querySelector('button[aria-label="Close notification"]')
    ).toBeNull()
  })

  it("uses loadingLabel for a loading toast without a title", async () => {
    const store = createToaster()
    await act(() => {
      store.create({ type: "loading" })
    })
    await mount(<Toaster loadingLabel="Working" store={store} />)
    const title = document.querySelector('div[data-type="loading"]')
    expect(title?.textContent).toBe("Working")
  })

  it("keeps the loading toast's own title over loadingLabel", async () => {
    const store = createToaster()
    await act(() => {
      store.create({ type: "loading", title: "Importing" })
    })
    await mount(<Toaster loadingLabel="Working" store={store} />)
    const title = document.querySelector('div[data-type="loading"]')
    expect(title?.textContent).toBe("Importing")
  })
})
