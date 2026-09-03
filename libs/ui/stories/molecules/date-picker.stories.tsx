import {
	CalendarDate,
	CalendarDateTime,
	parseZonedDateTime,
} from "@internationalized/date"
import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentType, useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
	DatePicker,
	type DatePickerDayRangeRootProps,
	type DatePickerDayRootProps,
	type DatePickerRange,
	type DatePickerTimedRangeRootProps,
	type DatePickerTimedRootProps,
	type DatePickerTimedValue,
} from "../../src/molecules/date-picker"

type DateOnlyFieldProps = Omit<DatePickerDayRootProps, "children"> & {
	label: string
}

function DateOnlyField({ label, ...props }: DateOnlyFieldProps) {
	return (
		<DatePicker.Root {...props}>
			<DatePicker.Label>{label}</DatePicker.Label>
			<DatePicker.Control>
				<DatePicker.Segments />
				<DatePicker.IndicatorGroup>
					<DatePicker.ClearTrigger />
					<DatePicker.Trigger />
				</DatePicker.IndicatorGroup>
			</DatePicker.Control>
			<DatePicker.Positioner>
				<DatePicker.Content>
					<DatePicker.Calendar />
				</DatePicker.Content>
			</DatePicker.Positioner>
		</DatePicker.Root>
	)
}

type TimedFieldProps = Omit<DatePickerTimedRootProps, "children"> & {
	label: string
}

function TimedField({ label, ...props }: TimedFieldProps) {
	return (
		<DatePicker.Root {...props}>
			<DatePicker.Label>{label}</DatePicker.Label>
			<DatePicker.Control>
				<DatePicker.Segments />
				<DatePicker.IndicatorGroup>
					<DatePicker.ClearTrigger />
					<DatePicker.Trigger />
				</DatePicker.IndicatorGroup>
			</DatePicker.Control>
			<DatePicker.Positioner>
				<DatePicker.Content>
					<DatePicker.Calendar />
					<DatePicker.TimeControl />
					<DatePicker.Footer>
						<DatePicker.CancelTrigger />
						<DatePicker.ConfirmTrigger />
					</DatePicker.Footer>
				</DatePicker.Content>
			</DatePicker.Positioner>
		</DatePicker.Root>
	)
}

type DateRangeFieldProps = Omit<
	DatePickerDayRangeRootProps,
	"children" | "selectionMode"
> & {
	label: string
}

function DateRangeField({ label, ...props }: DateRangeFieldProps) {
	return (
		<DatePicker.Root {...props} selectionMode="range">
			<DatePicker.Label>{label}</DatePicker.Label>
			<DatePicker.Control>
				<DatePicker.Segments />
				<DatePicker.IndicatorGroup>
					<DatePicker.ClearTrigger />
					<DatePicker.Trigger />
				</DatePicker.IndicatorGroup>
			</DatePicker.Control>
			<DatePicker.Positioner>
				<DatePicker.Content>
					<DatePicker.Calendar />
				</DatePicker.Content>
			</DatePicker.Positioner>
		</DatePicker.Root>
	)
}

type TimedRangeFieldProps = Omit<
	DatePickerTimedRangeRootProps,
	"children" | "selectionMode"
> & {
	label: string
}

function TimedRangeField({ label, ...props }: TimedRangeFieldProps) {
	return (
		<DatePicker.Root {...props} selectionMode="range">
			<DatePicker.Label>{label}</DatePicker.Label>
			<DatePicker.Control>
				<DatePicker.Segments />
				<DatePicker.IndicatorGroup>
					<DatePicker.ClearTrigger />
					<DatePicker.Trigger />
				</DatePicker.IndicatorGroup>
			</DatePicker.Control>
			<DatePicker.Positioner>
				<DatePicker.Content>
					<DatePicker.Calendar />
					<DatePicker.TimeControl />
					<DatePicker.Footer>
						<DatePicker.CancelTrigger />
						<DatePicker.ConfirmTrigger />
					</DatePicker.Footer>
				</DatePicker.Content>
			</DatePicker.Positioner>
		</DatePicker.Root>
	)
}

const DatePickerDayRoot: ComponentType<DatePickerDayRootProps> = DatePicker.Root

const meta = {
	title: "Molecules/DatePicker",
	component: DatePickerDayRoot,
	subcomponents: {
		Label: DatePicker.Label,
		Control: DatePicker.Control,
		Segments: DatePicker.Segments,
		IndicatorGroup: DatePicker.IndicatorGroup,
		Trigger: DatePicker.Trigger,
		ClearTrigger: DatePicker.ClearTrigger,
		Positioner: DatePicker.Positioner,
		Content: DatePicker.Content,
		Calendar: DatePicker.Calendar,
		TimeControl: DatePicker.TimeControl,
		Footer: DatePicker.Footer,
		CancelTrigger: DatePicker.CancelTrigger,
		ConfirmTrigger: DatePicker.ConfirmTrigger,
	},
	tags: ["autodocs", "date-picker"],
	parameters: {
		layout: "centered",
		controls: {
			include: [
				"size",
				"locale",
				"disabled",
				"readOnly",
				"invalid",
				"required",
			],
		},
		docs: {
			description: {
				component:
					"One locale-aware compound DatePicker for single dates, date-time values, date ranges, and date-time ranges. The sidebar is curated around consumer-visible patterns; controlled-state, form-serialization, and value-kind fixtures remain test-only. Date-only values commit when complete, while timed values use an explicit Cancel/Confirm transaction.",
			},
		},
	},
	argTypes: {
		children: { control: false, table: { disable: true } },
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
			description:
				"Controls field and calendar density; transactional time controls remain compact.",
			table: { defaultValue: { summary: "md" } },
		},
		locale: {
			control: "select",
			options: ["cs-CZ", "en-US", "de-DE"],
			description: "Controls localized segments and calendar labels.",
			table: { defaultValue: { summary: "en-US" } },
		},
		disabled: { control: "boolean" },
		readOnly: { control: "boolean" },
		invalid: { control: "boolean" },
		required: { control: "boolean" },
		onOpenChange: { control: false },
		onValueChange: { control: false },
	},
	args: {
		children: null,
		disabled: false,
		invalid: false,
		locale: "cs-CZ",
		onOpenChange: fn(),
		onValueChange: fn(),
		readOnly: false,
		required: false,
		size: "md",
	},
} satisfies Meta<typeof DatePickerDayRoot>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Use Controls to inspect the normal single-date field, locale, density, and field states.",
			},
		},
	},
	render: ({ children: _children, ...args }) => (
		<div className="w-md">
			<DatePicker.Root
				{...args}
				defaultValue={new CalendarDate(2026, 8, 31)}
			>
				<DatePicker.Label>Datum doručení</DatePicker.Label>
				<DatePicker.Control>
					<DatePicker.Segments />
					<DatePicker.IndicatorGroup>
						<DatePicker.ClearTrigger />
						<DatePicker.Trigger />
					</DatePicker.IndicatorGroup>
				</DatePicker.Control>
				<DatePicker.Positioner>
					<DatePicker.Content>
						<DatePicker.Calendar />
					</DatePicker.Content>
				</DatePicker.Positioner>
			</DatePicker.Root>
		</div>
	),
}

export const Sizes: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compare the supported field densities. Open a field or use Playground to inspect the matching calendar density.",
			},
		},
	},
	render: () => (
		<VariantContainer>
			<VariantGroup fullWidth title="Supported sizes">
				<DateOnlyField
					defaultValue={new CalendarDate(2026, 8, 31)}
					label="Small"
					size="sm"
				/>
				<DateOnlyField
					defaultValue={new CalendarDate(2026, 8, 31)}
					label="Medium"
					size="md"
				/>
				<DateOnlyField
					defaultValue={new CalendarDate(2026, 8, 31)}
					label="Large"
					size="lg"
				/>
			</VariantGroup>
		</VariantContainer>
	),
}

export const States: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Check disabled, read-only, invalid, and required field presentation and interaction affordances.",
			},
		},
	},
	render: () => (
		<VariantContainer>
			<VariantGroup fullWidth title="Field states">
				<DateOnlyField disabled label="Disabled" />
				<DateOnlyField
					defaultValue={new CalendarDate(2026, 8, 31)}
					label="Read only"
					readOnly
				/>
				<DateOnlyField invalid label="Invalid" />
				<DateOnlyField label="Required" required />
			</VariantGroup>
		</VariantContainer>
	),
}

export const DateOnlyCalendar: Story = {
	name: "Single Date",
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The standard calendar flow. Verify month/year navigation, keyboard focus, and immediate commit after choosing a day.",
			},
		},
	},
	render: () => (
		<div className="w-md">
			<DateOnlyField
				defaultOpen
				id="date-picker-date-only-open"
				label="Choose a calendar date"
				locale="en-US"
			/>
		</div>
	),
}

export const DateRangeCalendar: Story = {
	name: "Date Range",
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The two-panel range flow. Verify aligned weeks, independent panel navigation, and the highlighted start-to-end interval.",
			},
		},
	},
	render: () => (
		<div className="max-w-full w-lg">
			<DateRangeField
				defaultOpen
				defaultValue={[
					new CalendarDate(2026, 9, 5),
					new CalendarDate(2026, 9, 18),
				]}
				endName="reportingEnd"
				id="date-picker-date-range-open"
				label="Reporting period"
				locale="en-US"
				startName="reportingStart"
			/>
		</div>
	),
}

function ControlledRangeExample() {
	const [value, setValue] = useState<DatePickerRange<CalendarDate> | null>([
		new CalendarDate(2026, 9, 5),
		new CalendarDate(2026, 9, 18),
	])

	return (
		<div className="w-lg max-w-full space-y-200">
			<DateRangeField
				id="date-picker-controlled-range"
				label="Controlled reporting period"
				onValueChange={(details) => setValue(details.value)}
				value={value}
			/>
			<output className="block text-fg-primary text-sm">
				{value?.map((endpoint) => endpoint.toString()).join(" – ") ?? "empty"}
			</output>
		</div>
	)
}

export const ControlledDateRange: Story = {
	tags: ["!dev"],
	parameters: { layout: "padded" },
	render: () => <ControlledRangeExample />,
}

function RangeFormSerializationExample() {
	const [serialized, setSerialized] = useState("Submit to read both endpoints")

	return (
		<form
			className="w-lg max-w-full space-y-200"
			onSubmit={(event) => {
				event.preventDefault()
				const data = new FormData(event.currentTarget)
				setSerialized(
					`${String(data.get("reportingStart") ?? "")} → ${String(data.get("reportingEnd") ?? "")}`
				)
			}}
		>
			<DateRangeField
				defaultValue={[
					new CalendarDate(2026, 9, 5),
					new CalendarDate(2026, 9, 18),
				]}
				endName="reportingEnd"
				id="date-picker-range-form"
				label="Reporting period form value"
				startName="reportingStart"
			/>
			<Button type="submit">Read serialized range</Button>
			<output className="block text-fg-primary text-sm">{serialized}</output>
		</form>
	)
}

export const RangeFormSerialization: Story = {
	tags: ["!dev"],
	parameters: { layout: "padded" },
	render: () => <RangeFormSerializationExample />,
}

export const LocalizedUnavailableRange: Story = {
	name: "Constraints And Localization",
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"A Czech, Monday-first range with min/max bounds and an unavailable date. Focus on localized labels and disabled-day treatment.",
			},
		},
	},
	render: () => (
		<div className="w-lg max-w-full">
			<DateRangeField
				defaultOpen
				defaultValue={[
					new CalendarDate(2026, 9, 7),
					new CalendarDate(2026, 9, 18),
				]}
				id="date-picker-localized-unavailable-range"
				isDateUnavailable={(date) => date.day === 14}
				label="Období reportu s nedostupným termínem"
				locale="cs-CZ"
				max={new CalendarDate(2026, 10, 23)}
				min={new CalendarDate(2026, 9, 3)}
				startOfWeek={1}
			/>
		</div>
	),
}

export const TransactionalTimeGranularities: Story = {
	tags: ["!dev"],
	render: () => (
		<VariantContainer>
			<VariantGroup fullWidth title="Transactional timed modes">
				<TimedField
					defaultValue={new CalendarDateTime(2026, 8, 31, 14)}
					granularity="hour"
					hourCycle={12}
					label="Appointment hour"
				/>
				<TimedField
					defaultValue={new CalendarDateTime(2026, 8, 31, 14, 30)}
					granularity="minute"
					hourCycle={24}
					label="Appointment minute"
				/>
				<TimedField
					defaultValue={new CalendarDateTime(2026, 8, 31, 14, 30, 45)}
					granularity="second"
					hourCycle={24}
					label="Appointment second"
				/>
			</VariantGroup>
		</VariantContainer>
	),
}

export const InitiallyOpenTimedDraft: Story = {
	name: "Date And Time",
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The common date-time flow. Time is edited in one compact row; date and time remain a private draft until Confirm, while Cancel restores the accepted value.",
			},
		},
	},
	render: () => (
		<div className="w-md">
			<TimedField
				defaultOpen
				defaultValue={new CalendarDateTime(2026, 8, 31, 14, 30)}
				granularity="minute"
				hourCycle={24}
				id="date-picker-timed-draft-open"
				label="Edit the private draft, then confirm"
			/>
		</div>
	),
}

export const InitiallyOpenDateTimeRange: Story = {
	name: "Date And Time Range",
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"A range with separate start and end times committed by one Confirm action. Verify both calendar panels and both compact time groups.",
			},
		},
	},
	render: () => (
		<div className="max-w-full w-lg">
			<TimedRangeField
				defaultOpen
				defaultValue={[
					new CalendarDateTime(2026, 9, 5, 9, 30),
					new CalendarDateTime(2026, 9, 18, 17, 45),
				]}
				endName="reportingEnd"
				granularity="minute"
				hourCycle={24}
				id="date-picker-date-time-range-open"
				label="Reporting period with time"
				locale="en-US"
				startName="reportingStart"
			/>
		</div>
	),
}

export const ZonedDateTimeRange: Story = {
	tags: ["!dev"],
	parameters: { layout: "padded" },
	render: () => (
		<div className="w-lg max-w-full">
			<TimedRangeField
				defaultValue={[
					parseZonedDateTime("2026-10-24T09:30+02:00[Europe/Prague]"),
					parseZonedDateTime("2026-10-26T17:45+01:00[Europe/Prague]"),
				]}
				granularity="minute"
				hourCycle={24}
				id="date-picker-zoned-date-time-range"
				label="Europe/Prague reporting interval"
				timeZone="Europe/Prague"
			/>
		</div>
	),
}

function ControlledTimedResyncExample() {
	const [value, setValue] = useState<DatePickerTimedValue | null>(
		new CalendarDateTime(2026, 8, 31, 14, 30),
	)

	return (
		<div className="w-md space-y-200">
			<TimedField
				granularity="minute"
				hourCycle={24}
				label="Externally synchronized appointment"
				onOpenChange={() => undefined}
				onValueChange={({ value: nextValue }) => setValue(nextValue)}
				open
				value={value}
			/>
			<Button
				data-testid="date-picker-external-resync"
				onClick={() =>
					setValue(new CalendarDateTime(2026, 9, 2, 16, 45))
				}
				type="button"
			>
				Apply external value
			</Button>
			<output data-testid="date-picker-external-value">
				{value?.toString() ?? "empty"}
			</output>
		</div>
	)
}

export const ControlledTimedResync: Story = {
	tags: ["!dev"],
	parameters: { layout: "padded" },
	render: () => <ControlledTimedResyncExample />,
}

type ControlledStrategy = "accept" | "reject" | "delay" | "transform"

function ControlledDateOnlyField({
	strategy,
}: {
	strategy: ControlledStrategy
}) {
	const initialValue = new CalendarDate(2026, 8, 31)
	const [value, setValue] = useState<CalendarDate | null>(initialValue)
	const [status, setStatus] = useState("No proposal yet")

	return (
		<div className="space-y-100">
			<DateOnlyField
				label={`${strategy[0]?.toUpperCase()}${strategy.slice(1)} proposals`}
				onValueChange={(details) => {
					setStatus(`Proposed: ${details.valueAsString || "empty"}`)

					if (strategy === "accept") {
						setValue(details.value)
					}
					if (strategy === "delay") {
						window.setTimeout(() => {
							setValue(details.value)
							setStatus(`Accepted later: ${details.valueAsString || "empty"}`)
						}, 750)
					}
					if (strategy === "transform") {
						setValue(details.value?.add({ days: 1 }) ?? null)
					}
				}}
				value={value}
			/>
			<p className="text-fg-primary text-sm">{status}</p>
		</div>
	)
}

export const ControlledParentBehaviors: Story = {
	tags: ["!dev"],
	render: () => (
		<VariantContainer>
			<VariantGroup
				fullWidth
				title="The controlled parent remains authoritative"
			>
				<ControlledDateOnlyField strategy="accept" />
				<ControlledDateOnlyField strategy="reject" />
				<ControlledDateOnlyField strategy="delay" />
				<ControlledDateOnlyField strategy="transform" />
			</VariantGroup>
		</VariantContainer>
	),
}

function FormSerializationExample() {
	const [submittedValue, setSubmittedValue] = useState(
		"Submit the form to read the wire value",
	)

	return (
		<form
			className="w-md space-y-200"
			onSubmit={(event) => {
				event.preventDefault()
				const data = new FormData(event.currentTarget)
				setSubmittedValue(String(data.get("deliveryDate") ?? ""))
			}}
		>
			<DateOnlyField
				defaultValue={new CalendarDate(2026, 8, 31)}
				label="Delivery date"
				name="deliveryDate"
			/>
			<Button type="submit">Read serialized value</Button>
			<output className="block text-fg-primary text-sm">
				{submittedValue}
			</output>
		</form>
	)
}

export const ClearAndFormSerialization: Story = {
	tags: ["!dev"],
	render: () => <FormSerializationExample />,
}

export const LocalesAndLongLabels: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compare Czech and English field formatting, week starts, and resilience to a long production-style label.",
			},
		},
	},
	render: () => (
		<VariantContainer>
			<VariantGroup fullWidth title="Localized segment and calendar labels">
				<DateOnlyField
					defaultValue={new CalendarDate(2026, 8, 31)}
					label="Požadované datum nejpozdějšího doručení objednávky zákazníkovi"
					locale="cs-CZ"
					startOfWeek={1}
				/>
				<DateOnlyField
					defaultValue={new CalendarDate(2026, 8, 31)}
					label="Requested customer delivery date"
					locale="en-US"
					startOfWeek={0}
				/>
			</VariantGroup>
		</VariantContainer>
	),
}

const PRAGUE_VALUE: DatePickerTimedValue = parseZonedDateTime(
	"2026-08-31T14:30+02:00[Europe/Prague]",
)

export const TypedDateTimeValues: Story = {
	tags: ["!dev"],
	render: () => (
		<VariantContainer>
			<VariantGroup fullWidth title="Canonical date-time value kinds">
				<TimedField
					defaultValue={new CalendarDateTime(2026, 8, 31, 14, 30)}
					granularity="minute"
					hourCycle={24}
					label="Floating CalendarDateTime"
				/>
				<TimedField
					defaultValue={PRAGUE_VALUE}
					granularity="minute"
					hourCycle={24}
					label="Europe/Prague ZonedDateTime"
					timeZone="Europe/Prague"
				/>
			</VariantGroup>
		</VariantContainer>
	),
}
