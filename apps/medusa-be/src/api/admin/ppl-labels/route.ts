import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import JSZip from 'jszip'
import { PPL_CLIENT_MODULE, type PplClientModuleService } from '../../../modules/ppl-client'
import {
	buildPPLLabelFilename,
	buildPPLLabelsArchiveFilename,
	collectPrintablePPLLabels,
	isAllowedStoredPPLLabelUrl,
	isPPLCarrierLabelUrl,
	resolvePPLLabelFileType,
	type PrintablePPLLabel,
	validatePPLLabelOrders
} from './labels'
import type { PostAdminPPLLabelsSchemaType } from './validators'

type DownloadedPPLLabel = {
	buffer: Buffer
	contentType: string
	extension: string
	label: PrintablePPLLabel
}

const PPL_LABEL_DOWNLOAD_CHUNK_SIZE = 10
const PPL_LABEL_DOWNLOAD_TIMEOUT_MS = 15 * 1000

export async function POST(request: MedusaRequest<PostAdminPPLLabelsSchemaType>, response: MedusaResponse): Promise<void> {
	const orderIds = request.validatedBody.order_ids
	const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
	const pplClient = process.env.FEATURE_PPL_ENABLED === '1' ? request.scope.resolve<PplClientModuleService>(PPL_CLIENT_MODULE) : null
	const { data: orders } = await query.graph({
		entity: 'order',
		fields: ['id', 'display_id', 'fulfillments.id', 'fulfillments.provider_id', 'fulfillments.canceled_at', 'fulfillments.data'],
		filters: { id: orderIds },
		pagination: { skip: 0, take: orderIds.length }
	})
	const labels = collectPrintablePPLLabels(orderIds, validatePPLLabelOrders(orders))
	const config = pplClient ? await pplClient.getConfig() : null
	const downloadedLabels = await downloadPPLLabels(labels, pplClient, config?.default_label_format ?? 'Png')

	if (downloadedLabels.length === 1 && downloadedLabels[0]) {
		const downloadedLabel = downloadedLabels[0]
		const filename = buildPPLLabelFilename(downloadedLabel.label, downloadedLabel.extension)

		response.set({
			'Content-Disposition': ['attachment; filename="', filename, '"'].join(''),
			'Content-Length': downloadedLabel.buffer.length,
			'Content-Type': downloadedLabel.contentType
		})
		response.send(downloadedLabel.buffer)
		return
	}

	const archive = new JSZip()

	for (const downloadedLabel of downloadedLabels) {
		archive.file(buildPPLLabelFilename(downloadedLabel.label, downloadedLabel.extension), downloadedLabel.buffer)
	}

	const buffer = await archive.generateAsync({ type: 'nodebuffer' })

	response.set({
		'Content-Disposition': ['attachment; filename="', buildPPLLabelsArchiveFilename(), '"'].join(''),
		'Content-Length': buffer.length,
		'Content-Type': 'application/zip'
	})
	response.send(buffer)
}

async function downloadPPLLabels(labels: PrintablePPLLabel[], pplClient: PplClientModuleService | null, configuredFormat: string): Promise<DownloadedPPLLabel[]> {
	const downloadedLabels: DownloadedPPLLabel[] = []

	for (let index = 0; index < labels.length; index += PPL_LABEL_DOWNLOAD_CHUNK_SIZE) {
		const chunk = labels.slice(index, index + PPL_LABEL_DOWNLOAD_CHUNK_SIZE)
		const downloadedChunk = await Promise.all(chunk.map((label) => downloadPPLLabel(label, pplClient, configuredFormat)))
		downloadedLabels.push(...downloadedChunk)
	}

	return downloadedLabels
}

async function downloadPPLLabel(label: PrintablePPLLabel, pplClient: PplClientModuleService | null, configuredFormat: string): Promise<DownloadedPPLLabel> {
	const allowedBaseUrls = getAllowedStoredFileBaseUrls()

	if (isAllowedStoredPPLLabelUrl(label.label_url, allowedBaseUrls)) {
		try {
			const fileResponse = await fetch(label.label_url, {
				redirect: 'error',
				signal: AbortSignal.timeout(PPL_LABEL_DOWNLOAD_TIMEOUT_MS)
			})

			if (fileResponse.ok) {
				const buffer = Buffer.from(await fileResponse.arrayBuffer())
				const fileType = resolvePPLLabelFileType(fileResponse.headers.get('content-type'), configuredFormat, label.label_url)
				return { buffer, contentType: fileType.contentType, extension: fileType.extension, label }
			}
		} catch {
			if (!label.ppl_label_url) {
				throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PPL: Stored shipping label could not be downloaded')
			}
		}

	}

	const carrierUrl = resolvePPLCarrierLabelUrl(label)

	if (!carrierUrl) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PPL: Stored label URL is outside the configured file storage')
	}

	if (!pplClient) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PPL: Stored shipping label is unavailable and the PPL integration is disabled')
	}

	const buffer = await pplClient.downloadLabel(carrierUrl)
	const fileType = resolvePPLLabelFileType(null, configuredFormat, carrierUrl)
	return { buffer, contentType: fileType.contentType, extension: fileType.extension, label }
}

function resolvePPLCarrierLabelUrl(label: PrintablePPLLabel): string | undefined {
	if (label.ppl_label_url && isPPLCarrierLabelUrl(label.ppl_label_url)) {
		return label.ppl_label_url
	}

	return isPPLCarrierLabelUrl(label.label_url) ? label.label_url : undefined
}

function getAllowedStoredFileBaseUrls(): string[] {
	const baseUrls = [process.env.MINIO_FILE_URL]
	const backendUrl = normalizeBackendUrl(process.env.MEDUSA_BACKEND_URL)

	if (backendUrl) {
		baseUrls.push([backendUrl, '/static'].join(''))
	}

	if (process.env.NODE_ENV !== 'production') {
		baseUrls.push('http://localhost:9000/static')
	}

	return baseUrls.filter((value): value is string => Boolean(value))
}

function normalizeBackendUrl(value: string | undefined): string | null {
	const trimmed = value?.trim()

	if (!trimmed) {
		return null
	}

	const normalized = trimmed.includes('://') ? trimmed : ['http://', trimmed].join('')

	try {
		const url = new URL(normalized)
		return url.origin
	} catch {
		return null
	}
}
