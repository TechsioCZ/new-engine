/**
 * Toast — @techsio/ui-kit molecule.
 *
 * @component Toast
 * @componentVersion v1.1.1
 * @skill toast-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the toast-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { normalizeProps, useMachine } from "@zag-js/react"
import * as toast from "@zag-js/toast"
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
} from "react"
import { createPortal } from "react-dom"
import type { VariantProps } from "tailwind-variants"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { tv } from "../utils"
import { useActiveModalContainer } from "./dialog"

// Toast Item Variants
const toastVariants = tv({
  slots: {
    root: [
      "relative flex flex-col rounded-toast-root",
      "border-(length:--border-width-toast) bg-toast-bg-surface shadow-lg",
      "toast-responsive-width min-w-0 p-toast-root",
      "data-[type=error]:border-toast-border-error data-[type=error]:bg-toast-bg-surface",
      "data-[type=success]:border-toast-border-success data-[type=success]:bg-toast-bg-surface",
      "data-[type=info]:border-toast-border-info data-[type=info]:bg-toast-bg-surface",
      "data-[type=warning]:border-toast-border-warning data-[type=warning]:bg-toast-bg-surface",

      // required styles by zag-js
      "translate-x-(--x) translate-y-(--y)",
      "scale-(--scale) opacity-(--opacity)",
      "z-(--z-index) h-(--height)",
      "will-change-[translate,opacity,scale]",
      "transition-[translate,scale,opacity] duration-400 motion-reduce:transition-none",
    ],
    group: "pointer-events-auto relative flex flex-col",
    viewport: "toast-notification-viewport",
    header: "relative flex items-start gap-toast-content text-toast-title-size",
    iconFrame: "flex h-toast-title-line shrink-0 items-center",
    icon: [
      "flex-shrink-0 text-toast-icon",
      "data-[type=loading]:token-icon-spinner data-[type=loading]:text-toast-fg-readable",
      "data-[type=error]:token-icon-toast-error data-[type=error]:text-toast-fg-error",
      "data-[type=success]:token-icon-toast-success data-[type=success]:text-toast-fg-success",
      "data-[type=info]:token-icon-toast-info data-[type=info]:text-toast-fg-info",
      "data-[type=warning]:token-icon-toast-warning data-[type=warning]:text-toast-fg-warning",
    ],
    title: [
      "min-w-0 flex-1 break-words font-toast-title text-toast-fg-readable text-toast-title-size",
      "data-[type=error]:text-toast-fg-readable",
      "data-[type=success]:text-toast-fg-readable",
      "data-[type=info]:text-toast-fg-readable",
      "data-[type=warning]:text-toast-fg-readable",
    ],
    description: [
      "mt-toast-description break-words text-toast-description-size text-toast-fg-readable",
    ],
    // Positioning only — ActionIcon owns size, glyph and neutral hover pill.
    closeButton: ["ms-auto self-start"],
  },
})

// Toast Item Component
type ToastProps = {
  actor: toast.Options<ReactNode>
  index: number
  parent: toast.GroupService
  placement?: toast.Placement
}

export function Toast({ actor, index, parent, placement }: ToastProps) {
  const composedProps = {
    ...actor,
    index,
    parent,
    placement,
  }
  const service = useMachine(toast.machine, composedProps)
  const api = toast.connect(service, normalizeProps)
  const rootProps = api.getRootProps()
  const onKeyDown = rootProps.onKeyDown
  rootProps.onKeyDown = (event) => {
    // Zag dismisses on Escape regardless of closable. Keep unfinished
    // progress visible; programmatic completion/removal still works.
    if (event.key === "Escape" && !api.closable) {
      return
    }
    onKeyDown?.(event)
  }

  const { root, header, iconFrame, icon, title, description, closeButton } =
    toastVariants()

  return (
    <div className={root()} {...rootProps}>
      <span {...api.getGhostBeforeProps()} />
      <div className={header()}>
        <span aria-hidden="true" className={iconFrame()}>
          <span className={icon()} data-type={api.type} />
        </span>
        <div className={title()} {...api.getTitleProps()} data-type={api.type}>
          {api.title}
        </div>
        {api.closable && (
          <ActionIcon
            className={closeButton()}
            icon="token-icon-toast-close"
            size="sm"
            tone="neutral"
            {...api.getCloseTriggerProps()}
            aria-label="Close notification"
          />
        )}
      </div>
      {api.description && (
        <div
          className={description()}
          {...api.getDescriptionProps()}
          data-type={api.type}
        >
          {api.description}
        </div>
      )}
      {actor.action && (
        <Button
          className="mt-toast-description self-start"
          size="sm"
          theme="outlined"
          variant="secondary"
          {...api.getActionTriggerProps()}
        >
          {actor.action.label}
        </Button>
      )}
      <span {...api.getGhostAfterProps()} />
    </div>
  )
}

// Toast Group Component
// Preserve the legacy exported configuration shape; runtime configuration lives
// on the store supplied to Toaster (or createToaster), not on each notification.
export type ToastContainerProps = Pick<
  toast.StoreProps,
  "placement" | "gap" | "offsets" | "overlap" | "max"
> &
  VariantProps<typeof toastVariants> & {
    store?: toast.Store<ReactNode>
  }

/** Create one store per application or isolated preview, not per notification. */
export function createToaster(options: toast.StoreProps = {}) {
  return toast.createStore<ReactNode>({
    placement: "bottom-end",
    gap: 16,
    offsets: "24px",
    ...options,
  })
}

const ToastContext = createContext<toast.Store<ReactNode> | null>(null)

/** Scope useToast and its single Toaster to an isolated application surface. */
export function ToastProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createToaster())
  useEffect(() => () => store.remove(), [store])
  return (
    <ToastContext.Provider value={store}>
      {children}
      <Toaster store={store} />
    </ToastContext.Provider>
  )
}

// Create the global toast store
export const toaster = createToaster()

// Zag 1.x uses a placement-only region ID. Namespace both the rendered ID
// and the two region lookups so separate stores can coexist in Docs without
// breaking notification keyboard focus or dismissable-layer membership.
const scopedGroupMachine: typeof toast.group.machine = {
  ...toast.group.machine,
  implementations: {
    ...toast.group.machine.implementations,
    actions: {
      ...toast.group.machine.implementations?.actions,
      focusRegionEl(params) {
        if (params.context.get("toasts").length === 0) {
          return
        }
        toast.group.machine.implementations?.actions?.focusRegionEl?.({
          ...params,
          scope: {
            ...params.scope,
            getById: (id) =>
              params.scope.getById(
                id.startsWith("toast-group:")
                  ? `toast-group:${params.scope.id}`
                  : id
              ),
          },
        })
      },
      setDismissableBranch(params) {
        toast.group.machine.implementations?.actions?.setDismissableBranch?.({
          ...params,
          scope: {
            ...params.scope,
            getById: (id) =>
              params.scope.getById(
                id.startsWith("toast-group:")
                  ? `toast-group:${params.scope.id}`
                  : id
              ),
          },
        })
      },
    },
  },
}

export function Toaster({ store = toaster }: ToastContainerProps = {}) {
  const groupId = useId()
  const modalContainer = useActiveModalContainer()
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    // Own the portal target, not React's children. Reparenting this stable host
    // preserves toast actors, remaining timers and lifecycle callbacks.
    const host = document.createElement("div")
    host.setAttribute("data-live-announcer", "")
    host.popover = "manual"
    host.className = toastVariants().viewport()
    document.body.appendChild(host)
    setPortalHost(host)
    return () => host.remove()
  }, [])
  useLayoutEffect(() => {
    if (portalHost) {
      const parent = modalContainer ?? portalHost.ownerDocument.body
      parent.appendChild(portalHost)
      // Keep DOM membership in the focus scope, but escape transformed drawer
      // containing blocks. Manual popovers do not light-dismiss or consume Escape.
      portalHost.showPopover()
    }
  }, [modalContainer, portalHost])
  const service = useMachine(scopedGroupMachine, {
    id: groupId,
    store,
  })
  const api = toast.group.connect(service, normalizeProps)
  const { group } = toastVariants()
  if (!portalHost) {
    return null
  }
  return createPortal(
    <div
      className={group()}
      {...api.getGroupProps()}
      id={`toast-group:${groupId}`}
    >
      {api.getToasts().map((notification, index) => (
        <Toast
          actor={notification}
          index={index}
          key={notification.id}
          parent={service}
        />
      ))}
    </div>,
    portalHost
  )
}

// Hook for using toaster in components
export function useToast() {
  return useContext(ToastContext) ?? toaster
}
