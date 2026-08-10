"use client"

import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import { useTranslations } from "next-intl"
import { Fragment } from "react"
import type { ComponentPropsWithoutRef } from "react"

import NextLink from "@/components/app-link"

type NextLinkProps = ComponentPropsWithoutRef<typeof NextLink>

export interface HerbatikaBreadcrumbItem {
  label: string
  href?: NextLinkProps["href"]
  icon?: IconType
  isCurrent?: boolean
  ariaLabel?: string
  linkProps?: Omit<NextLinkProps, "as" | "children" | "className" | "href">
}

export type HerbatikaBreadcrumbProps = Omit<
  ComponentPropsWithoutRef<"nav">,
  "children" | "className"
> & {
  items: HerbatikaBreadcrumbItem[]
}

const getBreadcrumbItemKey = (item: HerbatikaBreadcrumbItem, index: number) => {
  const hrefKey =
    typeof item.href === "string"
      ? item.href
      : (JSON.stringify(item.href) ?? "current")

  return `${hrefKey}-${item.label}-${index}`
}

const BreadcrumbItemContent = ({ item }: { item: HerbatikaBreadcrumbItem }) => (
  <>
    {item.icon === undefined ? null : (
      <Breadcrumb.Icon className="mr-50 mb-50 font-bold" icon={item.icon} />
    )}
    {item.label !== "" && <span>{item.label}</span>}
  </>
)

export const HerbatikaBreadcrumb = ({
  items,
  ...breadcrumbProps
}: HerbatikaBreadcrumbProps) => {
  const t = useTranslations("navigation")

  if (items.length === 0) {
    return null
  }

  const hasExplicitCurrent = items.some((item) => item.isCurrent === true)

  return (
    <Breadcrumb
      aria-label={t("breadcrumbs.root_aria")}
      {...breadcrumbProps}
      className="font-inter"
    >
      <Breadcrumb.List>
        {items.map((item, index) => {
          const isLastItem = index === items.length - 1
          const isCurrentPage = hasExplicitCurrent
            ? item.isCurrent === true
            : isLastItem

          return (
            <Fragment key={getBreadcrumbItemKey(item, index)}>
              <Breadcrumb.Item>
                {isCurrentPage ? (
                  <Breadcrumb.CurrentLink
                    aria-label={item.ariaLabel}
                    className="font-bold"
                  >
                    <BreadcrumbItemContent item={item} />
                  </Breadcrumb.CurrentLink>
                ) : (
                  <Breadcrumb.Link
                    aria-label={item.ariaLabel}
                    as={NextLink}
                    href={item.href ?? "#"}
                    {...item.linkProps}
                  >
                    <BreadcrumbItemContent item={item} />
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>

              {isLastItem ? null : <Breadcrumb.Separator />}
            </Fragment>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb>
  )
}
