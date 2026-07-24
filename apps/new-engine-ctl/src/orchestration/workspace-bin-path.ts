import { delimiter, join } from "node:path"

export function withWorkspaceBinPath(
  env: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
  const pathKey =
    Object.keys(env).find((key) => key === "PATH") ??
    Object.keys(env).find((key) => key.toUpperCase() === "PATH") ??
    "PATH"
  const nextEnv = { ...env }

  for (const key of Object.keys(nextEnv)) {
    if (key !== pathKey && key.toUpperCase() === "PATH") {
      delete nextEnv[key]
    }
  }

  return {
    ...nextEnv,
    [pathKey]: [join(process.cwd(), "node_modules", ".bin"), env[pathKey]]
      .filter(Boolean)
      .join(delimiter),
  }
}
