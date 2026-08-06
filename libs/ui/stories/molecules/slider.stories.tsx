import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Slider } from "../../src/molecules/slider"
import type { SliderProps } from "../../src/molecules/slider"

const meta: Meta<typeof Slider> = {
  argTypes: {
    defaultValue: {
      control: "object",
      description:
        "Default values of the slider (for uncontrolled component). Example: [25, 75]",
    },
    dir: {
      control: "select",
      description: "Text direction of the slider.",
      options: ["ltr", "rtl"],
      table: { defaultValue: { summary: "ltr" } },
    },
    disabled: {
      control: "boolean",
      description: "Whether the slider is disabled.",
      table: { defaultValue: { summary: "false" } },
    },
    formatRangeText: {
      control: false,
      description: "Function to format the range text display.",
    },
    formatValue: {
      control: false,
      description: "Function to format the displayed value text.",
    },
    helpText: {
      control: "text",
      description: "Help text displayed below the slider.",
    },
    label: {
      control: "text",
      description: "Label text displayed above the slider.",
    },
    markerCount: {
      control: "number",
      description: "Number of markers to display (if showMarkers is true).",
      table: { defaultValue: { summary: "5" } },
    },
    max: {
      control: "number",
      description: "Maximum value of the slider.",
      table: { defaultValue: { summary: "100" } },
    },
    min: {
      control: "number",
      description: "Minimum value of the slider.",
      table: { defaultValue: { summary: "0" } },
    },
    minStepsBetweenThumbs: {
      control: "number",
      description: "Minimum steps required between thumbs.",
      table: { defaultValue: { summary: "0" } },
    },
    onChange: {
      action: "changed",
      description: "Callback when the value changes.",
    },
    onChangeEnd: {
      action: "changeEnded",
      description: "Callback when the value change is committed.",
    },
    orientation: {
      control: "select",
      description: "Orientation of the slider.",
      options: ["horizontal", "vertical"],
      table: { defaultValue: { summary: "horizontal" } },
    },
    origin: {
      control: "select",
      description: "Origin point for the slider range.",
      options: ["start", "center", "end"],
      table: { defaultValue: { summary: "start" } },
    },
    readOnly: {
      control: "boolean",
      description: "Whether the slider is read-only.",
      table: { defaultValue: { summary: "false" } },
    },
    showMarkers: {
      control: "boolean",
      description: "Show step markers on the track.",
      table: { defaultValue: { summary: "false" } },
    },
    showValueText: {
      control: "boolean",
      description: "Show the current values alongside the slider.",
      table: { defaultValue: { summary: "false" } },
    },
    size: {
      control: "select",
      description: "Size of the slider.",
      options: ["sm", "md", "lg"],
      table: { defaultValue: { summary: "md" } },
    },
    step: {
      control: "number",
      description: "Step value for incrementing/decrementing.",
      table: { defaultValue: { summary: "1" } },
    },
    thumbAlignment: {
      control: "select",
      description: "Alignment of slider thumbs relative to the track.",
      options: ["center", "contain"],
      table: { defaultValue: { summary: "center" } },
    },
    validateStatus: {
      control: "select",
      description:
        "Validation status that affects slider styling and help text display.",
      options: ["default", "error", "success", "warning"],
      table: { defaultValue: { summary: "default" } },
    },
    value: {
      control: "object",
      description:
        "Current values of the slider (for controlled component). Example: [20, 80]",
    },
  },
  args: {
    dir: "ltr",
    disabled: false,
    max: 100,
    min: 0,
    orientation: "horizontal",
    origin: "start",
    readOnly: false,
    showMarkers: false,
    showValueText: true,
    size: "md",
    step: 1,
    thumbAlignment: "center",
    validateStatus: "default",
  },
  component: Slider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/Slider",
}

export default meta
type Story = StoryObj<typeof Slider>

const baseSliderProps: Partial<SliderProps> = {
  max: 100,
  min: 0,
  showValueText: true,
  step: 1,
}

export const Playground: Story = {
  args: {
    defaultValue: [20, 80],
    helpText: "Select your desired price range.",
    id: "playground-slider",
    label: "Price Range",
  },
  render: (args) => (
    <div className="min-w-sm h-96">
      <Slider {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    ...Playground.args,
    disabled: true,
    id: "disabled-slider",
  },
}

const WithValidationStory: NonNullable<Story["render"]> = (args) => {
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
}

export const WithValidation: Story = {
  args: {
    ...Playground.args,
    id: "validation-slider",
    label: "Quantity",
  },
  render: WithValidationStory,
}

export const WithMarkers: Story = {
  args: {
    ...baseSliderProps,
    defaultValue: [10, 30],
    formatValue: (value) => `${value}°C`,
    helpText: "Adjust the temperature using the slider with markers.",
    id: "markers-slider",
    label: "Temperature Range (°C)",
    markerCount: 5,
    max: 50,
    min: -20,
    showMarkers: true,
    step: 0.5,
  },
  render: (args) => (
    <div className="min-w-sm">
      <Slider {...args} />
    </div>
  ),
}

const VerticalOrientationStory: NonNullable<Story["render"]> = () => {
  const [values, setValues] = useState<number[]>([70])
  const currentValue = values[0] ?? 0
  const handleChange = (newValues: number[]) => {
    setValues(newValues)
  }
  return (
    <VariantContainer>
      <div className="grid h-96 w-4xl grid-cols-3 gap-600">
        <Slider
          {...baseSliderProps}
          id="vertical-sm"
          orientation="vertical"
          size="sm"
          label="Volume (Small)"
          defaultValue={[20, 80]}
          helpText="Adjust volume"
        />
        <Slider
          {...baseSliderProps}
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
          id="vertical-lg"
          orientation="vertical"
          size="lg"
          label="Contrast (Large)"
          defaultValue={[40, 60]}
          helpText="Set contrast level"
        />
      </div>
    </VariantContainer>
  )
}

export const VerticalOrientation: Story = {
  parameters: {
    layout: "padded",
  },

  render: VerticalOrientationStory,
}

const ControlledStory: NonNullable<Story["render"]> = (args) => {
  const [values, setValues] = useState<number[]>([30, 70])

  const handleChange = (newValues: number[]) => {
    setValues(newValues)
  }

  const handleRandom = () => {
    const randomNumbers = crypto.getRandomValues(new Uint32Array(2))
    const firstRandom = (randomNumbers.at(0) ?? 0) % 100
    const secondRandom = (randomNumbers.at(1) ?? 0) % 100
    const minValue = Math.min(firstRandom, secondRandom)
    const maxValue = Math.max(firstRandom, secondRandom)
    const nextValues = [minValue, maxValue]
    setValues(nextValues)
  }

  return (
    <div className="min-w-sm">
      <Slider {...args} value={values} onChange={handleChange} />
      <div className="mt-400 rounded border bg-overlay p-200">
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
}

export const Controlled: Story = {
  args: {
    ...baseSliderProps,
    helpText: "Values are managed by component state.",
    id: "controlled-slider",
    label: "Controlled Slider",
  },
  render: ControlledStory,
}

const DynamicBoundsControlledStory: NonNullable<Story["render"]> = (args) => {
  const [bounds, setBounds] = useState({ max: 100, min: 0 })
  const [values, setValues] = useState<number[]>([20, 80])

  return (
    <div className="min-w-sm space-y-400">
      <Slider
        {...args}
        min={bounds.min}
        max={bounds.max}
        value={values}
        onChange={setValues}
        helpText={`Bounds: ${bounds.min} - ${bounds.max}`}
      />
      <div className="flex flex-wrap gap-200">
        <Button
          size="sm"
          onClick={() => {
            setBounds({ max: 30, min: 0 })
          }}
        >
          Shrink max to 30
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setBounds({ max: 100, min: 0 })
          }}
        >
          Reset bounds
        </Button>
      </div>
      <div className="rounded border bg-overlay p-200 text-sm">
        <p className="text-fg-secondary">Values (controlled):</p>
        <p className="font-mono">[{values.join(", ")}]</p>
      </div>
    </div>
  )
}

export const DynamicBoundsControlled: Story = {
  args: {
    ...baseSliderProps,
    id: "dynamic-bounds-controlled-slider",
    label: "Dynamic Bounds (Controlled)",
  },
  render: DynamicBoundsControlledStory,
}

export const SingleVsMultiThumb: Story = {
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
        />
        <Slider
          {...baseSliderProps}
          id="triple-thumb"
          label="Triple Thumb (Multi-range)"
          defaultValue={[20, 50, 80]}
          helpText="Three thumbs for complex range selection"
        />
      </div>
    </VariantContainer>
  ),
}

export const Origin: Story = {
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
        />
      </div>
    </VariantContainer>
  ),
}

const MinStepsBetweenThumbsStory: NonNullable<Story["render"]> = () => {
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
        />
      </div>
    </VariantContainer>
  )
}

export const MinStepsBetweenThumbs: Story = {
  render: MinStepsBetweenThumbsStory,
}

export const RTLSupport: Story = {
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
        />
        <Slider
          {...baseSliderProps}
          id="rtl-slider"
          dir="rtl"
          label="RTL Direction (العربية)"
          defaultValue={[20, 80]}
          helpText="Right to left direction"
        />
      </div>
    </VariantContainer>
  ),
}

export const CustomFormatting: Story = {
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
        />
      </div>
    </VariantContainer>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes">
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            size="sm"
            label="Small"
            defaultValue={[25, 75]}
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            size="md"
            label="Medium (default)"
            defaultValue={[30, 70]}
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            size="lg"
            label="Large"
            defaultValue={[35, 65]}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="States">
        <div className="w-lg min-w-xs">
          <Slider {...baseSliderProps} label="Normal" defaultValue={[20, 80]} />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Disabled"
            defaultValue={[20, 80]}
            disabled
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Read-only"
            defaultValue={[20, 80]}
            readOnly
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Error"
            defaultValue={[20, 80]}
            validateStatus="error"
            helpText="Invalid range selected"
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Success"
            defaultValue={[40, 60]}
            validateStatus="success"
            helpText="Perfect range selected!"
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Warning"
            defaultValue={[10, 90]}
            validateStatus="warning"
            helpText="Range is quite wide - consider narrowing it"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Features">
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="With Markers"
            defaultValue={[25, 75]}
            showMarkers
            markerCount={5}
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="With Value Text"
            defaultValue={[30, 70]}
            showValueText
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="With Helper Text"
            defaultValue={[35, 65]}
            helpText="Adjust the range"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Thumb Variations">
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Single Thumb"
            defaultValue={[50]}
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Double Thumb"
            defaultValue={[25, 75]}
          />
        </div>
        <div className="w-lg min-w-xs">
          <Slider
            {...baseSliderProps}
            label="Triple Thumb"
            defaultValue={[20, 50, 80]}
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
