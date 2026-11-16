import { machine } from "@zag-js/date-input"

/** Zag tracks committed-value changes, but a refused controlled proposal leaves
 * that value unchanged while its editable display has already advanced. Restore
 * the display explicitly, without VALUE.SET (which would propose another value).
 * Native reset uses the same silent path to discard incomplete segment drafts. */
export const datePickerInputMachine: typeof machine = {
  ...machine,
  on: {
    ...machine.on,
    "AUTHORITATIVE.SYNC": {
      actions: ["syncDisplayValues"],
    },
  },
  implementations: {
    ...machine.implementations,
    actions: {
      ...machine.implementations?.actions,
      focusActiveSegment({ scope, context }) {
        const control = scope.getById(
          scope.ids?.control ?? `date-input:${scope.id}:control`
        )
        const doc = control?.ownerDocument
        doc?.defaultView?.requestAnimationFrame(() => {
          const active = doc.activeElement
          // A modal initially focuses the first segment. Zag's later RAF must
          // not steal focus back after the user moves to the calendar trigger.
          if (
            !(
              control?.isConnected &&
              active?.matches('[data-part="segment"]') &&
              control.contains(active)
            )
          ) {
            return
          }
          control
            .querySelectorAll<HTMLElement>('[data-part="segment"]')
            [context.get("activeSegmentIndex")]?.focus({ preventScroll: true })
        })
      },
    },
  },
}
