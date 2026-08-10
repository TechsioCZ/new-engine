import figma from "@figma/code-connect"

import { NumericInput } from "../atoms/numeric-input"
import { FormNumericInput } from "./form-numeric-input"

figma.connect(
  FormNumericInput,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=603-143",
  {
    example: ({ disabled, readOnly, required, size, validateStatus }) => (
      <FormNumericInput
        defaultValue={42}
        disabled={disabled}
        helpText="Enter value between 0-100"
        id="quantity"
        label="Quantity"
        readOnly={readOnly}
        required={required}
        size={size}
        validateStatus={validateStatus}
      >
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </FormNumericInput>
    ),
    imports: [
      'import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"',
      'import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input"',
    ],
    props: {
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        error: false,
        readonly: false,
        success: false,
        warning: false,
      }),
      readOnly: figma.enum("state", {
        default: false,
        disabled: false,
        error: false,
        readonly: true,
        success: false,
        warning: false,
      }),
      required: figma.enum("required", {
        false: false,
        true: true,
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
      validateStatus: figma.enum("state", {
        default: "default",
        disabled: "default",
        error: "error",
        readonly: "default",
        success: "success",
        warning: "warning",
      }),
    },
  },
)
