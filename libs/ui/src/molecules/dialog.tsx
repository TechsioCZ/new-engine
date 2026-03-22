import * as dialog from "@zag-js/dialog"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import { type ReactNode, useId } from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"

const dialogVariants = tv({
  slots: {
    backdrop: ["inset-0 z-(--z-dialog-backdrop)"],
    positioner: ["inset-0 z-(--z-dialog-positioner) flex"],
    content: [
      "relative flex flex-col gap-dialog-content p-dialog-content",
      "bg-dialog-content-bg text-dialog-content-fg",
      "border-(length:--border-width-dialog) border-dialog-content-border",
      "shadow-dialog-content",
      "overflow-y-auto",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-dialog-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    title: ["font-dialog-title text-dialog-title-fg text-dialog-title-size"],
    description: ["text-dialog-description-fg text-dialog-description-size"],
    trigger: [],
    closeTrigger: [
      "absolute top-dialog-close-trigger-offset right-dialog-close-trigger-offset",
      "flex items-center justify-center",
      "rounded-dialog-close-trigger p-dialog-close-trigger-padding",
      "text-dialog-close-trigger-fg",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-dialog-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    actions:
      "mt-auto flex shrink-0 justify-end gap-dialog-actions pt-dialog-actions",
  },
  variants: {
    placement: {
      center: {
        positioner: "items-center justify-center",
        content:
          "max-h-dialog-center-h-max max-w-dialog-center-w-max rounded-dialog-center",
      },
      left: {
        positioner: "items-stretch justify-start",
        content: "h-full rounded-dialog-left border-l-0",
      },
      right: {
        positioner: "items-stretch justify-end",
        content: "h-full rounded-dialog-right border-r-0",
      },
      top: {
        positioner: "items-start justify-stretch",
        content: "w-full rounded-dialog-top border-t-0",
      },
      bottom: {
        positioner: "items-end justify-stretch",
        content: "w-full rounded-dialog-bottom border-b-0",
      },
    },
    position: {
      fixed: {
        backdrop: "fixed",
        positioner: "fixed",
      },
      absolute: {
        backdrop: "absolute",
        positioner: "absolute",
      },
      sticky: {
        backdrop: "sticky",
        positioner: "sticky",
      },
      relative: {
        backdrop: "relative",
        positioner: "relative",
      },
    },
    size: {
      xs: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
      full: {},
    },
    behavior: {
      modal: {
        backdrop: "bg-dialog-backdrop-bg",
      },
      modeless: {
        backdrop: "bg-transparent",
        positioner: "pointer-events-none",
        content: "pointer-events-auto",
      },
    },
  },
  compoundVariants: [
    // Width for left/right drawers
    {
      placement: ["left", "right"],
      size: "xs",
      class: { content: "w-dialog-xs" },
    },
    {
      placement: ["left", "right"],
      size: "sm",
      class: { content: "w-dialog-sm" },
    },
    {
      placement: ["left", "right"],
      size: "md",
      class: { content: "w-dialog-md" },
    },
    {
      placement: ["left", "right"],
      size: "lg",
      class: { content: "w-dialog-lg" },
    },
    {
      placement: ["left", "right"],
      size: "xl",
      class: { content: "w-dialog-xl" },
    },
    {
      placement: ["left", "right"],
      size: "full",
      class: { content: "w-full" },
    },

    // Height for top/bottom drawers
    {
      placement: ["top", "bottom"],
      size: "xs",
      class: { content: "h-dialog-xs" },
    },
    {
      placement: ["top", "bottom"],
      size: "sm",
      class: { content: "h-dialog-sm" },
    },
    {
      placement: ["top", "bottom"],
      size: "md",
      class: { content: "h-dialog-md" },
    },
    {
      placement: ["top", "bottom"],
      size: "lg",
      class: { content: "h-dialog-lg" },
    },
    {
      placement: ["top", "bottom"],
      size: "xl",
      class: { content: "h-dialog-xl" },
    },
    {
      placement: ["top", "bottom"],
      size: "full",
      class: { content: "h-full" },
    },
  ],
  defaultVariants: {
    placement: "center",
    behavior: "modal",
    size: "md",
    position: "fixed",
  },
})

export interface DialogProps extends VariantProps<typeof dialogVariants> {
  open?: boolean
  onOpenChange?: (details: { open: boolean }) => void
  initialFocusEl?: () => HTMLElement | null
  finalFocusEl?: () => HTMLElement | null
  closeOnEscape?: boolean
  closeOnInteractOutside?: boolean
  preventScroll?: boolean
  trapFocus?: boolean
  role?: "dialog" | "alertdialog"
  id?: string
  customTrigger?: boolean
  triggerText?: string
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  hideCloseButton?: boolean
  className?: string
  modal?: boolean
  portal?: boolean
}

export function Dialog({
  id,
  open,
  onOpenChange,
  initialFocusEl,
  finalFocusEl,
  role = "dialog",
  placement = "center",
  position = "fixed",
  size = "md",
  behavior = "modal",
  closeOnEscape = true,
  closeOnInteractOutside = true,
  preventScroll = true,
  trapFocus = true,
  customTrigger = false,
  triggerText = "Open",
  title,
  description,
  children,
  hideCloseButton = false,
  actions,
  className,
  modal = true,
  portal = true,
}: DialogProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId

  const service = useMachine(dialog.machine, {
    id: uniqueId,
    onOpenChange,
    role,
    closeOnEscape,
    closeOnInteractOutside,
    preventScroll,
    trapFocus,
    initialFocusEl,
    finalFocusEl,
    modal,
    ...(open !== undefined && { open }),
  })

  const api = dialog.connect(service as dialog.Service, normalizeProps)

  const {
    backdrop,
    positioner,
    content,
    trigger: triggerSlot,
    title: titleSlot,
    description: descriptionSlot,
    closeTrigger,
    actions: actionsSlot,
  } = dialogVariants({ placement, size, behavior, position })

  const dialogContent = () => (
    <>
      <div className={backdrop()} {...api.getBackdropProps()} />
      <div className={positioner()} {...api.getPositionerProps()}>
        <div className={content({ className })} {...api.getContentProps()}>
          {!hideCloseButton && (
            <Button
              className={closeTrigger()}
              theme="borderless"
              {...api.getCloseTriggerProps()}
              icon="token-icon-dialog-close"
            />
          )}
          {title && (
            <h2 className={titleSlot()} {...api.getTitleProps()}>
              {title}
            </h2>
          )}
          {description && (
            <div className={descriptionSlot()} {...api.getDescriptionProps()}>
              {description}
            </div>
          )}
          {children}
          {actions && <div className={actionsSlot()}>{actions}</div>}
        </div>
      </div>
    </>
  )

  return (
    <>
      {!customTrigger && (
        <Button
          className={triggerSlot()}
          size="sm"
          variant="primary"
          {...api.getTriggerProps()}
        >
          {triggerText}
        </Button>
      )}

      {api.open &&
        (portal ? <Portal>{dialogContent()}</Portal> : dialogContent())}
    </>
  )
}
