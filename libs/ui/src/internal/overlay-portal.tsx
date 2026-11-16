import type { PortalProps } from "@zag-js/react"
import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from "react"
import { createPortal } from "react-dom"

// Internal overlay integration: popup portals belong to their nearest modal,
// while the application notification region follows the frontmost modal.
const OverlayContainerContext = createContext<HTMLElement | null>(null)
const modalContainers: HTMLElement[] = []
const modalListeners = new Set<() => void>()
const subscribeToModals = (listener: () => void) => {
  modalListeners.add(listener)
  return () => {
    modalListeners.delete(listener)
  }
}
const getActiveModal = () => modalContainers.at(-1) ?? null
const getServerModal = () => null

/** @internal Shared by overlay primitives; not a replacement for a modal trap. */
export function useActiveModalContainer() {
  return useSyncExternalStore(subscribeToModals, getActiveModal, getServerModal)
}

/** @internal Keeps portalled descendants inside the owning modal's ARIA/focus scope. */
export function OverlayContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null
  children: ReactNode
}) {
  const inheritedContainer = useContext(OverlayContainerContext)
  useLayoutEffect(() => {
    if (!container) {
      return
    }
    modalContainers.push(container)
    for (const listener of modalListeners) {
      listener()
    }
    return () => {
      const index = modalContainers.indexOf(container)
      if (index !== -1) {
        modalContainers.splice(index, 1)
      }
      for (const listener of modalListeners) {
        listener()
      }
    }
  }, [container])
  return (
    <OverlayContainerContext.Provider value={container ?? inheritedContainer}>
      {children}
    </OverlayContainerContext.Provider>
  )
}

/** @internal Wait for actual removal/hiding and focus-trap teardown, rather than
 * racing a single animation frame against portal cleanup. Stop for intentional
 * outside focus, and cancel on reopen/unmount through the returned disposer. */
export function restoreFocusAfterOverlayClose(
  content: HTMLElement,
  getTarget: () => HTMLElement | null
): () => void {
  const doc = content.ownerDocument
  const view = doc.defaultView
  if (!view) {
    return () => undefined
  }
  let frame = 0
  let attempts = 0
  let settled = 0
  const restore = () => {
    attempts += 1
    const target = getTarget()
    const active = doc.activeElement
    if (active !== doc.body && active !== target && !content.contains(active)) {
      return
    }
    if (
      (!content.isConnected || content.hidden) &&
      target?.isConnected &&
      !target.matches(':disabled, [aria-disabled="true"]') &&
      !target.closest('[hidden], [inert], [aria-hidden="true"]')
    ) {
      target.focus({ preventScroll: true })
      settled = doc.activeElement === target ? settled + 1 : 0
      // Keep checking briefly: deferred trap/dismissable cleanup can remove
      // focus again after the first successful focus call.
      if (settled >= 3) {
        return
      }
    }
    if (attempts < 30) {
      frame = view.requestAnimationFrame(restore)
    }
  }
  frame = view.requestAnimationFrame(restore)
  return () => view.cancelAnimationFrame(frame)
}

/** A portal's own children get no useId position, unlike the same children
 * rendered inline on the server. Mounting them one component lower gives the
 * children the server's positions back. */
function PortalChildren({ children }: { children?: ReactNode }) {
  return children
}

/** @internal Zag's Portal targets, with the children's tree shape kept equal to
 * the inline server render. Zag maps each child to its own portal, which turns
 * a single child into a one-item list on the client only. Every useId below
 * then differs from the server's, and a hydrated overlay keeps server ids its
 * machines cannot look up. Here React adopts the server nodes as they are, and
 * a client-only render still portals on its first commit. */
export function BodyPortal({
  children,
  container,
  disabled,
  getRootNode,
}: PortalProps & { children?: ReactNode }) {
  if (typeof document === "undefined" || disabled) {
    return <>{children}</>
  }
  const doc = getRootNode?.().ownerDocument ?? document
  return createPortal(
    <PortalChildren>{children}</PortalChildren>,
    container?.current ?? doc.body
  )
}

/** @internal Uses React portals rather than moving React-owned DOM nodes. */
export function OverlayPortal({
  children,
  ...props
}: PortalProps & { children: ReactNode }) {
  const container = useContext(OverlayContainerContext)
  if (typeof document === "undefined" || props.disabled) {
    return <>{children}</>
  }
  const root = props.getRootNode?.()
  const doc =
    root?.nodeType === 9
      ? (root as Document)
      : (root?.ownerDocument ?? document)
  const target =
    props.container?.current ??
    container ??
    (root?.nodeType === 11 ? (root as DocumentFragment) : doc.body)
  return createPortal(children, target)
}
