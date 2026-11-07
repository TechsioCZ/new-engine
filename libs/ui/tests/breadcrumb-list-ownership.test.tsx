// @vitest-environment happy-dom
import { act, createRef, Fragment, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { within } from "storybook/test"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Breadcrumb } from "../src/molecules/breadcrumb"

let root: Root | undefined

async function mount(children: ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  const canvas = document.createElement("div")
  document.body.append(canvas)
  root = createRoot(canvas)
  await act(() =>
    root?.render(
      <Breadcrumb>
        <Breadcrumb.List>{children}</Breadcrumb.List>
      </Breadcrumb>
    )
  )
  return canvas
}

function getDestinationOwnership(canvas: HTMLElement) {
  const queries = within(canvas)
  const list = queries.getByRole("list")
  const destinations = queries.getAllByRole("listitem")
  const visibleChildren = [...list.children].filter(
    (item) =>
      item.getAttribute("aria-hidden") !== "true" &&
      !item.hasAttribute("hidden")
  )
  return {
    labels: destinations.map((item) => item.textContent),
    // Each exposed destination must be directly owned by the one exposed list.
    directlyOwned: destinations.every((item) => item.parentElement === list),
    noExtraItems:
      visibleChildren.every((item, index) => item === destinations[index]) &&
      visibleChildren.length === destinations.length,
  }
}

afterEach(async () => {
  await act(() => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("Breadcrumb accessible list ownership", () => {
  it.each([false, true])(
    "exposes each destination exactly once across fragments=%s",
    async (fragment) => {
      const ancestors = [
        <Breadcrumb.Item key="home">
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>,
        <Breadcrumb.Separator key="separator" />,
      ]
      const canvas = await mount(
        <>
          {fragment ? (
            <Fragment key="ancestors">{ancestors}</Fragment>
          ) : (
            ancestors
          )}
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/products">Products</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>Current</Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </>
      )
      expect(getDestinationOwnership(canvas)).toEqual({
        labels: ["Home", "Products", "Current"],
        directlyOwned: true,
        noExtraItems: true,
      })
      expect(within(canvas).getAllByRole("link")).toHaveLength(2)
      expect(
        within(canvas)
          .getByRole("link", { name: "Products" })
          .getAttribute("href")
      ).toBe("/products")
      expect(
        within(canvas).getByText("Current").getAttribute("aria-current")
      ).toBe("page")
      expect(
        canvas.querySelectorAll(".breadcrumb-segment > ol.contents > li")
      ).toHaveLength(4)
    }
  )

  it.each([false, true])(
    "does not expose decorative ellipsis as a destination when grouped=%s",
    async (grouped) => {
      const canvas = await mount(
        <>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
          </Breadcrumb.Item>
          {grouped && <Breadcrumb.Separator />}
          <Breadcrumb.Ellipsis>Omitted ancestors</Breadcrumb.Ellipsis>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>Current</Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </>
      )
      expect(getDestinationOwnership(canvas)).toEqual({
        labels: ["Home", "Current"],
        directlyOwned: true,
        noExtraItems: true,
      })
      expect(within(canvas).getAllByRole("link")).toHaveLength(1)
    }
  )

  it("retains public li hosts, refs, props and handlers while the segment owns the item role", async () => {
    const itemRef = createRef<HTMLLIElement>()
    const separatorRef = createRef<HTMLLIElement>()
    const ellipsisRef = createRef<HTMLLIElement>()
    const clicked = vi.fn()
    const canvas = await mount(
      <>
        <Breadcrumb.Item>Home</Breadcrumb.Item>
        <Breadcrumb.Separator ref={separatorRef} title="Divider">
          /
        </Breadcrumb.Separator>
        <Breadcrumb.Ellipsis data-testid="ellipsis" ref={ellipsisRef}>
          …
        </Breadcrumb.Ellipsis>
        <Breadcrumb.Separator />
        <Breadcrumb.Item
          className="caller-item"
          data-testid="destination"
          onClick={clicked}
          ref={itemRef}
          role="listitem"
          title="Destination"
        >
          <Breadcrumb.CurrentLink>Current</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </>
    )
    const destinations = within(canvas).getAllByRole("listitem")
    expect(getDestinationOwnership(canvas)).toEqual({
      labels: ["Home", "Current"],
      directlyOwned: true,
      noExtraItems: true,
    })
    expect(itemRef.current).toBe(within(canvas).getByTestId("destination"))
    expect(itemRef.current?.closest(".breadcrumb-segment")).toBe(
      destinations[1]
    )
    expect(itemRef.current?.classList.contains("caller-item")).toBe(true)
    expect(itemRef.current?.title).toBe("Destination")
    expect(separatorRef.current?.title).toBe("Divider")
    expect(ellipsisRef.current).toBe(within(canvas).getByTestId("ellipsis"))
    for (const ref of [itemRef, separatorRef, ellipsisRef]) {
      expect(ref.current?.tagName).toBe("LI")
    }
    await act(() => itemRef.current?.click())
    expect(clicked).toHaveBeenCalledOnce()
    await act(() => root?.unmount())
    root = undefined
    for (const ref of [itemRef, separatorRef, ellipsisRef]) {
      expect(ref.current).toBeNull()
    }
  })

  it("keeps semantic ARIA on the owning destination without restoring an inner list item", async () => {
    const semantics = {
      "aria-label": "Product destination",
      "aria-describedby": "breadcrumb-hint",
      "aria-roledescription": "location",
      "aria-posinset": 2,
      "aria-setsize": 3,
      "aria-disabled": false,
    } as const
    const canvas = await mount(
      <>
        <Breadcrumb.Item>Home</Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item {...semantics} data-testid="described-item">
          Products
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>Current</Breadcrumb.Item>
      </>
    )
    expect(getDestinationOwnership(canvas)).toEqual({
      labels: ["Home", "Products", "Current"],
      directlyOwned: true,
      noExtraItems: true,
    })
    const item = within(canvas).getByTestId("described-item")
    const owner = item.closest(".breadcrumb-segment")
    for (const [name, value] of Object.entries(semantics)) {
      expect(owner?.getAttribute(name)).toBe(String(value))
      expect(item.hasAttribute(name)).toBe(false)
    }
    expect(item.getAttribute("role")).toBe("presentation")
  })

  it.each([true, false])(
    "applies native hidden=%s to the complete destination and separator",
    async (hidden) => {
      const canvas = await mount(
        <>
          <Breadcrumb.Item>Home</Breadcrumb.Item>
          <Breadcrumb.Separator data-testid="hidden-separator" />
          <Breadcrumb.Item data-testid="hidden-item" hidden={hidden}>
            Products
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>Current</Breadcrumb.Item>
        </>
      )
      const item = within(canvas).getByTestId("hidden-item")
      const owner = item.closest(".breadcrumb-segment")
      expect(owner?.hasAttribute("hidden")).toBe(hidden)
      expect(
        within(canvas)
          .getByTestId("hidden-separator")
          .closest(".breadcrumb-segment")
      ).toBe(owner)
      expect(getDestinationOwnership(canvas)).toEqual({
        labels: hidden ? ["Home", "Current"] : ["Home", "Products", "Current"],
        directlyOwned: true,
        noExtraItems: true,
      })
    }
  )

  it("does not expose an empty segment when the caller hides its destination", async () => {
    const canvas = await mount(
      <>
        <Breadcrumb.Item>Home</Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item aria-hidden="true">Hidden destination</Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>Current</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </>
    )
    expect(getDestinationOwnership(canvas)).toEqual({
      labels: ["Home", "Current"],
      directlyOwned: true,
      noExtraItems: true,
    })
  })
})
