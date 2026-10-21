import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"
import { Tooltip } from "../src/atoms/tooltip"
import { Popover } from "../src/molecules/popover"
import { PopoverTemplate } from "../src/templates/popover"

function template(props: Partial<Parameters<typeof PopoverTemplate>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PopoverTemplate, {
      defaultOpen: true,
      trigger: "Delivery details",
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: "Standard delivery takes 2–4 days.",
      ...props,
    })
  )
}

test("untitled template panels fall back to a useful trigger name", () => {
  expect(template()).toContain('aria-label="Delivery details"')
})

test("explicit content naming takes precedence over the fallback", () => {
  expect(template({ "aria-label": "Shipping options" })).toContain(
    'aria-label="Shipping options"'
  )
  expect(
    template({
      "aria-label": "Shipping options",
      contentProps: { "aria-label": "Express delivery" },
    })
  ).toContain('aria-label="Express delivery"')
})

test("tooltip forwards custom element IDs and accessible labels", () => {
  const markup = renderToStaticMarkup(
    createElement(Tooltip, {
      content: "Hint",
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: "Trigger",
      defaultOpen: true,
      "aria-label": "Delivery hint",
      ids: {
        content: "hint-content",
        trigger: "hint-trigger",
        positioner: "hint-positioner",
        arrow: "hint-arrow",
      },
      positioning: { placement: "top", gutter: 12 },
    })
  )
  for (const id of [
    "hint-content",
    "hint-trigger",
    "hint-positioner",
    "hint-arrow",
  ]) {
    expect(markup).toContain(`id="${id}"`)
  }
  expect(markup).toContain('aria-label="Delivery hint"')
  expect(markup).toContain('role="tooltip"')
})

test("icon-only popover close preserves the caller's name and size", () => {
  const markup = renderToStaticMarkup(
    createElement(Popover, {
      defaultOpen: true,
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: createElement(Popover.CloseTrigger, {
        "aria-label": "Dismiss delivery details",
        size: "sm",
      }),
    })
  )
  expect(markup).toContain('aria-label="Dismiss delivery details"')
  expect(markup).toContain("size-icon-control-sm")
})
