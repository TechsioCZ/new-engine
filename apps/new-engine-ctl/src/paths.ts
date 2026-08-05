import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const sourceDir = import.meta.dirname

export const repoRoot = resolve(sourceDir, "../../..")
export const defaultStackManifestPath = resolve(
  repoRoot,
  "apps/new-engine-ctl/config/stack-manifest.yaml"
)
export const defaultStackInputsPath = resolve(
  repoRoot,
  "apps/new-engine-ctl/config/stack-inputs.yaml"
)
