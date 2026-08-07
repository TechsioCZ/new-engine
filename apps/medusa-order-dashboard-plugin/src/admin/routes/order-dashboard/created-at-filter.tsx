import {
  CalendarMini,
  CheckMini,
  ChevronDownMini,
  XMarkMini,
} from "@medusajs/icons"
import {
  Button,
  type DataTableDateComparisonOperator,
  DatePicker,
  IconButton,
  Label,
  Popover,
  Tooltip,
} from "@medusajs/ui"
import { useId, useState } from "react"
import { formatOrderDate } from "./format"

type CreatedAtFilterLabels = {
  apply: string
  clear: string
  customRange: string
  end: string
  label: string
  last30Days: string
  last7Days: string
  start: string
  today: string
  yesterday: string
}

type CreatedAtFilterOption = {
  label: string
  value: DataTableDateComparisonOperator
}

type OrderDashboardCreatedAtFilterProps = {
  labels: CreatedAtFilterLabels
  locale?: string
  onChange: (value: DataTableDateComparisonOperator | undefined) => void
  value?: DataTableDateComparisonOperator
}

export function OrderDashboardCreatedAtFilter({
  labels,
  locale,
  onChange,
  value,
}: OrderDashboardCreatedAtFilterProps) {
  const startLabelId = useId()
  const endLabelId = useId()
  const options = getCreatedAtFilterOptions(labels)
  const selectedOption = options.find((option) =>
    isDateFilterValueEqual(option.value, value)
  )
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [draftValue, setDraftValue] =
    useState<DataTableDateComparisonOperator>()
  const displayValue =
    selectedOption?.label ??
    formatCreatedAtFilterValue(value, locale, labels.start, labels.end)
  const canApply = hasDateFilterValue(draftValue) || hasDateFilterValue(value)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)

    if (open) {
      setDraftValue(value ? { ...value } : undefined)
      setShowCustomRange(Boolean(value && !selectedOption))
    } else {
      setShowCustomRange(false)
    }
  }

  const handleRangeChange = (boundary: "$gte" | "$lte", date: Date | null) => {
    setDraftValue((currentValue) => {
      const nextValue = { ...currentValue }

      if (date) {
        nextValue[boundary] = getDateFilterBoundary(date, boundary)
      } else {
        delete nextValue[boundary]
      }

      return hasDateFilterValue(nextValue) ? nextValue : undefined
    })
  }

  const handleApply = () => {
    onChange(draftValue)
    setIsOpen(false)
    setShowCustomRange(false)
  }

  const handleClear = () => {
    setIsOpen(false)
    setShowCustomRange(false)
    onChange(undefined)
  }

  return (
    <div className="flex items-center gap-1">
      <Popover modal onOpenChange={handleOpenChange} open={isOpen}>
        <Popover.Trigger asChild>
          <Button size="small" type="button" variant="secondary">
            <CalendarMini />
            {displayValue ? `${labels.label}: ${displayValue}` : labels.label}
            <ChevronDownMini />
          </Button>
        </Popover.Trigger>
        <Popover.Content
          align="end"
          className="w-[280px] bg-ui-bg-component p-0"
          sideOffset={8}
        >
          <div className="flex flex-col p-1">
            {options.map((option) => (
              <Button
                className="w-full justify-start"
                key={option.label}
                onClick={() => {
                  setShowCustomRange(false)
                  onChange(option.value)
                  setIsOpen(false)
                }}
                size="small"
                type="button"
                variant="transparent"
              >
                <CheckMini
                  className={
                    !showCustomRange &&
                    isDateFilterValueEqual(option.value, value)
                      ? "visible"
                      : "invisible"
                  }
                />
                {option.label}
              </Button>
            ))}
            <Button
              className="w-full justify-start"
              onClick={() => setShowCustomRange(true)}
              size="small"
              type="button"
              variant="transparent"
            >
              <CheckMini
                className={showCustomRange ? "visible" : "invisible"}
              />
              {labels.customRange}
            </Button>
          </div>
          {showCustomRange ? (
            <div className="flex flex-col gap-2 border-t px-3 pt-2 pb-3">
              <div className="flex flex-col gap-1">
                <Label id={startLabelId} size="xsmall" weight="plus">
                  {labels.start}
                </Label>
                <DatePicker
                  aria-labelledby={startLabelId}
                  granularity="day"
                  maxValue={
                    draftValue?.$lte ? new Date(draftValue.$lte) : undefined
                  }
                  onChange={(date) => handleRangeChange("$gte", date)}
                  size="small"
                  value={draftValue?.$gte ? new Date(draftValue.$gte) : null}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label id={endLabelId} size="xsmall" weight="plus">
                  {labels.end}
                </Label>
                <DatePicker
                  aria-labelledby={endLabelId}
                  granularity="day"
                  minValue={
                    draftValue?.$gte ? new Date(draftValue.$gte) : undefined
                  }
                  onChange={(date) => handleRangeChange("$lte", date)}
                  size="small"
                  value={draftValue?.$lte ? new Date(draftValue.$lte) : null}
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  disabled={!canApply}
                  onClick={handleApply}
                  size="small"
                  type="button"
                >
                  {labels.apply}
                </Button>
              </div>
            </div>
          ) : null}
        </Popover.Content>
      </Popover>
      {value ? (
        <Tooltip content={labels.clear}>
          <IconButton
            aria-label={labels.clear}
            onClick={handleClear}
            size="small"
            type="button"
            variant="transparent"
          >
            <XMarkMini />
          </IconButton>
        </Tooltip>
      ) : null}
    </div>
  )
}

function hasDateFilterValue(
  value: DataTableDateComparisonOperator | undefined
) {
  return Boolean(value?.$gte || value?.$lte || value?.$gt || value?.$lt)
}

function getCreatedAtFilterOptions(
  labels: CreatedAtFilterLabels,
  now = new Date()
): CreatedAtFilterOption[] {
  return [
    {
      label: labels.today,
      value: createLocalDateRange(now, 0, 0),
    },
    {
      label: labels.yesterday,
      value: createLocalDateRange(now, 1, 1),
    },
    {
      label: labels.last7Days,
      value: createLocalDateRange(now, 6, 0),
    },
    {
      label: labels.last30Days,
      value: createLocalDateRange(now, 29, 0),
    },
  ]
}

function createLocalDateRange(
  now: Date,
  startDaysAgo: number,
  endDaysAgo: number
): DataTableDateComparisonOperator {
  const start = new Date(now)
  start.setDate(start.getDate() - startDaysAgo)
  start.setHours(0, 0, 0, 0)

  const end = new Date(now)
  end.setDate(end.getDate() - endDaysAgo)
  end.setHours(23, 59, 59, 999)

  return {
    $gte: start.toISOString(),
    $lte: end.toISOString(),
  }
}

function isDateFilterValueEqual(
  left: DataTableDateComparisonOperator,
  right: DataTableDateComparisonOperator | undefined
) {
  return Boolean(
    right &&
      left.$gte === right.$gte &&
      left.$lte === right.$lte &&
      left.$gt === right.$gt &&
      left.$lt === right.$lt
  )
}

function getDateFilterBoundary(date: Date, boundary: "$gte" | "$lte") {
  const normalizedDate = new Date(date)

  if (boundary === "$gte") {
    normalizedDate.setHours(0, 0, 0, 0)
  } else {
    normalizedDate.setHours(23, 59, 59, 999)
  }

  return normalizedDate.toISOString()
}

function formatCreatedAtFilterValue(
  value: DataTableDateComparisonOperator | undefined,
  locale: string | undefined,
  startLabel: string,
  endLabel: string
) {
  if (!(value?.$gte || value?.$lte)) {
    return
  }

  const start = value.$gte ? formatOrderDate(value.$gte, locale) : undefined
  const end = value.$lte ? formatOrderDate(value.$lte, locale) : undefined

  if (start && end) {
    return start === end ? start : `${start}\u2013${end}`
  }

  return start ? `${startLabel} ${start}` : `${endLabel} ${end}`
}
