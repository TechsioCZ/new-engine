import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"

import NextLink from "@/components/app-link"

export const summaryCardClassName =
  "rounded-sm border border-border-primary bg-surface space-y-300 p-300 sm:px-350"
export const summaryEditLinkClassName =
  "gap-100 px-0 font-semibold text-fg-primary underline underline-offset-2 hover:text-primary"

export function CheckoutSummaryRecapCard({
  href,
  icon,
  label,
  tone = "default",
}: {
  href: string
  icon: IconType
  label: string
  tone?: "default" | "warning"
}) {
  return (
    <div className={summaryCardClassName}>
      <div className="flex items-center justify-between gap-200">
        <div className="flex min-w-0 items-center gap-450">
          <span className="flex h-600 w-600 shrink-0 items-center justify-center text-fg-primary">
            <Icon icon={icon} size="lg" />
          </span>
          <p
            className={
              tone === "warning"
                ? "font-medium text-sm text-warning"
                : "font-medium text-fg-primary text-sm"
            }
          >
            {label}
          </p>
        </div>
        <LinkButton
          as={NextLink}
          className={summaryEditLinkClassName}
          href={href}
          icon="token-icon-pen"
          iconSize="lg"
          size="sm"
          theme="unstyled"
        >
          Upraviť
        </LinkButton>
      </div>
    </div>
  )
}
