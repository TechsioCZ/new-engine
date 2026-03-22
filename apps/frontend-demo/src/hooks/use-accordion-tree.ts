import { useCallback, useState } from "react"
import type { CategoryTreeNode } from "@/lib/categories/types"
import { isChildOf, isTopLevelNode } from "@/utils/category-tree-helpers"

export function useAccordionTree<T extends CategoryTreeNode>(
  categories: T[],
  initialExpanded: string[] = []
) {
  const [expandedNodes, setExpandedNodes] = useState<string[]>(initialExpanded)

  const handleAccordionExpansion = useCallback(
    (details: { expandedValue: string[] }) => {
      const newExpandedNodes = details.expandedValue || []

      const currentTopLevel = expandedNodes.filter((nodeId) =>
        isTopLevelNode(nodeId, categories)
      )
      const newTopLevel = newExpandedNodes.filter((nodeId) =>
        isTopLevelNode(nodeId, categories)
      )

      if (newTopLevel.length > currentTopLevel.length) {
        const latestTopLevel = newTopLevel.find(
          (id) => !currentTopLevel.includes(id)
        )

        if (latestTopLevel) {
          const filteredExpanded = newExpandedNodes.filter(
            (nodeId) =>
              nodeId === latestTopLevel ||
              isChildOf(nodeId, latestTopLevel, categories)
          )
          setExpandedNodes(filteredExpanded)
          return filteredExpanded
        }
      }
      setExpandedNodes(newExpandedNodes)
      return newExpandedNodes
    },
    [expandedNodes, categories]
  )

  return { expandedNodes, handleAccordionExpansion }
}
