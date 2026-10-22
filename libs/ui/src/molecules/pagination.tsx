/**
 * Pagination — @techsio/ui-kit molecule.
 *
 * @component Pagination
 * @componentVersion v1.1.3
 * @skill pagination-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the pagination-usage skill's component_version and a changelog entry. Bump all three together.
 */
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
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Icon } from "../atoms/icon"
import { LinkButton, type LinkButtonProps } from "../atoms/link-button"
import { tv } from "../utils"

export const paginationVariants = tv({
  slots: {
    base: "pagination-container w-full max-w-full",
    list: ["inline-flex max-w-full items-center gap-pagination-list"],
    pageItem: "pagination-page-item",
    responsiveSummary: "pagination-responsive-summary",
    item: [
      "grid shrink-0 cursor-pointer",
      'has-[[data-part="ellipsis"]]:bg-pagination-bg-neutral',
      'has-[[data-part="compact-text"]]:bg-pagination-bg-neutral',
    ],
    link: [
      "pagination-press font-pagination data-selected:font-pagination-current",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-pagination-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "border-(length:--border-pagination-width) rounded-pagination border-pagination-border-base",
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
        item: "bg-pagination-bg-base",
        link: [
          "data-selected:border-pagination-border-active data-selected:bg-pagination-bg-active data-selected:text-pagination-fg-filled-active",
          "hover:border-pagination-border-hover hover:bg-pagination-bg-hover",
          "hover:text-pagination-fg-filled-active",
        ],
      },
      outlined: {
        item: "bg-pagination-bg-base",
        link: [
          "data-selected:border-pagination-border-active data-selected:text-pagination-fg-outlined-active",
          "hover:border-pagination-border-hover hover:text-pagination-fg-outlined-active",
        ],
      },
      minimal: {
        link: [
          "border-transparent",
          "data-selected:decoration-(length:--text-decoration-thickness-pagination-marker) data-selected:underline-offset-(length:--text-underline-offset-pagination-marker) data-selected:text-pagination-fg-minimal-active data-selected:underline",
          "hover:text-pagination-fg-minimal-active",
        ],
      },
    },
    size: {
      sm: {
        link: "h-form-control-sm text-pagination-nav-sm",
        compactText: "text-pagination-nav-sm",
      },
      md: {
        link: "h-form-control-md text-pagination-nav-md",
        compactText: "text-pagination-nav-md",
      },
      lg: {
        link: "h-form-control-lg text-pagination-nav-lg",
        compactText: "text-pagination-nav-lg",
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
    getPageUrl: PaginationGetPageUrl
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

    if (page === defaultPage) {
      nextSearchParams.delete(pageParam)
    } else {
      nextSearchParams.set(pageParam, page.toString())
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

function usePaginationPage({
  page,
  defaultPage = 1,
  count,
  pageSize = 10,
  onChange,
  onPageChange,
}: PaginationBaseProps) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const safePageSize = Number.isFinite(pageSize)
    ? Math.max(1, Math.floor(pageSize))
    : 10
  const totalPages = Math.ceil(safeCount / safePageSize)
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage)
  const previousPageSize = useRef(safePageSize)
  const correction = useRef<string | null>(null)
  const requestedPage = page ?? uncontrolledPage
  const validPage =
    Number.isInteger(requestedPage) &&
    requestedPage >= 1 &&
    requestedPage <= Math.max(1, totalPages)
  const effectivePage = validPage
    ? requestedPage
    : Math.min(
        Math.max(
          1,
          Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1
        ),
        Math.max(1, totalPages)
      )
  const pendingCorrection = page !== undefined && !validPage

  useEffect(() => {
    // Zag historically resets an invalid uncontrolled page on pageSize changes.
    const resized = previousPageSize.current !== safePageSize
    previousPageSize.current = safePageSize
    if (validPage) {
      correction.current = null
      return
    }
    const next = page === undefined && resized ? 1 : effectivePage
    if (page === undefined) {
      setUncontrolledPage(next)
    }
    const key = `${requestedPage}:${next}:${totalPages}`
    if (correction.current !== key) {
      correction.current = key
      onChange?.(next)
      onPageChange?.(next)
    }
  }, [
    effectivePage,
    onChange,
    onPageChange,
    page,
    requestedPage,
    safePageSize,
    totalPages,
    validPage,
  ])

  return {
    safeCount,
    safePageSize,
    totalPages,
    effectivePage,
    pendingCorrection,
    setUncontrolledPage,
  }
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

  const {
    safeCount,
    safePageSize,
    totalPages,
    effectivePage,
    pendingCorrection,
    setUncontrolledPage,
  } = usePaginationPage({
    page,
    defaultPage,
    count,
    pageSize,
    onChange,
    onPageChange,
  })

  const service = useMachine(paginationMachine, {
    id: uniqueId,
    count: safeCount,
    pageSize: safePageSize,
    siblingCount,
    boundaryCount,
    page: effectivePage,
    dir,
    defaultPage,
    type: "link",
    getPageUrl,
    onPageChange: (details) => {
      if (page === undefined) {
        setUncontrolledPage(details.page)
      }
      onChange?.(details.page)
      onPageChange?.(details.page)
    },
    translations,
  })

  const api = connectPagination(service, normalizeProps)
  const {
    base,
    list,
    link,
    item,
    pageItem,
    responsiveSummary,
    ellipsis,
    compactText,
  } = paginationVariants({
    variant,
    size,
  })
  // Zag's root aria-label (translations.rootLabel) would overwrite the
  // caller's; a page with two paginations needs distinct names.
  const rootProps = mergeProps(
    props,
    api.getRootProps(),
    props["aria-label"] ? { "aria-label": props["aria-label"] } : {}
  )

  const sharedLinkProps =
    linkProps && typeof linkProps === "object"
      ? (({ href: _ignoredHref, ...rest }) => rest)(
          linkProps as Record<string, unknown>
        )
      : undefined

  const getTriggerButtonProps = (
    triggerProps: PaginationTriggerProps,
    overrides: Record<string, unknown> = {},
    destination = effectivePage
  ) => {
    const isNavigable =
      totalPages > 0 &&
      !pendingCorrection &&
      destination >= 1 &&
      destination <= totalPages &&
      hasHref(triggerProps) &&
      triggerProps["data-disabled"] == null
    const { onClick: machineClick, href, ...restTriggerProps } = triggerProps
    const consumerClick = sharedLinkProps?.onClick as
      | ((event: MouseEvent<HTMLAnchorElement>) => void)
      | undefined
    const target = sharedLinkProps?.target
    const baseTriggerProps = mergeProps(restTriggerProps, {
      href: isNavigable ? href : undefined,
      onClick: isNavigable
        ? (event: MouseEvent<HTMLAnchorElement>) => {
            consumerClick?.(event)
            const contextTarget =
              event.currentTarget.getAttribute("target") ?? target
            if (
              event.defaultPrevented ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              (contextTarget && contextTarget !== "_self")
            ) {
              return
            }
            ;(
              machineClick as
                | ((event: MouseEvent<HTMLAnchorElement>) => void)
                | undefined
            )?.(event)
          }
        : undefined,
      className: link(),
      size: "current" as const,
      theme: "unstyled" as const,
      ...overrides,
    })

    return mergeProps(
      isNavigable ? { ...sharedLinkProps, onClick: undefined } : undefined,
      baseTriggerProps,
      {
        composition: true,
        ...(isNavigable && linkAs ? { as: linkAs } : {}),
        // An unavailable destination is a non-interactive link placeholder.
        ...(isNavigable
          ? {}
          : {
              as: "span",
              disabled: true,
              role: triggerProps.role ?? sharedLinkProps?.role ?? "link",
            }),
      }
    ) as LinkButtonProps<T>
  }

  const prevTriggerProps = api.getPrevTriggerProps() as PaginationTriggerProps
  const nextTriggerProps = api.getNextTriggerProps() as PaginationTriggerProps
  const numberedItemClass = item({ className: pageItem() })

  return (
    <nav
      className={base({ className })}
      {...rootProps}
      data-compact={compact}
      data-prev-next={showPrevNext}
    >
      {pendingCorrection ? (
        <span role="status">
          Page unavailable. Choose a page within the current results.
        </span>
      ) : (
        <ul className={list()}>
          {showPrevNext && (
            <li className={item()}>
              <LinkButton
                {...getTriggerButtonProps(
                  prevTriggerProps,
                  {
                    icon:
                      dir === "rtl"
                        ? "token-icon-pagination-next"
                        : "token-icon-pagination-prev",
                  },
                  effectivePage - 1
                )}
              />
            </li>
          )}
          <li className={item({ className: responsiveSummary() })}>
            <span className={compactText()} data-part="compact-text">
              {compactLabel?.({
                page: totalPages === 0 ? 0 : effectivePage,
                totalPages,
              }) ?? `${totalPages === 0 ? 0 : effectivePage} of ${totalPages}`}
            </span>
          </li>
          {!compact &&
            api.pages.map((paginationPage, index) => {
              if (paginationPage.type === "page") {
                return (
                  <li className={numberedItemClass} key={paginationPage.value}>
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
                  className={numberedItemClass}
                  key={`ellipsis-${previousPageValue}-${nextPageValue}`}
                >
                  <span
                    aria-hidden="true"
                    className={ellipsis()}
                    {...api.getEllipsisProps({ index })}
                  >
                    <Icon
                      icon="token-icon-pagination-ellipsis"
                      size="current"
                    />
                  </span>
                </li>
              )
            })}

          {showPrevNext && (
            <li className={item()}>
              <LinkButton
                {...getTriggerButtonProps(
                  nextTriggerProps,
                  {
                    icon:
                      dir === "rtl"
                        ? "token-icon-pagination-prev"
                        : "token-icon-pagination-next",
                  },
                  effectivePage + 1
                )}
              />
            </li>
          )}
        </ul>
      )}
    </nav>
  )
}
