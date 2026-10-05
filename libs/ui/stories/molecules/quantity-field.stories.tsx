import type { Meta, StoryObj } from "@storybook/react"
import { useRef, useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
	QuantityField,
	type QuantityFieldProps,
} from "../../src/molecules/quantity-field"

const changed = fn()
const committed = fn()
const meta: Meta<typeof QuantityField> = {
	title: "Molecules/QuantityField",
	component: QuantityField,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Controlled quantity composition with a linked unit, helper and error text. Applications own validation and saving. Empty and rejected drafts remain editable; pending blocks editing and requires a localized status label. Typed values outside supplied bounds are retained while step controls respect those bounds.",
			},
		},
	},
	args: {
		label: "Quantity",
		unitLabel: "pieces",
		value: "2",
		min: 0,
		max: 10,
		step: 1,
		helperText: "Choose the quantity to order.",
		pendingLabel: "Updating quantity",
		onValueChange: changed,
		onValueCommit: committed,
	},
	argTypes: {
		label: { control: "text" },
		unitLabel: { control: "text" },
		helperText: { control: "text" },
		error: { control: "text" },
		size: { control: "select", options: ["sm", "md", "lg"] },
		min: { control: "number" },
		max: { control: "number" },
		step: { control: "number" },
		pending: { control: "boolean" },
		pendingLabel: { control: "text" },
		disabled: { control: "boolean" },
		readOnly: { control: "boolean" },
		hideLabel: { control: "boolean" },
		locale: { control: "select", options: ["en-US", "cs-CZ"] },
		value: { control: false },
		id: { control: false },
		name: { control: false },
		ref: { control: false },
		onValueChange: { control: false },
		onValueCommit: { control: false },
	},
}
export default meta
type Story = StoryObj<typeof QuantityField>

function ControlledField(args: QuantityFieldProps) {
	const [value, setValue] = useState(args.value)
	return (
		<QuantityField
			{...args}
			value={value}
			onValueChange={(details) => {
				setValue(details.value)
				args.onValueChange?.(details)
			}}
		/>
	)
}

export const Playground: Story = {
	render: (args) => (
		<div className="w-md max-w-full">
			<ControlledField {...args} />
		</div>
	),
}

export const Sizes: Story = {
	render: (args) => (
		<VariantContainer>
			{(["sm", "md", "lg"] as const).map((size) => (
				<VariantGroup key={size} title={size}>
					<div className="w-md max-w-full">
						<ControlledField {...args} label={`Quantity ${size}`} size={size} />
					</div>
				</VariantGroup>
			))}
		</VariantContainer>
	),
}

export const States: Story = {
	render: (args) => (
		<VariantContainer>
			<VariantGroup title="Editable and empty" fullWidth>
				<ControlledField {...args} label="Editable quantity" />
				<ControlledField {...args} label="Empty quantity" value="" />
			</VariantGroup>
			<VariantGroup title="Invalid with helper and error" fullWidth>
				<ControlledField
					{...args}
					label="Invalid quantity"
					value="12"
					error="Choose at most 10 pieces."
				/>
			</VariantGroup>
			<VariantGroup title="Pending, disabled and read only" fullWidth>
				<ControlledField
					{...args}
					label="Pending quantity"
					pending
					pendingLabel="Updating quantity"
				/>
				<ControlledField {...args} label="Disabled quantity" disabled />
				<ControlledField {...args} label="Read only quantity" readOnly />
			</VariantGroup>
		</VariantContainer>
	),
}

export const RejectedUpdate: Story = {
	render: function Render(args) {
		const [value, setValue] = useState("2")
		const [error, setError] = useState<string>()
		return (
			<div className="w-md max-w-full flex flex-col gap-100">
				<QuantityField
					{...args}
					label="Order quantity"
					value={value}
					error={error}
					onValueChange={(details) => {
						setValue(details.value)
						setError(undefined)
						changed(details)
					}}
				/>
				<p data-testid="draft-value">
					Draft: {value === "" ? "(empty)" : value}
				</p>
				<p>Saved quantity: 2</p>
				<div className="flex flex-wrap gap-100">
					<Button
						onClick={() =>
							setError(
								"This quantity cannot be supplied. Please choose another quantity.",
							)
						}
					>
						Reject update
					</Button>
					<Button
						theme="outlined"
						onClick={() => {
							setValue("2")
							setError(undefined)
						}}
					>
						Reset from parent
					</Button>
				</div>
			</div>
		)
	},
}

export const DecimalQuantity: Story = {
	args: {
		label: "Délka",
		unitLabel: "m",
		value: "1,5",
		step: 0.5,
		locale: "cs-CZ",
		formatOptions: { maximumFractionDigits: 2 },
		helperText: "Objednávejte po půl metru.",
	},
	render: (args) => (
		<div lang="cs" className="w-md max-w-full">
			<ControlledField {...args} />
		</div>
	),
}

export const Bounds: Story = {
	render: (args) => (
		<VariantContainer>
			<VariantGroup title="Minimum and maximum" fullWidth>
				<ControlledField {...args} label="At minimum" value="0" />
				<ControlledField {...args} label="At maximum" value="10" />
			</VariantGroup>
			<VariantGroup title="Typed overflow stays editable" fullWidth>
				<ControlledField
					{...args}
					label="Outside bounds"
					value="12"
					error="Choose a quantity between 0 and 10."
				/>
			</VariantGroup>
		</VariantContainer>
	),
}

export const CompactLongUnit: Story = {
	parameters: { layout: "padded" },
	args: {
		label: "Quantity for stainless steel screws",
		hideLabel: true,
		size: "sm",
		unitLabel: "packages containing 100 stainless steel screws",
		helperText:
			"Each package is supplied as a complete unit. Removing the item is a separate action.",
	},
	render: (args) => (
		<div className="w-xs max-w-full">
			<ControlledField {...args} />
		</div>
	),
}

export const PendingAndReadOnly: Story = {
	render: function Render(args) {
		const [value, setValue] = useState("2")
		const [pending, setPending] = useState(false)
		const [readOnly, setReadOnly] = useState(false)
		const [commitCount, setCommitCount] = useState(0)
		return (
			<div className="w-md max-w-full flex flex-col gap-100">
				<QuantityField
					{...args}
					label="Toggle quantity"
					value={value}
					pending={pending}
					pendingLabel="Updating quantity"
					readOnly={readOnly}
					onValueCommit={(details) => {
						setCommitCount((count) => count + 1)
						committed(details)
					}}
					onValueChange={(details) => {
						setValue(details.value)
						changed(details)
					}}
				/>
				<p data-testid="draft-value">
					Draft: {value === "" ? "(empty)" : value}
				</p>
				<div className="flex flex-wrap gap-100">
					<p data-testid="commit-count">Commits: {commitCount}</p>
					<Button
						aria-pressed={pending}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => setPending(!pending)}
					>
						Toggle pending
					</Button>
					<Button
						aria-pressed={readOnly}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => setReadOnly(!readOnly)}
					>
						Toggle read only
					</Button>
				</div>
			</div>
		)
	},
}

export const FormIdentity: Story = {
	render: function Render(args) {
		const [value, setValue] = useState("2")
		const [submitted, setSubmitted] = useState("")
		const inputRef = useRef<HTMLInputElement>(null)
		return (
			<div className="w-md max-w-full flex flex-col gap-100">
				<p id="quantity-external-description">
					Quantity requested for this order.
				</p>
				<p id="quantity-extra-description">
					Your saved quantity is unchanged until submitted.
				</p>
				<form
					id="quantity-order-form"
					onSubmit={(event) => {
						event.preventDefault()
						setSubmitted(
							String(new FormData(event.currentTarget).get("orderQuantity")),
						)
						committed(value)
					}}
				>
					<QuantityField
						{...args}
						id="quantity-order"
						name="orderQuantity"
						ref={inputRef}
						label="Form quantity"
						value={value}
						aria-describedby="quantity-external-description"
						describedBy="quantity-extra-description"
						onValueChange={(details) => {
							setValue(details.value)
							changed(details)
						}}
					/>
					<Button type="submit" className="mt-100">
						Submit quantity
					</Button>
				</form>
				<Button theme="outlined" onClick={() => inputRef.current?.focus()}>
					Focus quantity
				</Button>
				<p data-testid="submitted-value">Submitted: {submitted}</p>
			</div>
		)
	},
}
