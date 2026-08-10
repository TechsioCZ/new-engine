import type { TreeNode } from "@techsio/ui-kit/molecules/tree-view"

import type { CategoryTreeNode } from "@/data/static/type"

export type N1TreeNode = TreeNode & {
  handle: string
  children: N1TreeNode[]
}

export const transformToTree = (nodes: CategoryTreeNode[]): N1TreeNode[] =>
  nodes.map((node) => ({
    children: node.children ? transformToTree(node.children) : [],
    handle: node.handle,
    id: node.id,
    name: node.name,
  }))
