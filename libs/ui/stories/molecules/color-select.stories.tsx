import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { ColorSelect } from '../../src/molecules/color-select'
import type { ColorItem } from '../../src/molecules/color-select'
import { Button } from '../../src/atoms/button'
import { useState } from 'react'

// Custom hook for color selection logic
const useColorSelection = (
  initialValue: string | string[] = [],
  mode: 'single' | 'multiple' = 'single'
) => {
  const [selected, setSelected] = useState<string | string[]>(
    mode === 'single' ? (Array.isArray(initialValue) ? initialValue[0] || '' : initialValue) : initialValue
  )

  const handleColorClick = (color: string) => {
    if (mode === 'single') {
      setSelected((prev) => (prev === color ? '' : color))
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
    if (mode === 'single') {
      return selected === color
    }
    return Array.isArray(selected) && selected.includes(color)
  }

  const clear = () => {
    setSelected(mode === 'single' ? '' : [])
  }

  return {
    selected,
    handleColorClick,
    isSelected,
    clear,
  }
}

const meta: Meta<typeof ColorSelect> = {
  title: 'Molecules/ColorSelect',
  component: ColorSelect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ColorSelect is a component for displaying and selecting colors in a grid layout. It supports single and multiple selection modes with optional labels and counts.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    colors: {
      control: { type: 'object' },
      description: 'Array of color items with color, label, count, and selected properties'
    },
    layout: {
      control: { type: 'select' },
      options: ['list', 'grid'],
      description: 'Grid layout for color items'
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'full'],
      description: 'Size of the color swatches'
    },
    radius: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'full'],
      description: 'Border radius variant'
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether all colors are disabled'
    },
    onColorClick: {
      action: 'clicked',
      description: 'Callback when a color is clicked'
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

// Sample color data
const basicColors = [
  { color: '#ef4444', label: 'Red' },
  { color: '#f97316', label: 'Orange' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#84cc16', label: 'Lime' },
  { color: '#10b981', label: 'Emerald' },
  { color: '#06b6d4', label: 'Cyan' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#8b5cf6', label: 'Violet' },
]

const ecommerceColors = [
  { color: '#000000', label: 'Black', count: 45 },
  { color: '#ffffff', label: 'White', count: 38 },
  { color: '#6b7280', label: 'Gray', count: 29 },
  { color: '#1e3a8a', label: 'Navy', count: 22 },
  { color: '#d4b896', label: 'Beige', count: 18 },
  { color: '#92400e', label: 'Brown', count: 15 },
  { color: '#dc2626', label: 'Red', count: 12 },
  { color: '#16a34a', label: 'Green', count: 10 },
]

export const Playground: Story = {
  args: {
    colors: basicColors,
    layout: 'grid',
    size: 'md',
    radius: 'full',
    selectionMode: 'single',
    onColorClick: (color: string) => {console.log('Selected color:', color)}
  },
  render: (args) => {
    const { handleColorClick, isSelected } = useColorSelection([], args.selectionMode)

    const colorsWithSelection = args.colors.map((c: ColorItem) => ({
      ...c,
      selected: isSelected(c.color)
    }))

    return <ColorSelect {...args} colors={colorsWithSelection} onColorClick={handleColorClick} />
  }
}

export const Layouts: Story = {
  render: () => {
    const [selectedLayout, setSelectedLayout] = useState<{ [key: string]: string }>({});

    const handleLayoutClick = (layoutKey: string) => (color: string) => {
      setSelectedLayout(prev => ({
        ...prev,
        [layoutKey]: prev[layoutKey] === color ? '' : color
      }));
    };

    return (
      <VariantContainer>
        <VariantGroup title="List Layout">
          <div className="max-w-xs">
            <ColorSelect
              colors={basicColors.slice(0, 4).map(c => ({
                ...c,
                selected: selectedLayout.list === c.color
              }))}
              layout="list"
              size="md"
              onColorClick={handleLayoutClick('list')}
            />
          </div>
        </VariantGroup>

        <VariantGroup title="4 Columns">
          <div className="max-w-lg">
            <ColorSelect
              colors={basicColors.map(c => ({
                ...c,
                selected: selectedLayout.col4 === c.color
              }))}
              layout="grid"
              size="md"
              onColorClick={handleLayoutClick('col4')}
            />
          </div>
        </VariantGroup>
      </VariantContainer>
    )
  }
}

export const Sizes: Story = {
  render: () => {
    const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({});

    const handleSizeClick = (size: string) => (color: string) => {
      setSelectedSizes(prev => ({
        ...prev,
        [size]: prev[size] === color ? '' : color
      }));
    };

    return (
      <VariantContainer>
        <VariantGroup title="Small">
          <ColorSelect
            colors={basicColors.slice(0, 4).map(c => ({
              ...c,
              selected: selectedSizes.sm === c.color
            }))}
            size="sm"
            layout="grid"
            onColorClick={handleSizeClick('sm')}
          />
        </VariantGroup>

        <VariantGroup title="Medium">
          <ColorSelect
            colors={basicColors.slice(0, 4).map(c => ({
              ...c,
              selected: selectedSizes.md === c.color
            }))}
            size="md"
            layout="grid"
            onColorClick={handleSizeClick('md')}
          />
        </VariantGroup>

        <VariantGroup title="Large">
          <ColorSelect
            colors={basicColors.slice(0, 4).map(c => ({
              ...c,
              selected: selectedSizes.lg === c.color
            }))}
            size="lg"
            layout="grid"
            onColorClick={handleSizeClick('lg')}
          />
        </VariantGroup>
      </VariantContainer>
    )
  }
}

export const Radius: Story = {
  render: () => {
    const [selectedRadius, setSelectedRadius] = useState<{ [key: string]: string }>({});

    const handleRadiusClick = (radius: string) => (color: string) => {
      setSelectedRadius(prev => ({
        ...prev,
        [radius]: prev[radius] === color ? '' : color
      }));
    };

    return (
      <VariantContainer>
        <VariantGroup title="Square (sm)">
          <ColorSelect
            colors={basicColors.slice(0, 4).map(c => ({
              ...c,
              selected: selectedRadius.sm === c.color
            }))}
            radius="sm"
            size="lg"
            layout="grid"
            onColorClick={handleRadiusClick('sm')}
          />
        </VariantGroup>

        <VariantGroup title="Rounded (md)">
          <ColorSelect
            colors={basicColors.slice(0, 4).map(c => ({
              ...c,
              selected: selectedRadius.md === c.color
            }))}
            radius="md"
            size="lg"
            layout="grid"
            onColorClick={handleRadiusClick('md')}
          />
        </VariantGroup>

        <VariantGroup title="More Rounded (lg)">
          <ColorSelect
            colors={basicColors.slice(0, 4).map(c => ({
              ...c,
              selected: selectedRadius.lg === c.color
            }))}
            radius="lg"
            size="lg"
            layout="grid"
            onColorClick={handleRadiusClick('lg')}
          />
        </VariantGroup>

        <VariantGroup title="Circle (full)">
          <ColorSelect
            colors={basicColors.slice(0, 4).map(c => ({
              ...c,
              selected: selectedRadius.full === c.color
            }))}
            radius="full"
            size="lg"
            layout="grid"
            onColorClick={handleRadiusClick('full')}
          />
        </VariantGroup>
      </VariantContainer>
    )
  }
}

export const MultipleSelection: Story = {
  render: () => {
    const { selected, handleColorClick, isSelected, clear } = useColorSelection([], 'multiple')

    const colors = basicColors.map(c => ({
      ...c,
      selected: isSelected(c.color)
    }))

    return (
      <VariantContainer>
        <VariantGroup title="Multiple Selection Mode">
          <div className="max-w-lg">
            <div className="flex justify-between items-center mb-100">
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
              selectionMode='multiple'
            />
            <p className="mt-200 text-sm text-fg-secondary">
              Selected: {Array.isArray(selected) && selected.length > 0 ? selected.join(', ') : 'None'}
            </p>
          </div>
        </VariantGroup>
      </VariantContainer>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple selection mode using the useColorSelection hook. Click to toggle colors.'
      }
    }
  }
}

export const EcommerceFilter: Story = {
  render: () => {
    const { selected, handleColorClick, isSelected, clear } = useColorSelection([], 'multiple')

    const colors = ecommerceColors.map(c => ({
      ...c,
      selected: isSelected(c.color)
    }))

    const selectedCount = Array.isArray(selected) ? selected.length : 0

    return (
      <div className="max-w-lg p-200 bg-surface rounded-lg border border-border-primary">
        <div className="flex justify-between items-center mb-150">
          <h3 className="font-semibold text-fg-primary">Color</h3>
          {selectedCount > 0 && (
            <Button
              onClick={clear}
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
          size="md"
          radius="md"
          selectionMode='multiple'
        />
        {selectedCount > 0 && (
          <div className="mt-200 p-100 bg-primary rounded text-sm text-fg-light">
            Filtering by {selectedCount} color{selectedCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete e-commerce filter implementation with product counts and clear functionality.'
      }
    }
  }
}
