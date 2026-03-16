import type { ElementType, ReactElement } from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { Icon, type IconType } from "../atoms/icon"
import { Link } from "../atoms/link"

const breadcrumbsVariants = tv({
  slots: {
    root: ["inline-flex flex-wrap items-center", "bg-breadcrumb-bg"],
    list: ["flex items-center", "break-words", "list-none"],
    item: [
      'inline-flex items-center',
      'text-breadcrumb-item-fg',
      'hover:text-breadcrumb-fg-hover',
      'data-[current=true]:text-breadcrumb-fg-current',
      'h-full',
      'transition-colors duration-200 motion-reduce:transition-none',
    ],
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
    ellipsis: [
      "text-breadcrumb-ellipsis-fg",
      "inline-flex items-center justify-center",
    ],
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
        separator: "gap-breadcrumb-sm",
        ellipsis: "text-breadcrumb-sm",
      },
      md: {
        root: "p-breadcrumb-md text-breadcrumb-md",
        list: "gap-breadcrumb-md",
        item: "gap-breadcrumb-md",
        separator: "gap-breadcrumb-md",
        ellipsis: "text-breadcrumb-md",
      },
      lg: {
        root: "p-breadcrumb-lg text-breadcrumb-lg",
        list: "gap-breadcrumb-lg",
        item: "gap-breadcrumb-lg",
        separator: "gap-breadcrumb-lg",
        ellipsis: "text-breadcrumb-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

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
}: {
  label: string
  href?: string
  icon?: IconType
  separator?: IconType
  lastItem: boolean
  isCurrentPage?: boolean
  linkAs?: ElementType | ReactElement<HTMLAnchorElement>
}) {
  const {
    item,
    currentLink,
    link,
    separator: separatorSlot,
  } = breadcrumbsVariants({ size: "md" })
  return (
    <li className={item()} data-current={isCurrentPage}>
      {icon && <Icon icon={icon} />}
      {isCurrentPage ? (
        <span aria-current="page" className={currentLink()}>
          {label}
        </span>
      ) : (
        <Link as={linkAs as ElementType} className={link()} href={href || "#"}>
          {label}
        </Link>
      )}
      {!lastItem && (
        <span className={separatorSlot()}>
          <Icon icon={separator ?? "token-icon-breadcrumb-separator"} />
        </span>
      )}
    </li>
  )
}

function BreadcrumbEllipsis() {
  const { ellipsis, separator: separatorSlot } = breadcrumbsVariants({
    size: "md",
  })
  return (
    <li className={ellipsis()}>
      <span aria-hidden="true">
        <Icon icon="token-icon-breadcrumb-ellipsis" />
      </span>
      <span className={separatorSlot()}>
        <Icon icon={"token-icon-breadcrumb-separator"} />
      </span>
    </li>
  )
}

interface BreadcrumbProps extends VariantProps<typeof breadcrumbsVariants> {
  items: BreadcrumbItemType[]
  maxItems?: number
  className?: string
  "aria-label"?: string
  linkAs?: ElementType | ReactElement<HTMLAnchorElement>
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
            <BreadcrumbEllipsis key="ellipsis" />
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
              />
            )
          )
        )}
      </ol>
    </nav>
  )
}
