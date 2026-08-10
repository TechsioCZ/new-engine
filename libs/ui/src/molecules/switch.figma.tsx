import figma from "@figma/code-connect"

import { Switch } from "./switch"

figma.connect(
  Switch,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1137-22",
  {
    example: ({ checked, disabled, validateStatus, children }) => (
      <Switch
        checked={checked}
        disabled={disabled}
        validateStatus={validateStatus}
      >
        {children}
      </Switch>
    ),
    imports: ['import { Switch } from "@techsio/ui-kit/molecules/switch"'],
    props: {
      checked: figma.enum("state", {
        checked: true,
        disabled: false,
        unchecked: false,
      }),
      children: figma.string("label"),
      disabled: figma.enum("state", {
        checked: false,
        disabled: true,
        unchecked: false,
      }),
      validateStatus: figma.enum("validateStatus", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
      }),
    },
  },
)
