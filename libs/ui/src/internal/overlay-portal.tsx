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
