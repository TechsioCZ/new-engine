import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { fn } from "storybook/test"
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

function findOption(groups: readonly FacetFilterGroup[], groupId: string, value: string) {
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

  return (
    <FacetFilterPanel.ActiveFilters
      {...props}
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
  const [rangeValues, setRangeValues] = useState(() =>
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
    layout: "centered",
  },
  argTypes: {
    presentation: {
      control: "select",
      options: ["inline", "drawer"],
    },
    drawerPlacement: {
      control: "select",
      options: ["left", "right"],
    },
    drawerSize: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "full"],
    },
    disabled: { control: "boolean" },
    pending: { control: "boolean" },
    drawerOpen: { control: false },
    defaultDrawerOpen: { control: false },
    groups: { control: false },
    selectedValues: { control: false },
    activeFilters: { control: false },
    onExpandedGroupsChange: { control: false, table: { category: "Events" } },
    onOptionChange: { control: false, table: { category: "Events" } },
    onRangeChange: { control: false, table: { category: "Events" } },
    onRangeChangeEnd: { control: false, table: { category: "Events" } },
    onRemoveFilter: { control: false, table: { category: "Events" } },
    onReset: { control: false, table: { category: "Events" } },
    onDrawerOpenChange: { control: false, table: { category: "Events" } },
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
  render: (args) => (
    <div className="w-sm max-w-full">
      <PanelDemo {...args} />
    </div>
  ),
}

export const Selected: Story = {
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

export const Pending: Story = {
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
  render: (args) => <AsyncGroupsExample {...args} />,
}

function RejectedDrawerCloseExample(args: FacetFilterPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [closeRequests, setCloseRequests] = useState(0)

  return (
    <>
      <p className="text-fg-secondary text-sm">Close requests: {closeRequests}</p>
      <FacetFilterPanel
        {...args}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={(open) => {
          if (open) {
            setDrawerOpen(true)
          } else {
            setCloseRequests((current) => current + 1)
          }
          args.onDrawerOpenChange?.(open)
        }}
      />
    </>
  )
}

export const RejectedDrawerClose: Story = {
  args: {
    presentation: "drawer",
  },
  render: (args) => <RejectedDrawerCloseExample {...args} />,
}

export const DrawerOpen: Story = {
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
