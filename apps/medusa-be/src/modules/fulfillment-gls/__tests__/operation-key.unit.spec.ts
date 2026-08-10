import { describe, expect, it, vi } from 'vitest'
import { buildGLSFulfillmentOperationIdentity, resolveOrderFulfillmentIds } from '../helpers/operation-key'

const CLIENT_REFERENCE_REGEX = /^NE-[a-f0-9]{32}$/
const attributes = {
	number: 'order-one',
	name: 'A',
	surname: 'B',
	email: 'a@example.test',
	phone: '+421900000000',
	delivery_street: 'Street',
	delivery_house_number: '1',
	delivery_city: 'City',
	delivery_zip_code: '01001',
	delivery_country: 'SK'
}

describe('buildGLSFulfillmentOperationIdentity', () => {
	it('is stable when Medusa supplies fulfillment items in a different order', () => {
		const first = buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes, items: [
			{ line_item_id: 'item_2', quantity: 2 },
			{ line_item_id: 'item_1', quantity: 1 }
		] })
		const second = buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes, items: [
			{ line_item_id: 'item_1', quantity: 1 },
			{ line_item_id: 'item_2', quantity: 2 }
		] })

		expect(second).toEqual(first)
		expect(first.clientReference).toMatch(CLIENT_REFERENCE_REGEX)
	})

	it('changes across orders, environments, items, and quantities', () => {
		const baseline = buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes, items: [{ line_item_id: 'item_1', quantity: 1 }] })
		const alternatives = [
			buildGLSFulfillmentOperationIdentity({ environment: 'production', orderId: 'order_1', attributes, items: [{ line_item_id: 'item_1', quantity: 1 }] }),
			buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_2', attributes, items: [{ line_item_id: 'item_1', quantity: 1 }] }),
			buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes, items: [{ line_item_id: 'item_2', quantity: 1 }] }),
			buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes, items: [{ line_item_id: 'item_1', quantity: 2 }] }),
			buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes: { ...attributes, addressId: 'parcelshop-two' }, items: [{ line_item_id: 'item_1', quantity: 1 }] })
		]

		expect(new Set(alternatives.map((alternative) => alternative.operationKey)).size).toBe(alternatives.length)
		expect(alternatives.every((alternative) => alternative.operationKey !== baseline.operationKey)).toBe(true)
	})

	it('does not change when recalculated carrier attributes change during recovery', () => {
		const baseline = buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes: { ...attributes, weight: 1, content: 'Original' }, items: [{ line_item_id: 'item_1', quantity: 1 }] })
		const recalculated = buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes: { ...attributes, weight: 2, content: 'Updated' }, items: [{ line_item_id: 'item_1', quantity: 1 }] })

		expect(recalculated).toEqual(baseline)
	})

	it('rejects incomplete fulfillment items', () => {
		expect(() => buildGLSFulfillmentOperationIdentity({ environment: 'testing', orderId: 'order_1', attributes, items: [{ quantity: 1 }] })).toThrow('line_item_id and quantity')
	})

	it('resolves the existing Medusa fulfillments that distinguish a new parcel from a retry', async () => {
		const query = { graph: vi.fn().mockResolvedValue({ data: [{ id: 'order_1', fulfillments: [{ id: 'ful_1' }, { id: 'ful_2' }, { id: 'ful_1' }] }] }) }

		await expect(resolveOrderFulfillmentIds(query, 'order_1')).resolves.toEqual(['ful_1', 'ful_2'])
	})
})
