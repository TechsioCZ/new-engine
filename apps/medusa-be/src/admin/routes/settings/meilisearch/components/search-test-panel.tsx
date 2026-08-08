import { Button, Heading, Input, Label, Select, Table, Text, toast } from '@medusajs/ui'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { type SearchIndexType, type SearchProfile, type SearchTestResult, testSearchProfile } from '../../../../lib/search-profiles'

const INDEX_TYPES: SearchIndexType[] = ['product', 'category', 'brand', 'content']

const hitLabel = (hit: Record<string, unknown>): string => {
	for (const field of ['title', 'name', 'handle', 'href', 'id']) {
		const value = hit[field]

		if (typeof value === 'string' && value) {
			return value
		}
	}

	return 'Untitled result'
}

const hitId = (hit: Record<string, unknown>, index: number): string => {
	const value = hit.id

	return typeof value === 'string' || typeof value === 'number' ? String(value) : 'result-' + index
}

export const SearchTestPanel = ({ profiles }: { profiles: SearchProfile[] }) => {
	const assignedProfiles = profiles.filter((profile) => profile.sales_channel_ids.length > 0)
	const defaultProfile = assignedProfiles[0]
	const [profileId, setProfileId] = useState(defaultProfile?.id ?? '')
	const [type, setType] = useState<SearchIndexType>('product')
	const [query, setQuery] = useState('')
	const [result, setResult] = useState<SearchTestResult>()

	useEffect(() => {
		if (!profiles.some((profile) => profile.id === profileId)) {
			setProfileId(defaultProfile?.id ?? '')
		}
	}, [defaultProfile?.id, profileId, profiles])

	const mutationOptions = {
		mutationFn: () => testSearchProfile(profileId, { query: query, type: type, limit: 10 }),

		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : 'Search testing failed.')
		},

		onSuccess: (data: SearchTestResult) => {
			setResult(data)
			toast.success('Search returned ' + data.hits.length + ' accepted result(s).')
		}
	}

	const mutation = useMutation(mutationOptions)

	return (
		<div className = 'flex flex-col gap-4 px-6 py-5'>
			<div>
				<Heading
					level = 'h2'
				>
					Search testing
				</Heading>

				<Text
					className = 'text-ui-fg-subtle'
					size = 'small'
				>
					Query the exact index and relevance policy selected for a storefront profile. An empty product query tests popular-product ordering.
				</Text>
			</div>

			<div className = 'grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_2fr_auto] md:items-end'>
				<div className = 'flex flex-col gap-2'>
					<Label
						htmlFor = 'search-test-profile'
					>
						Profile
					</Label>

					<Select
						value = { profileId }

						onValueChange = {
							setProfileId
						}
					>
						<Select.Trigger
							id = 'search-test-profile'
						>
							<Select.Value
								placeholder = 'Select a profile'
							/>
						</Select.Trigger>

						<Select.Content>
							{
								assignedProfiles.map((profile) => (
									<Select.Item
										key = { profile.id }
										value = { profile.id }
									>
										{ profile.key }
									</Select.Item>
								))
							}
						</Select.Content>
					</Select>
				</div>

				<div className = 'flex flex-col gap-2'>
					<Label
						htmlFor = 'search-test-type'
					>
						Index type
					</Label>

					<Select
						value = { type }

						onValueChange = {
							(value) => setType(value as SearchIndexType)
						}
					>
						<Select.Trigger
							id = 'search-test-type'
						>
							<Select.Value />
						</Select.Trigger>

						<Select.Content>
							{
								INDEX_TYPES.map((indexType) => (
									<Select.Item
										key = { indexType }
										value = { indexType }
									>
										{ indexType[0]?.toUpperCase() }
										{ indexType.slice(1) }
									</Select.Item>
								))
							}
						</Select.Content>
					</Select>
				</div>

				<div className = 'flex flex-col gap-2'>
					<Label
						htmlFor = 'search-test-query'
					>
						Query
					</Label>

					<Input
						id = 'search-test-query'
						placeholder = 'Product name, user code, SKU, EAN…'
						value = { query }

						onChange = {
							(event) => setQuery(event.target.value)
						}

						onKeyDown = {
							(event) => {
								if (event.key === 'Enter' && profileId) {
									mutation.mutate()
								}
							}
						}
					/>
				</div>

				<Button
					disabled = { !profileId }
					isLoading = { mutation.isPending }
					type = 'button'

					onClick = {
						() => mutation.mutate()
					}
				>
					Test search
				</Button>
			</div>

			{
				result && (
					<div className = 'overflow-hidden rounded-lg border border-ui-border-base'>
						<div className = 'flex flex-wrap items-center justify-between gap-2 border-ui-border-base border-b px-4 py-3'>
							<Text
								size = 'small'
								weight = 'plus'
							>
								{ result.hits.length } accepted of { result.raw_hit_count } raw hits
							</Text>

							<Text
								className = 'text-ui-fg-subtle'
								size = 'xsmall'
							>
								{ result.processing_time_ms !== null ? result.processing_time_ms + ' ms' : '' }
								{ result.minimum_ranking_score !== null ? ' · min score ' + result.minimum_ranking_score : '' }
							</Text>
						</div>

						<Table>
							<Table.Header>
								<Table.Row>
									<Table.HeaderCell>
										Result
									</Table.HeaderCell>

									<Table.HeaderCell>
										ID
									</Table.HeaderCell>

									<Table.HeaderCell>
										Ranking score
									</Table.HeaderCell>

									<Table.HeaderCell>
										Document
									</Table.HeaderCell>
								</Table.Row>
							</Table.Header>

							<Table.Body>
								{
									result.hits.length ? (
										result.hits.map((hit, index) => (
											<Table.Row
												key = { hitId(hit, index) }
											>
												<Table.Cell>
													{ hitLabel(hit) }
												</Table.Cell>

												<Table.Cell
													className = 'text-ui-fg-subtle'
												>
													{ hitId(hit, index) }
												</Table.Cell>

												<Table.Cell>
													{ typeof hit._rankingScore === 'number' ? hit._rankingScore.toFixed(4) : '—' }
												</Table.Cell>

												<Table.Cell>
													<details>
														<summary className = 'cursor-pointer text-ui-fg-interactive'>Inspect</summary>

														<pre className = 'mt-2 max-h-72 max-w-xl overflow-auto whitespace-pre-wrap rounded bg-ui-bg-subtle p-3 text-xs'>
															{ JSON.stringify(hit, null, 2) }
														</pre>
													</details>
												</Table.Cell>
											</Table.Row>
										))
									) : (
										<Table.Row>
											<Table.Cell>
												No accepted results.
											</Table.Cell>

											<Table.Cell />
											<Table.Cell />
											<Table.Cell />
										</Table.Row>
									)
								}
							</Table.Body>
						</Table>
					</div>
				)
			}
		</div>
	)
}
