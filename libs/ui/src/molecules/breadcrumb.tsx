import type { ElementType } from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { Icon, type IconType } from "../atoms/icon"
import { Link } from "../atoms/link"

const breadcrumbsVariants = tv({
  slots: {
    root: ["inline-flex flex-wrap items-center", "bg-breadcrumb-bg"],
    list: ["flex items-center", "break-words", "list-none"],
    item: [
      "inline-flex items-center",
      "text-breadcrumb-item-fg",
      "hover:text-breadcrumb-fg-hover",
      "data-[current=true]:text-breadcrumb-fg-current",
      "h-full",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    itemIcon: ["inline-flex items-center justify-center"],
    link: [
      "no-underline",
      "cursor-pointer",
      "hover:text-breadcrumb-fg-hover",
      "transition-colors duration-200 motion-reduce:transition-none",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-breadcrumb-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    currentLink: ["cursor-default"],
    separator: [
      "text-breadcrumb-separator-fg",
      "inline-flex items-center justify-center",
      "rtl:rotate-180",
    ],
    separatorIcon: ["inline-flex items-center justify-center"],
    ellipsis: [
      "text-breadcrumb-ellipsis-fg",
      "inline-flex items-center justify-center",
    ],
    ellipsisIcon: ["inline-flex items-center justify-center"],
  },
  compoundSlots: [
    {
      slots: ["link", "currentLink"],
      class: ["inline-flex items-center font-medium"],
    },
  ],
  variants: {
    size: {
      sm: {
        root: "p-breadcrumb-sm text-breadcrumb-sm",
        list: "gap-breadcrumb-sm",
        item: "gap-breadcrumb-sm",
        itemIcon: "text-breadcrumb-item-icon-sm",
        separator: "gap-breadcrumb-sm",
        separatorIcon: "text-breadcrumb-separator-icon-sm",
        ellipsisIcon: "text-breadcrumb-ellipsis-icon-sm",
      },
      md: {
        root: "p-breadcrumb-md text-breadcrumb-md",
        list: "gap-breadcrumb-md",
        item: "gap-breadcrumb-md",
        itemIcon: "text-breadcrumb-item-icon-md",
        separator: "gap-breadcrumb-md",
        separatorIcon: "text-breadcrumb-separator-icon-md",
        ellipsisIcon: "text-breadcrumb-ellipsis-icon-md",
      },
      lg: {
        root: "p-breadcrumb-lg text-breadcrumb-lg",
        list: "gap-breadcrumb-lg",
        item: "gap-breadcrumb-lg",
        itemIcon: "text-breadcrumb-item-icon-lg",
        separator: "gap-breadcrumb-lg",
        separatorIcon: "text-breadcrumb-separator-icon-lg",
        ellipsisIcon: "text-breadcrumb-ellipsis-icon-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

type BreadcrumbSize = NonNullable<VariantProps<typeof breadcrumbsVariants>["size"]>

export type BreadcrumbItemType = {
  label: string
  href?: string
  icon?: IconType
  separator?: IconType
  isCurrent?: boolean
}

function BreadcrumbItem({
  label,
  href,
  icon,
  separator = "token-icon-breadcrumb-separator",
  isCurrentPage,
  lastItem,
  linkAs,
  size,
}: {
  label: string
  href?: string
  icon?: IconType
  separator?: IconType
  lastItem: boolean
  isCurrentPage?: boolean
  linkAs?: ElementType
  size: BreadcrumbSize
}) {
  const {
    item,
    itemIcon,
    currentLink,
    link,
    separator: separatorSlot,
    separatorIcon,
  } = breadcrumbsVariants({ size })
  return (
    <li className={item()} data-current={isCurrentPage}>
      {icon && <Icon className={itemIcon()} icon={icon} />}
      {isCurrentPage ? (
        <span aria-current="page" className={currentLink()}>
          {label}
        </span>
      ) : (
        <Link as={linkAs} className={link()} href={href || "#"}>
          {label}
        </Link>
      )}
      {!lastItem && (
        <span className={separatorSlot()}>
          <Icon
            className={separatorIcon()}
            icon={separator ?? "token-icon-breadcrumb-separator"}
          />
        </span>
      )}
    </li>
  )
}

function BreadcrumbEllipsis({ size }: { size: BreadcrumbSize }) {
  const { ellipsis, ellipsisIcon, separator: separatorSlot, separatorIcon } =
    breadcrumbsVariants({
      size,
    })
  return (
    <li className={ellipsis()}>
      <span aria-hidden="true">
        <Icon className={ellipsisIcon()} icon="token-icon-breadcrumb-ellipsis" />
      </span>
      <span className={separatorSlot()}>
        <Icon
          className={separatorIcon()}
          icon={"token-icon-breadcrumb-separator"}
        />
      </span>
    </li>
  )
}

interface BreadcrumbProps extends VariantProps<typeof breadcrumbsVariants> {
  items: BreadcrumbItemType[]
  maxItems?: number
  className?: string
  "aria-label"?: string
  linkAs?: ElementType
}

export function Breadcrumb({
  items,
  maxItems = 0,
  size = "md",
  className,
  "aria-label": ariaLabel = "breadcrumb",
  linkAs,
  ...props
}: BreadcrumbProps) {
  const { root, list } = breadcrumbsVariants({ size })

  const displayItems =
    maxItems <= 0 || items.length <= maxItems
      ? items
      : maxItems === 1
        ? [items.at(-1)]
        : [items[0], "ellipsis", ...items.slice(-(maxItems - 1))]

  // If any item has explicit isCurrent, use only that; otherwise default to last item
  const hasExplicitCurrent = displayItems.some(
    (item) => item && typeof item !== "string" && item.isCurrent
  )

  return (
    <nav aria-label={ariaLabel} className={root({ className })} {...props}>
      <ol className={list()}>
        {displayItems.map((item, index) =>
          item === "ellipsis" ? (
            <BreadcrumbEllipsis key="ellipsis" size={size} />
          ) : (
            item &&
            typeof item !== "string" && (
              <BreadcrumbItem
                href={item.href}
                icon={item.icon}
                isCurrentPage={
                  hasExplicitCurrent
                    ? item.isCurrent
                    : index === displayItems.length - 1
                }
                key={`${item.label}`}
                label={item.label}
                lastItem={index === displayItems.length - 1}
                linkAs={linkAs}
                separator={item.separator}
                size={size}
              />
            )
          )
        )}
      </ol>
    </nav>
  )
}
