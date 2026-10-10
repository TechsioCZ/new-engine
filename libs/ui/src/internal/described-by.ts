import { useEffect, useState } from "react"

/*
 * Links a compound component's StatusText part to its focusable control.
 *
 * The root owns the state; the StatusText part registers its id while it is
 * mounted, and the control renders `aria-describedby` only while something is
 * registered. A control must never point at an id that is not in the DOM.
 */

export type DescribedBy = {
  describedById: string | undefined
  setDescribedById: (id: string | undefined) => void
}

export function useDescribedBy(): DescribedBy {
  const [describedById, setDescribedById] = useState<string>()
  return { describedById, setDescribedById }
}

export function useRegisterDescription(
  id: string,
  setDescribedById: DescribedBy["setDescribedById"]
) {
  useEffect(() => {
    setDescribedById(id)
    return () => setDescribedById(undefined)
  }, [id, setDescribedById])
}

/** Joins a caller's aria-describedby with the registered one. */
export function joinDescribedBy(
  ...ids: Array<string | undefined>
): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined
}
