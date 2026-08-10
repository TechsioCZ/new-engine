import { describe, expect, it } from 'vitest'
import {
	buildPPLLabelFilename,
	collectPrintablePPLLabels,
	isAllowedStoredPPLLabelUrl,
	isPPLCarrierLabelUrl,
	resolvePPLLabelFileType,
	validatePPLLabelOrders
} from '../labels'

describe('PPL shipping labels', () => {
	it('collects active completed PPL labels in request order', () => {
		const orders = validatePPLLabelOrders([
			{
				display_id: 20,
				fulfillments: [
					{
						canceled_at: null,
						data: {
							label_url: 'https://files.example.test/labels/ppl-20.png',
							shipment_number: 'PPL/20',
							status: 'completed'
						},
						id: 'ful_20',
						provider_id: 'ppl_ppl'
					}
				],
				id: 'order_20'
			}
		])
		const labels = collectPrintablePPLLabels(['order_20'], orders)
		const label = labels[0]

		expect(labels).toHaveLength(1)
		expect(label).toBeDefined()

		if (!label) {
			throw new Error('Expected a printable PPL label')
		}

		expect(buildPPLLabelFilename(label, 'png')).toBe('ppl-label-PPL-20.png')
	})

	it('rejects orders without completed PPL labels', () => {
		const orders = validatePPLLabelOrders([{ fulfillments: [], id: 'order_1' }])

		expect(() => collectPrintablePPLLabels(['order_1'], orders)).toThrow('Orders without PPL shipping labels: order_1')
	})

	it('allows only URLs below the configured file base', () => {
		const allowedBaseUrls = ['https://files.example.test/medusa']

		expect(isAllowedStoredPPLLabelUrl('https://files.example.test/medusa/ppl-1.png', allowedBaseUrls)).toBe(true)
		expect(isAllowedStoredPPLLabelUrl('https://files.example.test/other/ppl-1.png', allowedBaseUrls)).toBe(false)
		expect(isAllowedStoredPPLLabelUrl('http://127.0.0.1/private', allowedBaseUrls)).toBe(false)
	})

	it('recognizes only PPL API label URLs', () => {
		expect(isPPLCarrierLabelUrl('https://api.dhl.com/ecs/ppl/myapi2/shipment/batch/1/label')).toBe(true)
		expect(isPPLCarrierLabelUrl('https://api.dhl.com.attacker.test/ecs/ppl/myapi2/label')).toBe(false)
	})

	it('resolves the response file type before the configured fallback', () => {
		expect(resolvePPLLabelFileType('application/pdf; charset=binary', 'Png', 'https://files.example.test/label')).toEqual({
			contentType: 'application/pdf',
			extension: 'pdf'
		})
		expect(resolvePPLLabelFileType(null, 'Svg', 'https://files.example.test/label')).toEqual({
			contentType: 'image/svg+xml',
			extension: 'svg'
		})
	})
})
