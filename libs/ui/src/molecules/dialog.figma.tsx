import figma from "@figma/code-connect"

import { Dialog } from "./dialog"

figma.connect(
  Dialog,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1034-67",
  {
    example: ({ placement }) => (
      <Dialog
        description="Description"
        placement={placement}
        title="Title"
        triggerText="Open"
      >
        Content
      </Dialog>
    ),
    imports: ['import { Dialog } from "@techsio/ui-kit/molecules/dialog"'],
    props: {
      placement: figma.enum("placement", {
        bottom: "bottom",
        center: "center",
        left: "left",
        right: "right",
        top: "top",
      }),
    },
  },
)
