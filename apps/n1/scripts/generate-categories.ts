import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { config as loadEnvironment } from "dotenv"

interface ApiCategory {
  description?: string
  handle: string
  id: string
  name: string
  parent_category_id: string | null
  root_category_id: string | null
}

interface CategoryTreeNode {
  children: CategoryTreeNode[]
  description?: string
  handle: string
  id: string
  name: string
}

interface LeafCategory {
  handle: string
  id: string
  name: string
  parent_category_id: string | null
  root_category_id: string | null
}

interface LeafParent {
  children: string[]
  handle: string
  id: string
  leafs: string[]
  name: string
}

interface GeneratedCategoryData {
  allCategories: ApiCategory[]
  categoryMap: Record<string, ApiCategory>
  categoryTree: CategoryTreeNode[]
  filteringStats: {
    categoriesWithDirectProducts: number
    filteredOutCount: number
    totalCategoriesAfterFiltering: number
    totalCategoriesBeforeFiltering: number
  }
  generatedAt: string
  leafCategories: LeafCategory[]
  leafParents: LeafParent[]
  rootCategories: ApiCategory[]
}

const scriptDirectory = import.meta.dirname
const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000"
const PRODUCT_PAGE_LIMIT = 100
const MAX_PRODUCT_PAGES = 100
const ROOT_CATEGORY_ORDER = [
  "Pánské",
  "Dámské",
  "Dětské",
  "Oblečení",
  "Cyklo",
  "Moto",
  "Snb-Skate",
  "Ski",
]

loadEnvironment({ path: path.join(scriptDirectory, "../.env") })
loadEnvironment({ path: path.join(scriptDirectory, "../.env.local") })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readRequiredString = (
  record: Record<string, unknown>,
  key: string,
): string => {
  const value = record[key]
  if (typeof value !== "string") {
    throw new TypeError(`Expected ${key} to be a string`)
  }
  return value
}

const readOptionalString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== "string") {
    throw new TypeError(`Expected ${key} to be a string when present`)
  }
  return value
}

const readNullableString = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key]
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    throw new TypeError(`Expected ${key} to be a nullable string`)
  }
  return value
}

const parseCategory = (value: unknown): ApiCategory => {
  if (!isRecord(value)) {
    throw new TypeError("Expected category to be an object")
  }
  const description = readOptionalString(value, "description")
  return {
    ...(description === undefined ? {} : { description }),
    handle: readRequiredString(value, "handle"),
    id: readRequiredString(value, "id"),
    name: readRequiredString(value, "name"),
    parent_category_id: readNullableString(value, "parent_category_id"),
    root_category_id: null,
  }
}

const parseCategoryResponse = (value: unknown): ApiCategory[] => {
  if (!isRecord(value) || !Array.isArray(value["product_categories"])) {
    throw new TypeError("Invalid product category response")
  }
  return value["product_categories"].map(parseCategory)
}

const parseProductCategoryIds = (value: unknown): string[] => {
  if (!isRecord(value) || !Array.isArray(value["categories"])) {
    return []
  }
  return value["categories"].flatMap((category) => {
    if (!isRecord(category) || typeof category["id"] !== "string") {
      return []
    }
    return [category["id"]]
  })
}

const parseProductResponse = (value: unknown): string[][] => {
  if (!isRecord(value) || !Array.isArray(value["products"])) {
    throw new TypeError("Invalid product response")
  }
  return value["products"].map(parseProductCategoryIds)
}

const getMedusaBackendUrl = (): string =>
  process.env["MEDUSA_BACKEND_URL_INTERNAL"] ??
  process.env["NEXT_PUBLIC_MEDUSA_BACKEND_URL"] ??
  DEFAULT_MEDUSA_BACKEND_URL

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const publishableKey = process.env["NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"]
  if (publishableKey !== undefined && publishableKey !== "") {
    headers["x-publishable-api-key"] = publishableKey
  }
  return headers
}

const formatGeneratedFile = (filePath: string): void => {
  const cwd = path.join(scriptDirectory, "..")
  const formatCommands: readonly (readonly [string, string[]])[] = [
    ["pnpm", ["exec", "oxfmt", "--config", "oxfmt.config.ts", filePath]],
    ["oxfmt", ["--config", "oxfmt.config.ts", filePath]],
  ]
  for (const [command, commandArguments] of formatCommands) {
    try {
      execFileSync(command, commandArguments, { cwd, stdio: "ignore" })
      return
    } catch {
      // Try the next formatter command variant.
    }
  }
  console.warn(
    `Could not auto-format generated file: ${filePath}. Run oxfmt manually.`,
  )
}

const fetchCategoriesDirectly = async (): Promise<ApiCategory[]> => {
  const baseUrl = getMedusaBackendUrl()
  console.log(`Fetching categories from: ${baseUrl}/store/product-categories`)
  const response = await fetch(
    `${baseUrl}/store/product-categories?limit=1000&fields=id,name,handle,parent_category_id,description`,
    { headers: buildHeaders() },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`)
  }
  return parseCategoryResponse(await response.json())
}

const fetchProductPage = async (
  baseUrl: string,
  headers: Record<string, string>,
  categoriesWithProducts: Set<string>,
  offset: number,
  page: number,
): Promise<void> => {
  if (page >= MAX_PRODUCT_PAGES) {
    throw new Error(`Product pagination exceeded ${MAX_PRODUCT_PAGES} pages`)
  }
  const response = await fetch(
    `${baseUrl}/store/products?limit=${PRODUCT_PAGE_LIMIT}&offset=${offset}&fields=id,categories.id,categories.name,categories.handle`,
    { headers },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`)
  }
  const products = parseProductResponse(await response.json())
  for (const categoryIds of products) {
    for (const categoryId of categoryIds) {
      categoriesWithProducts.add(categoryId)
    }
  }
  const nextOffset = offset + PRODUCT_PAGE_LIMIT
  console.log(
    `Processed ${nextOffset} products, found ${categoriesWithProducts.size} categories with products`,
  )
  if (products.length === PRODUCT_PAGE_LIMIT) {
    await fetchProductPage(
      baseUrl,
      headers,
      categoriesWithProducts,
      nextOffset,
      page + 1,
    )
  }
}

const fetchProductsAndCategorizesByCategory = async (): Promise<
  Set<string>
> => {
  const baseUrl = getMedusaBackendUrl()
  console.log(`Fetching products from: ${baseUrl}/store/products`)
  const categoriesWithProducts = new Set<string>()
  await fetchProductPage(baseUrl, buildHeaders(), categoriesWithProducts, 0, 0)
  console.log(`Total categories with products: ${categoriesWithProducts.size}`)
  return categoriesWithProducts
}

const compareRootCategories = (a: ApiCategory, b: ApiCategory): number => {
  const indexA = ROOT_CATEGORY_ORDER.indexOf(a.name)
  const indexB = ROOT_CATEGORY_ORDER.indexOf(b.name)
  if (indexA !== -1 && indexB !== -1) {
    return indexA - indexB
  }
  if (indexA !== -1) {
    return -1
  }
  if (indexB !== -1) {
    return 1
  }
  return a.name.localeCompare(b.name)
}

const buildCategoryTree = (categories: ApiCategory[]): CategoryTreeNode[] => {
  const categoryMap = new Map<string, CategoryTreeNode>(
    categories.map((category): [string, CategoryTreeNode] => [
      category.id,
      {
        children: [],
        ...(category.description === undefined
          ? {}
          : { description: category.description }),
        handle: category.handle,
        id: category.id,
        name: category.name,
      },
    ]),
  )
  const rootNodes: CategoryTreeNode[] = []
  for (const category of categories) {
    const node = categoryMap.get(category.id)
    if (!node) {
      continue
    }
    if (category.parent_category_id === null) {
      rootNodes.push(node)
    } else {
      categoryMap.get(category.parent_category_id)?.children.push(node)
    }
  }
  return rootNodes.toSorted((a, b) =>
    compareRootCategories(
      { ...a, parent_category_id: null, root_category_id: null },
      { ...b, parent_category_id: null, root_category_id: null },
    ),
  )
}

const findNodeInTree = (
  nodes: CategoryTreeNode[],
  targetId: string,
): CategoryTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node
    }
    const found = findNodeInTree(node.children, targetId)
    if (found) {
      return found
    }
  }
  return undefined
}

const categoryTreeHasProducts = (
  node: CategoryTreeNode,
  categoriesWithProducts: Set<string>,
): boolean =>
  categoriesWithProducts.has(node.id) ||
  node.children.some((child) =>
    categoryTreeHasProducts(child, categoriesWithProducts),
  )

const filterCategoriesWithProducts = (
  categories: ApiCategory[],
  categoriesWithProducts: Set<string>,
  categoryTree: CategoryTreeNode[],
  categoryMap: Record<string, ApiCategory>,
): ApiCategory[] => {
  const categoriesToKeep = new Set<string>()
  for (const category of categories) {
    const node = findNodeInTree(categoryTree, category.id)
    if (!node || !categoryTreeHasProducts(node, categoriesWithProducts)) {
      continue
    }
    categoriesToKeep.add(category.id)
    let currentId = category.parent_category_id
    while (currentId !== null && !categoriesToKeep.has(currentId)) {
      categoriesToKeep.add(currentId)
      currentId = categoryMap[currentId]?.parent_category_id ?? null
    }
  }
  return categories.filter((category) => categoriesToKeep.has(category.id))
}

const findRootId = (
  categoryId: string,
  categoryMap: Record<string, ApiCategory>,
  rootCache: Map<string, string | null>,
): string | null => {
  const cached = rootCache.get(categoryId)
  if (cached !== undefined) {
    return cached
  }
  let current = categoryMap[categoryId]
  const pathIds = [categoryId]
  while (
    current?.parent_category_id !== null &&
    current?.parent_category_id !== undefined
  ) {
    const parentId = current.parent_category_id
    current = categoryMap[parentId]
    if (current === undefined) {
      break
    }
    pathIds.push(parentId)
  }
  const rootId = current?.parent_category_id === null ? current.id : null
  for (const id of pathIds) {
    rootCache.set(id, rootId)
  }
  return rootId
}

const addRootCategoryIds = (
  categories: ApiCategory[],
  categoryMap: Record<string, ApiCategory>,
): void => {
  const rootCache = new Map<string, string | null>()
  for (const category of categories) {
    category.root_category_id =
      category.parent_category_id === null
        ? null
        : findRootId(category.id, categoryMap, rootCache)
  }
}

const collectNestedLeafIds = (node: CategoryTreeNode): string[] => {
  if (node.children.length === 0) {
    return [node.id]
  }
  return node.children.flatMap(collectNestedLeafIds)
}

const extractLeafsAndParents = (
  categoryTree: CategoryTreeNode[],
  allCategoriesMap: Record<string, ApiCategory>,
): { leafCategories: LeafCategory[]; leafParents: LeafParent[] } => {
  const leafCategories: LeafCategory[] = []
  const leafIds = new Set<string>()
  const identifyLeafs = (node: CategoryTreeNode): void => {
    if (node.children.length === 0) {
      const category = allCategoriesMap[node.id]
      if (category !== undefined) {
        leafIds.add(node.id)
        leafCategories.push({
          handle: node.handle,
          id: node.id,
          name: node.name,
          parent_category_id: category.parent_category_id,
          root_category_id: category.root_category_id,
        })
      }
      return
    }
    for (const child of node.children) {
      identifyLeafs(child)
    }
  }
  for (const rootNode of categoryTree) {
    identifyLeafs(rootNode)
  }

  const leafParents: LeafParent[] = []
  const collectLeafParents = (node: CategoryTreeNode): void => {
    const hasDirectLeafChild = node.children.some((child) =>
      leafIds.has(child.id),
    )
    if (hasDirectLeafChild && !leafIds.has(node.id)) {
      leafParents.push({
        children: node.children.map((child) => child.id),
        handle: node.handle,
        id: node.id,
        leafs: collectNestedLeafIds(node),
        name: node.name,
      })
    }
    for (const child of node.children) {
      collectLeafParents(child)
    }
  }
  for (const rootNode of categoryTree) {
    collectLeafParents(rootNode)
  }
  return { leafCategories, leafParents }
}

const testRootCategoryIds = (
  allCategories: ApiCategory[],
  categoryMap: Record<string, ApiCategory>,
  rootCategories: ApiCategory[],
): void => {
  const failures: string[] = []
  for (const root of rootCategories) {
    if (root.root_category_id !== null) {
      failures.push(`Root category ${root.id} has a root category ID`)
    }
  }
  const rootIds = new Set(rootCategories.map((root) => root.id))
  for (const category of allCategories) {
    if (category.parent_category_id === null) {
      continue
    }
    if (category.root_category_id === null) {
      failures.push(`Non-root category ${category.id} has no root category ID`)
    } else if (!rootIds.has(category.root_category_id)) {
      failures.push(`Category ${category.id} points to an invalid root`)
    }
  }
  const sampleDeepCategories = allCategories
    .filter((category) => {
      let depth = 0
      let current: ApiCategory | undefined = category
      while (
        current?.parent_category_id !== null &&
        current?.parent_category_id !== undefined
      ) {
        depth += 1
        current = categoryMap[current.parent_category_id]
      }
      return depth >= 3
    })
    .slice(0, 3)
  for (const category of sampleDeepCategories) {
    const root =
      category.root_category_id === null
        ? undefined
        : categoryMap[category.root_category_id]
    if (root === undefined || root.parent_category_id !== null) {
      failures.push(`Deep category ${category.id} has an invalid root`)
    }
  }
  if (failures.length > 0) {
    throw new Error(failures.join("\n"))
  }
  console.log(`Validated ${allCategories.length} category root assignments`)
}

const escapeTemplateData = (value: string): string =>
  value.replaceAll("`", "\\u0060").replaceAll("${", "\\u0024{")

const renderStaticCategoryModule = (categories: ApiCategory[]): string => {
  const categoryJson = escapeTemplateData(JSON.stringify(categories))
  return `// Auto-generated file - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// Run 'pnpm run generate:categories' to regenerate
// This version filters out categories without products and adds root_category_id

import type { Category, CategoryTreeNode } from "@/data/static/type"

interface LeafCategory {
  handle: string
  id: string
  name: string
  parent_category_id: string | null
  root_category_id: string | null
}

const categoryDataJson = \`${categoryJson}\`

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string"

const isNullableString = (value: unknown): boolean =>
  value === null || typeof value === "string"

const isCategory = (value: unknown): value is Category => {
  if (typeof value !== "object" || value === null) return false
  if (!("handle" in value) || typeof value.handle !== "string") return false
  if (!("id" in value) || typeof value.id !== "string") return false
  if (!("name" in value) || typeof value.name !== "string") return false
  if ("description" in value && !isOptionalString(value.description)) return false
  if ("parent_category_id" in value && !isNullableString(value.parent_category_id)) return false
  return !("root_category_id" in value) || isNullableString(value.root_category_id)
}

const parseCategories = (json: string): Category[] => {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed) || !parsed.every(isCategory)) {
    throw new TypeError("Generated category data is invalid")
  }
  return parsed
}

const allCategoriesData = parseCategories(categoryDataJson)

const buildCategoryMap = (categories: Category[]): Record<string, Category> =>
  Object.fromEntries(categories.map((category) => [category.id, category]))

const buildCategoryTree = (categories: Category[]): CategoryTreeNode[] => {
  const nodes = new Map(categories.map((category) => [category.id, {
    children: [], description: category.description, handle: category.handle,
    id: category.id, name: category.name,
  }]))
  const roots: CategoryTreeNode[] = []
  for (const category of categories) {
    const node = nodes.get(category.id)
    if (!node) continue
    if (category.parent_category_id === null || category.parent_category_id === undefined) {
      roots.push(node)
    } else {
      nodes.get(category.parent_category_id)?.children?.push(node)
    }
  }
  return roots
}

const collectLeafCategories = (nodes: CategoryTreeNode[], categories: Record<string, Category>): LeafCategory[] => {
  const leaves: LeafCategory[] = []
  const visit = (node: CategoryTreeNode): void => {
    if ((node.children?.length ?? 0) === 0) {
      const category = categories[node.id]
      if (category) leaves.push({
        handle: category.handle, id: category.id, name: category.name,
        parent_category_id: category.parent_category_id ?? null,
        root_category_id: category.root_category_id ?? null,
      })
      return
    }
    for (const child of node.children ?? []) visit(child)
  }
  for (const node of nodes) visit(node)
  return leaves
}

export const allCategories = allCategoriesData
export const categoryMap = buildCategoryMap(allCategories)
export const categoryTree = buildCategoryTree(allCategories)
export const rootCategories = categoryTree.flatMap((root) => {
  const category = categoryMap[root.id]
  return category ? [category] : []
})
export const leafCategories = collectLeafCategories(categoryTree, categoryMap)
`
}

const generateCategories = async (): Promise<void> => {
  console.log("Generating static category data for n1")
  const categoriesRaw = await fetchCategoriesDirectly()
  const categoriesWithProducts = await fetchProductsAndCategorizesByCategory()
  const categoryMapRaw = Object.fromEntries(
    categoriesRaw.map((category) => [category.id, category]),
  )
  const initialCategoryTree = buildCategoryTree(categoriesRaw)
  const allCategories = filterCategoriesWithProducts(
    categoriesRaw,
    categoriesWithProducts,
    initialCategoryTree,
    categoryMapRaw,
  )
  const categoryMap = Object.fromEntries(
    allCategories.map((category) => [category.id, category]),
  )
  addRootCategoryIds(allCategories, categoryMap)
  const rootCategories = allCategories
    .filter((category) => category.parent_category_id === null)
    .toSorted(compareRootCategories)
  const categoryTree = buildCategoryTree(allCategories)
  const { leafCategories, leafParents } = extractLeafsAndParents(
    categoryTree,
    categoryMap,
  )
  testRootCategoryIds(allCategories, categoryMap, rootCategories)

  const data: GeneratedCategoryData = {
    allCategories,
    categoryMap,
    categoryTree,
    filteringStats: {
      categoriesWithDirectProducts: categoriesWithProducts.size,
      filteredOutCount: categoriesRaw.length - allCategories.length,
      totalCategoriesAfterFiltering: allCategories.length,
      totalCategoriesBeforeFiltering: categoriesRaw.length,
    },
    generatedAt: new Date().toISOString(),
    leafCategories,
    leafParents,
    rootCategories,
  }
  const outputPath = path.join(
    scriptDirectory,
    "../src/data/static/categories.ts",
  )
  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, renderStaticCategoryModule(data.allCategories))
  formatGeneratedFile(outputPath)
  console.log(`Category module saved to: ${outputPath}`)
  console.log(
    `Generated ${allCategories.length} categories, ${rootCategories.length} roots, ${leafCategories.length} leaves, and ${leafParents.length} leaf parents`,
  )
}

try {
  await generateCategories()
} catch (error) {
  console.error("Error generating categories", error)
  process.exitCode = 1
}
