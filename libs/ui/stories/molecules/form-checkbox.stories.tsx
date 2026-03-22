import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { FormCheckbox } from "../../src/molecules/form-checkbox"

const meta: Meta<typeof FormCheckbox> = {
	title: "Molecules/FormCheckbox",
	component: FormCheckbox,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		// Text inputs
		label: {
			control: 'text',
			description: 'Label text for the checkbox',
		},
		helpText: {
			control: 'text',
			description: 'Help text displayed below the checkbox',
		},

		// Appearance
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
			description: 'Size of the checkbox and label',
			table: { defaultValue: { summary: 'md' } },
		},
		validateStatus: {
			control: 'select',
			options: ['default', 'error', 'success', 'warning'],
			description: 'Validation status',
			table: { defaultValue: { summary: 'default' } },
		},
		showHelpTextIcon: {
			control: 'boolean',
			description: 'Show icon with help text',
			table: { defaultValue: { summary: 'false' } },
		},

		// States
		disabled: {
			control: 'boolean',
			description: 'Disable the checkbox',
			table: { defaultValue: { summary: 'false' } },
		},
		required: {
			control: 'boolean',
			description: 'Mark as required field',
			table: { defaultValue: { summary: 'false' } },
		},
		readOnly: {
			control: 'boolean',
			description: 'Make checkbox read-only',
			table: { defaultValue: { summary: 'false' } },
		},
		indeterminate: {
			control: 'boolean',
			description: 'Show indeterminate state',
			table: { defaultValue: { summary: 'false' } },
		},
		defaultChecked: {
			control: 'boolean',
			description: 'Initial checked state (uncontrolled)',
			table: { defaultValue: { summary: 'false' } },
		},
	},
	args: {
		label: 'Accept terms and conditions',
		size: 'md',
		validateStatus: 'default',
		showHelpTextIcon: false,
		disabled: false,
		required: false,
		readOnly: false,
		indeterminate: false,
		defaultChecked: false,
	},
}

export default meta
type Story = StoryObj<typeof FormCheckbox>

export const Playground: Story = {
	args: {
		label: 'Playground Checkbox',
		helpText: 'Helper text',
	},
}

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
}

export const Indeterminate: Story = {
	args: {
		indeterminate: true,
	},
}

export const WithValidation: Story = {
	render: function Render() {
		return (
			<div className="flex flex-col gap-6">
				<FormCheckbox
					label="Error state without icon"
					validateStatus="error"
					helpText="You must accept the terms to continue"
					showHelpTextIcon={false}
				/>
				<FormCheckbox
					label="Success state"
					validateStatus="success"
					helpText="Terms accepted successfully"
					defaultChecked
				/>
				<FormCheckbox
					label="Warning state"
					validateStatus="warning"
					helpText="Please review the terms carefully"
				/>
				<FormCheckbox
					label="Default help text"
					helpText="By checking this box, you agree to our terms of service"
				/>
			</div>
		)
	},
}

export const Disabled: Story = {
	args: {
		disabled: true,
	},
}

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		defaultChecked: true,
	},
}

export const Required: Story = {
	args: {
		required: true,
	},
}

export const AllStates: Story = {
	render: function Render() {
		return (
			<div className="flex flex-col gap-4">
				<FormCheckbox label="Default" />
				<FormCheckbox label="Checked" defaultChecked />
				<FormCheckbox label="Indeterminate" indeterminate />
				<FormCheckbox label="Disabled" disabled />
				<FormCheckbox label="Disabled Checked" disabled defaultChecked />
				<FormCheckbox
					label="Error state"
					validateStatus="error"
					helpText="Error message"
				/>
				<FormCheckbox
					label="Success state"
					validateStatus="success"
					helpText="Success message"
					defaultChecked
				/>
				<FormCheckbox label="Required" required />
				<FormCheckbox label="With Help Text" helpText="Helper text" />
			</div>
		)
	},
}

export const Sizes: Story = {
	render: function Render() {
		return (
			<div className="flex flex-col gap-4">
				<FormCheckbox label="Small checkbox" size="sm" />
				<FormCheckbox label="Medium checkbox (default)" size="md" />
				<FormCheckbox label="Large checkbox" size="lg" />
			</div>
		)
	},
}

export const IndeterminateExample: Story = {
	render: function Render() {
		const [items, setItems] = useState([
			{ id: 1, name: "Item A", checked: false },
			{ id: 2, name: "Item B", checked: true },
			{ id: 3, name: "Item C", checked: true },
		])

		const checkedCount = items.filter((item) => item.checked).length
		const allChecked = checkedCount === items.length
		const noneChecked = checkedCount === 0
		const isIndeterminate = !allChecked && !noneChecked

		const handleParentChange = (checked: boolean) => {
			setItems((prevItems) => prevItems.map((item) => ({ ...item, checked })))
		}

		const handleChildChange = (id: number, checked: boolean) => {
			setItems((prevItems) =>
				prevItems.map((item) =>
					item.id === id ? { ...item, checked } : item
				)
			)
		}

		return (
			<div className="w-64 rounded border p-4">
				<FormCheckbox
					checked={allChecked}
					indeterminate={isIndeterminate}
					label={`Select All (${checkedCount}/${items.length})`}
					onCheckedChange={handleParentChange}
				/>

				<div className="mt-4 space-y-2 pl-6">
					{items.map((item) => (
						<FormCheckbox
							key={item.id}
							checked={item.checked}
							label={item.name}
							onCheckedChange={(checked) => handleChildChange(item.id, checked)}
						/>
					))}
				</div>
			</div>
		)
	},
}

export const Controlled: Story = {
	render: function Render() {
		const [checked, setChecked] = useState(false)

		return (
			<div className="flex flex-col gap-4">
				<FormCheckbox
					checked={checked}
					label={`Checkbox is ${checked ? "checked" : "unchecked"}`}
					onCheckedChange={setChecked}
				/>
				<button
					type="button"
					className="rounded bg-blue-500 px-4 py-2 text-white"
					onClick={() => setChecked(!checked)}
				>
					Toggle from outside
				</button>
			</div>
		)
	},
}
