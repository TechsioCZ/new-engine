import { useState } from "react"

import type { CategoryTreeNode } from "@/lib/server/categories"
import { isChildOf, isTopLevelNode } from "@/utils/category-tree-helpers"

export const useAccordionTree = (
  categories: CategoryTreeNode[],
  initialExpanded: string[] = [],
) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>(initialExpanded)

  const handleAccordionExpansion = (details: { expandedValue: string[] }) => {
    const newExpandedNodes = details.expandedValue

    const currentTopLevel = expandedNodes.filter((nodeId) =>
      isTopLevelNode(nodeId, categories),
    )
    const newTopLevel = newExpandedNodes.filter((nodeId) =>
      isTopLevelNode(nodeId, categories),
    )

    if (newTopLevel.length > currentTopLevel.length) {
      const currentTopLevelIds = new Set(currentTopLevel)
      const latestTopLevel = newTopLevel.find(
        (id) => !currentTopLevelIds.has(id),
      )

      if (latestTopLevel !== undefined && latestTopLevel.length > 0) {
        const filteredExpanded = newExpandedNodes.filter(
          (nodeId) =>
            nodeId === latestTopLevel ||
            isChildOf(nodeId, latestTopLevel, categories),
        )
        setExpandedNodes(filteredExpanded)
        return filteredExpanded
      }
    }
    setExpandedNodes(newExpandedNodes)
    return newExpandedNodes
  }

  return { expandedNodes, handleAccordionExpansion }
}
