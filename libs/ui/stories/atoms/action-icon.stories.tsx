import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantGroup } from "../../.storybook/decorator"
import { AtomVariantContainer as VariantContainer } from "./variant-container"
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
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The same close glyph isolates neutral and destructive tone on a consistent interaction surface.",
      },
    },
  },
  render: () => (
    <VariantContainer className="items-stretch space-y-0 gap-250">
      <VariantGroup title="Neutral">
        <ActionIcon aria-label="Close details" icon="token-icon-close" />
      </VariantGroup>
      <VariantGroup title="Danger">
        <ActionIcon
          aria-label="Discard draft"
          icon="token-icon-close"
          tone="danger"
        />
      </VariantGroup>
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const neutral = canvas.getByRole("button", { name: "Close details" })
    const danger = canvas.getByRole("button", { name: "Discard draft" })
    const neutralGroup = canvas.getByRole("heading", {
      name: "Neutral",
    }).parentElement
    const dangerGroup = canvas.getByRole("heading", {
      name: "Danger",
    }).parentElement
    if (!(neutralGroup && dangerGroup)) {
      throw new Error("Missing ActionIcon variant groups")
    }
    // Compact examples should not inherit the shared matrix's 800 section gap.
    const gap =
      dangerGroup.getBoundingClientRect().top -
      neutralGroup.getBoundingClientRect().bottom
    await expect(gap).toBeGreaterThan(0)
    await expect(gap).toBeLessThanOrEqual(neutral.getBoundingClientRect().height)
    // Destructive intent is visible at rest, not only on hover.
    await expect(getComputedStyle(danger).color).not.toBe(
      getComputedStyle(neutral).color
    )
  },
}
export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare the same named close action at Small (sm), Medium (md) and Large (lg).",
      },
    },
  },
  render: () => (
    <VariantContainer className="items-stretch space-y-0 gap-250">
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
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole("button")
    // Brand scales may share a glyph step (N1 sm and md are both 16px), so
    // glyphs never shrink and the largest size still beats the smallest.
    const glyphSizes: number[] = []
    let previousGlyph = 0
    let previousWidth = 0
    let previousHeight = 0
    for (const button of buttons) {
      const glyph = button.firstElementChild
      if (!glyph) throw new Error("Missing ActionIcon size glyph")
      const glyphSize = Number.parseFloat(getComputedStyle(glyph).fontSize)
      const target = button.getBoundingClientRect()
      const glyphBounds = glyph.getBoundingClientRect()
      await expect(glyphSize).toBeGreaterThanOrEqual(previousGlyph)
      await expect(target.width).toBeGreaterThanOrEqual(previousWidth)
      await expect(target.height).toBeGreaterThanOrEqual(previousHeight)
      await expect(target.width).toBeCloseTo(target.height)
      await expect(glyphBounds.width).toBeLessThan(target.width)
      await expect(glyphBounds.height).toBeLessThan(target.height)
      glyphSizes.push(glyphSize)
      previousGlyph = glyphSize
      previousWidth = target.width
      previousHeight = target.height
    }
    await expect(glyphSizes.at(-1)).toBeGreaterThan(glyphSizes[0] ?? 0)
  },
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
  render: (args) => (
    <div className="flex gap-300">
      <VariantGroup title="Available">
        <ActionIcon aria-label="Close preview" icon="token-icon-close" />
      </VariantGroup>
      <VariantGroup title="Disabled">
        <ActionIcon {...args} />
      </VariantGroup>
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", {
      name: "Close details",
    })
    await expect(
      within(canvasElement).getByRole("button", { name: "Close preview" })
    ).toBeEnabled()
    await expect(button).toBeDisabled()
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}
