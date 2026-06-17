import figma from "@figma/code-connect"
import { Switch } from "./switch"

figma.connect(
  Switch,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1137-22",
  {
    imports: ['import { Switch } from "@techsio/ui-kit/molecules/switch"'],
    props: {
      checked: figma.enum("state", {
        unchecked: false,
        checked: true,
        disabled: false,
      }),
      disabled: figma.enum("state", {
        unchecked: false,
        checked: false,
        disabled: true,
      }),
      validateStatus: figma.enum("validateStatus", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
      }),
      children: figma.string("label"),
    },
    example: ({ checked, disabled, validateStatus, children }) => (
      <Switch
        checked={checked}
        disabled={disabled}
        validateStatus={validateStatus}
      >
        {children}
      </Switch>
    ),
  }
)
