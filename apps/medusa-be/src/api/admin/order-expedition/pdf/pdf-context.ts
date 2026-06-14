import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import fontkit from "fontkit"
import { PageSizes, PDFDocument } from "pdf-lib"
import type { PostAdminOrderExpeditionPdfSchemaType } from "../validators"
import type { DrawState } from "./types"

const HEADER_Y = PageSizes.A4[1] - 20
const FONT_SEARCH_DIRS = [
  join(process.cwd(), ".medusa/server/public/admin/assets"),
  join(process.cwd(), "apps/medusa-be/.medusa/server/public/admin/assets"),
]
const FONT_SEARCH_PREFIXES = {
  bold: ["Inter-Bold", "Inter-Medium"],
  regular: ["Inter-Regular", "Inter-Medium"],
} as const

export async function createExpeditionPdfContext(
  req: MedusaRequest<PostAdminOrderExpeditionPdfSchemaType>
) {
  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  document.setTitle("Přehled objednávek")
  const [regularFontBytes, boldFontBytes] = await Promise.all([
    readPdfFontBytes(FONT_SEARCH_PREFIXES.regular),
    readPdfFontBytes(FONT_SEARCH_PREFIXES.bold),
  ])
  const regularFont = await document.embedFont(regularFontBytes)
  const boldFont = await document.embedFont(boldFontBytes)

  return {
    document,
    state: {
      boldFont,
      barcodeCache: new Map(),
      document,
      imageCache: new Map(),
      page: document.addPage(PageSizes.A4),
      pageNumber: 1,
      regularFont,
      title: "Přehled objednávek",
      url: `${req.protocol}://${req.get("host")}/admin/order-expedition/pdf`,
      y: HEADER_Y - 28,
    } satisfies DrawState,
  }
}

async function readPdfFontBytes(prefixes: readonly string[]) {
  for (const fontDir of FONT_SEARCH_DIRS) {
    try {
      const entries = await readdir(fontDir, { withFileTypes: true })
      const fontFile = entries.find(
        (entry) =>
          entry.isFile() &&
          prefixes.some((prefix) => entry.name.startsWith(prefix)) &&
          entry.name.endsWith(".ttf")
      )

      if (fontFile) {
        return readFile(join(fontDir, fontFile.name))
      }
    } catch {
      // try next font directory
    }
  }

  throw new MedusaError(
    MedusaError.Types.NOT_FOUND,
    `PDF font not found for prefixes: ${prefixes.join(", ")}`
  )
}
