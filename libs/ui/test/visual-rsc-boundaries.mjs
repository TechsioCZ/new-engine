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

/** Detect direct client ownership, not every component that renders a client child.
 * @param {string} source
 */
export function needsClientBoundary(source) {
  const file = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  let client = false
  const visit = (node) => {
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
