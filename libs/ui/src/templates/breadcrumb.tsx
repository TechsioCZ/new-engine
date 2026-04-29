import {
  Fragment,
  type ElementType,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react"
import type { IconProps, IconType } from "../atoms/icon"
import {
  Breadcrumb,
  type BreadcrumbLinkProps,
  type BreadcrumbRootProps,
} from "../molecules/breadcrumb"

export type BreadcrumbTemplateLinkProps<T extends ElementType> = Omit<
  BreadcrumbLinkProps<T>,
  "as" | "href" | "children" | "className"
>

type BreadcrumbTemplateRenderLinkProps =
  BreadcrumbLinkProps<ElementType>

const BreadcrumbTemplateLink = Breadcrumb.Link as (
  props: BreadcrumbTemplateRenderLinkProps
) => ReactElement

export type BreadcrumbTemplateItem = {
  label: ReactNode
  href?: string
  icon?: IconType
  iconSize?: IconProps["size"]
  separatorIcon?: IconType
  separatorIconSize?: IconProps["size"]
  isCurrent?: boolean
  value?: string
}

export type BreadcrumbTemplateProps<T extends ElementType = "a"> = Omit<
  BreadcrumbRootProps,
  "children" | "ref"
> & {
  items: BreadcrumbTemplateItem[]
  maxItems?: number
  linkAs?: T
  linkProps?: BreadcrumbTemplateLinkProps<T>
  separator?: ReactNode
  separatorIcon?: IconType
  iconSize?: IconProps["size"]
  separatorIconSize?: IconProps["size"]
  ellipsisIconSize?: IconProps["size"]
  ref?: Ref<HTMLElement>
}

type BreadcrumbDisplayItem =
  | BreadcrumbTemplateItem
  | "ellipsis"

function getDisplayItems(
  items: BreadcrumbTemplateItem[],
  maxItems: number
): BreadcrumbDisplayItem[] {
  if (maxItems <= 0 || items.length <= maxItems) {
    return items
  }

  if (maxItems === 1) {
    const lastItem = items.at(-1)
    return lastItem ? [lastItem] : []
  }

  const firstItem = items[0]
  return firstItem
    ? [firstItem, "ellipsis", ...items.slice(-(maxItems - 1))]
    : []
}

function getItemKey(
  item: BreadcrumbDisplayItem,
  index: number
) {
  if (item === "ellipsis") {
    return `ellipsis-${index}`
  }

  return item.value ?? `${index}-${String(item.label)}`
}

export function BreadcrumbTemplate<T extends ElementType = "a">({
  items,
  maxItems = 0,
  linkAs,
  linkProps,
  separator,
  separatorIcon = "token-icon-breadcrumb-separator",
  iconSize,
  separatorIconSize,
  ellipsisIconSize,
  ref,
  ...breadcrumbProps
}: BreadcrumbTemplateProps<T>) {
  const displayItems = getDisplayItems(items, maxItems)
  const hasExplicitCurrent = displayItems.some(
    (item) => item !== "ellipsis" && item.isCurrent
  )

  return (
    <Breadcrumb ref={ref} {...breadcrumbProps}>
      <Breadcrumb.List>
        {displayItems.map((item, index) => {
          const isLastItem = index === displayItems.length - 1

          if (item === "ellipsis") {
            return (
              <Fragment key={getItemKey(item, index)}>
                <Breadcrumb.Ellipsis iconSize={ellipsisIconSize} />
                {!isLastItem && (
                  <Breadcrumb.Separator
                    icon={separatorIcon}
                    iconSize={separatorIconSize}
                  >
                    {separator}
                  </Breadcrumb.Separator>
                )}
              </Fragment>
            )
          }

          const isCurrent = hasExplicitCurrent ? item.isCurrent : isLastItem
          const itemContent = (
            <>
              {item.icon && (
                <Breadcrumb.Icon
                  icon={item.icon}
                  size={item.iconSize ?? iconSize}
                />
              )}
              {item.label}
            </>
          )

          return (
            <Fragment key={getItemKey(item, index)}>
              <Breadcrumb.Item>
                {isCurrent ? (
                  <Breadcrumb.CurrentLink>
                    {itemContent}
                  </Breadcrumb.CurrentLink>
                ) : (
                  <BreadcrumbTemplateLink
                    {...(linkProps as
                      | BreadcrumbTemplateLinkProps<ElementType>
                      | undefined)}
                    as={linkAs}
                    children={itemContent}
                    href={item.href || "#"}
                  />
                )}
              </Breadcrumb.Item>

              {!isLastItem && (
                <Breadcrumb.Separator
                  icon={item.separatorIcon ?? separatorIcon}
                  iconSize={item.separatorIconSize ?? separatorIconSize}
                >
                  {separator}
                </Breadcrumb.Separator>
              )}
            </Fragment>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb>
  )
}
