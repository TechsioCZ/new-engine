import type { Meta, StoryObj } from "@storybook/react"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge } from "../../src/atoms/badge"
import type { BadgeProps } from "../../src/atoms/badge"

const meta: Meta<typeof Badge> = {
  argTypes: {
    bgColor: {
      control: "color",
      description: "Background color for dynamic variant",
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
    children: {
      control: "text",
      description: "Text content of the badge",
    },
    fgColor: {
      control: "color",
      description: "Foreground color for dynamic variant",
      if: {
        arg: "variant",
        eq: "dynamic",
      },
    },
    size: {
      control: "select",
      description: "Badge size",
      options: ["sm", "md", "lg", "xl"],
      table: {
        defaultValue: { summary: "md" },
      },
    },
    variant: {
      control: "select",
      description: "Visual style variant of the badge",
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
      table: {
        defaultValue: { summary: "info" },
      },
    },
  },
  args: {
    children: "Badge",
    size: "md",
    variant: "info",
  },
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Atoms/Badge",
}

export default meta
type Story = Omit<StoryObj<typeof meta>, "args"> & {
  args?: Partial<BadgeProps>
}

export const Playground: Story = {
  args: {
    children: "Badge text",
    size: "md",
    variant: "info",
  },
}

export const Variants: Story = {
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
  args: {},
  render: () => (
    <VariantContainer>
      <VariantGroup title="Info">
        <Badge variant="info" size="sm">
          Small badge
        </Badge>
        <Badge variant="info" size="md">
          Medium badge
        </Badge>
        <Badge variant="info" size="lg">
          Large badge
        </Badge>
        <Badge variant="info" size="xl">
          Extra large badge
        </Badge>
      </VariantGroup>
      <VariantGroup title="Outline">
        <Badge variant="outline" size="sm">
          Small outline
        </Badge>
        <Badge variant="outline" size="md">
          Medium outline
        </Badge>
        <Badge variant="outline" size="lg">
          Large outline
        </Badge>
        <Badge variant="outline" size="xl">
          Extra large outline
        </Badge>
      </VariantGroup>
      <VariantGroup title="Dynamic">
        <Badge
          variant="dynamic"
          bgColor="yellow"
          fgColor="black"
          borderColor="black"
          size="sm"
        >
          Small dynamic
        </Badge>
        <Badge
          variant="dynamic"
          bgColor="yellow"
          fgColor="black"
          borderColor="black"
          size="md"
        >
          Medium dynamic
        </Badge>
        <Badge
          variant="dynamic"
          bgColor="yellow"
          fgColor="black"
          borderColor="black"
          size="lg"
        >
          Large dynamic
        </Badge>
        <Badge
          variant="dynamic"
          bgColor="yellow"
          fgColor="black"
          borderColor="black"
          size="xl"
        >
          Extra dynamic
        </Badge>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Dynamic: Story = {
  args: {
    bgColor: "#8A0002",
    borderColor: "#FFF500",
    children: "Dynamic badge",
    fgColor: "#FFFFFF",
    size: "md",
    variant: "dynamic",
  },
}
