import type { Meta, StoryObj } from "@storybook/react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Meter, type MeterSeverity } from "../../src/atoms/meter"

const SEVERITIES: MeterSeverity[] = [
  "primary",
  "secondary",
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
]

const meta = {
  title: "Atoms/Meter",
  component: Meter,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A horizontal ratio bar for dashboards: occupancy, order progress, budget use. It shows a known share of a known maximum; give it a name with aria-label or aria-labelledby and print the number next to it. Use segments for a stacked bar of two or more parts.",
      },
    },
  },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
    max: { control: "number", description: "Upper bound. Default 100." },
    severity: {
      control: "select",
      options: SEVERITIES,
      table: { defaultValue: { summary: "primary" } },
    },
    size: {
      control: "inline-radio",
      options: ["sm", "md"],
      table: { defaultValue: { summary: "sm" } },
    },
    segments: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: {
    "aria-label": "Warehouse occupancy",
    value: 64,
    max: 100,
    severity: "primary",
    size: "sm",
  },
} satisfies Meta<typeof Meter>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div className="w-md max-w-full">
      <Meter {...args} />
    </div>
  ),
}

export const Severities: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Severity">
        {SEVERITIES.map((severity, index) => (
          <div className="flex w-md max-w-full flex-col gap-100" key={severity}>
            <span className="text-fg-secondary text-sm" id={`meter-${severity}`}>
              {severity}
            </span>
            <Meter
              aria-labelledby={`meter-${severity}`}
              severity={severity}
              value={30 + index * 10}
            />
          </div>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Size">
        <div className="w-md max-w-full">
          <Meter aria-label="Small meter" size="sm" value={48} />
        </div>
        <div className="w-md max-w-full">
          <Meter aria-label="Medium meter" size="md" value={48} />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Segments: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Budget use split into spent and committed money; the meter's value is the sum of the parts.",
      },
    },
  },
  render: () => (
    <div className="flex w-md max-w-full flex-col gap-100">
      <span className="text-fg-secondary text-sm" id="meter-budget">
        Budget: €6,200 spent, €1,800 committed of €10,000
      </span>
      <Meter
        aria-labelledby="meter-budget"
        max={10_000}
        segments={[
          { value: 6200, severity: "primary" },
          { value: 1800, severity: "warning" },
        ]}
        size="md"
      />
    </div>
  ),
}
