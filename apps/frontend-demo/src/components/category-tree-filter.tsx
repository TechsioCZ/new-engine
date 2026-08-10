"use client"
import { TreeView } from "@techsio/ui-kit/molecules/tree-view"
import type { TreeNode } from "@techsio/ui-kit/molecules/tree-view"
import { useState } from "react"

import { useAccordionTree } from "@/hooks/use-accordion-tree"
import { useCategoryPrefetch } from "@/hooks/use-category-prefetch"
import type { CategoryTreeNode } from "@/lib/server/categories"
import type { LeafCategory, LeafParent } from "@/lib/static-data/categories"
import {
  findNodeById,
  getLeafIdsForCategory,
  isSelectableCategory,
} from "@/utils/category-tree-helpers"

const transformTreeForSelection = (
  nodes: CategoryTreeNode[],
  leafCategoryIds: Set<string>,
  leafParentIds: Set<string>,
): TreeNode[] =>
  nodes.map((node) => ({
    children:
      node.children === undefined
        ? undefined
        : transformTreeForSelection(
            node.children,
            leafCategoryIds,
            leafParentIds,
          ),
    id: node.id,
    name: node.name,
    selectable: isSelectableCategory(node.id, leafCategoryIds, leafParentIds),
  }))

interface CategoryFilterProps {
  categories: CategoryTreeNode[]
  leafCategories: LeafCategory[]
  leafParents: LeafParent[]
  onSelectionChange: (categoryIds: string[]) => void
  label?: string
}

export const CategoryTreeFilter = ({
  categories,
  leafCategories,
  leafParents,
  onSelectionChange,
  label,
}: CategoryFilterProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const { expandedNodes, handleAccordionExpansion } =
    useAccordionTree(categories)
  const { delayedPrefetch, prefetchCategoryProducts } = useCategoryPrefetch()
  // Create indexed collections for repeated tree lookups.
  const leafCategoryIds = new Set(leafCategories.map((category) => category.id))
  const leafParentIds = new Set(leafParents.map((category) => category.id))
  const leafParentsById = new Map(
    leafParents.map((category) => [category.id, category]),
  )
  const treeData = transformTreeForSelection(
    categories,
    leafCategoryIds,
    leafParentIds,
  )

  const handleSelectionChange = (details: { selectedValue: string[] }) => {
    const [selectedCategoryId] = details.selectedValue

    if (selectedCategoryId !== undefined) {
      setSelectedCategory(selectedCategoryId)
      const leafIds = getLeafIdsForCategory(
        selectedCategoryId,
        leafCategoryIds,
        leafParentIds,
        leafParents,
      )
      onSelectionChange(leafIds)
    }
  }

  const prefetchSelectableChildren = async (leafIds: string[]) => {
    try {
      await prefetchCategoryProducts(leafIds)
    } catch (error: unknown) {
      console.error("Failed to prefetch category products", error)
    }
  }

  const prefetchLeafParentChildren = (parent: LeafParent) => {
    for (const childId of parent.children) {
      if (leafCategoryIds.has(childId)) {
        delayedPrefetch([childId], 800, `leaf_${childId}`)
      } else {
        const childParentLeaf = leafParentsById.get(childId)
        if (
          childParentLeaf !== undefined &&
          childParentLeaf.children.length > 0
        ) {
          delayedPrefetch(
            childParentLeaf.children,
            800,
            `parent_leaf_${childId}`,
          )
        }
      }
    }
  }

  const prefetchStandardCategory = (nodeId: string) => {
    const expandedNode = findNodeById(categories, nodeId)
    const selectableLeafIds =
      expandedNode?.children?.flatMap(
        (child) => leafParentsById.get(child.id)?.leafs ?? [],
      ) ?? []
    if (selectableLeafIds.length > 0) {
      void prefetchSelectableChildren(selectableLeafIds)
    }
  }

  const handleExpandedChange = (details: { expandedValue: string[] }) => {
    const finalExpanded = handleAccordionExpansion(details)
    const expandedNodeIds = new Set(expandedNodes)
    const newlyExpanded = finalExpanded.filter(
      (nodeId) => !expandedNodeIds.has(nodeId),
    )

    for (const nodeId of newlyExpanded) {
      if (leafCategoryIds.has(nodeId)) {
        continue
      }

      const expandedParentLeaf = leafParentsById.get(nodeId)
      if (expandedParentLeaf === undefined) {
        prefetchStandardCategory(nodeId)
      } else {
        prefetchLeafParentChildren(expandedParentLeaf)
      }
    }
  }

  return (
    <TreeView
      data={treeData}
      expandedValue={expandedNodes}
      expandOnClick={true}
      id="category-filter-v2"
      onExpandedChange={handleExpandedChange}
      onSelectionChange={handleSelectionChange}
      selectedValue={selectedCategory === "" ? [] : [selectedCategory]}
      selectionBehavior="custom"
      selectionMode="single"
    >
      {label !== undefined && <TreeView.Label>{label}</TreeView.Label>}
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
