import { readFileSync } from "node:fs"
import postcss, { type AtRule } from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Menu, type MenuItem } from "../src/molecules/menu"

const css = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/molecules/_menu.css", import.meta.url),
    "utf8"
  )
)
const items: MenuItem[] = [
  { type: "action", value: "download", label: "Download the complete catalog" },
  { type: "link", value: "orders", label: "Order history", href: "#orders" },
  { type: "checkbox", value: "sidebar", label: "Show sidebar", checked: true },
  {
    type: "radio",
    value: "list",
    name: "view",
    label: "List view",
    checked: false,
  },
  {
    type: "submenu",
    value: "share",
    label: "Share project",
    items: [{ type: "action", value: "email", label: "Send by email" }],
  },
  {
    type: "submenu",
    value: "archived",
    label: "Archived projects",
    disabled: true,
    items: [{ type: "action", value: "restore", label: "Restore project" }],
  },
]

function markup(dir: "ltr" | "rtl") {
  return renderToStaticMarkup(
    <Menu defaultOpen dir={dir} items={items} triggerText="Project commands" />
  )
}

// SSR and CSS contracts only. Native layout, scroll reachability and pointer
// transit remain covered by the parent's browser regression checks.
describe("Menu panel framing and command gutters", () => {
  it.each(["ltr", "rtl"] as const)(
    "applies local surface and row styling to both root and child in %s",
    (dir) => {
      const html = markup(dir)
      const panels = [...html.matchAll(/<ul\b[^>]*>/g)].map(([tag]) => tag)
      expect(panels).toHaveLength(2)
      for (const panel of panels) {
        expect(panel).toContain("popup-surface-base")
        expect(panel).toContain("menu-content-surface")
        expect(panel).toContain('role="menu"')
      }
      const rows = [
        ...html.matchAll(
          /<(?:li|a)\b[^>]*\brole="menuitem(?:checkbox|radio)?"[^>]*>/g
        ),
      ]
      expect(rows).toHaveLength(7)
      for (const [row] of rows) {
        expect(row).toContain("popup-item-base")
        expect(row).toContain("menu-item")
      }
      for (const label of [
        "Download the complete catalog",
        "Order history",
        "Show sidebar",
        "List view",
        "Share project",
        "Send by email",
        "Archived projects",
      ]) {
        expect(html).toContain(`>${label}</span>`)
      }
      expect(html).toContain('href="#orders"')
      expect(html).toContain('aria-checked="true"')
      expect(html).toContain('aria-checked="false"')
      expect(html).toContain('aria-disabled="true"')
      expect(html).not.toContain(">Restore project</span>")
    }
  )

  it("restores panel elevation only on focused Menu content", () => {
    const focusRules = css.nodes.filter(
      (node) =>
        node.type === "rule" &&
        node.selector.startsWith(".menu-content-surface")
    )
    expect(focusRules).toHaveLength(1)
    const [rule] = focusRules
    if (rule?.type !== "rule") {
      throw new Error("Missing focused Menu surface rule")
    }
    expect(rule.selector).toContain('[data-scope="menu"][data-part="content"]')
    expect(rule.selector).toContain(":focus-visible")
    expect(rule.selector).toContain("[data-focus-visible]")
    expect(rule.nodes.map((node) => node.toString())).toEqual([
      "box-shadow: var(--shadow-menu-content)",
    ])
  })

  it("reclaims the trailing gutter only for commands, not checkable rows", () => {
    const utility = css.nodes.find(
      (node): node is AtRule =>
        node.type === "atrule" &&
        node.name === "utility" &&
        node.params === "menu-item"
    )
    if (!utility) {
      throw new Error("Missing Menu row utility")
    }
    const rules = utility.nodes?.filter((node) => node.type === "rule")
    expect(rules).toHaveLength(1)
    const [rule] = rules ?? []
    if (rule?.type !== "rule") {
      throw new Error("Missing Menu command selector")
    }
    expect(rule.selector).toBe('&[role="menuitem"]')
    expect(rule.nodes.map((node) => node.toString())).toEqual([
      "padding-inline-end: var(--popup-item-x, var(--padding-menu-item-x))",
    ])
  })
})
