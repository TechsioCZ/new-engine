/*
 * Breadcrumb — @techsio/ui-kit molecule.
 *
 * @component Breadcrumb
 * @componentVersion v1.0.1
 * @skill breadcrumb-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the breadcrumb-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { createContext, useContext } from "react"
import type { ComponentPropsWithoutRef, ElementType, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { Icon as IconPrimitive } from "../atoms/icon"
import type { IconProps, IconType } from "../atoms/icon"
import { Link as LinkPrimitive } from "../atoms/link"
import type { LinkProps } from "../atoms/link"
import { tv } from "../utils"

const itemLayoutClassName = "inline-flex min-w-0 items-center"
const centeredIconClassName = "inline-flex items-center justify-center"
const emptyClassName = ""
const itemColorClassName = "text-breadcrumb-item"

const breadcrumbVariants = tv({
  defaultVariants: {
    size: "md",
    variant: "plain",
  },
  slots: {
    currentLink: [
      itemLayoutClassName,
      "rounded-breadcrumb-link",
      "text-breadcrumb-item-current",
      "cursor-default",
    ],
    ellipsis: [
      "inline-flex shrink-0 items-center justify-center",
      "text-breadcrumb-ellipsis",
    ],
    ellipsisIcon: centeredIconClassName,
    ellipsisIconSize: emptyClassName,
    icon: centeredIconClassName,
    iconSize: emptyClassName,
    item: [itemLayoutClassName, itemColorClassName],
    link: [
      itemLayoutClassName,
      "rounded-breadcrumb-link",
      itemColorClassName,
      "no-underline",
      "cursor-pointer",
      "hover:text-breadcrumb-item-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-breadcrumb-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    list: [
      "flex flex-wrap items-center",
      "break-words",
      "list-none",
      itemColorClassName,
    ],
    root: ["inline-flex flex-wrap items-center", "bg-breadcrumb-bg"],
    separator: [
      "inline-flex shrink-0 items-center justify-center",
      "text-breadcrumb-separator",
      "rtl:rotate-180",
    ],
    separatorIcon: centeredIconClassName,
    separatorIconSize: emptyClassName,
  },
  variants: {
    size: {
      lg: {
        currentLink: "gap-breadcrumb-link-lg",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-lg",
        iconSize: "text-breadcrumb-icon-lg",
        link: "gap-breadcrumb-link-lg",
        list: "gap-breadcrumb-lg",
        root: "p-breadcrumb-lg text-breadcrumb-lg",
        separator: "gap-breadcrumb-separator-lg",
        separatorIconSize: "text-breadcrumb-separator-icon-lg",
      },
      md: {
        currentLink: "gap-breadcrumb-link-md",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-md",
        iconSize: "text-breadcrumb-icon-md",
        link: "gap-breadcrumb-link-md",
        list: "gap-breadcrumb-md",
        root: "p-breadcrumb-md text-breadcrumb-md",
        separator: "gap-breadcrumb-separator-md",
        separatorIconSize: "text-breadcrumb-separator-icon-md",
      },
      sm: {
        currentLink: "gap-breadcrumb-link-sm",
        ellipsisIconSize: "text-breadcrumb-ellipsis-icon-sm",
        iconSize: "text-breadcrumb-icon-sm",
        link: "gap-breadcrumb-link-sm",
        list: "gap-breadcrumb-sm",
        root: "p-breadcrumb-sm text-breadcrumb-sm",
        separator: "gap-breadcrumb-separator-sm",
        separatorIconSize: "text-breadcrumb-separator-icon-sm",
      },
    },
    variant: {
      plain: {},
      underline: {
        currentLink: "underline",
        link: "underline",
      },
    },
  },
})

export type BreadcrumbSize = NonNullable<
  VariantProps<typeof breadcrumbVariants>["size"]
>

export type BreadcrumbVariant = NonNullable<
  VariantProps<typeof breadcrumbVariants>["variant"]
>

const BreadcrumbSizeContext = createContext<BreadcrumbSize | null | undefined>(
  null,
)
const BreadcrumbVariantContext = createContext<
  BreadcrumbVariant | null | undefined
>(null)

const useBreadcrumbContext = () => {
  const size = useContext(BreadcrumbSizeContext)
  const variant = useContext(BreadcrumbVariantContext)

  if (size === null || variant === null) {
    throw new Error("Breadcrumb components must be used within Breadcrumb.Root")
  }

  return { styles: breadcrumbVariants({ size, variant }) }
}

const getContextualIconClassName = ({
  className,
  defaultClassName,
  useDefaultClassName,
}: {
  className?: string | undefined
  defaultClassName: string
  useDefaultClassName: boolean
}) => {
  if (!useDefaultClassName) {
    return className
  }

  return [defaultClassName, className].filter(Boolean).join(" ")
}

export type BreadcrumbRootProps = ComponentPropsWithoutRef<"nav"> &
  VariantProps<typeof breadcrumbVariants> & {
    ref?: Ref<HTMLElement> | undefined
  }

export const Breadcrumb = ({
  children,
  className,
  ref,
  size,
  variant,
  "aria-label": ariaLabel = "breadcrumb",
  ...props
}: BreadcrumbRootProps) => {
  const { root } = breadcrumbVariants({ size, variant })

  return (
    <BreadcrumbSizeContext.Provider value={size}>
      <BreadcrumbVariantContext.Provider value={variant}>
        <nav
          aria-label={ariaLabel}
          className={root({ className })}
          ref={ref}
          {...props}
        >
          {children}
        </nav>
      </BreadcrumbVariantContext.Provider>
    </BreadcrumbSizeContext.Provider>
  )
}

export type BreadcrumbListProps = ComponentPropsWithoutRef<"ol"> & {
  ref?: Ref<HTMLOListElement> | undefined
}

Breadcrumb.List = function List({
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
  ref?: Ref<HTMLLIElement> | undefined
}

Breadcrumb.Item = function Item({
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
  href?: BreadcrumbLinkHref<T> | undefined
}

Breadcrumb.Link = function Link<T extends ElementType = "a">(
  props: BreadcrumbLinkProps<T>,
) {
  const { styles } = useBreadcrumbContext()

  return (
    <LinkPrimitive<T>
      {...props}
      className={styles.link({ className: props.className })}
    />
  )
}

export type BreadcrumbCurrentLinkProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

Breadcrumb.CurrentLink = function CurrentLink({
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

Breadcrumb.Icon = function Icon({
  className,
  size,
  ...props
}: BreadcrumbIconProps) {
  const { styles } = useBreadcrumbContext()

  return (
    <IconPrimitive
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
  icon?: IconType | undefined
  iconProps?: Omit<IconProps, "icon" | "size"> | undefined
  iconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLLIElement> | undefined
}

Breadcrumb.Separator = function Separator({
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
        <IconPrimitive
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
  icon?: IconType | undefined
  iconProps?: Omit<IconProps, "icon" | "size"> | undefined
  iconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLLIElement> | undefined
}

Breadcrumb.Ellipsis = function Ellipsis({
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
        <IconPrimitive
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
