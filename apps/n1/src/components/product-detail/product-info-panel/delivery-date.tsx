import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"
import Link from "next/link"

import { addDays, formatDateShort, formatDay } from "@/utils/format/format-date"

export const DeliveryDate = () => {
  const deliveryDate = addDays(3)

  const tooltipContent = (
    <article>
      <Link className="font-bold underline" href="/doprava-a-platba">
        PPL Doručení do výdejních míst
      </Link>
      <p>
        Vyzvedněte si zásilku, kde je vám to blízké, v PPL Parcelboxu nebo PPL
        Parcelshopu.
      </p>
    </article>
  )
  return (
    <div className="flex items-center gap-150">
      <Tooltip
        className="max-w-2xs bg-secondary text-fg-reverse [--arrow-background:var(--color-secondary)]"
        content={tooltipContent}
        placement="bottom-start"
      >
        <span className="cursor-help border-2 border-success border-t-5 px-150 font-bold text-fg-secondary text-xl">
          {formatDay(deliveryDate)}
        </span>
      </Tooltip>
      <div className="flex flex-col text-2xs text-fg-secondary">
        <span>Doručení do</span>
        <span>{formatDateShort(deliveryDate)}</span>
      </div>
    </div>
  )
}
