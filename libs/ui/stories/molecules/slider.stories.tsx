import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Slider, type SliderProps } from "../../src/molecules/slider"

const meta: Meta<typeof Slider> = {
  title: "Molecules/Slider",
  component: Slider,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A keyboard-accessible single-value or multi-thumb range control for approximate numeric choices. Use for budgets, thresholds and ranges; use NumericInput or QuantityField when users need an exact typed value. Each thumb can have its own accessible name.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "object",
      description:
        "Current values of the slider (for controlled component). Example: [20, 80]",
    },
    defaultValue: {
      control: "object",
      description:
        "Default values of the slider (for uncontrolled component). Example: [25, 75]",
    },
    min: {
      control: "number",
      description: "Minimum value of the slider.",
      table: { defaultValue: { summary: "0" } },
    },
    max: {
      control: "number",
      description: "Maximum value of the slider.",
      table: { defaultValue: { summary: "100" } },
    },
    step: {
      control: "number",
      description: "Step value for incrementing/decrementing.",
      table: { defaultValue: { summary: "1" } },
    },
    minStepsBetweenThumbs: {
      control: "number",
      description: "Minimum steps required between thumbs.",
      table: { defaultValue: { summary: "0" } },
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Orientation of the slider.",
      table: { defaultValue: { summary: "horizontal" } },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the slider.",
      table: { defaultValue: { summary: "md" } },
    },
    disabled: {
      control: "boolean",
      description: "Whether the slider is disabled.",
      table: { defaultValue: { summary: "false" } },
    },
    readOnly: {
      control: "boolean",
      description: "Whether the slider is read-only.",
      table: { defaultValue: { summary: "false" } },
    },
    showValueText: {
      control: "boolean",
      description: "Show the current values alongside the slider.",
      table: { defaultValue: { summary: "false" } },
    },
    getAriaValueText: {
      control: false,
      description:
        "Per-thumb spoken value formatter; defaults to formatValue. Numeric aria-valuenow is preserved.",
    },
    "aria-label": {
      control: "object",
      description:
        "Distinct contextual names for every thumb, including when label is present.",
    },
    formatValue: {
      control: false,
      description: "Function to format the displayed value text.",
    },
    showMarkers: {
      control: "boolean",
      description: "Show step markers on the track.",
      table: { defaultValue: { summary: "false" } },
    },
    markerCount: {
      control: "number",
      description: "Number of markers to display (if showMarkers is true).",
      table: { defaultValue: { summary: "5" } },
    },
    label: {
      control: "text",
      description: "Label text displayed above the slider.",
    },
    validateStatus: {
      control: "select",
      options: ["default", "error", "success", "warning"],
      description:
        "Validation status that affects slider styling and help text display.",
      table: { defaultValue: { summary: "default" } },
    },
    helpText: {
      control: "text",
      description: "Help text displayed below the slider.",
    },
    origin: {
      control: "select",
      options: ["start", "center", "end"],
      description: "Origin point for the slider range.",
      table: { defaultValue: { summary: "start" } },
    },
    thumbAlignment: {
      control: "select",
      options: ["center", "contain"],
      description: "Alignment of slider thumbs relative to the track.",
      table: { defaultValue: { summary: "center" } },
    },
    dir: {
      control: "select",
      options: ["ltr", "rtl"],
      description: "Text direction of the slider.",
      table: { defaultValue: { summary: "ltr" } },
    },
    formatRangeText: {
      control: false,
      description: "Function to format the range text display.",
    },
    onChange: {
      action: "changed",
      description: "Callback when the value changes.",
    },
    onChangeEnd: {
      action: "changeEnded",
      description: "Callback when the value change is committed.",
    },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    orientation: "horizontal",
    size: "md",
    disabled: false,
    readOnly: false,
    showValueText: true,
    showMarkers: false,
    validateStatus: "default",
    origin: "start",
    thumbAlignment: "center",
    dir: "ltr",
  },
}

export default meta
type Story = StoryObj<typeof Slider>

const baseSliderProps: Partial<SliderProps> = {
  min: 0,
  max: 100,
  step: 1,
  showValueText: true,
  "aria-label": ["Lower range value", "Upper range value"],
}

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Try the live controls and change the available options to find the right configuration for your form.",
      },
    },
  },
  args: {
    id: "playground-slider",
    label: "Price Range",
    defaultValue: [20, 80],
    "aria-label": ["Minimum price", "Maximum price"],
    helpText: "Select your desired price range.",
  },
  render: (args) => (
    <div className="w-full max-w-sm">
      <Slider {...args} />
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
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          fullWidth
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
        >
          <div className="w-full max-w-sm">
            <Slider
              {...args}
              id={undefined}
              size={size}
              label="Project budget"
              defaultValue={[25, 75]}
              showValueText
              helpText="Choose your preferred budget range."
              aria-label={["Project budget minimum", "Project budget maximum"]}
            />
          </div>
        </VariantGroup>
      ))}
    </VariantContainer>
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
    ...Playground.args,
    id: "disabled-slider",
    disabled: true,
  },
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
  args: {
    ...Playground.args,
    id: "readonly-slider",
    readOnly: true,
    defaultValue: [25],
    showValueText: true,
  },
  render: (args) => (
    <div className="w-full max-w-sm">
      <Slider {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const thumb = canvas.getByRole("slider")
    await userEvent.click(thumb)
    await userEvent.keyboard("{ArrowRight}{End}{Home}")
    await expect(thumb).toHaveAttribute("aria-valuenow", "25")
    await expect(thumb).toHaveAttribute("aria-readonly", "true")
    await expect(thumb).toHaveFocus()
  },
}

export const FeedbackAssociation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An invalid single-value slider exposes its current value and links each thumb to the visible error message.",
      },
    },
  },
  args: {
    label: "Project budget",
    defaultValue: [25],
    showValueText: true,
    validateStatus: "error",
    helpText: "Choose a budget of at least 50 before continuing.",
    showMarkers: true,
  },
  render: (args) => (
    <div className="w-full max-w-sm">
      <Slider {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const thumb = canvas.getByRole("slider")
    await expect(thumb).toHaveAttribute("aria-invalid", "true")
    await expect(thumb).toHaveAccessibleDescription(
      "Choose a budget of at least 50 before continuing."
    )
    await expect(thumb.getAttribute("aria-errormessage")).toBeTruthy()
    await expect(canvas.getByRole("status")).toHaveTextContent("25")
  },
}

export const WithValidation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Move the slider to compare actionable error feedback with successful validation.",
      },
    },
  },
  args: {
    ...Playground.args,
    id: "validation-slider",
    label: "Quantity",
  },
  render: (args) => {
    const [value, setValue] = useState([30])
    const currentValue = value[0] ?? 0

    return (
      <div className="max-w-sm">
        <Slider
          {...args}
          value={value}
          validateStatus={currentValue < 50 ? "error" : "success"}
          helpText={
            currentValue < 50
              ? "The selected value must be at least 50."
              : "Great! Value is within acceptable range."
          }
          onChange={setValue}
        />
      </div>
    )
  },
}

export const WithMarkers: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Tick labels reserve their own space so the scale and helper text remain readable together.",
      },
    },
  },
  args: {
    ...baseSliderProps,
    id: "markers-slider",
    label: "Temperature Range (°C)",
    defaultValue: [10, 30],
    min: -20,
    max: 50,
    step: 0.5,
    showMarkers: true,
    markerCount: 5,
    helpText: "Adjust the temperature using the slider with markers.",
    formatValue: (value) => `${value}°C`,
  },
  render: (args) => (
    <div className="w-full max-w-sm">
      <Slider {...args} />
    </div>
  ),
}

export const VerticalOrientation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Vertical tracks provide a compact adjustment axis while retaining named, keyboard-operable thumbs.",
      },
    },
    layout: "padded",
  },

  render: () => {
    const [values, setValues] = useState<number[]>([70])
    const currentValue = values[0] ?? 0
    const handleChange = (newValues: number[]) => {
      setValues(newValues)
    }
    return (
      <VariantContainer>
        <div className="grid w-full max-w-4xl grid-cols-1 gap-600 sm:grid-cols-3">
          <Slider
            {...baseSliderProps}
            className="data-[orientation=vertical]:h-96"
            id="vertical-sm"
            orientation="vertical"
            size="sm"
            label="Volume (Small)"
            defaultValue={[20, 80]}
            helpText="Adjust volume"
            aria-label={["Volume (Small) minimum", "Volume (Small) maximum"]}
          />
          <Slider
            {...baseSliderProps}
            className="data-[orientation=vertical]:h-96"
            id="vertical-md"
            orientation="vertical"
            size="md"
            label="Brightness (Medium)"
            showMarkers
            markerCount={5}
            value={values}
            onChange={handleChange}
            validateStatus={currentValue > 50 ? "warning" : "default"}
            helpText={
              currentValue > 50
                ? "Brightness is getting high - consider reducing it"
                : "Current brightness level is fine"
            }
          />
          <Slider
            {...baseSliderProps}
            className="data-[orientation=vertical]:h-96"
            id="vertical-lg"
            orientation="vertical"
            size="lg"
            label="Contrast (Large)"
            defaultValue={[40, 60]}
            helpText="Set contrast level"
            aria-label={[
              "Contrast (Large) minimum",
              "Contrast (Large) maximum",
            ]}
          />
        </div>
      </VariantContainer>
    )
  },
}

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Application-owned state stays in sync with user changes and authoritative updates from the parent.",
      },
    },
  },
  args: {
    ...baseSliderProps,
    id: "controlled-slider",
    label: "Controlled Slider",
    helpText: "Values are managed by component state.",
  },
  render: (args) => {
    const [values, setValues] = useState<number[]>([30, 70])

    const handleChange = (newValues: number[]) => {
      setValues(newValues)
    }

    const handleRandom = () => {
      const firstRandom = Math.floor(Math.random() * 100)
      const secondRandomNumber = Math.floor(Math.random() * 100)
      const minValue = Math.min(firstRandom, secondRandomNumber)
      const maxValue = Math.max(firstRandom, secondRandomNumber)

      const values = [minValue, maxValue]
      setValues(values)
    }

    return (
      <div className="w-full max-w-sm">
        <Slider {...args} value={values} onChange={handleChange} />
        <div className="mt-400 rounded border bg-surface-secondary p-200">
          <p className="text-fg-secondary text-sm">Component State:</p>
          <p className="font-mono text-lg">[{values.join(", ")}]</p>
          <div>
            <Button size="sm" onClick={handleRandom}>
              Random
            </Button>
          </div>
        </div>
      </div>
    )
  },
}

export const DynamicBoundsControlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Changing bounds normalizes controlled values so each thumb remains inside the permitted range.",
      },
    },
  },
  args: {
    ...baseSliderProps,
    id: "dynamic-bounds-controlled-slider",
    label: "Dynamic Bounds (Controlled)",
  },
  render: (args) => {
    const [bounds, setBounds] = useState({ min: 0, max: 100 })
    const [values, setValues] = useState<number[]>([20, 80])

    return (
      <div className="w-full max-w-sm space-y-400">
        <Slider
          {...args}
          min={bounds.min}
          max={bounds.max}
          value={values}
          onChange={setValues}
          helpText={`Bounds: ${bounds.min} - ${bounds.max}`}
        />
        <div className="flex flex-wrap gap-200">
          <Button size="sm" onClick={() => setBounds({ min: 0, max: 30 })}>
            Shrink max to 30
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setBounds({ min: 0, max: 100 })}
          >
            Reset bounds
          </Button>
        </div>
        <div className="rounded border bg-surface-secondary p-200 text-sm">
          <p className="text-fg-secondary">Values (controlled):</p>
          <p className="font-mono">[{values.join(", ")}]</p>
        </div>
      </div>
    )
  },
}

export const SingleVsMultiThumb: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Single, double and triple thumbs display every current value rather than assuming a two-value range.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="grid w-full min-w-xs gap-600">
        <Slider
          {...baseSliderProps}
          id="single-thumb"
          label="Single Thumb (Volume)"
          defaultValue={[50]}
          helpText="One thumb for single value selection"
        />
        <Slider
          {...baseSliderProps}
          id="double-thumb"
          label="Double Thumb (Range)"
          defaultValue={[25, 75]}
          helpText="Two thumbs for range selection"
          aria-label={[
            "Double Thumb (Range) minimum",
            "Double Thumb (Range) maximum",
          ]}
        />
        <Slider
          {...baseSliderProps}
          id="triple-thumb"
          label="Triple Thumb (Multi-range)"
          defaultValue={[20, 50, 80]}
          helpText="Three thumbs for complex range selection"
          aria-label={[
            "Triple Thumb (Multi-range) minimum",
            "Triple Thumb (Multi-range) middle threshold",
            "Triple Thumb (Multi-range) maximum",
          ]}
        />
      </div>
    </VariantContainer>
  ),
}

export const Origin: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Start, center and end origins change which part of a track represents the selected amount.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="grid w-full min-w-xs gap-600">
        <Slider
          {...baseSliderProps}
          id="origin-start"
          origin="start"
          label="Origin: Start"
          defaultValue={[50]}
          helpText="Range starts from the beginning"
        />
        <Slider
          {...baseSliderProps}
          id="origin-center"
          origin="center"
          label="Origin: Center"
          defaultValue={[50]}
          helpText="Range starts from the center"
        />
        <Slider
          {...baseSliderProps}
          id="origin-end"
          origin="end"
          label="Origin: End"
          defaultValue={[50]}
          helpText="Range starts from the end"
        />
      </div>
    </VariantContainer>
  ),
}

export const ThumbAlignment: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare contained and centered thumbs when aligning track endpoints with surrounding content.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="grid w-full min-w-xs gap-600">
        <Slider
          {...baseSliderProps}
          id="alignment-center"
          thumbAlignment="center"
          showMarkers
          markerCount={5}
          label="Thumb Alignment: Center (default)"
          defaultValue={[25, 75]}
          helpText="Thumbs can go to track edges"
          aria-label={[
            "Thumb Alignment: Center (default) minimum",
            "Thumb Alignment: Center (default) maximum",
          ]}
        />
        <Slider
          {...baseSliderProps}
          id="alignment-contain"
          thumbAlignment="contain"
          showMarkers
          markerCount={5}
          label="Thumb Alignment: Contain"
          defaultValue={[25, 75]}
          helpText="Thumbs stay within track bounds"
          aria-label={[
            "Thumb Alignment: Contain minimum",
            "Thumb Alignment: Contain maximum",
          ]}
        />
      </div>
    </VariantContainer>
  ),
}

export const MinStepsBetweenThumbs: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A minimum step gap keeps range endpoints apart while preserving keyboard adjustment at either end.",
      },
    },
  },
  render: () => {
    const [values, setValues] = useState<number[]>([30, 70])
    const [minValue = 0, maxValue = minValue] = values

    return (
      <VariantContainer>
        <div className="grid w-full min-w-xs gap-600">
          <Slider
            {...baseSliderProps}
            id="no-min-steps"
            label="No Minimum Steps"
            defaultValue={[45, 55]}
            minStepsBetweenThumbs={0}
            helpText="Thumbs can touch each other"
            aria-label={[
              "No Minimum Steps minimum",
              "No Minimum Steps maximum",
            ]}
          />
          <Slider
            {...baseSliderProps}
            id="min-steps-10"
            label="Minimum 10 Steps Between Thumbs"
            value={values}
            onChange={setValues}
            minStepsBetweenThumbs={10}
            helpText={`Current gap: ${maxValue - minValue} units (min: 10)`}
          />
          <Slider
            {...baseSliderProps}
            id="min-steps-20"
            label="Minimum 20 Steps Between Thumbs"
            defaultValue={[20, 80]}
            minStepsBetweenThumbs={20}
            helpText="Enforces 20 unit minimum gap"
            aria-label={[
              "Minimum 20 Steps Between Thumbs minimum",
              "Minimum 20 Steps Between Thumbs maximum",
            ]}
          />
        </div>
      </VariantContainer>
    )
  },
}

export const RTLSupport: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Right-to-left layout mirrors the track direction without losing the current value or accessible label.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="grid w-full min-w-xs gap-600">
        <Slider
          {...baseSliderProps}
          id="ltr-slider"
          dir="ltr"
          label="LTR Direction (English)"
          defaultValue={[20, 80]}
          helpText="Left to right direction"
          aria-label={[
            "LTR Direction (English) minimum",
            "LTR Direction (English) maximum",
          ]}
        />
        <Slider
          {...baseSliderProps}
          id="rtl-slider"
          dir="rtl"
          label="RTL Direction (العربية)"
          defaultValue={[20, 80]}
          helpText="Right to left direction"
          aria-label={[
            "RTL Direction (العربية) minimum",
            "RTL Direction (العربية) maximum",
          ]}
        />
      </div>
    </VariantContainer>
  ),
}

export const CustomFormatting: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Localized units and range summaries make raw numeric values meaningful for budgets and discounts.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="grid w-full min-w-xs gap-600">
        <Slider
          {...baseSliderProps}
          id="currency-slider"
          label="Price Range"
          min={0}
          max={1000}
          step={50}
          defaultValue={[200, 800]}
          formatValue={(v) => `$${v}`}
          formatRangeText={([start = 0, end = start]) =>
            `Budget: $${start} - $${end}`
          }
          helpText="Select your price range"
          aria-label={["Price Range minimum", "Price Range maximum"]}
        />
        <Slider
          {...baseSliderProps}
          id="time-slider"
          label="Working Hours"
          min={0}
          max={24}
          step={1}
          defaultValue={[9, 17]}
          formatValue={(v) => `${v}:00`}
          formatRangeText={([start = 0, end = start]) =>
            `${start}:00 - ${end}:00`
          }
          helpText="Select working hours"
          aria-label={["Working Hours minimum", "Working Hours maximum"]}
        />
        <Slider
          {...baseSliderProps}
          id="percentage-slider"
          label="Discount Range"
          min={0}
          max={100}
          step={5}
          defaultValue={[10, 50]}
          formatValue={(v) => `${v}%`}
          formatRangeText={([start = 0, end = start]) =>
            `${start}% to ${end}% off`
          }
          helpText="Set discount percentage range"
          aria-label={["Discount Range minimum", "Discount Range maximum"]}
        />
      </div>
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sliders = canvas.getAllByRole("slider")
    const expected = ["$200", "$800", "9:00", "17:00", "10%", "50%"]
    for (const [index, slider] of sliders.entries())
      await expect(slider).toHaveAttribute("aria-valuetext", expected[index])
    sliders[0]?.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(sliders[0]).toHaveAttribute("aria-valuetext", "$250")
  },
}

export const AllVariants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare interaction states and useful slider features without repeating the canonical size matrix.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="States">
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Normal"
            defaultValue={[20, 80]}
            aria-label={["Normal minimum", "Normal maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Disabled"
            defaultValue={[20, 80]}
            disabled
            aria-label={["Disabled minimum", "Disabled maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Read-only"
            defaultValue={[20, 80]}
            readOnly
            aria-label={["Read-only minimum", "Read-only maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Error"
            defaultValue={[20, 80]}
            validateStatus="error"
            helpText="Invalid range selected"
            aria-label={["Error minimum", "Error maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Success"
            defaultValue={[40, 60]}
            validateStatus="success"
            helpText="Perfect range selected!"
            aria-label={["Success minimum", "Success maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Warning"
            defaultValue={[10, 90]}
            validateStatus="warning"
            helpText="Range is quite wide - consider narrowing it"
            aria-label={["Warning minimum", "Warning maximum"]}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Features">
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="With Markers"
            defaultValue={[25, 75]}
            showMarkers
            markerCount={5}
            aria-label={["With Markers minimum", "With Markers maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="With Value Text"
            defaultValue={[30, 70]}
            showValueText
            aria-label={["With Value Text minimum", "With Value Text maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="With Helper Text"
            defaultValue={[35, 65]}
            helpText="Adjust the range"
            aria-label={[
              "With Helper Text minimum",
              "With Helper Text maximum",
            ]}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Thumb Variations">
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Single Thumb"
            defaultValue={[50]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Double Thumb"
            defaultValue={[25, 75]}
            aria-label={["Double Thumb minimum", "Double Thumb maximum"]}
          />
        </div>
        <div className="w-full max-w-lg">
          <Slider
            {...baseSliderProps}
            label="Triple Thumb"
            defaultValue={[20, 50, 80]}
            aria-label={[
              "Triple Thumb minimum",
              "Triple Thumb middle threshold",
              "Triple Thumb maximum",
            ]}
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

function PrecisionExample() {
  const [value, setValue] = useState([1.5])
  return (
    <form
      className="flex max-w-md flex-col gap-300"
      aria-label="Precision form"
    >
      <Slider
        name="offset"
        label="Fractional minimum"
        min={0.5}
        max={5.5}
        step={1}
        value={value}
        onChange={setValue}
        showValueText
      />
      <Slider
        name="tiny"
        label="Small step"
        min={0}
        max={0.000001}
        step={0.0000001}
        defaultValue={[0.0000005]}
        showValueText
        formatValue={(value) => `${value} metres`}
      />
      <Slider
        name="negative"
        label="Negative range"
        aria-label={["Lower negative threshold", "Upper negative threshold"]}
        min={-2.5}
        max={2.5}
        step={1}
        defaultValue={[-1.5, 1.5]}
        showValueText
      />
    </form>
  )
}
export const Precision: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Fractional minima, negative offsets and exponent-form steps retain the same values in text, ARIA, callbacks and form submission.",
      },
    },
  },
  render: () => <PrecisionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", {
      name: "Precision form",
    }) as HTMLFormElement
    const offset = canvas.getByRole("slider", { name: "Fractional minimum" })
    await expect(offset).toHaveAttribute("aria-valuenow", "1.5")
    await expect(
      canvas.getByRole("slider", { name: "Small step" })
    ).toHaveAttribute("aria-valuenow", "5e-7")
    await expect(new FormData(form).get("offset")).toBe("1.5")
    offset.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(offset).toHaveAttribute("aria-valuenow", "2.5")
    await expect(new FormData(form).get("offset")).toBe("2.5")
    await expect(
      canvas.getByRole("slider", { name: "Small step" })
    ).toHaveAttribute("aria-valuetext", "5e-7 metres")
  },
}

function NativeFieldsetExample() {
  const [disabled, setDisabled] = useState(true)
  return (
    <form className="flex w-full max-w-md flex-col gap-300" aria-label="Native slider form">
      <fieldset disabled={disabled}>
        <legend>
          <Slider name="legend" label="Legend exception" defaultValue={[25]} />
        </legend>
        <fieldset>
          <legend>Nested group</legend>
          <Slider name="nested" label="Nested disabled slider" defaultValue={[25]} />
        </fieldset>
      </fieldset>
      <Button type="button" onClick={() => setDisabled((value) => !value)}>
        Toggle slider fieldset
      </Button>
    </form>
  )
}

export const NativeFieldset: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story: "Native fieldset semantics include disabled ancestors, the first legend exemption, and reversible dynamic changes.",
      },
    },
  },
  render: () => <NativeFieldsetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Native slider form" }) as HTMLFormElement
    const legend = canvas.getByRole("slider", { name: "Legend exception" })
    const nested = canvas.getByRole("slider", { name: "Nested disabled slider" })
    await expect(legend).toHaveAttribute("tabindex", "0")
    await expect(legend).not.toHaveAttribute("aria-disabled", "true")
    await waitFor(() => expect(nested).not.toHaveAttribute("tabindex", "0"))
    await expect(nested).toHaveAttribute("aria-disabled", "true")
    await expect(new FormData(form).get("nested")).toBeNull()
    legend.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(legend).toHaveAttribute("aria-valuenow", "26")
    nested.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(nested).toHaveAttribute("aria-valuenow", "25")
    await userEvent.click(canvas.getByRole("button", { name: "Toggle slider fieldset" }))
    await waitFor(() => expect(nested).toHaveAttribute("tabindex", "0"))
    nested.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(nested).toHaveAttribute("aria-valuenow", "26")
    await expect(new FormData(form).get("nested")).toBe("26")
    await userEvent.click(canvas.getByRole("button", { name: "Toggle slider fieldset" }))
    await waitFor(() => expect(nested).not.toHaveAttribute("tabindex", "0"))
    nested.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(nested).toHaveAttribute("aria-valuenow", "26")
    await expect(new FormData(form).get("nested")).toBeNull()
  },
}
