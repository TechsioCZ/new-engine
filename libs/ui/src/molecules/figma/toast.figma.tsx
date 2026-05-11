import figma from "@figma/code-connect"
import { Toaster, useToast } from "../toast"

figma.connect(
  Toaster,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1155-33",
  {
    imports: ['import { Toaster, useToast } from "@libs/ui/molecules/toast"'],
    props: {
      type: figma.enum("type", {
        default: "message",
        info: "info",
        success: "success",
        warning: "warning",
        error: "error",
      }),
    },
    example: ({ type }) => {
      const toast = useToast()

      return (
        <>
          <button
            onClick={() =>
              toast.create({
                title: "Toast",
                description: "Notification message",
                type,
              })
            }
            type="button"
          >
            Show toast
          </button>
          <Toaster />
        </>
      )
    },
  }
)
