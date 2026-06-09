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
const APP_PATH_PREFIX_REGEX = /^\/app\/?/

const getAdminPublicDir = () =>
  ADMIN_PUBLIC_DIRS.find((dir) => fs.existsSync(path.join(dir, "index.html")))

const getRequestPath = (req: MedusaRequest) => {
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

  const requestedFile = path.join(adminPublicDir, normalizedRelativePath)

  if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
    return requestedFile
  }

  if (!path.extname(normalizedRelativePath)) {
    return path.join(adminPublicDir, "index.html")
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
