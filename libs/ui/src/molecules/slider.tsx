import { normalizeProps, useMachine } from "@zag-js/react"
import * as slider from "@zag-js/slider"
import { useId } from "react"
import type { VariantProps } from "tailwind-variants"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { slugify, tv } from "../utils"

const sliderVariants = tv({
  slots: {
    root: [
      "flex w-full flex-col gap-slider-root",
      "data-[orientation=vertical]:h-full",
      "data-disabled:cursor-not-allowed",
    ],
    header: ["flex items-center justify-between"],
    value: ["text-slider-value-size"],
    label: ["block font-medium"],
    control: [
      "relative grid place-items-center",
      "data-[orientation=vertical]:h-full data-[orientation=vertical]:grid-rows-1",
    ],
    track: [
      "flex-1 rounded-slider-track bg-slider-track-bg",
      "data-[orientation=horizontal]:w-full",
      "data-[orientation=vertical]:h-full",
      "data-disabled:bg-slider-bg-disabled",
      "border-(length:--border-width-slider) border-slider-border",
      "data-disabled:border-slider-border-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
      "hover:bg-slider-track-bg-hover",
      "data-[invalid=true]:border-(length:--border-width-validation)",
      "data-[invalid=true]:border-slider-border-error",
    ],
    range: [
      "h-full rounded-slider-track bg-slider-range-bg",
      "data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-full",
      "data-disabled:bg-slider-range-bg-disabled",
      "hover:bg-slider-range-bg-hover",
      "data-[invalid=true]:bg-slider-range-bg-error",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    thumb: [
      "flex items-center justify-center",
      "rounded-slider-thumb bg-slider-thumb-bg",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-slider-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "focus-visible:scale-110",
      "data-disabled:bg-slider-thumb-bg-disabled",
      "border-(length:--border-width-slider) border-slider-border",
      "data-disabled:border-slider-border-disabled",
      "hover:bg-slider-thumb-bg-hover",
      "cursor-grab data-disabled:cursor-not-allowed data-dragging:cursor-grabbing",
      "shadow-slider-thumb",
    ],
    markerGroup: ["relative flex h-full items-center"],
    marker: [
      "relative flex h-full flex-col items-center justify-center",
      "data-[orientation=vertical]:w-full",
      "data-[orientation=vertical]:h-marker-vertical",
      "data-[orientation=vertical]:flex-row",
    ],
    markerLine: [
      "h-full w-slider-marker bg-slider-marker-bg",
      "data-[orientation=vertical]:h-slider-marker data-[orientation=vertical]:w-full",
    ],
    markerText: [
      "absolute top-full",
      "data-[orientation=vertical]:top-0 data-[orientation=vertical]:left-full",
      "data-[orientation=vertical]:h-full",
      "data-[orientation=vertical]:p-marker-text",
    ],
  },
  variants: {
    size: {
      sm: {
        track: [
          "h-slider-track-sm data-[orientation=vertical]:w-slider-track-sm",
        ],
        thumb: ["w-slider-thumb-sm", "h-slider-thumb-sm"],
      },
      md: {
        track: [
          "h-slider-track-md data-[orientation=vertical]:w-slider-track-md",
        ],
        thumb: ["w-slider-thumb-md", "h-slider-thumb-md"],
      },
      lg: {
        track: [
          "h-slider-track-lg data-[orientation=vertical]:w-slider-track-lg",
        ],
        thumb: ["w-slider-thumb-lg", "h-slider-thumb-lg"],
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export interface SliderProps extends VariantProps<typeof sliderVariants> {
  id?: string
  name?: string
  label?: string
  validateStatus?: "default" | "error" | "success" | "warning"
  helpText?: string
  showHelpTextIcon?: boolean
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  step?: number
  minStepsBetweenThumbs?: number
  disabled?: boolean
  readOnly?: boolean
  dir?: "ltr" | "rtl"
  orientation?: "horizontal" | "vertical"
  origin?: "start" | "center" | "end"
  thumbAlignment?: "center" | "contain"
  showMarkers?: boolean
  markerCount?: number
  showValueText?: boolean
  formatRangeText?: (values: number[]) => string
  formatValue?: (value: number) => string
  className?: string
  onChange?: (values: number[]) => void
  onChangeEnd?: (values: number[]) => void
}

const resolveFiniteNumber = (value: number | undefined, fallbackValue: number) => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallbackValue
  }

  return value
}

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, value))
}

const countDecimals = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  const [, decimalPart = ""] = value.toString().split(".")
  return decimalPart.length
}

const roundToStepPrecision = (value: number, step: number) => {
  const precision = countDecimals(step)
  if (precision <= 0) {
    return Math.round(value)
  }

  return Number(value.toFixed(precision))
}

const snapToStep = (value: number, min: number, step: number) => {
  const snappedValue = Math.round((value - min) / step) * step + min
  return roundToStepPrecision(snappedValue, step)
}

const resolveThumbCount = (
  value: number[] | undefined,
  defaultValue: number[] | undefined
) => {
  if (Array.isArray(value) && value.length > 0) {
    return value.length
  }

  if (Array.isArray(defaultValue) && defaultValue.length > 0) {
    return defaultValue.length
  }

  return 2
}

type ResolvedSliderConfig = {
  min: number
  max: number
  step: number
  minStepsBetweenThumbs: number
}

const resolveSliderConfig = (
  min: number | undefined,
  max: number | undefined,
  step: number | undefined,
  minStepsBetweenThumbs: number | undefined,
  thumbCount: number
): ResolvedSliderConfig => {
  const resolvedMin = resolveFiniteNumber(min, 0)
  const resolvedStepCandidate = resolveFiniteNumber(step, 1)
  const resolvedStep = resolvedStepCandidate > 0 ? resolvedStepCandidate : 1
  const maxCandidate = resolveFiniteNumber(max, resolvedMin + resolvedStep)
  const resolvedMax =
    maxCandidate > resolvedMin ? maxCandidate : resolvedMin + resolvedStep
  const span = resolvedMax - resolvedMin
  const stepsInSpan = Math.max(
    0,
    Math.floor((span + Number.EPSILON) / resolvedStep)
  )
  const maxMinStepsBetweenThumbs =
    thumbCount > 1
      ? Math.floor(stepsInSpan / (thumbCount - 1))
      : 0
  const normalizedMinSteps = Math.trunc(
    resolveFiniteNumber(minStepsBetweenThumbs, 0)
  )
  const resolvedMinStepsBetweenThumbs = clampNumber(
    normalizedMinSteps,
    0,
    maxMinStepsBetweenThumbs
  )

  return {
    min: resolvedMin,
    max: resolvedMax,
    step: resolvedStep,
    minStepsBetweenThumbs: resolvedMinStepsBetweenThumbs,
  }
}

const createFallbackValues = (
  thumbCount: number,
  min: number,
  max: number
): number[] => {
  if (thumbCount <= 1) {
    return [min]
  }

  if (thumbCount === 2) {
    return [min, max]
  }

  const span = max - min

  return Array.from({ length: thumbCount }, (_, index) => {
    const ratio = index / (thumbCount - 1)
    return min + span * ratio
  })
}

const normalizeSliderValues = (
  values: number[] | undefined,
  fallbackValues: number[],
  config: ResolvedSliderConfig
): number[] => {
  const sourceValues =
    Array.isArray(values) && values.length > 0 ? values : fallbackValues
  const normalizedValues = sourceValues
    .slice(0, fallbackValues.length)
    .map((rawValue, index) => {
      const fallbackValue = fallbackValues[index] ?? config.min
      const safeValue = resolveFiniteNumber(rawValue, fallbackValue)
      const snappedValue = snapToStep(safeValue, config.min, config.step)
      return clampNumber(snappedValue, config.min, config.max)
    })

  while (normalizedValues.length < fallbackValues.length) {
    normalizedValues.push(fallbackValues[normalizedValues.length] ?? config.min)
  }

  normalizedValues.sort((left, right) => left - right)

  const gap = config.minStepsBetweenThumbs * config.step

  for (let index = 0; index < normalizedValues.length; index += 1) {
    const currentValue = normalizedValues[index] ?? config.min
    const minAllowed =
      index === 0
        ? config.min
        : (normalizedValues[index - 1] ?? config.min) + gap
    normalizedValues[index] = Math.max(currentValue, minAllowed)
  }

  for (let index = normalizedValues.length - 1; index >= 0; index -= 1) {
    const currentValue = normalizedValues[index] ?? config.max
    const maxAllowed =
      index === normalizedValues.length - 1
        ? config.max
        : (normalizedValues[index + 1] ?? config.max) - gap
    normalizedValues[index] = Math.min(currentValue, maxAllowed)
  }

  return normalizedValues.map((rawValue, index) => {
    const minAllowed =
      index === 0
        ? config.min
        : (normalizedValues[index - 1] ?? config.min) + gap
    const maxAllowed =
      index === normalizedValues.length - 1
        ? config.max
        : (normalizedValues[index + 1] ?? config.max) - gap
    const safeValue = rawValue ?? fallbackValues[index] ?? config.min
    const snappedValue = snapToStep(safeValue, config.min, config.step)

    return clampNumber(snappedValue, minAllowed, maxAllowed)
  })
}

const apiValueFallback = (
  value: number[] | undefined,
  defaultValue: number[] | undefined,
  fallbackValues: number[]
) => {
  if (Array.isArray(value) && value.length > 0) {
    return value
  }

  if (Array.isArray(defaultValue) && defaultValue.length > 0) {
    return defaultValue
  }

  return fallbackValues
}

export function Slider({
  id,
  name,
  label,
  validateStatus,
  helpText,
  showHelpTextIcon = true,
  value,
  origin,
  thumbAlignment = "center",
  defaultValue = [25, 75],
  min = 0,
  max = 100,
  step = 1,
  minStepsBetweenThumbs = 0,
  disabled = false,
  readOnly = false,
  dir = "ltr",
  orientation = "horizontal",
  size = "md",
  showMarkers = false,
  markerCount = 5,
  showValueText = false,
  formatRangeText,
  formatValue = (val: number) => val.toString(),
  className,
  onChange,
  onChangeEnd,
}: SliderProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId
  const thumbCount = resolveThumbCount(value, defaultValue)
  const resolvedConfig = resolveSliderConfig(
    min,
    max,
    step,
    minStepsBetweenThumbs,
    thumbCount
  )
  const fallbackValues = createFallbackValues(
    thumbCount,
    resolvedConfig.min,
    resolvedConfig.max
  )
  const isControlled = value !== undefined
  const resolvedValue = isControlled
    ? normalizeSliderValues(value, fallbackValues, resolvedConfig)
    : undefined
  const resolvedDefaultValue = isControlled
    ? undefined
    : normalizeSliderValues(defaultValue, fallbackValues, resolvedConfig)
  const valueTextValues = apiValueFallback(
    resolvedValue,
    resolvedDefaultValue,
    fallbackValues
  )

  const service = useMachine(slider.machine, {
    id: uniqueId,
    name,
    value: resolvedValue,
    defaultValue: resolvedDefaultValue,
    min: resolvedConfig.min,
    max: resolvedConfig.max,
    origin,
    thumbAlignment,
    step: resolvedConfig.step,
    minStepsBetweenThumbs: resolvedConfig.minStepsBetweenThumbs,
    disabled,
    readOnly,
    dir,
    orientation,
    onValueChange: (details) => onChange?.(details.value),
    onValueChangeEnd: (details) => onChangeEnd?.(details.value),
  })

  const api = slider.connect(service, normalizeProps)

  const {
    root,
    label: labelSlot,
    control,
    track,
    range,
    thumb,
    header,
    value: valueSlot,
    markerGroup,
    marker,
    markerLine,
    markerText,
  } = sliderVariants({
    className,
    size,
  })

  return (
    <div className={root({ className })} {...api.getRootProps()}>
      {(label || showValueText) && (
        <div className={header()}>
          <Label className={labelSlot()} {...api.getLabelProps()}>
            {label}
          </Label>
          {showValueText && (
            <output className={valueSlot()} {...api.getValueTextProps()}>
              <b>
                {formatRangeText
                  ? formatRangeText(api.value || valueTextValues)
                  : api.value &&
                      api.value.length === 2 &&
                      api.value[0] !== undefined &&
                      api.value[1] !== undefined
                    ? `${formatValue(api.value[0])} - ${formatValue(api.value[1])}`
                    : ""}
              </b>{" "}
            </output>
          )}
        </div>
      )}

      <div className={control()} {...api.getControlProps()}>
        <div className={track()} {...api.getTrackProps()} data-invalid={validateStatus === "error"}>
          <div
            className={range()}
            {...api.getRangeProps()}
            data-invalid={validateStatus === "error"}
          />
          {showMarkers && (
            <div {...api.getMarkerGroupProps()} className={markerGroup()}>
              {Array.from({ length: markerCount }).map((_, index) => {
                const markerValue =
                  markerCount === 1
                    ? resolvedConfig.min
                    : resolvedConfig.min +
                      ((resolvedConfig.max - resolvedConfig.min) /
                        (markerCount - 1)) *
                        index
                return (
                  <div
                    className={marker()}
                    key={slugify(`marker-${markerValue}`)}
                    {...api.getMarkerProps({ value: markerValue })}
                  >
                    {/* hide first and last marker line, if thumb alignmetn is center */}
                    {!(
                      thumbAlignment === "center" &&
                      (index === 0 || index === markerCount - 1)
                    ) && (
                      <div
                        className={markerLine()}
                        data-orientation={orientation}
                      />
                    )}
                    <span
                      className={markerText()}
                      data-orientation={orientation}
                    >
                      {markerValue}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {api.value.map((_, index) => (
          <div
            className={thumb()}
            key={`thumb-${index}`}
            {...api.getThumbProps({ index })}
          >
            <input {...api.getHiddenInputProps({ index })} />
          </div>
        ))}
      </div>
      {helpText && (
        <StatusText
          status={validateStatus}
          showIcon={showHelpTextIcon}
          size={size}
        >
          {helpText}
        </StatusText>
      )}
    </div>
  )
}
