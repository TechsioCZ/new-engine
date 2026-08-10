import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GLSClient } from '../client'
import type { GLSOptions } from '../types'

const options: GLSOptions = {
	config_id: 'config_testing',
	username: 'local-test',
	password: 'local-test',
	client_number: 1,
	environment: 'testing',
	country_code: 'SK',
	supported_countries: ['SK', 'CZ', 'HU', 'RO'],
	type_of_printer: 'A4_2x2',
	print_position: 1,
	hide_phone_number_on_labels: false,
	sender_name: 'Sender',
	sender_street: 'Street',
	sender_house_number: '1',
	sender_city: 'City',
	sender_zip_code: '01001',
	sender_country: 'SK'
}
const DOT_NET_DATE_REGEX = /^\/Date\(\d+\)\/$/

afterEach(() => vi.unstubAllGlobals())

describe('GLSClient', () => {
	it('requests and returns only active delivery points for the requested country', async () => {
		const points = [
			{ Id: 1, IsActive: true, Matchcode: 'SK-ONE', Address: { Name: 'One', Street: 'Main', City: 'Zilina', ZipCode: '01001', CountryIsoCode: 'SK' } },
			{ Id: 2, IsActive: false, Matchcode: 'SK-TWO', Address: { Name: 'Two', Street: 'Main', City: 'Zilina', ZipCode: '01001', CountryIsoCode: 'SK' } },
			{ IsActive: true, Matchcode: '', Address: { Name: 'Empty', Street: 'Main', City: 'Zilina', ZipCode: '01001', CountryIsoCode: 'SK' } },
			{ Id: 4, IsActive: true, Matchcode: 'CZ-ONE', Address: { Name: 'Wrong', Street: 'Main', City: 'Brno', ZipCode: '60200', CountryIsoCode: 'CZ' } }
		]
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ErrorCode: 0, Data: Array.from(gzipSync(JSON.stringify(points))) }))
		vi.stubGlobal('fetch', fetchMock)

		const branches = await new GLSClient(options).getBranchList('SK')

		expect(branches.map((branch) => branch.id)).toEqual(['SK-ONE'])
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ CountryIsoCode: 'SK' })
	})

	it('recovers one exact parcel by stable client reference', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ PrintDataInfoList: [
			{ ClientReference: 'OTHER', ParcelId: 10, ParcelNumber: 100, ParcelNumberWithCheckdigit: 1001 },
			{ ClientReference: 'NE-ONE', ParcelId: 11, ParcelNumber: 110, ParcelNumberWithCheckdigit: 1101 }
		] }))
		vi.stubGlobal('fetch', fetchMock)

		const packet = await new GLSClient(options).findPacketByClientReference('NE-ONE', new Date('2026-08-09T00:00:00.000Z'))

		expect(packet).toEqual({ id: 11, parcel_number: '110', barcode: '1101', barcodeText: '1101' })
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(expect.objectContaining({ PrintDateFrom: expect.stringMatching(DOT_NET_DATE_REGEX), PrintDateTo: expect.stringMatching(DOT_NET_DATE_REGEX) }))
	})

	it('stops when reconciliation finds duplicate carrier references', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ PrintDataInfoList: [
			{ ClientReference: 'NE-DUPLICATE', ParcelId: 10, ParcelNumber: 100 },
			{ ClientReference: 'NE-DUPLICATE', ParcelId: 11, ParcelNumber: 110 }
		] })))

		await expect(new GLSClient(options).findPacketByClientReference('NE-DUPLICATE', new Date())).rejects.toThrow('manual reconciliation is required')
	})

	it('does not retry the carrier parcel creation write', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('temporary failure', { status: 503 }))
		vi.stubGlobal('fetch', fetchMock)

		await expect(new GLSClient(options).createPacket({ number: 'NE-ONE', name: 'A', surname: 'B', email: 'a@example.test', phone: '+421900000000', delivery_street: 'Street', delivery_house_number: '1', delivery_city: 'City', delivery_zip_code: '01001', delivery_country: 'SK' })).rejects.toThrow('503 - temporary failure')
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})

function jsonResponse(value: unknown): Response {
	return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}
