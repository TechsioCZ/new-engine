import { useLayoutEffect, useState } from "react"

const ID_SEPARATOR = /\s+/

/*
 * Links a compound component's StatusText part to its focusable control.
 *
 * The root owns the state; the StatusText part registers its id while it is
 * mounted, and the control renders `aria-describedby` only while something is
 * registered. A control must never point at an id that is not in the DOM.
 */

export type DescribedBy = {
  /** Space-separated ids of every mounted message, or undefined when none. */
  describedById: string | undefined
  /** Registers a message id; the returned cleanup removes only that id. */
  registerDescription: (id: string) => () => void
}

export function useDescribedBy(): DescribedBy {
  // A list, not a single id: a field can show a hint and an error at once,
  // and removing one must not unlink the other. Entries are counted so two
  // messages sharing the default id stay registered until both unmount.
  const [ids, setIds] = useState<readonly string[]>([])
  // A stable state initializer avoids re-registering on every render.
  // The setter is stable and every update reads the current list.
  const [registerDescription] = useState(() => (id: string) => {
    setIds((current) => [...current, id])
    return () =>
      setIds((current) => {
        const index = current.indexOf(id)
        return index === -1
          ? current
          : [...current.slice(0, index), ...current.slice(index + 1)]
      })
  })
  return {
    describedById: [...new Set(ids)].join(" ") || undefined,
    registerDescription,
  }
}

/**
 * Registers a mounted message id while `enabled`. A layout effect, not a
 * passive one: the root re-renders the control's aria-describedby,
 * aria-errormessage and aria-invalid before paint, in the same task as the
 * message commit, so no observer sees the message without its control link.
 */
export function useRegisterDescription(
  id: string,
  registerDescription: DescribedBy["registerDescription"],
  enabled = true
) {
  useLayoutEffect(
    () => (enabled ? registerDescription(id) : undefined),
    [id, registerDescription, enabled]
  )
}

/** Joins a caller's aria-describedby with the registered one. */
export function joinDescribedBy(
  ...ids: Array<string | undefined>
): string | undefined {
  return (
    [...new Set(ids.flatMap((id) => id?.split(ID_SEPARATOR) ?? []))]
      .filter(Boolean)
      .join(" ") || undefined
  )
}
