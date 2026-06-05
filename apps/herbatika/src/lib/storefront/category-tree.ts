import type { HttpTypes } from "@medusajs/types";

export const collectDescendantCategoryIds = (
  categories: HttpTypes.StoreProductCategory[],
  rootCategoryId: string,
): string[] => {
  const childrenByParentId = new Map<string, string[]>();

  for (const category of categories) {
    if (!category.parent_category_id) {
      continue;
    }

    const siblings = childrenByParentId.get(category.parent_category_id) ?? [];
    siblings.push(category.id);
    childrenByParentId.set(category.parent_category_id, siblings);
  }

  const stack: string[] = [rootCategoryId];
  const visited = new Set<string>([rootCategoryId]);
  const descendants: string[] = [];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) {
      continue;
    }

    const childIds = childrenByParentId.get(currentId) ?? [];
    for (const childId of childIds) {
      if (visited.has(childId)) {
        continue;
      }

      visited.add(childId);
      descendants.push(childId);
      stack.push(childId);
    }
  }

  return descendants;
};

export const resolveRelatedCategoryIds = (
  product: HttpTypes.StoreProduct | null,
): string[] => {
  const productCategories = product?.categories ?? [];
  if (productCategories.length === 0) {
    return [];
  }

  const parentCategoryIds = new Set<string>();
  const allCategoryIds = new Set<string>();

  for (const category of productCategories) {
    if (category.id) {
      allCategoryIds.add(category.id);
    }

    if (category.parent_category_id) {
      parentCategoryIds.add(category.parent_category_id);
    }
  }

  const leafCategoryIds = Array.from(allCategoryIds).filter(
    (categoryId) => !parentCategoryIds.has(categoryId),
  );

  return (leafCategoryIds.length > 0 ? leafCategoryIds : Array.from(allCategoryIds)).slice(
    0,
    3,
  );
};
