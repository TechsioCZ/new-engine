export const toggleSelection = (currentItems: string[], itemId: string) => {
  if (currentItems.includes(itemId)) {
    return currentItems.filter((existingId) => existingId !== itemId);
  }

  return [...currentItems, itemId];
};
