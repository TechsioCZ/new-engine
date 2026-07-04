import figma from "@figma/code-connect"
import { Combobox } from "./combobox"

figma.connect(
  Combobox,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1189-153",
  {
    imports: ['import { Combobox } from "@techsio/ui-kit/molecules/combobox"'],
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
        loading: "default",
      }),
      disabled: figma.enum("state", {
        default: false,
        error: false,
        success: false,
        warning: false,
        disabled: true,
        loading: false,
      }),
      loading: figma.enum("state", {
        default: false,
        error: false,
        success: false,
        warning: false,
        disabled: false,
        loading: true,
      }),
      required: figma.boolean("required"),
    },
    example: ({ size, validateStatus, disabled, loading, required }) => (
      <Combobox
        autoComplete="off"
        disabled={disabled}
        items={[]}
        label="Label"
        loading={loading}
        required={required}
        size={size}
        validateStatus={validateStatus}
      />
    ),
  }
)
