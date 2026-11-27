/**
 * Meter — @techsio/ui-kit atom.
 *
 * @component Meter
 * @componentVersion v1.0.0
 * @skill meter-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the meter-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { CSSProperties, HTMLAttributes, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { useUIDefaults } from "../theme/ui-provider"
import { tv } from "../utils"

const meterVariants = tv({
  slots: {
    root: "meter-track-boundary flex w-full overflow-clip rounded-full bg-meter-track-bg",
    fill: [
      "meter-fill-boundary h-full w-(--meter-value) shrink-0 rounded-full",
      "transition-[width] duration-200 ease-out motion-reduce:transition-none",
    ],
  },
  variants: {
    severity: {
      primary: { fill: "bg-meter-fill-bg-primary" },
      secondary: { fill: "bg-meter-fill-bg-secondary" },
      neutral: { fill: "bg-meter-fill-bg-neutral" },
      info: { fill: "bg-meter-fill-bg-info" },
      success: { fill: "bg-meter-fill-bg-success" },
      warning: { fill: "bg-meter-fill-bg-warning" },
      danger: { fill: "bg-meter-fill-bg-danger" },
    },
    size: {
      sm: { root: "h-meter-sm" },
      md: { root: "h-meter-md" },
    },
    // Stacked parts read as one bar: the track clips the ends, the parts meet flush.
    stacked: {
      true: { fill: "rounded-none" },
    },
  },
  defaultVariants: {
    severity: "primary",
    size: "sm",
  },
})

export type MeterSeverity = NonNullable<
  VariantProps<typeof meterVariants>["severity"]
>
type MeterSize = NonNullable<VariantProps<typeof meterVariants>["size"]>

export type MeterSegment = {
  value: number
  severity: MeterSeverity
}

type MeterBaseProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "role" | "style"
> & {
  /** Upper bound of the scale. Default 100. */
  max?: number
  /** Bar height. Falls back to the nearest `UIProvider`, then `sm`. */
  size?: MeterSize
  ref?: Ref<HTMLDivElement>
}

export type MeterProps = MeterBaseProps &
  (
    | {
        value: number
        /** Fill colour. Default `primary`. */
        severity?: MeterSeverity
        segments?: never
      }
    | {
        /** Two or more stacked parts; the meter's value is their sum. */
        segments: readonly MeterSegment[]
        value?: never
        severity?: never
      }
  )

const toFinite = (value: number) => (Number.isFinite(value) ? value : 0)

/** Share of the scale in percent, after the parts before it took theirs. */
function percentages(values: readonly number[], max: number) {
  let used = 0
  return values.map((value) => {
    const share = max > 0 ? (Math.max(0, toFinite(value)) / max) * 100 : 0
    const width = Math.min(share, 100 - used)
    used += width
    return width
  })
}

const fillStyle = (percent: number) =>
  ({ "--meter-value": `${percent}%` }) as CSSProperties

export function Meter({
  value,
  max: maxProp = 100,
  severity,
  segments,
  size: sizeProp,
  className,
  ref,
  ...props
}: MeterProps) {
  const { size } = useUIDefaults("Meter", { size: sizeProp }, meterVariants)
  const max = Math.max(0, toFinite(maxProp))
  const parts = segments ?? [{ value: value ?? 0, severity }]
  const total = parts.reduce(
    (sum, part) => sum + Math.max(0, toFinite(part.value)),
    0
  )
  const widths = percentages(
    parts.map((part) => part.value),
    max
  )
  const stacked = segments !== undefined

  return (
    // biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot stack segments or take token-styled fills.
    <div
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={Math.min(total, max)}
      className={meterVariants({ size }).root({ className })}
      ref={ref}
      role="meter"
      {...props}
    >
      {parts.map((part, index) => (
        <div
          className={meterVariants({ severity: part.severity, stacked }).fill()}
          data-part="fill"
          // biome-ignore lint/suspicious/noArrayIndexKey: Segments are positional parts of one bar.
          key={index}
          style={fillStyle(widths[index] ?? 0)}
        />
      ))}
    </div>
  )
}
