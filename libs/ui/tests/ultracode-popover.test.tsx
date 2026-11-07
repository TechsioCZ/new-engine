import { readFileSync } from "node:fs"
import postcss, { type AtRule } from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Popover } from "../src/molecules/popover"
import { PopoverTemplate } from "../src/templates/popover"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
const css = postcss.parse(
  read("../src/tokens/components/molecules/_popover.css")
)
const whitespace = /\s+/g
const constrainedContentClass = /contentClassName="min-w-3xs"/g

function utility(name: string) {
  let result: AtRule | undefined
  css.walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      result = rule
    }
  })
  if (!result) {
    throw new Error(`Missing Popover utility: ${name}`)
  }
  return result
}

function token(name: string) {
  let result: string | undefined
  css.walkDecls(name, (declaration) => {
    result = declaration.value.replace(whitespace, "")
  })
  if (!result) {
    throw new Error(`Missing Popover token: ${name}`)
  }
  return result
}

const panelTag = /<div\b[^>]*data-part="content"[^>]*>/
const triggerTag = /<button\b[^>]*data-part="trigger"[^>]*>/

describe("Popover constrained layout regressions", () => {
  it("retains viewport collision caps without a blanket minimum width", () => {
    const declarations = new Map<string, string>()
    utility("popover-viewport").walkDecls((declaration) => {
      declarations.set(
        declaration.prop,
        declaration.value.replace(whitespace, "")
      )
    })
    expect(declarations.get("max-width")).toBe(
      "min(var(--width-popover-max),var(--available-width,100vw),calc(100vw-var(--spacing-popover-viewport)*2))"
    )
    expect(declarations.get("max-height")).toBe(
      "min(var(--available-height,100svh),calc(100svh-var(--spacing-popover-viewport)*2))"
    )
    expect(declarations.has("min-width")).toBe(false)
    expect(utility("popover-scroll-viewport").toString()).toContain(
      "overflow-y: auto"
    )
  })

  it("budgets the responsive close target, inset and both focus paint extents", () => {
    const clearance = utility("popover-viewport")
      .toString()
      .replace(whitespace, "")
    expect(clearance).toContain(
      "padding-inline-end:max(var(--spacing-popover-close-clearance),calc(var(--spacing-popover-close)+max(var(--size-icon-control-sm),var(--size-icon-control-md),var(--size-action-icon-lg))+max(var(--spacing-100),calc(var(--default-ring-width)*4+var(--default-ring-offset)*2))));"
    )
    // At 393px, spacing-600 is about 54.5px. Business's 44px mobile close
    // plus its 12px inset already exceeds that, before either focus extent.
    expect(54.5).toBeLessThan(44 + 12)
    const content = utility("popover-viewport").toString()
    expect(content).toContain(
      '&:has(> .popover-chrome > [data-scope="popover"][data-part="close-trigger"])'
    )
    expect(content).toContain("padding-inline-end:")
    expect(content).not.toContain("padding-right:")
    expect(read("../src/molecules/popover.tsx")).toContain(
      'chrome: "popover-chrome contents"'
    )
  })

  it.each(["ltr", "rtl"] as const)(
    "preserves template labels, content and disabled-slide options in %s",
    (dir) => {
      const html = renderToStaticMarkup(
        <PopoverTemplate
          aria-label="Attachment details"
          description="Review every attachment before saving."
          dir={dir}
          open
          placement="bottom"
          portalled={false}
          showCloseButton
          slide={false}
          title="Attachment details"
          trigger="Review attachment"
        >
          <p>{`Catalog-2026-${"AB1234567890".repeat(30)}`}</p>
          <p>Attachment 15: regional delivery information.</p>
        </PopoverTemplate>
      )
      const content = html.match(panelTag)?.[0]
      expect(content).toContain('role="dialog"')
      expect(content).toContain(`dir="${dir}"`)
      expect(content).toContain('aria-label="Attachment details"')
      expect(html).toContain("Review every attachment before saving.")
      expect(html).toContain("Attachment 15: regional delivery information.")
      expect(html).toContain('aria-label="Close popover"')
      expect(html).toContain("popover-scroll-viewport")
    }
  )

  it("keeps a rounded borderless open state independent of hover", () => {
    const html = renderToStaticMarkup(
      <Popover open portalled={false}>
        <Popover.Trigger>Delivery details</Popover.Trigger>
      </Popover>
    )
    const trigger = html.match(triggerTag)?.[0]
    expect(trigger).toContain('data-state="open"')
    expect(trigger).toContain('data-popover-trigger-theme="borderless"')
    expect(trigger).toContain("popover-trigger-state")
    const state = utility("popover-trigger-state").toString()
    expect(state).toContain('[data-popover-trigger-theme="borderless"]')
    expect(state).toContain('[data-state="open"]:not(:disabled)')
    expect(state).toContain("border-radius: var(--radius-popover)")
    expect(state).not.toContain(":hover")
    expect(token("--color-popover-trigger-bg-open")).toBe(
      "var(--color-popover-trigger-open)"
    )
  })

  it("leaves custom trigger themes identifiable instead of forcing open colors", () => {
    const html = renderToStaticMarkup(
      <Popover open portalled={false}>
        <Popover.Trigger theme="outlined">Delivery details</Popover.Trigger>
      </Popover>
    )
    expect(html.match(triggerTag)?.[0]).toContain(
      'data-popover-trigger-theme="outlined"'
    )
  })

  it("retains the repaired slide=false fixture and adds close/status checks", () => {
    const molecule = read("../stories/molecules/popover.stories.tsx")
    const template = read("../stories/templates/popover.stories.tsx")
    expect(molecule.match(constrainedContentClass)).toHaveLength(2)
    expect(molecule).toContain("slide={false}")
    expect(molecule).toContain("rect.left - focusPaint + 1")
    expect(template).toContain("space-y-200 pb-950 last:pb-0 sm:pb-0")
    expect(template).toContain('className="popover-form-preview"')
    expect(utility("popover-form-preview").toString()).toContain(
      "min-block-size: calc(var(--spacing-950) * 3)"
    )
    expect(template).toContain('theme="outlined"')
    expect(template).toContain('variant="tertiary"')
    expect(template).toContain("status.getBoundingClientRect().top + 1")
    expect(template).toContain(
      "await waitFor(() => expect(trigger).toHaveFocus())"
    )
  })
})
