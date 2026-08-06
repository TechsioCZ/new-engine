import figma from "@figma/code-connect"

import { Button } from "./button"
import { Tooltip } from "./tooltip"

figma.connect(
  Tooltip,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=340-436",
  {
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
    imports: [
      'import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"',
      'import { Button } from "@techsio/ui-kit/atoms/button"',
    ],
    props: {
      placement: figma.enum("placement", {
        bottom: "bottom",
        "bottom-end": "bottom-end",
        "bottom-start": "bottom-start",
        left: "left",
        "left-end": "left-end",
        "left-start": "left-start",
        right: "right",
        "right-end": "right-end",
        "right-start": "right-start",
        top: "top",
        "top-end": "top-end",
        "top-start": "top-start",
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
      variant: figma.enum("variant", {
        default: "default",
        outline: "outline",
      }),
    },
  },
)
