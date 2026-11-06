/**
 * NumericInput — @techsio/ui-kit template.
 *
 * @component NumericInput
 * @componentVersion v1.3.6
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
  slots: {
    inputWrapper: "relative flex h-full min-w-0 flex-1",
    sideInput: "text-center",
    sideTrigger: "flex-none self-stretch",
  },
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

  // The shared control owns the border and focus ring for all three parts.
  const styles = numericInputTemplateVariants()
  return (
    <NumericInput {...numericInputProps} className={className} ref={ref}>
      <NumericInput.Control>
        {showControls && (
          <NumericInput.DecrementTrigger
            className={styles.sideTrigger()}
            icon={decrementIcon}
          />
        )}
        <div className={styles.inputWrapper()}>
          {showScrubber && <NumericInput.Scrubber />}
          <NumericInput.Input
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={
              showControls && !numericInputProps.readOnly
                ? styles.sideInput()
                : undefined
            }
          />
        </div>
        {showControls && (
          <NumericInput.IncrementTrigger
            className={styles.sideTrigger()}
            icon={incrementIcon}
          />
        )}
      </NumericInput.Control>
    </NumericInput>
  )
}
