import { describe, expect, it } from 'vitest'
import { getShippingLabelCarrierSelection, prepareShippingLabelDownload } from './shipping-labels'
import type { OrderDashboardCarrierKey, OrderDashboardLabelEligibilityOrder, OrderDashboardOrder } from './types'

const translate = (key: string) => key

describe('shipping label preparation', () => {
	it('rejects a selection containing multiple carriers', () => {
		const result = prepareShippingLabelDownload([createOrder('order-gls', 'gls'), createOrder('order-ppl', 'ppl')], [], translate)

		expect(result).toEqual({ carriers: ['gls', 'ppl'], kind: 'mixed-carriers' })
	})

	it('derives the selected carrier', () => {
		expect(getShippingLabelCarrierSelection([createOrder('order-packeta', 'packeta')])).toEqual({ carrier: 'packeta', kind: 'supported' })
	})

	it('prepares valid Packeta labels', () => {
		const result = prepareShippingLabelDownload(
			[createOrder('order-packeta', 'packeta')],
			[createEligibilityOrder('order-packeta', 'packeta_packeta', { packet_id: 123 })],
			translate
		)

		expect(result).toMatchObject({ carrier: 'packeta', kind: 'ready', orderIds: ['order-packeta'] })
	})

	it('requires complete GLS fulfillment identity', () => {
		const selectedOrders = [createOrder('order-gls-ready', 'gls'), createOrder('order-gls-missing', 'gls')]
		const eligibilityOrders = [
			createEligibilityOrder('order-gls-ready', 'gls_gls', {
				barcode: 'GLS-1',
				config_id: 'glscfg_1',
				environment: 'testing',
				packet_id: 'packet-1'
			}),
			createEligibilityOrder('order-gls-missing', 'gls_gls', { packet_id: 'packet-2' })
		]
		const result = prepareShippingLabelDownload(selectedOrders, eligibilityOrders, translate)

		expect(result).toMatchObject({ carrier: 'gls', kind: 'ready', orderIds: ['order-gls-ready'] })
		expect('blockingOrders' in result ? result.blockingOrders : []).toHaveLength(1)
	})

	it('requires a completed stored PPL label', () => {
		const selectedOrders = [createOrder('order-ppl-ready', 'ppl'), createOrder('order-ppl-pending', 'ppl')]
		const eligibilityOrders = [
			createEligibilityOrder('order-ppl-ready', 'ppl_ppl', {
				label_url: 'https://files.example.test/ppl-label-1.png',
				shipment_number: 'PPL-1',
				status: 'completed'
			}),
			createEligibilityOrder('order-ppl-pending', 'ppl_ppl', { status: 'pending' })
		]
		const result = prepareShippingLabelDownload(selectedOrders, eligibilityOrders, translate)

		expect(result).toMatchObject({ carrier: 'ppl', kind: 'ready', orderIds: ['order-ppl-ready'] })
		expect('blockingOrders' in result ? result.blockingOrders : []).toHaveLength(1)
	})
})

function createOrder(id: string, carrier: OrderDashboardCarrierKey): OrderDashboardOrder {
	return {
		business_status: { id: 'new', priority: 1, tone: 'blue', translation_key: 'statuses.new' },
		carrier: { label: carrier, value: carrier },
		customer: 'Customer',
		delivery_address: [],
		has_active_fulfillment: true,
		id,
		items: [],
		order_display_id: id,
		payment_method: null
	}
}

function createEligibilityOrder(id: string, providerId: string, data: Record<string, unknown>): OrderDashboardLabelEligibilityOrder {
	return {
		fulfillments: [{ canceled_at: null, data, id: ['fulfillment-', id].join(''), provider_id: providerId }],
		id
	}
}
