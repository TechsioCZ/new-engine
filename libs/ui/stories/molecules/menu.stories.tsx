import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
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
  parameters: {
    docs: {
      description: {
        story:
          "Explore action menus, size, direction and dismissal using working controls.",
      },
    },
  },
}
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The same project commands at Small (sm), Medium (md) and Large (lg) keep trigger and popup sizing aligned.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size) => (
        <VariantGroup
          key={size}
          title={
            { sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]
          }
        >
          <Menu items={items} size={size} triggerText="Project actions" />
        </VariantGroup>
      ))}
    </VariantContainer>
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
export const NestedMenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Nested sharing commands open next to their parent and share the popup elevation contract.",
      },
    },
  },
}
export const RTLSupport: Story = {
  args: { dir: "rtl" },
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

export const NavigationAndDisabledOptions: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Native link items reach the navigation callback while disabled checkable rows remain unchanged and out of keyboard highlighting." } } },
  render: () => {
    const [result, setResult] = useState("No navigation yet")
    return <div className="space-y-200"><Menu triggerText="Account commands" navigate={(value) => setResult(`Opened ${value} in this preview`)} items={[
      { type: "link", value: "orders", label: "Order history", href: "#orders" },
      { type: "checkbox", value: "locked", label: "Locked preference", checked: false, disabled: true },
      { type: "radio", name: "view", value: "locked-view", label: "Unavailable view", checked: false, disabled: true },
      { type: "action", value: "done", label: "Done" },
    ]} /><p role="status">{result}</p></div>
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
    await userEvent.keyboard("{Home}{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Opened orders in this preview")
  },
}

export const LongLabels: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Long command labels wrap inside the phone viewport instead of widening the page or hiding their meaning." } } },
  args: { triggerText: "File commands", items: [{ type: "action", value: "download", label: "Download the complete catalog including archived products and regional delivery exceptions" }, { type: "action", value: "reference", label: "AKROS-2026-" + "AB1234567890".repeat(8) }] },
}

export const SubmenuKeyboardPolicy: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "A root's disabled looping and typeahead policies apply recursively to submenu commands." } } },
  args: { triggerText: "Keyboard policy", loopFocus: false, typeahead: false, items: [{ type: "submenu", value: "actions", label: "More commands", items: [{ type: "action", value: "alpha", label: "Alpha command" }, { type: "action", value: "bravo", label: "Bravo command" }] }] },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Keyboard policy" }))
    await waitFor(async () => expect(await body.findByRole("menu")).toHaveFocus())
    await userEvent.keyboard("{Home}{ArrowRight}")
    const first = await body.findByRole("menuitem", { name: "Alpha command" })
    const second = body.getByRole("menuitem", { name: "Bravo command" })
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"))
    await userEvent.keyboard("b")
    await expect(first).toHaveAttribute("data-highlighted")
    await userEvent.keyboard("{End}{ArrowDown}")
    await expect(second).toHaveAttribute("data-highlighted")
    await userEvent.keyboard("{Escape}{Escape}")
  },
}
