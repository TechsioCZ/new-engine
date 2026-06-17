import figma from "@figma/code-connect"
import { Button } from "./button"
import { Tooltip } from "./tooltip"

figma.connect(
  Tooltip,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=340-436",
  {
    imports: [
      'import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"',
      'import { Button } from "@techsio/ui-kit/atoms/button"',
    ],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      variant: figma.enum("variant", {
        default: "default",
        outline: "outline",
      }),
      placement: figma.enum("placement", {
        top: "top",
        "top-start": "top-start",
        "top-end": "top-end",
        right: "right",
        "right-start": "right-start",
        "right-end": "right-end",
        bottom: "bottom",
        "bottom-start": "bottom-start",
        "bottom-end": "bottom-end",
        left: "left",
        "left-start": "left-start",
        "left-end": "left-end",
      }),
    },
    example: ({ placement, size, variant }) => (
      <Tooltip
        content="Tooltip content"
        open={true}
        placement={placement}
        size={size}
        variant={variant}
      >
        <Button size="sm" variant="secondary">
          Hover me
        </Button>
      </Tooltip>
    ),
  }
)
