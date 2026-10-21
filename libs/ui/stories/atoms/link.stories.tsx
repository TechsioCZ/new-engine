import type { MouseEvent } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Link } from "../../src/atoms/link"

const meta = {
  title: "Atoms/Link",
  component: Link,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An underlined navigation link with readable foreground and a visible keyboard focus ring. Use Link within content; choose LinkButton for prominent navigation or Button for an action that changes local state. External links support safe new-tab defaults. Inline composition may use size=current to inherit surrounding typography.",
      },
    },
  },
  argTypes: {
    children: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    external: { control: "boolean" },
    href: { control: false },
    as: { control: false },
  },
  args: {
    children: "Read delivery information",
    href: "#delivery",
    size: "md",
    onClick: (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault(),
  },
} satisfies Meta<typeof Link>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Explore readable link typography and external-link defaults without navigating away from the demo.",
      },
    },
  },
}
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The same delivery link at Small (sm), Medium (md) and Large (lg) keeps its underline and focus affordance.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size) => (
        <VariantGroup
          key={size}
          title={
            { sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]
          }
        >
          <Link {...args} size={size} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const InContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An inline link inherits paragraph size and remains identifiable without relying on colour.",
      },
    },
  },
  render: (args) => (
    <p className="max-w-md text-fg-primary">
      Orders ship within two working days. <Link {...args} size="current" />.
    </p>
  ),
}
export const External: Story = {
  args: {
    external: true,
    children: "Read the delivery guide (opens in a new tab)",
  },
  parameters: {
    docs: {
      description: {
        story:
          "External navigation announces the new tab in visible copy and applies safe rel attributes; this demo suppresses navigation.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link")
    await expect(link).toHaveAttribute("target", "_blank")
    await expect(link).toHaveAttribute("rel", "noopener noreferrer")
    const before = canvasElement.ownerDocument.location.href
    await userEvent.click(link)
    await expect(canvasElement.ownerDocument.location.href).toBe(before)
  },
}
