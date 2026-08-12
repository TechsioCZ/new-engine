import fs from "node:fs"
import path from "node:path"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

const MEDUSA_PROJECT_DIRS = [
  process.cwd(),
  path.join(process.cwd(), "apps/medusa-be"),
]
const ADMIN_PUBLIC_DIRS = MEDUSA_PROJECT_DIRS.flatMap((projectDir) => [
  path.join(projectDir, ".medusa/server/public/app"),
  path.join(projectDir, ".medusa/server/public/admin"),
  path.join(projectDir, ".medusa/admin"),
])
const APP_PATH_PREFIX_REGEX = /^\/app\/?/

const getAdminPublicDir = () =>
  ADMIN_PUBLIC_DIRS.find((dir) => fs.existsSync(path.join(dir, "index.html")))

const isPathInsideDirectory = (baseDir: string, filePath: string) => {
  const relative = path.relative(baseDir, filePath)

  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  )
}

const getRequestPath = (req: MedusaRequest) => {
  if ("originalUrl" in req && typeof req.originalUrl === "string") {
    return req.originalUrl.split("?")[0] ?? "/app"
  }

  if ("path" in req && typeof req.path === "string") {
    return req.path
  }

  return req.url.split("?")[0] ?? "/app"
}

const resolveAdminFile = (
  adminPublicDir: string,
  requestPath: string
): string | undefined => {
  const relativePath =
    requestPath === "/app" || requestPath === "/app/"
      ? "index.html"
      : requestPath.replace(APP_PATH_PREFIX_REGEX, "")
  const normalizedRelativePath = path.normalize(relativePath)

  if (
    normalizedRelativePath.startsWith("..") ||
    path.isAbsolute(normalizedRelativePath)
  ) {
    return
  }

  const requestedFile = path.resolve(adminPublicDir, normalizedRelativePath)

  if (!isPathInsideDirectory(adminPublicDir, requestedFile)) {
    return
  }

  if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
    return requestedFile
  }

  if (!path.extname(normalizedRelativePath)) {
    const indexFile = path.resolve(adminPublicDir, "index.html")
    return isPathInsideDirectory(adminPublicDir, indexFile)
      ? indexFile
      : undefined
  }

  return
}

export const serveAdminAppStatic = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const adminPublicDir = getAdminPublicDir()

  if (!adminPublicDir) {
    return next()
  }

  const filePath = resolveAdminFile(adminPublicDir, getRequestPath(req))

  if (!filePath) {
    return next()
  }

  res.sendFile(filePath)
}
