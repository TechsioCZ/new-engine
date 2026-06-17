import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib"

type DrawState = {
  boldFont: PDFFont
  barcodeCache: Map<string, null | PDFImage>
  document: PDFDocument
  imageCache: Map<string, null | PDFImage>
  page: PDFPage
  pageNumber: number
  regularFont: PDFFont
  title: string
  url: string
  y: number
}

export type { DrawState }
