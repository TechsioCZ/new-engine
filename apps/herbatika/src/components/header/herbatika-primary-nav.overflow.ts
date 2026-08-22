export type PrimaryNavOverflowInput = {
  availableWidth: number
  gap: number
  itemWidths: number[]
  triggerWidth: number
}

/**
 * Sub-pixel layout rounding must not push a nav item into the overflow menu.
 */
const MEASUREMENT_TOLERANCE = 0.5

const sumRowWidth = (widths: number[], gap: number) =>
  widths.reduce(
    (total, width, index) => total + width + (index === 0 ? 0 : gap),
    0
  )

/**
 * Priority+ navigation: how many leading items still fit on one line once the
 * overflow trigger has to be shown next to them.
 */
export const resolvePrimaryNavVisibleCount = ({
  availableWidth,
  gap,
  itemWidths,
  triggerWidth,
}: PrimaryNavOverflowInput) => {
  if (itemWidths.length === 0) {
    return 0
  }

  if (availableWidth <= 0) {
    return 0
  }

  if (sumRowWidth(itemWidths, gap) <= availableWidth + MEASUREMENT_TOLERANCE) {
    return itemWidths.length
  }

  const budget = availableWidth - triggerWidth - gap
  let usedWidth = 0
  let visibleCount = 0

  for (const width of itemWidths) {
    const nextUsedWidth = usedWidth + (visibleCount === 0 ? 0 : gap) + width

    if (nextUsedWidth > budget + MEASUREMENT_TOLERANCE) {
      break
    }

    usedWidth = nextUsedWidth
    visibleCount += 1
  }

  return visibleCount
}
