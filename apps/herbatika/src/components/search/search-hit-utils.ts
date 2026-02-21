"use client";

import type { StorefrontSearchHit } from "@/lib/storefront/meili-search";

export const resolveSortedUniqueSearchHitHandles = (
  searchHits: StorefrontSearchHit[],
) => {
  const handles = new Set<string>();

  for (const searchHit of searchHits) {
    const normalizedHandle = searchHit.handle.trim();
    if (!normalizedHandle) {
      continue;
    }

    handles.add(normalizedHandle);
  }

  return Array.from(handles).sort((left, right) => left.localeCompare(right));
};
