import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import fontkit from "@pdf-lib/fontkit"
import { PageSizes, PDFDocument, StandardFonts } from "pdf-lib"

import type { DrawState } from "./types"

const HEADER_Y = PageSizes.A4[1] - 20
const FONT_SEARCH_DIRS = [
  path.join(process.cwd(), ".medusa/server/public/admin/assets"),
  path.join(process.cwd(), "apps/medusa-be/.medusa/server/public/admin/assets"),
]
const FONT_SEARCH_PREFIXES = {
  bold: ["Inter-Bold", "Inter-Medium"],
  regular: ["Inter-Regular", "Inter-Medium"],
} as const

const readPdfFontBytes = async (prefixes: readonly string[]) => {
  const directoryResults = await Promise.allSettled(
    FONT_SEARCH_DIRS.map(
      async (fontDir) => await readdir(fontDir, { withFileTypes: true }),
    ),
  )
  const fontPath = directoryResults
    .flatMap((result, index) => {
      if (result.status === "rejected") {
        return []
      }

      const fontDir = FONT_SEARCH_DIRS[index]
      if (fontDir === undefined) {
        return []
      }

      return result.value.map((entry) => ({ entry, fontDir }))
    })
    .find(
      ({ entry }) =>
        entry.isFile() &&
        prefixes.some((prefix) => entry.name.startsWith(prefix)) &&
        entry.name.endsWith(".ttf"),
    )

  return fontPath === undefined
    ? null
    : await readFile(path.join(fontPath.fontDir, fontPath.entry.name))
}

export const createExpeditionPdfContext = async (url: string) => {
  const document = await PDFDocument.create()
  document.registerFontkit?.(fontkit)
  document.setTitle?.("Přehled objednávek")
  const [regularFontBytes, boldFontBytes] = await Promise.all([
    readPdfFontBytes(FONT_SEARCH_PREFIXES.regular),
    readPdfFontBytes(FONT_SEARCH_PREFIXES.bold),
  ])
  const regularFont = regularFontBytes
    ? await document.embedFont(regularFontBytes)
    : await document.embedFont(StandardFonts.Helvetica)
  const boldFont = boldFontBytes
    ? await document.embedFont(boldFontBytes)
    : await document.embedFont(StandardFonts.HelveticaBold)

  return {
    document,
    state: {
      barcodeCache: new Map(),
      boldFont,
      document,
      imageCache: new Map(),
      page: document.addPage(PageSizes.A4),
      pageNumber: 1,
      regularFont,
      title: "Přehled objednávek",
      url,
      y: HEADER_Y - 28,
    } satisfies DrawState,
  }
}
