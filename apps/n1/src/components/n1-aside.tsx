"use client"
import { TreeView } from "@techsio/ui-kit/molecules/tree-view"
import type { TreeView as TreeType } from "@techsio/ui-kit/types/zag"
import { useRouter } from "next/navigation"

import type { Category, CategoryTreeNode } from "@/data/static/type"
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover"
import { findNodeById } from "@/utils/transform/find-node-by-id"
import { getCategoryPath } from "@/utils/transform/get-category-path"
import { transformToTree } from "@/utils/transform/transform-to-tree"

interface N1AsideProps {
  categories: CategoryTreeNode[]
  categoryMap: Record<string, Category>
  label?: string | undefined
  currentCategory?: Category | undefined
}

export const N1Aside = ({
  categories,
  categoryMap,
  label,
  currentCategory,
}: N1AsideProps) => {
  const router = useRouter()
  const treeData = transformToTree(categories)

  const { handleHover, cancelHover } = usePrefetchOnHover()

  const expandedPath = getCategoryPath(currentCategory, categoryMap)

  const handleSelect = (details: TreeType.SelectionChangeDetails) => {
    const { focusedValue } = details
    if (typeof focusedValue === "string" && focusedValue.length > 0) {
      const node = findNodeById(treeData, focusedValue)
      if (node) {
        router.push(`/kategorie/${node.handle}`)
      }
    }
  }

  const prefetchOnHover = (handle: string) => {
    handleHover(handle)
  }

  return (
    <aside>
      <TreeView
        className="w-3xs border-t-2 border-t-overlay p-200"
        data={treeData}
        defaultExpandedValue={expandedPath}
        onSelectionChange={handleSelect}
        selectionMode="single"
      >
        <TreeView.Label className="capitalize">{label}</TreeView.Label>
        <TreeView.Tree>
          {treeData?.map((node, index) => (
            <TreeView.Node
              indexPath={[index]}
              key={node.id}
              node={node}
              onNodeHover={(hoveredNode) => {
                const { handle: hoveredHandle } = hoveredNode
                if (typeof hoveredHandle === "string") {
                  prefetchOnHover(hoveredHandle)
                }
              }}
              onNodeLeave={() => {
                cancelHover()
              }}
              showNodeIcons={false}
            />
          ))}
        </TreeView.Tree>
      </TreeView>
    </aside>
  )
}
