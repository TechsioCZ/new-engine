<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/datepicker--2877-298.md (+ datepicker-calendarday, -content, -periodview, -timecontrol), edited. Storybook: Molecules/DatePicker → UX guidelines. -->

# DatePicker: UX guidelines

DatePicker enters a date, a date-time or a date range in one field, by typing
segments or picking from a calendar. Browsing the calendar never confirms a
date.

## When to use

- A specific date or date-time: delivery date, publish schedule, birth date,
  reporting period.
- Users benefit from both typing and picking, and the process defines the
  available dates, precision and time zone.

## Use something else when

| Need | Use instead |
| --- | --- |
| Showing a date | formatted text (`Intl.DateTimeFormat`) |
| Relative choices (`Last 7 days`, `This month`) | `Select` or `RadioGroup` of presets; presets aren't part of DatePicker |
| A time of day with its own lifecycle | a separate time control |

## Anatomy

- **Field**: `DatePicker.Label`, `Control` → `Segments` and
  `IndicatorGroup` (`ClearTrigger`, `Trigger`); `StatusText` for help and
  errors. Range mode renders separate start and end segments.
- **Calendar panel**: `Positioner` → `Content` → `Calendar`. The month and
  year views open from the calendar heading (Figma "PeriodView"); they are
  views, not separate parts.
- **Time** (timed modes only): `TimeControl` with separate Start time and End
  time groups in range mode, and a `Footer` with `CancelTrigger` before
  `ConfirmTrigger`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding controls. |
| `selectionMode=single` / `range` | `selectionMode` | One date, or a range with a clear start and end. |
| `granularity=day` / `hour` / `minute` / `second` | `granularity` | Precision. Use `second` only when the process really needs it. |
| `state=default` | — | No known problem; not proof of validation or saving. |
| `state=error` | `invalid` + `DatePicker.StatusText` | A specific, fixable problem; the draft stays to fix. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | Segments readable and copyable, value submitted; calendar and clear are hidden. |
| day `today` | automatic | Today's date (outlined). Never the same as selected. |
| day `selected`, `range-start`, `range-end`, `in-range` | the value | The chosen day or the range ends and span. |
| day `unavailable` | `min`, `max`, `isDateUnavailable` | Can't be chosen by the process rules; struck through. |
| day `outside` | automatic | A neighbouring-month day; still selectable unless unavailable. Muted is not disabled. |
| day `density=timed`, `hover` | not props | Layout in timed mode; browser hover. |

## Behaviour

**May:** choose an available day or range ends; in timed modes, adjust the
time of the right date or range end.

**Must not:** confuse today with the selected day; confirm an incomplete range
or an unavailable date by changing the shown month.

- Changing the month or year only changes the view.
- Date-only: a calendar choice commits at once (a range after its second
  end). Timed: calendar and time edits stay a draft until Confirm; Cancel,
  Escape or closing discards them
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- An incomplete range stays visible to finish but never reaches the value,
  `onValueChange` or the form.
- Read-only can't change or clear the value.
- Validate ranges that cross midnight with the dates, not only the clock
  order, and keep the end date visible.

## Content and copy

- The label names the meaning: `Delivery date`, `Publish at` — cs:
  `Datum doručení`, `Publikovat`. Not just `Date`.
- Pass the app `locale`; the segment order and formats come from it. Don't add
  a format hint that disagrees.
- Validation names the allowed range in formatted dates:
  `Choose a date between 4 Sept 2026 and 30 Sept 2026` — cs:
  `Vyberte datum mezi 4. 9. 2026 a 30. 9. 2026`.
- Say why dates are unavailable in help text: `Delivery from 2 working days` —
  cs: `Doručení nejdříve za 2 pracovní dny`.
- Show the time zone when it matters (publishing, cut-offs).

## Accessibility

- The kit provides keyboard-editable segments, an accessible calendar grid,
  named Clear, Calendar, Cancel and Confirm triggers, and links help and
  error text to every segment.
- Today, selected and unavailable differ by more than colour (outline, fill,
  strike-through).
- In range mode, start and end segments and time groups are named separately.

## Edge cases

- **Rejected date** (supplier can't deliver then): explain the available
  option; the entered value stays to fix.
- **Unavailable day inside a range**: whether the range is valid follows the
  service's rules, not just the cell colour.
- **Overnight shift** (22:00 → 06:00): allowed only when the process says so,
  with the end date visible.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft until Confirm, Cancel restores.
- [Formatting](../../ux-guidelines/references/formatting.md): dates and locale defaults.
- [States](../../ux-guidelines/references/states.md): read-only vs disabled.
