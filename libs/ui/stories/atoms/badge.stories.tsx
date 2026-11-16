import type { Meta, StoryObj } from "@storybook/react"
import { expect, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge, type BadgeProps } from "../../src/atoms/badge"

const meta: Meta<typeof Badge> = {
  title: "Atoms/Badge",
  component: Badge,
  parameters: {
    docs: {
      description: {
        component:
          "A compact, non-interactive label for status, categorisation or counts. Use short, explicit copy rather than colour alone; choose StatusText for field feedback and Button for an action. Legacy xl remains available for display composition, not as a canonical control size.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Badge size",
      table: {
        defaultValue: { summary: "md" },
      },
    },
    severity: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "tertiary",
        "discount",
        "info",
        "success",
        "warning",
        "danger",
        "neutral",
        "custom",
      ],
      description: "Color intent of the badge",
      table: {
        defaultValue: { summary: "info" },
      },
    },
    appearance: {
      control: "select",
      options: ["solid", "outline"],
      description:
        "Fill style. Falls back to the nearest UIProvider, then solid.",
      table: {
        defaultValue: { summary: "solid" },
      },
    },
    children: {
      control: "text",
      description: "Text content of the badge",
    },
    bgColor: {
      control: "color",
      description: "Background color for the custom severity",
      if: {
        arg: "severity",
        eq: "custom",
      },
    },
    fgColor: {
      control: "color",
      description: "Foreground color for the custom severity",
      if: {
        arg: "severity",
        eq: "custom",
      },
    },
    borderColor: {
      control: "color",
      description: "Border color for the custom severity",
      if: {
        arg: "severity",
        eq: "custom",
      },
    },
  },
  args: {
    severity: "info",
    children: "Ready to ship",
  },
}

export default meta
type Story = Omit<StoryObj<typeof meta>, "args"> & {
  args?: Partial<BadgeProps>
}

export const Playground: Story = {
  render: (args: BadgeProps) =>
    args.severity === "custom" ? (
      <Badge
        {...args}
        bgColor={args.bgColor ?? "var(--color-badge-bg-primary)"}
        fgColor={args.fgColor ?? "var(--color-badge-fg-primary)"}
        borderColor={args.borderColor ?? "var(--color-badge-border-primary)"}
      />
    ) : (
      <Badge {...args} />
    ),
  parameters: {
    docs: {
      description: {
        story:
          "Adjust status, size and copy to create a concise label that remains meaningful without colour.",
      },
    },
  },
  args: {
    severity: "info",
    children: "Ready to ship",
  },
}

export const Variants: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare status and category labels using realistic fulfilment copy.",
      },
    },
  },
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const discount = canvas.getByText("Discount 30%")
    const danger = canvas.getByText("Unavailable")
    await expect(discount).toBeVisible()
    await expect(danger).toBeVisible()
    if (canvasElement.closest('[data-theme="business"]')) {
      await expect(getComputedStyle(discount).backgroundColor).not.toBe(
        getComputedStyle(danger).backgroundColor
      )
    }
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Solid">
        <Badge severity="primary">Primary</Badge>
        <Badge severity="secondary">Secondary</Badge>
        <Badge severity="tertiary">Tertiary</Badge>
        <Badge severity="discount">Discount 30%</Badge>
        <Badge severity="info">Ships within 24 h</Badge>
        <Badge severity="success">Delivered</Badge>
        <Badge severity="warning">Last units</Badge>
        <Badge severity="danger">Unavailable</Badge>
      </VariantGroup>
      <VariantGroup title="Outline">
        <Badge appearance="outline" severity="neutral">
          Outline badge
        </Badge>
        <Badge appearance="outline" severity="primary">
          Primary outline
        </Badge>
        <Badge appearance="outline" severity="danger">
          Danger outline
        </Badge>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    const badges = within(canvasElement).getAllByText("Ready to ship")
    await expect(badges).toHaveLength(3)
    for (const [index, current] of badges.entries()) {
      const previous = badges[index - 1]
      if (!previous) {
        continue
      }
      await expect(
        Number.parseFloat(getComputedStyle(current).fontSize)
      ).toBeGreaterThanOrEqual(
        Number.parseFloat(getComputedStyle(previous).fontSize)
      )
      await expect(current.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        previous.getBoundingClientRect().width
      )
      await expect(current.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        previous.getBoundingClientRect().height
      )
    }
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The same Ready to ship label is shown at Small (sm), Medium (md) and Large (lg).",
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
          <Badge size={size} severity="success">
            Ready to ship
          </Badge>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const Dynamic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Custom colours support application-defined categories; always supply a readable foreground and border.",
      },
    },
  },
  args: {
    severity: "custom",
    bgColor: "var(--color-badge-bg-primary)",
    fgColor: "var(--color-badge-fg-primary)",
    borderColor: "var(--color-badge-border-primary)",
    children: "Priority support",
  },
}
