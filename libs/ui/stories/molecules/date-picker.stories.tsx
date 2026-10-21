import {
  CalendarDate,
  CalendarDateTime,
  type DateValue,
  parseZonedDateTime,
} from "@internationalized/date"
import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentType, type ReactNode, useId, useRef, useState } from "react"
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
  DatePicker,
  type DatePickerGranularity,
  type DatePickerDayRangeRootProps,
  type DatePickerDayRootProps,
  type DatePickerOpenChangeDetails,
  type DatePickerRange,
  type DatePickerSelectionMode,
  type DatePickerSize,
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
      <DatePicker.StatusText>
        {props.invalid
          ? "Choose an available date before continuing."
          : "Choose a date using the keyboard or calendar."}
      </DatePicker.StatusText>
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
      <DatePicker.StatusText>
        {props.invalid
          ? "Choose an available date before continuing."
          : "Choose a date using the keyboard or calendar."}
      </DatePicker.StatusText>
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
      <DatePicker.StatusText>
        {props.invalid
          ? "Choose an available date before continuing."
          : "Choose a date using the keyboard or calendar."}
      </DatePicker.StatusText>
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
      <DatePicker.StatusText>
        {props.invalid
          ? "Choose an available date before continuing."
          : "Choose a date using the keyboard or calendar."}
      </DatePicker.StatusText>
    </DatePicker.Root>
  )
}

type DatePickerPlaygroundArgs = {
  defaultOpen: boolean
  disabled: boolean
  flip: boolean
  granularity: DatePickerGranularity
  hideTimeZone: boolean
  hourCycle: 12 | 24
  initialValue: "empty" | "preset"
  invalid: boolean
  locale: string
  numOfMonths: "auto" | 1 | 2
  onOpenChange?: (details: DatePickerOpenChangeDetails) => void
  onValueChange?: (details: { value: unknown; valueAsString: unknown }) => void
  offset: number
  placement: NonNullable<DatePickerDayRootProps["placement"]>
  readOnly: boolean
  required: boolean
  selectionMode: DatePickerSelectionMode
  shouldForceLeadingZeros: boolean
  size: DatePickerSize
  slide: boolean
  startOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  useDateBounds: boolean
  useUnavailableDate: boolean
  useUnavailableTime: boolean
  valueKind: "floating" | "zoned"
}

const PLAYGROUND_DATE = new CalendarDate(2026, 8, 31)
const PLAYGROUND_DATE_RANGE: DatePickerRange<CalendarDate> = [
  new CalendarDate(2026, 9, 5),
  new CalendarDate(2026, 9, 18),
]
const PLAYGROUND_DATE_TIME = new CalendarDateTime(2026, 8, 31, 14, 30, 45)
const PLAYGROUND_DATE_TIME_RANGE: DatePickerRange<CalendarDateTime> = [
  new CalendarDateTime(2026, 9, 5, 9, 30, 15),
  new CalendarDateTime(2026, 9, 18, 17, 45, 30),
]
const PLAYGROUND_ZONED_DATE_TIME = parseZonedDateTime(
  "2026-08-31T14:30:45+02:00[Europe/Prague]"
)
const PLAYGROUND_ZONED_DATE_TIME_RANGE: DatePickerRange<
  typeof PLAYGROUND_ZONED_DATE_TIME
> = [
  parseZonedDateTime("2026-09-05T09:30:15+02:00[Europe/Prague]"),
  parseZonedDateTime("2026-09-18T17:45:30+02:00[Europe/Prague]"),
]
const PLAYGROUND_MIN_DATE = new CalendarDate(2026, 8, 20)
const PLAYGROUND_MAX_DATE = new CalendarDate(2026, 10, 10)

function formatPlaygroundValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(" – ") || "empty"
  }

  return value ? String(value) : "empty"
}

function DatePickerPlaygroundScenario({
  defaultOpen,
  disabled,
  flip,
  granularity,
  hideTimeZone,
  hourCycle,
  initialValue,
  invalid,
  locale,
  numOfMonths,
  onOpenChange,
  onValueChange,
  offset,
  placement,
  readOnly,
  required,
  selectionMode,
  shouldForceLeadingZeros,
  size,
  slide,
  startOfWeek,
  useDateBounds,
  useUnavailableDate,
  useUnavailableTime,
  valueKind,
}: DatePickerPlaygroundArgs) {
  const [committedValue, setCommittedValue] = useState(
    "Choose a date to see the saved form value."
  )
  const hasInitialValue = initialValue === "preset"
  const min = useDateBounds ? PLAYGROUND_MIN_DATE : undefined
  const max = useDateBounds ? PLAYGROUND_MAX_DATE : undefined
  const resolvedNumOfMonths =
    numOfMonths === "auto" ? (selectionMode === "range" ? 2 : 1) : numOfMonths
  const isDateUnavailable = useUnavailableDate
    ? (date: DateValue) => date.day === 23
    : undefined
  const isTimeUnavailable = useUnavailableTime
    ? (value: DatePickerTimedValue) => value.hour === 13
    : undefined
  const handleValueChange = (details: {
    value: unknown
    valueAsString: unknown
  }) => {
    setCommittedValue(formatPlaygroundValue(details.valueAsString))
    onValueChange?.(details)
  }
  const commonProps = {
    defaultOpen,
    disabled,
    flip,
    invalid,
    isDateUnavailable,
    locale,
    max,
    min,
    numOfMonths: resolvedNumOfMonths,
    offset: { crossAxis: 0, mainAxis: offset },
    onOpenChange,
    onValueChange: handleValueChange,
    placement,
    readOnly,
    required,
    shouldForceLeadingZeros,
    size,
    slide,
    startOfWeek,
  }

  let field: ReactNode
  if (granularity === "day") {
    field =
      selectionMode === "range" ? (
        <DateRangeField
          {...commonProps}
          defaultValue={hasInitialValue ? PLAYGROUND_DATE_RANGE : null}
          endName="playgroundEnd"
          label="Reporting period"
          startName="playgroundStart"
        />
      ) : (
        <DateOnlyField
          {...commonProps}
          defaultValue={hasInitialValue ? PLAYGROUND_DATE : null}
          label="Delivery date"
          name="playgroundDate"
        />
      )
  } else {
    const timeZone = valueKind === "zoned" ? "Europe/Prague" : "UTC"
    const singleValue =
      valueKind === "zoned" ? PLAYGROUND_ZONED_DATE_TIME : PLAYGROUND_DATE_TIME
    const rangeValue =
      valueKind === "zoned"
        ? PLAYGROUND_ZONED_DATE_TIME_RANGE
        : PLAYGROUND_DATE_TIME_RANGE

    field =
      selectionMode === "range" ? (
        <TimedRangeField
          {...commonProps}
          defaultValue={hasInitialValue ? rangeValue : null}
          endName="playgroundEnd"
          granularity={granularity}
          hideTimeZone={hideTimeZone}
          hourCycle={hourCycle}
          isTimeUnavailable={isTimeUnavailable}
          label="Reporting period with time"
          startName="playgroundStart"
          timeZone={timeZone}
        />
      ) : (
        <TimedField
          {...commonProps}
          defaultValue={hasInitialValue ? singleValue : null}
          granularity={granularity}
          hideTimeZone={hideTimeZone}
          hourCycle={hourCycle}
          isTimeUnavailable={isTimeUnavailable}
          label="Appointment"
          name="playgroundDateTime"
          timeZone={timeZone}
        />
      )
  }

  const modeDescription = `${selectionMode === "range" ? "Date range" : "A single date"}${
    granularity === "day" ? "" : ` with ${granularity} precision`
  } · ${resolvedNumOfMonths} ${resolvedNumOfMonths === 1 ? "calendar month" : "calendar months"}`

  return (
    <div className="w-full max-w-lg space-y-200">
      <p
        className="text-fg-secondary"
        data-testid="date-picker-playground-scenario"
      >
        {modeDescription}. Type into the date segments or open the calendar to
        choose.
      </p>
      <div
        className={
          selectionMode === "range" ? "w-full max-w-lg" : "w-full max-w-md"
        }
      >
        {field}
      </div>
      {useDateBounds || useUnavailableDate || useUnavailableTime ? (
        <p className="text-fg-secondary text-sm">
          {useDateBounds ? "Available from 20 August to 10 October 2026. " : ""}
          {useUnavailableDate ? "The 23rd of each month is unavailable. " : ""}
          {useUnavailableTime && granularity !== "day"
            ? "Appointments between 13:00 and 13:59 are unavailable."
            : ""}
        </p>
      ) : null}
      <output
        aria-live="polite"
        className="block text-fg-secondary text-sm"
        data-testid="date-picker-playground-committed-value"
      >
        Last committed value: {committedValue}
      </output>
    </div>
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
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A locale-aware field for typing a date or choosing it from a calendar, with optional date ranges and time entry; use it for delivery dates and appointments, formatted text for read-only dates, and preset choices for relative periods such as Last 7 days.",
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

export const Playground: StoryObj<DatePickerPlaygroundArgs> = {
  args: {
    defaultOpen: false,
    disabled: false,
    flip: true,
    granularity: "day",
    hideTimeZone: false,
    hourCycle: 24,
    initialValue: "preset",
    invalid: false,
    locale: "cs-CZ",
    numOfMonths: "auto",
    offset: 8,
    placement: "bottom-start",
    readOnly: false,
    required: false,
    selectionMode: "single",
    shouldForceLeadingZeros: false,
    size: "md",
    slide: true,
    startOfWeek: 1,
    useDateBounds: false,
    useUnavailableDate: false,
    useUnavailableTime: false,
    valueKind: "floating",
  },
  argTypes: {
    selectionMode: {
      control: "select",
      description: "Switches between one value and a start/end range.",
      options: ["single", "range"],
    },
    granularity: {
      control: "select",
      description:
        "Selects date-only or transactional date-and-time composition.",
      options: ["day", "hour", "minute", "second"],
    },
    initialValue: {
      control: "select",
      description:
        "Starts the active scenario empty or with a canonical value.",
      options: ["preset", "empty"],
    },
    valueKind: {
      control: "select",
      description:
        "Uses a floating CalendarDateTime or Europe/Prague ZonedDateTime.",
      if: { arg: "granularity", neq: "day" },
      options: ["floating", "zoned"],
    },
    defaultOpen: {
      control: "boolean",
      description: "Restarts the scenario with its popup initially open.",
    },
    size: {
      control: "select",
      description: "Controls field and calendar density.",
      options: ["sm", "md", "lg"],
      table: { category: "Appearance" },
    },
    locale: {
      control: "select",
      description: "Controls segment order and localized calendar labels.",
      options: ["cs-CZ", "en-US", "de-DE"],
      table: { category: "Appearance" },
    },
    numOfMonths: {
      control: "select",
      description:
        "Uses the component default (one month for single, two for range) or an explicit panel count.",
      options: ["auto", 1, 2],
      table: { category: "Appearance" },
    },
    startOfWeek: {
      control: { max: 6, min: 0, step: 1, type: "number" },
      description:
        "Sets the first weekday, from Sunday (0) through Saturday (6).",
      table: { category: "Appearance" },
    },
    shouldForceLeadingZeros: {
      control: "boolean",
      description: "Keeps editable numeric date segments zero-padded.",
      table: { category: "Appearance" },
    },
    hourCycle: {
      control: "select",
      description:
        "Switches timed scenarios between 12-hour and 24-hour input.",
      if: { arg: "granularity", neq: "day" },
      options: [12, 24],
      table: { category: "Time" },
    },
    hideTimeZone: {
      control: "boolean",
      description: "Hides the zone label for ZonedDateTime scenarios.",
      if: { arg: "granularity", neq: "day" },
      table: { category: "Time" },
    },
    disabled: {
      control: "boolean",
      description: "Disables editing, clearing, and opening the popup.",
      table: { category: "State" },
    },
    readOnly: {
      control: "boolean",
      description: "Preserves the value while preventing edits and clearing.",
      table: { category: "State" },
    },
    invalid: {
      control: "boolean",
      description: "Applies error presentation and invalid ARIA state.",
      table: { category: "State" },
    },
    required: {
      control: "boolean",
      description: "Marks the field label as required.",
      table: { category: "State" },
    },
    useDateBounds: {
      control: "boolean",
      description: "Limits selection to 20 August through 10 October 2026.",
      table: { category: "Availability" },
    },
    useUnavailableDate: {
      control: "boolean",
      description: "Marks day 23 of each visible month unavailable.",
      table: { category: "Availability" },
    },
    useUnavailableTime: {
      control: "boolean",
      description: "Rejects 13:xx timed drafts and disables Confirm.",
      if: { arg: "granularity", neq: "day" },
      table: { category: "Availability" },
    },
    placement: {
      control: "select",
      description: "Chooses the preferred popup placement around the field.",
      options: [
        "bottom-start",
        "bottom",
        "bottom-end",
        "top-start",
        "top",
        "top-end",
      ],
      table: { category: "Popup" },
    },
    offset: {
      control: { max: 32, min: 0, step: 1, type: "number" },
      description: "Sets the main-axis distance from the field in pixels.",
      table: { category: "Popup" },
    },
    flip: {
      control: "boolean",
      description:
        "Allows fallback placement when preferred space is unavailable.",
      table: { category: "Popup" },
    },
    slide: {
      control: "boolean",
      description: "Keeps the popup inside the viewport by sliding it.",
      table: { category: "Popup" },
    },
    onOpenChange: { control: false, table: { disable: true } },
    onValueChange: { control: false, table: { disable: true } },
  },
  parameters: {
    layout: "padded",
    controls: {
      disable: false,
      expanded: true,
      include: [
        "selectionMode",
        "granularity",
        "initialValue",
        "valueKind",
        "defaultOpen",
        "size",
        "locale",
        "numOfMonths",
        "startOfWeek",
        "shouldForceLeadingZeros",
        "hourCycle",
        "hideTimeZone",
        "disabled",
        "readOnly",
        "invalid",
        "required",
        "useDateBounds",
        "useUnavailableDate",
        "useUnavailableTime",
        "placement",
        "offset",
        "flip",
        "slide",
      ],
    },
    docs: {
      description: {
        story:
          "Try typing a delivery date or choosing it from the calendar, then use Controls to compare date ranges, time precision, field sizes, and unavailable dates for your form.",
      },
    },
  },
  render: (args) => (
    <DatePickerPlaygroundScenario
      {...args}
      key={`${args.selectionMode}-${args.granularity}-${args.valueKind}-${args.initialValue}-${args.defaultOpen}`}
    />
  ),
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare small, medium, and large fields to choose a density that matches the surrounding form controls.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          fullWidth
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
        >
          <DateOnlyField
            defaultValue={new CalendarDate(2026, 8, 31)}
            label="Delivery date"
            size={size}
          />
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
  render: () => (
    <DateOnlyField
      disabled
      label="Delivery date"
      defaultValue={new CalendarDate(2026, 8, 31)}
    />
  ),
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
  render: () => (
    <DateOnlyField
      readOnly
      label="Delivery date"
      defaultValue={new CalendarDate(2026, 8, 31)}
    />
  ),
}

export const FeedbackAndReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Mounted error feedback is linked to every date segment, and switching to read-only closes the calendar without committing a draft.",
      },
    },
  },
  render: () => {
    const [readOnly, setReadOnly] = useState(false)
    const [invalid, setInvalid] = useState(true)
    return (
      <div className="flex w-full max-w-md flex-col gap-200">
        <DateOnlyField
          label="Delivery date"
          defaultValue={new CalendarDate(2026, 8, 31)}
          readOnly={readOnly}
          invalid={invalid}
        />
        <Button theme="outlined" onClick={() => setReadOnly((value) => !value)}>
          Toggle read-only
        </Button>
        <Button theme="outlined" onClick={() => setInvalid((value) => !value)}>
          Toggle validation
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const segment = canvas.getAllByRole("spinbutton")[0]
    if (!segment) throw new Error("A date segment must be focusable")
    await expect(segment).toHaveAttribute("aria-invalid", "true")
    await expect(segment).toHaveAccessibleDescription(
      "Choose an available date before continuing."
    )
    await userEvent.click(canvas.getByRole("button", { name: "Open calendar" }))
    const day = await within(canvasElement.ownerDocument.body).findByRole(
      "button",
      {
        name: /Monday, August 31, 2026/,
      }
    )
    day.focus()
    await expect(day).toHaveFocus()
    // A programmatic parent update must not rely on the toggle taking focus.
    fireEvent.click(canvas.getByRole("button", { name: "Toggle read-only" }))
    await waitFor(() => expect(segment).toHaveFocus())
    const value = segment.getAttribute("aria-valuenow")
    await userEvent.keyboard("{ArrowUp}")
    await expect(segment).toHaveAttribute("aria-valuenow", value ?? "8")
    await expect(segment).toHaveFocus()
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle validation" })
    )
    await expect(segment).not.toHaveAttribute("aria-invalid", "true")
    await expect(segment).not.toHaveAttribute("aria-errormessage")
  },
}

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare disabled, read-only, invalid, and required fields to see which interactions remain available in each state.",
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
        <DatePicker.Root invalid>
          <DatePicker.Label>Delivery date</DatePicker.Label>
          <DatePicker.Control>
            <DatePicker.Segments />
          </DatePicker.Control>
          <DatePicker.StatusText>
            Choose a delivery date before continuing.
          </DatePicker.StatusText>
        </DatePicker.Root>
        <DateOnlyField label="Required" required />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const DateOnlyCalendar: Story = {
  name: "Single date",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Open the calendar and choose a delivery date, including muted days from neighboring months, to see a date-only field save the selection immediately.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md">
      <DateOnlyField
        id="date-picker-date-only-open"
        label="Delivery date"
        locale="en-US"
      />
    </div>
  ),
}

export const DateRangeCalendar: Story = {
  name: "Date range",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Choose the start and end of a reporting period across two independently navigable calendars to see how the selected interval stays highlighted.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
      <DateRangeField
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
    <div className="w-full max-w-lg space-y-200">
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
  name: "Controlled date range",
  tags: ["!dev"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Edit a reporting period whose accepted value is owned by the parent to see how a controlled range updates.",
      },
    },
  },
  render: () => <ControlledRangeExample />,
}

function RejectingControlledRangeExample() {
  const [open, setOpen] = useState(false)
  const [proposal, setProposal] = useState("No proposal yet")
  const hasCompleteProposal = useRef(false)

  return (
    <div className="w-full max-w-lg space-y-200">
      <DateRangeField
        endName="reportingEnd"
        id="date-picker-rejecting-controlled-range"
        label="Rejecting controlled reporting period"
        onOpenChange={({ open: nextOpen }) => {
          if (nextOpen || hasCompleteProposal.current) {
            setOpen(nextOpen)
          }
        }}
        onValueChange={(details) => {
          hasCompleteProposal.current = true
          setProposal(details.valueAsString.join(" – "))
        }}
        open={open}
        startName="reportingStart"
        value={null}
      />
      <output data-testid="date-picker-range-proposal">{proposal}</output>
    </div>
  )
}

export const RejectingControlledDateRange: Story = {
  name: "Rejected range changes",
  tags: ["!dev"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Choose a complete range that the parent deliberately rejects to verify that the accepted form value remains unchanged.",
      },
    },
  },
  render: () => <RejectingControlledRangeExample />,
}

function RangeFormSerializationExample() {
  const [serialized, setSerialized] = useState("Submit to read both endpoints")

  return (
    <form
      className="w-full max-w-lg space-y-200"
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
  name: "Date range form values",
  tags: ["!dev"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Submit a reporting period to inspect its two named form values and understand how range endpoints are serialized.",
      },
    },
  },
  render: () => <RangeFormSerializationExample />,
}

export const LocalizedUnavailableRange: Story = {
  name: "Date limits and Czech locale",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Choose a reporting period in a Czech, Monday-first calendar to see how date limits and unavailable days prevent impossible bookings.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
      <DateRangeField
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
  name: "Time precision and keyboard editing",
  parameters: {
    docs: {
      description: {
        story:
          "Compare hour, minute, and second precision, using typing, ArrowUp/ArrowDown, and Home/End to edit the time before confirming an appointment.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Choose the time precision your task needs">
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
  name: "Date and time",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Schedule an appointment by choosing a date and editing its time, then use Confirm to save both together or Cancel to keep the previous appointment.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md">
      <TimedField
        defaultValue={new CalendarDateTime(2026, 8, 31, 14, 30)}
        granularity="minute"
        hourCycle={24}
        id="date-picker-timed-draft-open"
        label="Appointment"
      />
    </div>
  ),
}

export const InitiallyOpenDateTimeRange: Story = {
  name: "Date and time range",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Set a reporting interval with separate start and end times, then save both endpoints together so a partially edited range never becomes the accepted value.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
      <TimedRangeField
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
  name: "Time zone and daylight saving",
  tags: ["!dev"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Edit a Prague reporting interval spanning a daylight-saving change to see each endpoint retain its correct time-zone offset.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
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
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<DatePickerTimedValue | null>(
    new CalendarDateTime(2026, 8, 31, 14, 30)
  )

  return (
    <div className="w-full max-w-md space-y-200">
      <TimedField
        granularity="minute"
        hourCycle={24}
        label="Externally synchronized appointment"
        onOpenChange={({ open }) => setOpen(open)}
        onValueChange={({ value: nextValue }) => setValue(nextValue)}
        open={open}
        value={value}
      />
      <Button
        data-testid="date-picker-external-resync"
        onClick={() => setValue(new CalendarDateTime(2026, 9, 2, 16, 45))}
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
  name: "External appointment updates",
  tags: ["!dev"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Open the calendar, then apply an external appointment value to see an in-progress time draft resynchronize with the parent.",
      },
    },
  },
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
  name: "Parent-controlled date changes",
  tags: ["!dev"],
  parameters: {
    docs: {
      description: {
        story:
          "Compare parents that accept, reject, delay, or adjust a date change to understand which value the field displays.",
      },
    },
  },
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
    "Submit the form to read the wire value"
  )

  return (
    <form
      className="w-full max-w-md space-y-200"
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
  name: "Clear and submit a date",
  tags: ["!dev"],
  parameters: {
    docs: {
      description: {
        story:
          "Clear or submit a delivery date to inspect the canonical form value without confusing it with localized display text.",
      },
    },
  },
  render: () => <FormSerializationExample />,
}

export const LocalesAndLongLabels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare Czech and English date order, week starts, and a long delivery label to design a field that works across locales.",
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
  "2026-08-31T14:30+02:00[Europe/Prague]"
)

export const TypedDateTimeValues: Story = {
  name: "Local and zoned appointments",
  tags: ["!dev"],
  parameters: {
    docs: {
      description: {
        story:
          "Compare a local appointment with one explicitly tied to Prague to choose whether the time zone belongs in your domain value.",
      },
    },
  },
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

export const FieldRegressions: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Focused regression fixtures for timezone labels, localized entry, availability, native validation and inherited disabling.",
      },
    },
  },
  render: () => <FieldRegressionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const appointment = canvasElement.querySelector<HTMLInputElement>(
      'input[name="appointment"]'
    )!
    const appointmentRoot = appointment.closest('[data-part="root"]')!
    const hour = within(appointmentRoot as HTMLElement).getByRole(
      "spinbutton",
      { name: "Hour" }
    )
    hour.focus()
    await userEvent.keyboard("{ArrowUp}")
    await expect(appointment).toHaveValue("2026-08-31T16:30:00")
    await expect(hour).toHaveAttribute("aria-invalid", "true")
    await userEvent.keyboard("{ArrowDown}")
    await userEvent.click(
      within(appointmentRoot as HTMLElement).getByRole("button", {
        name: "Open calendar",
      })
    )
    const popupHour =
      canvasElement.ownerDocument.querySelector<HTMLInputElement>(
        '[data-scope="date-picker"][data-part="content"] input[aria-label="Hour"]'
      )!
    await userEvent.clear(popupHour)
    await userEvent.type(popupHour, "23")
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole("button", { name: "Confirm" })).toBeDisabled()
    await expect(popupHour).toHaveAttribute("aria-invalid", "true")
    await expect(appointment).toHaveValue("2026-08-31T16:30:00")
    await userEvent.click(body.getByRole("button", { name: "Cancel" }))
    const midnight = canvasElement.querySelector<HTMLInputElement>('input[name="midnight"]')!
    const midnightRoot = within(midnight.closest('[data-part="root"]') as HTMLElement)
    await expect(midnight).toHaveValue("2026-03-01T00:30:00+01:00[Europe/Prague]")
    await expect(midnightRoot.getByRole("spinbutton", { name: "Day" })).toHaveTextContent("28")
    await expect(midnightRoot.getByRole("spinbutton", { name: "Hour" })).toHaveTextContent("23")
    await userEvent.click(midnightRoot.getByRole("button", { name: "Open calendar" }))
    await waitFor(() => expect(body.getByRole("grid", { name: "February 2026" })).toBeVisible())
    const midnightPopup = canvasElement.ownerDocument.querySelector<HTMLElement>('[data-part="content"]')!
    await expect(within(midnightPopup).getByRole("spinbutton", { name: "Hour" })).toHaveValue(23)
    await expect(within(midnightPopup).getByRole("spinbutton", { name: "Minute" })).toHaveValue(30)
    await expect(midnight).toHaveValue("2026-03-01T00:30:00+01:00[Europe/Prague]")
    const midnightMinute = within(midnightPopup).getByRole("spinbutton", { name: "Minute" })
    await userEvent.clear(midnightMinute)
    await userEvent.type(midnightMinute, "31")
    await userEvent.click(body.getByRole("button", { name: "Confirm" }))
    await expect(midnight).toHaveValue("2026-02-28T23:31:00+00:00[UTC]")
    for (const [name, digits] of [
      ["arabicDelivery", "١٢"],
      ["persianDelivery", "۱۲"],
    ] as const) {
      const input = canvasElement.querySelector<HTMLInputElement>(
        `input[name="${name}"]`
      )!
      const root = input.closest('[data-part="root"]')! as HTMLElement
      const day = within(root).getByRole("spinbutton", { name: "Day" })
      day.focus()
      for (const digit of digits)
        fireEvent(
          day,
          new InputEvent("textInput", {
            bubbles: true,
            cancelable: true,
            data: digit,
          })
        )
      await waitFor(() => expect(input).toHaveValue("2026-08-12"))
      await userEvent.tab()
      await expect(input).toHaveValue("2026-08-12")
    }
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle date fieldset" })
    )
    const inherited = canvasElement
      .querySelector<HTMLInputElement>('input[name="fieldsetDate"]')!
      .closest('[data-part="root"]')!
    for (const segment of inherited.querySelectorAll('[role="spinbutton"]')) {
      await expect(segment).not.toHaveAttribute("tabindex", "0")
      await expect(segment).toHaveAttribute("contenteditable", "false")
    }
    await userEvent.click(canvas.getByRole("button", { name: "Submit dates" }))
    const required = canvasElement
      .querySelector<HTMLInputElement>('input[name="requiredDelivery"]')!
      .closest('[data-part="root"]')!
    await expect(required).toContainElement(
      canvasElement.ownerDocument.activeElement as HTMLElement
    )
    await expect(
      within(required as HTMLElement).getByText(
        "Complete every date and time segment before submitting."
      )
    ).toBeVisible()
  },
}
function FieldRegressionExample() {
  const [disabled, setDisabled] = useState(false)
  const [last, setLast] = useState("No change")
  return (
    <div className="flex w-full max-w-lg flex-col gap-300">
      <form
        aria-label="Date regression form"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-300">
          <TimedField
            label="Available appointment"
            name="appointment"
            granularity="minute"
            hourCycle={24}
            defaultValue={new CalendarDateTime(2026, 8, 31, 16, 30)}
            min={new CalendarDateTime(2026, 8, 31, 10)}
            max={new CalendarDateTime(2026, 8, 31, 17)}
            isTimeUnavailable={(date) => date.hour >= 17}
            onValueChange={(details) => setLast(details.valueAsString)}
          />
          <DateOnlyField
            label="Required delivery"
            name="requiredDelivery"
            required
          />
          <DateOnlyField
            label="Arabic delivery"
            name="arabicDelivery"
            locale="ar-EG"
            dir="rtl"
            defaultValue={new CalendarDate(2026, 8, 31)}
          />
          <DateOnlyField
            label="Persian digits"
            name="persianDelivery"
            locale="fa-IR-u-ca-gregory"
            dir="rtl"
            defaultValue={new CalendarDate(2026, 8, 31)}
          />
          <TimedField
            label="Cross-zone midnight"
            name="midnight"
            timeZone="UTC"
            granularity="minute"
            hourCycle={24}
            defaultValue={parseZonedDateTime("2026-03-01T00:30[Europe/Prague]")}
          />
          <DateOnlyField
            label="Prague calendar"
            name="pragueDelivery"
            locale="cs-CZ"
            timeZone="Europe/Prague"
            defaultValue={new CalendarDate(2026, 10, 2)}
          />
          <TimedRangeField
            label="Zoned interval"
            startName="start"
            endName="end"
            granularity="minute"
            locale="en-GB"
            defaultValue={[
              parseZonedDateTime("2026-03-28T14:30[Europe/Prague]"),
              parseZonedDateTime("2026-03-30T14:30[Europe/Prague]"),
            ]}
          />
          <fieldset disabled={disabled} className="min-w-0">
            <legend>Inherited state</legend>
            <DateOnlyField
              label="Fieldset delivery"
              name="fieldsetDate"
              defaultValue={new CalendarDate(2026, 8, 31)}
              onValueChange={(details) => setLast(details.valueAsString)}
            />
          </fieldset>
          <Button type="submit">Submit dates</Button>
        </div>
      </form>
      <Button type="button" onClick={() => setDisabled((value) => !value)}>
        Toggle date fieldset
      </Button>
      <output aria-label="Last accepted date">{last}</output>
    </div>
  )
}


function NativeResetDates() {
  const id = useId()
  const [owner, setOwner] = useState("a")
  const [changes, setChanges] = useState(0)
  const recordChange = () => setChanges((count) => count + 1)
  const [controlled, setControlled] = useState<CalendarDate | null>(
    new CalendarDate(2026, 10, 25)
  )
  const form = `${id}-${owner}`
  const dateRange = [
    new CalendarDate(2026, 10, 20),
    new CalendarDate(2026, 10, 22),
  ] as const
  const timedRange = [
    new CalendarDateTime(2026, 10, 20, 14, 30),
    new CalendarDateTime(2026, 10, 22, 16, 45),
  ] as const
  return (
    <div className="flex w-full min-w-0 max-w-xl flex-col gap-200">
      <form aria-label="Date owner a" id={`${id}-a`} />
      <form aria-label="Date owner b" id={`${id}-b`} />
      <DateOnlyField
        label="Reset date"
        name="date"
        form={form}
        defaultValue={dateRange[0]}
        onValueChange={recordChange}
      />
      <TimedField
        label="Reset date time"
        name="time"
        form={form}
        granularity="minute"
        defaultValue={timedRange[0]}
        onValueChange={recordChange}
      />
      <DateRangeField
        label="Reset date range"
        startName="start"
        endName="end"
        form={form}
        defaultValue={dateRange}
        onValueChange={recordChange}
      />
      <TimedRangeField
        label="Reset timed range"
        startName="timedStart"
        endName="timedEnd"
        form={form}
        granularity="minute"
        defaultValue={timedRange}
        onValueChange={recordChange}
      />
      <DateOnlyField
        label="Controlled reset date"
        name="controlled"
        form={form}
        value={controlled}
        onValueChange={({ value }) => {
          recordChange()
          setControlled(value)
        }}
      />
      <output aria-label="Date reset proposals">{changes}</output>
      <Button
        variant="secondary"
        onClick={() => setOwner((current) => (current === "a" ? "b" : "a"))}
      >
        Move date owner
      </Button>
    </div>
  )
}

export const NativeResetContracts: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Accepted resets restore initial date, clock and range values, cancel popup drafts, preserve controlled authority, and follow external form reassociation.",
      },
    },
  },
  render: () => <NativeResetDates />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const formA = canvas.getByRole("form", {
      name: "Date owner a",
    }) as HTMLFormElement
    const formB = canvas.getByRole("form", {
      name: "Date owner b",
    }) as HTMLFormElement
    const snapshot = (form: HTMLFormElement) =>
      Array.from(new FormData(form).entries())
    const initial = snapshot(formA)
    const segments = () =>
      Array.from(
        canvasElement.querySelectorAll<HTMLElement>("[data-granularity]"),
        (root) =>
          Array.from(root.querySelectorAll('[role="spinbutton"]'), (segment) => ({
            text: segment.textContent,
            value: segment.getAttribute("aria-valuenow"),
          }))
      )
    const initialSegments = segments()
    const changes = canvas.getByLabelText("Date reset proposals")
    for (const root of canvasElement.querySelectorAll<HTMLElement>(
      "[data-granularity]"
    )) {
      await userEvent.click(
        root.querySelector<HTMLElement>('[data-part="clear-trigger"]')!
      )
    }
    const cleared = snapshot(formA)
    const clearedSegments = segments()
    await expect(changes).toHaveTextContent(/^5$/)
    await expect(cleared.every(([, value]) => value === "")).toBe(true)
    formA.addEventListener("reset", (event) => event.preventDefault(), {
      once: true,
    })
    formA.reset()
    await new Promise((resolve) => setTimeout(resolve, 20))
    await expect(snapshot(formA)).toEqual(cleared)
    await expect(segments()).toEqual(clearedSegments)
    await expect(changes).toHaveTextContent(/^5$/)
    await userEvent.click(
      canvas.getByRole("button", { name: "Move date owner" })
    )
    formA.reset()
    await new Promise((resolve) => setTimeout(resolve, 20))
    await expect(snapshot(formB)).toEqual(cleared)
    await expect(segments()).toEqual(clearedSegments)
    await expect(changes).toHaveTextContent(/^5$/)
    const timed =
      canvasElement.querySelectorAll<HTMLElement>("[data-granularity]")[3]!
    await userEvent.click(
      timed.querySelector<HTMLElement>('[data-part="trigger"]')!
    )
    await waitFor(() =>
      expect(
        within(canvasElement.ownerDocument.body).getByRole("button", {
          name: "Confirm",
        })
      ).toBeVisible()
    )
    formB.reset()
    await waitFor(() => expect(changes).toHaveTextContent(/^5$/))
    await waitFor(() =>
      expect(segments()).toEqual([
        ...initialSegments.slice(0, 4),
        clearedSegments[4],
      ])
    )
    await waitFor(() =>
      expect(snapshot(formB)).toEqual(
        initial.map(([name, value]) => [
          name,
          name === "controlled" ? "" : value,
        ])
      )
    )
    await waitFor(() =>
      expect(
        within(canvasElement.ownerDocument.body).queryByRole("button", {
          name: "Confirm",
        })
      ).not.toBeInTheDocument()
    )
  },
}
