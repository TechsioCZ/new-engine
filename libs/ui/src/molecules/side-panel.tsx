/**
 * SidePanel — @techsio/ui-kit molecule.
 *
 * @component SidePanel
 * @componentVersion v1.0.0
 * @skill side-panel-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the side-panel-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { StatusText } from "../atoms/status-text"
import { useUiMessages } from "../messages/ui-messages-provider"
import { useUIDefaults } from "../theme/ui-provider"
import { tv } from "../utils"
import { Dialog } from "./dialog"

const sidePanelVariants = tv({
  slots: {
    content: "min-w-0 sm:min-w-side-panel",
    close:
      "absolute end-dialog-close-trigger-offset top-dialog-close-trigger-offset",
    handle:
      "absolute inset-y-0 left-0 hidden h-full w-side-panel-handle cursor-col-resize touch-none select-none sm:flex",
    notice: "flex flex-wrap items-center gap-side-panel-notice",
    body: "contents",
  },
  variants: {
    size: { sm: {}, md: {}, lg: {}, xl: {} },
  },
  defaultVariants: { size: "md" },
})

export type SidePanelSize = "sm" | "md" | "lg" | "xl"

export type SidePanelProps = {
  open: boolean
  /**
   * Receives `false` for Escape, the close button and a press outside, after `onCloseRequest`
   * let the panel close. The parent owns `open`.
   */
  onOpenChange: (open: boolean) => void
  /**
   * Every way of closing goes through it first: call `close` to let the panel close, or keep it
   * open (for example while an unsaved-changes question is asked). Without it a press outside an
   * edited form keeps the panel and its draft open and says so.
   */
  onCloseRequest?: (close: () => void) => void
  title: ReactNode
  description?: ReactNode
  /** Footer actions, primary last (Cancel, then the submit action or a SaveBar). */
  actions?: ReactNode
  children?: ReactNode
  className?: string
  size?: SidePanelSize
  /**
   * Non-blocking quick view: the page behind stays usable and a press outside does not close the
   * panel. Escape and the close button still close it.
   */
  peek?: boolean
  /** The panel can be widened by dragging or with the arrow keys on its edge. */
  resizable?: boolean
  /** Browser storage key for the width a user chose; every panel with the same key shares it. */
  widthStorageKey?: string
  initialFocusEl?: () => HTMLElement | null
  finalFocusEl?: () => HTMLElement | null
  /** Overrides the catalog's `sidePanel.close`. */
  closeLabel?: string
  /** Overrides the catalog's `sidePanel.resize`. */
  resizeLabel?: string
}

const defaultWidthStorageKey = "techsio-ui-kit:side-panel-width"

/** zag scopes whose open content owns Escape before the panel does. */
const popupScopes = [
  "cascade-select",
  "color-picker",
  "combobox",
  "date-picker",
  "hover-card",
  "menu",
  "popover",
  "select",
  "tooltip",
]
const openPopupSelector = popupScopes
  .map(
    (scope) => `[data-scope="${scope}"][data-part="content"][data-state="open"]`
  )
  .join(", ")
const openDialogSelector =
  '[data-scope="dialog"][data-part="content"][data-state="open"]'

/** DOM id zag gives the content element of the dialog machine with this id. */
const panelContentId = (dialogId: string) => `dialog:${dialogId}:content`

const contentOf = (contentId: string) => document.getElementById(contentId)

/** Save states in which nothing typed would be lost; SaveBar publishes them. */
const settledSaveStates = new Set(["idle", "saved", "proposed"])

/** Fields whose input the panel tracks; search boxes only filter and hold no draft. */
const draftFieldSelector =
  'input:not([type="search"]), textarea, select, [contenteditable="true"], [role="spinbutton"]'

/* ---------------------------------------------------------------- width -- */

const readWidth = (key: string): number | undefined => {
  let stored = Number.NaN
  try {
    stored = Number(globalThis.localStorage.getItem(key) ?? Number.NaN)
  } catch {
    // Storage can be unavailable in private or restricted contexts; resizing still works.
  }
  return Number.isInteger(stored) && stored > 0 ? stored : undefined
}

const saveWidth = (key: string, width: number | undefined): boolean => {
  try {
    if (width === undefined) {
      globalThis.localStorage.removeItem(key)
    } else {
      globalThis.localStorage.setItem(key, String(width))
    }
    globalThis.dispatchEvent(new Event(key))
    return true
  } catch {
    return false
  }
}

const clampWidth = (width: number, minimum: number, viewport: number) =>
  Math.round(Math.min(Math.max(width, Math.min(minimum, viewport)), viewport))

const pixels = (value: string) => Number.parseFloat(value) || 0

type PanelDrag = {
  pointerId: number
  previousWidth: number | undefined
  startWidth: number
  startX: number
}

function usePanelWidth(storageKey: string) {
  const content = useRef<HTMLDivElement | null>(null)
  const drag = useRef<PanelDrag | null>(null)
  const storedWidth = useSyncExternalStore(
    (notify) => {
      globalThis.addEventListener(storageKey, notify)
      globalThis.addEventListener("storage", notify)
      return () => {
        globalThis.removeEventListener(storageKey, notify)
        globalThis.removeEventListener("storage", notify)
      }
    },
    () => readWidth(storageKey),
    () => undefined
  )
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const width = liveWidth ?? storedWidth

  const bounded = (next: number) => {
    const node = content.current
    if (!node) {
      return next
    }
    return clampWidth(
      next,
      pixels(getComputedStyle(node).minWidth),
      node.ownerDocument.documentElement.clientWidth
    )
  }
  const commit = (next?: number) => {
    setLiveWidth(saveWidth(storageKey, next) ? null : (next ?? null))
  }
  const pointerWidth = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current
    return active?.pointerId === event.pointerId
      ? bounded(active.startWidth + active.startX - event.clientX)
      : undefined
  }
  const cancel = () => {
    if (drag.current) {
      setLiveWidth(drag.current.previousWidth ?? null)
      drag.current = null
    }
  }
  const reset = () => {
    drag.current = null
    commit()
  }

  return {
    contentRef: content,
    width,
    handleProps: {
      onDoubleClick: reset,
      onLostPointerCapture: cancel,
      onPointerCancel: cancel,
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || !event.isPrimary || !content.current) {
          return
        }
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {
          pointerId: event.pointerId,
          previousWidth: width,
          startWidth: content.current.getBoundingClientRect().width,
          startX: event.clientX,
        }
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        const next = pointerWidth(event)
        if (next !== undefined) {
          setLiveWidth(next)
        }
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        const next = pointerWidth(event)
        if (next !== undefined) {
          drag.current = null
          commit(next)
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        const node = content.current
        if (
          !(
            node &&
            ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
          )
        ) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        if (event.key === "Home") {
          reset()
          return
        }
        const step =
          pixels(getComputedStyle(node).paddingLeft) * (event.shiftKey ? 4 : 1)
        const next =
          event.key === "End"
            ? node.ownerDocument.documentElement.clientWidth
            : node.getBoundingClientRect().width +
              (event.key === "ArrowLeft" ? step : -step)
        commit(bounded(next))
      },
    },
  }
}

/* ---------------------------------------------------------- kept drafts -- */

/**
 * Remembers which fields inside the open panel the user changed. A press outside an edited form
 * must not drop the draft, so such a press closes the panel only when no changed field is still on
 * screen or every SaveBar in the panel is settled. Escape keeps closing.
 */
function useEditedDraft(open: boolean, contentId: string) {
  const edited = useRef(new Set<EventTarget>())
  const lastIntent = useRef<"escape" | "other">("other")
  const lastFocused = useRef<EventTarget | null>(null)
  useEffect(() => {
    if (!open) {
      return
    }
    edited.current.clear()
    const inside = (event: Event) => {
      const content = contentOf(contentId)
      return content !== null && event.composedPath().includes(content)
    }
    const onEdit = (event: Event) => {
      if (event.target && inside(event)) {
        edited.current.add(event.target)
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      if (inside(event)) {
        lastFocused.current = event.target
      }
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      lastIntent.current = event.key === "Escape" ? "escape" : "other"
    }
    const onPointerDown = () => {
      lastIntent.current = "other"
    }
    document.addEventListener("input", onEdit, true)
    document.addEventListener("change", onEdit, true)
    document.addEventListener("focusin", onFocusIn, true)
    globalThis.addEventListener("keydown", onKeyDown, { capture: true })
    globalThis.addEventListener("pointerdown", onPointerDown, { capture: true })
    return () => {
      document.removeEventListener("input", onEdit, true)
      document.removeEventListener("change", onEdit, true)
      document.removeEventListener("focusin", onFocusIn, true)
      globalThis.removeEventListener("keydown", onKeyDown, { capture: true })
      globalThis.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      })
    }
  }, [contentId, open])

  /** True when a dismissal is a press or focus move outside an edited form, not an Escape. */
  const keepsDraft = () => {
    const content = contentOf(contentId)
    if (lastIntent.current === "escape" || !content) {
      return false
    }
    const saveBars = [
      ...content.querySelectorAll<HTMLElement>("[data-save-state]"),
    ]
    if (
      saveBars.length > 0 &&
      saveBars.every((bar) =>
        settledSaveStates.has(bar.dataset.saveState ?? "")
      )
    ) {
      return false
    }
    return [...content.querySelectorAll(draftFieldSelector)].some((field) =>
      edited.current.has(field)
    )
  }

  /** The outside press moved focus out of the kept panel; put it back on the field. */
  const refocusDraft = () => {
    requestAnimationFrame(() => {
      const target = lastFocused.current
      const content = contentOf(contentId)
      if (target instanceof HTMLElement && content?.contains(target)) {
        target.focus()
      }
    })
  }
  return { keepsDraft, refocusDraft }
}

/* --------------------------------------------------------------- escape -- */

/**
 * Closes the panel on an Escape no layer above it owns, also when zag's dismissable-layer stack
 * missed it: that stack is per copy of zag, and an app that bundles the kit more than once (module
 * federation remotes) has several. The DOM is shared, so the panel reads it in the capture phase,
 * before any layer handles the key, then waits one frame so zag and React finish this Escape first.
 * An open listbox, calendar or menu still takes the first Escape.
 */
function useEscapeFallback(
  open: boolean,
  contentId: string,
  requestClose: () => void
) {
  const latest = useRef({ open, requestClose })
  useEffect(() => {
    latest.current = { open, requestClose }
  })
  useEffect(() => {
    const frames = new Set<number>()
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        !latest.current.open ||
        event.key !== "Escape" ||
        event.isComposing ||
        document.querySelectorAll(openPopupSelector).length > 0 ||
        [...document.querySelectorAll(openDialogSelector)].at(-1)?.id !==
          contentId
      ) {
        return
      }
      const frame = requestAnimationFrame(() => {
        frames.delete(frame)
        if (
          latest.current.open &&
          contentOf(contentId)?.dataset.state === "open"
        ) {
          latest.current.requestClose()
        }
      })
      frames.add(frame)
    }
    globalThis.addEventListener("keydown", onKeyDown, { capture: true })
    return () => {
      globalThis.removeEventListener("keydown", onKeyDown, { capture: true })
      for (const frame of frames) {
        cancelAnimationFrame(frame)
      }
    }
  }, [contentId])
}

/* ---------------------------------------------------------------- panel -- */

/**
 * Right-hand panel for create, edit and quick-view forms, on Dialog's right placement. Resizable
 * from its left edge (the width is remembered), closes on an Escape nothing above it owns, keeps an
 * edited draft open on a stray press outside, and flattens SectionCards inside it: the panel edge
 * is the one outline.
 */
export function SidePanel({
  open,
  onOpenChange,
  onCloseRequest,
  title,
  description,
  actions,
  children,
  className,
  size: sizeProp,
  peek = false,
  resizable = true,
  widthStorageKey = defaultWidthStorageKey,
  initialFocusEl,
  finalFocusEl,
  closeLabel,
  resizeLabel,
}: SidePanelProps) {
  const messages = useUiMessages().sidePanel
  const { size } = useUIDefaults(
    "SidePanel",
    { size: sizeProp },
    sidePanelVariants
  )
  const styles = sidePanelVariants({ size })
  const id = useId()
  const contentId = panelContentId(id)
  const panelWidth = usePanelWidth(widthStorageKey)
  const close = () => onOpenChange(false)
  const requestClose = () => {
    if (onCloseRequest) {
      onCloseRequest(close)
      return
    }
    close()
  }
  useEscapeFallback(open, contentId, requestClose)
  const { keepsDraft, refocusDraft } = useEditedDraft(open, contentId)
  const [draftKept, setDraftKept] = useState(false)
  const [shownOpen, setShownOpen] = useState(open)
  if (shownOpen !== open) {
    // A reopened panel starts without the previous session's notice.
    setShownOpen(open)
    setDraftKept(false)
  }

  return (
    <Dialog
      actions={actions}
      behavior={peek ? "modeless" : "modal"}
      className={styles.content({ className })}
      closeOnInteractOutside={!peek}
      contentRef={panelWidth.contentRef}
      contentStyle={{
        maxWidth: "100vw",
        width: resizable ? panelWidth.width : undefined,
      }}
      customTrigger
      description={description}
      finalFocusEl={finalFocusEl}
      hideCloseButton
      id={id}
      initialFocusEl={initialFocusEl}
      onOpenChange={(details) => {
        if (details.open) {
          onOpenChange(true)
          return
        }
        // Without a close guard, a press outside an edited form keeps the panel and says so.
        if (!onCloseRequest && keepsDraft()) {
          setDraftKept(true)
          refocusDraft()
          return
        }
        requestClose()
      }}
      open={open}
      placement="right"
      size={size}
      title={title}
    >
      {/* The panel renders its own close button, so every close goes through onCloseRequest. */}
      <ActionIcon
        aria-label={closeLabel ?? messages.close}
        className={styles.close()}
        icon="token-icon-dialog-close"
        onClick={requestClose}
        severity="neutral"
        size="md"
      />
      {resizable && (
        <ActionIcon
          {...panelWidth.handleProps}
          aria-controls={contentId}
          aria-label={resizeLabel ?? messages.resize}
          className={styles.handle()}
          icon="token-icon-side-panel-resize"
          severity="neutral"
          size="sm"
        />
      )}
      {draftKept && (
        <div className={styles.notice()}>
          <StatusText size="sm" status="warning">
            {messages.draftKept}
          </StatusText>
          <Button
            appearance="ghost"
            onClick={requestClose}
            severity="secondary"
            size="sm"
          >
            {messages.closeWithoutSaving}
          </Button>
        </div>
      )}
      <div className={styles.body()} data-surface-frame="">
        {children}
      </div>
    </Dialog>
  )
}

SidePanel.displayName = "SidePanel"
