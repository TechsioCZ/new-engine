import { mkdir } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"
import { writeStaticContentPlanNoClobber } from "../writer"
import { verifyMarketStaticContentDraftBuild } from "./parser"
import type { MarketStaticContentDraftBuild } from "./types"

const resolveInside = (root: string, relativePath: string): string => {
  const resolvedRoot = resolve(root)
  const resolvedPath = resolve(root, relativePath)
  if (!resolvedPath.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`draft output escapes output directory: ${relativePath}`)
  }
  return resolvedPath
}

export const writeMarketStaticContentDraftBuild = async (
  outputDirectory: string,
  build: MarketStaticContentDraftBuild
): Promise<readonly string[]> => {
  verifyMarketStaticContentDraftBuild(build)
  const outputs = build.files.map((file) => ({
    contents: file.contents,
    path: resolveInside(outputDirectory, file.path),
  }))
  for (const output of outputs) {
    await mkdir(dirname(output.path), { recursive: true, mode: 0o700 })
    await writeStaticContentPlanNoClobber(output.path, output.contents)
  }
  return outputs.map(({ path }) => path)
}
