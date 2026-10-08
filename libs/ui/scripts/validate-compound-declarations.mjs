import { glob, readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const sourceExtension = /\.tsx?$/

/** @param {ts.SourceFile} source */
function collectComponentMembers(source) {
  const exportedFunctions = new Set()
  for (const statement of source.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
    ) {
      exportedFunctions.add(statement.name.text)
    }
  }
  /** @type {Map<string, Set<string>>} */
  const componentMembers = new Map()

  for (const statement of source.statements) {
    if (
      !(
        ts.isExpressionStatement(statement) &&
        ts.isBinaryExpression(statement.expression)
      )
    ) {
      continue
    }

    const { left, operatorToken } = statement.expression
    if (
      operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
      !ts.isPropertyAccessExpression(left) ||
      !ts.isIdentifier(left.expression) ||
      !exportedFunctions.has(left.expression.text)
    ) {
      continue
    }

    const members = componentMembers.get(left.expression.text) ?? new Set()
    members.add(left.name.text)
    componentMembers.set(left.expression.text, members)
  }

  return componentMembers
}

/**
 * @param {ts.Symbol} property
 * @param {ts.Program} program
 */
function isRequiredPublicProperty(property, program) {
  // biome-ignore lint/suspicious/noBitwiseOperators: TypeScript symbol flags are a bitmask.
  if (property.flags & ts.SymbolFlags.Optional) {
    return false
  }
  // Standard library Function types advertise prototype and Symbol.metadata
  // even for valid bound functions that have neither. Check package contracts.
  if (
    property.declarations?.every((declaration) =>
      program.isSourceFileDefaultLibrary(declaration.getSourceFile())
    )
  ) {
    return false
  }
  for (const declaration of property.declarations ?? []) {
    const flags = ts.getCombinedModifierFlags(declaration)
    for (const modifier of [
      ts.ModifierFlags.Private,
      ts.ModifierFlags.Protected,
    ]) {
      // biome-ignore lint/suspicious/noBitwiseOperators: TypeScript modifier flags are a bitmask.
      if (flags & modifier) {
        return false
      }
    }
  }
  return true
}

/**
 * Declaration emit names a compound member that collides with an identifier in
 * scope (an import or a DOM global such as Node) through a placeholder:
 * `export var _a: ...; export { _a as Node }`. The alias is the public member.
 * @param {ts.Symbol} property
 */
function isAliasedEmitPlaceholder(property) {
  const name = property.getName()
  return (property.declarations ?? []).some((declaration) => {
    const block = declaration.parent?.parent?.parent
    return (
      ts.isVariableDeclaration(declaration) &&
      block &&
      ts.isModuleBlock(block) &&
      block.statements.some(
        (statement) =>
          ts.isExportDeclaration(statement) &&
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause) &&
          statement.exportClause.elements.some(
            (element) =>
              element.propertyName?.text === name && element.name.text !== name
          )
      )
    )
  })
}

/** @param {ts.Symbol} property */
function getRuntimePropertyKey(property) {
  const name = property.getName()
  if (!String(property.getEscapedName()).startsWith("__@")) {
    return name
  }
  for (const declaration of property.declarations ?? []) {
    if (
      !(
        (ts.isPropertySignature(declaration) ||
          ts.isMethodSignature(declaration) ||
          ts.isPropertyDeclaration(declaration) ||
          ts.isMethodDeclaration(declaration) ||
          ts.isGetAccessorDeclaration(declaration) ||
          ts.isSetAccessorDeclaration(declaration)) &&
        ts.isComputedPropertyName(declaration.name)
      )
    ) {
      continue
    }
    const expression = declaration.name.expression
    if (
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "Symbol"
    ) {
      const key = Reflect.get(Symbol, expression.name.text)
      if (typeof key === "symbol") {
        return key
      }
    }
  }
  throw new Error(
    `Cannot validate the runtime key of required public symbol property ${name}.`
  )
}

/**
 * @param {ts.Type} type
 * @param {unknown} value
 * @param {string} label
 * @param {string[]} failures
 * @param {ts.Program} program
 */
function validateRuntimeMembers(type, value, label, failures, program) {
  let checkedMembers = 0
  for (const property of type.getProperties()) {
    if (
      !isRequiredPublicProperty(property, program) ||
      isAliasedEmitPlaceholder(property)
    ) {
      continue
    }
    const key = getRuntimePropertyKey(property)
    checkedMembers += 1
    // Inherited static members and Function built-ins are valid. Instance
    // members of a constructor's prototype are not static declarations.
    if (!(key in new Object(value))) {
      failures.push(
        `${label}.${property.getName()} is required by its public declaration but absent at runtime.`
      )
    }
  }
  return checkedMembers
}

/**
 * @param {string} packageRoot
 * @param {string} packageName
 * @param {ts.Program} program
 * @param {string} consumerPath
 * @param {Map<string, string>} publicRuntimeTargets
 */
async function validateRuntimeDeclarations(
  packageRoot,
  packageName,
  program,
  consumerPath,
  publicRuntimeTargets
) {
  const checker = program.getTypeChecker()
  const consumer = program.getSourceFile(consumerPath)
  if (!consumer) {
    throw new Error("Public component consumer source was not loaded.")
  }
  const imports = consumer.statements
    .filter(ts.isImportDeclaration)
    .filter(
      (statement) =>
        statement.importClause?.namedBindings &&
        ts.isNamespaceImport(statement.importClause.namedBindings)
    )
  /** @type {string[]} */
  const failures = []
  let checkedRuntimeExports = 0
  let checkedRuntimeMembers = 0

  for (const [index, [subpath, target]] of [
    ...publicRuntimeTargets,
  ].entries()) {
    const namespace = imports[index]?.importClause?.namedBindings
    if (!(namespace && ts.isNamespaceImport(namespace))) {
      throw new Error(`Public namespace import was not loaded for ${subpath}.`)
    }
    // The namespace value type excludes type-only exports, including aliases.
    const exportedValues = checker.getTypeAtLocation(namespace).getProperties()
    if (exportedValues.length === 0) {
      continue
    }
    const runtime = await import(
      pathToFileURL(resolve(packageRoot, target)).href
    )
    for (const exported of exportedValues) {
      const exportName = exported.getName()
      const label = `${packageName}${subpath.slice(1)}#${exportName}`
      checkedRuntimeExports += 1
      if (!Object.hasOwn(runtime, exportName)) {
        failures.push(`${label} is absent from the built module.`)
        continue
      }
      const type = checker.getTypeOfSymbolAtLocation(exported, namespace)
      checkedRuntimeMembers += validateRuntimeMembers(
        type,
        runtime[exportName],
        label,
        failures,
        program
      )
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Public component runtime validation failed:\n${failures.join("\n")}`
    )
  }
  return { checkedRuntimeExports, checkedRuntimeMembers }
}

/**
 * @param {string} packageRoot
 * @param {string} packageName
 * @param {Map<string, string>} publicTypeTargets
 * @param {Map<string, string>} publicRuntimeTargets concrete `import` targets;
 *   CSS-only exports have none and are not imported at runtime.
 */
export async function validateCompoundDeclarations(
  packageRoot,
  packageName,
  publicTypeTargets,
  publicRuntimeTargets
) {
  const sourceFiles = await Array.fromAsync(
    glob("src/{atoms,molecules,organisms,templates}/**/*.{ts,tsx}", {
      cwd: packageRoot,
    })
  )
  const consumerLines = []
  let checkedComponents = 0
  let checkedMembers = 0

  for (const file of sourceFiles.sort()) {
    const subpath = `./${file
      .replaceAll("\\", "/")
      .slice(4)
      .replace(sourceExtension, "")}`
    if (!publicTypeTargets.has(subpath)) {
      continue
    }

    const source = ts.createSourceFile(
      file,
      await readFile(resolve(packageRoot, file), "utf8"),
      ts.ScriptTarget.Latest
    )
    for (const [name, members] of collectComponentMembers(source)) {
      const alias = `Component${checkedComponents}`
      consumerLines.push(
        `import { ${name} as ${alias} } from ${JSON.stringify(`${packageName}${subpath.slice(1)}`)};`
      )
      for (const member of members) {
        consumerLines.push(`void ${alias}.${member};`)
        checkedMembers += 1
      }
      checkedComponents += 1
    }
  }

  if (checkedMembers === 0) {
    throw new Error("No public component members found to validate.")
  }

  for (const [index, subpath] of [...publicRuntimeTargets.keys()].entries()) {
    consumerLines.push(
      `import * as PublicExports${index} from ${JSON.stringify(`${packageName}${subpath.slice(1)}`)};`
    )
  }

  // Import through package exports so this checks the declarations consumers get.
  const consumerPath = resolve(
    packageRoot,
    ".ui-package-consumer.ts"
  ).replaceAll("\\", "/")
  const consumerText = consumerLines.join("\n")
  const options = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readSourceFile = host.readFile.bind(host)
  host.getSourceFile = (file, ...args) =>
    file === consumerPath
      ? ts.createSourceFile(file, consumerText, options.target)
      : getSourceFile(file, ...args)
  host.fileExists = (file) => file === consumerPath || fileExists(file)
  host.readFile = (file) =>
    file === consumerPath ? consumerText : readSourceFile(file)

  const program = ts.createProgram([consumerPath], options, host)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length > 0) {
    const details = ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => packageRoot,
      getNewLine: () => "\n",
    })
    throw new Error(
      `Public component declaration validation failed:\n${details}`
    )
  }

  const runtime = await validateRuntimeDeclarations(
    packageRoot,
    packageName,
    program,
    consumerPath,
    publicRuntimeTargets
  )
  return { checkedComponents, checkedMembers, ...runtime }
}
