import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer } from "../../.storybook/decorator"
import { Tabs } from "../../src/molecules/tabs"
import { Badge } from "../../src/atoms/badge"

const meta: Meta<typeof Tabs> = {
  title: "Molecules/Tabs",
  component: Tabs,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Keyboard-accessible peer content panels with composable triggers, content and an optional active indicator. Use Tabs to switch views in one page context; choose Steps for ordered workflows, links for page navigation and headings instead of nesting tabs.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-5xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "line", "solid", "outline"],
      description: "Visual style variant",
      table: { defaultValue: { summary: "default" }, category: "Appearance" },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the tabs",
      table: { defaultValue: { summary: "md" }, category: "Appearance" },
    },
    orientation: {
      control: "radio",
      options: ["horizontal", "vertical"],
      description: "Tabs orientation",
      table: { defaultValue: { summary: "horizontal" }, category: "Layout" },
    },
    fitted: {
      control: "boolean",
      description: "Tabs fill full width",
      table: { defaultValue: { summary: "false" }, category: "Layout" },
    },
    justify: {
      control: "select",
      options: ["start", "center", "end"],
      description: "Tab list justification",
      table: { defaultValue: { summary: "start" }, category: "Layout" },
    },
    dir: {
      control: "radio",
      options: ["ltr", "rtl"],
      description: "Text direction",
      table: { defaultValue: { summary: "ltr" }, category: "Behavior" },
    },
    activationMode: {
      control: "radio",
      options: ["automatic", "manual"],
      description: "Tab activation behavior",
      table: { defaultValue: { summary: "automatic" }, category: "Behavior" },
    },
    loopFocus: {
      control: "boolean",
      description: "Loop keyboard focus",
      table: { defaultValue: { summary: "true" }, category: "Behavior" },
    },
  },
}

export default meta
type Story = StoryObj<typeof Tabs>

// Playground with interactive controls
export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Choose tab appearance, orientation and keyboard activation while switching peer project panels.",
      },
    },
  },
  args: {
    variant: "line",
    size: "md",
    orientation: "horizontal",
    fitted: false,
    justify: "start",
    dir: "ltr",
    activationMode: "automatic",
    loopFocus: true,
    defaultValue: "tab1",
  },
  render: (args) => (
    <Tabs {...args} className="w-md max-w-full">
      <Tabs.List>
        <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
        <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
        <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Content value="tab1">
        <p className="text-fg-secondary">
          Overview tab content. Try changing the controls to see different
          variants and sizes.
        </p>
      </Tabs.Content>
      <Tabs.Content value="tab2">
        <p className="text-fg-secondary">
          Details tab content with more information.
        </p>
      </Tabs.Content>
      <Tabs.Content value="tab3">
        <p className="text-fg-secondary">
          Settings tab for configuration options.
        </p>
      </Tabs.Content>
    </Tabs>
  ),
}

// All variants showcase
export const AllVariants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default, line, solid and outline treatments preserve the same tab-panel relationships.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-400">
        <div className="w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-150">Default</h3>
          <Tabs defaultValue="tab1" variant="default" fitted>
            <Tabs.List>
              <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
              <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
              <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="tab1">
              <div className="p-200">Default variant content</div>
            </Tabs.Content>
            <Tabs.Content value="tab2">
              <div className="p-200">Details content</div>
            </Tabs.Content>
            <Tabs.Content value="tab3">
              <div className="p-200">Settings content</div>
            </Tabs.Content>
          </Tabs>
        </div>

        <div className="w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-150">Line</h3>
          <Tabs defaultValue="tab1" variant="line" fitted>
            <Tabs.List>
              <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
              <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
              <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
              <Tabs.Indicator />
            </Tabs.List>
            <Tabs.Content value="tab1">
              <div className="p-200">Line variant content</div>
            </Tabs.Content>
            <Tabs.Content value="tab2">
              <div className="p-200">Details content</div>
            </Tabs.Content>
            <Tabs.Content value="tab3">
              <div className="p-200">Settings content</div>
            </Tabs.Content>
          </Tabs>
        </div>

        <div className="w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-150">Solid</h3>
          <Tabs defaultValue="tab1" variant="solid" fitted>
            <Tabs.List>
              <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
              <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
              <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
              <Tabs.Indicator />
            </Tabs.List>
            <Tabs.Content value="tab1">
              <div className="p-200">Solid variant content</div>
            </Tabs.Content>
            <Tabs.Content value="tab2">
              <div className="p-200">Details content</div>
            </Tabs.Content>
            <Tabs.Content value="tab3">
              <div className="p-200">Settings content</div>
            </Tabs.Content>
          </Tabs>
        </div>

        <div className="w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-150">Outline</h3>
          <Tabs defaultValue="tab1" variant="outline" fitted>
            <Tabs.List>
              <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
              <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
              <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="tab1">
              <div className="p-200">Outline variant content</div>
            </Tabs.Content>
            <Tabs.Content value="tab2">
              <div className="p-200">Details content</div>
            </Tabs.Content>
            <Tabs.Content value="tab3">
              <div className="p-200">Settings content</div>
            </Tabs.Content>
          </Tabs>
        </div>
      </div>
    </VariantContainer>
  ),
}

// Sizes showcase
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The same Overview and Activity content uses Small (sm), Medium (md) and Large (lg) trigger sizes.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, i) => (
        <div className="w-full max-w-2xl" key={size}>
          <h3 className="mb-150 font-semibold text-lg">
            {["Small (sm)", "Medium (md)", "Large (lg)"][i]}
          </h3>
          <Tabs defaultValue="overview" size={size} variant="line">
            <Tabs.List aria-label="Project details">
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
              <Tabs.Indicator />
            </Tabs.List>
            <Tabs.Content value="overview">
              Review the project scope and ownership.
            </Tabs.Content>
            <Tabs.Content value="activity">
              Recent updates from your teammates.
            </Tabs.Content>
          </Tabs>
        </div>
      ))}
    </VariantContainer>
  ),
}

// Vertical orientation
export const DisabledTabs: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable tabs are labelled and skipped during keyboard navigation.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs defaultValue="tab1" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Active Tab</Tabs.Trigger>
          <Tabs.Trigger value="tab2" disabled>
            Disabled Tab
          </Tabs.Trigger>
          <Tabs.Trigger value="tab3">Another Active Tab</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <p className="text-fg-secondary">
              The second tab is disabled and cannot be activated.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">Disabled content</div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">Third tab content</div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// Controlled state
export const VerticalOrientation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A vertical tab list suits short settings sections with space for content alongside it.",
      },
    },
  },
  render: () => (
    <div className="flex h-96">
      <Tabs
        defaultValue="tab1"
        orientation="vertical"
        variant="line"
        className="w-md max-w-full"
      >
        <Tabs.List>
          <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Analytics</Tabs.Trigger>
          <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          <Tabs.Trigger value="tab4">Team</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Overview</h3>
            <p className="text-fg-secondary">
              Dashboard overview with key metrics and statistics.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Analytics</h3>
            <p className="text-fg-secondary">
              Detailed analytics and performance data.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Settings</h3>
            <p className="text-fg-secondary">
              Configure your application settings.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab4">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Team</h3>
            <p className="text-fg-secondary">Manage your team members.</p>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// Fitted tabs
export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Application state owns the selected panel while pointer and keyboard activation stay in sync.",
      },
    },
  },
  render: () => {
    const [selectedTab, setSelectedTab] = useState("tab2")

    return (
      <div className="w-full max-w-2xl flex flex-col gap-200">
        <div className="flex items-center gap-200 bg-surface-secondary p-200 rounded-md">
          <span className="text-sm font-medium">
            Current tab: {selectedTab}
          </span>
        </div>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} variant="line">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Tab 3</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">First tab content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Second tab content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Third tab content</div>
          </Tabs.Content>
        </Tabs>
      </div>
    )
  },
}

// Justify options
export const FittedTabs: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Fitted triggers divide the available width evenly for a small group of peer panels.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Fitted - Line variant</h3>
        <Tabs
          defaultValue="tab1"
          variant="line"
          fitted
          className="w-md max-w-full"
        >
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Fitted tabs fill the entire width</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Fitted - Solid variant</h3>
        <Tabs defaultValue="tab1" variant="solid" fitted>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Fitted solid tabs</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>
    </VariantContainer>
  ),
}

// Disabled tabs
export const JustifyOptions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Start, centre and end alignment position a tab group without changing its content hierarchy.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Justify Start</h3>
        <Tabs
          defaultValue="tab1"
          variant="line"
          justify="start"
          className="w-md max-w-full"
        >
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Start aligned content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Tab 2 content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Justify Center</h3>
        <Tabs
          defaultValue="tab1"
          variant="line"
          justify="center"
          className="w-md max-w-full"
        >
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Center aligned content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Tab 2 content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Justify End</h3>
        <Tabs
          defaultValue="tab1"
          variant="line"
          justify="end"
          className="w-md max-w-full"
        >
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">End aligned content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Tab 2 content</div>
          </Tabs.Content>
        </Tabs>
      </div>
    </VariantContainer>
  ),
}

// With icons
export const WithIcons: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Decorative glyphs reinforce concise tab labels rather than replacing them.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs defaultValue="tab1" variant="line">
        <Tabs.List>
          <Tabs.Trigger icon="icon-[mdi--home]" iconSize="sm" value="tab1">
            Home
          </Tabs.Trigger>
          <Tabs.Trigger icon="icon-[mdi--account]" iconSize="sm" value="tab2">
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger icon="icon-[mdi--cog]" iconSize="sm" value="tab3">
            Settings
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Home</h3>
            <p className="text-fg-secondary">Welcome to your dashboard</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Profile</h3>
            <p className="text-fg-secondary">Manage your profile settings</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Settings</h3>
            <p className="text-fg-secondary">Configure application settings</p>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// With badges
export const WithBadges: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Counts in tab labels add useful context without changing selection behavior.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs defaultValue="tab1" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="tab1">
            Overview
            <Badge variant="primary" className="ml-50">
              New
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab2">
            Messages
            <Badge variant="primary" className="ml-50">
              12
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Overview</h3>
            <p className="text-fg-secondary">New features available</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Messages</h3>
            <p className="text-fg-secondary">You have 12 unread messages</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Settings</h3>
            <p className="text-fg-secondary">Configure your preferences</p>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// RTL support
export const RTLSupport: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Right-to-left tabs keep logical order and keyboard movement consistent.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-2xl" dir="rtl">
      <Tabs defaultValue="tab1" dir="rtl" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="tab1">علامة التبويب الأولى</Tabs.Trigger>
          <Tabs.Trigger value="tab2">علامة التبويب الثانية</Tabs.Trigger>
          <Tabs.Trigger value="tab3">علامة التبويب الثالثة</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">محتوى علامة التبويب الأولى</div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">محتوى علامة التبويب الثانية</div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">محتوى علامة التبويب الثالثة</div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

export const SectionedContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Headings organise related settings inside one panel instead of nesting a second tab list.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs defaultValue="account" variant="line">
        <Tabs.List aria-label="Settings">
          <Tabs.Trigger value="account">Account</Tabs.Trigger>
          <Tabs.Trigger value="privacy">Privacy</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="account">
          <section>
            <h3 className="mb-150 font-semibold">Profile</h3>
            <p>Manage your name and contact information.</p>
          </section>
          <section className="mt-300">
            <h3 className="mb-150 font-semibold">Security</h3>
            <p>Review your password and sign-in preferences.</p>
          </section>
        </Tabs.Content>
        <Tabs.Content value="privacy">
          Control your data and sharing preferences.
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}


export const ScrollableAlignment: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Large tab labels scroll inside narrow surfaces. Center and end alignment fall back to the leading edge when space runs out, in both text directions; the active underline stays inside the scrollport.",
      },
    },
  },
  render: () => (
    <div className="flex max-w-full flex-col gap-300">
      {(["ltr", "rtl"] as const).flatMap((dir) =>
        (["center", "end"] as const).map((justify) => (
          <section className="w-xs max-w-full" key={`${dir}-${justify}`}>
            <h3 className="mb-150 font-semibold">{dir} / {justify}</h3>
            <Tabs defaultValue="overview" dir={dir} justify={justify} size="lg" variant="line">
              <Tabs.List aria-label={`${dir} ${justify} project views`}>
                <Tabs.Trigger value="overview">Project overview</Tabs.Trigger>
                <Tabs.Trigger value="details">Technical details</Tabs.Trigger>
                <Tabs.Trigger value="activity">Recent activity</Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>
              <Tabs.Content value="overview">Project overview panel</Tabs.Content>
              <Tabs.Content value="details">Technical details panel</Tabs.Content>
              <Tabs.Content value="activity">Recent activity panel</Tabs.Content>
            </Tabs>
          </section>
        ))
      )}
      <Tabs defaultValue="overview" className="w-xs max-w-full">
        <Tabs.List aria-label="Default selection cue">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview">Project overview panel</Tabs.Content>
        <Tabs.Content value="details">Technical details panel</Tabs.Content>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const list of canvas.getAllByRole("tablist").slice(0, 4)) {
      const tabs = within(list).getAllByRole("tab")
      const first = tabs[0]
      const last = tabs[2]
      if (!(first && last)) throw new Error("Expected three project tabs")
      const listBox = list.getBoundingClientRect()
      const firstBox = first.getBoundingClientRect()
      await expect(firstBox.left).toBeGreaterThanOrEqual(listBox.left - 1)
      await expect(firstBox.right).toBeLessThanOrEqual(listBox.right + 1)
      const indicator = list.querySelector('[data-part="indicator"]')
      if (!indicator) throw new Error("Missing selected-tab indicator")
      await waitFor(() => {
        const indicatorBox = indicator.getBoundingClientRect()
        expect(indicatorBox.height).toBeGreaterThan(0)
        expect(indicatorBox.bottom).toBeLessThanOrEqual(listBox.bottom)
        expect(indicatorBox.top).toBeGreaterThanOrEqual(listBox.top)
      })
      await userEvent.click(last)
      await expect(last).toHaveAttribute("aria-selected", "true")
      await userEvent.keyboard("{Home}")
      await waitFor(() => {
        expect(first).toHaveFocus()
        expect(first).toHaveAttribute("aria-selected", "true")
      })
    }
    const selected = within(canvas.getByRole("tablist", { name: "Default selection cue" })).getByRole("tab", { selected: true })
    await expect(getComputedStyle(selected).textDecorationLine).toContain("underline")
  },
}
