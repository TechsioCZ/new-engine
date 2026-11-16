/**
 * Bound captures below browser bitmap limits without dropping any story content.
 * Coordinates are in document CSS pixels (screenshots use scale: "css"). Normal
 * stories retain locator screenshots; oversized roots become contiguous tiles.
 * The first tile keeps the primary baseline identity required by completion.
 * @param {{x: number, y: number, width: number, height: number}} bounds
 */
export function visualCaptureTiles(bounds) {
  const limit = 16_000
  const { x, y, width, height } = bounds
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(`Invalid visual capture bounds: ${JSON.stringify(bounds)}`)
  }
  if (width <= limit && height <= limit) {
    return []
  }
  const left = Math.floor(x)
  const top = Math.floor(y)
  const right = Math.ceil(x + width)
  const bottom = Math.ceil(y + height)
  const tiles = []
  for (let tileY = top, row = 1; tileY < bottom; tileY += limit, row += 1) {
    for (
      let tileX = left, column = 1;
      tileX < right;
      tileX += limit, column += 1
    ) {
      tiles.push({
        suffix: row === 1 && column === 1 ? "" : `--tile-${row}-${column}`,
        clip: {
          x: tileX,
          y: tileY,
          width: Math.min(limit, right - tileX),
          height: Math.min(limit, bottom - tileY),
        },
      })
    }
  }
  return tiles
}
