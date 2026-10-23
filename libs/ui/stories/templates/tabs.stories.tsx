import { useEffect, useState } from "react"
import { expect, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { TabsTemplate, type TabsTemplateProps } from "../../src/templates/tabs"

const meta: Meta<typeof TabsTemplate> = {
  title: "Templates/TabsTemplate",
  component: TabsTemplate,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A ready-to-use tabbed content template with an items-based API. Use it for a straightforward set of peer content panels; choose compound Tabs for custom trigger layouts, and headings or accordions instead of nested tabs. The first enabled item is selected by default.",
      },
    },
  },
  tags: ["autodocs"],
  args: { tablistProps: { "aria-label": "Product information" } },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    tablistProps: {
      control: false,
      description:
        "Props on the tablist; prefer aria-labelledby pointing to a visible heading.",
    },
    items: {
      control: "object",
      description:
        "Array of tab items with value, label, content, and optional disabled state",
      table: {
        category: "Content",
      },
    },
    variant: {
      control: "select",
      options: ["default", "line", "solid", "outline"],
      description: "Visual style variant",
      table: {
        category: "Appearance",
      },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant",
      table: {
        category: "Appearance",
      },
    },
    fitted: {
      control: "boolean",
      description: "Make tabs fill container width",
      table: {
        category: "Layout",
      },
    },
    justify: {
      control: "select",
      options: ["start", "center", "end"],
      description: "Horizontal alignment of tabs",
      table: {
        category: "Layout",
      },
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Tab orientation",
      table: {
        category: "Layout",
      },
    },
    showIndicator: {
      control: "boolean",
      description: "Show visual indicator for active tab",
      table: {
        category: "Appearance",
      },
    },
    defaultValue: {
      control: "text",
      description: "Default active tab value",
      table: {
        category: "State",
      },
    },
    onValueChange: {
      action: "value-changed",
      table: {
        category: "Events",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof TabsTemplate>

const defaultItems = [
  {
    value: "tab1",
    label: "Overview",
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Overview</h3>
        <p className="text-fg-muted">
          This is the overview tab content. It contains general information
          about the product or feature.
        </p>
      </div>
    ),
  },
  {
    value: "tab2",
    label: "Details",
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Details</h3>
        <p className="text-fg-muted">
          Here you'll find detailed specifications and technical information.
        </p>
      </div>
    ),
  },
  {
    value: "tab3",
    label: "Reviews",
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Reviews</h3>
        <p className="text-fg-muted">
          Customer reviews and ratings appear in this section.
        </p>
      </div>
    ),
  },
]

function InteractiveTabs(args: TabsTemplateProps) {
  const [value, setValue] = useState(args.defaultValue)
  useEffect(() => {
    setValue(args.defaultValue)
  }, [args.defaultValue])
  return (
    <TabsTemplate
      {...args}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        args.onValueChange?.(next)
      }}
    />
  )
}

export const Playground: Story = {
  render: (args) => <InteractiveTabs {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Explore the items-based tab API with a selected first panel and visible appearance controls.",
      },
    },
  },
  name: "Playground",
  args: {
    items: [
      ...defaultItems,
      {
        value: "tab4",
        label: "Disabled",
        content: <div className="p-400">This tab is disabled</div>,
        disabled: true,
      },
    ],
    defaultValue: "tab1",
    variant: "line",
    size: "md",
    fitted: false,
    justify: "start",
    orientation: "horizontal",
    showIndicator: true,
  },
}

export const Variants: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Default, line, solid and outline treatments switch the same peer panels. Default underlines the selected label; line adds a track, while solid and outline emphasize the selected trigger.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {(["default", "line", "solid", "outline"] as const).map((variant) => (
        <VariantGroup fullWidth key={variant} title={variant}>
          <TabsTemplate
            defaultValue="tab1"
            items={defaultItems}
            variant={variant}
            tablistProps={{ "aria-label": `${variant} product information` }}
            showIndicator
          />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The same tab items use Small (sm), Medium (md) and Large (lg) sizing.",
      },
    },
  },
  render: () => (
    <div className="flex w-full max-w-2xl flex-col gap-300">
      {(["sm", "md", "lg"] as const).map((size) => (
        <section key={size}>
          <h3 id={`tabs-size-${size}`} className="mb-150 font-semibold">
            {{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}
          </h3>
          <TabsTemplate
            defaultValue="tab1"
            items={defaultItems}
            size={size}
            tablistProps={{ "aria-labelledby": `tabs-size-${size}` }}
            variant="line"
            showIndicator
          />
        </section>
      ))}
    </div>
  ),
}

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The first enabled panel is selected immediately rather than leaving an empty tab surface.",
      },
    },
  },
  args: {
    items: defaultItems,
    defaultValue: "tab1",
    variant: "default",
    size: "md",
    fitted: false,
    justify: "start",
    orientation: "horizontal",
    showIndicator: false,
  },
}

export const FirstEnabledTab: Story = {
  args: {
    items: defaultItems.map((item, index) => ({
      ...item,
      disabled: index === 0,
    })),
  },
  parameters: {
    docs: {
      description: {
        story:
          "When the first item is unavailable, the template selects the first enabled panel automatically.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("tab", { name: "Details" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    await expect(canvas.getByRole("tabpanel")).toBeVisible()
  },
}
