import type { Ref } from "react"

import type { IconType } from "../atoms/icon"
import { NumericInput, type NumericInputProps } from "../atoms/numeric-input"

export interface NumericInputTemplateProps extends Omit<
  NumericInputProps,
  "children" | "ref"
> {
  showControls?: boolean | undefined
  showScrubber?: boolean | undefined
  controlsPosition?: "right" | "sides" | undefined
  incrementIcon?: IconType | undefined
  decrementIcon?: IconType | undefined
  className?: string | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

export function NumericInputTemplate({
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
          <NumericInput.Input />
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
      <div className="flex items-center gap-50">
        {showControls && <NumericInput.DecrementTrigger icon={decrementIcon} />}
        <NumericInput.Control className="flex-1">
          {showScrubber && <NumericInput.Scrubber />}
          <NumericInput.Input />
        </NumericInput.Control>
        {showControls && <NumericInput.IncrementTrigger icon={incrementIcon} />}
      </div>
    </NumericInput>
  )
}
