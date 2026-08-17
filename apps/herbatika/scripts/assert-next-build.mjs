import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export const assertNextBuildValues = ({
  artifacts,
  requiredServerFiles,
  routesManifest,
}) => {
  const errors = []
  const config = requiredServerFiles?.config ?? {}

  if (config.output !== "standalone") {
    errors.push('config.output must be "standalone"')
  }
  if (config.cacheComponents !== false) {
    errors.push("config.cacheComponents must be false")
  }
  if (config.skipProxyUrlNormalize !== true) {
    errors.push("config.skipProxyUrlNormalize must be true")
  }
  if (config.skipTrailingSlashRedirect !== true) {
    errors.push("config.skipTrailingSlashRedirect must be true")
  }
  if (!Array.isArray(routesManifest?.redirects)) {
    errors.push("routes manifest redirects must be an array")
  } else if (routesManifest.redirects.length > 0) {
    errors.push("application redirects must be empty")
  }
  if (!artifacts?.buildId) {
    errors.push("BUILD_ID is missing")
  }
  if (!artifacts?.standaloneServer) {
    errors.push("standalone server is missing")
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid Next.js production artifact:\n- ${errors.join("\n- ")}`
    )
  }
}

export const assertActualNextBuild = () => {
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const nextRoot = resolve(appRoot, ".next")
  const readJson = (name) =>
    JSON.parse(readFileSync(resolve(nextRoot, name), "utf8"))

  assertNextBuildValues({
    artifacts: {
      buildId: existsSync(resolve(nextRoot, "BUILD_ID")),
      standaloneServer: existsSync(
        resolve(nextRoot, "standalone/apps/herbatika/server.js")
      ),
    },
    requiredServerFiles: readJson("required-server-files.json"),
    routesManifest: readJson("routes-manifest.json"),
  })
}

const entrypoint = process.argv[1]
const isEntrypoint =
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href

if (isEntrypoint) {
  assertActualNextBuild()
  process.stdout.write("Verified Next.js standalone production artifact\n")
}
