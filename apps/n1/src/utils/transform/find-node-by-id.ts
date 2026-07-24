export const findNodeById = <
  T extends { id: string; children?: T[] | undefined },
>(
  nodes: T[],
  id: string
): T | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) {
        return found
      }
    }
  }
  return null
}
