import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { Button } from '../../src/atoms/button'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Label } from '../../src/atoms/label'
import { NumericInput, type NumericInputProps } from '../../src/atoms/numeric-input'

const draftChanged = fn()
const draftCommitted = fn()
const legacyChanged = fn()
const invalidChanged = fn()
const focusChanged = fn()

type PlaygroundArgs = NumericInputProps & {
  showLabel?: boolean
  label?: string
  showControls?: boolean
  showScrubber?: boolean
}

const meta: Meta<typeof NumericInput> = {
  title: 'Atoms/NumericInput',
  component: NumericInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible numeric input component using compound pattern. Provides granular control over layout and behavior through composable subcomponents.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<PlaygroundArgs>

export const Playground: Story = {
  args: {
    min: 0,
    max: 10000,
    step: 0.1,
    disabled: false,
    invalid: false,
    size: 'md',
    locale: 'en-US',
    allowMouseWheel: true,
    clampValueOnBlur: true,
    precision: 1,
    showLabel: false,
    label: 'Quantity',
    showControls: true,
    showScrubber: false,
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the numeric input',
    },
    locale: {
      control: 'select',
      options: ['en-US', 'cs-CZ', 'de-DE', 'fr-FR'],
      description: 'Locale for number formatting (decimal separator)',
    },
    min: { control: 'number', description: 'Minimum allowed value' },
    max: { control: 'number', description: 'Maximum allowed value' },
    step: { control: 'number', description: 'Step increment/decrement value' },
    disabled: { control: 'boolean', description: 'Disable the input' },
    invalid: { control: 'boolean', description: 'Show invalid/error state' },
    allowMouseWheel: { control: 'boolean', description: 'Allow mouse wheel to change value' },
    clampValueOnBlur: { control: 'boolean', description: 'Clamp value to min/max on blur' },
    showLabel: { control: 'boolean', description: 'Show label above the input' },
    label: { control: 'text', description: 'Label text' },
    showControls: { control: 'boolean', description: 'Show increment/decrement buttons' },
    showScrubber: { control: 'boolean', description: 'Enable scrubber overlay' },
  },
  render: function Render(args) {
    const [value, setValue] = useState(50.5)
    const {
      showLabel,
      label,
      showControls,
      showScrubber,
      ...numericArgs
    } = args
    return (
      <div className="w-md flex flex-col gap-50">
        {showLabel && <Label htmlFor="numeric-playground">{label}</Label>}
        <NumericInput
          {...numericArgs}
          id="numeric-playground"
          value={value}
          onChange={setValue}
        >
          <NumericInput.Control>
            {showScrubber && <NumericInput.Scrubber />}
            <NumericInput.Input />
            {showControls && (
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            )}
          </NumericInput.Control>
        </NumericInput>
        <p className="text-fg-muted text-sm mt-100">Current value: {value}</p>
      </div>
    )
  },
}

export const WithLabel: Story = {
  render: () => {
    const [value, setValue] = useState(42)

    return (
      <div className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-with-label">Quantity</Label>
        <NumericInput
          id="numeric-with-label"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>
    )
  },
}

export const AllSizes: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-300">
        <div className="w-md flex flex-col gap-50">
          <Label htmlFor="numeric-sm" size="sm">
            Small (sm)
          </Label>
          <NumericInput id="numeric-sm" size="sm" defaultValue={10}>
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>

        <div className="w-md flex flex-col gap-50">
          <Label htmlFor="numeric-md" size="md">
            Medium (md)
          </Label>
          <NumericInput id="numeric-md" size="md" defaultValue={20}>
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>

        <div className="w-md flex flex-col gap-50">
          <Label htmlFor="numeric-lg" size="lg">
            Large (lg)
          </Label>
          <NumericInput id="numeric-lg" size="lg" defaultValue={30}>
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>
      </div>
    )
  },
}

export const WithoutControls: Story = {
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-no-controls">
          Use arrow keys or mouse wheel
        </Label>
        <NumericInput
          id="numeric-no-controls"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          allowMouseWheel
          size='md'
        >
          <NumericInput.Control>
            <NumericInput.Input />
          </NumericInput.Control>
        </NumericInput>
        <p className="text-fg-muted text-sm mt-50">
          Current value: {value}
        </p>
      </div>
    )
  },
}

export const WithScrubber: Story = {
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-scrubber">
          Drag left/right to change value
        </Label>
        <NumericInput
          id="numeric-scrubber"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          step={5}
        >
          <NumericInput.Control>
            <NumericInput.Scrubber />
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <p className="text-fg-muted text-sm mt-50">
          Current value: {value}
        </p>
      </div>
    )
  },
}

export const MinMax: Story = {
  render: () => {
    const [value, setValue] = useState(5)

    return (
      <div className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-minmax">
          Range: 0-10 (clamped on blur)
        </Label>
        <NumericInput
          id="numeric-minmax"
          value={value}
          onChange={setValue}
          min={0}
          max={10}
          step={1}
          clampValueOnBlur
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <p className="text-fg-muted text-sm mt-50">
          Try typing a value outside the range and blur the input
        </p>
      </div>
    )
  },
}

export const InvalidState: Story = {
  render: () => {
    const [value, setValue] = useState(150)
    const isInvalid = value < 0 || value > 100

    return (
      <div className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-invalid">Valid range: 0-100</Label>
        <NumericInput
          id="numeric-invalid"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          invalid={isInvalid}
          allowOverflow
          clampValueOnBlur={false}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        {isInvalid && (
          <p className="text-fg-danger text-sm mt-50">
            Value must be between 0 and 100
          </p>
        )}
      </div>
    )
  },
}

export const WithPrecision: Story = {
  render: () => {
    const [value, setValue] = useState(3.14)

    return (
      <div lang='cs' className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-precision">
          Pi approximation (2 decimals)
        </Label>
        <NumericInput
          id="numeric-precision"
          value={value}
          onChange={setValue}
          min={0}
          max={10}
          step={0.01}
          precision={2}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <p className="text-fg-muted text-sm mt-50">
          Current value: {value}
        </p>
      </div>
    )
  },
}

export const CustomLayoutHorizontal: Story = {
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-custom-h">Custom Layout</Label>
        <NumericInput
          id="numeric-custom-h"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
        >
          <div className="flex gap-50">
            <NumericInput.DecrementTrigger className='bg-overlay' icon='icon-[mdi--minus]'/>
            <NumericInput.Control className="flex-1">
              <NumericInput.Input />
            </NumericInput.Control>
            <NumericInput.IncrementTrigger className='bg-overlay' icon='icon-[mdi--plus]'/>
          </div>
        </NumericInput>
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => {
    return (
      <div className="w-md flex flex-col gap-50">
        <Label htmlFor="numeric-disabled">Disabled Input</Label>
        <NumericInput id="numeric-disabled" defaultValue={42} disabled>
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>
    )
  },
}

export const CustomButtonProps: Story = {
  render: () => {
    const [value1, setValue1] = useState(10)
    const [value3, setValue3] = useState(30)

    return (
      <div className="flex flex-col gap-300">
        <div className="w-md flex flex-col gap-50">
          <Label htmlFor="numeric-variant">Different Variants</Label>
          <NumericInput
            id="numeric-variant"
            value={value1}
            onChange={setValue1}
            min={0}
            max={100}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger variant="primary" />
                <NumericInput.DecrementTrigger variant="danger" />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>

        <div className="w-md flex flex-col gap-50">
          <Label htmlFor="numeric-size">Different Themes</Label>
          <NumericInput
            id="numeric-size"
            value={value3}
            onChange={setValue3}
            min={0}
            max={100}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger variant='primary' theme='solid' />
                <NumericInput.DecrementTrigger variant='danger' theme='solid' />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>
      </div>
    )
  },
}


export const ControlledDraft: Story = {
	render: function Render() {
		const [value, setValue] = useState("2")
		const [committedValue, setCommittedValue] = useState("")
		return (
			<div className="w-md max-w-full flex flex-col gap-100">
				<Label htmlFor="numeric-controlled-draft">Draft quantity</Label>
				<NumericInput
					id="numeric-controlled-draft"
					value={value}
					min={0}
					max={10}
					clampValueOnBlur={false}
					allowOverflow={false}
					onValueChange={(details) => {
						setValue(details.value)
						draftChanged(details)
					}}
					onValueCommit={(details) => {
						setCommittedValue(details.value)
						draftCommitted(details)
					}}
				>
					<NumericInput.Control>
						<NumericInput.Input />
						<NumericInput.TriggerContainer>
							<NumericInput.IncrementTrigger />
							<NumericInput.DecrementTrigger />
						</NumericInput.TriggerContainer>
					</NumericInput.Control>
				</NumericInput>
				<p data-testid="draft-value">
					Draft: {value === "" ? "(empty)" : value}
				</p>
				<p data-testid="committed-value">Committed: {committedValue}</p>
				<Button onClick={() => setValue("7")}>Set parent value to 7</Button>
			</div>
		)
	},
}

export const CallbackCompatibility: Story = {
	render: function Render() {
		const [draft, setDraft] = useState("2")
		const [numeric, setNumeric] = useState<number>(2)
		const [counts, setCounts] = useState({
			numeric: 0,
			change: 0,
			commit: 0,
			invalid: 0,
			focus: 0,
		})
		const record = (key: keyof typeof counts) =>
			setCounts((previous) => ({ ...previous, [key]: previous[key] + 1 }))
		return (
			<div className="w-md max-w-full flex flex-col gap-100">
				<form
					id="numeric-callback-form"
					onSubmit={(event) => event.preventDefault()}
				>
					<Label htmlFor="numeric-callback">Callback quantity</Label>
					<NumericInput
						id="numeric-callback"
						name="callbackQuantity"
						form="numeric-callback-form"
						value={draft}
						min={0}
						max={10}
						translations={{
							incrementLabel: "Increase callback quantity",
							decrementLabel: "Decrease callback quantity",
						}}
						onChange={(next) => {
							setNumeric(next)
							record("numeric")
							legacyChanged(next)
						}}
						onValueChange={(details) => {
							setDraft(details.value)
							record("change")
							draftChanged(details)
						}}
						onValueCommit={(details) => {
							record("commit")
							draftCommitted(details)
						}}
						onValueInvalid={(details) => {
							record("invalid")
							invalidChanged(details)
						}}
						onFocusChange={(details) => {
							record("focus")
							focusChanged(details)
						}}
					>
						<NumericInput.Control>
							<NumericInput.Input />
							<NumericInput.TriggerContainer>
								<NumericInput.IncrementTrigger />
								<NumericInput.DecrementTrigger />
							</NumericInput.TriggerContainer>
						</NumericInput.Control>
					</NumericInput>
				</form>
				<p data-testid="draft-value">
					Draft: {draft === "" ? "(empty)" : draft}
				</p>
				<p data-testid="numeric-value">Numeric: {String(numeric)}</p>
				<p data-testid="callback-counts">{JSON.stringify(counts)}</p>
				<Button theme="outlined" onClick={() => setDraft("2")}>
					Reset parent value
				</Button>
			</div>
		)
	},
}

export const UncontrolledDefaults: Story = {
	render: () => (
		<VariantContainer>
			<VariantGroup title="Legacy numeric default" fullWidth>
				<Label htmlFor="numeric-default-number">Numeric default quantity</Label>
				<NumericInput
					id="numeric-default-number"
					defaultValue={2}
					min={0}
					max={10}
					onChange={legacyChanged}
				>
					<NumericInput.Control>
						<NumericInput.Input />
						<NumericInput.TriggerContainer>
							<NumericInput.IncrementTrigger />
							<NumericInput.DecrementTrigger />
						</NumericInput.TriggerContainer>
					</NumericInput.Control>
				</NumericInput>
			</VariantGroup>
			<VariantGroup title="String default" fullWidth>
				<Label htmlFor="numeric-default-string">String default quantity</Label>
				<NumericInput
					id="numeric-default-string"
					defaultValue="2"
					min={0}
					max={10}
					onValueChange={draftChanged}
					clampValueOnBlur={false}
				>
					<NumericInput.Control>
						<NumericInput.Input />
						<NumericInput.TriggerContainer>
							<NumericInput.IncrementTrigger />
							<NumericInput.DecrementTrigger />
						</NumericInput.TriggerContainer>
					</NumericInput.Control>
				</NumericInput>
			</VariantGroup>
		</VariantContainer>
	),
}


export const ExplicitUndefinedDefaults: Story = {
  render: () => (
    <div className="w-md max-w-full flex flex-col gap-100">
      <Label htmlFor="numeric-undefined-defaults">Undefined defaults quantity</Label>
      <NumericInput
        id="numeric-undefined-defaults"
        defaultValue={2}
        min={0}
        max={10}
        locale="en-US"
        formatOptions={{ style: 'percent' }}
        step={undefined}
        allowMouseWheel={undefined}
        clampValueOnBlur={undefined}
        spinOnPress={undefined}
        allowOverflow
        onChange={legacyChanged}
      >
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>
      <p>Arrow keys and the wheel use the default step. Typed overflow clamps on blur.</p>
    </div>
  ),
}
