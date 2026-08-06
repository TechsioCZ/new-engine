import fs from "node:fs"
import path from "node:path"

import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

const ADMIN_PUBLIC_DIRS = [
  path.join(process.cwd(), ".medusa/server/public/app"),
  path.join(process.cwd(), ".medusa/server/public/admin"),
]
const ADMIN_INDEX_FILE = "index.html"
const APP_PATH_PREFIX_REGEX = /^\/app\/?/u

const getAdminPublicDir = () =>
  ADMIN_PUBLIC_DIRS.find((dir) =>
    fs.existsSync(path.join(dir, ADMIN_INDEX_FILE)),
  )

const isPathInsideDirectory = (baseDir: string, filePath: string) => {
  const relative = path.relative(baseDir, filePath)

  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  )
}

const getRequestPath = (req: MedusaRequest) => {
  if ("path" in req && typeof req.path === "string") {
    return req.path
  }

  return req.url.split("?")[0] ?? "/app"
}

const resolveAdminFile = (
  adminPublicDir: string,
  requestPath: string,
): string | undefined => {
  const relativePath =
    requestPath === "/app" || requestPath === "/app/"
      ? ADMIN_INDEX_FILE
      : requestPath.replace(APP_PATH_PREFIX_REGEX, "")
  const normalizedRelativePath = path.normalize(relativePath)

  if (
    normalizedRelativePath.startsWith("..") ||
    path.isAbsolute(normalizedRelativePath)
  ) {
    return undefined
  }

  const requestedFile = path.resolve(adminPublicDir, normalizedRelativePath)

  if (!isPathInsideDirectory(adminPublicDir, requestedFile)) {
    return undefined
  }

  if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
    return requestedFile
  }

  if (path.extname(normalizedRelativePath).length === 0) {
    const indexFile = path.resolve(adminPublicDir, ADMIN_INDEX_FILE)
    return isPathInsideDirectory(adminPublicDir, indexFile)
      ? indexFile
      : undefined
  }

  return undefined
}

export const serveAdminAppStatic = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) => {
  const adminPublicDir = getAdminPublicDir()

  if (adminPublicDir === undefined) {
    next()
    return
  }

  const filePath = resolveAdminFile(adminPublicDir, getRequestPath(req))

  if (filePath === undefined) {
    next()
    return
  }

  res.sendFile(filePath)
}
