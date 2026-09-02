// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-34895
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/toast.tsx
// component=Toaster

import figma from "figma"

const type = figma.selectedInstance.getEnum("type", {
  default: "message",
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
})

export default {
  id: "Toaster",
  imports: ['import { Toaster, useToast } from "@techsio/ui-kit/molecules/toast"'],
  example: figma.tsx`function Example() {
    const toast = useToast();
    return (<>
          <button onClick={() => toast.create({
            title: "Toast",
            description: "Notification message",
            type: ${figma.helpers.react.renderPropValue(type)},
        })} type="button">
            Show toast
          </button>
          <Toaster />
        </>);
}`,
  metadata: { nestable: false },
}
