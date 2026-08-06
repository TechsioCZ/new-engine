/*
 * Popover — @techsio/ui-kit molecule.
 *
 * @component Popover
 * @componentVersion v1.0.1
 * @skill popover-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the popover-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/popover"
import type {
  Api as PopoverApi,
  Props as PopoverMachineProps,
  Placement as PopoverPlacement,
  PositioningOptions as PopoverPositioningOptions,
  Service as PopoverService,
} from "@zag-js/popover"
import { mergeProps, normalizeProps, Portal, useMachine } from "@zag-js/react"
import { createContext, useContext, useId } from "react"
import type {
  ComponentPropsWithoutRef,
  MouseEvent,
  ReactNode,
  Ref,
} from "react"
import type { VariantProps } from "tailwind-variants"

import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import type { ButtonProps } from "../atoms/button"
import { tv } from "../utils"

const popoverVariants = tv({
  defaultVariants: {
    border: true,
    shadow: true,
    size: "md",
  },
  slots: {
    arrow: "",
    arrowTip: "",
    closeTrigger: ["absolute top-2 right-2"],
    content: [
      "bg-popover-bg",
      "text-popover-fg",
      "rounded-popover",
      "outline-none",
      "z-50",
      "relative",
    ],
    description: [
      "text-popover-description text-popover-description-fg",
      "leading-normal",
    ],
    indicator: ["data-[state=open]:rotate-180"],
    positioner: ["absolute"],
    title: ["font-popover-title", "leading-none", "mb-popover-title"],
    trigger: ["p-popover-trigger"],
  },
  variants: {
    border: {
      true: {
        arrowTip: "border-popover-border border-t border-l",
        content: "border border-popover-border",
      },
    },
    shadow: {
      true: {
        content: "shadow-popover",
      },
    },
    size: {
      lg: {
        content: "p-popover-lg text-lg",
        title: "text-popover-title-lg",
      },
      md: {
        content: "p-popover-md",
        title: "text-popover-title-md",
      },
      sm: {
        content: "p-popover-sm text-sm",
        title: "text-popover-title-sm",
      },
    },
  },
})

// Hoisted so the default positioning offset keeps a stable reference instead of being rebuilt on
// every render of the root.
const DEFAULT_OFFSET: NonNullable<PopoverPositioningOptions["offset"]> = {
  crossAxis: 0,
  mainAxis: 8,
}

type PopoverStyles = ReturnType<typeof popoverVariants>

interface PopoverContextValue {
  api: PopoverApi
  placement: PopoverPlacement
  styles: PopoverStyles
}

// One context per value so each provider receives an identifier rather than an object literal
// constructed during render. `usePopoverContext` recomposes them for consumers.
const PopoverApiContext = createContext<PopoverApi | null>(null)
const PopoverPlacementContext = createContext<PopoverPlacement | null>(null)
const PopoverStylesContext = createContext<PopoverStyles | null>(null)

const usePopoverContext = (): PopoverContextValue => {
  const api = useContext(PopoverApiContext)
  const placement = useContext(PopoverPlacementContext)
  const styles = useContext(PopoverStylesContext)

  // All three are populated together by the root, so a missing one means the part was rendered
  // outside `Popover.Root`.
  if (api === null || placement === null || styles === null) {
    throw new Error("Popover components must be used within Popover.Root")
  }

  return { api, placement, styles }
}

export type PopoverRootProps = VariantProps<typeof popoverVariants> &
  Omit<PopoverMachineProps, "id" | "positioning"> & {
    children: ReactNode
    flip?: PopoverPositioningOptions["flip"] | undefined
    gutter?: PopoverPositioningOptions["gutter"] | undefined
    id?: string | undefined
    offset?: PopoverPositioningOptions["offset"] | undefined
    overflowPadding?: PopoverPositioningOptions["overflowPadding"] | undefined
    placement?: PopoverPlacement | undefined
    sameWidth?: PopoverPositioningOptions["sameWidth"] | undefined
    slide?: PopoverPositioningOptions["slide"] | undefined
  }

export const Popover = ({
  autoFocus = true,
  border,
  children,
  closeOnEscape = true,
  closeOnInteractOutside = true,
  defaultOpen,
  dir = "ltr",
  flip = true,
  gutter = 8,
  id,
  modal = false,
  offset = DEFAULT_OFFSET,
  onOpenChange,
  onPointerDownOutside,
  open,
  overflowPadding = 8,
  placement = "bottom",
  portalled = true,
  sameWidth = false,
  shadow,
  size,
  slide = true,
  ...props
}: PopoverRootProps) => {
  const generatedId = useId()
  // A caller-supplied id wins only when it is a usable string; a missing or empty id falls back to
  // the generated one so the machine always has a stable, non-empty id.
  const uniqueId = id === undefined || id === "" ? generatedId : id

  const machineProps = Object.fromEntries(
    Object.entries(props).filter(([, option]) => option !== undefined),
  )
  const service = useMachine(machine, {
    ...machineProps,
    autoFocus,
    closeOnEscape,
    closeOnInteractOutside,
    ...(defaultOpen !== undefined && { defaultOpen }),
    dir,
    id: uniqueId,
    modal,
    ...(onOpenChange !== undefined && { onOpenChange }),
    ...(onPointerDownOutside !== undefined && { onPointerDownOutside }),
    ...(open !== undefined && { open }),
    portalled,
    positioning: {
      flip,
      gutter,
      offset,
      overflowPadding,
      placement,
      sameWidth,
      slide,
    },
  })

  const api = connect(service as PopoverService, normalizeProps)
  const styles = popoverVariants({ border, shadow, size })

  return (
    <PopoverApiContext.Provider value={api}>
      <PopoverPlacementContext.Provider value={placement}>
        <PopoverStylesContext.Provider value={styles}>
          {children}
        </PopoverStylesContext.Provider>
      </PopoverPlacementContext.Provider>
    </PopoverApiContext.Provider>
  )
}

export type PopoverAnchorProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

Popover.Anchor = function Anchor({
  className,
  ref,
  ...props
}: PopoverAnchorProps) {
  const { api } = usePopoverContext()
  const anchorProps = mergeProps(api.getAnchorProps(), props)

  return <div {...anchorProps} className={className} ref={ref} />
}

export type PopoverTriggerProps = ButtonProps & {
  clickBehavior?: "toggle" | "manual" | undefined
  ref?: Ref<HTMLButtonElement> | undefined
}

Popover.Trigger = function Trigger({
  children,
  className,
  clickBehavior = "toggle",
  disabled,
  onClick,
  ref,
  size = "current",
  theme = "borderless",
  type = "button",
  ...props
}: PopoverTriggerProps) {
  const { api, styles } = usePopoverContext()
  const {
    disabled: machineDisabled,
    onClick: onMachineClick,
    ...machineTriggerProps
  } = api.getTriggerProps() as ComponentPropsWithoutRef<"button">
  const buttonProps = mergeProps(machineTriggerProps, props)
  // Both flags are `boolean | undefined`, so the explicit comparisons keep the original
  // "disabled when either side is truthy" result without a nullable conditional.
  const isDisabled = disabled === true || machineDisabled === true

  return (
    <Button
      {...buttonProps}
      className={styles.trigger({ className })}
      data-state={api.open ? "open" : "closed"}
      disabled={isDisabled}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented && clickBehavior === "toggle") {
          onMachineClick?.(event)
        }
      }}
      ref={ref}
      size={size}
      theme={theme}
      type={type}
    >
      {children}
    </Button>
  )
}

export type PopoverIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

Popover.Indicator = function Indicator({
  className,
  ref,
  ...props
}: PopoverIndicatorProps) {
  const { api, styles } = usePopoverContext()
  const indicatorProps = mergeProps(api.getIndicatorProps(), props)

  return (
    <span
      {...indicatorProps}
      className={styles.indicator({ className })}
      data-state={api.open ? "open" : "closed"}
      ref={ref}
    />
  )
}

export type PopoverPositionerProps = ComponentPropsWithoutRef<"div"> & {
  forceMount?: boolean | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

Popover.Positioner = function Positioner({
  children,
  className,
  forceMount = false,
  ref,
  ...props
}: PopoverPositionerProps) {
  const { api, styles } = usePopoverContext()

  if (!(api.open || forceMount)) {
    return null
  }

  const positionerProps = mergeProps(api.getPositionerProps(), props)
  const positionerNode = (
    <div
      {...positionerProps}
      className={styles.positioner({ className })}
      ref={ref}
    >
      {children}
    </div>
  )

  return api.portalled ? <Portal>{positionerNode}</Portal> : positionerNode
}

export type PopoverContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

type PopoverContentMergedProps = ComponentPropsWithoutRef<"div"> & {
  "data-placement"?: PopoverPlacement | undefined
}

Popover.Content = function Content({
  children,
  className,
  ref,
  ...props
}: PopoverContentProps) {
  const { api, placement, styles } = usePopoverContext()
  const machineContentProps =
    api.getContentProps() as ComponentPropsWithoutRef<"div">
  const contentProps = mergeProps(
    machineContentProps,
    props,
  ) as PopoverContentMergedProps
  const contentPlacement = contentProps["data-placement"]
  // Derive data-side from Zag's computed placement so flipped positions animate from the actual side.
  const contentSide =
    typeof contentPlacement === "string"
      ? contentPlacement.split("-")[0]
      : placement.split("-")[0]

  return (
    <div
      {...contentProps}
      className={styles.content({ className })}
      data-side={contentSide}
      data-state={api.open ? "open" : "closed"}
      ref={ref}
    >
      {children}
    </div>
  )
}

export type PopoverArrowProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

Popover.Arrow = function Arrow({
  children,
  className,
  ref,
  ...props
}: PopoverArrowProps) {
  const { api, styles } = usePopoverContext()
  const arrowProps = mergeProps(api.getArrowProps(), props)

  return (
    <div {...arrowProps} className={styles.arrow({ className })} ref={ref}>
      {children ?? <Popover.ArrowTip />}
    </div>
  )
}

export type PopoverArrowTipProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

Popover.ArrowTip = function ArrowTip({
  className,
  ref,
  ...props
}: PopoverArrowTipProps) {
  const { api, styles } = usePopoverContext()
  const arrowTipProps = mergeProps(api.getArrowTipProps(), props)

  return (
    <div
      {...arrowTipProps}
      className={styles.arrowTip({ className })}
      ref={ref}
    />
  )
}

export type PopoverTitleProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

Popover.Title = function Title({
  className,
  ref,
  ...props
}: PopoverTitleProps) {
  const { api, styles } = usePopoverContext()
  const titleProps = mergeProps(api.getTitleProps(), props)

  return (
    <div {...titleProps} className={styles.title({ className })} ref={ref} />
  )
}

export type PopoverDescriptionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

Popover.Description = function Description({
  className,
  ref,
  ...props
}: PopoverDescriptionProps) {
  const { api, styles } = usePopoverContext()
  const descriptionProps = mergeProps(api.getDescriptionProps(), props)

  return (
    <div
      {...descriptionProps}
      className={styles.description({ className })}
      ref={ref}
    />
  )
}

export type PopoverCloseTriggerProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement> | undefined
}

Popover.CloseTrigger = function CloseTrigger({
  children,
  className,
  icon,
  onClick,
  ref,
  size = "current",
  theme = "unstyled",
  type = "button",
  ...props
}: PopoverCloseTriggerProps) {
  const { api, styles } = usePopoverContext()
  const { onClick: onMachineClick, ...machineCloseTriggerProps } =
    api.getCloseTriggerProps() as ComponentPropsWithoutRef<"button">
  const buttonProps = mergeProps(machineCloseTriggerProps, props)
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented) {
      onMachineClick?.(event)
    }
  }
  // `ReactNode` has mixed truthiness, so the branch guard is narrowed to a boolean while keeping
  // the original truthy-only rendering decision.
  const hasChildren = Boolean(children)

  // Icon-only close → shared ActionIcon (neutral pill). Labeled close keeps Button.
  if (!hasChildren) {
    return (
      <ActionIcon
        {...buttonProps}
        aria-label="Close popover"
        className={styles.closeTrigger({ className })}
        icon={icon ?? "token-icon-close"}
        onClick={handleClick}
        ref={ref}
        size="md"
        tone="neutral"
        type={type}
      />
    )
  }

  return (
    <Button
      {...buttonProps}
      className={styles.closeTrigger({ className })}
      icon={icon}
      onClick={handleClick}
      ref={ref}
      size={size}
      theme={theme}
      type={type}
    >
      {children}
    </Button>
  )
}

export interface PopoverContextProps {
  children: (api: PopoverApi) => ReactNode
}

// `ReactNode` includes `Promise<AwaitedReactNode>` under React 19 types, so the return type is
// annotated explicitly to keep this render-prop bridge synchronous.
Popover.Context = function Context({
  children,
}: PopoverContextProps): ReactNode {
  const { api } = usePopoverContext()

  return children(api)
}

Popover.Root = Popover
Popover.displayName = "Popover"
