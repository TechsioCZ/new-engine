// @vitest-environment happy-dom

import { strictEqual } from "node:assert/strict"
import { act, type ComponentProps, createRef } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Dialog } from "../src/molecules/dialog"
import { Drawer } from "../src/molecules/drawer"
import { Popover } from "../src/molecules/popover"
import { PopoverTemplate } from "../src/templates/popover"

const openingTags = /<[a-z][a-z0-9-]*\b[^>]*>/g
const attributes = /\s([\w:-]+)="([^"]*)"/g
const whitespace = /\s+/
const dialogBodyToActions =
  /<section data-testid="review-body">[\s\S]*?<\/section><\/div><div\b[^>]*>.*Keep editing[\s\S]*Publish all changes/
const drawerBodyToFooter =
  /<section data-testid="filter-results">[\s\S]*?<\/section><\/div><div\b[^>]*data-testid="filter-footer"/

function expectPart(html: string, scope: string, name: string) {
  const matches = [...html.matchAll(openingTags)]
    .map((match) => match[0])
    .filter(
      (candidateTag) =>
        candidateTag.includes(`data-scope="${scope}"`) &&
        candidateTag.includes(`data-part="${name}"`)
    )
  strictEqual(matches.length, 1, `${scope}.${name} must render exactly once`)
  const tag = matches[0]
  if (!tag) {
    throw new Error(`Missing ${scope}.${name}`)
  }
  return tag
}

function attribute(tag: string, name: string) {
  return [...tag.matchAll(attributes)].find((match) => match[1] === name)?.[2]
}

function classes(tag: string) {
  return attribute(tag, "class")?.split(whitespace) ?? []
}

describe("Popover close action behavior", () => {
  it.each([true, false])(
    "preserves caller naming, events and refs while Zag closes and restores focus (icon-only=%s)",
    async (iconOnly) => {
      const container = document.createElement("div")
      document.body.append(container)
      const root = createRoot(container)
      const closeRef = createRef<HTMLButtonElement>()
      const changes: boolean[] = []
      const callerStates: (string | null)[] = []
      let preventClose = true
      let focusCalls = 0

      try {
        await act(() => {
          root.render(
            <Popover
              onOpenChange={({ open }) => changes.push(open)}
              portalled={false}
            >
              <Popover.Trigger>Review order</Popover.Trigger>
              <Popover.Positioner>
                <Popover.Content aria-label="Order review">
                  <Popover.CloseTrigger
                    aria-label="Pokračovat v úpravách objednávky"
                    className="consumer-cancel"
                    onClick={(event) => {
                      callerStates.push(
                        container
                          .querySelector('[data-part="trigger"]')
                          ?.getAttribute("aria-expanded") ?? null
                      )
                      if (preventClose) {
                        event.preventDefault()
                      }
                    }}
                    onFocus={() => {
                      focusCalls += 1
                    }}
                    ref={closeRef}
                    style={{ color: "rebeccapurple" }}
                  >
                    {iconOnly ? undefined : <span>Pokračovat v úpravách</span>}
                  </Popover.CloseTrigger>
                </Popover.Content>
              </Popover.Positioner>
            </Popover>
          )
        })
        const trigger = container.querySelector<HTMLButtonElement>(
          '[data-part="trigger"]'
        )
        if (!trigger) {
          throw new Error("Missing Popover trigger")
        }

        await act(() => {
          trigger.focus()
          trigger.click()
        })
        const close = closeRef.current
        if (!close) {
          throw new Error("Missing Popover close action")
        }
        expect(close).toBe(
          container.querySelector('[data-part="close-trigger"]')
        )
        expect(close.getAttribute("aria-label")).toBe(
          "Pokračovat v úpravách objednávky"
        )
        expect(close.classList.contains("consumer-cancel")).toBe(true)
        expect(close.style.color).toBe("rebeccapurple")
        if (!iconOnly) {
          expect(close.querySelector("span")?.textContent).toBe(
            "Pokračovat v úpravách"
          )
        }

        await act(() => {
          close.focus()
          close.click()
        })
        expect(focusCalls).toBeGreaterThan(0)
        expect(trigger.getAttribute("aria-expanded")).toBe("true")
        expect(closeRef.current).toBe(close)
        expect(document.activeElement).toBe(close)
        expect(changes).toEqual([true])
        expect(callerStates).toEqual(["true"])

        preventClose = false
        await act(() => {
          close.click()
        })
        expect(callerStates).toEqual(["true", "true"])
        expect(changes).toEqual([true, false])
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
        expect(container.querySelector('[data-part="content"]')).toBeNull()
        expect(closeRef.current).toBeNull()
        await expect.poll(() => document.activeElement).toBe(trigger)
      } finally {
        await act(() => root.unmount())
        container.remove()
      }
    }
  )

  it.each([
    { iconOnly: true, label: "Close popover" },
    { iconOnly: false, label: "close" },
  ])(
    "retains the default accessible name (icon-only=$iconOnly)",
    ({ iconOnly, label }) => {
      const html = renderToStaticMarkup(
        <Popover defaultOpen portalled={false}>
          <Popover.CloseTrigger>
            {iconOnly ? undefined : "Keep editing"}
          </Popover.CloseTrigger>
        </Popover>
      )
      expect(
        attribute(expectPart(html, "popover", "close-trigger"), "aria-label")
      ).toBe(label)
    }
  )
})

// These server-rendered contracts cover composition and prop ownership, not
// browser geometry, mounted label registration, focus restoration or key events.
describe("overlay content composition contracts", () => {
  it("retains rich Dialog copy and the complete action group across its scroll boundary", () => {
    const html = renderToStaticMarkup(
      <Dialog
        actions={
          <>
            <button type="button">Keep editing</button>
            <button form="catalog-review" type="submit">
              Publish all changes
            </button>
          </>
        }
        customTrigger
        description={
          <>
            <p>Review every product before publishing.</p>
            <ul>
              <li>Prices remain unchanged.</li>
              <li>
                Read the <a href="#publication-policy">publication policy</a>.
              </li>
            </ul>
          </>
        }
        id="catalog-review-dialog"
        open
        portal={false}
        title={
          <>
            Review <em>all catalog changes</em> before publication
          </>
        }
      >
        <section data-testid="review-body">
          <form id="catalog-review">
            <label htmlFor="review-note">Publication note</label>
            <textarea id="review-note" name="note" />
          </form>
        </section>
      </Dialog>
    )

    const title = expectPart(html, "dialog", "title")
    const description = expectPart(html, "dialog", "description")
    expect(title.startsWith("<h2 ")).toBe(true)
    // A block description must remain a div: a paragraph wrapper would repair
    // the nested paragraphs/list differently when the server HTML is parsed.
    expect(description.startsWith("<div ")).toBe(true)
    expect(html).toContain(
      "Review <em>all catalog changes</em> before publication</h2>"
    )
    expect(html).toContain(
      '<a href="#publication-policy">publication policy</a>'
    )
    expect(html).toContain("<li>Prices remain unchanged.</li>")
    expect(html.indexOf(title)).toBeLessThan(
      html.indexOf("dialog-scroll-viewport")
    )
    expect(html.indexOf(description)).toBeLessThan(
      html.indexOf('data-testid="review-body"')
    )
    expect(html).toMatch(dialogBodyToActions)
    expect(html).toContain('form="catalog-review" type="submit"')
    expect(html).not.toContain('data-part="trigger"')
  })

  it.each([
    { title: "Confirm publication", hideCloseButton: false },
    { title: "Confirm publication", hideCloseButton: true },
    { title: undefined, hideCloseButton: false },
    { title: undefined, hideCloseButton: true },
  ])(
    "keeps action-only Dialog composition free of unused chrome with title=$title and hideCloseButton=$hideCloseButton",
    ({ title, hideCloseButton }) => {
      const html = renderToStaticMarkup(
        <Dialog
          actions={<button type="button">Confirm publication</button>}
          aria-label={title ? undefined : "Publication confirmation"}
          className="consumer-confirmation"
          customTrigger
          hideCloseButton={hideCloseButton}
          open
          portal={false}
          title={title}
        />
      )
      const contentClasses = classes(expectPart(html, "dialog", "content"))
      expect(contentClasses).toContain("consumer-confirmation")
      expect(contentClasses.includes("pt-dialog-content-close-safe")).toBe(
        !(title || hideCloseButton)
      )
      expect(html.includes('data-part="close-trigger"')).toBe(!hideCloseButton)
      expect(html).not.toContain("dialog-scroll-viewport")
      expect(html).not.toContain('data-part="description"')
      expect(html).toContain(
        '<button type="button">Confirm publication</button>'
      )
      if (title) {
        expect(
          classes(expectPart(html, "dialog", "title")).includes(
            "pe-dialog-title-safe"
          )
        ).toBe(!hideCloseButton)
      } else {
        expect(html).not.toContain('data-part="title"')
        expect(expectPart(html, "dialog", "content")).toContain(
          'aria-label="Publication confirmation"'
        )
      }
    }
  )

  it("lets external Popover labels describe a titleless template without injecting fallback copy", () => {
    const contentProps: ComponentProps<
      typeof PopoverTemplate
    >["contentProps"] & {
      "data-testid": string
    } = {
      "aria-labelledby": "delivery-heading delivery-context",
      "aria-describedby": "delivery-summary delivery-policy",
      "data-testid": "delivery-panel",
    }
    const html = renderToStaticMarkup(
      <>
        <h2 id="delivery-heading">Delivery options</h2>
        <span id="delivery-context">for this order</span>
        <p id="delivery-summary">Choose a delivery method.</p>
        <p id="delivery-policy">Collection is free.</p>
        <PopoverTemplate
          contentClassName="consumer-delivery-panel"
          contentProps={contentProps}
          defaultOpen
          dir="rtl"
          portalled={false}
          showArrow={false}
          trigger={<span>Compare delivery methods</span>}
          triggerClassName="consumer-delivery-trigger"
          triggerProps={{
            "aria-label": "Compare delivery methods for this order",
          }}
        >
          <a href="#collection">Read collection details</a>
        </PopoverTemplate>
      </>
    )
    const content = expectPart(html, "popover", "content")
    const trigger = expectPart(html, "popover", "trigger")
    expect(attribute(content, "aria-labelledby")).toBe(
      "delivery-heading delivery-context"
    )
    expect(attribute(content, "aria-describedby")).toBe(
      "delivery-summary delivery-policy"
    )
    expect(attribute(content, "aria-label")).toBeUndefined()
    expect(attribute(content, "dir")).toBe("rtl")
    expect(classes(content)).toContain("consumer-delivery-panel")
    expect(classes(trigger)).toContain("consumer-delivery-trigger")
    expect(attribute(trigger, "aria-label")).toBe(
      "Compare delivery methods for this order"
    )
    expect(attribute(content, "id")).toBeTruthy()
    expect(attribute(trigger, "aria-controls")).toBe(attribute(content, "id"))
    expect(html).not.toContain("Additional details")
    expect(html).not.toContain('data-part="title"')
    expect(html).not.toContain('data-part="description"')
    expect(html).not.toContain('data-part="arrow"')
    expect(html).toContain('<a href="#collection">Read collection details</a>')
  })

  it.each(["sm", "md", "lg"] as const)(
    "retains rich Popover title/description content and its %s typography slots",
    (size) => {
      const html = renderToStaticMarkup(
        <PopoverTemplate
          defaultOpen
          description={
            <>
              <p>Standard delivery takes 2–4 days.</p>
              <p>
                <a href="#express">Compare express delivery</a>
              </p>
            </>
          }
          portalled={false}
          showCloseButton
          size={size}
          title={
            <>
              Delivery to <strong>your address</strong>
            </>
          }
          trigger="Compare delivery"
        >
          <button type="button">Keep standard delivery</button>
        </PopoverTemplate>
      )
      const title = expectPart(html, "popover", "title")
      const description = expectPart(html, "popover", "description")
      expect(classes(title)).toContain(`text-popover-title-${size}`)
      expect(classes(description)).toContain("text-popover-description")
      expect(description.startsWith("<div ")).toBe(true)
      expect(html).toContain("Delivery to <strong>your address</strong></div>")
      expect(html).toContain("<p>Standard delivery takes 2–4 days.</p>")
      expect(html).toContain('<a href="#express">Compare express delivery</a>')
      expect(html.indexOf(title)).toBeLessThan(html.indexOf(description))
      expect(html.indexOf(description)).toBeLessThan(
        html.indexOf("Keep standard delivery")
      )
      expect(
        attribute(expectPart(html, "popover", "content"), "aria-label")
      ).toBeUndefined()
      expect(expectPart(html, "popover", "close-trigger")).toContain(
        'aria-label="Close popover"'
      )
    }
  )

  it("preserves caller-owned Popover title and description presentation beside a labeled close action", () => {
    const html = renderToStaticMarkup(
      <Popover
        defaultOpen
        dir="rtl"
        ids={{ title: "consumer-title", description: "consumer-policy" }}
        portalled={false}
      >
        <Popover.Content
          aria-describedby="consumer-policy"
          aria-labelledby="consumer-title"
        >
          <Popover.Title className="consumer-title" lang="cs">
            Zkontrolovat objednávku
          </Popover.Title>
          <Popover.Description className="consumer-policy" role="note">
            <p>Žádné položky nebudou odstraněny.</p>
          </Popover.Description>
          <Popover.CloseTrigger
            aria-label="Pokračovat v úpravách objednávky"
            className="consumer-cancel"
            size="sm"
          >
            Pokračovat v úpravách
          </Popover.CloseTrigger>
        </Popover.Content>
      </Popover>
    )
    expect(classes(expectPart(html, "popover", "title"))).toContain(
      "consumer-title"
    )
    expect(attribute(expectPart(html, "popover", "title"), "id")).toBe(
      "consumer-title"
    )
    expect(attribute(expectPart(html, "popover", "description"), "id")).toBe(
      "consumer-policy"
    )
    expect(expectPart(html, "popover", "title")).toContain('lang="cs"')
    expect(expectPart(html, "popover", "description")).toContain('role="note"')
    expect(classes(expectPart(html, "popover", "description"))).toContain(
      "consumer-policy"
    )
    const close = expectPart(html, "popover", "close-trigger")
    // Regression: Zag's generic close name must not replace the caller's
    // localized accessible name when the close action has visible children.
    expect(attribute(close, "aria-label")).toBe(
      "Pokračovat v úpravách objednávky"
    )
    expect(attribute(close, "type")).toBe("button")
    expect(classes(close)).toContain("consumer-cancel")
    expect(html).toContain("Pokračovat v úpravách</button>")
    expect(html).not.toContain('aria-label="Close popover"')
  })

  it.each(["ltr", "rtl"] as const)(
    "keeps Drawer header, full results and footer actions in source order in %s",
    (dir) => {
      const html = renderToStaticMarkup(
        <Drawer dir={dir} immediate open placement="end">
          <Drawer.Content
            aria-describedby="filter-description"
            aria-labelledby="filter-heading"
            className="consumer-filter-panel"
          >
            <Drawer.Header className="consumer-filter-header">
              <Drawer.Title id="filter-heading">
                Filter <em>all available products</em>
              </Drawer.Title>
              <Drawer.Description id="filter-description">
                Keep every matching product.{" "}
                <a href="#filter-help">Filter help</a>
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body className="consumer-filter-body">
              <section data-testid="filter-results">
                <form id="product-filters">
                  <p>All 128 matching products remain available.</p>
                </form>
              </section>
            </Drawer.Body>
            <Drawer.Footer
              className="consumer-filter-footer"
              data-testid="filter-footer"
            >
              <Drawer.CloseTrigger aria-label="Keep current product filters">
                Keep current filters
              </Drawer.CloseTrigger>
              <button form="product-filters" type="submit">
                Apply filters and show all 128 products
              </button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      )
      const content = expectPart(html, "drawer", "content")
      expect(attribute(content, "dir")).toBe(dir)
      expect(attribute(content, "aria-labelledby")).toBe("filter-heading")
      expect(attribute(content, "aria-describedby")).toBe("filter-description")
      expect(classes(content)).toContain("consumer-filter-panel")
      expect(expectPart(html, "drawer", "title").startsWith("<h2 ")).toBe(true)
      expect(expectPart(html, "drawer", "description").startsWith("<p ")).toBe(
        true
      )
      expect(html).toContain("Filter <em>all available products</em></h2>")
      expect(html).toContain('<a href="#filter-help">Filter help</a>')
      expect(html).toContain("All 128 matching products remain available.</p>")
      expect(html).toMatch(drawerBodyToFooter)
      expect(html.indexOf('id="filter-heading"')).toBeLessThan(
        html.indexOf('data-testid="filter-results"')
      )
      expect(html).toContain("Keep current filters</button>")
      expect(html).toContain("Apply filters and show all 128 products</button>")
      expect(html).toContain('form="product-filters" type="submit"')
      expect(
        attribute(expectPart(html, "drawer", "close-trigger"), "aria-label")
      ).toBe("Keep current product filters")
    }
  )
})
