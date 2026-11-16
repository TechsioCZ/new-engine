import type { ArgTypesEnhancer } from "storybook/internal/csf"

const internalProp = /^(?:id|ref|.*Ref)$/
const eventProp = /^on[A-Z]/
const integrationProp = /Props$/

/** Curate inferred Controls without erasing legitimate public API documentation. */
export const curateControls: ArgTypesEnhancer = (context) =>
  Object.fromEntries(
    // React docgen can omit inherited children. Include initial args before
    // Storybook's later inferArgTypes pass turns JSX into editable objects.
    Object.keys({ ...context.initialArgs, ...context.argTypes }).map((name) => {
      const definition = context.argTypes[name] ?? { name }
      if (internalProp.test(name)) {
        return [
          name,
          {
            ...definition,
            control: false,
            table: { ...definition.table, disable: true },
          },
        ]
      }
      // Supported callbacks/integration objects keep their API row, not an editor.
      if (eventProp.test(name) || integrationProp.test(name)) {
        return [name, { ...definition, control: false }]
      }
      // Respect explicit per-story controls, including intentional control:false.
      if (
        definition.control === false ||
        (typeof definition.control === "object" &&
          definition.control?.disable === true)
      ) {
        return [name, definition]
      }
      const value = context.initialArgs[name]
      if (
        typeof value === "string" &&
        (!definition.control ||
          definition.control === "object" ||
          (typeof definition.control === "object" &&
            definition.control.type === "object"))
      ) {
        return [name, { ...definition, control: { type: "text" } }]
      }
      if (value && typeof value === "object" && containsReactElement(value)) {
        // JSX cannot be edited, but an authored API row is still useful Docs.
        return [
          name,
          {
            ...definition,
            control: false,
            table: {
              ...definition.table,
              disable:
                definition.table?.disable ?? !definition.description?.trim(),
            },
          },
        ]
      }
      return [name, definition]
    })
  )

// Run after React docgen has supplied inferred prop definitions.
curateControls.secondPass = true

function containsReactElement(
  value: unknown,
  seen = new Set<object>()
): boolean {
  if (!value || typeof value !== "object" || seen.has(value)) {
    return false
  }
  seen.add(value)
  if ("$$typeof" in value) {
    return true
  }
  return Object.values(value).some((item) => containsReactElement(item, seen))
}
