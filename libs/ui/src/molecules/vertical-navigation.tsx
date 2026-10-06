/**
 * VerticalNavigation — @techsio/ui-kit molecule.
 * @component VerticalNavigation
 * @componentVersion v1.0.1
 * @skill vertical-navigation-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
"use client"

import * as collapsible from "@zag-js/collapsible"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import { type ComponentProps, type ElementType, useContext, useId } from "react"
import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import { LinkButton, type LinkButtonProps } from "../atoms/link-button"
import {
  useVerticalNavigationBranchContext,
  useVerticalNavigationContext,
  VerticalNavigationBranchContext,
  VerticalNavigationContext,
  VerticalNavigationDepthContext,
  type VerticalNavigationSize,
  type VerticalNavigationTone,
  type VerticalNavigationVariant,
} from "../internal/molecules/vertical-navigation.context"
import { verticalNavigationStyles } from "../internal/molecules/vertical-navigation.styles"

export type {
  VerticalNavigationSize,
  VerticalNavigationTone,
  VerticalNavigationVariant,
} from "../internal/molecules/vertical-navigation.context"

export type VerticalNavigationProps = Omit<ComponentProps<"nav">, "dir"> & {
  size?: VerticalNavigationSize
  dir?: "ltr" | "rtl"
  /** Maximum cumulative indent; the semantic nesting is never flattened. */
  maxIndentDepth?: number
}

export function VerticalNavigation({
  size = "md",
  maxIndentDepth = 3,
  dir,
  className,
  children,
  ...props
}: VerticalNavigationProps) {
  return (
    <VerticalNavigationContext.Provider value={{ size, maxIndentDepth, dir }}>
      <VerticalNavigationDepthContext.Provider value={0}>
        <VerticalNavigationBranchContext.Provider value={null}>
          <nav
            {...props}
            className={verticalNavigationStyles({ size }).root({ className })}
            data-part="root"
            data-scope="vertical-navigation"
            dir={dir}
          >
            {children}
          </nav>
        </VerticalNavigationBranchContext.Provider>
      </VerticalNavigationDepthContext.Provider>
    </VerticalNavigationContext.Provider>
  )
}

VerticalNavigation.Root = VerticalNavigation

VerticalNavigation.List = function VerticalNavigationList({
  children,
  className,
  ...props
}: ComponentProps<"ul">) {
  useVerticalNavigationContext()
  const depth = useContext(VerticalNavigationDepthContext)
  return (
    <VerticalNavigationDepthContext.Provider value={depth + 1}>
      <ul
        {...props}
        className={verticalNavigationStyles().list({ className })}
        data-depth={depth}
        data-part="list"
        data-scope="vertical-navigation"
      >
        {children}
      </ul>
    </VerticalNavigationDepthContext.Provider>
  )
}

VerticalNavigation.Item = function VerticalNavigationItem({
  className,
  ...props
}: ComponentProps<"li">) {
  useVerticalNavigationContext()
  return (
    <VerticalNavigationBranchContext.Provider value={null}>
      <li
        {...props}
        className={verticalNavigationStyles().item({ className })}
        data-part="item"
        data-scope="vertical-navigation"
      />
    </VerticalNavigationBranchContext.Provider>
  )
}

VerticalNavigation.Row = function VerticalNavigationRow({
  className,
  ...props
}: ComponentProps<"div">) {
  useVerticalNavigationContext()
  const branch = useContext(VerticalNavigationBranchContext)
  return (
    <div
      {...props}
      className={verticalNavigationStyles().row({ className })}
      data-current-path={branch?.containsCurrent || undefined}
      data-part="row"
      data-scope="vertical-navigation"
    />
  )
}

export type VerticalNavigationLinkProps<T extends ElementType = "a"> = Omit<
  LinkButtonProps<T>,
  "size" | "theme" | "variant" | "block" | "uppercase"
> & { current?: boolean }

VerticalNavigation.Link = function VerticalNavigationLink<
  T extends ElementType = "a",
>({ current = false, className, ...props }: VerticalNavigationLinkProps<T>) {
  const { size } = useVerticalNavigationContext()
  const branch = useContext(VerticalNavigationBranchContext)
  // Restore the generic target props after removing navigation-owned styling props.
  return (
    <LinkButton<T>
      {...(props as LinkButtonProps<T>)}
      aria-current={current ? "page" : undefined}
      className={verticalNavigationStyles({ size }).link({ className })}
      data-current={current || undefined}
      data-current-path={branch?.containsCurrent || undefined}
      data-part="link"
      data-scope="vertical-navigation"
      size="current"
      theme="unstyled"
    />
  )
}

export type VerticalNavigationBranchProps = Omit<
  ComponentProps<"li">,
  "onChange" | "dir"
> &
  Pick<
    collapsible.Props,
    "open" | "defaultOpen" | "onOpenChange" | "disabled" | "getRootNode"
  > & { containsCurrent?: boolean }

VerticalNavigation.Branch = function VerticalNavigationBranch({
  id,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  getRootNode,
  containsCurrent = false,
  children,
  className,
  ...props
}: VerticalNavigationBranchProps) {
  const { dir } = useVerticalNavigationContext()
  const generatedId = useId()
  const service = useMachine(collapsible.machine, {
    id: id ?? generatedId,
    dir,
    open,
    defaultOpen,
    onOpenChange,
    disabled,
    getRootNode,
  })
  const api = collapsible.connect(service, normalizeProps)
  return (
    <VerticalNavigationBranchContext.Provider value={{ api, containsCurrent }}>
      <li
        {...mergeProps(props, api.getRootProps())}
        className={verticalNavigationStyles().item({ className })}
        data-current-path={containsCurrent || undefined}
        data-part="branch"
        data-scope="vertical-navigation"
      >
        {children}
      </li>
    </VerticalNavigationBranchContext.Provider>
  )
}

export type VerticalNavigationBranchTriggerProps = Omit<
  ComponentProps<typeof Button>,
  "size" | "theme" | "variant" | "block" | "uppercase"
>

VerticalNavigation.BranchTrigger = function VerticalNavigationBranchTrigger({
  className,
  disabled,
  ...props
}: VerticalNavigationBranchTriggerProps) {
  const { size } = useVerticalNavigationContext()
  const { api } = useVerticalNavigationBranchContext()
  return (
    <Button
      {...mergeProps(props, api.getTriggerProps())}
      className={verticalNavigationStyles({ size }).trigger({ className })}
      data-part="branch-trigger"
      data-scope="vertical-navigation"
      disabled={disabled || api.disabled}
      size="current"
      theme="unstyled"
    />
  )
}

VerticalNavigation.BranchIndicator =
  function VerticalNavigationBranchIndicator({
    className,
    ...props
  }: ComponentProps<"span">) {
    const { size } = useVerticalNavigationContext()
    const { api } = useVerticalNavigationBranchContext()
    return (
      <span
        {...mergeProps(props, api.getIndicatorProps())}
        aria-hidden="true"
        className={verticalNavigationStyles({ size }).indicator({ className })}
        data-part="branch-indicator"
        data-scope="vertical-navigation"
      >
        <Icon icon="token-icon-vertical-navigation-chevron" size="current" />
      </span>
    )
  }

export type VerticalNavigationBranchContentProps = ComponentProps<"div"> & {
  tone?: VerticalNavigationTone
  variant?: VerticalNavigationVariant
  indent?: boolean
  showGuide?: boolean
}

VerticalNavigation.BranchContent = function VerticalNavigationBranchContent({
  tone = "plain",
  variant = "primary",
  indent = true,
  showGuide = false,
  className,
  ...props
}: VerticalNavigationBranchContentProps) {
  const { maxIndentDepth } = useVerticalNavigationContext()
  const { api } = useVerticalNavigationBranchContext()
  const depth = useContext(VerticalNavigationDepthContext)
  return (
    <div
      {...mergeProps(props, api.getContentProps())}
      className={verticalNavigationStyles({ tone, variant }).content({
        className,
      })}
      data-guide={showGuide || undefined}
      data-indented={(indent && depth <= maxIndentDepth) || undefined}
      data-part="branch-content"
      data-scope="vertical-navigation"
      data-tone={tone}
      data-variant={variant}
    />
  )
}

VerticalNavigation.Group = function VerticalNavigationGroup({
  tone = "plain",
  variant = "primary",
  className,
  ...props
}: ComponentProps<"div"> & {
  tone?: VerticalNavigationTone
  variant?: VerticalNavigationVariant
}) {
  useVerticalNavigationContext()
  return (
    <div
      {...props}
      className={verticalNavigationStyles({ tone, variant }).group({
        className,
      })}
      data-part="group"
      data-scope="vertical-navigation"
      data-tone={tone}
      data-variant={variant}
    />
  )
}

VerticalNavigation.GroupLabel = function VerticalNavigationGroupLabel({
  className,
  ...props
}: ComponentProps<"h2">) {
  const { size } = useVerticalNavigationContext()
  return (
    <h2
      {...props}
      className={verticalNavigationStyles({ size }).groupLabel({ className })}
      data-part="group-label"
      data-scope="vertical-navigation"
    />
  )
}

VerticalNavigation.Separator = function VerticalNavigationSeparator({
  className,
  ...props
}: ComponentProps<"hr">) {
  useVerticalNavigationContext()
  return (
    <hr
      {...props}
      className={verticalNavigationStyles().separator({ className })}
      data-part="separator"
      data-scope="vertical-navigation"
    />
  )
}
