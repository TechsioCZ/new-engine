import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Menu, type MenuItem } from "../../src/molecules/menu"

const items: MenuItem[] = [
  {
    type: "action",
    value: "edit",
    label: "Edit project",
    icon: "token-icon-file-document",
  },
  {
    type: "action",
    value: "copy",
    label: "Copy link",
    icon: "token-icon-copy",
  },
  { type: "separator", id: "share" },
  {
    type: "submenu",
    value: "share",
    label: "Share project",
    items: [
      { type: "action", value: "email", label: "Send by email" },
      { type: "action", value: "invite", label: "Invite teammate" },
    ],
  },
  {
    type: "submenu",
    value: "archive",
    label: "Archived projects",
    disabled: true,
    items: [{ type: "action", value: "restore", label: "Restore project" }],
  },
]
const meta = {
  title: "Molecules/Menu",
  component: Menu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A keyboard-accessible popup of contextual actions, including nested commands and checked options. Choose Menu for transient commands; use Select for a form value and links for persistent navigation. Legacy xs remains available for compatibility; sm, md and lg are the canonical sizes.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    dir: { control: "select", options: ["ltr", "rtl"] },
    triggerText: { control: "text" },
    contextMenu: { control: "boolean" },
    closeOnSelect: { control: "boolean" },
    customTrigger: { control: false },
    id: { table: { disable: true } },
  },
  args: { items, triggerText: "Project actions", size: "md", onSelect: fn() },
} satisfies Meta<typeof Menu>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div className="flex min-w-0 max-w-full justify-center">
      <Menu {...args} />
    </div>
  ),
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Explore action menus, size, direction and dismissal using working controls.",
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: String(args.triggerText),
    })
    const body = within(canvasElement.ownerDocument.body)
    trigger.focus()
    await userEvent.keyboard(
      args.contextMenu ? "{Shift>}{F10}{/Shift}" : "{ArrowDown}"
    )
    const menu = await body.findByRole("menu")
    const separator = within(menu).getByRole("separator")
    await expect(getComputedStyle(separator).borderTopWidth).toBe("0px")
    await expect(getComputedStyle(separator).height).not.toBe("0px")
    // Zag focuses the menu on the next frame; until then the trigger still
    // has focus and ignores navigation keys such as End.
    await waitFor(() => {
      expect(menu).toHaveFocus()
      expect(menu).toBeVisible()
    })
    await expect(
      body.getByRole("menuitem", { name: "Archived projects" })
    ).toHaveTextContent("Archived projects")
    await userEvent.keyboard("{End}")
    await waitFor(() =>
      expect(
        body.getByRole("menuitem", { name: "Share project" })
      ).toHaveAttribute("data-highlighted", "")
    )
    const document = canvasElement.ownerDocument.documentElement
    await expect(document.scrollWidth).toBeLessThanOrEqual(document.clientWidth)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const Sizes: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "The same project commands at Small (sm), Medium (md) and Large (lg) keep trigger and popup sizing aligned.",
      },
    },
  },
  render: () => (
    <div className="grid w-full grid-cols-1 items-start gap-800 md:grid-cols-3">
      {(["sm", "md", "lg"] as const).map((size) => (
        <div
          key={size}
          // Reserve popup space when examples stack, including an upward flip.
          style={{ paddingBlockEnd: "var(--container-xs)" }}
        >
          <VariantGroup
            title={
              { sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]
            }
          >
            <Menu items={items} size={size} triggerText="Project actions" />
          </VariantGroup>
        </div>
      ))}
    </div>
  ),
}
export const WithDisabledItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable submenu commands remain announced as disabled and cannot open through pointer or keyboard input.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Project actions" })
    )
    const body = within(canvasElement.ownerDocument.body)
    const disabled = await body.findByRole("menuitem", {
      name: "Archived projects",
    })
    await expect(disabled).toHaveAttribute("aria-disabled", "true")
    await expect(disabled).toHaveAttribute("data-disabled", "")
    await userEvent.hover(disabled)
    await userEvent.click(disabled)
    await expect(
      body.queryByRole("menuitem", { name: "Restore project" })
    ).not.toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
  },
}
export const ContextMenu: Story = {
  args: { contextMenu: true, triggerText: "Right-click project actions" },
  parameters: {
    docs: {
      description: {
        story:
          "Right-click, long press, or focus the target and press Shift+F10 to open contextual commands without left-click activation.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Right-click project actions",
    })
    await userEvent.click(trigger)
    await expect(
      within(canvasElement.ownerDocument.body).queryByRole("menu")
    ).not.toBeInTheDocument()
    await userEvent.keyboard("{Shift>}{F10}{/Shift}")
    await waitFor(async () => {
      await expect(
        await within(canvasElement.ownerDocument.body).findByRole("menu")
      ).toBeVisible()
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}
export const CustomTrigger: Story = {
  args: {
    customTrigger: (
      <Button onClick={fn()} theme="outlined">
        More project actions
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "A named consumer button retains its click handler while receiving menu keyboard and expansion behavior.",
      },
    },
  },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "More project actions",
      })
    )
    if (
      args.customTrigger &&
      typeof args.customTrigger === "object" &&
      "props" in args.customTrigger
    ) {
      await expect(
        (args.customTrigger.props as { onClick: () => void }).onClick
      ).toHaveBeenCalled()
    }
    await waitFor(async () => {
      await expect(
        await within(canvasElement.ownerDocument.body).findByRole("menu")
      ).toBeVisible()
    })
    await userEvent.keyboard("{Escape}")
  },
}
const optionItems: MenuItem[] = [
  { type: "checkbox", value: "sidebar", label: "Show sidebar", checked: true },
  {
    type: "checkbox",
    value: "activity",
    label: "Show activity",
    checked: false,
  },
  { type: "separator", id: "view" },
  {
    type: "radio",
    value: "list",
    name: "view",
    label: "List view",
    checked: true,
  },
  {
    type: "radio",
    value: "grid",
    name: "view",
    label: "Grid view",
    checked: false,
  },
]
export const WithOptionsMenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Controlled checkbox and radio commands update their checked indicators without closing the menu.",
      },
    },
  },
  render: (args) => {
    const [options, setOptions] = useState(optionItems)
    return (
      <Menu
        {...args}
        closeOnSelect={false}
        items={options}
        triggerText="View options"
        onCheckedChange={(item, checked) =>
          setOptions((previous) =>
            previous.map((option) => {
              if (option.type !== "checkbox" && option.type !== "radio")
                return option
              if (item.type !== "checkbox" && item.type !== "radio")
                return option
              if (option.value === item.value) return { ...option, checked }
              if (
                option.type === "radio" &&
                item.type === "radio" &&
                option.name === item.name &&
                checked
              )
                return { ...option, checked: false }
              return option
            })
          )
        }
      />
    )
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "View options" })
    )
    const body = within(canvasElement.ownerDocument.body)
    const checkbox = await body.findByRole("menuitemcheckbox", {
      name: "Show sidebar",
    })
    await userEvent.click(checkbox)
    await expect(checkbox).toHaveAttribute("aria-checked", "false")
    await userEvent.click(
      body.getByRole("menuitemradio", { name: "Grid view" })
    )
    await expect(
      body.getByRole("menuitemradio", { name: "Grid view" })
    ).toHaveAttribute("aria-checked", "true")
    await expect(
      body.getByRole("menuitemradio", { name: "List view" })
    ).toHaveAttribute("aria-checked", "false")
    await userEvent.keyboard("{Escape}")
  },
}
const checkSubmenuPlacement: Story["play"] = async ({ canvasElement, args }) => {
  const body = within(canvasElement.ownerDocument.body)
  const trigger = within(canvasElement).getByRole("button", {
    name: "Project actions",
  })
  trigger.focus()
  await userEvent.keyboard("{ArrowDown}")
  const parent = await body.findByRole("menu")
  await waitFor(() => expect(parent).toHaveFocus())
  await userEvent.keyboard("{End}")
  const share = within(parent).getByRole("menuitem", { name: "Share project" })
  await waitFor(() => expect(share).toHaveAttribute("data-highlighted"))
  await userEvent.keyboard(args.dir === "rtl" ? "{ArrowLeft}" : "{ArrowRight}")
  const command = await body.findByRole("menuitem", { name: "Send by email" })
  const child = command.closest<HTMLElement>('[role="menu"]')
  if (!child) {
    throw new Error("Sharing commands must belong to a submenu")
  }
  await waitFor(() => {
    expect(child).toHaveFocus()
    expect(share).toHaveAttribute("aria-expanded", "true")
    const bounds = child.getBoundingClientRect()
    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(
      canvasElement.ownerDocument.documentElement.clientWidth
    )
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.bottom).toBeLessThanOrEqual(
      canvasElement.ownerDocument.documentElement.clientHeight
    )
    // Visibility alone misses a child panel painted over its parent's text.
    for (const row of within(parent).getAllByRole("menuitem")) {
      const rect = row.getBoundingClientRect()
      const disjoint =
        bounds.left >= rect.right ||
        bounds.right <= rect.left ||
        bounds.top >= rect.bottom ||
        bounds.bottom <= rect.top
      expect(disjoint).toBe(true)
    }
  })
  await userEvent.keyboard(args.dir === "rtl" ? "{ArrowRight}" : "{ArrowLeft}")
  await waitFor(() => {
    expect(child).not.toBeVisible()
    expect(parent).toHaveFocus()
    expect(share).toHaveAttribute("data-highlighted")
  })
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(trigger).toHaveFocus())
}

export const NestedMenu: Story = {
  play: checkSubmenuPlacement,
  parameters: {
    docs: {
      description: {
        story:
          "Nested sharing commands open next to their parent when space allows, or clear the parent panel vertically on narrow screens, while preserving keyboard return to the parent.",
      },
    },
  },
}
export const RTLSupport: Story = {
  args: { dir: "rtl" },
  play: checkSubmenuPlacement,
  parameters: {
    docs: {
      description: {
        story:
          "Right-to-left menus mirror submenu arrows, placement and keyboard movement together.",
      },
    },
  },
}
export const ScrollableMenu: Story = {
  args: {
    items: Array.from({ length: 24 }, (_, i) => ({
      type: "action",
      value: `project-${i}`,
      label: `Open project ${i + 1}`,
    })),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Long command lists scroll inside the opaque popup rather than extending beyond the viewport.",
      },
    },
  },
}

export const TallScrollableSubmenus: Story = {
  tags: ["ui-runtime-regression"],
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A viewport-height scrolling parent has no exterior room on a narrow screen. Both short and scrolling child menus remain contained and their last commands stay reachable; ordinary shorter parents still clear their child panels.",
      },
    },
  },
  args: {
    "aria-label": "Tall parent commands",
    triggerText: "Tall project commands",
    positioning: { overlap: true, overflowPadding: 8 },
    items: [
      ...Array.from({ length: 12 }, (_, i): MenuItem => ({
        type: "action", value: `before-${i}`, label: `Parent command ${i + 1}`,
      })),
      {
        type: "submenu", value: "sharing", label: "Sharing commands",
        items: [
          { type: "action", value: "summary", label: "Send summary" },
          { type: "action", value: "copy-summary", label: "Copy summary" },
          { type: "action", value: "last-sharing", label: "Last sharing command" },
        ],
      },
      {
        type: "submenu", value: "all-projects", label: "All project commands",
        items: Array.from({ length: 24 }, (_, i): MenuItem => ({
          type: "action", value: `nested-${i + 1}`, label: `Nested project ${i + 1}`,
        })),
      },
      ...Array.from({ length: 12 }, (_, i): MenuItem => ({
        type: "action", value: `after-${i}`, label: `Parent command ${i + 13}`,
      })),
    ],
  },
  render: (args) => {
    const [selected, setSelected] = useState("No command selected")
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-200 p-200" dir={args.dir}>
        <p role="status">{selected}</p>
        <Menu {...args} onSelect={(details) => {
          setSelected(`Selected ${details.value}`)
          args.onSelect?.(details)
        }} />
      </div>
    )
  },
}

export const NavigationAndDisabledOptions: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Native link items reach the navigation callback while disabled checkable rows remain unchanged and out of keyboard highlighting." } } },
  render: () => {
    const [result, setResult] = useState("No navigation yet")
    return <div className="space-y-200"><p role="status">{result}</p><Menu triggerText="Account commands" navigate={(value) => setResult(`Opened ${value} in this preview`)} items={[
      { type: "link", value: "orders", label: "Order history", href: "#orders" },
      { type: "checkbox", value: "locked", label: "Locked preference", checked: false, disabled: true },
      { type: "radio", name: "view", value: "locked-view", label: "Unavailable view", checked: false, disabled: true },
      { type: "action", value: "done", label: "Done" },
    ]} /></div>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: "Account commands" })
    await userEvent.click(trigger)
    await waitFor(async () => expect(await body.findByRole("menu")).toHaveFocus())
    const link = await body.findByRole("menuitem", { name: "Order history" })
    await expect(link.tagName).toBe("A")
    await expect(body.getByRole("menuitemcheckbox")).toHaveAttribute("aria-disabled", "true")
    await expect(body.getByRole("menuitemradio")).toHaveAttribute("aria-disabled", "true")
    // Each key acts on visible state: wait for the highlight before activating it.
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(link).toHaveAttribute("data-highlighted"))
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("Opened orders in this preview"))
  },
}

export const LongLabels: Story = {
  tags: ["ui-runtime-regression"],
  render: Playground.render,
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Long command labels and their trigger stay inside the phone viewport at 200% text size while preserving keyboard navigation and dismissal.",
      },
    },
  },
  args: { triggerText: "File commands", items: [{ type: "action", value: "download", label: "Download the complete catalog including archived products and regional delivery exceptions" }, { type: "action", value: "reference", label: "AKROS-2026-" + "AB1234567890".repeat(8) }] },
  play: async ({ canvasElement }) => {
    const document = canvasElement.ownerDocument.documentElement
    const previousFontSize = document.style.fontSize
    const trigger = within(canvasElement).getByRole("button", {
      name: "File commands",
    })
    const body = within(canvasElement.ownerDocument.body)
    document.style.fontSize = "200%"
    try {
      await expect(document.scrollWidth).toBeLessThanOrEqual(document.clientWidth)
      trigger.focus()
      await userEvent.keyboard("{ArrowDown}")
      const menu = await body.findByRole("menu")
      const reference = body.getByRole("menuitem", { name: /^AKROS-2026-/ })
      // Focus can precede the starting-style frame even with reduced motion.
      await waitFor(() => {
        expect(menu).toHaveFocus()
        expect(menu).toBeVisible()
        expect(
          body.getByRole("menuitem", {
            name: "Download the complete catalog including archived products and regional delivery exceptions",
          })
        ).toBeVisible()
        expect(reference).toBeVisible()
      })
      await expect(document.scrollWidth).toBeLessThanOrEqual(document.clientWidth)
      await userEvent.keyboard("{End}")
      await waitFor(() => expect(reference).toHaveAttribute("data-highlighted"))
      await userEvent.keyboard("{Escape}")
      // Menu retains its closed content for CSS discrete transitions.
      // Dismissal means hidden/inaccessible, not necessarily unmounted.
      await waitFor(() => {
        expect(menu).toHaveAttribute("data-state", "closed")
        expect(menu).not.toBeVisible()
        expect(body.queryByRole("menu")).toBeNull()
        expect(trigger).toHaveAttribute("aria-expanded", "false")
      })
      await waitFor(() => expect(trigger).toHaveFocus())
      await expect(document.scrollWidth).toBeLessThanOrEqual(document.clientWidth)
    } finally {
      document.style.fontSize = previousFontSize
    }
  },
}

export const SubmenuKeyboardPolicy: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "A root's disabled looping and typeahead policies apply recursively to submenu commands." } } },
  args: { triggerText: "Keyboard policy", loopFocus: false, typeahead: false, items: [{ type: "submenu", value: "actions", label: "More commands", items: [{ type: "action", value: "alpha", label: "Alpha command" }, { type: "action", value: "bravo", label: "Bravo command" }] }] },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Keyboard policy" }))
    await waitFor(async () => expect(await body.findByRole("menu")).toHaveFocus())
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(body.getByRole("menuitem", { name: "More commands" })).toHaveAttribute("data-highlighted"))
    await userEvent.keyboard("{ArrowRight}")
    const first = await body.findByRole("menuitem", { name: "Alpha command" })
    const second = body.getByRole("menuitem", { name: "Bravo command" })
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"))
    await userEvent.keyboard("b")
    await expect(first).toHaveAttribute("data-highlighted")
    await userEvent.keyboard("{End}")
    await waitFor(() => expect(second).toHaveAttribute("data-highlighted"))
    await userEvent.keyboard("{ArrowDown}")
    await expect(second).toHaveAttribute("data-highlighted")
    await userEvent.keyboard("{Escape}{Escape}")
  },
}
