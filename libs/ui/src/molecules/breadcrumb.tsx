import {
  createContext,
  type ComponentPropsWithoutRef,
  type ElementType,
  type Ref,
  useContext,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Icon, type IconProps, type IconType } from "../atoms/icon"
import { Link, type LinkProps } from "../atoms/link"
import { tv } from "../utils"

const BreadcrumbVariants = tv({
  slots: {
    root: ["inline-flex flex-wrap items-center", "bg-breadcrumb-bg"],
    list: [
      "flex flex-wrap items-center",
      "break-words",
      "list-none",
      "text-breadcrumb-item",
    ],
    item: [
      "inline-flex min-w-0 items-center",
      "text-breadcrumb-item",
    ],
    link: [
      "inline-flex min-w-0 items-center",
      "rounded-breadcrumb-link",
      "text-breadcrumb-item",
      "no-underline",
      "cursor-pointer",
      "hover:text-breadcrumb-item-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-breadcrumb-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    currentLink: [
      "inline-flex min-w-0 items-center",
      "rounded-breadcrumb-link",
      "text-breadcrumb-item-current",
      "cursor-default",
    ],
    icon: ["inline-flex items-center justify-center"],
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
        list: "gap-breadcrumb-sm",
        link: "gap-breadcrumb-link-sm",
        currentLink: "gap-breadcrumb-link-sm",
        iconSize: "text-breadcrumb-icon-sm",
        separator: "gap-breadcrumb-separator-sm",
        separatorIconSize: "text-breadcrumb-separator-icon-sm",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-sm",
      },
      md: {
        root: "p-breadcrumb-md text-breadcrumb-md",
        list: "gap-breadcrumb-md",
        link: "gap-breadcrumb-link-md",
        currentLink: "gap-breadcrumb-link-md",
        iconSize: "text-breadcrumb-icon-md",
        separator: "gap-breadcrumb-separator-md",
        separatorIconSize: "text-breadcrumb-separator-icon-md",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-md",
      },
      lg: {
        root: "p-breadcrumb-lg text-breadcrumb-lg",
        list: "gap-breadcrumb-lg",
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

const BreadcrumbContext =
  createContext<BreadcrumbContextValue | null>(null)

function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext)

  if (!context) {
    throw new Error(
      "Breadcrumb components must be used within Breadcrumb.Root"
    )
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

  return (
    <ol className={styles.list({ className })} ref={ref} {...props}>
      {children}
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

export type BreadcrumbLinkProps<T extends ElementType = "a"> =
  LinkProps<T> & {
    href?: BreadcrumbLinkHref<T>
  }

Breadcrumb.Link = function BreadcrumbLink<
  T extends ElementType = "a",
>({
  children,
  className,
  ...props
}: BreadcrumbLinkProps<T>) {
  const { styles } = useBreadcrumbContext()

  return (
    <Link className={styles.link({ className })} {...(props as LinkProps<T>)}>
      {children}
    </Link>
  )
}

export type BreadcrumbCurrentLinkProps =
  ComponentPropsWithoutRef<"span"> & {
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
    <Icon
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

export type BreadcrumbSeparatorProps =
  ComponentPropsWithoutRef<"li"> & {
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
        <Icon
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

export type BreadcrumbEllipsisProps =
  ComponentPropsWithoutRef<"li"> & {
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
        <Icon
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

Breadcrumb.Root = Breadcrumb
Breadcrumb.displayName = "Breadcrumb"
