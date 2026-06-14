import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import * as toast from "@zag-js/toast"
import { type ReactNode, useId } from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { tv } from "../utils"

// Toast Item Variants
const toastVariants = tv({
  slots: {
    root: [
      "relative flex flex-col rounded-toast-root",
      "border-(length:--border-width-toast) bg-toast-bg shadow-lg",
      "w-toast-width overflow-hidden p-toast-root",
      "data-[type=error]:border-toast-error-border data-[type=error]:bg-toast-error-bg",
      "data-[type=success]:border-toast-success-border data-[type=success]:bg-toast-success-bg",
      "data-[type=info]:border-toast-info-border data-[type=info]:bg-toast-info-bg",
      "data-[type=warning]:border-toast-warning-border data-[type=warning]:bg-toast-warning-bg",

      // required styles by zag-js
      "translate-x-(--x) translate-y-(--y)",
      "scale-(--scale) opacity-(--opacity)",
      "z-(--z-index) h-(--height)",
      "will-change-[translate,opacity,scale]",
      "transition-[translate,scale,opacity] duration-400 motion-reduce:transition-none",
    ],
    group: "relative flex flex-col",
    header: "relative flex items-center gap-toast-content",
    icon: [
      "flex-shrink-0 text-toast-icon",
      "data-[type=error]:token-icon-toast-error data-[type=error]:text-toast-error-icon",
      "data-[type=success]:token-icon-toast-success data-[type=success]:text-toast-success-icon",
      "data-[type=info]:token-icon-toast-info data-[type=info]:text-toast-info-icon",
      "data-[type=warning]:token-icon-toast-warning data-[type=warning]:text-toast-warning-icon",
    ],
    title: [
      "font-toast-title text-toast-fg text-toast-title",
      "data-[type=error]:text-toast-error-title",
      "data-[type=success]:text-toast-success-title",
      "data-[type=info]:text-toast-info-title",
      "data-[type=warning]:text-toast-warning-title",
    ],
    description: [
      "mt-toast-description text-toast-description text-toast-fg",
    ],
    closeButton: [
      "ms-auto grid flex-shrink-0 place-items-center px-0 py-0",
      "cursor-pointer",
      "text-toast-close-fg hover:text-toast-close-fg-hover",
    ],
  },
})

// Toast Item Component
interface ToastProps {
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

  const { root, header, icon, title, description, closeButton } =
    toastVariants()

  return (
    <div className={root()} {...api.getRootProps()}>
      <span {...api.getGhostBeforeProps()} />
      <div className={header()} {...api.getTitleProps()}>
        <span className={icon()} data-type={api.type} />
        <div className={title()} data-type={api.type}>
          {api.type === "loading" ? "loading..." : api.title}
        </div>
        <Button
          className={closeButton()}
          theme="borderless"
          {...api.getCloseTriggerProps()}
          icon="token-icon-toast-close"
        />
      </div>
      <div
        className={description()}
        {...api.getDescriptionProps()}
        data-type={api.type}
      >
        {api.description}
      </div>
      <span {...api.getGhostAfterProps()} />
    </div>
  )
}

// Toast Group Component
export interface ToastContainerProps
  extends VariantProps<typeof toastVariants> {
  placement?: toast.Placement
  gap?: number
  offsets?: string
  overlap?: boolean
  max?: number
}

// Create the global toast store
export const toaster = toast.createStore({
  placement: "bottom-end",
  gap: 16,
  offsets: "24px",
})

export function Toaster() {
  const service = useMachine(toast.group.machine, {
    id: useId(),
    store: toaster,
  })
  const api = toast.group.connect(service, normalizeProps)
  const { group } = toastVariants()
  return (
    <Portal>
      <div className={group()} {...api.getGroupProps()}>
        {api.getToasts().map((toast, index) => (
          <Toast actor={toast} index={index} key={toast.id} parent={service} />
        ))}
      </div>
    </Portal>
  )
}

// Hook for using toaster in components
export function useToast() {
  return toaster
}
