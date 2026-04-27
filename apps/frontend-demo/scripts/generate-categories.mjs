/**
 * Script to generate static category data at build time - V2 with product filtering
 * Filters out categories that don't contain any products
 * Run with: node scripts/generate-categories-2.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables - try .env first, then .env.local
dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config({ path: path.join(__dirname, '../.env.local') })

// Fetch categories from API
async function fetchCategoriesDirectly() {
  const baseUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  const headers = {
    'Content-Type': 'application/json',
  }

  // Add publishable key if available
  if (publishableKey) {
    headers['x-publishable-api-key'] = publishableKey
  }

  console.log(`Fetching categories from: ${baseUrl}/store/product-categories`)

  const response = await fetch(
    `${baseUrl}/store/product-categories?limit=1000&fields=id,name,handle,parent_category_id,description`,
    {
      headers,
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`)
  }

  const data = await response.json()
  return data.product_categories || []
}

// Fetch products and determine which categories have products
async function fetchProductsAndCategorizesByCategory() {
  const baseUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  const headers = {
    'Content-Type': 'application/json',
  }

  // Add publishable key if available
  if (publishableKey) {
    headers['x-publishable-api-key'] = publishableKey
  }

  console.log(`Fetching products from: ${baseUrl}/store/products`)

  // Create set to track categories with products
  const categoriesWithProducts = new Set()
  let offset = 0
  const limit = 100
  let hasMore = true

  while (hasMore) {
    // IMPORTANT: We must explicitly request categories in fields parameter
    const response = await fetch(
      `${baseUrl}/store/products?limit=${limit}&offset=${offset}&fields=id,categories.id,categories.name,categories.handle`,
      {
        headers,
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`)
    }

    const data = await response.json()
    const products = data.products || []

    // Process products and collect category IDs
    products.forEach((product) => {
      if (product.categories && Array.isArray(product.categories)) {
        product.categories.forEach((category) => {
          if (category.id) {
            categoriesWithProducts.add(category.id)
          }
        })
      }
    })

    // Check if we have more products to fetch
    hasMore = products.length === limit
    offset += limit

    console.log(
      `Processed ${offset} products, found ${categoriesWithProducts.size} categories with products`
    )
  }

  console.log(`Total categories with products: ${categoriesWithProducts.size}`)
  return categoriesWithProducts
}

// Copy of ROOT_CATEGORY_ORDER from category-utils
const ROOT_CATEGORY_ORDER = [
  'Pánské',
  'Dámské',
  'Dětské',
  'Oblečení',
  'Cyklo',
  'Moto',
  'Snb-Skate',
  'Ski',
]

function createStaticCategoryModule(dataToSave) {
  return `// Auto-generated file - DO NOT EDIT
// Generated at: ${dataToSave.generatedAt}
// Run 'node scripts/generate-categories.mjs' to regenerate
// This version filters out categories without products

import type { Category, CategoryTreeNode } from '@/lib/server/categories'

export interface LeafCategory {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
}

export interface LeafParent {
  id: string
  name: string
  handle: string
  children: string[] // Array of direct child category IDs
  leafs: string[] // Array of ALL nested leaf category IDs
}

export interface FilteringStats {
  totalCategoriesBeforeFiltering: number
  totalCategoriesAfterFiltering: number
  categoriesWithDirectProducts: number
  filteredOutCount: number
}

export interface StaticCategoryData {
  allCategories: Category[]
  categoryTree: CategoryTreeNode[]
  rootCategories: Category[]
  categoryMap: Record<string, Category>
  leafCategories: LeafCategory[]
  leafParents: LeafParent[]
  generatedAt: string
  filteringStats: FilteringStats
}

const data: StaticCategoryData = ${JSON.stringify(dataToSave, null, 2)}

export default data
export const { allCategories, categoryTree, rootCategories, categoryMap, leafCategories, leafParents, filteringStats } = data
`
}

function createFallbackCategoryData(generatedAt) {
  return {
    allCategories: [],
    categoryTree: [],
    rootCategories: [],
    categoryMap: {},
    leafCategories: [],
    leafParents: [],
    generatedAt,
    filteringStats: {
      totalCategoriesBeforeFiltering: 0,
      totalCategoriesAfterFiltering: 0,
      categoriesWithDirectProducts: 0,
      filteredOutCount: 0,
    },
  }
}

function getStaticCategoryModulePath() {
  return path.join(__dirname, '../src/lib/static-data/categories.ts')
}

function writeStaticCategoryModule(dataToSave) {
  const tsOutputPath = getStaticCategoryModulePath()
  const tsDir = path.dirname(tsOutputPath)

  if (!fs.existsSync(tsDir)) {
    fs.mkdirSync(tsDir, { recursive: true })
  }

  fs.writeFileSync(tsOutputPath, createStaticCategoryModule(dataToSave))

  return tsOutputPath
}

function buildCategoryTree(categories) {
  const categoryMap = new Map()
  const rootNodes = []

  // First pass: create all nodes
  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      handle: cat.handle,
      description: cat.description,
      children: [],
    })
  })

  // Second pass: build tree structure
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id)

    if (cat.parent_category_id) {
      const parent = categoryMap.get(cat.parent_category_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      }
    } else {
      rootNodes.push(node)
    }
  })

  // Sort root nodes
  return rootNodes.sort((a, b) => {
    const indexA = ROOT_CATEGORY_ORDER.indexOf(a.name)
    const indexB = ROOT_CATEGORY_ORDER.indexOf(b.name)

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }

    if (indexA !== -1) return -1
    if (indexB !== -1) return 1

    return a.name.localeCompare(b.name)
  })
}

// Function to check if category or any of its descendants has products
function categoryHasProducts(
  categoryId,
  categoriesWithProducts,
  categoryTree,
  categoryMap
) {
  // Direct check - if this category has products
  if (categoriesWithProducts.has(categoryId)) {
    return true
  }

  // Check if any descendant has products
  function checkDescendants(node) {
    // Check current node
    if (categoriesWithProducts.has(node.id)) {
      return true
    }

    // Check all children recursively
    for (const child of node.children) {
      if (checkDescendants(child)) {
        return true
      }
    }

    return false
  }

  // Find the node in the tree and check its descendants
  function findNodeInTree(nodes, targetId) {
    for (const node of nodes) {
      if (node.id === targetId) {
        return node
      }
      const found = findNodeInTree(node.children, targetId)
      if (found) {
        return found
      }
    }
    return null
  }

  const node = findNodeInTree(categoryTree, categoryId)
  return node ? checkDescendants(node) : false
}

// Filter categories to keep only those with products (including ancestors)
function filterCategoriesWithProducts(
  categories,
  categoriesWithProducts,
  categoryTree,
  categoryMap
) {
  const categoriesToKeep = new Set()

  // First, mark all categories that have products or whose descendants have products
  categories.forEach((category) => {
    if (
      categoryHasProducts(
        category.id,
        categoriesWithProducts,
        categoryTree,
        categoryMap
      )
    ) {
      categoriesToKeep.add(category.id)

      // Also mark all ancestors
      let currentId = category.parent_category_id
      while (currentId && !categoriesToKeep.has(currentId)) {
        categoriesToKeep.add(currentId)
        const parentCategory = categoryMap[currentId]
        currentId = parentCategory?.parent_category_id
      }
    }
  })

  return categories.filter((category) => categoriesToKeep.has(category.id))
}

// New function to extract leaf categories and their parents with ALL nested leafs
function extractLeafsAndParents(categoryTree, allCategoriesMap) {
  const leafCategories = []
  const leafParentsMap = new Map()

  // First, identify all leaf nodes
  const allLeafIds = new Set()

  function identifyLeafs(node) {
    if (node.children.length === 0) {
      allLeafIds.add(node.id)
      const categoryData = allCategoriesMap[node.id]
      leafCategories.push({
        id: node.id,
        name: node.name,
        handle: node.handle,
        parent_category_id: categoryData?.parent_category_id,
      })
    } else {
      node.children.forEach((child) => identifyLeafs(child))
    }
  }

  // Identify all leafs first
  categoryTree.forEach((rootNode) => identifyLeafs(rootNode))

  // Now find all ancestors of leafs and collect their nested leafs
  function collectAllNestedLeafs(node) {
    const nestedLeafs = []

    function traverse(n) {
      if (n.children.length === 0) {
        nestedLeafs.push(n.id)
      } else {
        n.children.forEach((child) => traverse(child))
      }
    }

    traverse(node)
    return nestedLeafs
  }

  // Check each node if it has at least one direct child that is a leaf
  function checkForLeafParents(node) {
    // Check if any direct child is a leaf
    const hasDirectLeafChild = node.children.some((child) =>
      allLeafIds.has(child.id)
    )

    // If this node has at least one direct leaf child
    if (hasDirectLeafChild && !allLeafIds.has(node.id)) {
      const allNestedLeafs = collectAllNestedLeafs(node)

      leafParentsMap.set(node.id, {
        id: node.id,
        name: node.name,
        handle: node.handle,
        children: node.children.map((child) => child.id), // Keep original direct children
        leafs: allNestedLeafs, // Add all nested leaf IDs
      })
    }

    // Check all children recursively
    node.children.forEach((child) => checkForLeafParents(child))
  }

  // Check all nodes starting from root
  categoryTree.forEach((rootNode) => checkForLeafParents(rootNode))

  return {
    leafCategories,
    leafParents: Array.from(leafParentsMap.values()),
  }
}

async function generateCategories() {
  console.log('🔄 Generating static category data V2 with product filtering...')

  try {
    // Fetch categories from API
    const categoriesRaw = await fetchCategoriesDirectly()

    // Fetch products and determine which categories have products
    const categoriesWithProducts = await fetchProductsAndCategorizesByCategory()

    // Transform categories
    const allCategoriesRaw = categoriesRaw.map((cat) => ({
      id: cat.id,
      name: cat.name,
      handle: cat.handle,
      description: cat.description || undefined,
      parent_category_id: cat.parent_category_id,
    }))

    console.log(`Total categories before filtering: ${allCategoriesRaw.length}`)

    // Create category map for lookups
    const categoryMapRaw = {}
    allCategoriesRaw.forEach((cat) => {
      categoryMapRaw[cat.id] = cat
    })

    // Build initial tree to help with descendant checking
    const initialCategoryTree = buildCategoryTree(allCategoriesRaw)

    // Filter categories to keep only those with products or descendants with products
    const allCategories = filterCategoriesWithProducts(
      allCategoriesRaw,
      categoriesWithProducts,
      initialCategoryTree,
      categoryMapRaw
    )

    console.log(`Total categories after filtering: ${allCategories.length}`)
    console.log(
      `Filtered out ${allCategoriesRaw.length - allCategories.length} categories without products`
    )

    // Create category map from filtered categories
    const categoryMap = {}
    allCategories.forEach((cat) => {
      categoryMap[cat.id] = cat
    })

    // Filter and sort root categories
    const rootCategories = allCategories
      .filter((cat) => !cat.parent_category_id)
      .sort((a, b) => {
        const indexA = ROOT_CATEGORY_ORDER.indexOf(a.name)
        const indexB = ROOT_CATEGORY_ORDER.indexOf(b.name)

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }

        if (indexA !== -1) return -1
        if (indexB !== -1) return 1

        return a.name.localeCompare(b.name)
      })

    // Build tree structure from filtered categories
    const categoryTree = buildCategoryTree(allCategories)

    // Extract leafs and their parents with all nested leafs
    const { leafCategories, leafParents } = extractLeafsAndParents(
      categoryTree,
      categoryMap
    )

    const generatedAt = new Date().toISOString()
    const dataToSave = {
      allCategories,
      categoryTree,
      rootCategories,
      categoryMap,
      leafCategories,
      leafParents,
      generatedAt,
      filteringStats: {
        totalCategoriesBeforeFiltering: allCategoriesRaw.length,
        totalCategoriesAfterFiltering: allCategories.length,
        categoriesWithDirectProducts: categoriesWithProducts.size,
        filteredOutCount: allCategoriesRaw.length - allCategories.length,
      },
    }

    // Ensure directory exists
    const dataDir = path.join(__dirname, '../public/data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Write JSON to public directory
    const outputPath = path.join(dataDir, 'categories-test.json')
    fs.writeFileSync(outputPath, JSON.stringify(dataToSave, null, 2))

    // Generate TypeScript module used by the Next.js build
    const tsOutputPath = writeStaticCategoryModule(dataToSave)

    console.log(
      '✅ Category data V2 with product filtering generated successfully!'
    )
    console.log(`📁 JSON saved to: ${outputPath}`)
    console.log(`📁 TypeScript module saved to: ${tsOutputPath}`)
    console.log(`📊 Stats:`)
    console.log(
      `   - Total categories (before filtering): ${allCategoriesRaw.length}`
    )
    console.log(
      `   - Total categories (after filtering): ${allCategories.length}`
    )
    console.log(
      `   - Categories with direct products: ${categoriesWithProducts.size}`
    )
    console.log(
      `   - Filtered out categories: ${allCategoriesRaw.length - allCategories.length}`
    )
    console.log(`   - Root categories: ${rootCategories.length}`)
    console.log(`   - Leaf categories: ${leafCategories.length}`)
    console.log(`   - Leaf parents: ${leafParents.length}`)

    // Log some examples of leaf parents with their nested leafs
    console.log('\n📋 Example leaf parents with nested leafs:')
    leafParents.slice(0, 3).forEach((parent) => {
      console.log(`   - ${parent.name}: ${parent.leafs.length} leafs`)
    })

    console.log(
      `\n   - File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`
    )
  } catch (error) {
    console.error('❌ Category generation failed:', error)

    const tsOutputPath = getStaticCategoryModulePath()
    const moduleExists = fs.existsSync(tsOutputPath)

    if (!moduleExists && !process.env.CI) {
      const fallbackData = createFallbackCategoryData(new Date().toISOString())
      const writtenPath = writeStaticCategoryModule(fallbackData)
      console.warn(`📁 Empty fallback TypeScript module saved to: ${writtenPath}`)
      return
    }

    if (moduleExists) {
      console.warn(
        `ℹ️ Keeping existing module at ${tsOutputPath}; not overwriting it with an empty fallback.`
      )
    }

    process.exitCode = 1
  }
}

// Run the script
generateCategories()
