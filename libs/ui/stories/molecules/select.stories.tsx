import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '../../src/atoms/button'
import { Icon } from '../../src/atoms/icon'
import type { IconType } from '../../src/atoms/icon'
import { Badge } from '../../src/atoms/badge'
import { Select, type SelectItem } from '../../src/molecules/select'

// Mock data
const countries: SelectItem[] = [
	{ label: 'United States', value: 'us' },
	{ label: 'Canada', value: 'ca' },
	{ label: 'Mexico', value: 'mx' },
	{ label: 'Brazil', value: 'br' },
	{ label: 'Argentina', value: 'ar' },
	{ label: 'Chile', value: 'cl' },
	{ label: 'Germany', value: 'de' },
	{ label: 'France', value: 'fr' },
	{ label: 'United Kingdom', value: 'gb' },
	{ label: 'Italy', value: 'it' },
	{ label: 'Spain', value: 'es' },
	{ label: 'Japan', value: 'jp' },
	{ label: 'China', value: 'cn' },
	{ label: 'India', value: 'in', disabled: true },
	{ label: 'Australia', value: 'au' },
]

const languages: SelectItem[] = [
	{ label: 'English', value: 'en' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Portuguese', value: 'pt' },
	{ label: 'Italian', value: 'it' },
	{ label: 'Dutch', value: 'nl' },
	{ label: 'Russian', value: 'ru' },
	{ label: 'Japanese', value: 'ja' },
	{ label: 'Chinese', value: 'zh' },
]

const teamMembers: SelectItem[] = [
	{
		label: 'Jessica Jones',
		value: 'jessica',
		avatar: 'https://i.pravatar.cc/150?u=jessica',
		role: 'Designer',
	},
	{
		label: 'Kenneth Johnson',
		value: 'kenneth',
		avatar: 'https://i.pravatar.cc/150?u=kenneth',
		role: 'Developer',
	},
	{
		label: 'Kate Wilson',
		value: 'kate',
		avatar: 'https://i.pravatar.cc/150?u=kate',
		role: 'Product Manager',
	},
	{
		label: 'Michael Brown',
		value: 'michael',
		avatar: 'https://i.pravatar.cc/150?u=michael',
		role: 'Developer',
	},
]

const meta: Meta<typeof Select> = {
	title: 'Molecules/Select',
	component: Select,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A compound pattern Select component built with Zag.js that provides maximum flexibility and customization.

## Features
- **Compound Pattern**: Full control over rendering each part
- **Custom Content**: Add avatars, icons, badges to items
- **Item Groups**: Organize items into labeled groups
- **Render Props**: Custom value display with render function
- **Accessible**: Full keyboard navigation and screen reader support

## Sub-components
- \`Select\` / \`Select.Root\` - Main wrapper
- \`Select.Label\` - Label text
- \`Select.Control\` - Trigger container
- \`Select.Trigger\` - Button that opens dropdown
- \`Select.ValueText\` - Displays selected value
- \`Select.ClearTrigger\` - Clear selection button
- \`Select.Positioner\` - Dropdown positioning (auto Portal)
- \`Select.Content\` - Dropdown content
- \`Select.ItemGroup\` - Group container
- \`Select.ItemGroupLabel\` - Group label
- \`Select.Item\` - Selectable item
- \`Select.ItemText\` - Item text
- \`Select.ItemIndicator\` - Checkmark indicator
- \`Select.StatusText\` - Status/helper text with auto error detection
				`,
			},
		},
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['xs', 'sm', 'md', 'lg'],
			description: 'Size of the select',
			table: { defaultValue: { summary: 'md' } },
		},
		validateStatus: {
			control: { type: 'select' },
			options: ['default', 'error', 'success', 'warning'],
			description: 'Validation status of the select',
			table: { defaultValue: { summary: 'default' } },
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the select is disabled',
			table: { defaultValue: { summary: 'false' } },
		},
		readOnly: {
			control: 'boolean',
			description: 'Whether the select is read-only',
			table: { defaultValue: { summary: 'false' } },
		},
		multiple: {
			control: 'boolean',
			description: 'Whether multiple options can be selected',
			table: { defaultValue: { summary: 'false' } },
		},
		closeOnSelect: {
			control: 'boolean',
			description: 'Whether the dropdown closes on selection',
			table: { defaultValue: { summary: 'true' } },
		},
		loopFocus: {
			control: 'boolean',
			description: 'Whether keyboard navigation should loop',
			table: { defaultValue: { summary: 'true' } },
		},
	},
	decorators: [
		(Story, context) => {
			const { title, description } = context.parameters

			return (
				<div className="flex w-80 flex-col gap-6 p-4">
					{title && <h3 className="font-medium text-lg">{title}</h3>}
					{description && (
						<p className="mb-2 text-gray-600 text-sm">{description}</p>
					)}
					<div className="space-y-4">
						<Story />
					</div>
				</div>
			)
		},
	],
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
	args: {
		items: countries,
		size: 'md',
		validateStatus: 'default',
		disabled: false,
		readOnly: false,
		multiple: false,
		closeOnSelect: true,
		loopFocus: true,
	},
	render: (args) => (
		<Select {...args}>
			<Select.Label>Select a country</Select.Label>
			<Select.Control>
				<Select.Trigger>
					<Select.ValueText placeholder="Choose a country" />
				</Select.Trigger>
				<Select.ClearTrigger />
			</Select.Control>
			<Select.Positioner>
				<Select.Content>
					{args.items?.map((item) => (
						<Select.Item key={item.value} item={item}>
							<Select.ItemText />
							<Select.ItemIndicator />
						</Select.Item>
					))}
				</Select.Content>
			</Select.Positioner>
			<Select.StatusText>Helper text goes here</Select.StatusText>
		</Select>
	),
}

export const WithDefaultValue: Story = {
	render: () => (
		<Select items={countries} defaultValue={['us']}>
			<Select.Label>Select a country</Select.Label>
			<Select.Control>
				<Select.Trigger>
					<Select.ValueText placeholder="Choose a country" />
				</Select.Trigger>
				<Select.ClearTrigger />
			</Select.Control>
			<Select.Positioner>
				<Select.Content>
					{countries.map((item) => (
						<Select.Item key={item.value} item={item}>
							<Select.ItemText />
							<Select.ItemIndicator />
						</Select.Item>
					))}
				</Select.Content>
			</Select.Positioner>
		</Select>
	),
}

export const Sizes: Story = {
	render: () => (
		<>
			<Select items={countries} size="xs">
				<Select.Label>Extra Small</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>

			<Select items={countries} size="sm">
				<Select.Label>Small</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>

			<Select items={countries} size="md">
				<Select.Label>Medium (default)</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>

			<Select items={countries} size="lg">
				<Select.Label>Large</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>
		</>
	),
}

export const States: Story = {
	render: () => (
		<>
			<Select items={countries} disabled>
				<Select.Label>Disabled</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>

			<Select items={countries} validateStatus="error">
				<Select.Label>Invalid</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
				<Select.StatusText>Please select a valid country</Select.StatusText>
			</Select>

			<Select items={countries} required>
				<Select.Label>Required</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
				<Select.StatusText>This field is required</Select.StatusText>
			</Select>

			<Select items={countries} readOnly defaultValue={["us"]}>
				<Select.Label>Read-only</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>
		</>
	),
}

export const ValidationStates: Story = {
	name: 'Validation States (error, success, warning)',
	render: () => (
		<>
			<Select items={countries} validateStatus="error">
				<Select.Label>Error State</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
				<Select.StatusText showIcon>Please fix the error</Select.StatusText>
			</Select>

			<Select items={countries} validateStatus="success">
				<Select.Label>Success State</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
				<Select.StatusText showIcon>Selection saved successfully</Select.StatusText>
			</Select>

			<Select items={countries} validateStatus="warning">
				<Select.Label>Warning State</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
				<Select.StatusText showIcon>This option is deprecated</Select.StatusText>
			</Select>

			<Select items={countries} validateStatus="default">
				<Select.Label>Default State</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select..." />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{countries.slice(0, 5).map((item) => (
							<Select.Item key={item.value} item={item}>
								<Select.ItemText />
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
				<Select.StatusText>Helper text for this field</Select.StatusText>
			</Select>
		</>
	),
}

export const WithIcons: Story = {
	name: 'With Icons (Compound Benefit)',
	render: () => {
		const languagesWithIcons: SelectItem[] = [
			{ label: 'English', value: 'en', icon: 'icon-[cif--gb]' },
			{ label: 'Spanish', value: 'es', icon: 'icon-[cif--es]' },
			{ label: 'French', value: 'fr', icon: 'icon-[cif--fr]' },
			{ label: 'German', value: 'de', icon: 'icon-[cif--de]' },
		]

		return (
			<Select items={languagesWithIcons}>
				<Select.Label>Select a language</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Choose a language">
							{(items) => (
								<span className="flex items-center gap-2">
									<Icon icon={items[0]?.icon as IconType} size="sm" />
									{items[0]?.label}
								</span>
							)}
						</Select.ValueText>
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{languagesWithIcons.map((item) => (
							<Select.Item key={item.value} item={item}>
								<span className="flex items-center gap-2">
									<Icon icon={item.icon as IconType} size="sm" />
									<Select.ItemText />
								</span>
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>
		)
	},
}

export const WithAvatars: Story = {
	name: 'With Avatars (Compound Benefit)',
	render: () => (
		<Select items={teamMembers} defaultValue={['jessica']}>
			<Select.Label>Select team member</Select.Label>
			<Select.Control>
				<Select.Trigger>
					<Select.ValueText placeholder="Choose a member">
						{(items) => (
							<span className="flex items-center gap-2">
								<img
									src={items[0]?.avatar as string}
									alt={items[0]?.label as string}
									className="h-6 w-6 rounded-full object-cover"
								/>
								<span>{items[0]?.label}</span>
							</span>
						)}
					</Select.ValueText>
				</Select.Trigger>
				<Select.ClearTrigger />
			</Select.Control>
			<Select.Positioner>
				<Select.Content>
					{teamMembers.map((item) => (
						<Select.Item key={item.value} item={item}>
							<span className="flex items-center gap-2">
								<img
									src={item.avatar as string}
									alt={item.label as string}
									className="h-6 w-6 rounded-full object-cover"
								/>
								<span className="flex flex-col">
									<Select.ItemText />
									<span className="text-xs text-gray-500">
										{item.role as string}
									</span>
								</span>
							</span>
							<Select.ItemIndicator />
						</Select.Item>
					))}
				</Select.Content>
			</Select.Positioner>
		</Select>
	),
}

export const WithItemGroups: Story = {
	name: 'With Item Groups (Compound Benefit)',
	render: () => {
		const europeCountries = countries.filter((c) =>
			['de', 'fr', 'gb', 'it', 'es'].includes(c.value)
		)
		const americaCountries = countries.filter((c) =>
			['us', 'ca', 'mx', 'br', 'ar'].includes(c.value)
		)
		const asiaCountries = countries.filter((c) =>
			['jp', 'cn', 'in'].includes(c.value)
		)

		return (
			<Select items={countries}>
				<Select.Label>Select a country</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Choose a country" />
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						<Select.ItemGroup id="europe">
							<Select.ItemGroupLabel htmlFor="europe">Europe</Select.ItemGroupLabel>
							{europeCountries.map((item) => (
								<Select.Item key={item.value} item={item}>
									<Select.ItemText />
									<Select.ItemIndicator />
								</Select.Item>
							))}
						</Select.ItemGroup>

						<Select.ItemGroup id="americas">
							<Select.ItemGroupLabel htmlFor="americas">Americas</Select.ItemGroupLabel>
							{americaCountries.map((item) => (
								<Select.Item key={item.value} item={item}>
									<Select.ItemText />
									<Select.ItemIndicator />
								</Select.Item>
							))}
						</Select.ItemGroup>

						<Select.ItemGroup id="asia">
							<Select.ItemGroupLabel htmlFor="asia">Asia</Select.ItemGroupLabel>
							{asiaCountries.map((item) => (
								<Select.Item key={item.value} item={item}>
									<Select.ItemText />
									<Select.ItemIndicator />
								</Select.Item>
							))}
						</Select.ItemGroup>
					</Select.Content>
				</Select.Positioner>
			</Select>
		)
	},
}

export const CustomItemContent: Story = {
	name: 'Custom Item Content (Compound Benefit)',
	render: () => {
		const plans: SelectItem[] = [
			{
				label: 'Free',
				value: 'free',
				price: '$0',
				features: '5 projects, 1GB storage',
			},
			{
				label: 'Pro',
				value: 'pro',
				price: '$19/mo',
				features: 'Unlimited projects, 100GB storage',
			},
			{
				label: 'Enterprise',
				value: 'enterprise',
				price: '$99/mo',
				features: 'Custom limits, priority support',
			},
		]

		return (
			<Select items={plans}>
				<Select.Label>Select a plan</Select.Label>
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Choose a plan">
							{(items) => (
								<span className="flex items-center justify-between w-full">
									<span>{items[0]?.label}</span>
									<span className="text-sm text-gray-500">
										{items[0]?.price as string}
									</span>
								</span>
							)}
						</Select.ValueText>
					</Select.Trigger>
				</Select.Control>
				<Select.Positioner>
					<Select.Content>
						{plans.map((item) => (
							<Select.Item key={item.value} item={item}>
								<span className="flex flex-col flex-1">
									<span className="flex items-center gap-2">
										<Select.ItemText />
									</span>
									<span className="text-xs text-gray-500">
										{item.features as string}
									</span>
								</span>
								<span className="flex items-center gap-2">
									<span className="text-sm font-medium">
										{item.price as string}
									</span>
									<Select.ItemIndicator />
								</span>
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Select>
		)
	},
}

export const Controlled: Story = {
	render: () => {
		const [value, setValue] = useState<string[]>(['fr'])

		return (
			<>
				<Select
					items={languages}
					value={value}
					onValueChange={(details) => setValue(details.value)}
				>
					<Select.Label>Select a language</Select.Label>
					<Select.Control>
						<Select.Trigger>
							<Select.ValueText placeholder="Choose a language" />
						</Select.Trigger>
						<Select.ClearTrigger />
					</Select.Control>
					<Select.Positioner>
						<Select.Content>
							{languages.map((item) => (
								<Select.Item key={item.value} item={item}>
									<Select.ItemText />
									<Select.ItemIndicator />
								</Select.Item>
							))}
						</Select.Content>
					</Select.Positioner>
				</Select>

				<div className="text-sm">
					<strong>Selected:</strong> {value.join(', ') || 'None'}
				</div>

				<div className="flex gap-2">
					<Button size="sm" onClick={() => setValue(['en'])}>
						Set to English
					</Button>
					<Button size="sm" variant="secondary" onClick={() => setValue([])}>
						Clear
					</Button>
				</div>
			</>
		)
	},
}

export const Multiple: Story = {
	render: () => (
		<Select items={languages} multiple closeOnSelect={false}>
			<Select.Label>Select languages</Select.Label>
			<Select.Control>
				<Select.Trigger>
					<Select.ValueText placeholder="Choose languages">
						{(items) =>
							items.length > 0 ? (
								<span>{items.map((i) => i.label).join(', ')}</span>
							) : (
								'Choose languages'
							)
						}
					</Select.ValueText>
				</Select.Trigger>
				<Select.ClearTrigger />
			</Select.Control>
			<Select.Positioner>
				<Select.Content>
					{languages.map((item) => (
						<Select.Item key={item.value} item={item}>
							<Select.ItemText />
							<Select.ItemIndicator />
						</Select.Item>
					))}
				</Select.Content>
			</Select.Positioner>
		</Select>
	),
}

export const WithinForm: Story = {
	render: () => {
		const [formState, setFormState] = useState({
			country: [] as string[],
			language: [] as string[],
		})
		const [submittedData, setSubmittedData] = useState<null | typeof formState>(
			null
		)

		const handleSubmit = (e: React.FormEvent) => {
			e.preventDefault()
			setSubmittedData(formState)
		}

		return (
			<form onSubmit={handleSubmit} className="space-y-4">
				<Select
					items={countries}
					required
					validateStatus={formState.country.length === 0 ? "error" : "default"}
					value={formState.country}
					onValueChange={(details) =>
						setFormState((prev) => ({ ...prev, country: details.value }))
					}
				>
					<Select.Label>Country</Select.Label>
					<Select.Control>
						<Select.Trigger>
							<Select.ValueText placeholder="Select a country" />
						</Select.Trigger>
						<Select.ClearTrigger />
					</Select.Control>
					<Select.Positioner>
						<Select.Content>
							{countries.map((item) => (
								<Select.Item key={item.value} item={item}>
									<Select.ItemText />
									<Select.ItemIndicator />
								</Select.Item>
							))}
						</Select.Content>
					</Select.Positioner>
					{formState.country.length === 0 && (
						<Select.StatusText>Please select a country</Select.StatusText>
					)}
				</Select>

				<Select
					items={languages}
					multiple
					closeOnSelect={false}
					value={formState.language}
					onValueChange={(details) =>
						setFormState((prev) => ({ ...prev, language: details.value }))
					}
				>
					<Select.Label>Languages</Select.Label>
					<Select.Control>
						<Select.Trigger>
							<Select.ValueText placeholder="Select languages">
								{(items) =>
									items.length > 0
										? items.map((i) => i.label).join(', ')
										: 'Select languages'
								}
							</Select.ValueText>
						</Select.Trigger>
						<Select.ClearTrigger />
					</Select.Control>
					<Select.Positioner>
						<Select.Content>
							{languages.map((item) => (
								<Select.Item key={item.value} item={item}>
									<Select.ItemText />
									<Select.ItemIndicator />
								</Select.Item>
							))}
						</Select.Content>
					</Select.Positioner>
					<Select.StatusText>You can select multiple languages</Select.StatusText>
				</Select>

				<Button type="submit" variant="primary">
					Submit Form
				</Button>

				{submittedData && (
					<div className="mt-4 rounded-md border border-green-200 bg-green-50/10 p-4">
						<h4 className="mb-2 font-medium">Form Submitted:</h4>
						<p>
							<strong>Country:</strong>{' '}
							{countries.find((c) => c.value === submittedData.country[0])
								?.label || 'None'}
						</p>
						<p>
							<strong>Languages:</strong>{' '}
							{submittedData.language
								.map((l) => languages.find((lang) => lang.value === l)?.label)
								.join(', ') || 'None'}
						</p>
					</div>
				)}
			</form>
		)
	},
}

export const ConditionalRendering: Story = {
	name: 'Conditional Rendering (Compound Benefit)',
	render: () => {
		const [showPremium, setShowPremium] = useState(false)

		const basicItems: SelectItem[] = [
			{ label: 'Free Plan', value: 'free' },
			{ label: 'Basic Plan', value: 'basic' },
		]

		const premiumItems: SelectItem[] = [
			{ label: 'Pro Plan', value: 'pro' },
			{ label: 'Enterprise Plan', value: 'enterprise' },
		]

		const allItems = [...basicItems, ...(showPremium ? premiumItems : [])]

		return (
			<>
				<div className="mb-4">
					<Button
						size="sm"
						variant="secondary"
						onClick={() => setShowPremium(!showPremium)}
					>
						{showPremium ? 'Hide' : 'Show'} Premium Plans
					</Button>
				</div>

				<Select items={allItems}>
					<Select.Label>Select a plan</Select.Label>
					<Select.Control>
						<Select.Trigger>
							<Select.ValueText placeholder="Choose a plan" />
						</Select.Trigger>
					</Select.Control>
					<Select.Positioner>
						<Select.Content>
							<Select.ItemGroup id="basic-plans">
								<Select.ItemGroupLabel htmlFor="basic-plans">
									Basic Plans
								</Select.ItemGroupLabel>
								{basicItems.map((item) => (
									<Select.Item key={item.value} item={item}>
										<Select.ItemText />
										<Select.ItemIndicator />
									</Select.Item>
								))}
							</Select.ItemGroup>

							{showPremium && (
								<Select.ItemGroup id="premium-plans">
									<Select.ItemGroupLabel htmlFor="premium-plans">
										Premium Plans
									</Select.ItemGroupLabel>
									{premiumItems.map((item) => (
										<Select.Item key={item.value} item={item}>
											<span className="flex items-center gap-2">
												<Select.ItemText />
												<Badge variant="warning">
													Premium
												</Badge>
											</span>
											<Select.ItemIndicator />
										</Select.Item>
									))}
								</Select.ItemGroup>
							)}
						</Select.Content>
					</Select.Positioner>
				</Select>
			</>
		)
	},
}
