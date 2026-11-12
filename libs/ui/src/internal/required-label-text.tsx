"use client"

import { useUiMessages } from "../messages/ui-messages-provider"

/** The required text of a Label that got none: the catalog's, so Label itself stays server-safe. */
export function RequiredLabelText() {
  const text = useUiMessages().label.required
  return text ? <span className="sr-only">{` ${text}`}</span> : null
}
