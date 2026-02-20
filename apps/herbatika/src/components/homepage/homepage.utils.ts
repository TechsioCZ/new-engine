import type { HttpTypes } from "@medusajs/types";

export const getSectionProducts = (
  products: HttpTypes.StoreProduct[],
  start: number,
  size: number,
): HttpTypes.StoreProduct[] => {
  if (products.length === 0) {
    return [];
  }

  const chunk = products.slice(start, start + size);
  if (chunk.length === size) {
    return chunk;
  }

  const fallback = products.slice(0, Math.max(size - chunk.length, 0));
  return [...chunk, ...fallback];
};
