export const PRODUCT_QUERY_CHUNK_SIZE = 100

export function chunkProductIds(productIds: string[]) {
  const chunks: string[][] = []

  for (
    let index = 0;
    index < productIds.length;
    index += PRODUCT_QUERY_CHUNK_SIZE
  ) {
    chunks.push(productIds.slice(index, index + PRODUCT_QUERY_CHUNK_SIZE))
  }

  return chunks
}
