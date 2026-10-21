import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { ActionIcon } from "../../src/atoms/action-icon"
import { iconLabels, iconOptions } from "../helpers/icon-options"

const meta = {
  title: "Atoms/ActionIcon",
  component: ActionIcon,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A named icon-only button for compact supporting actions such as closing, clearing or removing an item. Use Button when an action needs a visible label and Icon for a non-interactive glyph. The sm/md/lg scale uses shared icon-control hit areas so it fits inside full-height fields; prefer lg for standalone touch actions.",
      },
    },
  },
  argTypes: {
    icon: {
      control: { type: "select", labels: iconLabels },
      options: iconOptions,
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    tone: { control: "select", options: ["neutral", "danger"] },
    "aria-label": { control: "text" },
    disabled: { control: "boolean" },
    ref: { table: { disable: true } },
  },
  args: {
    icon: "token-icon-close",
    "aria-label": "Close details",
    size: "md",
    tone: "neutral",
    onClick: fn(),
  },
} satisfies Meta<typeof ActionIcon>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust the glyph, accessible name, tone and hit area while retaining native button behavior.",
      },
    },
  },
}
export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Neutral supporting actions and destructive removal actions share a consistent interaction surface.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Neutral">
        <ActionIcon aria-label="Close details" icon="token-icon-close" />
      </VariantGroup>
      <VariantGroup title="Danger">
        <ActionIcon
          aria-label="Remove attachment"
          icon="token-icon-trash"
          tone="danger"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare the same named close action at Small (sm), Medium (md) and Large (lg).",
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
          <ActionIcon
            aria-label="Close details"
            icon="token-icon-close"
            size={size}
          />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable actions are disabled, excluded from keyboard focus and cannot invoke their handler.",
      },
    },
  },
  args: { disabled: true },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", {
      name: "Close details",
    })
    await expect(button).toBeDisabled()
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}
