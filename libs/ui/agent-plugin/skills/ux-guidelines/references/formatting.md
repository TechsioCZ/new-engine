# Dates, numbers and alignment

Format every value through `Intl` with **one app locale** (from the i18n layer
or the request), never by string concatenation. Create formatters once per
locale (module scope or `useMemo`) and reuse them.

```ts
// apps/<app>/src/lib/format.ts — one place per app
export const formatters = (locale: string, currency = "EUR") => ({
  money: new Intl.NumberFormat(locale, { style: "currency", currency }),
  count: new Intl.NumberFormat(locale),
  percent: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }),
  compact: new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }),
  date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
  dateTime: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
  time: new Intl.DateTimeFormat(locale, { timeStyle: "short" }),
  relative: new Intl.RelativeTimeFormat(locale, { numeric: "auto" }),
})
```

## Locale defaults in the kit

Kit components format with their own defaults when no locale is passed, and the
defaults differ: `NumericInput` defaults to `cs-CZ`, `DatePicker` to `en-US`.
**Always pass the app locale explicitly** (`locale={locale}`) to every
locale-aware component (`NumericInput`, `FormNumericInput`, `DatePicker`,
`PhoneInput`, `Chart` value formatters) so one screen never mixes `1 234,50`
with `1,234.50`.

## Dates and times

| Context | Format | en-GB | cs-CZ |
| --- | --- | --- | --- |
| Tables, lists, detail values | `dateStyle: "medium"` | `4 Sept 2026` | `4. 9. 2026` |
| With time (audit, orders) | `dateStyle: "medium", timeStyle: "short"` | `4 Sept 2026, 14:05` | `4. 9. 2026 14:05` |
| Headlines, emails, invoices | `dateStyle: "long"` | `4 September 2026` | `4. září 2026` |
| Activity feeds, comments, "last seen" (< 7 days) | `RelativeTimeFormat` | `2 hours ago`, `yesterday` | `před 2 hodinami` |
| Ranges | `formatRange` | `4 – 12 Sept 2026` | `04.09.2026 – 12.09.2026` |

- **Never render ISO strings** (`2026-09-04`, `2026-08-11 10:03`) or
  `Date.toString()` to users. ISO is for data, URLs and `<time dateTime>`.
- **Relative time always has the absolute value available**: wrap it in
  `<time dateTime={iso} title={formatters.dateTime.format(d)}>`.
  Switch to absolute after 7 days — "43 days ago" is harder to use than a date.
- **Time zones:** show times in the viewer's zone; when the zone matters
  (shipping cut-offs, scheduled publishing), add it: `timeZoneName: "short"`.
- **Ambiguous numeric dates** (`01/02/03`) are forbidden; let `Intl` choose.
- **Date inputs** use `DatePicker` with the app locale; the typed format
  follows the locale automatically — do not add a hand-written format hint that
  disagrees with it.
- Use a 24-hour clock unless the locale prefers 12-hour; `Intl` decides — do
  not force `hour12`.

## Numbers, currency, units

- **Currency:** `style: "currency"` with the ISO code. The symbol, its
  position and spacing come from the locale (`€12.50`, `12,50 €`, `12,50 Kč`).
  Never `"$" + n.toFixed(2)` or `` `${n.toFixed(2)} Kč` ``.
- **Same precision within a column**: prices always 2 decimals (or always 0 for
  whole-unit currencies like CZK in listings); percentages always 0 or 1.
- **Thousands separators always** (`Intl` adds them). Use `notation: "compact"`
  (`1.2K`) only for dashboards/stat tiles, never in tables or forms where the
  exact value matters.
- **Negative values** use the locale's minus sign from `Intl`; don't rely on red
  colour alone — keep the sign (and `signDisplay: "exceptZero"` for deltas:
  `+12%`, `-3%` in en-GB).
- **Units:** put the unit in the column header or label when every value shares
  it (`Weight (kg)`, `Price (€)`), otherwise use `style: "unit"`
  (`unit: "kilogram"`). Don't repeat the unit in every cell *and* the header.
- **Quantities and counts** are integers formatted with separators:
  `count.format(4188)` → `4,188` / `4 188`.
- **Identifiers are not numbers.** Order numbers, SKUs, phone numbers, postal
  codes, IBANs are text: no thousands separators, start-aligned, copyable.

## Alignment in tables

| Column content | Alignment | How |
| --- | --- | --- |
| Money, quantities, counts, percentages, measurements, durations | end (right in LTR) | `Table.Cell numeric` / DataTable `meta: { align: "end" }` |
| Text, names, identifiers (SKU, order #), emails | start | default |
| Dates and times | start | default (fixed-width formats line up on their own) |
| Status badges, short enums | start | default |
| Booleans shown as icon/check, single icons | center | `align: "center"` |
| Row actions | end | the DataTable actions column already is |

- **The header aligns with its column** — `Table.ColumnHeader numeric` for
  numeric columns, same `meta.align` in DataTable (it applies to both).
- **Tabular figures:** numeric cells use `tabular-nums` so digits line up and
  values don't jitter while updating (the DatePicker segments already do).
  Add the class on the cell content until `Table`'s `numeric` applies it itself.
- **Totals** repeat the column's alignment and precision, separated by a top
  border, label start-aligned in the first column.
- **Don't center numbers** and don't right-align text to "balance" a table.
- In forms, `NumericInput` keeps its own alignment; don't right-align regular
  text inputs.

## Empty and missing values

| Case | Render |
| --- | --- |
| Value not set / not applicable | `—` (em dash), with `aria-label="Not set"` when it is the only content |
| Zero that is a real value | `0` / `€0.00` (zero stock is data, not absence) |
| Loading | Skeleton of the same width, never `—` or `0` |
| Failed to load | error state for the section, not per cell |

Special meanings get words, not symbols: stock `0` in a stock column can be
rendered `Out of stock` (with danger tone) when that is what the user acts on —
decide once per column and apply it to every row.
