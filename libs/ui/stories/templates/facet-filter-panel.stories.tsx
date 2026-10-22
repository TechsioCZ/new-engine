import type { Meta, StoryObj } from "@storybook/react"
import { useRef, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import {
  FacetFilterPanel,
  type FacetFilterActiveItem,
  type FacetFilterActiveFiltersProps,
  type FacetFilterGroup,
  type FacetFilterOptionChangeDetails,
  type FacetFilterPanelProps,
  type FacetFilterRangeChangeDetails,
} from "../../src/templates/facet-filter-panel"

const formatPrice = (value: number) => `$${value}`

const baseGroups: FacetFilterGroup[] = [
  {
    type: "options",
    id: "material",
    label: "Material",
    collapseAfter: 4,
    options: [
      { value: "cotton", label: "Cotton", count: 18 },
      { value: "linen", label: "Linen", count: 9 },
      { value: "wool", label: "Wool", count: 6 },
      { value: "silk", label: "Silk", count: 3 },
      { value: "hemp", label: "Hemp", count: 2 },
      { value: "recycled", label: "Recycled fibers", count: 5 },
    ],
  },
  {
    type: "options",
    id: "availability",
    label: "Availability",
    options: [
      { value: "in-stock", label: "In stock", count: 31 },
      { value: "preorder", label: "Pre-order", count: 4 },
    ],
  },
  {
    type: "range",
    id: "price",
    label: "Price",
    min: 0,
    max: 200,
    step: 5,
    value: [0, 200],
    formatValue: formatPrice,
  },
]

type PanelDemoProps = FacetFilterPanelProps

function findOption(
  groups: readonly FacetFilterGroup[],
  groupId: string,
  value: string
) {
  const group = groups.find(
    (candidate) => candidate.type === "options" && candidate.id === groupId
  )

  return group?.type === "options"
    ? group.options.find((option) => option.value === value)
    : undefined
}

function findRangeGroup(groups: readonly FacetFilterGroup[], groupId: string) {
  const group = groups.find(
    (candidate) => candidate.type === "range" && candidate.id === groupId
  )

  return group?.type === "range" ? group : undefined
}

function ActiveFiltersDemo({
  items: initialItems,
  onRemove,
  onReset,
  ...props
}: FacetFilterActiveFiltersProps) {
  const [items, setItems] = useState(initialItems)
  const results = useRef<HTMLHeadingElement>(null)
  return (
    <div className="flex flex-col gap-200">
      <FacetFilterPanel.ActiveFilters
        {...props}
        fallbackFocusEl={() => results.current}
        items={items}
        onRemove={(id) => {
          setItems((current) => current.filter((item) => item.id !== id))
          onRemove?.(id)
        }}
        onReset={() => {
          setItems([])
          onReset?.()
        }}
      />
      <h2 tabIndex={-1} ref={results}>
        Filtered results
      </h2>
    </div>
  )
}

function PanelDemo({
  groups,
  selectedValues: initialSelectedValues = {},
  activeFilters: initialActiveFilters = [],
  drawerOpen: initialDrawerOpen,
  defaultDrawerOpen,
  onOptionChange,
  onRangeChange,
  onRangeChangeEnd,
  onRemoveFilter,
  onReset,
  onDrawerOpenChange,
  ...props
}: PanelDemoProps) {
  const [selectedValues, setSelectedValues] = useState(initialSelectedValues)
  const [activeFilters, setActiveFilters] = useState(initialActiveFilters)
  const [drawerOpen, setDrawerOpen] = useState(
    initialDrawerOpen ?? defaultDrawerOpen ?? false
  )
  const [rangeValues, setRangeValues] = useState(
    () =>
      Object.fromEntries(
        groups
          .filter((group) => group.type === "range")
          .map((group) => [group.id, [...group.value]])
      ) as Record<string, [number, number]>
  )

  const renderedGroups = groups.map((group) =>
    group.type === "range"
      ? { ...group, value: rangeValues[group.id] ?? group.value }
      : group
  )

  const handleOptionChange = (details: FacetFilterOptionChangeDetails) => {
    setSelectedValues((current) => {
      const currentGroup = current[details.groupId] ?? []
      const nextGroup = details.checked
        ? [...new Set([...currentGroup, details.value])]
        : currentGroup.filter((value) => value !== details.value)
      return { ...current, [details.groupId]: nextGroup }
    })

    const id = `option|${details.groupId}|${details.value}`
    setActiveFilters((current) => {
      if (!details.checked) {
        return current.filter((item) => item.id !== id)
      }

      const option = findOption(groups, details.groupId, details.value)
      const label = option?.label ?? details.value
      const item: FacetFilterActiveItem = {
        id,
        label,
        removeLabel: `Remove ${typeof label === "string" ? label : details.value}`,
      }
      return [...current.filter((candidate) => candidate.id !== id), item]
    })
    onOptionChange?.(details)
  }

  const handleRangeChange = (details: FacetFilterRangeChangeDetails) => {
    setRangeValues((current) => ({
      ...current,
      [details.groupId]: details.value,
    }))
    onRangeChange?.(details)
  }

  const handleRangeChangeEnd = (details: FacetFilterRangeChangeDetails) => {
    setRangeValues((current) => ({
      ...current,
      [details.groupId]: details.value,
    }))

    const group = findRangeGroup(groups, details.groupId)
    if (group) {
      const id = `range|${group.id}`
      const isCleared =
        details.value[0] === group.min && details.value[1] === group.max
      setActiveFilters((current) => {
        const withoutCurrentRange = current.filter((item) => item.id !== id)
        if (isCleared) {
          return withoutCurrentRange
        }

        const formatValue = group.formatValue ?? String
        const rangeLabel =
          group.formatRangeText?.(details.value) ??
          `${formatValue(details.value[0])} - ${formatValue(details.value[1])}`
        return [
          ...withoutCurrentRange,
          {
            id,
            label: `${group.label}: ${rangeLabel}`,
            removeLabel: `Remove ${group.label} filter`,
          },
        ]
      })
    }

    onRangeChangeEnd?.(details)
  }

  const handleRemove = (id: string) => {
    const [kind, groupId, value] = id.split("|")
    if (kind === "option" && groupId && value) {
      setSelectedValues((current) => ({
        ...current,
        [groupId]: (current[groupId] ?? []).filter(
          (selectedValue) => selectedValue !== value
        ),
      }))
    } else if (kind === "range" && groupId) {
      const group = findRangeGroup(groups, groupId)
      if (group) {
        setRangeValues((current) => ({
          ...current,
          [groupId]: [group.min, group.max],
        }))
      }
    }
    setActiveFilters((current) => current.filter((item) => item.id !== id))
    onRemoveFilter?.(id)
  }

  const handleReset = () => {
    setSelectedValues({})
    setActiveFilters([])
    setRangeValues(
      Object.fromEntries(
        groups
          .filter((group) => group.type === "range")
          .map((group) => [group.id, [group.min, group.max]])
      ) as Record<string, [number, number]>
    )
    onReset?.()
  }

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open)
    onDrawerOpenChange?.(open)
  }

  return (
    <FacetFilterPanel
      {...props}
      activeFilters={activeFilters}
      drawerOpen={drawerOpen}
      groups={renderedGroups}
      onDrawerOpenChange={handleDrawerOpenChange}
      onOptionChange={handleOptionChange}
      onRangeChange={handleRangeChange}
      onRangeChangeEnd={handleRangeChangeEnd}
      onRemoveFilter={handleRemove}
      onReset={handleReset}
      selectedValues={selectedValues}
    />
  )
}

const meta: Meta<typeof FacetFilterPanel> = {
  title: "Templates/FacetFilterPanel",
  component: FacetFilterPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A controlled filter panel combining grouped options, active filters and numeric ranges in an inline sidebar or drawer. Use it to refine a collection of results; use standalone Select or Checkbox controls for simple single-field filtering. Control sizes are sm/md/lg; drawerSize is a separate panel-width axis.\n\n### Integration contract\nThe application owns selectedValues, each range group’s value and activeFilters. Apply onOptionChange({groupId,value,checked}), onRangeChange/onRangeChangeEnd({groupId,value}), onRemoveFilter(id) and onReset to that shared state; callbacks do not mutate these props. count is informational (including zero); only disabled prevents choosing an option. pending marks results as busy and blocks value-changing controls until the application supplies the next state. Choose inline or drawer in your application’s responsive layout; the component does not choose a breakpoint. The Playground’s source is a copyable controlled example with selection, ranges and chips kept in sync.",
      },
    },
  },
  argTypes: {
    presentation: {
      description:
        "Application-selected inline sidebar or modal drawer; not an automatic responsive breakpoint.",
      control: "select",
      options: ["inline", "drawer"],
    },
    drawerPlacement: {
      description: "Logical layout choice for the drawer edge.",
      control: "select",
      options: ["left", "right"],
    },
    drawerSize: {
      description: "Drawer width, separate from the sm/md/lg control density.",
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "full"],
    },
    disabled: { description: "Blocks all filter changes.", control: "boolean" },
    readOnly: {
      description: "Keeps selections inspectable without changes.",
      control: "boolean",
    },
    size: {
      description: "Canonical size shared by filter controls.",
      control: "select",
      options: ["sm", "md", "lg"],
    },
    pending: {
      description:
        "Announces pending results and blocks value changes until new state arrives.",
      control: "boolean",
    },
    drawerOpen: {
      description: "Controlled drawer state; onDrawerOpenChange is a request.",
      control: false,
    },
    defaultDrawerOpen: {
      description: "Initial drawer state for uncontrolled compositions.",
      control: false,
    },
    groups: {
      description:
        "Option groups and controlled range values; counts are informational, not disabling.",
      control: false,
    },
    selectedValues: {
      description:
        "Application-owned selected option values keyed by group id.",
      control: false,
    },
    activeFilters: {
      description:
        "Application-owned chips synchronized with selections and ranges.",
      control: false,
    },
    onExpandedGroupsChange: {
      description: "Receives the next array of expanded group ids.",
      control: false,
      table: { category: "Events" },
    },
    onOptionChange: {
      description:
        "Apply {groupId, value, checked} to selectedValues and activeFilters.",
      control: false,
      table: { category: "Events" },
    },
    onRangeChange: {
      description:
        "Apply {groupId, value} to the matching range and chip state while editing.",
      control: false,
      table: { category: "Events" },
    },
    onRangeChangeEnd: {
      description:
        "Commit or fetch results for {groupId, value} after range editing.",
      control: false,
      table: { category: "Events" },
    },
    onRemoveFilter: {
      description:
        "Remove the chip id and update its matching selection or range.",
      control: false,
      table: { category: "Events" },
    },
    onReset: {
      description: "Reset selections, ranges and activeFilters together.",
      control: false,
      table: { category: "Events" },
    },
    onDrawerOpenChange: {
      description:
        "Accept or reject the requested open boolean by updating drawerOpen.",
      control: false,
      table: { category: "Events" },
    },
  },
  args: {
    title: "Filters",
    groups: baseGroups,
    presentation: "inline",
    disabled: false,
    pending: false,
    pendingLabel: "Updating results",
    activeFiltersLabel: "Active filters",
    resetLabel: "Clear filters",
    drawerTriggerLabel: "Filters",
    onExpandedGroupsChange: fn(),
    onOptionChange: fn(),
    onRangeChange: fn(),
    onRangeChangeEnd: fn(),
    onRemoveFilter: fn(),
    onReset: fn(),
    onDrawerOpenChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof FacetFilterPanel>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Try the live controls and change the available options to find the right configuration for your form.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-sm">
      <PanelDemo {...args} />
    </div>
  ),
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare Small (sm), Medium (md), and Large (lg) with identical copy and values to choose the right form density.",
      },
    },
  },
  render: (args) => (
    <div className="flex w-full flex-col gap-300">
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <section key={size} className="w-full max-w-sm">
          <h2>{["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}</h2>
          <PanelDemo {...args} size={size} />
        </section>
      ))}
    </div>
  ),
}

export const Selected: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Selected filters can be removed individually or cleared together while the option and range values stay synchronized.",
      },
    },
  },
  args: {
    selectedValues: {
      material: ["linen"],
      availability: ["in-stock"],
    },
    activeFilters: [
      {
        id: "option|material|linen",
        label: "Linen",
        removeLabel: "Remove Linen",
      },
      {
        id: "option|availability|in-stock",
        label: "In stock",
        removeLabel: "Remove In stock",
      },
    ],
  },
  render: (args) => (
    <div className="w-full max-w-container-sm">
      <PanelDemo {...args} />
    </div>
  ),
}

export const ActiveFilters: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Active selections provide clear removal actions and a single reset without changing navigation.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByRole("button", { name: "Remove Linen" })
    first.focus()
    await userEvent.keyboard("{Enter}")
    await expect(
      canvas.getByRole("button", { name: "Remove In stock" })
    ).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(
      canvas.getByRole("heading", { name: "Filtered results" })
    ).toHaveFocus()
  },
  args: {
    activeFilters: [
      { id: "linen", label: "Linen", removeLabel: "Remove Linen" },
      { id: "in-stock", label: "In stock", removeLabel: "Remove In stock" },
    ],
  },
  render: (args) => (
    <div className="w-container-xs max-w-full">
      <ActiveFiltersDemo
        disabled={args.disabled || args.pending}
        items={args.activeFilters ?? []}
        label={args.activeFiltersLabel}
        onRemove={args.onRemoveFilter}
        onReset={args.onReset}
        resetLabel={args.resetLabel}
      />
    </div>
  ),
}

export const EmptyAndOptionAvailability: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Empty groups explain their lack of options, while zero result counts remain distinct from disabled choices.",
      },
    },
  },
  args: {
    groups: [
      {
        type: "options",
        id: "empty",
        label: "Pattern",
        options: [],
        emptyLabel: "No patterns available",
      },
      {
        type: "options",
        id: "finish",
        label: "Finish",
        options: [
          { value: "matte", label: "Matte", count: 0 },
          { value: "gloss", label: "Gloss", count: 4, disabled: true },
        ],
      },
    ],
  },
  render: (args) => (
    <div className="w-full max-w-container-sm">
      <PanelDemo {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable controls retain their visible values but cannot receive keyboard focus or change.",
      },
    },
  },
  args: {
    disabled: true,
    selectedValues: { material: ["cotton"] },
    activeFilters: [
      {
        id: "option|material|cotton",
        label: "Cotton",
        removeLabel: "Remove Cotton",
      },
    ],
  },
  render: (args) => (
    <div className="w-full max-w-container-sm">
      <PanelDemo {...args} />
    </div>
  ),
}

export const ReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Read-only values remain focusable and legible while pointer, keyboard and other editing paths are blocked.",
      },
    },
  },
  name: "Read-only",
  args: { ...Selected.args, readOnly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const minimum = canvas.getByRole("slider", { name: "Minimum price" })
    const value = minimum.getAttribute("aria-valuenow")
    minimum.focus()
    await userEvent.keyboard("{End}{ArrowRight}")
    await expect(minimum).toHaveAttribute("aria-valuenow", value ?? "0")
    await expect(
      canvas.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument()
  },
  render: (args) => (
    <div className="w-full max-w-sm">
      <PanelDemo {...args} />
    </div>
  ),
}

export const Pending: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pending state explains that results are updating while preventing duplicate filter changes.",
      },
    },
  },
  args: {
    pending: true,
    selectedValues: { material: ["wool"] },
    activeFilters: [
      {
        id: "option|material|wool",
        label: "Wool",
        removeLabel: "Remove Wool",
      },
    ],
  },
  render: (args) => (
    <div className="w-full max-w-container-sm">
      <PanelDemo {...args} />
    </div>
  ),
}

export const Overflow: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Expand a long option group on demand rather than crowding the filter panel with every choice.",
      },
    },
  },
  args: {
    groups: baseGroups.filter(
      (group) => group.type === "options" && group.id === "material"
    ),
  },
  render: (args) => (
    <div className="w-full max-w-container-sm">
      <PanelDemo {...args} />
    </div>
  ),
}

export const NarrowLayout: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Option labels, counts and range controls remain usable in a narrow filter sidebar.",
      },
    },
  },
  render: (args) => (
    <div className="w-xs max-w-full">
      <PanelDemo {...args} />
    </div>
  ),
}

function AsyncGroupsExample(args: FacetFilterPanelProps) {
  const [groups, setGroups] = useState<FacetFilterGroup[]>([])

  return (
    <div className="flex w-sm max-w-full flex-col gap-200">
      <Button onClick={() => setGroups(baseGroups)} type="button">
        Load groups
      </Button>
      <FacetFilterPanel {...args} groups={groups} />
    </div>
  )
}

export const AsyncGroups: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Groups arriving after mount expand by default so newly available filters are discoverable.",
      },
    },
  },
  render: (args) => <AsyncGroupsExample {...args} />,
}

function RejectedDrawerCloseExample(args: FacetFilterPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [closeRequests, setCloseRequests] = useState(0)

  return (
    <>
      <p className="text-fg-secondary text-sm">
        Close requests: {closeRequests}
      </p>
      <FacetFilterPanel
        {...args}
        drawerOpen={drawerOpen}
        title={
          <span>
            {args.title}
            <span className="block font-normal text-sm" role="status">
              {closeRequests
                ? "Close was declined once. Press Escape or Close again to leave."
                : "The first close request is declined for this demo; a second request will close it."}
            </span>
          </span>
        }
        onDrawerOpenChange={(open) => {
          if (open) {
            setDrawerOpen(true)
          } else {
            setCloseRequests((current) => current + 1)
            if (closeRequests > 0) setDrawerOpen(false)
          }
          args.onDrawerOpenChange?.(open)
        }}
      />
    </>
  )
}

export const RejectedDrawerClose: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A controlled parent rejects the first dismissal and explains inside the dialog that Escape or Close again will leave safely.",
      },
    },
  },
  args: {
    presentation: "drawer",
  },
  render: (args) => <RejectedDrawerCloseExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Filters" })
    await userEvent.click(trigger)
    const document = canvasElement.ownerDocument
    const body = within(document.body)
    const dialog = await body.findByRole("dialog")
    // Mounting content and activating its focus trap happen on separate tasks.
    await waitFor(() => {
      expect(dialog).toBeVisible()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(dialog).toBeVisible()
      expect(
        body.getByText(
          "Close was declined once. Press Escape or Close again to leave."
        )
      ).toBeVisible()
      expect(canvas.getByText("Close requests: 1")).toBeVisible()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    })
    await userEvent.keyboard("{Escape}")
    // Trap teardown restores focus after the controlled content unmounts.
    await waitFor(() => {
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
      expect(canvas.getByText("Close requests: 2")).toBeVisible()
      expect(trigger).toHaveFocus()
    })
  },
}

export const DrawerOpen: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An initially open drawer exposes the same controlled filters while retaining modal focus management.",
      },
    },
  },
  args: {
    presentation: "drawer",
    drawerOpen: true,
    selectedValues: { material: ["linen"] },
    activeFilters: [
      {
        id: "option|material|linen",
        label: "Linen",
        removeLabel: "Remove Linen",
      },
    ],
  },
  render: (args) => <PanelDemo {...args} />,
}
