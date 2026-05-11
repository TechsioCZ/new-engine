import figma from "@figma/code-connect"
import { Dialog } from "../dialog"

figma.connect(
  Dialog,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1034-67",
  {
    imports: ['import { Dialog } from "@techsio/ui-kit/molecules/dialog"'],
    props: {
      placement: figma.enum("placement", {
        center: "center",
        left: "left",
        right: "right",
        top: "top",
        bottom: "bottom",
      }),
    },
    example: ({ placement }) => (
      <Dialog
        placement={placement}
        title="Title"
        description="Description"
        triggerText="Open"
      >
        Content
      </Dialog>
    ),
  }
)
