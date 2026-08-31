"use client"

import type { ReactNode, RefCallback } from "react"
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { type DrawerApi, useDrawer } from "../../molecules/drawer"

export type SidebarSide = "start" | "end"
export type SidebarMode = "desktop" | "mobile"
export type SidebarCollapsible = "icon" | "offcanvas" | "none"
export type SidebarCollapsiblePolicy = Readonly<
  Partial<Record<SidebarSide, SidebarCollapsible>>
>

export type SidebarExpandedChangeDetails = {
  expanded: readonly SidebarSide[]
}

export type SidebarMobileOpenChangeDetails = {
  open: SidebarSide | null
}

export type SidebarStateProps = {
  collapsible?: SidebarCollapsiblePolicy
  defaultExpanded?: readonly SidebarSide[]
  defaultMobileOpen?: SidebarSide | null
  dir?: "ltr" | "rtl"
  expanded?: readonly SidebarSide[]
  id?: string
  mobileOpen?: SidebarSide | null
  onExpandedChange?: (details: SidebarExpandedChangeDetails) => void
  onMobileOpenChange?: (details: SidebarMobileOpenChangeDetails) => void
}

export type SidebarApi = {
  closeMobile: () => void
  dir: "ltr" | "rtl"
  expanded: readonly SidebarSide[]
  isDesktop: boolean
  isExpanded: (side: SidebarSide) => boolean
  mobileOpen: SidebarSide | null
  openMobile: (side: SidebarSide) => void
  setExpanded: (side: SidebarSide, expanded: boolean) => void
  toggle: (side: SidebarSide) => void
}

export type SidebarFocusOrigin = {
  document: Document
  mode: SidebarMode
  node: HTMLElement
  revision: number
  side: SidebarSide
  triggerValue: string | null
}

type SidebarFocusCapture = Omit<SidebarFocusOrigin, "document" | "revision">

type SidebarFocusOrigins = {
  end: SidebarFocusOrigin | null
  start: SidebarFocusOrigin | null
}

type SidebarFocusRevisions = {
  end: number
  start: number
}

type SidebarCollapsibleConfiguration = Readonly<{
  end: SidebarCollapsible
  start: SidebarCollapsible
}>

export type SidebarFocusRegistry = {
  blur: (details: {
    mode: SidebarMode
    node: HTMLElement
    relatedTarget: Node | null
    side: SidebarSide
  }) => void
  capture: (details: SidebarFocusCapture) => void
  claim: (side: SidebarSide, fromMode: SidebarMode) => SidebarFocusOrigin | null
  clear: (side: SidebarSide, revision?: number) => void
  getRevision: (side: SidebarSide) => number
  peek: (side: SidebarSide) => SidebarFocusOrigin | null
}

type SidebarContextValue = SidebarApi & {
  breakpointRef: RefCallback<HTMLSpanElement>
  drawer: Record<SidebarSide, DrawerApi>
  focus: SidebarFocusRegistry
  getCollapsible: (side: SidebarSide) => SidebarCollapsible
  getPanelId: (side: SidebarSide) => string
  isFixed: (side: SidebarSide) => boolean
  rootId: string
}

type SidebarPanelContextValue = {
  collapsible: SidebarCollapsible
  expanded: boolean
  side: SidebarSide
}

const SidebarContext = createContext<SidebarContextValue | null>(null)
const SidebarPanelContext = createContext<SidebarPanelContextValue | null>(null)

const SIDES: readonly SidebarSide[] = ["start", "end"]

function createSidebarFocusRegistry(): SidebarFocusRegistry {
  const origins: SidebarFocusOrigins = {
    end: null,
    start: null,
  }
  const revisions: SidebarFocusRevisions = { end: 0, start: 0 }

  const clear = (side: SidebarSide, revision?: number) => {
    const origin = origins[side]
    if (origin && (revision === undefined || origin.revision === revision)) {
      origins[side] = null
    }
  }

  return {
    blur: ({ mode, node, relatedTarget, side }) => {
      if (relatedTarget && node.contains(relatedTarget)) {
        return
      }

      const document = node.ownerDocument
      const clearBlurredOrigin = () => {
        const origin = origins[side]
        if (!origin || origin.mode !== mode || origin.node !== node) {
          return
        }

        if (node.contains(document.activeElement)) {
          return
        }

        if (node.isConnected && node.getClientRects().length > 0) {
          clear(side, origin.revision)
          return
        }

        const expireLease = () => {
          const leasedOrigin = origins[side]
          if (
            leasedOrigin?.revision === origin.revision &&
            leasedOrigin.mode === mode &&
            (!node.isConnected || node.getClientRects().length === 0)
          ) {
            origins[side] = null
          }
        }
        const view = document.defaultView
        if (view) {
          view.requestAnimationFrame(expireLease)
        } else {
          globalThis.queueMicrotask(expireLease)
        }
      }

      if (relatedTarget) {
        clearBlurredOrigin()
        return
      }

      const view = document.defaultView
      if (view) {
        view.queueMicrotask(clearBlurredOrigin)
      } else {
        globalThis.queueMicrotask(clearBlurredOrigin)
      }
    },
    capture: ({ mode, node, side, triggerValue }) => {
      revisions[side] += 1
      origins[side] = {
        document: node.ownerDocument,
        mode,
        node,
        revision: revisions[side],
        side,
        triggerValue,
      }
    },
    claim: (side, fromMode) => {
      const origin = origins[side]
      if (origin?.mode !== fromMode) {
        return null
      }
      origins[side] = null
      return origin
    },
    clear,
    getRevision: (side) => revisions[side],
    peek: (side) => origins[side],
  }
}

function getDesktopServerSnapshot() {
  return true
}

type SidebarBreakpointStore = {
  getSnapshot: () => boolean
  ref: RefCallback<HTMLSpanElement>
  subscribe: (listener: VoidFunction) => VoidFunction
}

function createSidebarBreakpointStore(): SidebarBreakpointStore {
  let node: HTMLSpanElement | null = null

  return {
    getSnapshot: () =>
      node ? getComputedStyle(node).display !== "none" : true,
    ref: (nextNode) => {
      node = nextNode
    },
    subscribe: (listener) => {
      const target = node?.ownerDocument.defaultView
      let subscribed = true
      target?.addEventListener("resize", listener)
      target?.queueMicrotask(() => {
        if (subscribed) {
          listener()
        }
      })

      return () => {
        subscribed = false
        target?.removeEventListener("resize", listener)
      }
    },
  }
}

function useSidebarDesktopBreakpoint() {
  const [store] = useState(createSidebarBreakpointStore)
  const isDesktop = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getDesktopServerSnapshot
  )

  return { breakpointRef: store.ref, isDesktop }
}

function normalizeExpanded(sides: readonly SidebarSide[]) {
  return SIDES.filter((side) => sides.includes(side))
}

function normalizeCollapsible(
  policy: SidebarCollapsiblePolicy | undefined
): SidebarCollapsibleConfiguration {
  return {
    start: policy?.start ?? "icon",
    end: policy?.end ?? "icon",
  }
}

export function useSidebarState({
  collapsible: collapsiblePolicy,
  defaultExpanded = SIDES,
  defaultMobileOpen = null,
  dir,
  expanded: controlledExpanded,
  id,
  mobileOpen: controlledMobileOpen,
  onExpandedChange,
  onMobileOpenChange,
}: SidebarStateProps = {}): SidebarContextValue {
  const generatedId = useId()
  const rootId = id ?? generatedId
  const resolvedDir = dir ?? "ltr"
  const collapsible = normalizeCollapsible(collapsiblePolicy)
  const [focus] = useState(createSidebarFocusRegistry)
  const { breakpointRef, isDesktop } = useSidebarDesktopBreakpoint()
  const wasDesktop = useRef(isDesktop)
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(() =>
    normalizeExpanded(defaultExpanded)
  )
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] =
    useState(defaultMobileOpen)
  const expanded = normalizeExpanded(controlledExpanded ?? uncontrolledExpanded)
  const effectiveExpanded = normalizeExpanded([
    ...expanded,
    ...SIDES.filter((side) => collapsible[side] === "none"),
  ])
  const mobileOpen =
    controlledMobileOpen === undefined
      ? uncontrolledMobileOpen
      : controlledMobileOpen

  const changeMobileOpen = (open: SidebarSide | null) => {
    if (controlledMobileOpen === undefined) {
      setUncontrolledMobileOpen(open)
    }
    if (open !== mobileOpen) {
      onMobileOpenChange?.({ open })
    }
  }

  const setExpanded = (side: SidebarSide, nextExpanded: boolean) => {
    if (collapsible[side] === "none") {
      return
    }

    const next = normalizeExpanded(
      nextExpanded
        ? [...expanded, side]
        : expanded.filter((candidate) => candidate !== side)
    )

    if (controlledExpanded === undefined) {
      setUncontrolledExpanded(next)
    }
    if (next.length !== expanded.length) {
      onExpandedChange?.({ expanded: [...next] })
    }
  }

  useLayoutEffect(() => {
    if (isDesktop && !wasDesktop.current && mobileOpen !== null) {
      if (controlledMobileOpen === undefined) {
        setUncontrolledMobileOpen(null)
      }
      onMobileOpenChange?.({ open: null })
    }
    wasDesktop.current = isDesktop
  }, [controlledMobileOpen, isDesktop, mobileOpen, onMobileOpenChange])

  const createOpenChangeHandler =
    (side: SidebarSide) =>
    ({ open }: { open: boolean }) => {
      if (open) {
        changeMobileOpen(side)
      } else if (mobileOpen === side) {
        changeMobileOpen(null)
      }
    }

  const startDrawer = useDrawer({
    dir: resolvedDir,
    id: `${rootId}-start-drawer`,
    onOpenChange: createOpenChangeHandler("start"),
    open: !isDesktop && mobileOpen === "start",
    swipeDirection: "start",
  })
  const endDrawer = useDrawer({
    dir: resolvedDir,
    id: `${rootId}-end-drawer`,
    onOpenChange: createOpenChangeHandler("end"),
    open: !isDesktop && mobileOpen === "end",
    swipeDirection: "end",
  })

  return {
    breakpointRef,
    closeMobile: () => changeMobileOpen(null),
    dir: resolvedDir,
    drawer: { start: startDrawer, end: endDrawer },
    expanded: effectiveExpanded,
    focus,
    getCollapsible: (side) => collapsible[side],
    getPanelId: (side) => `${rootId}-${side}-panel`,
    isDesktop,
    isExpanded: (side) => effectiveExpanded.includes(side),
    isFixed: (side) => collapsible[side] === "none",
    mobileOpen,
    openMobile: (side) => changeMobileOpen(side),
    rootId,
    setExpanded,
    toggle: (side) => {
      if (isDesktop) {
        setExpanded(side, !expanded.includes(side))
      } else {
        changeMobileOpen(mobileOpen === side ? null : side)
      }
    },
  }
}

export function SidebarProvider({
  children,
  value,
}: {
  children?: ReactNode
  value: SidebarContextValue
}) {
  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}

export function SidebarPanelProvider({
  children,
  value,
}: {
  children?: ReactNode
  value: SidebarPanelContextValue
}) {
  return (
    <SidebarPanelContext.Provider value={value}>
      {children}
    </SidebarPanelContext.Provider>
  )
}

export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("Sidebar components must be used within Sidebar.Root")
  }
  return context
}

export function useSidebarPanelContext() {
  const context = useContext(SidebarPanelContext)
  if (!context) {
    throw new Error("Sidebar panel parts must be used within Sidebar.Panel")
  }
  return context
}
