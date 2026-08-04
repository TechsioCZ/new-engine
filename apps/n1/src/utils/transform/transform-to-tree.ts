import type { TreeNode } from "@techsio/ui-kit/molecules/tree-view"

import type { CategoryTreeNode } from "@/data/static/type"

export const transformToTree = (nodes: CategoryTreeNode[]): TreeNode[] =>
  nodes.map((node) => ({
    id: node.id,
    name: node.name,
    handle: node.handle,
    children: node.children ? transformToTree(node.children) : [],
  }))
