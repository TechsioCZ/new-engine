import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const sourceDir = dirname(fileURLToPath(import.meta.url))

export const repoRoot = resolve(sourceDir, "../../..")
export const defaultStackManifestPath = resolve(
  repoRoot,
  "config/stack-manifest.yaml"
)
export const defaultStackInputsPath = resolve(
  repoRoot,
  "config/stack-inputs.yaml"
)
