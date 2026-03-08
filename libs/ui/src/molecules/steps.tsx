import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import {
  connect as connectSteps,
  type Props as StepsMachineProps,
  machine as stepsMachine,
  type Api as ZagStepsApi,
  type ItemState as ZagStepsItemState,
} from "@zag-js/steps"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useId,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button, type ButtonProps } from "../atoms/button"
import { Icon } from "../atoms/icon"
import { tv } from "../utils"

const stepsVariants = tv({
  slots: {
    root: [
      "flex w-full flex-col gap-steps-root",
      "text-steps-fg",
      "data-[orientation=vertical]:flex-row data-[orientation=vertical]:items-start",
    ],
    list: [
      "flex w-full gap-steps-list",
      "data-[orientation=horizontal]:items-start",
      "data-[orientation=vertical]:w-auto data-[orientation=vertical]:min-w-steps-list-vertical data-[orientation=vertical]:flex-col",
    ],
    panels: [
      "flex w-full flex-col gap-steps-panels",
      "data-[orientation=vertical]:min-w-0 data-[orientation=vertical]:flex-1",
    ],
    item: [
      "relative flex min-w-0 gap-steps-item",
      "data-[orientation=horizontal]:flex-1 data-[orientation=horizontal]:items-center",
      "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start",
    ],
    trigger: [
      "group relative flex min-w-0 items-center justify-start gap-steps-trigger",
      "text-left",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-steps-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[orientation=vertical]:items-start",
      "data-disabled:cursor-not-allowed",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    itemText: [
      "inline-flex min-w-0 flex-col gap-steps-text",
      "data-[orientation=vertical]:items-start",
    ],
    indicator: [
      "flex shrink-0 items-center justify-center rounded-steps-indicator",
      "border-(length:--border-width-steps-indicator) border-steps-indicator-border",
      "bg-steps-indicator-bg text-steps-indicator-fg",
      "group-hover:border-steps-indicator-border-hover group-hover:bg-steps-indicator-bg-hover",
      "data-current:border-steps-indicator-border-current data-current:bg-steps-indicator-bg-current data-current:text-steps-indicator-fg-current",
      "data-complete:border-steps-indicator-border-complete data-complete:bg-steps-indicator-bg-complete data-complete:text-steps-indicator-fg-complete",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    indicatorIcon: "text-steps-icon",
    number: ["font-steps-number leading-none"],
    title: [
      "truncate font-steps-title text-steps-title text-steps-title-fg",
      "data-current:text-steps-title-fg-current",
      "data-complete:text-steps-title-fg-complete",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    description: [
      "text-steps-description text-steps-description-fg",
      "data-current:text-steps-description-fg-current",
      "data-complete:text-steps-description-fg-complete",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    separator: [
      "shrink-0 rounded-steps-separator bg-steps-separator-bg",
      "data-current:bg-steps-separator-bg-current",
      "data-complete:bg-steps-separator-bg-complete",
      "data-last:hidden",
      "data-[orientation=horizontal]:h-steps-separator data-[orientation=horizontal]:flex-1",
      "data-[orientation=vertical]:ms-steps-separator-offset data-[orientation=vertical]:min-h-steps-separator-vertical data-[orientation=vertical]:w-steps-separator data-[orientation=vertical]:flex-1",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    progress: [
      "relative overflow-hidden rounded-steps-progress bg-steps-progress-bg",
      "data-[orientation=horizontal]:h-steps-progress data-[orientation=horizontal]:w-full",
      "data-[orientation=vertical]:w-steps-progress data-[orientation=vertical]:self-stretch",
    ],
    progressRange: [
      "absolute rounded-steps-progress bg-steps-progress-fill",
      "transition-[width,height] duration-200 motion-reduce:transition-none",
      "data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:start-0",
      "data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-0",
    ],
    content: [
      "border-(length:--border-width-steps-content) w-full rounded-steps-content",
      "border-steps-content-border bg-steps-content-bg",
      "text-steps-content-fg",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-steps-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    completedContent: [
      "border-(length:--border-width-steps-content) w-full rounded-steps-content",
      "border-steps-content-border bg-steps-content-bg",
      "text-steps-content-fg",
      "data-complete:border-steps-content-border-complete",
      "data-complete:bg-steps-content-bg-complete",
    ],
    navigation: [
      "flex flex-wrap items-center gap-steps-navigation",
      "data-[orientation=vertical]:justify-start",
    ],
    prevTrigger: "",
    nextTrigger: "",
  },
  variants: {
    variant: {
      subtle: {},
      solid: {
        trigger: [
          "rounded-steps-trigger px-steps-trigger-x py-steps-trigger-y",
          "hover:bg-steps-trigger-bg-hover",
          "data-current:bg-steps-trigger-bg-current",
          "data-complete:bg-steps-trigger-bg-complete",
        ],
        indicator: [
          "border-transparent bg-steps-indicator-bg-solid text-steps-indicator-fg-solid",
          "group-hover:bg-steps-indicator-bg-solid-hover",
          "data-current:bg-steps-indicator-bg-solid-current data-current:text-steps-indicator-fg-solid-current",
          "data-complete:bg-steps-indicator-bg-solid-complete data-complete:text-steps-indicator-fg-solid-complete",
        ],
      },
    },
    size: {
      sm: {
        indicator: "size-steps-indicator-sm",
        indicatorIcon: "text-steps-icon-sm",
        number: "text-steps-number-sm",
        title: "text-steps-title-sm",
        description: "text-steps-description-sm",
        content: "p-steps-content-sm text-steps-content-sm",
        completedContent: "p-steps-content-sm text-steps-content-sm",
      },
      md: {
        indicator: "size-steps-indicator-md",
        indicatorIcon: "text-steps-icon-md",
        number: "text-steps-number-md",
        title: "text-steps-title-md",
        description: "text-steps-description-md",
        content: "p-steps-content-md text-steps-content-md",
        completedContent: "p-steps-content-md text-steps-content-md",
      },
      lg: {
        indicator: "size-steps-indicator-lg",
        indicatorIcon: "text-steps-icon-lg",
        number: "text-steps-number-lg",
        title: "text-steps-title-lg",
        description: "text-steps-description-lg",
        content: "p-steps-content-lg text-steps-content-lg",
        completedContent: "p-steps-content-lg text-steps-content-lg",
      },
    },
  },
  defaultVariants: {
    variant: "subtle",
    size: "md",
  },
})

type StepsApi = ZagStepsApi
type StepsOrientation = "horizontal" | "vertical"
type StepsSize = NonNullable<VariantProps<typeof stepsVariants>["size"]>
type StepsItemState = ZagStepsItemState

type StepsContextValue = {
  api: StepsApi
  orientation: StepsOrientation
  size?: StepsSize
  styles: ReturnType<typeof stepsVariants>
}

const StepsContext = createContext<StepsContextValue | null>(null)

function useStepsContext() {
  const context = useContext(StepsContext)
  if (!context) {
    throw new Error("Steps components must be used within Steps.Root")
  }
  return context
}

type StepsItemContextValue = {
  index: number
  state: StepsItemState
}

const StepsItemContext = createContext<StepsItemContextValue | null>(null)

function useStepsItemContext() {
  const context = useContext(StepsItemContext)
  if (!context) {
    throw new Error("Steps item components must be used within Steps.Item")
  }
  return context
}

function getStepStatusDataProps(state: StepsItemState) {
  return {
    "data-complete": state.completed || undefined,
    "data-current": state.current || undefined,
    "data-incomplete": state.incomplete || undefined,
  }
}

function getOrientationFromApi(api: StepsApi): StepsOrientation {
  const rootProps = api.getRootProps() as {
    "data-orientation"?: StepsOrientation
  }

  return rootProps["data-orientation"] ?? "horizontal"
}

function getControlSize(size?: StepsSize): NonNullable<ButtonProps["size"]> {
  if (size === "sm") {
    return "sm"
  }

  if (size === "lg") {
    return "lg"
  }

  return "md"
}

export type StepsStoreProps = Omit<StepsMachineProps, "id"> & {
  id?: string
}

export function useSteps({ id, ...props }: StepsStoreProps) {
  const generatedId = useId()

  const service = useMachine(stepsMachine, {
    id: id ?? generatedId,
    ...props,
  })

  return connectSteps(service, normalizeProps)
}

type StepsRootSharedProps = VariantProps<typeof stepsVariants> &
  Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
    ref?: Ref<HTMLDivElement>
  }

export type StepsProps = StepsRootSharedProps &
  Omit<StepsMachineProps, "id"> & {
    id?: string
  }

export function Steps({
  id,
  count = 1,
  defaultStep,
  dir = "ltr",
  linear = false,
  onStepChange,
  onStepComplete,
  orientation = "horizontal",
  size,
  step,
  variant,
  children,
  className,
  ref,
  ...props
}: StepsProps) {
  const api = useSteps({
    count,
    defaultStep,
    dir,
    id,
    linear,
    onStepChange,
    onStepComplete,
    orientation,
    step,
  })
  const styles = stepsVariants({ size, variant })
  const rootProps = mergeProps(props, api.getRootProps())

  return (
    <StepsContext.Provider value={{ api, orientation, size, styles }}>
      <div className={styles.root({ className })} ref={ref} {...rootProps}>
        {children}
      </div>
    </StepsContext.Provider>
  )
}

type StepsRootProviderProps = StepsRootSharedProps & {
  value: StepsApi
}

Steps.RootProvider = function StepsRootProvider({
  value,
  size,
  variant,
  children,
  className,
  ref,
  ...props
}: StepsRootProviderProps) {
  const styles = stepsVariants({ size, variant })
  const resolvedOrientation = getOrientationFromApi(value)
  const rootProps = mergeProps(props, value.getRootProps())

  return (
    <StepsContext.Provider
      value={{
        api: value,
        orientation: resolvedOrientation,
        size,
        styles,
      }}
    >
      <div className={styles.root({ className })} ref={ref} {...rootProps}>
        {children}
      </div>
    </StepsContext.Provider>
  )
}

type StepsListProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Steps.List = function StepsList({
  children,
  className,
  ref,
  ...props
}: StepsListProps) {
  const { api, styles } = useStepsContext()
  const listProps = mergeProps(props, api.getListProps())

  return (
    <div className={styles.list({ className })} ref={ref} {...listProps}>
      {children}
    </div>
  )
}

type StepsPanelsProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Steps.Panels = function StepsPanels({
  children,
  className,
  ref,
  ...props
}: StepsPanelsProps) {
  const { orientation, styles } = useStepsContext()

  return (
    <div
      className={styles.panels({ className })}
      ref={ref}
      {...props}
      data-orientation={orientation}
    >
      {children}
    </div>
  )
}

type StepsNavigationProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Steps.Navigation = function StepsNavigation({
  children,
  className,
  ref,
  ...props
}: StepsNavigationProps) {
  const { orientation, styles } = useStepsContext()

  return (
    <div
      className={styles.navigation({ className })}
      ref={ref}
      {...props}
      data-orientation={orientation}
    >
      {children}
    </div>
  )
}

type StepsItemProps = ComponentPropsWithoutRef<"div"> & {
  index: number
  ref?: Ref<HTMLDivElement>
}

Steps.Item = function StepsItem({
  index,
  children,
  className,
  ref,
  ...props
}: StepsItemProps) {
  const { api, styles } = useStepsContext()
  const state = api.getItemState({ index })
  const itemProps = mergeProps(props, api.getItemProps({ index }))

  return (
    <StepsItemContext.Provider value={{ index, state }}>
      <div className={styles.item({ className })} ref={ref} {...itemProps}>
        {children}
      </div>
    </StepsItemContext.Provider>
  )
}

type StepsTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

Steps.Trigger = function StepsTrigger({
  children,
  className,
  disabled,
  ref,
  ...props
}: StepsTriggerProps) {
  const { api, styles } = useStepsContext()
  const { index } = useStepsItemContext()
  const triggerProps = api.getTriggerProps({ index })
  const {
    onClick: onTriggerClick,
    disabled: machineDisabled,
    ...restTriggerProps
  } = triggerProps as typeof triggerProps & {
    disabled?: boolean
    onClick?: ButtonProps["onClick"]
  }
  const { onClick, ...restProps } = props
  const buttonProps = mergeProps(restProps, restTriggerProps)
  const isDisabled = Boolean(machineDisabled || disabled)

  return (
    <Button
      className={styles.trigger({ className })}
      ref={ref}
      size="current"
      theme="unstyled"
      type="button"
      {...buttonProps}
      data-disabled={isDisabled || undefined}
      disabled={isDisabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onTriggerClick?.(event)
        }
      }}
    >
      {children}
    </Button>
  )
}

type StepsItemTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Steps.ItemText = function StepsItemText({
  children,
  className,
  ref,
  ...props
}: StepsItemTextProps) {
  const { orientation, styles } = useStepsContext()

  return (
    <span
      className={styles.itemText({ className })}
      ref={ref}
      {...props}
      data-orientation={orientation}
    >
      {children}
    </span>
  )
}

type StepsIndicatorProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Steps.Indicator = function StepsIndicator({
  children,
  className,
  ref,
  ...props
}: StepsIndicatorProps) {
  const { api, styles } = useStepsContext()
  const { index } = useStepsItemContext()
  const indicatorProps = mergeProps(props, api.getIndicatorProps({ index }))

  return (
    <div
      className={styles.indicator({ className })}
      ref={ref}
      {...indicatorProps}
    >
      {children ?? (
        <Steps.Status
          complete={
            <Icon
              className={styles.indicatorIcon()}
              icon="token-icon-steps-check"
            />
          }
          current={<Steps.Number />}
          incomplete={<Steps.Number />}
        />
      )}
    </div>
  )
}

type StepsStatusProps = {
  complete: ReactNode
  current?: ReactNode
  incomplete: ReactNode
}

Steps.Status = function StepsStatus({
  complete,
  current,
  incomplete,
}: StepsStatusProps) {
  const { state } = useStepsItemContext()

  if (state.current) {
    return <>{current ?? incomplete}</>
  }

  if (state.completed) {
    return <>{complete}</>
  }

  return <>{incomplete}</>
}

type StepsNumberProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Steps.Number = function StepsNumber({
  className,
  ref,
  ...props
}: StepsNumberProps) {
  const { styles } = useStepsContext()
  const { state } = useStepsItemContext()

  return (
    <span className={styles.number({ className })} ref={ref} {...props}>
      {state.index + 1}
    </span>
  )
}

type StepsTitleProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Steps.Title = function StepsTitle({
  children,
  className,
  ref,
  ...props
}: StepsTitleProps) {
  const { styles } = useStepsContext()
  const { state } = useStepsItemContext()

  return (
    <span
      className={styles.title({ className })}
      ref={ref}
      {...props}
      {...getStepStatusDataProps(state)}
    >
      {children}
    </span>
  )
}

type StepsDescriptionProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Steps.Description = function StepsDescription({
  children,
  className,
  ref,
  ...props
}: StepsDescriptionProps) {
  const { styles } = useStepsContext()
  const { state } = useStepsItemContext()

  return (
    <span
      className={styles.description({ className })}
      ref={ref}
      {...props}
      {...getStepStatusDataProps(state)}
    >
      {children}
    </span>
  )
}

type StepsSeparatorProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Steps.Separator = function StepsSeparator({
  className,
  ref,
  ...props
}: StepsSeparatorProps) {
  const { api, styles } = useStepsContext()
  const { index, state } = useStepsItemContext()
  const separatorProps = mergeProps(props, api.getSeparatorProps({ index }), {
    "data-last": state.last || undefined,
  })

  return (
    <div
      className={styles.separator({ className })}
      ref={ref}
      {...separatorProps}
    />
  )
}

type StepsContentProps = ComponentPropsWithoutRef<"div"> & {
  index: number
  ref?: Ref<HTMLDivElement>
}

Steps.Content = function StepsContent({
  index,
  children,
  className,
  ref,
  ...props
}: StepsContentProps) {
  const { api, styles } = useStepsContext()
  const contentProps = mergeProps(props, api.getContentProps({ index }))

  return (
    <div className={styles.content({ className })} ref={ref} {...contentProps}>
      {children}
    </div>
  )
}

type StepsProgressProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  ref?: Ref<HTMLDivElement>
}

Steps.Progress = function StepsProgress({
  className,
  ref,
  style,
  ...props
}: StepsProgressProps) {
  const { api, orientation, styles } = useStepsContext()
  const progressProps = mergeProps(props, api.getProgressProps())
  const progressRangeStyle =
    orientation === "horizontal"
      ? { width: "var(--percent)" }
      : { height: "var(--percent)" }

  return (
    <div
      className={styles.progress({ className })}
      ref={ref}
      {...progressProps}
      data-orientation={orientation}
      style={style}
    >
      <span
        aria-hidden="true"
        className={styles.progressRange()}
        data-orientation={orientation}
        style={progressRangeStyle}
      />
    </div>
  )
}

type StepsCompletedContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Steps.CompletedContent = function StepsCompletedContent({
  children,
  className,
  ref,
  ...props
}: StepsCompletedContentProps) {
  const { api, styles } = useStepsContext()
  const contentProps = mergeProps(
    props,
    api.getContentProps({ index: api.count })
  )

  return (
    <div
      className={styles.completedContent({ className })}
      ref={ref}
      {...contentProps}
      data-complete={api.isCompleted || undefined}
    >
      {children}
    </div>
  )
}

type StepsControlProps = Omit<ButtonProps, "ref"> & {
  ref?: Ref<HTMLButtonElement>
}

Steps.PrevTrigger = function StepsPrevTrigger({
  className,
  ref,
  size,
  theme = "outlined",
  variant = "secondary",
  ...props
}: StepsControlProps) {
  const { api, styles, size: rootSize } = useStepsContext()
  const {
    onClick: onPrevTriggerClick,
    disabled: prevTriggerDisabled,
    ...restPrevTriggerProps
  } = api.getPrevTriggerProps()
  const { onClick, disabled, ...restProps } = props
  const buttonProps = mergeProps(restProps, restPrevTriggerProps)
  const isDisabled = Boolean(disabled || prevTriggerDisabled)

  return (
    <Button
      className={styles.prevTrigger({ className })}
      ref={ref}
      size={size ?? getControlSize(rootSize)}
      theme={theme}
      variant={variant}
      {...buttonProps}
      disabled={isDisabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onPrevTriggerClick?.(event)
        }
      }}
    />
  )
}

Steps.NextTrigger = function StepsNextTrigger({
  className,
  ref,
  size,
  theme = "solid",
  variant = "primary",
  ...props
}: StepsControlProps) {
  const { api, styles, size: rootSize } = useStepsContext()
  const {
    onClick: onNextTriggerClick,
    disabled: nextTriggerDisabled,
    ...restNextTriggerProps
  } = api.getNextTriggerProps()
  const { onClick, disabled, ...restProps } = props
  const buttonProps = mergeProps(restProps, restNextTriggerProps)
  const isDisabled = Boolean(disabled || nextTriggerDisabled)

  return (
    <Button
      className={styles.nextTrigger({ className })}
      ref={ref}
      size={size ?? getControlSize(rootSize)}
      theme={theme}
      variant={variant}
      {...buttonProps}
      disabled={isDisabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onNextTriggerClick?.(event)
        }
      }}
    />
  )
}

Steps.Root = Steps
Steps.displayName = "Steps"
