/*
 * Dialog — @techsio/ui-kit molecule.
 *
 * @component Dialog
 * @componentVersion v1.0.0
 * @skill dialog-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the dialog-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/dialog"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import { useId } from "react"
import type { ReactNode } from "react"
import { tv } from "tailwind-variants"
import type { VariantProps } from "tailwind-variants"

import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"

const dialogVariants = tv({
  compoundVariants: [
    // Width for left/right drawers
    {
      class: { content: "w-dialog-xs" },
      placement: ["left", "right"],
      size: "xs",
    },
    {
      class: { content: "w-dialog-sm" },
      placement: ["left", "right"],
      size: "sm",
    },
    {
      class: { content: "w-dialog-md" },
      placement: ["left", "right"],
      size: "md",
    },
    {
      class: { content: "w-dialog-lg" },
      placement: ["left", "right"],
      size: "lg",
    },
    {
      class: { content: "w-dialog-xl" },
      placement: ["left", "right"],
      size: "xl",
    },
    {
      class: { content: "w-full" },
      placement: ["left", "right"],
      size: "full",
    },

    // Height for top/bottom drawers
    {
      class: { content: "h-dialog-xs" },
      placement: ["top", "bottom"],
      size: "xs",
    },
    {
      class: { content: "h-dialog-sm" },
      placement: ["top", "bottom"],
      size: "sm",
    },
    {
      class: { content: "h-dialog-md" },
      placement: ["top", "bottom"],
      size: "md",
    },
    {
      class: { content: "h-dialog-lg" },
      placement: ["top", "bottom"],
      size: "lg",
    },
    {
      class: { content: "h-dialog-xl" },
      placement: ["top", "bottom"],
      size: "xl",
    },
    {
      class: { content: "h-full" },
      placement: ["top", "bottom"],
      size: "full",
    },
  ],
  defaultVariants: {
    behavior: "modal",
    placement: "center",
    position: "fixed",
    size: "md",
  },
  slots: {
    actions:
      "mt-auto flex shrink-0 justify-end gap-dialog-actions pt-dialog-actions-top",
    backdrop: ["inset-0 z-(--z-dialog-backdrop)"],
    // Positioning only — the close button is an ActionIcon that owns its size,
    // glyph and neutral hover pill.
    closeTrigger: [
      "absolute top-dialog-close-trigger-offset right-dialog-close-trigger-offset",
    ],
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
    description: ["text-dialog-description text-dialog-description-fg"],
    positioner: ["inset-0 z-(--z-dialog-positioner) flex"],
    title: ["font-dialog-title text-dialog-title text-dialog-title-fg"],
    trigger: [],
  },
  variants: {
    behavior: {
      modal: {
        backdrop: "bg-dialog-backdrop-bg-modal",
      },
      modeless: {
        backdrop: "bg-transparent",
        content: "pointer-events-auto",
        positioner: "pointer-events-none",
      },
    },
    placement: {
      bottom: {
        content: "w-full rounded-dialog-content-edge border-b-0",
        positioner: "items-end justify-stretch",
      },
      center: {
        content:
          "max-h-(--container-dialog-center-max-h) max-w-dialog-center-max-w rounded-dialog-content-center",
        positioner: "items-center justify-center",
      },
      left: {
        content: "h-full rounded-dialog-content-side border-l-0",
        positioner: "items-stretch justify-start",
      },
      right: {
        content: "h-full rounded-dialog-content-side border-r-0",
        positioner: "items-stretch justify-end",
      },
      top: {
        content: "w-full rounded-dialog-content-edge border-t-0",
        positioner: "items-start justify-stretch",
      },
    },
    position: {
      absolute: {
        backdrop: "absolute",
        positioner: "absolute",
      },
      fixed: {
        backdrop: "fixed",
        positioner: "fixed",
      },
      relative: {
        backdrop: "relative",
        positioner: "relative",
      },
      sticky: {
        backdrop: "sticky",
        positioner: "sticky",
      },
    },
    size: {
      full: {},
      lg: {},
      md: {},
      sm: {},
      xl: {},
      xs: {},
    },
  },
})

export interface DialogProps extends VariantProps<typeof dialogVariants> {
  open?: boolean | undefined
  onOpenChange?: ((details: { open: boolean }) => void) | undefined
  initialFocusEl?: (() => HTMLElement | null) | undefined
  finalFocusEl?: (() => HTMLElement | null) | undefined
  closeOnEscape?: boolean | undefined
  closeOnInteractOutside?: boolean | undefined
  preventScroll?: boolean | undefined
  trapFocus?: boolean | undefined
  role?: "dialog" | "alertdialog" | undefined
  id?: string | undefined
  customTrigger?: boolean | undefined
  triggerText?: string | undefined
  title?: ReactNode | undefined
  description?: ReactNode | undefined
  children?: ReactNode | undefined
  actions?: ReactNode | undefined
  hideCloseButton?: boolean | undefined
  className?: string | undefined
  modal?: boolean | undefined
  portal?: boolean | undefined
}

interface DialogMachineOptions {
  closeOnEscape: boolean
  closeOnInteractOutside: boolean
  finalFocusEl: (() => HTMLElement | null) | undefined
  id: string | undefined
  initialFocusEl: (() => HTMLElement | null) | undefined
  modal: boolean
  onOpenChange: ((details: { open: boolean }) => void) | undefined
  open: boolean | undefined
  preventScroll: boolean
  role: "dialog" | "alertdialog"
  trapFocus: boolean
}

// Builds the Zag dialog machine and returns its connected API. Optional machine props are spread
// conditionally so an explicit `undefined` is never handed to the machine under
// `exactOptionalPropertyTypes`.
const useDialogApi = ({
  closeOnEscape,
  closeOnInteractOutside,
  finalFocusEl,
  id,
  initialFocusEl,
  modal,
  onOpenChange,
  open,
  preventScroll,
  role,
  trapFocus,
}: DialogMachineOptions) => {
  const generatedId = useId()
  // A caller-supplied id wins only when it is a usable string; a missing or empty id falls back to
  // the generated one so the machine always has a stable, non-empty id.
  const uniqueId = id === undefined || id === "" ? generatedId : id

  const service = useMachine(machine, {
    id: uniqueId,
    ...(onOpenChange !== undefined && { onOpenChange }),
    closeOnEscape,
    closeOnInteractOutside,
    modal,
    preventScroll,
    role,
    trapFocus,
    ...(initialFocusEl !== undefined && { initialFocusEl }),
    ...(finalFocusEl !== undefined && { finalFocusEl }),
    ...(open !== undefined && { open }),
  })

  return connect(service, normalizeProps)
}

export const Dialog = ({
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
}: DialogProps) => {
  const api = useDialogApi({
    closeOnEscape,
    closeOnInteractOutside,
    finalFocusEl,
    id,
    initialFocusEl,
    modal,
    onOpenChange,
    open,
    preventScroll,
    role,
    trapFocus,
  })

  const {
    backdrop,
    positioner,
    content,
    trigger: triggerSlot,
    title: titleSlot,
    description: descriptionSlot,
    closeTrigger,
    actions: actionsSlot,
  } = dialogVariants({ behavior, placement, position, size })

  // `ReactNode` has mixed truthiness, so the render guards are narrowed to booleans while keeping
  // the original truthy-only rendering decision.
  const hasTitle = Boolean(title)
  const hasDescription = Boolean(description)
  const hasActions = Boolean(actions)

  const dialogContent = () => (
    <>
      <div className={backdrop()} {...api.getBackdropProps()} />
      <div className={positioner()} {...api.getPositionerProps()}>
        <div className={content({ className })} {...api.getContentProps()}>
          {!hideCloseButton && (
            <ActionIcon
              className={closeTrigger()}
              icon="token-icon-dialog-close"
              size="md"
              tone="neutral"
              {...api.getCloseTriggerProps()}
              aria-label="Close dialog"
            />
          )}
          {hasTitle && (
            <h2 className={titleSlot()} {...api.getTitleProps()}>
              {title}
            </h2>
          )}
          {hasDescription && (
            <div className={descriptionSlot()} {...api.getDescriptionProps()}>
              {description}
            </div>
          )}
          {children}
          {hasActions && <div className={actionsSlot()}>{actions}</div>}
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
