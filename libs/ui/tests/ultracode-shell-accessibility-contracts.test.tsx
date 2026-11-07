// @vitest-environment happy-dom
import { act, createRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Header } from "../src/organisms/header"
import { Sidebar } from "../src/organisms/sidebar"

let canvas: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  canvas = document.createElement("div")
  document.body.append(canvas)
  root = createRoot(canvas)
})

afterEach(async () => {
  try {
    await act(() => root.unmount())
  } finally {
    canvas.remove()
    vi.unstubAllGlobals()
  }
})

// These are public DOM/ref contracts, not layout or accessible-tree visibility
// checks. Responsive CSS, modal isolation, and pixel geometry remain browser work.
describe("Header public shell contracts", () => {
  it("forwards every composition ref without replacing named native landmarks", async () => {
    const refs = {
      header: createRef<HTMLElement>(),
      desktop: createRef<HTMLElement>(),
      container: createRef<HTMLElement>(),
      nav: createRef<HTMLElement>(),
      item: createRef<HTMLDivElement>(),
      actions: createRef<HTMLDivElement>(),
      action: createRef<HTMLDivElement>(),
      hamburger: createRef<HTMLButtonElement>(),
      mobile: createRef<HTMLDivElement>(),
      mobileNav: createRef<HTMLElement>(),
    }

    await act(() => {
      root.render(
        <Header
          aria-label="Workspace header"
          className="caller-header"
          dir="rtl"
          ref={refs.header}
          size="lg"
          style={{ letterSpacing: "0.1em" }}
        >
          <Header.Desktop ref={refs.desktop}>
            <Header.Container position="end" ref={refs.container}>
              <Header.Nav
                aria-label="Primary workspace navigation"
                ref={refs.nav}
              >
                <Header.NavItem active ref={refs.item} size="sm">
                  <a aria-current="page" href="/orders">
                    All customer orders
                  </a>
                </Header.NavItem>
              </Header.Nav>
              <Header.Actions ref={refs.actions}>
                <Header.ActionItem ref={refs.action}>
                  <button type="button">Manage workspace account</button>
                </Header.ActionItem>
              </Header.Actions>
            </Header.Container>
          </Header.Desktop>
          <Header.Hamburger
            aria-label="Otevřít navigaci pracovního prostoru"
            ref={refs.hamburger}
          />
          <Header.Mobile
            id="workspace-mobile-navigation"
            position="left"
            ref={refs.mobile}
          >
            <Header.Nav
              aria-label="Mobile workspace navigation"
              ref={refs.mobileNav}
            >
              <a aria-current="page" href="/orders">
                All customer orders
              </a>
            </Header.Nav>
          </Header.Mobile>
        </Header>
      )
    })

    const parts = [
      [refs.header, "header", "HEADER"],
      [refs.desktop, ".header-desktop", "SECTION"],
      [refs.container, "[data-position=end]", "SECTION"],
      [refs.nav, 'nav[aria-label="Primary workspace navigation"]', "NAV"],
      [refs.item, "[data-active=true]", "DIV"],
      [refs.actions, ".header-desktop nav + div", "DIV"],
      [refs.action, ".header-desktop nav + div > div", "DIV"],
      [refs.hamburger, "button[aria-controls]", "BUTTON"],
      [refs.mobile, "#workspace-mobile-navigation", "SECTION"],
      [refs.mobileNav, 'nav[aria-label="Mobile workspace navigation"]', "NAV"],
    ] as const
    for (const [ref, selector, tag] of parts) {
      const node = canvas.querySelector(selector)
      expect(node).not.toBeNull()
      expect(ref.current).toBe(node)
      expect(ref.current?.tagName).toBe(tag)
    }
    expect(canvas.querySelectorAll("header")).toHaveLength(1)
    expect(canvas.querySelectorAll("nav")).toHaveLength(2)
    expect(refs.header.current?.getAttribute("aria-label")).toBe(
      "Workspace header"
    )
    expect(refs.header.current?.dir).toBe("rtl")
    expect(refs.header.current?.classList.contains("caller-header")).toBe(true)
    expect(refs.header.current?.style.letterSpacing).toBe("0.1em")
    expect(refs.item.current?.classList.contains("text-header-item-sm")).toBe(
      true
    )
    expect(refs.action.current?.classList.contains("text-header-item-lg")).toBe(
      true
    )
    expect(refs.hamburger.current?.getAttribute("aria-controls")).toBe(
      refs.mobile.current?.id
    )
    expect(refs.hamburger.current?.getAttribute("aria-label")).toBe(
      "Otevřít navigaci pracovního prostoru"
    )
    expect(refs.mobile.current?.getAttribute("data-position")).toBe("left")
    expect(
      Array.from(canvas.querySelectorAll("a"), (link) => [
        link.textContent,
        link.getAttribute("href"),
        link.getAttribute("aria-current"),
      ])
    ).toEqual([
      ["All customer orders", "/orders", "page"],
      ["All customer orders", "/orders", "page"],
    ])

    await act(() => root.render(null))
    for (const ref of Object.values(refs)) {
      expect(ref.current).toBeNull()
    }
  })

  it("retains the default hamburger label and callback-ref cleanup alongside the internal ref", async () => {
    const cleanup = vi.fn(() => undefined)
    const ref = vi.fn((node: HTMLButtonElement | null) =>
      node ? cleanup : undefined
    )
    await act(() => {
      root.render(
        <Header>
          <Header.Hamburger ref={ref} />
          <Header.Mobile>
            <Header.Nav aria-label="Workspace navigation">
              <a href="/settings">Workspace settings and permissions</a>
            </Header.Nav>
          </Header.Mobile>
        </Header>
      )
    })
    const trigger = canvas.querySelector<HTMLButtonElement>(
      "button[aria-controls]"
    )
    if (!trigger) {
      throw new Error("Missing public Header hamburger")
    }
    expect(ref).toHaveBeenCalledWith(trigger)
    expect(trigger.getAttribute("aria-label")).toBe("Toggle mobile menu")
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls") ?? ""
    )
    expect(panel).not.toBeNull()
    await act(() => trigger.click())
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(panel?.getAttribute("data-open")).toBe("true")
    panel?.querySelector("a")?.focus()
    await act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      )
    })
    expect(document.activeElement).toBe(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    const previousCleanups = cleanup.mock.calls.length
    await act(() => root.render(null))
    expect(cleanup).toHaveBeenCalledTimes(previousCleanups + 1)
  })
})

describe("Sidebar public shell contracts", () => {
  it.each(["ltr", "rtl"] as const)(
    "preserves %s named landmarks, native list structure, full labels, and DOM refs through collapse",
    async (dir) => {
      const refs = {
        root: createRef<HTMLDivElement>(),
        panel: createRef<HTMLElement>(),
        heading: createRef<HTMLHeadingElement>(),
        menu: createRef<HTMLUListElement>(),
        item: createRef<HTMLLIElement>(),
        label: createRef<HTMLSpanElement>(),
        inset: createRef<HTMLElement>(),
        trigger: createRef<HTMLButtonElement>(),
        rail: createRef<HTMLButtonElement>(),
      }
      await act(() => {
        root.render(
          <Sidebar
            className="caller-shell"
            dir={dir}
            id="workspace-shell"
            ref={refs.root}
          >
            <Sidebar.Panel
              aria-labelledby="workspace-navigation-heading"
              className="caller-panel"
              ref={refs.panel}
            >
              <Sidebar.Header>
                <Sidebar.GroupLabel
                  id="workspace-navigation-heading"
                  ref={refs.heading}
                >
                  Workspace navigation and administration
                </Sidebar.GroupLabel>
              </Sidebar.Header>
              <Sidebar.Content>
                <Sidebar.Group>
                  <Sidebar.GroupContent>
                    <Sidebar.Menu ref={refs.menu}>
                      <Sidebar.Item ref={refs.item}>
                        <a aria-current="page" href="/orders">
                          <Sidebar.Label ref={refs.label}>
                            All customer orders and returns
                          </Sidebar.Label>
                        </a>
                      </Sidebar.Item>
                    </Sidebar.Menu>
                  </Sidebar.GroupContent>
                </Sidebar.Group>
              </Sidebar.Content>
              <Sidebar.Rail
                aria-label="Resize workspace navigation"
                ref={refs.rail}
                title="Toggle workspace rail"
              />
            </Sidebar.Panel>
            <Sidebar.Panel aria-label="Contextual order details" side="end">
              <Sidebar.Content>Keep the complete order context</Sidebar.Content>
            </Sidebar.Panel>
            <Sidebar.Inset
              aria-label="Order workspace"
              className="caller-main"
              id="order-workspace"
              ref={refs.inset}
              tabIndex={-1}
            >
              <Sidebar.Trigger
                aria-label="Toggle workspace navigation and administration"
                ref={refs.trigger}
                tooltip={null}
              />
              <h1>Customer orders</h1>
            </Sidebar.Inset>
          </Sidebar>
        )
      })
      const parts = [
        [refs.root, "[data-part=root]", "DIV"],
        [refs.panel, "#workspace-shell-start-panel", "ASIDE"],
        [refs.heading, "#workspace-navigation-heading", "H2"],
        [refs.menu, "[data-part=menu]", "UL"],
        [refs.item, "[data-part=item]", "LI"],
        [refs.label, "[data-part=label]", "SPAN"],
        [refs.inset, "#order-workspace", "MAIN"],
        [refs.trigger, "[data-sidebar-trigger]", "BUTTON"],
        [refs.rail, "[data-part=rail]", "BUTTON"],
      ] as const
      for (const [ref, selector, tag] of parts) {
        const node = canvas.querySelector(selector)
        expect(node).not.toBeNull()
        expect(ref.current).toBe(node)
        expect(ref.current?.tagName).toBe(tag)
      }
      expect(refs.root.current?.dir).toBe(dir)
      expect(refs.root.current?.classList.contains("caller-shell")).toBe(true)
      expect(refs.panel.current?.classList.contains("caller-panel")).toBe(true)
      expect(refs.inset.current?.classList.contains("caller-main")).toBe(true)
      expect(refs.inset.current?.getAttribute("aria-label")).toBe(
        "Order workspace"
      )
      expect(refs.inset.current?.tabIndex).toBe(-1)
      expect(canvas.querySelectorAll("main")).toHaveLength(1)
      expect(canvas.querySelectorAll("aside")).toHaveLength(2)
      expect(refs.panel.current?.getAttribute("aria-labelledby")).toBe(
        refs.heading.current?.id
      )
      expect(refs.heading.current?.textContent).toBe(
        "Workspace navigation and administration"
      )
      expect(
        canvas
          .querySelector("#workspace-shell-end-panel")
          ?.getAttribute("aria-label")
      ).toBe("Contextual order details")
      expect(refs.menu.current?.firstElementChild).toBe(refs.item.current)
      expect(refs.item.current?.querySelector("a")?.getAttribute("href")).toBe(
        "/orders"
      )
      expect(
        refs.item.current?.querySelector("a")?.getAttribute("aria-current")
      ).toBe("page")
      expect(
        canvas.querySelector('[role="menu"], [role="menuitem"]')
      ).toBeNull()
      expect(refs.trigger.current?.getAttribute("aria-label")).toBe(
        "Toggle workspace navigation and administration"
      )
      expect(refs.rail.current?.getAttribute("aria-label")).toBe(
        "Resize workspace navigation"
      )
      expect(refs.rail.current?.title).toBe("Toggle workspace rail")
      for (const ref of [refs.trigger, refs.rail]) {
        expect(ref.current?.getAttribute("aria-controls")).toBe(
          refs.panel.current?.id
        )
        expect(ref.current?.getAttribute("aria-expanded")).toBe("true")
      }
      const label = refs.label.current
      await act(() => refs.trigger.current?.click())
      expect(refs.panel.current?.getAttribute("data-state")).toBe("collapsed")
      expect(refs.panel.current?.hasAttribute("inert")).toBe(false)
      expect(refs.panel.current?.hasAttribute("aria-hidden")).toBe(false)
      expect(refs.label.current).toBe(label)
      expect(refs.label.current?.textContent).toBe(
        "All customer orders and returns"
      )
      expect(refs.label.current?.hasAttribute("aria-hidden")).toBe(false)
      expect(refs.label.current?.hasAttribute("hidden")).toBe(false)
      for (const ref of [refs.trigger, refs.rail]) {
        expect(ref.current?.getAttribute("aria-expanded")).toBe("false")
      }
      expect(
        canvas
          .querySelector("#workspace-shell-end-panel")
          ?.getAttribute("data-state")
      ).toBe("expanded")
      await act(() => root.render(null))
      for (const ref of Object.values(refs)) {
        expect(ref.current).toBeNull()
      }
    }
  )
})
