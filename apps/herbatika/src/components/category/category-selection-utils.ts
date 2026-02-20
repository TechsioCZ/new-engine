import type { CatalogFacetItem } from "@techsio/storefront-data";

export type CategoryFacetChipItem = {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  disabled: boolean;
};

export const toggleSelection = (currentItems: string[], itemId: string) => {
  if (currentItems.includes(itemId)) {
    return currentItems.filter((existingId) => existingId !== itemId);
  }

  return [...currentItems, itemId];
};

export const buildFacetChipItems = (
  currentFacetItems: CatalogFacetItem[],
  seedFacetItems: CatalogFacetItem[],
  selectedIds: string[],
): CategoryFacetChipItem[] => {
  const countById = new Map(currentFacetItems.map((item) => [item.id, item.count]));
  const labelById = new Map<string, string>();
  const orderedIds: string[] = [];
  const seenIds = new Set<string>();

  const pushOrderedId = (id: string) => {
    if (seenIds.has(id)) {
      return;
    }

    seenIds.add(id);
    orderedIds.push(id);
  };

  for (const item of seedFacetItems) {
    labelById.set(item.id, item.label);
    pushOrderedId(item.id);
  }

  for (const item of currentFacetItems) {
    labelById.set(item.id, item.label);
    pushOrderedId(item.id);
  }

  for (const selectedId of selectedIds) {
    if (!labelById.has(selectedId)) {
      labelById.set(selectedId, selectedId);
    }

    pushOrderedId(selectedId);
  }

  const selectedIdSet = new Set(selectedIds);

  return orderedIds.map((id) => {
    const label = labelById.get(id) ?? id;
    const count = countById.get(id) ?? 0;
    const checked = selectedIdSet.has(id);

    return {
      id,
      label,
      count,
      checked,
      disabled: count === 0 && !checked,
    };
  });
};
