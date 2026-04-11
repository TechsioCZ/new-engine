import * as pagination from "@zag-js/pagination"
import { normalizeProps, useMachine } from "@zag-js/react"
import { type ElementType, type HTMLAttributes, useId } from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import { LinkButton } from "../atoms/link-button"
import { tv } from "../utils"

const paginationVariants = tv({
  slots: {
    base: "",
    list: ["inline-flex items-center gap-pagination-list"],
    item: [
      "grid cursor-pointer",
      // If item is ellipsis => bg-transparent
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

type PaginationBaseProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof paginationVariants> & {
    page?: number
    defaultPage?: number
    count: number
    pageSize?: number
    siblingCount?: number
    boundaryCount?: number
    showPrevNext?: boolean
    onPageChange?: (page: number) => void
    dir?: "ltr" | "rtl"
    compact?: boolean
    translations?: pagination.IntlTranslations
  }

type PaginationModeProps =
  | {
      type?: "button"
      getPageUrl?: never
      linkAs?: never
    }
  | {
      type: "link"
      getPageUrl: (details: pagination.PageUrlDetails) => string
      linkAs?: ElementType
    }

export type PaginationProps = PaginationBaseProps & PaginationModeProps

export function Pagination({
  page,
  defaultPage = 1,
  count,
  pageSize = 10,
  siblingCount = 1,
  boundaryCount = 1,
  showPrevNext = true,
  onPageChange,
  variant,
  className,
  dir = "ltr",
  type = "button",
  getPageUrl,
  linkAs,
  size,
  compact = false,
  translations,
  ...props
}: PaginationProps) {
  const uniqueId = useId()

  const service = useMachine(pagination.machine, {
    id: uniqueId,
    count,
    pageSize,
    siblingCount,
    boundaryCount,
    page,
    dir,
    defaultPage,
    type,
    getPageUrl,
    translations,
    onPageChange: ({ page }) => {
      onPageChange?.(page)
    },
  })

  const api = pagination.connect(service, normalizeProps)
  const { base, list, link, item, ellipsis, compactText } = paginationVariants({
    variant,
    size,
  })

  return (
    <nav className={base({ className })} {...api.getRootProps()} {...props}>
      <ul className={list()}>
        {showPrevNext && (
          <li className={item()}>
            {type === "link" ? (
              <LinkButton
                as={linkAs}
                className={link()}
                disabled={api.page === 1}
                icon="token-icon-pagination-prev"
                size="current"
                theme="borderless"
                {...api.getPrevTriggerProps()}
              />
            ) : (
              <Button
                className={link()}
                icon="token-icon-pagination-prev"
                size="current"
                theme="borderless"
                {...api.getPrevTriggerProps()}
              />
            )}
          </li>
        )}
        {compact ? (
          <li className={item()}>
            <span className={compactText()} data-part="compact-text">
              {api.page} of {api.totalPages}
            </span>
          </li>
        ) : (
          api.pages.map((page, i) => {
            if (page.type === "page") {
              return (
                <li className={item()} key={page.value}>
                  {type === "link" ? (
                    <LinkButton
                      as={linkAs}
                      className={link()}
                      size="current"
                      theme="borderless"
                      {...api.getItemProps(page)}
                    >
                      {page.value}
                    </LinkButton>
                  ) : (
                    <Button
                      className={link()}
                      size="current"
                      theme="borderless"
                      {...api.getItemProps(page)}
                    >
                      {page.value}
                    </Button>
                  )}
                </li>
              )
            }
            return (
              <li className={item()} key={`ellipsis-${i}`}>
                <span
                  aria-hidden="true"
                  className={ellipsis()}
                  {...api.getEllipsisProps({ index: i })}
                >
                  <Icon icon="token-icon-pagination-ellipsis" size="current" />
                </span>
              </li>
            )
          })
        )}

        {showPrevNext && (
          <li className={item()}>
            {type === "link" ? (
              <LinkButton
                as={linkAs}
                className={link()}
                disabled={api.page === api.totalPages}
                icon="token-icon-pagination-next"
                size="current"
                theme="borderless"
                {...api.getNextTriggerProps()}
              />
            ) : (
              <Button
                className={link()}
                icon="token-icon-pagination-next"
                size="current"
                theme="borderless"
                {...api.getNextTriggerProps()}
              />
            )}
          </li>
        )}
      </ul>
    </nav>
  )
}
