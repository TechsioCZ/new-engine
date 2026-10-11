import { pathToFileURL } from "node:url"
import { getInterpretedFile } from "storybook/internal/common-original"

// biome-ignore lint/performance/noBarrelFile: Jest's replacement must preserve Storybook's complete common-module API.
export * from "storybook/internal/common-original"

// This module is mapped only by Jest. Its own import/transform pipeline must
// load configuration instead of installing hooks in the host Node process.
export async function serverRequire(filePaths) {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths]
  const candidate = paths.map(getInterpretedFile).find(Boolean)
  if (!candidate) {
    return null
  }
  const module = await import(pathToFileURL(candidate).href)
  return module.default ?? module
}
