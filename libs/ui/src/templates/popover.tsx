import type { ReactNode, Ref } from "react"
import {
  Popover,
  type PopoverContentProps,
  type PopoverRootProps,
  type PopoverTriggerProps,
} from "../molecules/popover"

export type PopoverTemplateProps = Omit<PopoverRootProps, "children"> & {
  children: ReactNode
  contentClassName?: string
  contentProps?: Omit<PopoverContentProps, "children" | "className" | "ref">
  contentRef?: Ref<HTMLDivElement>
  description?: ReactNode
  disabled?: boolean
  showArrow?: boolean
  showCloseButton?: boolean
  title?: ReactNode
  trigger: ReactNode
  triggerClassName?: string
  triggerProps?: Omit<
    PopoverTriggerProps,
    "children" | "className" | "disabled" | "ref"
  >
  triggerRef?: Ref<HTMLButtonElement>
}

export function PopoverTemplate({
  children,
  contentClassName,
  contentProps,
  contentRef,
  description,
  disabled = false,
  showArrow = true,
  showCloseButton = false,
  title,
  trigger,
  triggerClassName,
  triggerProps,
  triggerRef,
  ...rootProps
}: PopoverTemplateProps) {
  return (
    <Popover.Root {...rootProps}>
      <Popover.Trigger
        {...triggerProps}
        className={triggerClassName}
        disabled={disabled}
        ref={triggerRef}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content
          {...contentProps}
          className={contentClassName}
          ref={contentRef}
        >
          {showCloseButton && <Popover.CloseTrigger />}
          {showArrow && <Popover.Arrow />}
          {title && <Popover.Title>{title}</Popover.Title>}
          {description && (
            <Popover.Description>{description}</Popover.Description>
          )}
          {children}
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}
