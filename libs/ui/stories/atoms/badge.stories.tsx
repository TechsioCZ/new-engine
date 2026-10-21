import type { Meta, StoryObj } from "@storybook/react"
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
    variant: {
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
        "outline",
        "dynamic",
      ],
      description: "Visual style variant of the badge",
      table: {
        defaultValue: { summary: "info" },
      },
    },
    children: {
      control: "text",
      description: "Text content of the badge",
    },
    bgColor: {
      control: "color",
      description: "Background color for dynamic variant",
      if: {
        arg: "variant",
        eq: "dynamic",
      },
    },
    fgColor: {
      control: "color",
      description: "Foreground color for dynamic variant",
      if: {
        arg: "variant",
        eq: "dynamic",
      },
    },
    borderColor: {
      control: "color",
      description: "Border color for dynamic variant",
      if: {
        arg: "variant",
        eq: "dynamic",
      },
    },
  },
  args: {
    variant: "info",
    size: "md",
    children: "Ready to ship",
  },
}

export default meta
type Story = Omit<StoryObj<typeof meta>, "args"> & {
  args?: Partial<BadgeProps>
}

export const Playground: Story = {
  render: (args: BadgeProps) =>
    args.variant === "dynamic" ? (
      <Badge
        {...args}
        bgColor={args.bgColor ?? "var(--color-primary)"}
        fgColor={args.fgColor ?? "var(--color-fg-on-primary-solid)"}
        borderColor={args.borderColor ?? "var(--color-primary)"}
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
    variant: "info",
    size: "md",
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
  render: () => (
    <VariantContainer>
      <VariantGroup title="Solid themes">
        <Badge variant="primary">Primary</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="tertiary">Tertiary</Badge>
        <Badge variant="discount">Discount 30%</Badge>
        <Badge variant="info">Ships within 24 h</Badge>
        <Badge variant="success">Delivered</Badge>
        <Badge variant="warning">Last units</Badge>
        <Badge variant="danger">Unavailable</Badge>
      </VariantGroup>
      <VariantGroup title="Outline">
        <Badge variant="outline">Outline badge</Badge>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
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
          <Badge size={size} variant="success">
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
    variant: "dynamic",
    size: "md",
    bgColor: "var(--color-primary)",
    fgColor: "var(--color-fg-on-primary-solid)",
    borderColor: "var(--color-primary)",
    children: "Priority support",
  },
}
