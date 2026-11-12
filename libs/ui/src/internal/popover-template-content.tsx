"use client"

import type { ComponentProps } from "react"
import { useUiMessages } from "../messages/ui-messages-provider"
import { Popover } from "../molecules/popover"

/**
 * PopoverTemplate's content: names an otherwise unnamed popover after its text trigger, or the
 * catalog's `popover.details`. A client part, so the template itself stays hook-free.
 */
export function PopoverTemplateContent({
  fallbackName,
  unnamed,
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<typeof Popover.Content> & {
  fallbackName?: string
  unnamed: boolean
}) {
  const messages = useUiMessages()
  return (
    <Popover.Content
      {...props}
      aria-label={
        ariaLabel ??
        (unnamed ? (fallbackName ?? messages.popover.details) : undefined)
      }
    />
  )
}
