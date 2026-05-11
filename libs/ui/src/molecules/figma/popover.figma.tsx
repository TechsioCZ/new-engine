import figma from "@figma/code-connect"
import { Popover } from "../popover"

figma.connect(
  Popover,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1076-666",
  {
    imports: ['import { Popover } from "@techsio/ui-kit/molecules/popover"'],
    props: {
      placement: figma.enum("placement", {
        top: "top",
        right: "right",
        bottom: "bottom",
        left: "left",
        "top-start": "top-start",
        "top-end": "top-end",
        "bottom-start": "bottom-start",
        "bottom-end": "bottom-end",
      }),
    },
    example: ({ placement }) => (
      <Popover id="popover" placement={placement} trigger={<button>Open</button>}>
        Popover content
      </Popover>
    ),
  }
)
