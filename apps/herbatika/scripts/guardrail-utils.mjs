import path from "node:path"

export function parseGuardrailArgs(argv, defaultConfigPath) {
  const args = { configPath: defaultConfigPath, json: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--json") {
      args.json = true
      continue
    }

    if (arg === "--config") {
      const nextValue = argv[index + 1]
      if (nextValue) {
        args.configPath = nextValue
        index += 1
      }
      continue
    }

    if (arg.startsWith("--config=")) {
      args.configPath = arg.slice("--config=".length)
    }
  }

  return args
}

export function normalizePath(value) {
  return value.replaceAll(path.sep, "/")
}

export function globToRegExp(globPattern) {
  const normalized = normalizePath(globPattern)
  const withMarkers = normalized
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "__SINGLE_STAR__")
  const escaped = withMarkers
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("__SINGLE_STAR__", "[^/]*")

  return new RegExp(`^${escaped}$`)
}
