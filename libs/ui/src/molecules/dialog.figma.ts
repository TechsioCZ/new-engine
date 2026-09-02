// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-29317
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/dialog.tsx
// component=Dialog

import figma from "figma"

// The Dialog set exposes no component properties; the drawer placements live
// on the separate "Drawer/Side" and "Drawer/Edge" sets.
export default {
  id: "Dialog",
  imports: ['import { Dialog } from "@techsio/ui-kit/molecules/dialog"'],
  example: figma.code`<Dialog description="Description" title="Title" triggerText="Open">
        Content
      </Dialog>`,
  metadata: { nestable: true },
}
