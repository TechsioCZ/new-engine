"use client"
import { TreeView } from "@techsio/ui-kit/molecules/tree-view"
import type { TreeView as TreeType } from "@techsio/ui-kit/types/zag"
import { useRouter } from "next/navigation"
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover"
import type { Category, CategoryTreeNode } from "@/lib/categories/types"
import { findNodeById } from "@/utils/transform/find-node-by-id"
import { getCategoryPath } from "@/utils/transform/get-category-path"
import { transformToTree } from "@/utils/transform/transform-to-tree"

type N1AsideProps = {
  categories: CategoryTreeNode[]
  categoryMap: Record<string, Category>
  label?: string
  currentCategory?: Category
}

export function N1Aside({
  categories,
  categoryMap,
  label,
  currentCategory,
}: N1AsideProps) {
  const router = useRouter()
  const treeData = transformToTree(categories)

  const { handleHover, cancelHover } = usePrefetchOnHover()

  const expandedPath = getCategoryPath(currentCategory, categoryMap)

  const handleSelect = (details: TreeType.SelectionChangeDetails) => {
    if (details.focusedValue) {
      const node = findNodeById(treeData, details.focusedValue)
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
              onNodeHover={(hoveredNode) =>
                prefetchOnHover(hoveredNode.handle as string)
              }
              onNodeLeave={() => cancelHover()}
              showNodeIcons={false}
            />
          ))}
        </TreeView.Tree>
      </TreeView>
    </aside>
  )
}
