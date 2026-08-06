/*
 * Toast — @techsio/ui-kit molecule.
 *
 * @component Toast
 * @componentVersion v1.0.1
 * @skill toast-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the toast-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import {
  connect as connectToast,
  group as toastGroup,
  machine as toastMachine,
} from "@zag-js/toast"
import type { GroupService, Options, Placement } from "@zag-js/toast"
import { useId } from "react"
import type { ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

import { ActionIcon } from "../atoms/action-icon"
import { tv } from "../utils"
import { toaster } from "./toast-store"

export { toaster } from "./toast-store"

// Toast Item Variants
const toastVariants = tv({
  slots: {
    closeButton: ["ms-auto"],
    description: ["mt-toast-description text-toast-description text-toast-fg"],
    group: "relative flex flex-col",
    header: "relative flex items-center gap-toast-content",
    icon: [
      "flex-shrink-0 text-toast-icon",
      "data-[type=error]:token-icon-toast-error data-[type=error]:text-toast-error-icon",
      "data-[type=success]:token-icon-toast-success data-[type=success]:text-toast-success-icon",
      "data-[type=info]:token-icon-toast-info data-[type=info]:text-toast-info-icon",
      "data-[type=warning]:token-icon-toast-warning data-[type=warning]:text-toast-warning-icon",
    ],
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
    title: [
      "font-toast-title text-toast-fg text-toast-title",
      "data-[type=error]:text-toast-error-title",
      "data-[type=success]:text-toast-success-title",
      "data-[type=info]:text-toast-info-title",
      "data-[type=warning]:text-toast-warning-title",
    ],
  },
})

// Toast Item Component
interface ToastProps {
  actor: Options<ReactNode>
  index: number
  parent: GroupService
  placement?: Placement | undefined
}

export const Toast = ({ actor, index, parent, placement }: ToastProps) => {
  const composedProps = {
    ...Object.fromEntries(
      Object.entries(actor).filter(([, option]) => option !== undefined),
    ),
    index,
    parent,
    ...(placement !== undefined && { placement }),
  }
  const service = useMachine(toastMachine, composedProps)
  const api = connectToast(service, normalizeProps)

  const { root, header, icon, title, description, closeButton } =
    toastVariants()

  return (
    <div {...api.getRootProps()} className={root()}>
      <span {...api.getGhostBeforeProps()} />
      <div {...api.getTitleProps()} className={header()}>
        <span className={icon()} data-type={api.type} />
        <div className={title()} data-type={api.type}>
          {api.type === "loading" ? "loading..." : api.title}
        </div>
        <ActionIcon
          {...api.getCloseTriggerProps()}
          aria-label="Close notification"
          className={closeButton()}
          icon="token-icon-toast-close"
          size="sm"
          tone="neutral"
        />
      </div>
      <div
        {...api.getDescriptionProps()}
        className={description()}
        data-type={api.type}
      >
        {api.description}
      </div>
      <span {...api.getGhostAfterProps()} />
    </div>
  )
}

// Toast Group Component
export interface ToastContainerProps extends VariantProps<
  typeof toastVariants
> {
  placement?: Placement | undefined
  gap?: number | undefined
  offsets?: string | undefined
  overlap?: boolean | undefined
  max?: number | undefined
}

export const Toaster = () => {
  const service = useMachine(toastGroup.machine, {
    id: useId(),
    store: toaster,
  })
  const api = toastGroup.connect(service, normalizeProps)
  const { group } = toastVariants()
  return (
    <Portal>
      <div {...api.getGroupProps()} className={group()}>
        {api.getToasts().map((toastItem, index) => (
          <Toast
            actor={toastItem}
            index={index}
            key={toastItem.id}
            parent={service}
          />
        ))}
      </div>
    </Portal>
  )
}

// Hook for using toaster in components
export const useToast = () => toaster
