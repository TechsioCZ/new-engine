import nodePath from "node:path"

export const withWorkspaceBinPath = (
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => {
  const pathKey =
    Object.keys(env).find((key) => key === "PATH") ??
    Object.keys(env).find((key) => key.toUpperCase() === "PATH") ??
    "PATH"
  const nextEnv = Object.fromEntries(
    Object.entries(env).filter(
      ([key]) => key === pathKey || key.toUpperCase() !== "PATH",
    ),
  )

  return {
    ...nextEnv,
    [pathKey]: [
      nodePath.join(process.cwd(), "node_modules", ".bin"),
      env[pathKey],
    ]
      .filter(Boolean)
      .join(nodePath.delimiter),
  }
}
