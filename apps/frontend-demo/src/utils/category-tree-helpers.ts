import type { CategoryTreeNode } from "@/lib/server/categories"
import type { LeafParent } from "@/lib/static-data/categories"

/**
 * Find a node by ID in the category tree
 */
export function findNodeById(
  nodes: CategoryTreeNode[],
  targetId: string
): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node
    }
    if (node.children) {
      const found = findNodeById(node.children, targetId)
      if (found) {
        return found
      }
    }
  }
  return null
}

export const isSelectableCategory = (
  id: string,
  leafIds: Set<string>,
  parentIds: Set<string>
) => leafIds.has(id) || parentIds.has(id)

export const getLeafIdsForCategory = (
  categoryId: string,
  leafIds: Set<string>,
  parentIds: Set<string>,
  leafParents: LeafParent[]
): string[] => {
  if (leafIds.has(categoryId)) {
    return [categoryId]
  }
  if (parentIds.has(categoryId)) {
    const parent = leafParents.find((p) => p.id === categoryId)
    return parent?.leafs || []
  }
  return []
}

/**
 * Check if a node is at the top level (depth 1) in the category tree
 */
export function isTopLevelNode(
  nodeId: string,
  categories: CategoryTreeNode[]
): boolean {
  const isTopLevel = categories.some((topNode) => topNode.id === nodeId)
  return isTopLevel
}

/**
 * Check if a node is a child (at any depth) of a parent node
 */
export function isChildOf(
  nodeId: string,
  parentNodeId: string,
  categories: CategoryTreeNode[]
): boolean {
  const parentNode = findNodeById(categories, parentNodeId)
  if (!parentNode) {
    return false
  }

  function searchInChildren(children: CategoryTreeNode[]): boolean {
    for (const child of children) {
      if (child.id === nodeId) {
        return true
      }
      if (child.children && searchInChildren(child.children)) {
        return true
      }
    }
    return false
  }

  return parentNode.children ? searchInChildren(parentNode.children) : false
}
