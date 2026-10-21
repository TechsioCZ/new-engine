import type { ComponentPropsWithoutRef } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { LinkButton } from "../../src/atoms/link-button"

const meta = {
  title: "Atoms/LinkButton",
  component: LinkButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Navigation presented with the visual hierarchy and sizing of Button. Use it to move to another page, not to submit a form or mutate data; use Button for those actions and Link for inline text navigation. Canonical sizes are sm/md/lg, default md; current is retained for embedded composition.",
      },
    },
  },
  argTypes: {
    children: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "warning", "danger"],
    },
    theme: {
      control: "select",
      options: ["solid", "light", "outlined", "borderless", "unstyled"],
    },
    disabled: { control: "boolean" },
    href: { control: false },
    as: { control: false },
    ref: { table: { disable: true } },
  },
  args: {
    children: "View project",
    href: "#project",
    size: "md",
    variant: "primary",
    theme: "solid",
    onClick: fn((event) => event.preventDefault()),
  },
} satisfies Meta<typeof LinkButton>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust button-like navigation styling without leaving the Storybook preview.",
      },
    },
  },
}
export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Solid, light, outlined and borderless treatments express navigation hierarchy without changing link semantics.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      {(["solid", "light", "outlined", "borderless"] as const).map((theme) => (
        <VariantGroup key={theme} title={theme}>
          <LinkButton {...args} theme={theme} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The same project destination at Small (sm), Medium (md) and Large (lg) uses the shared control heights.",
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
          <LinkButton {...args} size={size} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const States: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable destinations have disabled styling, no href, no keyboard tab stop and no click callback.",
      },
    },
  },
  play: async ({ args, canvasElement }) => {
    const link = within(canvasElement).getByRole("link", {
      name: "View project",
    })
    await expect(link).toHaveAttribute("aria-disabled", "true")
    await expect(link).not.toHaveAttribute("href")
    await expect(link).toHaveAttribute("tabindex", "-1")
    await userEvent.click(link)
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}

function RoutingLink({ href, ...props }: ComponentPropsWithoutRef<"a">) {
  if (!href) throw new Error("This routing adapter requires a destination")
  return <a {...props} href={href} />
}

export const DisabledRoutingAdapter: Story = {
  args: { as: RoutingLink, disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "A disabled destination bypasses routing adapters that require href and renders a static, named link placeholder.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", {
      name: "View project",
    })
    await expect(link.tagName).toBe("SPAN")
    await expect(link).toHaveAttribute("aria-disabled", "true")
    await expect(link).not.toHaveAttribute("href")
  },
}
