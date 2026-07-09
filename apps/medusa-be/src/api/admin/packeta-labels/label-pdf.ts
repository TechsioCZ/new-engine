import { PDFDocument } from "pdf-lib"
import type { PacketaLabelFormat } from "../../../modules/packeta-client/types"

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const A4_LABEL_COLUMNS = 2
const A4_LABEL_ROWS = 2
const A4_LABELS_PER_PAGE = A4_LABEL_COLUMNS * A4_LABEL_ROWS

export async function composePacketaLabelsOnA4(
  labelPdfs: Buffer[],
  labelOffset: number,
  labelFormat: PacketaLabelFormat | undefined
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  const cellWidth = A4_WIDTH / A4_LABEL_COLUMNS
  const cellHeight = A4_HEIGHT / A4_LABEL_ROWS
  let currentPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT])
  let slot = labelOffset

  for (const labelPdf of labelPdfs) {
    if (slot >= A4_LABELS_PER_PAGE) {
      currentPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT])
      slot = 0
    }

    const sourcePdf = await PDFDocument.load(labelPdf)
    const sourcePage = sourcePdf.getPages()[0]

    if (!sourcePage) {
      continue
    }

    const { height: sourceHeight, width: sourceWidth } = sourcePage.getSize()
    const sourceBox = getSourceLabelBox(sourceWidth, sourceHeight, labelFormat)
    const embeddedPage = await mergedPdf.embedPage(sourcePage, sourceBox)
    const sourceLabelWidth = sourceBox
      ? sourceBox.right - sourceBox.left
      : sourceWidth
    const sourceLabelHeight = sourceBox
      ? sourceBox.top - sourceBox.bottom
      : sourceHeight
    const scale = Math.min(
      cellWidth / sourceLabelWidth,
      cellHeight / sourceLabelHeight
    )
    const width = sourceLabelWidth * scale
    const height = sourceLabelHeight * scale
    const column = slot % A4_LABEL_COLUMNS
    const row = Math.floor(slot / A4_LABEL_COLUMNS)
    const x = column * cellWidth + (cellWidth - width) / 2
    const y = A4_HEIGHT - (row + 1) * cellHeight + (cellHeight - height) / 2

    currentPage.drawPage(embeddedPage, {
      height,
      width,
      x,
      y,
    })

    slot += 1
  }

  return mergedPdf.save()
}

function getSourceLabelBox(
  sourceWidth: number,
  sourceHeight: number,
  labelFormat: PacketaLabelFormat | undefined
) {
  if (labelFormat !== "A7" || !isA4LikePage(sourceWidth, sourceHeight)) {
    return
  }

  return {
    bottom: sourceHeight / 2,
    left: 0,
    right: sourceWidth / 2,
    top: sourceHeight,
  }
}

function isA4LikePage(width: number, height: number) {
  const tolerance = 2

  return (
    Math.abs(width - A4_WIDTH) <= tolerance &&
    Math.abs(height - A4_HEIGHT) <= tolerance
  )
}
