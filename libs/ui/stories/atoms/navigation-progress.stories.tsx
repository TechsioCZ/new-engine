import type { Meta, StoryObj } from "@storybook/react"
import { expect, within } from "storybook/test"
import { NavigationProgress } from "../../src/atoms/navigation-progress"

const meta = {
  title: "Atoms/NavigationProgress",
  component: NavigationProgress,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "An indeterminate 2 px bar across the top of its positioned container while a navigation is pending. It stays invisible for the first 150 ms, so fast navigations show nothing; under reduced motion it is a static full-width bar. Mount it only while the navigation is pending and name the work in your own words.",
      },
    },
  },
  argTypes: {
    "aria-label": {
      control: "text",
      description: "Names the pending work for assistive technology.",
    },
    className: { control: false, table: { disable: true } },
    ref: { control: false, table: { disable: true } },
  },
  args: { "aria-label": "Loading page" },
} satisfies Meta<typeof NavigationProgress>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div className="relative w-full max-w-md overflow-hidden rounded-md border border-border-primary bg-surface p-300">
      <NavigationProgress {...args} />
      <p className="text-fg-secondary text-sm">
        The page area stays in place while the next page loads.
      </p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const progress = within(canvasElement).getByRole("progressbar", {
      name: "Loading page",
    })
    await expect(progress).toHaveAttribute("aria-busy", "true")
  },
}
