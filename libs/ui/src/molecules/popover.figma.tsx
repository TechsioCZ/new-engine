import figma from "@figma/code-connect"
import { Popover } from "./popover"

figma.connect(
  Popover,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1076-666",
  {
    imports: ['import { Popover } from "@libs/ui/molecules/popover"'],
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
      <Popover defaultOpen id="popover" placement={placement}>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            Popover content
          </Popover.Content>
        </Popover.Positioner>
      </Popover>
    ),
  }
)
