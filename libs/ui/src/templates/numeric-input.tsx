/**
 * NumericInput — @techsio/ui-kit template.
 *
 * @component NumericInput
 * @componentVersion v1.3.3
 * @skill numeric-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the numeric-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { Ref } from "react"
import type { IconType } from "../atoms/icon"
import { NumericInput, type NumericInputProps } from "../atoms/numeric-input"
import { tv } from "../utils"

const numericInputTemplateVariants = tv({
  base: "flex min-w-0 items-center gap-numeric-input-md",
})

export type NumericInputTemplateProps = Omit<
  NumericInputProps,
  "children" | "ref"
> & {
  showControls?: boolean
  showScrubber?: boolean
  controlsPosition?: "right" | "sides"
  incrementIcon?: IconType
  decrementIcon?: IconType
  className?: string
  /** Names the input when there is no visible label; reaches the input, not the root. */
  "aria-label"?: string
  /** Id of a visible label for the input. */
  "aria-labelledby"?: string
  ref?: Ref<HTMLDivElement>
}

export function NumericInputTemplate({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  showControls = true,
  showScrubber = false,
  controlsPosition = "right",
  incrementIcon = "token-icon-numeric-input-increment",
  decrementIcon = "token-icon-numeric-input-decrement",
  className,
  ref,
  ...numericInputProps
}: NumericInputTemplateProps) {
  // Layout for controls on the right (default)
  if (controlsPosition === "right") {
    return (
      <NumericInput {...numericInputProps} className={className} ref={ref}>
        <NumericInput.Control>
          {showScrubber && <NumericInput.Scrubber />}
          <NumericInput.Input
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
          />
          {showControls && (
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger icon={incrementIcon} />
              <NumericInput.DecrementTrigger icon={decrementIcon} />
            </NumericInput.TriggerContainer>
          )}
        </NumericInput.Control>
      </NumericInput>
    )
  }

  // Layout for controls on the sides
  return (
    <NumericInput {...numericInputProps} className={className} ref={ref}>
      <div className={numericInputTemplateVariants()}>
        {showControls && <NumericInput.DecrementTrigger icon={decrementIcon} />}
        <NumericInput.Control className="flex-1">
          {showScrubber && <NumericInput.Scrubber />}
          <NumericInput.Input
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
          />
        </NumericInput.Control>
        {showControls && <NumericInput.IncrementTrigger icon={incrementIcon} />}
      </div>
    </NumericInput>
  )
}
