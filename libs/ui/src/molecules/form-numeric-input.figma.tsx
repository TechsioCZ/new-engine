import figma from "@figma/code-connect"
import { NumericInput } from "../atoms/numeric-input"
import { FormNumericInput } from "./form-numeric-input"

figma.connect(
  FormNumericInput,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=603-143",
  {
    imports: [
      'import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"',
      'import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input"',
    ],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      validateStatus: figma.enum("state", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
        disabled: "default",
        readonly: "default",
      }),
      required: figma.enum("required", {
        true: true,
        false: false,
      }),
      disabled: figma.enum("state", {
        default: false,
        error: false,
        success: false,
        warning: false,
        disabled: true,
        readonly: false,
      }),
      readOnly: figma.enum("state", {
        default: false,
        error: false,
        success: false,
        warning: false,
        disabled: false,
        readonly: true,
      }),
    },
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
  }
)
