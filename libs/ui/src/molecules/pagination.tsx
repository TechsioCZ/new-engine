import {
  connect as connectPagination,
  type IntlTranslations as PaginationIntlTranslations,
  type PageUrlDetails as PaginationPageUrlDetails,
  machine as paginationMachine,
} from "@zag-js/pagination"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import {
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  useId,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Icon } from "../atoms/icon"
import { LinkButton, type LinkButtonProps } from "../atoms/link-button"
import { tv } from "../utils"

export const paginationVariants = tv({
  slots: {
    base: "",
    list: ["inline-flex items-center gap-pagination-list"],
    item: [
      "grid cursor-pointer",
      'has-[[data-part="ellipsis"]]:bg-pagination-neutral-bg',
      'has-[[data-part="compact-text"]]:bg-pagination-neutral-bg',
    ],
    link: [
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-pagination-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "border-(length:--border-pagination-width) rounded-pagination border-pagination-border",
      "aspect-square",
      "data-disabled:text-pagination-fg-disabled data-disabled:hover:bg-pagination-bg-disabled",
      "data-disabled:bg-pagination-bg-disabled",
      "data-disabled:cursor-not-allowed data-disabled:border-pagination-border-disabled",
    ],
    ellipsis: "",
    compactText: "",
  },
  compoundSlots: [
    {
      slots: ["link", "ellipsis"],
      className: [
        "inline-flex items-center justify-center",
        "transition-colors duration-200 motion-reduce:transition-none",
        "text-pagination-fg",
      ],
    },
  ],
  variants: {
    variant: {
      filled: {
        item: "bg-pagination-bg",
        link: [
          "data-selected:border-pagination-border-active data-selected:bg-pagination-bg-active data-selected:text-pagination-filled-fg-active",
          "hover:border-pagination-border-hover hover:bg-pagination-bg-hover",
          "hover:text-pagination-filled-fg-active",
        ],
      },
      outlined: {
        item: "bg-pagination-bg",
        link: [
          "data-selected:border-pagination-border-active data-selected:text-pagination-outlined-fg-active",
          "hover:border-pagination-border-hover hover:text-pagination-outlined-fg-active",
        ],
      },
      minimal: {
        link: [
          "border-transparent",
          "data-selected:text-pagination-minimal-fg-active",
          "hover:text-pagination-minimal-fg-active",
        ],
      },
    },
    size: {
      sm: {
        link: "h-pagination-sm text-pagination-sm",
        compactText: "text-pagination-sm",
      },
      md: {
        link: "h-pagination-md text-pagination-md",
        compactText: "text-pagination-md",
      },
      lg: {
        link: "h-pagination-lg text-pagination-lg",
        compactText: "text-pagination-lg",
      },
    },
  },
  defaultVariants: {
    variant: "filled",
    size: "md",
  },
})

export type PaginationBaseProps = Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> &
  VariantProps<typeof paginationVariants> & {
    page?: number
    defaultPage?: number
    count: number
    pageSize?: number
    siblingCount?: number
    boundaryCount?: number
    showPrevNext?: boolean
    dir?: "ltr" | "rtl"
    compact?: boolean
    compactLabel?: (details: { page: number; totalPages: number }) => ReactNode
    onChange?: (page: number) => void
    onPageChange?: (page: number) => void
    translations?: PaginationIntlTranslations
  }

type PaginationLinkProps<T extends ElementType> = Omit<
  LinkButtonProps<T>,
  | "href"
  | "children"
  | "as"
  | "className"
  | "size"
  | "theme"
  | "disabled"
  | "icon"
  | "iconPosition"
>

export type PaginationProps<T extends ElementType = "a"> =
  PaginationBaseProps & {
    getPageUrl?: PaginationGetPageUrl
    linkAs?: T
    linkProps?: PaginationLinkProps<T>
  }

type PaginationTriggerProps = Record<string, unknown>
type PaginationSearchParamValue = string | number | boolean | null | undefined
type PaginationSearchParamsRecord = Record<string, PaginationSearchParamValue>

export type PaginationGetPageUrl = (details: PaginationPageUrlDetails) => string

export type PaginationSearchParamsInput =
  | string
  | URLSearchParams
  | { toString: () => string }

export type CreatePaginationGetPageUrlOptions = {
  pathname: string
  searchParams?: PaginationSearchParamsInput
  pageParam?: string
  defaultPage?: number
  searchParamOverrides?: PaginationSearchParamsRecord
}

function toURLSearchParams(searchParams?: PaginationSearchParamsInput) {
  if (!searchParams) {
    return new URLSearchParams()
  }

  if (typeof searchParams === "string") {
    return new URLSearchParams(searchParams)
  }

  return new URLSearchParams(searchParams.toString())
}

export function createPaginationGetPageUrl({
  pathname,
  searchParams,
  pageParam = "page",
  defaultPage = 1,
  searchParamOverrides,
}: CreatePaginationGetPageUrlOptions): PaginationGetPageUrl {
  const baseSearchParams = toURLSearchParams(searchParams)

  return ({ page }) => {
    const nextSearchParams = new URLSearchParams(baseSearchParams)

    if (searchParamOverrides) {
      for (const [key, value] of Object.entries(searchParamOverrides)) {
        if (value == null) {
          nextSearchParams.delete(key)
        } else {
          nextSearchParams.set(key, String(value))
        }
      }
    }

    if (page > defaultPage) {
      nextSearchParams.set(pageParam, page.toString())
    } else {
      nextSearchParams.delete(pageParam)
    }

    const query = nextSearchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }
}

function hasHref(
  triggerProps: PaginationTriggerProps
): triggerProps is PaginationTriggerProps & { href: unknown } {
  return triggerProps.href != null
}

export function Pagination<T extends ElementType = "a">({
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
}: PaginationProps<T>) {
  const uniqueId = useId()
  const isLinkMode = typeof getPageUrl === "function"

  const service = useMachine(paginationMachine, {
    id: uniqueId,
    count,
    pageSize,
    siblingCount,
    boundaryCount,
    page,
    dir,
    defaultPage,
    type: isLinkMode ? "link" : "button",
    ...(isLinkMode ? { getPageUrl } : {}),
    onPageChange: (details) => {
      onChange?.(details.page)
      onPageChange?.(details.page)
    },
    translations,
  })

  const api = connectPagination(service, normalizeProps)
  const { base, list, link, item, ellipsis, compactText } = paginationVariants({
    variant,
    size,
  })
  const rootProps = mergeProps(props, api.getRootProps())

  const sharedLinkProps =
    linkProps && typeof linkProps === "object"
      ? (({ href: _ignoredHref, ...rest }) => rest)(
          linkProps as Record<string, unknown>
        )
      : undefined

  const getTriggerButtonProps = (
    triggerProps: PaginationTriggerProps,
    overrides: Record<string, unknown> = {}
  ) => {
    const baseTriggerProps = mergeProps(triggerProps, {
      className: link(),
      size: "current" as const,
      theme: "borderless" as const,
      ...overrides,
    })

    if (isLinkMode && !hasHref(triggerProps)) {
      return mergeProps(baseTriggerProps, {
        disabled: true,
      }) as LinkButtonProps<T>
    }

    return mergeProps(sharedLinkProps, baseTriggerProps, {
      ...(linkAs ? { as: linkAs } : {}),
      ...(isLinkMode || linkAs ? {} : { as: "button", type: "button" }),
    }) as LinkButtonProps<T>
  }

  const prevTriggerProps = api.getPrevTriggerProps() as PaginationTriggerProps
  const nextTriggerProps = api.getNextTriggerProps() as PaginationTriggerProps

  return (
    <nav className={base({ className })} {...rootProps}>
      <ul className={list()}>
        {showPrevNext && (
          <li className={item()}>
            <LinkButton
              {...getTriggerButtonProps(prevTriggerProps, {
                icon: "token-icon-pagination-prev",
              })}
            />
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
                  <LinkButton
                    {...getTriggerButtonProps(
                      api.getItemProps(paginationPage) as Record<
                        string,
                        unknown
                      >
                    )}
                  >
                    {paginationPage.value}
                  </LinkButton>
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
            <LinkButton
              {...getTriggerButtonProps(nextTriggerProps, {
                icon: "token-icon-pagination-next",
              })}
            />
          </li>
        )}
      </ul>
    </nav>
  )
}
