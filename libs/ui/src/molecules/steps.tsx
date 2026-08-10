/*
 * Steps — @techsio/ui-kit molecule.
 *
 * @component Steps
 * @componentVersion v1.0.2
 * @skill steps-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the steps-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { getRecordValue } from "@techsio/std/object"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import type { PropTypes } from "@zag-js/react"
import { connect as connectSteps, machine as stepsMachine } from "@zag-js/steps"
import type {
  Props as StepsMachineProps,
  Api as ZagStepsApi,
  ItemState as ZagStepsItemState,
} from "@zag-js/steps"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import type { ButtonProps } from "../atoms/button"
import { Icon } from "../atoms/icon"
import { tv } from "../utils"

const transitionColors =
  "transition-colors duration-200 motion-reduce:transition-none"

const stepsVariants = tv({
  defaultVariants: {
    size: "md",
    variant: "subtle",
  },
  slots: {
    completedContent: [
      "w-full rounded-steps-content border-(length:--border-width-steps-content)",
      "border-steps-content-border bg-steps-content-bg",
      "text-steps-content-fg",
      "data-complete:border-steps-content-border-complete",
      "data-complete:bg-steps-content-bg-complete",
    ],
    content: [
      "w-full rounded-steps-content border-(length:--border-width-steps-content)",
      "border-steps-content-border bg-steps-content-bg",
      "text-steps-content-fg",
      "focus-visible:outline-(length:--default-ring-width) focus-visible:outline-(style:--default-ring-style)",
      "focus-visible:outline-steps-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    description: [
      "text-steps-description text-steps-description-fg",
      "data-current:text-steps-description-fg-current",
      "data-complete:text-steps-description-fg-complete",
      transitionColors,
    ],
    indicator: [
      "flex shrink-0 items-center justify-center rounded-steps-indicator",
      "border-(length:--border-width-steps-indicator) border-steps-indicator-border",
      "bg-steps-indicator-bg text-steps-indicator-fg",
      "group-hover:border-steps-indicator-border-hover group-hover:bg-steps-indicator-bg-hover",
      "data-current:border-steps-indicator-border-current data-current:bg-steps-indicator-bg-current data-current:text-steps-indicator-fg-current",
      "data-complete:border-steps-indicator-border-complete data-complete:bg-steps-indicator-bg-complete data-complete:text-steps-indicator-fg-complete",
      transitionColors,
    ],
    indicatorIcon: "text-steps-icon",
    item: [
      "relative flex min-w-0 gap-steps-item",
      "data-[orientation=horizontal]:flex-1 data-[orientation=horizontal]:items-center",
      "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start",
    ],
    itemText: [
      "inline-flex min-w-0 flex-col gap-steps-text",
      "data-[orientation=vertical]:items-start",
    ],
    list: [
      "flex w-full gap-steps-list",
      "data-[orientation=horizontal]:items-start",
      "data-[orientation=vertical]:w-auto data-[orientation=vertical]:min-w-steps-list-vertical data-[orientation=vertical]:flex-col",
    ],
    navigation: [
      "flex flex-wrap items-center gap-steps-navigation",
      "data-[orientation=vertical]:justify-start",
    ],
    nextTrigger: "",
    number: ["leading-none font-steps-number"],
    panels: [
      "flex w-full flex-col gap-steps-panels",
      "data-[orientation=vertical]:min-w-0 data-[orientation=vertical]:flex-1",
    ],
    prevTrigger: "",
    progress: [
      "relative overflow-hidden rounded-steps-progress bg-steps-progress-bg",
      "data-[orientation=horizontal]:h-steps-progress data-[orientation=horizontal]:w-full",
      "data-[orientation=vertical]:w-steps-progress data-[orientation=vertical]:self-stretch",
    ],
    progressRange: [
      "absolute rounded-steps-progress bg-steps-progress-range-bg",
      "transition-steps-progress duration-200 motion-reduce:transition-none",
      "data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:start-0",
      "data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-0",
    ],
    root: [
      "flex w-full flex-col gap-steps-root",
      "data-[orientation=vertical]:flex-row data-[orientation=vertical]:items-start",
    ],
    separator: [
      "shrink-0 rounded-steps-separator bg-steps-separator-bg",
      "data-current:bg-steps-separator-bg-current",
      "data-complete:bg-steps-separator-bg-complete",
      "data-last:hidden",
      "data-[orientation=horizontal]:h-steps-separator data-[orientation=horizontal]:flex-1",
      "data-[orientation=vertical]:ms-steps-separator-offset data-[orientation=vertical]:min-h-steps-separator-vertical data-[orientation=vertical]:w-steps-separator data-[orientation=vertical]:flex-1",
      transitionColors,
    ],
    title: [
      "truncate text-steps-title font-steps-title text-steps-title-fg",
      "data-current:text-steps-title-fg-current",
      "data-complete:text-steps-title-fg-complete",
      transitionColors,
    ],
    trigger: [
      "group relative flex min-w-0 items-center justify-start gap-steps-trigger",
      "text-left",
      "focus-visible:outline-(length:--default-ring-width) focus-visible:outline-(style:--default-ring-style)",
      "focus-visible:outline-steps-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[orientation=vertical]:items-start",
      "data-disabled:cursor-not-allowed",
      transitionColors,
    ],
  },
  variants: {
    size: {
      lg: {
        completedContent: "p-steps-content-padding-lg text-steps-content-lg",
        content: "p-steps-content-padding-lg text-steps-content-lg",
        description: "text-steps-description-lg",
        indicator: "size-steps-indicator-lg",
        indicatorIcon: "text-steps-icon-lg",
        number: "text-steps-number-lg",
        title: "text-steps-title-lg",
      },
      md: {
        completedContent: "p-steps-content-padding-md text-steps-content-md",
        content: "p-steps-content-padding-md text-steps-content-md",
        description: "text-steps-description-md",
        indicator: "size-steps-indicator-md",
        indicatorIcon: "text-steps-icon-md",
        number: "text-steps-number-md",
        title: "text-steps-title-md",
      },
      sm: {
        completedContent: "p-steps-content-padding-sm text-steps-content-sm",
        content: "p-steps-content-padding-sm text-steps-content-sm",
        description: "text-steps-description-sm",
        indicator: "size-steps-indicator-sm",
        indicatorIcon: "text-steps-icon-sm",
        number: "text-steps-number-sm",
        title: "text-steps-title-sm",
      },
    },
    variant: {
      solid: {
        indicator: [
          "border-transparent bg-steps-indicator-bg-solid text-steps-indicator-fg-solid",
          "group-hover:bg-steps-indicator-bg-solid-hover",
          "data-current:bg-steps-indicator-bg-solid-current data-current:text-steps-indicator-fg-solid-current",
          "data-complete:bg-steps-indicator-bg-solid-complete data-complete:text-steps-indicator-fg-solid-complete",
        ],
        trigger: [
          "rounded-steps-trigger px-steps-trigger-x py-steps-trigger-y",
          "hover:bg-steps-trigger-bg-hover",
          "data-current:bg-steps-trigger-bg-current",
          "data-complete:bg-steps-trigger-bg-complete",
        ],
      },
      subtle: {},
    },
  },
})

type StepsApi = ZagStepsApi<PropTypes>
type StepsOrientation = NonNullable<StepsMachineProps["orientation"]>
type StepsSize = NonNullable<VariantProps<typeof stepsVariants>["size"]>
type StepsItemState = ZagStepsItemState
type StepsStyles = ReturnType<typeof stepsVariants>

const rootContextError = "Steps components must be used within Steps.Root"
const itemContextError = "Steps item components must be used within Steps.Item"

const StepsApiContext = createContext<StepsApi | null>(null)
const StepsOrientationContext = createContext<StepsOrientation | null>(null)
const StepsSizeContext = createContext<StepsSize | null>(null)
const StepsStylesContext = createContext<StepsStyles | null>(null)

const useStepsApi = () => {
  const api = useContext(StepsApiContext)
  if (api === null) {
    throw new Error(rootContextError)
  }
  return api
}

const useStepsOrientation = () => {
  const orientation = useContext(StepsOrientationContext)
  if (orientation === null) {
    throw new Error(rootContextError)
  }
  return orientation
}

const useStepsStyles = () => {
  const styles = useContext(StepsStylesContext)
  if (styles === null) {
    throw new Error(rootContextError)
  }
  return styles
}

// Root `size` is optional, so absence is a valid value rather than a missing provider.
const useStepsSize = () => useContext(StepsSizeContext)

const StepsItemIndexContext = createContext<number | null>(null)
const StepsItemStateContext = createContext<StepsItemState | null>(null)

const useStepsItemIndex = () => {
  const index = useContext(StepsItemIndexContext)
  if (index === null) {
    throw new Error(itemContextError)
  }
  return index
}

const useStepsItemState = () => {
  const state = useContext(StepsItemStateContext)
  if (state === null) {
    throw new Error(itemContextError)
  }
  return state
}

const getStepStatusDataProps = (state: StepsItemState) => ({
  "data-complete": state.completed || undefined,
  "data-current": state.current || undefined,
  "data-incomplete": state.incomplete || undefined,
})

const getOrientationFromApi = (api: StepsApi): StepsOrientation => {
  const rootProps = api.getRootProps()

  return getRecordValue(rootProps, "data-orientation") === "vertical"
    ? "vertical"
    : "horizontal"
}

const getControlSize = (
  size: StepsSize | null,
): NonNullable<ButtonProps["size"]> => {
  if (size === "sm") {
    return "sm"
  }

  if (size === "lg") {
    return "lg"
  }

  return "md"
}

export type StepsStoreProps = Omit<StepsMachineProps, "id"> & {
  id?: string | undefined
}

export const useSteps = ({ id, ...props }: StepsStoreProps) => {
  const generatedId = useId()
  const machineProps = Object.fromEntries(
    Object.entries(props).filter(([, option]) => option !== undefined),
  )

  const service = useMachine(stepsMachine, {
    id: id ?? generatedId,
    ...machineProps,
  })

  return connectSteps(service, normalizeProps)
}

type StepsRootSharedProps = VariantProps<typeof stepsVariants> &
  Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
    ref?: Ref<HTMLDivElement> | undefined
  }

export type StepsProps = StepsRootSharedProps &
  Omit<StepsMachineProps, "id"> & {
    id?: string | undefined
  }

const StepsRoot = ({
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
}: StepsProps) => {
  const api = useSteps({
    count,
    dir,
    linear,
    orientation,
    ...(defaultStep !== undefined && { defaultStep }),
    ...(id !== undefined && { id }),
    ...(onStepChange !== undefined && { onStepChange }),
    ...(onStepComplete !== undefined && { onStepComplete }),
    ...(step !== undefined && { step }),
  })
  const styles = stepsVariants({ size, variant })
  const rootProps = mergeProps(api.getRootProps(), props)

  return (
    <StepsApiContext.Provider value={api}>
      <StepsOrientationContext.Provider value={orientation}>
        <StepsSizeContext.Provider value={size ?? null}>
          <StepsStylesContext.Provider value={styles}>
            <div
              className={styles.root({ className })}
              ref={ref}
              {...rootProps}
            >
              {children}
            </div>
          </StepsStylesContext.Provider>
        </StepsSizeContext.Provider>
      </StepsOrientationContext.Provider>
    </StepsApiContext.Provider>
  )
}

type StepsRootProviderProps = StepsRootSharedProps & {
  value: StepsApi
}

const StepsRootProvider = ({
  value,
  size,
  variant,
  children,
  className,
  ref,
  ...props
}: StepsRootProviderProps) => {
  const styles = stepsVariants({ size, variant })
  const resolvedOrientation = getOrientationFromApi(value)
  const rootProps = mergeProps(value.getRootProps(), props)

  return (
    <StepsApiContext.Provider value={value}>
      <StepsOrientationContext.Provider value={resolvedOrientation}>
        <StepsSizeContext.Provider value={size ?? null}>
          <StepsStylesContext.Provider value={styles}>
            <div
              className={styles.root({ className })}
              ref={ref}
              {...rootProps}
            >
              {children}
            </div>
          </StepsStylesContext.Provider>
        </StepsSizeContext.Provider>
      </StepsOrientationContext.Provider>
    </StepsApiContext.Provider>
  )
}

type StepsListProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsList = ({ children, className, ref, ...props }: StepsListProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const listProps = mergeProps(api.getListProps(), props)

  return (
    <div className={styles.list({ className })} ref={ref} {...listProps}>
      {children}
    </div>
  )
}

type StepsPanelsProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsPanels = ({
  children,
  className,
  ref,
  ...props
}: StepsPanelsProps) => {
  const orientation = useStepsOrientation()
  const styles = useStepsStyles()

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
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsNavigation = ({
  children,
  className,
  ref,
  ...props
}: StepsNavigationProps) => {
  const orientation = useStepsOrientation()
  const styles = useStepsStyles()

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
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsItem = ({
  index,
  children,
  className,
  ref,
  ...props
}: StepsItemProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const state = api.getItemState({ index })
  const itemProps = mergeProps(api.getItemProps({ index }), props)

  return (
    <StepsItemIndexContext.Provider value={index}>
      <StepsItemStateContext.Provider value={state}>
        <div className={styles.item({ className })} ref={ref} {...itemProps}>
          {children}
        </div>
      </StepsItemStateContext.Provider>
    </StepsItemIndexContext.Provider>
  )
}

type StepsTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  children?: ReactNode | undefined
  ref?: Ref<HTMLButtonElement> | undefined
}

const StepsTrigger = ({
  children,
  className,
  disabled,
  ref,
  ...props
}: StepsTriggerProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const index = useStepsItemIndex()
  // The steps machine never disables its trigger; disabling stays caller-owned.
  const { onClick: onTriggerClick, ...restTriggerProps } = api.getTriggerProps({
    index,
  })
  const { onClick, ...restProps } = props
  const buttonProps = mergeProps(restTriggerProps, restProps)
  const isDisabled = disabled === true

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
  ref?: Ref<HTMLSpanElement> | undefined
}

const StepsItemText = ({
  children,
  className,
  ref,
  ...props
}: StepsItemTextProps) => {
  const orientation = useStepsOrientation()
  const styles = useStepsStyles()

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

interface StepsStatusProps {
  complete: ReactNode
  current?: ReactNode | undefined
  incomplete: ReactNode
}

const StepsStatus = ({
  complete,
  current,
  incomplete,
}: StepsStatusProps): ReactNode => {
  const state = useStepsItemState()
  let content = incomplete
  if (state.current) {
    content = current ?? incomplete
  } else if (state.completed) {
    content = complete
  }

  return (
    <>
      {content}
      {null}
    </>
  )
}

type StepsNumberProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

// Named separately because a `Number` function expression would shadow the global.
const StepsNumber = ({ className, ref, ...props }: StepsNumberProps) => {
  const styles = useStepsStyles()
  const state = useStepsItemState()

  return (
    <span className={styles.number({ className })} ref={ref} {...props}>
      {state.index + 1}
    </span>
  )
}

type StepsIndicatorProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsIndicator = ({
  children,
  className,
  ref,
  ...props
}: StepsIndicatorProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const index = useStepsItemIndex()
  const indicatorProps = mergeProps(api.getIndicatorProps({ index }), props)

  return (
    <div
      className={styles.indicator({ className })}
      ref={ref}
      {...indicatorProps}
    >
      {children ?? (
        <StepsStatus
          complete={
            <Icon
              className={styles.indicatorIcon()}
              icon="token-icon-steps-check"
            />
          }
          current={<StepsNumber />}
          incomplete={<StepsNumber />}
        />
      )}
    </div>
  )
}

type StepsTitleProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

const StepsTitle = ({
  children,
  className,
  ref,
  ...props
}: StepsTitleProps) => {
  const styles = useStepsStyles()
  const state = useStepsItemState()

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
  ref?: Ref<HTMLSpanElement> | undefined
}

const StepsDescription = ({
  children,
  className,
  ref,
  ...props
}: StepsDescriptionProps) => {
  const styles = useStepsStyles()
  const state = useStepsItemState()

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
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsSeparator = ({ className, ref, ...props }: StepsSeparatorProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const index = useStepsItemIndex()
  const state = useStepsItemState()
  const separatorProps = mergeProps(api.getSeparatorProps({ index }), props)

  return (
    <div
      className={styles.separator({ className })}
      ref={ref}
      {...separatorProps}
      data-last={state.last || undefined}
    />
  )
}

type StepsContentProps = ComponentPropsWithoutRef<"div"> & {
  index: number
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsContent = ({
  index,
  children,
  className,
  ref,
  ...props
}: StepsContentProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const contentProps = mergeProps(api.getContentProps({ index }), props)

  return (
    <div className={styles.content({ className })} ref={ref} {...contentProps}>
      {children}
    </div>
  )
}

type StepsProgressProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsProgress = ({
  className,
  ref,
  style,
  ...props
}: StepsProgressProps) => {
  const api = useStepsApi()
  const orientation = useStepsOrientation()
  const styles = useStepsStyles()
  const progressProps = mergeProps(api.getProgressProps(), props)
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
  ref?: Ref<HTMLDivElement> | undefined
}

const StepsCompletedContent = ({
  children,
  className,
  ref,
  ...props
}: StepsCompletedContentProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const contentProps = mergeProps(
    api.getContentProps({ index: api.count }),
    props,
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
  ref?: Ref<HTMLButtonElement> | undefined
}

const StepsPrevTrigger = ({
  className,
  ref,
  size,
  theme = "outlined",
  variant = "secondary",
  ...props
}: StepsControlProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const rootSize = useStepsSize()
  const {
    onClick: onPrevTriggerClick,
    disabled: prevTriggerDisabled,
    ...restPrevTriggerProps
  } = api.getPrevTriggerProps()
  const { onClick, disabled, ...restProps } = props
  const buttonProps = mergeProps(restPrevTriggerProps, restProps)
  const isDisabled = disabled === true || prevTriggerDisabled === true

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

const StepsNextTrigger = ({
  className,
  ref,
  size,
  theme = "solid",
  variant = "primary",
  ...props
}: StepsControlProps) => {
  const api = useStepsApi()
  const styles = useStepsStyles()
  const rootSize = useStepsSize()
  const {
    onClick: onNextTriggerClick,
    disabled: nextTriggerDisabled,
    ...restNextTriggerProps
  } = api.getNextTriggerProps()
  const { onClick, disabled, ...restProps } = props
  const buttonProps = mergeProps(restNextTriggerProps, restProps)
  const isDisabled = disabled === true || nextTriggerDisabled === true

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
StepsRoot.displayName = "Steps"

const StepsCompound = Object.assign(StepsRoot, {
  CompletedContent: StepsCompletedContent,
  Content: StepsContent,
  Description: StepsDescription,
  Indicator: StepsIndicator,
  Item: StepsItem,
  ItemText: StepsItemText,
  List: StepsList,
  Navigation: StepsNavigation,
  NextTrigger: StepsNextTrigger,
  Number: StepsNumber,
  Panels: StepsPanels,
  PrevTrigger: StepsPrevTrigger,
  Progress: StepsProgress,
  RootProvider: StepsRootProvider,
  Separator: StepsSeparator,
  Status: StepsStatus,
  Title: StepsTitle,
  Trigger: StepsTrigger,
})

export const Steps = Object.assign(StepsCompound, {
  Root: StepsCompound,
})
