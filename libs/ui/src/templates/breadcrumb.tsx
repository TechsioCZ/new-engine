/*
 * Breadcrumb — @techsio/ui-kit template.
 *
 * @component Breadcrumb
 * @componentVersion v1.0.2
 * @skill breadcrumb-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the breadcrumb-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { Fragment } from "react"
import type { ElementType, ReactElement, ReactNode, Ref } from "react"

import type { IconProps, IconType } from "../atoms/icon"
import { Breadcrumb } from "../molecules/breadcrumb"
import type {
  BreadcrumbLinkProps,
  BreadcrumbRootProps,
} from "../molecules/breadcrumb"

export type BreadcrumbTemplateLinkProps<T extends ElementType> = Omit<
  BreadcrumbLinkProps<T>,
  "as" | "href" | "children" | "className"
>

const BreadcrumbTemplateLink: (
  props: BreadcrumbLinkProps<ElementType>,
) => ReactElement = Breadcrumb.Link

export interface BreadcrumbTemplateItem {
  label: ReactNode
  href?: string | undefined
  icon?: IconType | undefined
  iconSize?: IconProps["size"] | undefined
  separatorIcon?: IconType | undefined
  separatorIconSize?: IconProps["size"] | undefined
  isCurrent?: boolean | undefined
  value?: string | undefined
}

export type BreadcrumbTemplateProps<T extends ElementType = "a"> = Omit<
  BreadcrumbRootProps,
  "children" | "ref"
> & {
  items: BreadcrumbTemplateItem[]
  maxItems?: number | undefined
  linkAs?: T | undefined
  linkProps?: BreadcrumbTemplateLinkProps<T> | undefined
  separator?: ReactNode | undefined
  separatorIcon?: IconType | undefined
  iconSize?: IconProps["size"] | undefined
  separatorIconSize?: IconProps["size"] | undefined
  ellipsisIconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLElement> | undefined
}

type BreadcrumbDisplayItem = BreadcrumbTemplateItem | "ellipsis"

const getDisplayItems = (
  items: BreadcrumbTemplateItem[],
  maxItems: number,
): BreadcrumbDisplayItem[] => {
  if (maxItems <= 0 || items.length <= maxItems) {
    return items
  }

  if (maxItems === 1) {
    const lastItem = items.at(-1)
    return lastItem ? [lastItem] : []
  }

  const [firstItem] = items
  return firstItem
    ? [firstItem, "ellipsis", ...items.slice(-(maxItems - 1))]
    : []
}

const getItemKey = (item: BreadcrumbDisplayItem, index: number) => {
  if (item === "ellipsis") {
    return `ellipsis-${index}`
  }

  return item.value ?? `breadcrumb-${index}`
}

export const BreadcrumbTemplate = <T extends ElementType = "a">({
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
}: BreadcrumbTemplateProps<T>) => {
  const displayItems = getDisplayItems(items, maxItems)
  const hasExplicitCurrent = displayItems.some(
    (item) => item !== "ellipsis" && item.isCurrent === true,
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

          const isCurrent = hasExplicitCurrent
            ? item.isCurrent === true
            : isLastItem
          const itemContent = (
            <>
              {item.icon !== undefined && (
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
                  <Breadcrumb.CurrentLink>{itemContent}</Breadcrumb.CurrentLink>
                ) : (
                  <BreadcrumbTemplateLink
                    {...linkProps}
                    as={linkAs}
                    href={
                      item.href === undefined || item.href === ""
                        ? "#"
                        : item.href
                    }
                  >
                    {itemContent}
                  </BreadcrumbTemplateLink>
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
