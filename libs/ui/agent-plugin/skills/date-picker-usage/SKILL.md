---
component_version: "1.1.0"
name: date-picker-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit DatePicker
  for locale-aware segmented date entry, calendar selection, optional
  transactional time entry, single or range typed values, and canonical form
  serialization through one integrated field.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/date-picker.tsx"
  - "libs/ui/src/tokens/components/molecules/_date-picker.css"
  - "libs/ui/stories/molecules/date-picker.stories.tsx"
  - "https://zagjs.com/components/react/date-input"
  - "https://zagjs.com/components/react/date-picker"
  - "https://react-aria.adobe.com/internationalized/date/"
---

# @techsio/ui-kit DatePicker Usage

Use DatePicker when a user should type a locale-aware date in segments or pick
it from a calendar. Set `granularity` to `hour`, `minute`, or `second` when the
same field must also collect a time. Use separate domain controls when date and
time have independent lifecycles.

## Setup

Date-only selection uses `CalendarDate | null` and commits a calendar choice
immediately:

```tsx
import { CalendarDate } from "@internationalized/date"
import { DatePicker } from "@techsio/ui-kit/molecules/date-picker"

<DatePicker.Root
  defaultValue={new CalendarDate(2026, 8, 31)}
  name="deliveryDate"
>
  <DatePicker.Label>Delivery date</DatePicker.Label>
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
```

Range selection uses a complete readonly tuple. It defaults to two coordinated
months and renders distinct start/end segment groups in the same field:

```tsx
import { CalendarDate } from "@internationalized/date"
import { DatePicker } from "@techsio/ui-kit/molecules/date-picker"

<DatePicker.Root
  selectionMode="range"
  defaultValue={[
    new CalendarDate(2026, 9, 5),
    new CalendarDate(2026, 9, 18),
  ]}
  startName="reportingStart"
  endName="reportingEnd"
>
  <DatePicker.Label>Reporting period</DatePicker.Label>
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
```

Timed selection uses `CalendarDateTime | ZonedDateTime | null`. Include the
time control and transaction footer:

```tsx
import { CalendarDateTime } from "@internationalized/date"
import { DatePicker } from "@techsio/ui-kit/molecules/date-picker"

<DatePicker.Root
  defaultValue={new CalendarDateTime(2026, 8, 31, 14, 30)}
  granularity="minute"
  hourCycle={24}
>
  <DatePicker.Label>Appointment</DatePicker.Label>
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
```

## Public Contract

```text
granularity: day | hour | minute | second
selectionMode: single | range
size: sm | md | lg
value/defaultValue:
  day -> CalendarDate | null
  timed -> CalendarDateTime | ZonedDateTime | null
  day range -> readonly [CalendarDate, CalendarDate] | null
  timed range -> readonly [CalendarDateTime, CalendarDateTime] | null
              | readonly [ZonedDateTime, ZonedDateTime] | null
onValueChange: ({ value, valueAsString }) => void
open/defaultOpen/onOpenChange
locale, timeZone, hourCycle, hideTimeZone, shouldForceLeadingZeros
min, max, startOfWeek, numOfMonths, isDateUnavailable, isTimeUnavailable
disabled, readOnly, invalid, required
single: name, form
range: startName, endName, form
placement, gutter, offset, flip, sameWidth, slide, overflowPadding
```

## Core Patterns

### Keep one typed value shape

Use `CalendarDate` for a calendar date without time. Use `CalendarDateTime` for
a floating wall-clock date-time, or provide a `ZonedDateTime` explicitly when
the zone is part of the domain value. Do not pass Zag's internal arrays or a
native JavaScript `Date`.

Range mode uses only complete two-value tuples. A one-ended range is private
input/calendar state and never appears in `value`, `onValueChange`, or form
serialization. Timed tuples must contain two floating `CalendarDateTime`
values or two `ZonedDateTime` values; never mix the kinds.

```tsx
const [value, setValue] = useState<CalendarDate | null>(null)

<DatePicker.Root
  value={value}
  onValueChange={(details) => setValue(details.value)}
>
  {/* canonical date-only compound parts */}
</DatePicker.Root>
```

`timeZone` controls presentation and calendar calculations. It does not turn a
floating `CalendarDateTime` into a zoned value.

Date-only range selection commits after the second valid endpoint. The first
endpoint stays private and the popup remains open. `numOfMonths` defaults to
two in range mode and one in single mode.

### Treat timed popups as transactions

In `hour`, `minute`, and `second` modes, calendar and time edits stay private
until Confirm. Cancel, Escape, outside dismissal, and trigger dismissal discard
the draft. The main segments continue to show the accepted value and become
read-only while the popup is open.

Timed range mode follows the same single transaction for both endpoints.
`DatePicker.TimeControl` renders separate Start time and End time groups, while
one Cancel/Confirm footer accepts or discards the whole interval.
Its hour, minute, second, and day-period fields intentionally keep the compact
`sm` control density at every DatePicker root size so the calendar remains the
primary surface.

The first day selected in an empty timed picker is intentionally incomplete.
Enter the required time before Confirm becomes available. Do not add app-side
callbacks that treat intermediate popup edits as committed values.

### Let a controlled parent remain authoritative

`onValueChange` proposes only a committed value. A controlled parent may
accept, reject, delay, or transform it; render the `value` prop as the source of
truth. If `value` changes externally while a timed draft is open, DatePicker
resynchronizes the draft to that accepted value.

### Use the root-owned form value

Set `name` in single mode. Set explicit `startName` and `endName` in range
mode. The root renders one or two hidden form controls from the accepted value.
Serialization is `DateValue.toString()` and never localized display text:

```text
CalendarDate     -> 2026-08-31
CalendarDateTime -> 2026-08-31T14:30:00
ZonedDateTime    -> offset- and zone-preserving string
null             -> empty string
range null       -> two empty strings
```

Do not add another hidden input with the same name. `required` and `invalid`
communicate field state, but hidden-input native constraint validation is not
part of the contract.

### Preserve the accessible compound anatomy

Use one `DatePicker.Label`, then Control with Segments and the trigger group.
Keep Content inside Positioner. In timed modes, keep TimeControl and the
Cancel/Confirm footer inside Content. The high-level Segments, Calendar, and
TimeControl parts preserve the private Zag Date Input and Date Picker wiring.

Use meaningful label text. The default Clear, Calendar, Cancel, and Confirm
trigger labels are accessible; replace their children only with equally clear
content or an accessible name.

## Non-Goals

The 1.1 API does not support multiple dates, presets, quick ranges, month-only
selection, custom date-cell rendering, raw Zag anatomy, a custom serializer,
public partial ranges, or native `Date` values. Do not build those behaviors by
reaching through the compound component's internals.

## Common Mistakes

### HIGH Separate custom date and time controls

Wrong:

```tsx
<input type="date" />
<input type="time" />
```

Correct:

```tsx
<DatePicker.Root granularity="minute">
  <DatePicker.Control>
    <DatePicker.Segments />
    <DatePicker.Trigger />
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
```

Source: libs/ui/src/molecules/date-picker.tsx

### HIGH Native Date or incomplete/mixed range

Wrong:

```tsx
<DatePicker.Root selectionMode="range" value={[new Date()]} />
```

Correct:

```tsx
<DatePicker.Root
  selectionMode="range"
  value={[
    new CalendarDate(2026, 8, 31),
    new CalendarDate(2026, 9, 7),
  ]}
/>
```

Source: https://react-aria.adobe.com/internationalized/date/

### HIGH Committing timed popup edits outside Confirm

Wrong:

```tsx
<DatePicker.Root granularity="minute" onDraftValueChange={saveAppointment} />
```

Correct:

```tsx
<DatePicker.Root granularity="minute" onValueChange={saveConfirmedAppointment} />
```

There is no public draft callback in the 1.1 contract.

### HIGH Duplicate form ownership

Wrong:

```tsx
<DatePicker.Root name="appointment">{/* parts */}</DatePicker.Root>
<input name="appointment" type="hidden" />
```

Correct:

```tsx
<DatePicker.Root name="appointment">{/* parts */}</DatePicker.Root>
```

In range mode, use `startName` and `endName` instead of `name`.

## Validation Commands

```sh
rg -n '<input[^>]*type="(date|datetime-local|time)"|new Date\(' apps
rg -n '<DatePicker\.Root[^>]*(onDraftValueChange|closeOnSelect|commitMode)' apps
rg -n '<DatePicker\.Root[^>]*selectionMode="range"[^>]*name=' apps
rg -U -P -n '<DatePicker\.Root(?![\s\S]{0,900}<DatePicker\.Segments)' apps
rg -U -P -n '<DatePicker\.Root[^>]*name=(?![\s\S]{0,900}<DatePicker\.Calendar)' apps
```
