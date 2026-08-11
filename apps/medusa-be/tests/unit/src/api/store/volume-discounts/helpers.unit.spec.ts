import type { ComputeActions, IPromotionModuleService } from '@medusajs/framework/types'
import { describe, expect, it, vi } from 'vitest'
import {
	resolveApplicableVolumeDiscountTiers,
	resolveExactSalesChannelId,
	resolveMinimumQuantity,
	toVolumeDiscountCandidate,
	type VolumeDiscountPromotionRecord
} from '../../../../../../src/api/store/volume-discounts/helpers'

describe('resolveExactSalesChannelId', () => {
	it('accepts one unique publishable-key-authorized Sales Channel', () => {
		expect(resolveExactSalesChannelId(['sc_sk', 'sc_sk'])).toBe('sc_sk')
	})

	it('rejects missing or ambiguous market scope', () => {
		expect(() => resolveExactSalesChannelId(undefined)).toThrow('An exact Sales Channel is required')
		expect(() => resolveExactSalesChannelId(['sc_sk', 'sc_cz'])).toThrow('An exact Sales Channel is required')
	})
})

const createPromotion = (options: { code: string; id: string; minimumQuantity: number; percentage: number }): VolumeDiscountPromotionRecord => ({
	id: options.id,
	code: options.code,
	application_method: {
		type: 'percentage',
		target_type: 'items',
		allocation: 'each',
		value: options.percentage,
		target_rules: [{ attribute: 'items.quantity', operator: 'gte', values: [{ value: options.minimumQuantity }] }]
	}
})

const createContext = () => ({
	currency_code: 'eur',
	region: { id: 'reg_sk' },
	shipping_address: { country_code: 'sk' },
	sales_channel_id: 'sc_sk',
	customer: { id: 'cus_1', groups: [{ id: 'cgrp_1' }] },
	item: {
		id: 'preview-variant_1',
		is_discountable: true,
		variant_id: 'variant_1',
		product_id: 'prod_1',
		product: { id: 'prod_1', categories: [{ id: 'pcat_1' }], tags: [] }
	},
	unitAmount: 1000
})

describe('resolveMinimumQuantity', () => {
	it('uses the strongest inclusive or exclusive lower bound', () => {
		expect(resolveMinimumQuantity([
			{ attribute: 'items.quantity', operator: 'gte', values: [{ value: 3 }] },
			{ attribute: 'items.quantity', operator: 'gt', values: [{ value: 4 }] },
			{ attribute: 'items.quantity', operator: 'lte', values: [{ value: 8 }] }
		])).toBe(5)
	})

	it('rejects promotions without a valid volume threshold', () => {
		expect(resolveMinimumQuantity([{ attribute: 'items.quantity', operator: 'gte', values: [{ value: 1 }] }])).toBeNull()
		expect(resolveMinimumQuantity([{ attribute: 'items.variant_id', operator: 'eq', values: [{ value: 'variant_1' }] }])).toBeNull()
	})
})

describe('toVolumeDiscountCandidate', () => {
	it('accepts only percentage item promotions allocated per item', () => {
		const validPromotion = createPromotion({ code: 'VOLUME-3', id: 'promo_3', minimumQuantity: 3, percentage: 7 })
		const fixedPromotion = createPromotion({ code: 'FIXED', id: 'promo_fixed', minimumQuantity: 2, percentage: 10 })

		expect(toVolumeDiscountCandidate(validPromotion)).toEqual({
			code: 'VOLUME-3',
			promotion_id: 'promo_3',
			minimum_quantity: 3,
			percentage: 7
		})

		expect(toVolumeDiscountCandidate({ ...fixedPromotion, application_method: { ...fixedPromotion.application_method, type: 'fixed' } })).toBeNull()
	})
})

describe('resolveApplicableVolumeDiscountTiers', () => {
	it('uses Medusa to evaluate the exact market and customer context', async () => {
		const computeActions = vi.fn(async (_codes: string[], context: { items?: Array<{ id: string }> }) => [
			{ action: 'addItemAdjustment', amount: 300, code: 'VOLUME-3', item_id: context.items?.[0]?.id ?? '' }
		] as ComputeActions[])
		const promotionService = { computeActions } as Pick<IPromotionModuleService, 'computeActions'>
		const promotion = createPromotion({ code: 'VOLUME-3', id: 'promo_3', minimumQuantity: 3, percentage: 10 })
		const tiers = await resolveApplicableVolumeDiscountTiers(promotionService, [promotion], createContext())

		expect(tiers).toEqual([{
			promotion_id: 'promo_3',
			minimum_quantity: 3,
			percentage: 10,
			unit_amount: 900,
			total_amount: 2700,
			currency_code: 'eur'
		}])
		expect(computeActions).toHaveBeenCalledWith(['VOLUME-3'], expect.objectContaining({
			currency_code: 'eur',
			region: { id: 'reg_sk' },
			sales_channel_id: 'sc_sk',
			customer: { id: 'cus_1', groups: [{ id: 'cgrp_1' }] },
			items: [expect.objectContaining({ quantity: 3, subtotal: 3000, original_total: 3000, variant_id: 'variant_1' })]
		}), { prevent_auto_promotions: true })
	})

	it('omits tiers that Medusa rejects for the current context', async () => {
		const computeActions = vi.fn(async () => [] as ComputeActions[])
		const promotionService = { computeActions } as Pick<IPromotionModuleService, 'computeActions'>
		const promotion = createPromotion({ code: 'CZ-ONLY', id: 'promo_cz', minimumQuantity: 2, percentage: 5 })
		const tiers = await resolveApplicableVolumeDiscountTiers(promotionService, [promotion], createContext())

		expect(tiers).toEqual([])
	})

	it('keeps the strongest applicable promotion for one threshold and sorts tiers', async () => {
		const computeActions = vi.fn(async (codes: string[], context: { items?: Array<{ id: string }> }) => [
			{ action: 'addItemAdjustment', amount: 100, code: codes[0] ?? '', item_id: context.items?.[0]?.id ?? '' }
		] as ComputeActions[])
		const promotionService = { computeActions } as Pick<IPromotionModuleService, 'computeActions'>
		const promotions = [
			createPromotion({ code: 'VOLUME-5', id: 'promo_5', minimumQuantity: 5, percentage: 12 }),
			createPromotion({ code: 'VOLUME-2-A', id: 'promo_2a', minimumQuantity: 2, percentage: 4 }),
			createPromotion({ code: 'VOLUME-2-B', id: 'promo_2b', minimumQuantity: 2, percentage: 6 })
		]
		const tiers = await resolveApplicableVolumeDiscountTiers(promotionService, promotions, createContext())

		expect(tiers).toEqual([
			{ promotion_id: 'promo_2b', minimum_quantity: 2, percentage: 6, unit_amount: 950, total_amount: 1900, currency_code: 'eur' },
			{ promotion_id: 'promo_5', minimum_quantity: 5, percentage: 12, unit_amount: 980, total_amount: 4900, currency_code: 'eur' }
		])
	})
})
