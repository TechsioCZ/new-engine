import type { ReactNode, Ref } from "react"

import {
  Popover,
  type PopoverContentProps,
  type PopoverRootProps,
  type PopoverTriggerProps,
} from "../molecules/popover"

export type PopoverTemplateProps = Omit<PopoverRootProps, "children"> & {
  children: ReactNode
  contentClassName?: string | undefined
  contentProps?:
    | Omit<PopoverContentProps, "children" | "className" | "ref">
    | undefined
  contentRef?: Ref<HTMLDivElement> | undefined
  description?: ReactNode | undefined
  disabled?: boolean | undefined
  showArrow?: boolean | undefined
  showCloseButton?: boolean | undefined
  title?: ReactNode | undefined
  trigger: ReactNode
  triggerClassName?: string | undefined
  triggerProps?:
    | Omit<PopoverTriggerProps, "children" | "className" | "disabled" | "ref">
    | undefined
  triggerRef?: Ref<HTMLButtonElement> | undefined
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
