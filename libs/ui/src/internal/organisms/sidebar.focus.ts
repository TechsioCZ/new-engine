"use client"

import type { FocusEvent } from "react"
import { useLayoutEffect, useRef } from "react"
import type {
  SidebarFocusOrigin,
  SidebarFocusRegistry,
  SidebarMode,
  SidebarSide,
} from "./sidebar.context"

function getPanelFocusRegion(
  document: Document,
  panelId: string,
  isDesktop: boolean
) {
  const panel = document.getElementById(panelId)
  if (isDesktop || !panel) {
    return panel
  }

  return (
    panel.closest<HTMLElement>('[data-scope="drawer"][data-part="content"]') ??
    panel
  )
}

function getPanelFocusTarget({
  document,
  panelId,
  rootId,
  side,
  triggerValue,
}: {
  document: Document
  panelId: string
  rootId: string
  side: SidebarSide
  triggerValue: string | null
}) {
  const root = document.getElementById(rootId)
  const triggers = root
    ? Array.from(
        root.querySelectorAll<HTMLButtonElement>("button[data-sidebar-trigger]")
      ).filter(
        (candidate) =>
          candidate.closest('[data-scope="sidebar"][data-part="root"]') ===
            root &&
          candidate.dataset.side === side &&
          !candidate.disabled &&
          candidate.getClientRects().length > 0
      )
    : []
  const exactTrigger = triggerValue
    ? triggers.find(
        (candidate) => candidate.dataset.sidebarTriggerValue === triggerValue
      )
    : undefined
  const target = exactTrigger ?? triggers[0]

  if (target) {
    return target
  }

  const panel = document.getElementById(panelId)
  return panel && !panel.inert && panel.getClientRects().length > 0
    ? panel
    : null
}

function hasMeaningfulFocus(document: Document) {
  const activeElement = document.activeElement
  return Boolean(
    activeElement &&
      activeElement !== document.body &&
      activeElement !== document.documentElement &&
      activeElement.isConnected
  )
}

function queueDocumentMicrotask(document: Document, callback: VoidFunction) {
  const view = document.defaultView
  if (view) {
    view.queueMicrotask(callback)
    return
  }

  globalThis.queueMicrotask(callback)
}

type CaptureActiveFocusProps = {
  activeElement: Element | null
  focus: SidebarFocusRegistry
  focusRegion: HTMLElement | null
  mode: SidebarMode
  origin: SidebarFocusOrigin
  side: SidebarSide
  triggerValue: string | null
}

function captureActiveFocus({
  activeElement,
  focus,
  focusRegion,
  mode,
  origin,
  side,
  triggerValue,
}: CaptureActiveFocusProps) {
  if (activeElement && focusRegion?.contains(activeElement)) {
    focus.capture({ mode, node: focusRegion, side, triggerValue })
    return true
  }

  if (activeElement && origin.node.contains(activeElement)) {
    focus.capture({
      mode,
      node: origin.node,
      side,
      triggerValue: origin.triggerValue,
    })
    return true
  }

  return false
}

type CaptureTransferredTargetProps = {
  document: Document
  focus: SidebarFocusRegistry
  mode: SidebarMode
  origin: SidebarFocusOrigin
  side: SidebarSide
  target: HTMLElement | null
  triggerValue: string | null
}

function captureTransferredTarget({
  document,
  focus,
  mode,
  origin,
  side,
  target,
  triggerValue,
}: CaptureTransferredTargetProps) {
  if (!target || document.activeElement !== target) {
    return
  }

  const capturedOrigin = focus.peek(side)
  if (capturedOrigin?.mode === mode && capturedOrigin.node === target) {
    return
  }

  focus.capture({
    mode,
    node: target,
    side,
    triggerValue:
      target.dataset.sidebarTriggerValue ?? origin.triggerValue ?? triggerValue,
  })
}

type RunQueuedFocusTransferProps = {
  document: Document
  focus: SidebarFocusRegistry
  isCurrent: () => boolean
  isDesktop: boolean
  mode: SidebarMode
  origin: SidebarFocusOrigin
  panelId: string
  rootId: string
  side: SidebarSide
  triggerValue: string | null
}

function runQueuedFocusTransfer({
  document,
  focus,
  isCurrent,
  isDesktop,
  mode,
  origin,
  panelId,
  rootId,
  side,
  triggerValue,
}: RunQueuedFocusTransferProps) {
  const stale =
    !isCurrent() ||
    focus.getRevision(side) !== origin.revision ||
    !document.hasFocus()
  if (stale) {
    return
  }

  const focusRegion = getPanelFocusRegion(document, panelId, isDesktop)
  const activeElement = document.activeElement
  if (activeElement && focusRegion?.contains(activeElement)) {
    return
  }

  if (hasMeaningfulFocus(document)) {
    return
  }

  const target = getPanelFocusTarget({
    document,
    panelId,
    rootId,
    side,
    triggerValue,
  })
  target?.focus({ preventScroll: true })
  captureTransferredTarget({
    document,
    focus,
    mode,
    origin,
    side,
    target,
    triggerValue,
  })
}

function cancelFocusTransfer(
  transition: { current: number },
  transitionId: number
) {
  if (transition.current === transitionId) {
    transition.current += 1
  }
}

function getPendingFocusOrigin(
  focus: SidebarFocusRegistry,
  side: SidebarSide,
  fromMode: SidebarMode
) {
  const origin = focus.peek(side)
  return origin?.mode === fromMode ? origin : null
}

type UseSidebarPanelFocusTransferProps = {
  focus: SidebarFocusRegistry
  isDesktop: boolean
  panelId: string
  rootId: string
  side: SidebarSide
  triggerValue: string | null
}

export function useSidebarPanelFocusTransfer({
  focus,
  isDesktop,
  panelId,
  rootId,
  side,
  triggerValue,
}: UseSidebarPanelFocusTransferProps) {
  const wasDesktop = useRef(isDesktop)
  const transition = useRef(0)
  const latestTriggerValue = useRef(triggerValue)

  useLayoutEffect(() => {
    latestTriggerValue.current = triggerValue
  }, [triggerValue])

  useLayoutEffect(() => {
    if (wasDesktop.current === isDesktop) {
      return
    }
    wasDesktop.current = isDesktop
    const transitionId = transition.current + 1
    transition.current = transitionId
    const mode: SidebarMode = isDesktop ? "desktop" : "mobile"
    const fromMode: SidebarMode = isDesktop ? "mobile" : "desktop"
    const pendingOrigin = getPendingFocusOrigin(focus, side, fromMode)
    if (!pendingOrigin) {
      return
    }

    const { document } = pendingOrigin
    const focusRegion = getPanelFocusRegion(document, panelId, isDesktop)
    const activeElement = document.activeElement
    const nextTriggerValue =
      pendingOrigin.triggerValue ?? latestTriggerValue.current

    if (
      captureActiveFocus({
        activeElement,
        focus,
        focusRegion,
        mode,
        origin: pendingOrigin,
        side,
        triggerValue: nextTriggerValue,
      })
    ) {
      return
    }

    if (hasMeaningfulFocus(document)) {
      focus.clear(side, pendingOrigin.revision)
      return
    }

    const origin = focus.claim(side, fromMode)
    if (!origin) {
      return
    }

    queueDocumentMicrotask(document, () => {
      runQueuedFocusTransfer({
        document,
        focus,
        isCurrent: () => transition.current === transitionId,
        isDesktop,
        mode,
        origin,
        panelId,
        rootId,
        side,
        triggerValue: origin.triggerValue ?? latestTriggerValue.current,
      })
    })

    return () => cancelFocusTransfer(transition, transitionId)
  }, [focus, isDesktop, panelId, rootId, side])

  const onFocusCapture = (event: FocusEvent<HTMLElement>) => {
    focus.capture({
      mode: isDesktop ? "desktop" : "mobile",
      node: event.currentTarget,
      side,
      triggerValue: null,
    })
  }

  const onBlurCapture = (event: FocusEvent<HTMLElement>) => {
    focus.blur({
      mode: isDesktop ? "desktop" : "mobile",
      node: event.currentTarget,
      relatedTarget: event.relatedTarget,
      side,
    })
  }

  return { onBlurCapture, onFocusCapture }
}
