import { ok } from "node:assert/strict"
import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Select, selectVariants } from "../src/molecules/select"
import { SelectTemplate } from "../src/templates/select"

const items = [
  {
    value: "central",
    label: "Central European distribution and customer support",
  },
  {
    value: "international",
    label: "International delivery coordination and returns",
  },
]
const tokens = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/molecules/_select.css", import.meta.url),
    "utf8"
  )
)
const COMBOBOX_BUTTON = /<button\b[^>]*role="combobox"[^>]*>[\s\S]*?<\/button>/
const ZERO_LABEL = /<label\b[^>]*>0<\/label>/
const ZERO_ITEM_TEXT = /<span\b[^>]*data-part="item-text"[^>]*>0<\/span>/

const expectPartTag = (html: string, part: string) => {
  const tag = html.match(new RegExp(`<[^>]+data-part="${part}"[^>]*>`))?.[0]
  ok(tag !== undefined, `Missing Select ${part}`)
  return tag
}

function CompoundSelect({
  dir,
  disabled = false,
  readOnly = false,
}: {
  dir: "ltr" | "rtl"
  disabled?: boolean
  readOnly?: boolean
}) {
  return (
    <Select
      defaultValue={["central"]}
      dir={dir}
      disabled={disabled}
      items={items}
      name="team"
      readOnly={readOnly}
      size="lg"
    >
      <Select.Label>Delivery team</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner portalled={false}>
        <Select.Content>
          {items.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  )
}

describe("Select visual composition", () => {
  it.each(["xs", "sm", "md", "lg"] as const)(
    "keeps full labels and an inset clear surface at size %s",
    (size) => {
      const styles = selectVariants({ size })
      for (const classes of [styles.valueText(), styles.itemText()]) {
        expect(classes).toContain("whitespace-normal")
        expect(classes).toContain("wrap-anywhere")
        expect(classes).not.toContain("truncate")
      }
      expect(styles.trigger()).toContain("form-control-size-")
      expect(styles.clearTrigger()).toContain("bg-clip-content")
      expect(styles.clearTrigger()).toContain(
        "p-(--padding-select-clear-inset)"
      )
    }
  )

  it("reserves the actual large ActionIcon target with logical clearance", () => {
    const declarations = new Map<string, string>()
    tokens.walkDecls((declaration) => {
      if (declaration.parent?.type === "atrule") {
        declarations.set(declaration.prop, declaration.value)
      }
    })
    expect(declarations.get("--spacing-select-clear")).toBe(
      "var(--dimension-4)"
    )
    expect(declarations.get("--padding-select-clear-inset")).toBe(
      "var(--spacing-select-clear)"
    )
    let largeTarget: string | undefined
    let valueClearance: string | undefined
    tokens.walkRules((rule) => {
      if (rule.selector === '&[data-size="lg"]') {
        rule.walkDecls("--select-clear-size", (declaration) => {
          largeTarget = declaration.value
        })
      }
      if (rule.selector.includes('[data-part="value-text"]')) {
        rule.walkDecls("margin-inline-end", (declaration) => {
          valueClearance = declaration.value
        })
      }
    })
    expect(largeTarget).toBe("var(--size-action-icon-lg)")
    expect(valueClearance).toBe("var(--select-clear-size)")
  })

  it.each(["ltr", "rtl"] as const)(
    "retains native values and sibling clear semantics in %s",
    (dir) => {
      const html = renderToStaticMarkup(<CompoundSelect dir={dir} />)
      expect(expectPartTag(html, "trigger")).toContain(`dir="${dir}"`)
      expect(expectPartTag(html, "clear-trigger")).toContain(
        'aria-label="Clear selection"'
      )
      expect(expectPartTag(html, "clear-trigger")).toContain(
        "size-action-icon-lg"
      )
      const trigger = html.match(COMBOBOX_BUTTON)?.[0]
      expect(trigger).toBeDefined()
      expect(trigger).not.toContain('data-part="clear-trigger"')
      expect(html).toContain('name="team"')
      expect(html).toContain('value="central"')
      for (const item of items) {
        expect(html).toContain(item.label)
      }
    }
  )

  it("keeps the disabled clear action inert and omits it when read-only", () => {
    const disabled = renderToStaticMarkup(<CompoundSelect dir="ltr" disabled />)
    expect(expectPartTag(disabled, "clear-trigger")).toContain('disabled=""')
    const readOnly = renderToStaticMarkup(<CompoundSelect dir="ltr" readOnly />)
    expect(readOnly).not.toContain('data-part="clear-trigger"')
    expect(expectPartTag(readOnly, "trigger")).toContain('aria-readonly="true"')
  })

  it("retains consumer wrapping and clear-surface overrides", () => {
    const styles = selectVariants()
    expect(styles.valueText({ className: "whitespace-pre-wrap" })).toContain(
      "whitespace-pre-wrap"
    )
    expect(
      styles.valueText({ className: "whitespace-pre-wrap" })
    ).not.toContain("whitespace-normal")
    const clear = styles.clearTrigger({ className: "bg-clip-border p-0" })
    expect(clear).toContain("bg-clip-border")
    expect(clear).toContain("p-0")
    expect(clear).not.toContain("bg-clip-content")
    expect(clear).not.toContain("p-(--padding-select-clear-inset)")
  })

  it("does not discard numeric template labels or helper text", () => {
    const html = renderToStaticMarkup(
      <SelectTemplate helpText={0} items={items} label={0} />
    )
    expect(html).toMatch(ZERO_LABEL)
    expect(html).toContain('data-select-description=""')
  })

  it("honors an explicit zero option label override", () => {
    const item = items[0]
    if (!item) {
      throw new Error("Missing zero-label option fixture")
    }
    const html = renderToStaticMarkup(
      <Select items={items}>
        <Select.Item item={item}>
          <Select.ItemText>{0}</Select.ItemText>
        </Select.Item>
      </Select>
    )
    expect(html).toMatch(ZERO_ITEM_TEXT)
  })
})
