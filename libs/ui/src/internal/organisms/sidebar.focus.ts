"use client"

import type { FocusEvent } from "react"
import { useLayoutEffect, useRef } from "react"
import type {
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
    panel.closest<HTMLElement>(
      '[data-scope="drawer"][data-part="content"]'
    ) ?? panel
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
        root.querySelectorAll<HTMLButtonElement>(
          "button[data-sidebar-trigger]"
        )
      ).filter(
        (trigger) =>
          trigger.closest(
            '[data-scope="sidebar"][data-part="root"]'
          ) === root &&
          trigger.dataset.side === side &&
          !trigger.disabled &&
          trigger.getClientRects().length > 0
      )
    : []
  const exactTrigger = triggerValue
    ? triggers.find(
        (trigger) =>
          trigger.dataset.sidebarTriggerValue === triggerValue
      )
    : undefined
  const trigger = exactTrigger ?? triggers[0]

  if (trigger) {
    return trigger
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

function queueDocumentMicrotask(
  document: Document,
  callback: VoidFunction
) {
  const view = document.defaultView
  if (view) {
    view.queueMicrotask(callback)
    return
  }

  globalThis.queueMicrotask(callback)
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
    const pendingOrigin = focus.peek(side)
    if (!pendingOrigin || pendingOrigin.mode !== fromMode) {
      return
    }

    const { document } = pendingOrigin
    const focusRegion = getPanelFocusRegion(
      document,
      panelId,
      isDesktop
    )
    const activeElement = document.activeElement

    if (activeElement && focusRegion?.contains(activeElement)) {
      focus.capture({
        mode,
        node: focusRegion,
        side,
        triggerValue:
          pendingOrigin.triggerValue ?? latestTriggerValue.current,
      })
      return
    }

    if (activeElement && pendingOrigin.node.contains(activeElement)) {
      focus.capture({
        mode,
        node: pendingOrigin.node,
        side,
        triggerValue: pendingOrigin.triggerValue,
      })
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
      if (
        transition.current !== transitionId ||
        focus.getRevision(side) !== origin.revision ||
        !document.hasFocus()
      ) {
        return
      }

      const nextFocusRegion = getPanelFocusRegion(
        document,
        panelId,
        isDesktop
      )
      const nextActiveElement = document.activeElement
      if (
        nextActiveElement &&
        nextFocusRegion?.contains(nextActiveElement)
      ) {
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
        triggerValue:
          origin.triggerValue ?? latestTriggerValue.current,
      })
      target?.focus({ preventScroll: true })
      const capturedOrigin = focus.peek(side)
      if (
        target &&
        document.activeElement === target &&
        (capturedOrigin?.mode !== mode || capturedOrigin.node !== target)
      ) {
        focus.capture({
          mode,
          node: target,
          side,
          triggerValue:
            target.dataset.sidebarTriggerValue ??
            origin.triggerValue ??
            latestTriggerValue.current,
        })
      }
    })

    return () => {
      if (transition.current === transitionId) {
        transition.current += 1
      }
    }
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
