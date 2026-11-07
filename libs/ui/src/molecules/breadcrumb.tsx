/**
 * Breadcrumb — @techsio/ui-kit molecule.
 *
 * @component Breadcrumb
 * @componentVersion v1.0.10
 * @skill breadcrumb-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the breadcrumb-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  Children,
  type ComponentPropsWithoutRef,
  cloneElement,
  createContext,
  type ElementType,
  Fragment,
  isValidElement,
  type ReactNode,
  type Ref,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react"
import type { VariantProps } from "tailwind-variants"
import {
  Icon as IconComponent,
  type IconProps,
  type IconType,
} from "../atoms/icon"
import { Link, type LinkProps } from "../atoms/link"
import { tv } from "../utils"

const BreadcrumbVariants = tv({
  slots: {
    root: [
      "inline-flex min-w-0 max-w-full flex-wrap items-center",
      "bg-breadcrumb-bg",
    ],
    list: [
      "breadcrumb-list flex min-w-0 max-w-full flex-wrap items-center",
      "wrap-anywhere",
      "list-none",
      "text-breadcrumb-item",
    ],
    segment: "breadcrumb-segment inline-flex min-w-0 max-w-full items-center",
    item: [
      "wrap-anywhere inline-flex min-w-0 max-w-full items-center",
      "text-breadcrumb-item",
    ],
    link: [
      "wrap-anywhere inline-flex min-w-0 max-w-full items-center",
      "rounded-breadcrumb-link",
      "text-breadcrumb-item",
      "no-underline",
      "cursor-pointer",
      "hover:text-breadcrumb-item-hover",
      "focus-visible:breadcrumb-focus",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    currentLink: [
      "wrap-anywhere inline-flex min-w-0 max-w-full items-center",
      "rounded-breadcrumb-link",
      "text-breadcrumb-item-current",
      "cursor-default",
    ],
    icon: ["inline-flex shrink-0 items-center justify-center"],
    iconSize: "",
    separator: [
      "inline-flex shrink-0 items-center justify-center",
      "text-breadcrumb-separator",
      "rtl:rotate-180",
    ],
    separatorIcon: ["inline-flex items-center justify-center"],
    separatorIconSize: "",
    ellipsis: [
      "inline-flex shrink-0 items-center justify-center",
      "text-breadcrumb-ellipsis",
    ],
    ellipsisIcon: ["inline-flex items-center justify-center"],
    ellipsisIconSize: "",
  },
  variants: {
    variant: {
      plain: {},
      underline: {
        link: "underline",
        currentLink: "underline",
      },
    },
    size: {
      sm: {
        root: "p-breadcrumb-sm text-breadcrumb-sm",
        list: "breadcrumb-list-sm",
        link: "gap-breadcrumb-link-sm",
        currentLink: "gap-breadcrumb-link-sm",
        iconSize: "text-breadcrumb-icon-sm",
        separator: "gap-breadcrumb-separator-sm",
        separatorIconSize: "text-breadcrumb-separator-icon-sm",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-sm",
      },
      md: {
        root: "p-breadcrumb-md text-breadcrumb-md",
        list: "breadcrumb-list-md",
        link: "gap-breadcrumb-link-md",
        currentLink: "gap-breadcrumb-link-md",
        iconSize: "text-breadcrumb-icon-md",
        separator: "gap-breadcrumb-separator-md",
        separatorIconSize: "text-breadcrumb-separator-icon-md",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-md",
      },
      lg: {
        root: "p-breadcrumb-lg text-breadcrumb-lg",
        list: "breadcrumb-list-lg",
        link: "gap-breadcrumb-link-lg",
        currentLink: "gap-breadcrumb-link-lg",
        iconSize: "text-breadcrumb-icon-lg",
        separator: "gap-breadcrumb-separator-lg",
        separatorIconSize: "text-breadcrumb-separator-icon-lg",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
    variant: "plain",
  },
})

export type BreadcrumbSize = NonNullable<
  VariantProps<typeof BreadcrumbVariants>["size"]
>

export type BreadcrumbVariant = NonNullable<
  VariantProps<typeof BreadcrumbVariants>["variant"]
>

type BreadcrumbContextValue = {
  styles: ReturnType<typeof BreadcrumbVariants>
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext)

  if (!context) {
    throw new Error("Breadcrumb components must be used within Breadcrumb.Root")
  }

  return context
}

function getContextualIconClassName({
  className,
  defaultClassName,
  useDefaultClassName,
}: {
  className?: string
  defaultClassName: string
  useDefaultClassName: boolean
}) {
  if (!useDefaultClassName) {
    return className
  }

  return [defaultClassName, className].filter(Boolean).join(" ")
}

export type BreadcrumbRootProps = ComponentPropsWithoutRef<"nav"> &
  VariantProps<typeof BreadcrumbVariants> & {
    ref?: Ref<HTMLElement>
  }

export function Breadcrumb({
  children,
  className,
  ref,
  size,
  variant,
  "aria-label": ariaLabel = "breadcrumb",
  ...props
}: BreadcrumbRootProps) {
  const styles = BreadcrumbVariants({ size, variant })

  return (
    <BreadcrumbContext.Provider value={{ styles }}>
      <nav
        aria-label={ariaLabel}
        className={styles.root({ className })}
        ref={ref}
        {...props}
      >
        {children}
      </nav>
    </BreadcrumbContext.Provider>
  )
}

function getBreadcrumbChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(
    Children.map(children, (child) =>
      isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
        ? getBreadcrumbChildren(child.props.children)
        : child
    )
  )
}

function markBreadcrumbRows(list: HTMLOListElement) {
  let previousCenter: number | undefined
  for (const child of list.children) {
    const bounds = child.getBoundingClientRect()
    if (bounds.width === 0 && bounds.height === 0) {
      continue
    }
    const center = bounds.top + bounds.height / 2
    if (child.classList.contains("breadcrumb-segment")) {
      child.toggleAttribute(
        "data-wrap-start",
        previousCenter !== undefined && Math.abs(center - previousCenter) > 1
      )
    }
    previousCenter = center
  }
}

function getSeparatorFootprint(separator: HTMLElement) {
  // Computed layout pixels, unlike client rects, are not scaled by transforms.
  const style = getComputedStyle(separator)
  const width = Number.parseFloat(style.width) || 0
  if (style.boxSizing === "border-box") {
    return width
  }
  return (
    width +
    (Number.parseFloat(style.paddingLeft) || 0) +
    (Number.parseFloat(style.paddingRight) || 0) +
    (Number.parseFloat(style.borderLeftWidth) || 0) +
    (Number.parseFloat(style.borderRightWidth) || 0)
  )
}

function observeBreadcrumbRows(list: HTMLOListElement) {
  let active = true
  const measuredGap = "--_breadcrumb-measured-gap"
  const originalGap = list.style.getPropertyValue(measuredGap)
  const originalPriority = list.style.getPropertyPriority(measuredGap)
  const separators = Array.from(
    list.querySelectorAll<HTMLElement>(
      ":scope > .breadcrumb-segment > ol > li:first-child"
    )
  )
  const update = () => {
    if (!active) {
      return
    }
    // A uniform flex gap cannot read an absolutely positioned child's intrinsic
    // width in CSS. Measure the real hosts, including hidden row-start dividers.
    const width = Math.max(0, ...separators.map(getSeparatorFootprint))
    const gap = `${width}px`
    if (list.style.getPropertyValue(measuredGap) !== gap) {
      list.style.setProperty(measuredGap, gap)
    }
    markBreadcrumbRows(list)
  }
  let frame: number | undefined
  const scheduleUpdate = () => {
    if (!active || frame !== undefined) {
      return
    }
    // Gap writes can resize observed rows; never write during observer delivery.
    frame = requestAnimationFrame(() => {
      frame = undefined
      update()
    })
  }
  update()
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleUpdate)
  observer?.observe(list)
  for (const child of [...list.children, ...separators]) {
    observer?.observe(child, { box: "border-box" })
  }
  list.ownerDocument.fonts?.ready.then(update)
  return () => {
    active = false
    if (frame !== undefined) {
      cancelAnimationFrame(frame)
    }
    observer?.disconnect()
    if (originalGap) {
      list.style.setProperty(measuredGap, originalGap, originalPriority)
    } else {
      list.style.removeProperty(measuredGap)
    }
    for (const child of list.children) {
      if (child.classList.contains("breadcrumb-segment")) {
        child.removeAttribute("data-wrap-start")
      }
    }
  }
}

export type BreadcrumbListProps = ComponentPropsWithoutRef<"ol"> & {
  ref?: Ref<HTMLOListElement>
}

Breadcrumb.List = function BreadcrumbList({
  children,
  className,
  ref,
  ...props
}: BreadcrumbListProps) {
  const { styles } = useBreadcrumbContext()
  const listRef = useRef<HTMLOListElement | null>(null)
  const mergedRef = useMemo(
    () => (node: HTMLOListElement | null) => {
      listRef.current = node
      const cleanup = typeof ref === "function" ? ref(node) : undefined
      if (ref && typeof ref !== "function") {
        ref.current = node
      }
      return () => {
        listRef.current = null
        if (typeof cleanup === "function") {
          cleanup()
        } else if (typeof ref === "function") {
          ref(null)
        } else if (ref) {
          ref.current = null
        }
      }
    },
    [ref]
  )
  // Custom children can replace the observed hosts after any render.
  useLayoutEffect(() =>
    listRef.current ? observeBreadcrumbRows(listRef.current) : undefined
  )
  const items = getBreadcrumbChildren(children)
  const segments: ReactNode[] = []

  for (let index = 0; index < items.length; index += 1) {
    const child = items[index]
    const next = items[index + 1]
    if (
      isValidElement(child) &&
      child.type === Breadcrumb.Separator &&
      isValidElement<ComponentPropsWithoutRef<"li">>(next) &&
      (next.type === Breadcrumb.Item || next.type === Breadcrumb.Ellipsis)
    ) {
      // Semantic ARIA belongs to the owning item. Leaving it on a retained
      // presentational host can restore that host's implicit list-item role.
      const semanticProps = Object.fromEntries(
        Object.entries(next.props).filter(([name]) => name.startsWith("aria-"))
      )
      const presentationProps = Object.fromEntries(
        Object.keys(semanticProps).map((name) => [name, undefined])
      )
      segments.push(
        <li
          {...semanticProps}
          aria-hidden={
            next.type === Breadcrumb.Ellipsis ? true : next.props["aria-hidden"]
          }
          className={styles.segment()}
          hidden={next.props.hidden}
          key={child.key}
          role={next.props.role}
        >
          <ol className="contents" role="presentation">
            {child}
            {cloneElement(next, { ...presentationProps, role: "presentation" })}
          </ol>
        </li>
      )
      index += 1
    } else {
      segments.push(child)
    }
  }

  return (
    <ol className={styles.list({ className })} ref={mergedRef} {...props}>
      {segments}
    </ol>
  )
}

export type BreadcrumbItemProps = ComponentPropsWithoutRef<"li"> & {
  ref?: Ref<HTMLLIElement>
}

Breadcrumb.Item = function BreadcrumbItem({
  children,
  className,
  ref,
  ...props
}: BreadcrumbItemProps) {
  const { styles } = useBreadcrumbContext()

  return (
    <li className={styles.item({ className })} ref={ref} {...props}>
      {children}
    </li>
  )
}

type BreadcrumbLinkHref<T extends ElementType> =
  ComponentPropsWithoutRef<T> extends { href?: infer H } ? H : string

export type BreadcrumbLinkProps<T extends ElementType = "a"> = LinkProps<T> & {
  href?: BreadcrumbLinkHref<T>
}

Breadcrumb.Link = function BreadcrumbLink<T extends ElementType = "a">({
  size = "current",
  children,
  className,
  ...props
}: BreadcrumbLinkProps<T>) {
  const { styles } = useBreadcrumbContext()

  return (
    <Link
      className={styles.link({ className })}
      {...(props as LinkProps<T>)}
      size={size}
    >
      {children}
    </Link>
  )
}

export type BreadcrumbCurrentLinkProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Breadcrumb.CurrentLink = function BreadcrumbCurrentLink({
  children,
  className,
  ref,
  ...props
}: BreadcrumbCurrentLinkProps) {
  const { styles } = useBreadcrumbContext()

  return (
    <span
      aria-current="page"
      className={styles.currentLink({ className })}
      ref={ref}
      {...props}
    >
      {children}
    </span>
  )
}

export type BreadcrumbIconProps = IconProps

Breadcrumb.Icon = function BreadcrumbIcon({
  className,
  size,
  ...props
}: BreadcrumbIconProps) {
  const { styles } = useBreadcrumbContext()

  return (
    <IconComponent
      className={styles.icon({
        className: getContextualIconClassName({
          className,
          defaultClassName: styles.iconSize(),
          useDefaultClassName: !size,
        }),
      })}
      size={size}
      {...props}
    />
  )
}

export type BreadcrumbSeparatorProps = ComponentPropsWithoutRef<"li"> & {
  icon?: IconType
  iconProps?: Omit<IconProps, "icon" | "size">
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLLIElement>
}

Breadcrumb.Separator = function BreadcrumbSeparator({
  children,
  className,
  icon = "token-icon-breadcrumb-separator",
  iconProps,
  iconSize,
  ref,
  ...props
}: BreadcrumbSeparatorProps) {
  const { styles } = useBreadcrumbContext()
  const { className: iconClassName, ...restIconProps } = iconProps ?? {}

  return (
    <li
      aria-hidden="true"
      className={styles.separator({ className })}
      ref={ref}
      {...props}
    >
      {children ?? (
        <IconComponent
          className={styles.separatorIcon({
            className: getContextualIconClassName({
              className: iconClassName,
              defaultClassName: styles.separatorIconSize(),
              useDefaultClassName: !iconSize,
            }),
          })}
          icon={icon}
          size={iconSize}
          {...restIconProps}
        />
      )}
    </li>
  )
}

export type BreadcrumbEllipsisProps = ComponentPropsWithoutRef<"li"> & {
  icon?: IconType
  iconProps?: Omit<IconProps, "icon" | "size">
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLLIElement>
}

Breadcrumb.Ellipsis = function BreadcrumbEllipsis({
  children,
  className,
  icon = "token-icon-breadcrumb-ellipsis",
  iconProps,
  iconSize,
  ref,
  ...props
}: BreadcrumbEllipsisProps) {
  const { styles } = useBreadcrumbContext()
  const { className: iconClassName, ...restIconProps } = iconProps ?? {}

  return (
    <li
      aria-hidden="true"
      className={styles.ellipsis({ className })}
      ref={ref}
      role="presentation"
      {...props}
    >
      {children ?? (
        <IconComponent
          className={styles.ellipsisIcon({
            className: getContextualIconClassName({
              className: iconClassName,
              defaultClassName: styles.ellipsisIconSize(),
              useDefaultClassName: !iconSize,
            }),
          })}
          icon={icon}
          size={iconSize}
          {...restIconProps}
        />
      )}
    </li>
  )
}

// Keep native TypeScript declarations from hiding siblings behind a Root export alias.
Breadcrumb.Root = Breadcrumb satisfies typeof Breadcrumb
Breadcrumb.displayName = "Breadcrumb"
