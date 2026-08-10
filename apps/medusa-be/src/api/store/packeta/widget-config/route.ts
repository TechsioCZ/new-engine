import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PACKETA_CLIENT_MODULE, type PacketaClientModuleService } from '../../../../modules/packeta-client'
import type { PacketaWidgetCountry } from '../../../../modules/packeta-client/types'
import { safeResolve } from '../../../../utils/safe-resolve'

type PacketaWidgetConfigResponse = {
	enabled: boolean
	api_key: string | null
	countries: PacketaWidgetCountry[]
}

export async function GET(request: MedusaRequest, response: MedusaResponse<PacketaWidgetConfigResponse>) {
	const packetaService = safeResolve<PacketaClientModuleService>(request.scope, PACKETA_CLIENT_MODULE)
	if (!packetaService) {
		return response.json({ enabled: false, api_key: null, countries: [] })
	}

	const config = await packetaService.getActiveConfig()
	const apiKey = config.widget_api_key?.trim() ?? ''
	const configuredCountries = Array.from(new Set(config.widget_countries))
	const enabled = config.is_enabled && apiKey.length > 0 && configuredCountries.length > 0
	const api_key = enabled ? apiKey : null
	const countries = enabled ? configuredCountries : []

	response.setHeader('Cache-Control', 'no-store')
	return response.json({ enabled, api_key, countries })
}
