import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import ts from "typescript"

const clientAPIs = new Set([
  "createContext",
  "useContext",
  "useState",
  "useReducer",
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useRef",
  "useId",
  "useMemo",
  "useCallback",
  "useImperativeHandle",
  "useSyncExternalStore",
  "useTransition",
  "useDeferredValue",
  "useOptimistic",
  "useActionState",
])
const eventName = /^on[A-Z]/
const hookName = /^use[A-Z]/
const sourceExtension = /\.tsx?$/

function readsClientBinding(node, clientBindings) {
  if (!(ts.isIdentifier(node) && clientBindings.has(node.text))) {
    return false
  }
  // Type queries such as typeof Select.Control never execute on the server.
  for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
    if (ts.isTypeNode(ancestor)) {
      return false
    }
  }
  const parent = node.parent
  if (
    ts.isImportSpecifier(parent) ||
    ts.isImportClause(parent) ||
    ts.isNamespaceImport(parent)
  ) {
    return false
  }
  if (
    (ts.isJsxOpeningElement(parent) ||
      ts.isJsxClosingElement(parent) ||
      ts.isJsxSelfClosingElement(parent)) &&
    parent.tagName === node
  ) {
    return false
  }
  return !(
    ts.isExportSpecifier(parent) &&
    (parent.isTypeOnly || parent.parent.parent.isTypeOnly)
  )
}

function reexportsClientModule(node, isClientModule) {
  return (
    ts.isExportDeclaration(node) &&
    !node.isTypeOnly &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier) &&
    isClientModule(node.moduleSpecifier.text) &&
    (!(node.exportClause && ts.isNamedExports(node.exportClause)) ||
      node.exportClause.elements.some((item) => !item.isTypeOnly))
  )
}

/** Detect client ownership, not every component that renders a client child.
 * @param {string} source
 * @param {(specifier: string) => boolean} isClientModule
 */
export function needsClientBoundary(source, isClientModule = () => false) {
  const file = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const clientBindings = new Set()
  for (const statement of file.statements) {
    if (
      !(
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) ||
      statement.importClause?.isTypeOnly ||
      !isClientModule(statement.moduleSpecifier.text)
    ) {
      continue
    }
    const clause = statement.importClause
    if (clause?.name) {
      clientBindings.add(clause.name.text)
    }
    const bindings = clause?.namedBindings
    if (bindings && ts.isNamespaceImport(bindings)) {
      clientBindings.add(bindings.name.text)
    } else if (bindings && ts.isNamedImports(bindings)) {
      for (const item of bindings.elements) {
        if (!item.isTypeOnly) {
          clientBindings.add(item.name.text)
        }
      }
    }
  }
  let client = false
  // Rendering <ClientChild /> is legal on the server. Reading, aliasing,
  // attaching, or re-exporting its value (including ClientChild.Part) is not.
  const usesClientValue = (node) =>
    readsClientBinding(node, clientBindings) ||
    reexportsClientModule(node, isClientModule)
  const visit = (node) => {
    client ||= usesClientValue(node)
    if (
      ts.isExpressionStatement(node) &&
      ts.isStringLiteral(node.expression) &&
      node.expression.text === "use client"
    ) {
      client = true
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "react" &&
      !node.importClause?.isTypeOnly
    ) {
      const bindings = node.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        client ||= bindings.elements.some(
          (item) =>
            !item.isTypeOnly &&
            clientAPIs.has((item.propertyName ?? item.name).text)
        )
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      clientAPIs.has(node.expression.name.text)
    ) {
      client = true
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (hookName.test(node.expression.text) ||
        node.expression.text === "createPortal")
    ) {
      client = true
    }
    if (
      ts.isJsxAttribute(node) &&
      eventName.test(node.name.getText(file)) &&
      node.initializer
    ) {
      client = true
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return client
}

/** Resolve boundaries to a fixed point so re-exports and import cycles propagate.
 * Map keys are absolute source paths; values are TypeScript/TSX source text.
 * @param {Map<string, string>} sources
 * @param {string} sourceRoot
 */
export function detectClientBoundaries(sources, sourceRoot) {
  const clients = new Set()
  const resolveImport = (importer, specifier) => {
    let stem
    if (specifier.startsWith(".")) {
      stem = path.resolve(path.dirname(importer), specifier)
    } else if (specifier.startsWith("@/")) {
      stem = path.resolve(sourceRoot, specifier.slice(2))
    }
    if (!stem) {
      return false
    }
    return [
      stem,
      `${stem}.tsx`,
      `${stem}.ts`,
      path.join(stem, "index.tsx"),
      path.join(stem, "index.ts"),
    ].some((target) => clients.has(target))
  }
  let changed = true
  while (changed) {
    changed = false
    for (const [filename, source] of sources) {
      if (
        !clients.has(filename) &&
        needsClientBoundary(source, (specifier) =>
          resolveImport(filename, specifier)
        )
      ) {
        clients.add(filename)
        changed = true
      }
    }
  }
  return clients
}

/** @param {string} sourceRoot */
export function getClientBoundaryModules(sourceRoot) {
  const sources = new Map(
    readdirSync(sourceRoot, { recursive: true })
      .filter(
        (filename) =>
          sourceExtension.test(filename) &&
          !filename.endsWith(".figma.ts") &&
          !filename.endsWith(".d.ts")
      )
      .map((filename) => {
        const absolute = path.resolve(sourceRoot, filename)
        return [absolute, readFileSync(absolute, "utf8")]
      })
  )
  return detectClientBoundaries(sources, sourceRoot)
}

/** Directives must be in the directive prologue, not a comment or late statement.
 * @param {string} source
 */
export function hasClientDirective(source) {
  const file = ts.createSourceFile(
    "entry.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  )
  for (const statement of file.statements) {
    if (
      !(
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression)
      )
    ) {
      return false
    }
    if (statement.expression.text === "use client") {
      return true
    }
  }
  return false
}
