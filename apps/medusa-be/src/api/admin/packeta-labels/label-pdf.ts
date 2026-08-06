import { PDFDocument } from "pdf-lib"

import type { PacketaLabelFormat } from "../../../modules/packeta-client/types"

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const A4_LABEL_COLUMNS = 2
const A4_LABEL_ROWS = 2
const A4_LABELS_PER_PAGE = A4_LABEL_COLUMNS * A4_LABEL_ROWS

const isA4LikePage = (width: number, height: number) => {
  const tolerance = 2

  return (
    Math.abs(width - A4_WIDTH) <= tolerance &&
    Math.abs(height - A4_HEIGHT) <= tolerance
  )
}

const getSourceLabelBox = (
  sourceWidth: number,
  sourceHeight: number,
  labelFormat: PacketaLabelFormat | undefined,
) => {
  const shouldCrop =
    labelFormat === "A7" && isA4LikePage(sourceWidth, sourceHeight)

  return shouldCrop
    ? {
        bottom: sourceHeight / 2,
        left: 0,
        right: sourceWidth / 2,
        top: sourceHeight,
      }
    : undefined
}

const composePacketaLabelsOnA4 = async (
  labelPdfs: Buffer[],
  labelOffset: number,
  labelFormat: PacketaLabelFormat | undefined,
): Promise<Uint8Array> => {
  const [sourceLabels, mergedPdf] = await Promise.all([
    Promise.all(
      labelPdfs.map(async (labelPdf) => {
        const sourcePdf = await PDFDocument.load(labelPdf)
        const [sourcePage] = sourcePdf.getPages()

        if (sourcePage === undefined) {
          return null
        }

        const { height: sourceHeight, width: sourceWidth } =
          sourcePage.getSize()
        const sourceBox = getSourceLabelBox(
          sourceWidth,
          sourceHeight,
          labelFormat,
        )

        return { sourceBox, sourceHeight, sourcePage, sourceWidth }
      }),
    ),
    PDFDocument.create(),
  ])
  const preparedLabels = await Promise.all(
    sourceLabels.map(async (sourceLabel) => {
      if (sourceLabel === null) {
        return null
      }

      const embeddedPage = await mergedPdf.embedPage(
        sourceLabel.sourcePage,
        sourceLabel.sourceBox,
      )

      return { embeddedPage, ...sourceLabel }
    }),
  )
  const cellWidth = A4_WIDTH / A4_LABEL_COLUMNS
  const cellHeight = A4_HEIGHT / A4_LABEL_ROWS
  let currentPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT])
  let slot = labelOffset

  for (const preparedLabel of preparedLabels) {
    if (preparedLabel === null) {
      continue
    }

    if (slot >= A4_LABELS_PER_PAGE) {
      currentPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT])
      slot = 0
    }

    const { embeddedPage, sourceBox, sourceHeight, sourceWidth } = preparedLabel
    const sourceLabelWidth =
      sourceBox === undefined ? sourceWidth : sourceBox.right - sourceBox.left
    const sourceLabelHeight =
      sourceBox === undefined ? sourceHeight : sourceBox.top - sourceBox.bottom
    const scale = Math.min(
      cellWidth / sourceLabelWidth,
      cellHeight / sourceLabelHeight,
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

  return await mergedPdf.save()
}

export { composePacketaLabelsOnA4 }
