import { useCallback, useEffect, useState } from "react"

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
  const registerDescription = useCallback((id: string) => {
    setIds((current) => [...current, id])
    return () =>
      setIds((current) => {
        const index = current.indexOf(id)
        return index === -1
          ? current
          : [...current.slice(0, index), ...current.slice(index + 1)]
      })
  }, [])
  return {
    describedById: [...new Set(ids)].join(" ") || undefined,
    registerDescription,
  }
}

export function useRegisterDescription(
  id: string,
  registerDescription: DescribedBy["registerDescription"]
) {
  useEffect(() => registerDescription(id), [id, registerDescription])
}

/** Joins a caller's aria-describedby with the registered one. */
export function joinDescribedBy(
  ...ids: Array<string | undefined>
): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined
}
