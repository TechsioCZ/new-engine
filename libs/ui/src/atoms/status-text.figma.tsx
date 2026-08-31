import figma from "@figma/code-connect"
import { StatusText } from "./status-text"

figma.connect(
  StatusText,
  "https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System-vol.-2?node-id=304-35",
  {
    imports: ['import { StatusText } from "@libs/ui/atoms/status-text"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      status: figma.enum("status", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
      }),
      children: figma.string("children"),
    },
    example: ({ size, status, children }) => (
      <StatusText size={size} status={status}>
        {children}
      </StatusText>
    ),
  }
)
