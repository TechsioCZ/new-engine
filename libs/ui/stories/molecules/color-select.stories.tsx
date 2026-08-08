import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { ColorSelect } from "../../src/molecules/color-select"
import type { ColorItem } from "../../src/molecules/color-select"

// Custom hook for color selection logic
const useColorSelection = (
  initialValue: string | string[] = [],
  mode: "single" | "multiple" = "single",
) => {
  let initialSelection: string | string[] = initialValue
  if (mode === "single" && Array.isArray(initialValue)) {
    initialSelection = initialValue[0] ?? ""
  }
  const [selected, setSelected] = useState<string | string[]>(initialSelection)

  const handleColorClick = (color: string) => {
    if (mode === "single") {
      setSelected((prev) => (prev === color ? "" : color))
    } else {
      setSelected((prev) => {
        const current = Array.isArray(prev) ? prev : []
        return current.includes(color)
          ? current.filter((c) => c !== color)
          : [...current, color]
      })
    }
  }

  const isSelected = (color: string): boolean => {
    if (mode === "single") {
      return selected === color
    }
    return Array.isArray(selected) && selected.includes(color)
  }

  const clear = () => {
    setSelected(mode === "single" ? "" : [])
  }

  return {
    clear,
    handleColorClick,
    isSelected,
    selected,
  }
}

const meta: Meta<typeof ColorSelect> = {
  argTypes: {
    colors: {
      control: { type: "object" },
      description:
        "Array of color items with color, label, count, and selected properties",
    },
    disabled: {
      control: { type: "boolean" },
      description: "Whether all colors are disabled",
    },
    layout: {
      control: { type: "select" },
      description: "Grid layout for color items",
      options: ["list", "grid"],
    },
    onColorClick: {
      action: "clicked",
      description: "Callback when a color is clicked",
    },
    radius: {
      control: { type: "select" },
      description: "Border radius variant",
      options: ["sm", "md", "lg", "full"],
    },
    size: {
      control: { type: "select" },
      description: "Size of the color swatches",
      options: ["sm", "md", "lg", "full"],
    },
  },
  component: ColorSelect,
  parameters: {
    docs: {
      description: {
        component:
          "ColorSelect is a component for displaying and selecting colors in a grid layout. It supports single and multiple selection modes with optional labels and counts.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/ColorSelect",
}

export default meta
type Story = StoryObj<typeof meta>

// Sample color data
const basicColors = [
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#f59e0b", label: "Amber" },
  { color: "#84cc16", label: "Lime" },
  { color: "#10b981", label: "Emerald" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Violet" },
]

const ecommerceColors = [
  { color: "#000000", count: 45, label: "Black" },
  { color: "#ffffff", count: 38, label: "White" },
  { color: "#6b7280", count: 29, label: "Gray" },
  { color: "#1e3a8a", count: 22, label: "Navy" },
  { color: "#d4b896", count: 18, label: "Beige" },
  { color: "#92400e", count: 15, label: "Brown" },
  { color: "#dc2626", count: 12, label: "Red" },
  { color: "#16a34a", count: 10, label: "Green" },
]

const PlaygroundRender: NonNullable<Story["render"]> = (args) => {
  const { handleColorClick, isSelected } = useColorSelection(
    [],
    args.selectionMode,
  )

  const colorsWithSelection = args.colors.map((c: ColorItem) => ({
    ...c,
    selected: isSelected(c.color),
  }))

  return (
    <ColorSelect
      {...args}
      colors={colorsWithSelection}
      onColorClick={handleColorClick}
    />
  )
}

export const Playground: Story = {
  args: {
    colors: basicColors,
    layout: "grid",
    onColorClick: (color: string) => {
      console.log("Selected color:", color)
    },
    radius: "full",
    selectionMode: "single",
    size: "md",
  },
  render: PlaygroundRender,
}

const LayoutsRender: NonNullable<Story["render"]> = () => {
  const [selectedLayout, setSelectedLayout] = useState<{
    col4?: string
    list?: string
  }>({})

  const handleLayoutClick =
    (layoutKey: keyof typeof selectedLayout) => (color: string) => {
      setSelectedLayout((prev) => ({
        ...prev,
        [layoutKey]: prev[layoutKey] === color ? "" : color,
      }))
    }

  return (
    <VariantContainer>
      <VariantGroup title="List Layout">
        <div className="max-w-xs">
          <ColorSelect
            colors={basicColors.slice(0, 4).map((c) => ({
              ...c,
              selected: selectedLayout.list === c.color,
            }))}
            layout="list"
            size="md"
            onColorClick={handleLayoutClick("list")}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="4 Columns">
        <div className="max-w-lg">
          <ColorSelect
            colors={basicColors.map((c) => ({
              ...c,
              selected: selectedLayout.col4 === c.color,
            }))}
            layout="grid"
            size="md"
            onColorClick={handleLayoutClick("col4")}
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  )
}

export const Layouts: Story = {
  render: LayoutsRender,
}

const SizesRender: NonNullable<Story["render"]> = () => {
  const [selectedSizes, setSelectedSizes] = useState<{
    lg?: string
    md?: string
    sm?: string
  }>({})

  const handleSizeClick =
    (size: keyof typeof selectedSizes) => (color: string) => {
      setSelectedSizes((prev) => ({
        ...prev,
        [size]: prev[size] === color ? "" : color,
      }))
    }

  return (
    <VariantContainer>
      <VariantGroup title="Small">
        <ColorSelect
          colors={basicColors.slice(0, 4).map((c) => ({
            ...c,
            selected: selectedSizes.sm === c.color,
          }))}
          size="sm"
          layout="grid"
          onColorClick={handleSizeClick("sm")}
        />
      </VariantGroup>

      <VariantGroup title="Medium">
        <ColorSelect
          colors={basicColors.slice(0, 4).map((c) => ({
            ...c,
            selected: selectedSizes.md === c.color,
          }))}
          size="md"
          layout="grid"
          onColorClick={handleSizeClick("md")}
        />
      </VariantGroup>

      <VariantGroup title="Large">
        <ColorSelect
          colors={basicColors.slice(0, 4).map((c) => ({
            ...c,
            selected: selectedSizes.lg === c.color,
          }))}
          size="lg"
          layout="grid"
          onColorClick={handleSizeClick("lg")}
        />
      </VariantGroup>
    </VariantContainer>
  )
}

export const Sizes: Story = {
  render: SizesRender,
}

const RadiusRender: NonNullable<Story["render"]> = () => {
  const [selectedRadius, setSelectedRadius] = useState<{
    full?: string
    lg?: string
    md?: string
    sm?: string
  }>({})

  const handleRadiusClick =
    (radius: keyof typeof selectedRadius) => (color: string) => {
      setSelectedRadius((prev) => ({
        ...prev,
        [radius]: prev[radius] === color ? "" : color,
      }))
    }

  return (
    <VariantContainer>
      <VariantGroup title="Square (sm)">
        <ColorSelect
          colors={basicColors.slice(0, 4).map((c) => ({
            ...c,
            selected: selectedRadius.sm === c.color,
          }))}
          radius="sm"
          size="lg"
          layout="grid"
          onColorClick={handleRadiusClick("sm")}
        />
      </VariantGroup>

      <VariantGroup title="Rounded (md)">
        <ColorSelect
          colors={basicColors.slice(0, 4).map((c) => ({
            ...c,
            selected: selectedRadius.md === c.color,
          }))}
          radius="md"
          size="lg"
          layout="grid"
          onColorClick={handleRadiusClick("md")}
        />
      </VariantGroup>

      <VariantGroup title="More Rounded (lg)">
        <ColorSelect
          colors={basicColors.slice(0, 4).map((c) => ({
            ...c,
            selected: selectedRadius.lg === c.color,
          }))}
          radius="lg"
          size="lg"
          layout="grid"
          onColorClick={handleRadiusClick("lg")}
        />
      </VariantGroup>

      <VariantGroup title="Circle (full)">
        <ColorSelect
          colors={basicColors.slice(0, 4).map((c) => ({
            ...c,
            selected: selectedRadius.full === c.color,
          }))}
          radius="full"
          size="lg"
          layout="grid"
          onColorClick={handleRadiusClick("full")}
        />
      </VariantGroup>
    </VariantContainer>
  )
}

export const Radius: Story = {
  render: RadiusRender,
}

const MultipleSelectionRender: NonNullable<Story["render"]> = () => {
  const { selected, handleColorClick, isSelected, clear } = useColorSelection(
    [],
    "multiple",
  )

  const colors = basicColors.map((c) => ({
    ...c,
    selected: isSelected(c.color),
  }))

  return (
    <VariantContainer>
      <VariantGroup title="Multiple Selection Mode">
        <div className="max-w-lg">
          <div className="mb-100 flex items-center justify-between">
            <span className="font-medium">Select Colors</span>
            {Array.isArray(selected) && selected.length > 0 && (
              <Button
                onClick={clear}
                variant="primary"
                theme="borderless"
                size="sm"
              >
                Clear all
              </Button>
            )}
          </div>
          <ColorSelect
            colors={colors}
            onColorClick={handleColorClick}
            layout="grid"
            size="lg"
            selectionMode="multiple"
          />
          <p className="mt-200 text-sm text-fg-secondary">
            Selected:{" "}
            {Array.isArray(selected) && selected.length > 0
              ? selected.join(", ")
              : "None"}
          </p>
        </div>
      </VariantGroup>
    </VariantContainer>
  )
}

export const MultipleSelection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Multiple selection mode using the useColorSelection hook. Click to toggle colors.",
      },
    },
  },
  render: MultipleSelectionRender,
}

const EcommerceExampleRender: NonNullable<Story["render"]> = () => {
  const { selected, handleColorClick, isSelected, clear } = useColorSelection(
    [],
    "multiple",
  )

  const colors = ecommerceColors.map((c) => ({
    ...c,
    selected: isSelected(c.color),
  }))

  const selectedCount = Array.isArray(selected) ? selected.length : 0

  return (
    <div className="max-w-lg rounded-lg border border-border-primary bg-surface p-200">
      <div className="mb-150 flex items-center justify-between">
        <h3 className="font-semibold text-fg-primary">Color</h3>
        {selectedCount > 0 && (
          <Button onClick={clear} theme="borderless" size="sm">
            Clear all
          </Button>
        )}
      </div>
      <ColorSelect
        colors={colors}
        onColorClick={handleColorClick}
        layout="grid"
        size="md"
        radius="md"
        selectionMode="multiple"
      />
      {selectedCount > 0 && (
        <div className="mt-200 rounded bg-primary p-100 text-sm text-fg-light">
          Filtering by {selectedCount} color{selectedCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}

export const EcommerceFilter: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Complete e-commerce filter implementation with product counts and clear functionality.",
      },
    },
  },
  render: EcommerceExampleRender,
}
