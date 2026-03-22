"use client"
import { type TreeNode, TreeView } from "@techsio/ui-kit/molecules/tree-view"
import { useCallback, useMemo, useState } from "react"
import { useAccordionTree } from "@/hooks/use-accordion-tree"
import { useCategoryPrefetch } from "@/hooks/use-category-prefetch"
import type {
  CategoryTreeNode,
  LeafCategory,
  LeafParent,
} from "@/lib/categories/types"
import {
  findNodeById,
  getLeafIdsForCategory,
  isSelectableCategory,
} from "@/utils/category-tree-helpers"

type CategoryFilterProps = {
  categories: CategoryTreeNode[]
  leafCategories: LeafCategory[]
  leafParents: LeafParent[]
  onSelectionChange: (categoryIds: string[]) => void
  label?: string
}

type DelayedPrefetch = (
  categoryIds: string[],
  delay?: number,
  prefetchId?: string
) => string

const queueLeafParentPrefetch = ({
  delayedPrefetch,
  expandedParentLeaf,
  leafCategoryIds,
  leafParentIds,
  leafParents,
}: {
  delayedPrefetch: DelayedPrefetch
  expandedParentLeaf: LeafParent
  leafCategoryIds: Set<string>
  leafParentIds: Set<string>
  leafParents: LeafParent[]
}) => {
  for (const childId of expandedParentLeaf.children || []) {
    if (leafCategoryIds.has(childId)) {
      delayedPrefetch([childId], 800, `leaf_${childId}`)
      continue
    }

    if (!leafParentIds.has(childId)) {
      continue
    }

    const childParentLeaf = leafParents.find((parent) => parent.id === childId)
    const children = childParentLeaf?.children ?? []

    if (children.length > 0) {
      delayedPrefetch(children, 800, `parent_leaf_${childId}`)
    }
  }
}

const queueStandardCategoryPrefetch = ({
  categories,
  delayedPrefetch,
  leafParentIds,
  leafParents,
  nodeId,
}: {
  categories: CategoryTreeNode[]
  delayedPrefetch: DelayedPrefetch
  leafParentIds: Set<string>
  leafParents: LeafParent[]
  nodeId: string
}) => {
  const expandedNode = findNodeById(categories, nodeId)
  if (!expandedNode?.children) {
    return
  }

  for (const child of expandedNode.children) {
    if (!leafParentIds.has(child.id)) {
      continue
    }

    const childParentLeaf = leafParents.find((parent) => parent.id === child.id)
    if (childParentLeaf) {
      delayedPrefetch(childParentLeaf.leafs, 0, `parent_leaf_${child.id}`)
    }
  }
}

export function CategoryTreeFilter({
  categories,
  leafCategories,
  leafParents,
  onSelectionChange,
  label,
}: CategoryFilterProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const { expandedNodes, handleAccordionExpansion } =
    useAccordionTree(categories)
  const { delayedPrefetch } = useCategoryPrefetch()
  // Create Sets for quick lookup
  const leafCategoryIds = useMemo(
    () => new Set(leafCategories.map((cat) => cat.id)),
    [leafCategories]
  )
  const leafParentIds = useMemo(
    () => new Set(leafParents.map((cat) => cat.id)),
    [leafParents]
  )

  // Transform static category data for TreeView
  const treeData = useMemo(() => {
    const transformTreeForSelection = (nodes: CategoryTreeNode[]): TreeNode[] =>
      nodes.map((node) => ({
        id: node.id,
        name: node.name,
        children: node.children
          ? transformTreeForSelection(node.children)
          : undefined,
        selectable: isSelectableCategory(
          node.id,
          leafCategoryIds,
          leafParentIds
        ),
      }))
    return transformTreeForSelection(categories)
  }, [categories, leafCategoryIds, leafParentIds])

  const handleSelectionChange = (details: { selectedValue: string[] }) => {
    const selectedCategoryId = details.selectedValue?.[0]

    if (selectedCategoryId) {
      setSelectedCategory(selectedCategoryId)

      const leafIds = getLeafIdsForCategory(
        selectedCategoryId,
        leafCategoryIds,
        leafParentIds,
        leafParents
      )
      onSelectionChange(leafIds)
    }
  }

  // Handle expanded change events from TreeView
  const handleExpandedChange = useCallback(
    (details: { expandedValue: string[] }) => {
      const finalExpanded = handleAccordionExpansion(details)
      const newlyExpanded = finalExpanded.filter(
        (nodeId: string) => !expandedNodes.includes(nodeId)
      )

      for (const nodeId of newlyExpanded) {
        if (leafCategoryIds.has(nodeId)) {
          continue
        }

        if (leafParentIds.has(nodeId)) {
          const expandedParentLeaf = leafParents.find((p) => p.id === nodeId)
          if (!expandedParentLeaf) {
            continue
          }

          queueLeafParentPrefetch({
            delayedPrefetch,
            expandedParentLeaf,
            leafCategoryIds,
            leafParentIds,
            leafParents,
          })
          continue
        }

        queueStandardCategoryPrefetch({
          categories,
          delayedPrefetch,
          leafParentIds,
          leafParents,
          nodeId,
        })
      }
    },
    [
      expandedNodes,
      handleAccordionExpansion,
      leafParents,
      leafCategoryIds,
      leafParentIds,
      categories,
      delayedPrefetch,
    ]
  )

  return (
    <TreeView
      data={treeData}
      expandedValue={expandedNodes}
      expandOnClick={true}
      id="category-filter-v2"
      onExpandedChange={handleExpandedChange}
      onSelectionChange={handleSelectionChange}
      selectedValue={selectedCategory ? [selectedCategory] : []}
      selectionBehavior="custom"
      selectionMode="single"
    >
      {label && <TreeView.Label>{label}</TreeView.Label>}
      <TreeView.Tree>
        {treeData.map((node, index) => (
          <TreeView.Node
            indexPath={[index]}
            key={node.id}
            node={node}
            showIndentGuides={false}
            showNodeIcons={false}
          />
        ))}
      </TreeView.Tree>
    </TreeView>
  )
}

CategoryTreeFilter.displayName = "CategoryTreeFilter"
