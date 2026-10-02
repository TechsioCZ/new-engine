/**
 * PriceBlock — @techsio/ui-kit molecule.
 *
 * @component PriceBlock
 * @componentVersion v1.0.0
 * @skill price-block-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the price-block-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, Ref } from "react"
import { Badge } from "../atoms/badge"
import { Skeleton } from "../atoms/skeleton"
import { tv } from "../utils"

const priceBlockVariants = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-price-block",
    primaryRow: "flex min-w-0 flex-wrap items-baseline gap-price-block-primary",
    prefix:
      "break-words text-price-block-prefix-fg text-price-block-prefix-size",
    amount:
      "break-words font-price-block-amount text-price-block-amount-fg text-price-block-amount-size",
    original:
      "break-words text-price-block-original-fg text-price-block-original-size",
    metadata:
      "flex min-w-0 flex-wrap items-center gap-price-block-metadata text-price-block-metadata-fg text-price-block-metadata-size",
    separator: "text-price-block-separator-fg",
    detail:
      "break-words text-price-block-detail-fg text-price-block-detail-size",
    pending: "w-price-block-pending max-w-full gap-price-block-pending",
    pendingLine: "h-price-block-pending-line",
  },
})

type PriceBlockNativeProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  ref?: Ref<HTMLDivElement>
}

type KnownPriceProps = {
  state: "known"
  amountLabel: string
  taxLabel?: string
  unitLabel?: string
  prefix?: never
  originalLabel?: never
  discountLabel?: never
  label?: never
  detail?: never
  pendingLabel?: never
}

type FromPriceProps = {
  state: "from"
  prefix: string
  amountLabel: string
  taxLabel?: string
  unitLabel?: string
  originalLabel?: never
  discountLabel?: never
  label?: never
  detail?: never
  pendingLabel?: never
}

type DiscountedPriceProps = {
  state: "discounted"
  amountLabel: string
  originalLabel: string
  discountLabel?: string
  taxLabel?: string
  unitLabel?: string
  prefix?: never
  label?: never
  detail?: never
  pendingLabel?: never
}

type OnRequestPriceProps = {
  state: "on-request"
  label: string
  detail?: string
  amountLabel?: never
  originalLabel?: never
  discountLabel?: never
  taxLabel?: never
  unitLabel?: never
  prefix?: never
  pendingLabel?: never
}

type PendingPriceProps = {
  state: "pending"
  pendingLabel: string
  amountLabel?: never
  originalLabel?: never
  discountLabel?: never
  taxLabel?: never
  unitLabel?: never
  prefix?: never
  label?: never
  detail?: never
}

export type PriceBlockProps = PriceBlockNativeProps &
  (
    | KnownPriceProps
    | FromPriceProps
    | DiscountedPriceProps
    | OnRequestPriceProps
    | PendingPriceProps
  )

function PriceMetadata({
  taxLabel,
  unitLabel,
}: Pick<KnownPriceProps, "taxLabel" | "unitLabel">) {
  const styles = priceBlockVariants()

  if (!(taxLabel || unitLabel)) {
    return null
  }

  return (
    <div className={styles.metadata()}>
      {taxLabel ? <span>{taxLabel}</span> : null}
      {taxLabel && unitLabel ? (
        <span aria-hidden="true" className={styles.separator()}>
          ·
        </span>
      ) : null}
      {unitLabel ? <span>{unitLabel}</span> : null}
    </div>
  )
}

export function PriceBlock({
  state,
  amountLabel,
  originalLabel,
  discountLabel,
  taxLabel,
  unitLabel,
  prefix,
  label,
  detail,
  pendingLabel,
  className,
  ref,
  ...props
}: PriceBlockProps) {
  const styles = priceBlockVariants()

  return (
    <div
      className={styles.root({ className })}
      {...props}
      data-state={state}
      ref={ref}
    >
      {state === "pending" ? (
        <Skeleton.Text
          aria-label={pendingLabel}
          className={styles.pendingLine()}
          containerClassName={styles.pending()}
          isLoaded={false}
          noOfLines={2}
          size="sm"
        />
      ) : null}

      {state === "on-request" ? (
        <>
          <div className={styles.primaryRow()}>
            <span className={styles.amount()}>{label}</span>
          </div>
          {detail ? <span className={styles.detail()}>{detail}</span> : null}
        </>
      ) : null}

      {state === "known" || state === "from" || state === "discounted" ? (
        <>
          <div className={styles.primaryRow()}>
            {state === "from" ? (
              <span className={styles.prefix()}>{prefix}</span>
            ) : null}
            <span className={styles.amount()}>{amountLabel}</span>
            {state === "discounted" ? (
              <del className={styles.original()}>{originalLabel}</del>
            ) : null}
            {state === "discounted" && discountLabel ? (
              <Badge size="sm" variant="discount">
                {discountLabel}
              </Badge>
            ) : null}
          </div>
          <PriceMetadata taxLabel={taxLabel} unitLabel={unitLabel} />
        </>
      ) : null}
    </div>
  )
}
