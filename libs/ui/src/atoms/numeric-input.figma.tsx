import figma from "@figma/code-connect"

import { NumericInput } from "./numeric-input"

figma.connect(
  NumericInput,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=607-107",
  {
    example: ({ disabled, invalid, readOnly, size }) => (
      <NumericInput
        defaultValue={42}
        disabled={disabled}
        id="quantity"
        invalid={invalid}
        readOnly={readOnly}
        size={size}
      >
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>
    ),
    imports: [
      'import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"',
    ],
    props: {
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        error: false,
        readonly: false,
      }),
      invalid: figma.enum("state", {
        default: false,
        disabled: false,
        error: true,
        readonly: false,
      }),
      readOnly: figma.enum("state", {
        default: false,
        disabled: false,
        error: false,
        readonly: true,
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
    },
  },
)
