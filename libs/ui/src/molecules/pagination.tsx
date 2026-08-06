/*
 * Pagination — @techsio/ui-kit molecule.
 *
 * @component Pagination
 * @componentVersion v1.0.1
 * @skill pagination-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the pagination-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  connect as connectPagination,
  machine as paginationMachine,
} from "@zag-js/pagination"
import type { IntlTranslations as PaginationIntlTranslations } from "@zag-js/pagination"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import { createElement, useId } from "react"
import type {
  AnchorHTMLAttributes,
  ElementType,
  HTMLAttributes,
  ReactNode,
} from "react"
import type { VariantProps } from "tailwind-variants"

import { Icon } from "../atoms/icon"
import { LinkButton } from "../atoms/link-button"
import type { LinkButtonProps } from "../atoms/link-button"
import type { PaginationGetPageUrl } from "./pagination-utils"
import { paginationVariants } from "./pagination-variants"

export type PaginationBaseProps = Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> &
  VariantProps<typeof paginationVariants> & {
    page?: number | undefined
    defaultPage?: number | undefined
    count: number
    pageSize?: number | undefined
    siblingCount?: number | undefined
    boundaryCount?: number | undefined
    showPrevNext?: boolean | undefined
    dir?: "ltr" | "rtl" | undefined
    compact?: boolean | undefined
    compactLabel?:
      | ((details: { page: number; totalPages: number }) => ReactNode)
      | undefined
    onChange?: ((page: number) => void) | undefined
    onPageChange?: ((page: number) => void) | undefined
    translations?: PaginationIntlTranslations | undefined
  }

type PaginationLinkElement = ElementType

type PaginationControlledLinkProp =
  | "as"
  | "children"
  | "className"
  | "disabled"
  | "href"
  | "icon"
  | "iconPosition"
  | "size"
  | "theme"

type PaginationLinkProps<T extends PaginationLinkElement> = LinkButtonProps<T> &
  Partial<Record<PaginationControlledLinkProp, never>>

export type PaginationProps<T extends PaginationLinkElement = "a"> =
  PaginationBaseProps & {
    getPageUrl: PaginationGetPageUrl
    linkAs?: T | undefined
    linkProps?: PaginationLinkProps<T> | undefined
  }

type PaginationTriggerProps<T extends PaginationLinkElement> = Pick<
  LinkButtonProps<T>,
  "href"
> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "id">
type PaginationButtonOverrides = Pick<LinkButtonProps, "icon">

export { paginationVariants } from "./pagination-variants"
export {
  createPaginationGetPageUrl,
  type CreatePaginationGetPageUrlOptions,
  type PaginationGetPageUrl,
  type PaginationSearchParamsInput,
} from "./pagination-utils"

const hasHref = <T extends PaginationLinkElement>(
  triggerProps: PaginationTriggerProps<T>,
): triggerProps is PaginationTriggerProps<T> & {
  href: NonNullable<PaginationTriggerProps<T>["href"]>
} =>
  "href" in triggerProps &&
  triggerProps.href !== null &&
  triggerProps.href !== undefined

export const Pagination = <T extends PaginationLinkElement = "a">({
  page,
  defaultPage = 1,
  count,
  pageSize = 10,
  siblingCount = 1,
  boundaryCount = 1,
  showPrevNext = true,
  variant,
  className,
  dir = "ltr",
  getPageUrl,
  linkAs,
  linkProps,
  size,
  compact = false,
  compactLabel,
  onChange,
  onPageChange,
  translations,
  ...props
}: PaginationProps<T>) => {
  const uniqueId = useId()

  const service = useMachine(paginationMachine, {
    boundaryCount,
    count,
    defaultPage,
    dir,
    getPageUrl,
    id: uniqueId,
    onPageChange: (details) => {
      onChange?.(details.page)
      onPageChange?.(details.page)
    },
    ...(page !== undefined && { page }),
    pageSize,
    siblingCount,
    ...(translations !== undefined && { translations }),
    type: "link",
  })

  const api = connectPagination(service, normalizeProps)
  const { base, list, link, item, ellipsis, compactText } = paginationVariants({
    size,
    variant,
  })
  const rootProps = mergeProps(api.getRootProps(), props)

  const renderTriggerButton = (
    triggerProps: PaginationTriggerProps<T>,
    overrides: PaginationButtonOverrides = {},
    children?: ReactNode,
  ) => {
    const isNavigable = hasHref(triggerProps)

    const interactionProps = mergeProps<
      PaginationLinkProps<T> | PaginationTriggerProps<T> | { className: string }
    >(linkProps, triggerProps, { className: link() })
    const buttonProps = { ...linkProps }
    const presentationProps: {
      as: T | undefined
      children: ReactNode | undefined
      disabled: boolean
      icon: LinkButtonProps["icon"]
      size: "current"
      theme: "borderless"
    } = {
      as: isNavigable ? linkAs : undefined,
      children,
      disabled: !isNavigable,
      icon: overrides.icon,
      size: "current",
      theme: "borderless",
    }
    const completeButtonProps = Object.assign(
      buttonProps,
      interactionProps,
      presentationProps,
    )

    return createElement(LinkButton<T>, completeButtonProps)
  }

  const prevTriggerProps = api.getPrevTriggerProps()
  const nextTriggerProps = api.getNextTriggerProps()

  return (
    <nav {...rootProps} className={base({ className })}>
      <ul className={list()}>
        {showPrevNext && (
          <li className={item()}>
            {renderTriggerButton(prevTriggerProps, {
              icon: "token-icon-pagination-prev",
            })}
          </li>
        )}
        {compact ? (
          <li className={item()}>
            <span className={compactText()} data-part="compact-text">
              {compactLabel?.({
                page: api.page,
                totalPages: api.totalPages,
              }) ?? `${api.page} of ${api.totalPages}`}
            </span>
          </li>
        ) : (
          api.pages.map((paginationPage, index) => {
            if (paginationPage.type === "page") {
              return (
                <li className={item()} key={paginationPage.value}>
                  {renderTriggerButton(
                    api.getItemProps(paginationPage),
                    undefined,
                    paginationPage.value,
                  )}
                </li>
              )
            }

            const previousPage = api.pages[index - 1]
            const nextPage = api.pages[index + 1]
            const previousPageValue =
              previousPage?.type === "page" ? previousPage.value : "start"
            const nextPageValue =
              nextPage?.type === "page" ? nextPage.value : "end"

            return (
              <li
                className={item()}
                key={`ellipsis-${previousPageValue}-${nextPageValue}`}
              >
                <span
                  aria-hidden="true"
                  className={ellipsis()}
                  {...api.getEllipsisProps({ index })}
                >
                  <Icon icon="token-icon-pagination-ellipsis" size="current" />
                </span>
              </li>
            )
          })
        )}

        {showPrevNext && (
          <li className={item()}>
            {renderTriggerButton(nextTriggerProps, {
              icon: "token-icon-pagination-next",
            })}
          </li>
        )}
      </ul>
    </nav>
  )
}
