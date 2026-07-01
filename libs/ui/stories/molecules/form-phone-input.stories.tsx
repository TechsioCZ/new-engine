import type { Meta, StoryObj } from "@storybook/react"
import { getPhoneErrorText, getPhoneHelpText } from "@techsio/address/i18n/en"
import { useState } from "react"
import { Button } from "../../src/atoms/button"
import { FormPhoneInput } from "../../src/molecules/form-phone-input"

const meta: Meta<typeof FormPhoneInput> = {
	title: "Molecules/FormPhoneInput",
	component: FormPhoneInput,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component: `
A phone number input component with integrated country selector and real-time formatting.

## Features
- Country selector with flag icons
- Real-time phone number formatting based on selected country
- Value stored and emitted in E.164 format (+12133734253)
- Validation states (default, error, success, warning)
- Size variants (sm, md, lg)
- Full keyboard navigation and accessibility
        `,
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: { type: "select" },
			options: ["sm", "md", "lg"],
			description: "Size variant of the input",
		},
		validateStatus: {
			control: { type: "select" },
			options: ["default", "error", "success", "warning"],
			description: "Validation state of the input",
		},
		disabled: {
			control: "boolean",
			description: "Whether the input is disabled",
		},
		required: {
			control: "boolean",
			description: "Whether the input is required",
		},
		defaultCountry: {
			control: "text",
			description: "Default country code (ISO alpha-2)",
		},
	},
	decorators: [
		(Story) => (
			<div className="w-96 p-200">
				<Story />
			</div>
		),
	],
}

export default meta
type Story = StoryObj<typeof FormPhoneInput>

// === Basic Examples ===

export const Default: Story = {
	args: {
		id: "phone-default",
		label: "Phone Number",
		placeholder: "Enter phone number",
		helpText: getPhoneHelpText("CZ"),
	},
}

export const WithDefaultValue: Story = {
	args: {
		id: "phone-with-value",
		label: "Phone Number",
		defaultValue: "+420777888999",
		helpText: "Pre-filled with a Czech number",
	},
}

export const WithDefaultCountry: Story = {
	args: {
		id: "phone-default-country",
		label: "Phone Number",
		defaultCountry: "DE",
		placeholder: "Enter German phone number",
		helpText: "Defaults to Germany",
	},
}

// === Size Variants ===

export const Sizes: Story = {
	render: () => (
		<div className="flex flex-col gap-300">
			<FormPhoneInput
				id="phone-sm"
				label="Small"
				size="sm"
				placeholder="Phone number"
			/>
			<FormPhoneInput
				id="phone-md"
				label="Medium (default)"
				size="md"
				placeholder="Phone number"
			/>
			<FormPhoneInput
				id="phone-lg"
				label="Large"
				size="lg"
				placeholder="Phone number"
			/>
		</div>
	),
}

// === Validation States ===

export const ValidationStates: Story = {
	render: () => (
		<div className="flex flex-col gap-300">
			<FormPhoneInput
				id="phone-default-state"
				label="Default State"
				placeholder="Phone number"
				helpText={getPhoneHelpText("CZ")}
			/>
			<FormPhoneInput
				id="phone-error"
				label="Error State"
				placeholder="Phone number"
				validateStatus="error"
				errorText={getPhoneErrorText("DE")}
				defaultValue="+49555"
			/>
			<FormPhoneInput
				id="phone-success"
				label="Success State"
				placeholder="Phone number"
				validateStatus="success"
				helpText="Phone number verified"
				defaultValue="+4930123456789"
				defaultCountry="DE"
			/>
			<FormPhoneInput
				id="phone-warning"
				label="Warning State"
				placeholder="Phone number"
				validateStatus="warning"
				helpText="This may be a landline number"
				defaultValue="+442071234567"
				defaultCountry="GB"
			/>
		</div>
	),
}

// === States ===

export const States: Story = {
	render: () => (
		<div className="flex flex-col gap-300">
			<FormPhoneInput
				id="phone-disabled"
				label="Disabled"
				disabled
				defaultValue="+420777888999"
			/>
			<FormPhoneInput
				id="phone-readonly"
				label="Read Only"
				readOnly
				defaultValue="+420777888999"
			/>
			<FormPhoneInput
				id="phone-required"
				label="Required"
				required
				helpText="This field is required"
			/>
		</div>
	),
}

// === Priority Countries ===

export const PriorityCountries: Story = {
	args: {
		id: "phone-priority",
		label: "Phone Number",
		priorityCountries: ["DE", "GB", "AT"],
		helpText: "Germany, UK, and Austria appear first in the dropdown",
	},
}

// === Controlled Component ===

export const Controlled: Story = {
	render: () => {
		const [value, setValue] = useState<string>("+420777888999")
		const [country, setCountry] = useState<string>("CZ")

		return (
			<div className="space-y-200">
				<FormPhoneInput
					id="phone-controlled"
					label="Phone Number"
					value={value}
					onChange={setValue}
					onCountryChange={setCountry}
				/>

				<div className="space-y-50 rounded bg-surface p-150 text-sm">
					<div>
						<strong>E.164 Value:</strong> {value || "(empty)"}
					</div>
					<div>
						<strong>Country:</strong> {country}
					</div>
				</div>

				<div className="flex gap-100">
					<Button
						type="button"
						size="sm"
						onClick={() => {
							setValue("+442071234567")
						}}
					>
						Set UK Number
					</Button>
					<Button
						type="button"
						size="sm"
						theme="light"
						variant="danger"
						onClick={() => setValue("")}
					>
						Clear
					</Button>
				</div>
			</div>
		)
	},
}

// === Form Integration ===

export const WithinForm: Story = {
	render: () => {
		const [formData, setFormData] = useState({
			phone: "",
		})
		const [submitted, setSubmitted] = useState<typeof formData | null>(null)
		const [error, setError] = useState<string | null>(null)

		const handleSubmit = (e: React.FormEvent) => {
			e.preventDefault()

			if (!formData.phone) {
				setError("Phone number is required")
				return
			}

			if (formData.phone.length < 10) {
				setError("Phone number is too short")
				return
			}

			setError(null)
			setSubmitted(formData)
		}

		return (
			<form onSubmit={handleSubmit} className="space-y-200">
				<FormPhoneInput
					id="form-phone"
					label="Contact Phone"
					name="phone"
					required
					value={formData.phone}
					onChange={(phone) => setFormData({ ...formData, phone })}
					validateStatus={error ? "error" : "default"}
					errorText={error || undefined}
					helpText="We'll use this to contact you about your order"
				/>

				<Button type="submit" size="sm">Submit</Button>

				{submitted && (
					<div className="rounded-md border border-success bg-success-light p-200">
						<h4 className="font-medium">Form Submitted:</h4>
						<p>
							<strong>Phone (E.164):</strong> {submitted.phone}
						</p>
					</div>
				)}
			</form>
		)
	},
}
