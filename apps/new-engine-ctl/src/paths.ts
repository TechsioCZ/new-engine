import nodePath from "node:path"

const sourceDir = import.meta.dirname

export const repoRoot = nodePath.resolve(sourceDir, "../../..")
export const defaultStackManifestPath = nodePath.resolve(
  repoRoot,
  "apps/new-engine-ctl/config/stack-manifest.yaml",
)
export const defaultStackInputsPath = nodePath.resolve(
  repoRoot,
  "apps/new-engine-ctl/config/stack-inputs.yaml",
)
