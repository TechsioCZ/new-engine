import figma from "@figma/code-connect"
import type { Type as ToastType } from "@zag-js/toast"

import { Toaster, useToast } from "./toast"

interface ToastExampleProps {
  type: ToastType
}

const ToastExample = ({ type }: ToastExampleProps) => {
  const toast = useToast()

  return (
    <>
      <button
        onClick={() => {
          toast.create({
            description: "Notification message",
            title: "Toast",
            type,
          })
        }}
        type="button"
      >
        Show toast
      </button>
      <Toaster />
    </>
  )
}

figma.connect(
  Toaster,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1155-33",
  {
    example: ToastExample,
    imports: ['import { Toaster, useToast } from "@libs/ui/molecules/toast"'],
    props: {
      type: figma.enum("type", {
        default: "message",
        error: "error",
        info: "info",
        success: "success",
        warning: "warning",
      }),
    },
  },
)
