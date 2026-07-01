import type { Meta, StoryObj } from "@storybook/react"
import { getPostalErrorText, getPostalHelpText } from "@techsio/address/i18n/en"
import { useState } from "react"
import { FormPostalInput } from "../../src/molecules/form-postal-input"

const meta: Meta<typeof FormPostalInput> = {
	title: "Molecules/FormPostalInput",
	component: FormPostalInput,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component: `
A postal code input component with country-aware validation and formatting.

## Features
- Country-aware max length and input mode
- Auto-formatting on blur (e.g., "12345" -> "123 45" for CZ)
- Browser autofill support via \`autocomplete="postal-code"\`
- Validation states (default, error, success, warning)
- Size variants (sm, md, lg)

## Supported Countries
- CZ, SK: 5 digits with space (123 45)
- US: 5 digits or ZIP+4 (12345 or 12345-6789)
- DE, AT: 4-5 digits
- GB: Alphanumeric (SW1A 1AA)
- CA: Alphanumeric (K1A 0B1)
- PL: 5 digits with dash (12-345)
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
		countryCode: {
			control: { type: "select" },
			options: ["CZ", "SK", "DE", "AT", "PL", "US", "GB", "CA"],
			description: "Country code for validation rules",
		},
		disabled: {
			control: "boolean",
			description: "Whether the input is disabled",
		},
		required: {
			control: "boolean",
			description: "Whether the input is required",
		},
	},
	decorators: [
		(Story) => (
			<div className="w-80 p-4">
				<Story />
			</div>
		),
	],
}

export default meta
type Story = StoryObj<typeof FormPostalInput>

// === Basic Examples ===

export const Default: Story = {
	args: {
		id: "postal-default",
		label: "Postal Code",
		countryCode: "CZ",
		helpText: getPostalHelpText("CZ"),
	},
}

export const WithDefaultValue: Story = {
	args: {
		id: "postal-with-value",
		label: "Postal Code",
		countryCode: "CZ",
		value: "123 45",
		helpText: "Pre-filled Czech postal code",
	},
}

// === Country Variants ===

export const CountryVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<FormPostalInput
				id="postal-cz"
				label="Czech Republic"
				countryCode="CZ"
				placeholder="123 45"
			/>
			<FormPostalInput
				id="postal-sk"
				label="Slovakia"
				countryCode="SK"
				placeholder="123 45"
			/>
			<FormPostalInput
				id="postal-de"
				label="Germany"
				countryCode="DE"
				placeholder="12345"
			/>
			<FormPostalInput
				id="postal-at"
				label="Austria"
				countryCode="AT"
				placeholder="1234"
			/>
			<FormPostalInput
				id="postal-pl"
				label="Poland"
				countryCode="PL"
				placeholder="12-345"
			/>
			<FormPostalInput
				id="postal-us"
				label="United States"
				countryCode="US"
				placeholder="12345 or 12345-6789"
			/>
			<FormPostalInput
				id="postal-gb"
				label="United Kingdom"
				countryCode="GB"
				placeholder="SW1A 1AA"
			/>
			<FormPostalInput
				id="postal-ca"
				label="Canada"
				countryCode="CA"
				placeholder="K1A 0B1"
			/>
		</div>
	),
}

// === Size Variants ===

export const Sizes: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<FormPostalInput
				id="postal-sm"
				label="Small"
				size="sm"
				countryCode="CZ"
			/>
			<FormPostalInput
				id="postal-md"
				label="Medium (default)"
				size="md"
				countryCode="CZ"
			/>
			<FormPostalInput
				id="postal-lg"
				label="Large"
				size="lg"
				countryCode="CZ"
			/>
		</div>
	),
}

// === Validation States ===

export const ValidationStates: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<FormPostalInput
				id="postal-default-state"
				label="Default State"
				countryCode="CZ"
				helpText={getPostalHelpText("CZ")}
			/>
			<FormPostalInput
				id="postal-error"
				label="Error State"
				countryCode="CZ"
				validateStatus="error"
				errorText={getPostalErrorText("CZ")}
				value="123"
			/>
			<FormPostalInput
				id="postal-success"
				label="Success State"
				countryCode="CZ"
				validateStatus="success"
				helpText="Valid postal code"
				value="123 45"
			/>
			<FormPostalInput
				id="postal-warning"
				label="Warning State"
				countryCode="CZ"
				validateStatus="warning"
				helpText="Please verify this postal code"
				value="12345"
			/>
		</div>
	),
}

// === States ===

export const States: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<FormPostalInput
				id="postal-disabled"
				label="Disabled"
				disabled
				countryCode="CZ"
				value="123 45"
			/>
			<FormPostalInput
				id="postal-required"
				label="Required"
				required
				countryCode="CZ"
				helpText="This field is required"
			/>
		</div>
	),
}

// === Auto-Format on Blur ===

export const AutoFormat: Story = {
	render: () => {
		const [czValue, setCzValue] = useState("12345")
		const [gbValue, setGbValue] = useState("sw1a1aa")
		const [plValue, setPlValue] = useState("12345")

		return (
			<div className="flex flex-col gap-6">
				<div>
					<FormPostalInput
						id="postal-format-cz"
						label="Czech (type 12345, blur to format)"
						countryCode="CZ"
						value={czValue}
						onValueChange={setCzValue}
						onFormat={setCzValue}
						helpText={`Current value: "${czValue}"`}
					/>
				</div>
				<div>
					<FormPostalInput
						id="postal-format-gb"
						label="UK (type sw1a1aa, blur to format)"
						countryCode="GB"
						value={gbValue}
						onValueChange={setGbValue}
						onFormat={setGbValue}
						helpText={`Current value: "${gbValue}"`}
					/>
				</div>
				<div>
					<FormPostalInput
						id="postal-format-pl"
						label="Poland (type 12345, blur to format)"
						countryCode="PL"
						value={plValue}
						onValueChange={setPlValue}
						onFormat={setPlValue}
						helpText={`Current value: "${plValue}"`}
					/>
				</div>
			</div>
		)
	},
}

// === Dynamic Country Selection ===

export const DynamicCountry: Story = {
	render: () => {
		const [country, setCountry] = useState("CZ")
		const [postalCode, setPostalCode] = useState("")

		const countries = [
			{ code: "CZ", name: "Czech Republic" },
			{ code: "SK", name: "Slovakia" },
			{ code: "DE", name: "Germany" },
			{ code: "AT", name: "Austria" },
			{ code: "PL", name: "Poland" },
			{ code: "US", name: "United States" },
			{ code: "GB", name: "United Kingdom" },
			{ code: "CA", name: "Canada" },
		]

		return (
			<div className="space-y-4">
				<div>
					<label
						htmlFor="country-select"
						className="block text-sm font-medium mb-1"
					>
						Country
					</label>
					<select
						id="country-select"
						value={country}
						onChange={(e) => {
							setCountry(e.target.value)
							setPostalCode("") // Reset postal code when country changes
						}}
						className="w-full p-2 border rounded"
					>
						{countries.map((c) => (
							<option key={c.code} value={c.code}>
								{c.name}
							</option>
						))}
					</select>
				</div>

				<FormPostalInput
					id="postal-dynamic"
					label="Postal Code"
					countryCode={country}
					value={postalCode}
					onValueChange={setPostalCode}
					onFormat={setPostalCode}
					helpText="Input mode and max length adjust based on country"
				/>

				<div className="text-sm p-3 bg-gray-100 rounded">
					<div>
						<strong>Country:</strong> {country}
					</div>
					<div>
						<strong>Postal Code:</strong> {postalCode || "(empty)"}
					</div>
				</div>
			</div>
		)
	},
}

// === Form Integration ===

export const WithinForm: Story = {
	render: () => {
		const [formData, setFormData] = useState({
			postalCode: "",
			country: "CZ",
		})
		const [submitted, setSubmitted] = useState<typeof formData | null>(null)
		const [error, setError] = useState<string | null>(null)

		const handleSubmit = (e: React.FormEvent) => {
			e.preventDefault()

			if (!formData.postalCode) {
				setError("Postal code is required")
				return
			}

			setError(null)
			setSubmitted(formData)
		}

		return (
			<form onSubmit={handleSubmit} className="space-y-4">
				<FormPostalInput
					id="form-postal"
					label="Postal Code"
					name="postalCode"
					required
					countryCode={formData.country}
					value={formData.postalCode}
					onValueChange={(postalCode) =>
						setFormData({ ...formData, postalCode })
					}
					onFormat={(postalCode) => setFormData({ ...formData, postalCode })}
					validateStatus={error ? "error" : "default"}
					errorText={error ?? undefined}
					helpText="Enter your postal code"
				/>

				<button
					type="submit"
					className="px-4 py-2 bg-blue-500 text-white rounded"
				>
					Submit
				</button>

				{submitted && (
					<div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
						<h4 className="mb-2 font-medium">Form Submitted:</h4>
						<p>
							<strong>Postal Code:</strong> {submitted.postalCode}
						</p>
						<p>
							<strong>Country:</strong> {submitted.country}
						</p>
					</div>
				)}
			</form>
		)
	},
}
