import type { Logger } from '@medusajs/framework/types'
import { describe, expect, it, vi } from 'vitest'
import type { GLSOptions, GLSShippingOptionData } from '../../gls-client/types'
import { buildGLSPacketAttributes } from '../helpers/packet-attributes'

const logger = { warn: vi.fn() } as unknown as Logger
const shippingAddress = {
	first_name: 'Test',
	last_name: 'Customer',
	address_1: 'Main Street 10',
	city: 'Bratislava',
	postal_code: '81101',
	country_code: 'SK',
	phone: '+421900000000'
}
const config = {} as GLSOptions

describe('buildGLSPacketAttributes', () => {
	it('creates a market-correct COD payload without rejecting valid binary decimals', async () => {
		const attributes = await buildGLSPacketAttributes({
			order: { id: 'order_1', display_id: 101, email: 'customer@example.test', total: 19.99, currency_code: 'eur' } as never,
			shippingAddress: shippingAddress as never,
			shippingData: shippingData(true),
			items: [],
			config,
			logger
		})

		expect(attributes).toMatchObject({ number: '101', cod: 19.99, currency: 'EUR', delivery_country: 'SK' })
	})

	it('does not add COD data to prepaid delivery', async () => {
		const attributes = await buildGLSPacketAttributes({
			order: { id: 'order_1', email: 'customer@example.test' } as never,
			shippingAddress: shippingAddress as never,
			shippingData: shippingData(false),
			items: [],
			config,
			logger
		})

		expect(attributes.cod).toBeUndefined()
		expect(attributes.currency).toBeUndefined()
	})

	it('rejects market currency mismatch and sub-minor-unit amounts', async () => {
		await expect(buildGLSPacketAttributes({
			order: { id: 'order_1', email: 'customer@example.test', total: 10, currency_code: 'czk' } as never,
			shippingAddress: shippingAddress as never,
			shippingData: shippingData(true),
			items: [],
			config,
			logger
		})).rejects.toThrow('currency does not match')

		await expect(buildGLSPacketAttributes({
			order: { id: 'order_1', email: 'customer@example.test', total: 10.001, currency_code: 'eur' } as never,
			shippingAddress: shippingAddress as never,
			shippingData: shippingData(true),
			items: [],
			config,
			logger
		})).rejects.toThrow('more than two decimal places')
	})

	it('requires a stable Medusa order identifier', async () => {
		await expect(buildGLSPacketAttributes({
			order: { email: 'customer@example.test' } as never,
			shippingAddress: shippingAddress as never,
			shippingData: shippingData(false),
			items: [],
			config,
			logger
		})).rejects.toThrow('stable order id')
	})
})

function shippingData(supportsCod: boolean): GLSShippingOptionData {
	return { code: supportsCod ? 'home_delivery_cod' : 'home_delivery', requires_access_point: false, supports_cod: supportsCod, weight: 1 }
}
