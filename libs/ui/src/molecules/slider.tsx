/*
 * Slider — @techsio/ui-kit molecule.
 *
 * @component Slider
 * @componentVersion v1.0.1
 * @skill slider-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the slider-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { normalizeProps, useMachine } from "@zag-js/react"
import { connect, machine } from "@zag-js/slider"
import { useId } from "react"
import type { VariantProps } from "tailwind-variants"

import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { slugify, tv } from "../utils"

// Shared by the root, marker text and track slots, declared once so the utility is not repeated.
const verticalFullHeightClass = "data-[orientation=vertical]:h-full"

const sliderVariants = tv({
  defaultVariants: {
    size: "md",
  },
  slots: {
    control: [
      "relative grid place-items-center",
      "data-[orientation=vertical]:h-full data-[orientation=vertical]:grid-rows-1",
    ],
    header: ["flex items-center justify-between"],
    label: ["block font-medium"],
    marker: [
      "relative flex h-full flex-col items-center justify-center",
      "data-[orientation=vertical]:w-full",
      "data-[orientation=vertical]:h-marker-vertical",
      "data-[orientation=vertical]:flex-row",
    ],
    markerGroup: ["relative flex h-full items-center"],
    markerLine: [
      "h-full w-slider-marker bg-slider-marker-bg",
      "data-[orientation=vertical]:h-slider-marker data-[orientation=vertical]:w-full",
    ],
    markerText: [
      "absolute top-full",
      "data-[orientation=vertical]:top-0 data-[orientation=vertical]:left-full",
      verticalFullHeightClass,
      "data-[orientation=vertical]:p-marker-text",
    ],
    range: [
      "h-full rounded-slider-track bg-slider-range-bg",
      "data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-full",
      "data-disabled:bg-slider-range-bg-disabled",
      "hover:bg-slider-range-bg-hover",
      "data-[invalid=true]:bg-slider-range-bg-error",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    root: [
      "flex w-full flex-col gap-slider",
      verticalFullHeightClass,
      "data-disabled:cursor-not-allowed",
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
    track: [
      "flex-1 rounded-slider-track bg-slider-track-bg",
      "data-[orientation=horizontal]:w-full",
      verticalFullHeightClass,
      "data-disabled:bg-slider-track-bg-disabled",
      "border-(length:--border-width-slider) border-slider-border",
      "data-disabled:border-slider-border-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
      "hover:bg-slider-track-bg-hover",
      "data-[invalid=true]:border-(length:--border-width-validation)",
      "data-[invalid=true]:border-slider-border-error",
    ],
    value: ["text-slider-value-size"],
  },
  variants: {
    size: {
      lg: {
        thumb: ["w-slider-thumb-lg", "h-slider-thumb-lg"],
        track: [
          "h-slider-track-lg data-[orientation=vertical]:w-slider-track-lg",
        ],
      },
      md: {
        thumb: ["w-slider-thumb-md", "h-slider-thumb-md"],
        track: [
          "h-slider-track-md data-[orientation=vertical]:w-slider-track-md",
        ],
      },
      sm: {
        thumb: ["w-slider-thumb-sm", "h-slider-thumb-sm"],
        track: [
          "h-slider-track-sm data-[orientation=vertical]:w-slider-track-sm",
        ],
      },
    },
  },
})

type SliderOrigin = "start" | "center" | "end"

type SliderValidateStatus = "default" | "error" | "success" | "warning"

export interface SliderProps extends VariantProps<typeof sliderVariants> {
  id?: string | undefined
  name?: string | undefined
  label?: string | undefined
  validateStatus?: SliderValidateStatus | undefined
  helpText?: string | undefined
  showHelpTextIcon?: boolean | undefined
  value?: number[] | undefined
  defaultValue?: number[] | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  minStepsBetweenThumbs?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  dir?: "ltr" | "rtl" | undefined
  orientation?: "horizontal" | "vertical" | undefined
  origin?: SliderOrigin | undefined
  thumbAlignment?: "center" | "contain" | undefined
  showMarkers?: boolean | undefined
  markerCount?: number | undefined
  showValueText?: boolean | undefined
  formatRangeText?: ((values: number[]) => string) | undefined
  formatValue?: ((value: number) => string) | undefined
  className?: string | undefined
  onChange?: ((values: number[]) => void) | undefined
  onChangeEnd?: ((values: number[]) => void) | undefined
}

// Stable module-level defaults so the prop fallbacks keep referential equality across renders.
const defaultSliderValues: number[] = [25, 75]

const formatSliderValue = (value: number) => value.toString()

const resolveFiniteNumber = (
  value: number | undefined,
  fallbackValue: number,
) => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
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
  defaultValue: number[] | undefined,
) => {
  if (Array.isArray(value) && value.length > 0) {
    return value.length
  }

  if (Array.isArray(defaultValue) && defaultValue.length > 0) {
    return defaultValue.length
  }

  return 2
}

interface ResolvedSliderConfig {
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
  thumbCount: number,
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
    Math.floor((span + Number.EPSILON) / resolvedStep),
  )
  const maxMinStepsBetweenThumbs =
    thumbCount > 1 ? Math.floor(stepsInSpan / (thumbCount - 1)) : 0
  const normalizedMinSteps = Math.trunc(
    resolveFiniteNumber(minStepsBetweenThumbs, 0),
  )
  const resolvedMinStepsBetweenThumbs = clampNumber(
    normalizedMinSteps,
    0,
    maxMinStepsBetweenThumbs,
  )

  return {
    max: resolvedMax,
    min: resolvedMin,
    minStepsBetweenThumbs: resolvedMinStepsBetweenThumbs,
    step: resolvedStep,
  }
}

const createFallbackValues = (
  thumbCount: number,
  min: number,
  max: number,
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
  config: ResolvedSliderConfig,
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

// Mirrors the original nested ternary: a caller-supplied range formatter wins outright, a two-thumb
// slider renders "<start> - <end>", and every other shape renders an empty string. `api.value` is a
// `number[]`, so the original object-truthiness guards were always satisfied and are dropped.
const resolveValueText = (
  values: number[],
  formatRangeText: ((values: number[]) => string) | undefined,
  formatValue: (value: number) => string,
): string => {
  if (formatRangeText !== undefined) {
    return formatRangeText(values)
  }

  const [start, end] = values

  if (values.length === 2 && start !== undefined && end !== undefined) {
    return `${formatValue(start)} - ${formatValue(end)}`
  }

  return ""
}

interface SliderMachineOptions {
  defaultValue: number[] | undefined
  dir: "ltr" | "rtl" | undefined
  disabled: boolean | undefined
  id: string | undefined
  max: number | undefined
  min: number | undefined
  minStepsBetweenThumbs: number | undefined
  name: string | undefined
  onChange: ((values: number[]) => void) | undefined
  onChangeEnd: ((values: number[]) => void) | undefined
  orientation: "horizontal" | "vertical"
  origin: SliderOrigin | undefined
  readOnly: boolean | undefined
  step: number | undefined
  thumbAlignment: "center" | "contain"
  value: number[] | undefined
}

// Owns the bound/value normalisation and builds the Zag slider machine, returning its connected API
// plus the resolved bounds the marker track reads. Optional machine props are spread conditionally
// so an explicit `undefined` is never handed to the machine under `exactOptionalPropertyTypes`.
const useSliderApi = ({
  defaultValue = defaultSliderValues,
  dir = "ltr",
  disabled = false,
  id,
  max = 100,
  min = 0,
  minStepsBetweenThumbs = 0,
  name,
  onChange,
  onChangeEnd,
  orientation,
  origin,
  readOnly = false,
  step = 1,
  thumbAlignment,
  value,
}: SliderMachineOptions) => {
  const generatedId = useId()
  // A caller-supplied id wins only when it is a usable string; a missing or empty id falls back to
  // the generated one so the machine always has a stable, non-empty id.
  const uniqueId = id === undefined || id === "" ? generatedId : id
  const thumbCount = resolveThumbCount(value, defaultValue)
  const resolvedConfig = resolveSliderConfig(
    min,
    max,
    step,
    minStepsBetweenThumbs,
    thumbCount,
  )
  const fallbackValues = createFallbackValues(
    thumbCount,
    resolvedConfig.min,
    resolvedConfig.max,
  )
  const isControlled = value !== undefined
  const resolvedValue = isControlled
    ? normalizeSliderValues(value, fallbackValues, resolvedConfig)
    : undefined
  const resolvedDefaultValue = isControlled
    ? undefined
    : normalizeSliderValues(defaultValue, fallbackValues, resolvedConfig)

  const service = useMachine(machine, {
    id: uniqueId,
    ...(name !== undefined && { name }),
    ...(origin !== undefined && { origin }),
    ...(resolvedDefaultValue !== undefined && {
      defaultValue: resolvedDefaultValue,
    }),
    ...(resolvedValue !== undefined && { value: resolvedValue }),
    dir,
    disabled,
    max: resolvedConfig.max,
    min: resolvedConfig.min,
    minStepsBetweenThumbs: resolvedConfig.minStepsBetweenThumbs,
    onValueChange: (details) => onChange?.(details.value),
    onValueChangeEnd: (details) => onChangeEnd?.(details.value),
    orientation,
    readOnly,
    step: resolvedConfig.step,
    thumbAlignment,
  })

  return { api: connect(service, normalizeProps), resolvedConfig }
}

export const Slider = ({
  id,
  name,
  label,
  validateStatus,
  helpText,
  showHelpTextIcon = true,
  value,
  origin,
  thumbAlignment = "center",
  defaultValue,
  min,
  max,
  step,
  minStepsBetweenThumbs,
  disabled,
  readOnly,
  dir,
  orientation = "horizontal",
  size = "md",
  showMarkers = false,
  markerCount = 5,
  showValueText = false,
  formatRangeText,
  formatValue = formatSliderValue,
  className,
  onChange,
  onChangeEnd,
}: SliderProps) => {
  const { api, resolvedConfig } = useSliderApi({
    defaultValue,
    dir,
    disabled,
    id,
    max,
    min,
    minStepsBetweenThumbs,
    name,
    onChange,
    onChangeEnd,
    orientation,
    origin,
    readOnly,
    step,
    thumbAlignment,
    value,
  })

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

  // `label` and `helpText` are optional strings, so the render guards are narrowed to booleans while
  // keeping the original truthy-only decision — an empty string still renders nothing.
  const hasLabel = Boolean(label)
  const hasHelpText = Boolean(helpText)
  const hasHeader = hasLabel || showValueText

  return (
    <div {...api.getRootProps()} className={root({ className })}>
      {hasHeader && (
        <div className={header()}>
          <Label {...api.getLabelProps()} className={labelSlot()}>
            {label}
          </Label>
          {showValueText && (
            <output {...api.getValueTextProps()} className={valueSlot()}>
              <b>
                {resolveValueText(api.value, formatRangeText, formatValue)}
              </b>{" "}
            </output>
          )}
        </div>
      )}

      <div {...api.getControlProps()} className={control()}>
        <div
          {...api.getTrackProps()}
          className={track()}
          data-invalid={validateStatus === "error"}
        >
          <div
            {...api.getRangeProps()}
            className={range()}
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
                    {...api.getMarkerProps({ value: markerValue })}
                    className={marker()}
                    key={slugify(`marker-${markerValue}`)}
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
        {Array.from({ length: api.value.length }, (_, index) => (
          <div
            {...api.getThumbProps({ index })}
            className={thumb()}
            key={`thumb-${index}`}
          >
            <input {...api.getHiddenInputProps({ index })} />
          </div>
        ))}
      </div>
      {hasHelpText && (
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
