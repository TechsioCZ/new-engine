"use client"

import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import { type ComponentPropsWithoutRef, Fragment } from "react"

type NextLinkProps = ComponentPropsWithoutRef<typeof NextLink>

export type HerbatikaBreadcrumbItem = {
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

function getBreadcrumbItemKey(item: HerbatikaBreadcrumbItem, index: number) {
  return `${item.href?.toString() ?? "current"}-${item.label}-${index}`
}

function BreadcrumbItemContent({ item }: { item: HerbatikaBreadcrumbItem }) {
  return (
    <>
      {item.icon ? (
        <Breadcrumb.Icon className="mr-50 mb-50 font-bold" icon={item.icon} />
      ) : null}
      {item.label && <span>{item.label}</span>}
    </>
  )
}

export function HerbatikaBreadcrumb({
  items,
  ...breadcrumbProps
}: HerbatikaBreadcrumbProps) {
  const t = useTranslations("navigation")

  if (items.length === 0) {
    return null
  }

  const hasExplicitCurrent = items.some((item) => item.isCurrent)

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
