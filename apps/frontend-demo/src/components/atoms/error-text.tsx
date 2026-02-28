"use client"

import {
  StatusText,
  type StatusTextProps,
} from "@techsio/ui-kit/atoms/status-text"

type ErrorTextProps = Omit<StatusTextProps, "status">

export function ErrorText(props: ErrorTextProps) {
  return <StatusText status="error" {...props} />
}
