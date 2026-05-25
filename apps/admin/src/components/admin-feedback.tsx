import {
  StatusText,
  type StatusTextProps,
} from "@techsio/ui-kit/atoms/status-text"
import type { ReactNode } from "react"

export type AdminFeedbackTone = "default" | "error" | "success" | "warning"
export type AdminFeedbackState = {
  message: string
  tone: AdminFeedbackTone
} | null

type AdminFeedbackProps = Omit<
  StatusTextProps,
  "align" | "children" | "role" | "showIcon" | "size" | "status"
> & {
  children: ReactNode
  tone?: AdminFeedbackTone
}

export function AdminFeedback({
  children,
  tone = "default",
  ...props
}: AdminFeedbackProps) {
  return (
    <StatusText
      align="start"
      role={tone === "error" ? "alert" : "status"}
      showIcon
      size="sm"
      status={tone}
      {...props}
    >
      {children}
    </StatusText>
  )
}
