import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { getPayload } from "payload"
import {
  articleImportUsage,
  type ArticleImportOptions,
  type ArticleImportResult,
  getArticleImportCliOptions,
  runImportFromFile,
} from "./article-importer"
import {
  convertArticleWorkbook,
  inspectArticleWorkbook,
  resolveArticleEditorConfig,
  resolveArticleMediaManifestPath,
} from "./article-xlsx-converter"

export type ArticleImportPipelineOptions = ArticleImportOptions & {
  editorConfig?: unknown
}

export type ArticleImportPipelineResult = ArticleImportResult & {
  sourceFormat: "raw" | "richtext"
}

const createCliPayload = async () => {
  const { default: config } = await import("../payload.config")
  return getPayload({ config })
}

export const runArticleImportPipeline = async ({
  editorConfig,
  ...options
}: ArticleImportPipelineOptions): Promise<ArticleImportPipelineResult> => {
  const ownsPayload = !options.payload
  const payload = options.payload ?? (await createCliPayload())

  try {
    const sourcePath = path.resolve(process.cwd(), options.filePath)
    const inspection = await inspectArticleWorkbook(sourcePath, options.sheetName)

    if (inspection.format === "richtext") {
      const defaultManifestPath = resolveArticleMediaManifestPath(sourcePath)
      const mediaManifestPath = path.resolve(
        process.cwd(),
        options.mediaManifestPath ?? defaultManifestPath
      )
      if (inspection.requiresMediaManifest && !existsSync(mediaManifestPath)) {
        throw new Error(
          `Converted workbook requires media manifest: ${mediaManifestPath}`
        )
      }

      const result = await runImportFromFile({
        ...options,
        payload,
        filePath: sourcePath,
        sheetName: inspection.sheetName,
        ...(existsSync(mediaManifestPath) ? { mediaManifestPath } : {}),
      })
      return { ...result, sourceFormat: inspection.format }
    }

    if (options.mediaManifestPath) {
      throw new Error(
        "A media manifest can only be supplied with an explicitly converted workbook"
      )
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "payload-article-import-"))
    const resolvedEditorConfig =
      editorConfig ?? resolveArticleEditorConfig(payload.config.collections)
    try {
      const conversion = await convertArticleWorkbook({
        sourcePath,
        outputPath: path.join(tempDir, "articles.richtext.xlsx"),
        editorConfig: resolvedEditorConfig,
        sheetName: inspection.sheetName,
        signal: options.signal,
      })
      const result = await runImportFromFile({
        ...options,
        payload,
        filePath: conversion.outputPath,
        mediaManifestPath: conversion.mediaManifestPath,
        sheetName: inspection.sheetName,
      })
      return { ...result, sourceFormat: inspection.format }
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  } finally {
    if (ownsPayload) {
      await payload.destroy()
    }
  }
}

export const runArticleImportPipelineFromCli = async () => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(articleImportUsage)
    return
  }

  const options = getArticleImportCliOptions()
  if (!options.filePath) {
    console.log(articleImportUsage)
    throw new Error("Missing XLSX file path")
  }

  const result = await runArticleImportPipeline({
    ...options,
    filePath: options.filePath,
  })
  console.log(
    `Finished. Imported: ${result.imported}. Failed: ${result.failed}. Skipped: ${result.skipped}. Media placeholders: ${result.mediaFallbacks}. Related links: ${result.relatedArticleLinks}. Unresolved related slugs: ${result.unresolvedRelatedArticleSlugs.length}.`
  )

  if (result.failed > 0) {
    throw new Error(`Article import failed for ${result.failed} row(s)`)
  }
}
