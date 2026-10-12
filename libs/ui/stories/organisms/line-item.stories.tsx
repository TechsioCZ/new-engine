import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Image } from "../../src/atoms/image"
import { Link } from "../../src/atoms/link"
import { StatusText } from "../../src/atoms/status-text"
import { AvailabilityStatus } from "../../src/molecules/availability-status"
import { PriceBlock } from "../../src/molecules/price-block"
import { QuantityField } from "../../src/molecules/quantity-field"
import { LineItem, type LineItemProps } from "../../src/organisms/line-item"

const removed = fn()
const quantityChanged = fn()
const saved = fn()
const productTitle = "Montážní sada M8"
const longProductTitle =
	"Montážní sada pro připevnění těžkých polic a regálů v dílně"
const thumbnail =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath fill='%23999' stroke='%23444' stroke-width='4' d='M25 15h50l20 35-20 35H25L5 50z'/%3E%3Ccircle cx='50' cy='50' r='20' fill='%23eee' stroke='%23444' stroke-width='4'/%3E%3C/svg%3E"

function DraftQuantity({
	title,
	pending = false,
	disabled = false,
}: {
	title: string
	pending?: boolean
	disabled?: boolean
}) {
	const [value, setValue] = useState("2")
	return (
		<QuantityField
			hideLabel
			label={`Množství: ${title}`}
			min={1}
			max={10}
			value={value}
			onValueChange={(details) => {
				setValue(details.value)
				quantityChanged(details)
			}}
			pending={pending}
			pendingLabel="Ukládáme množství"
			disabled={disabled}
			size="sm"
			unitLabel="balení"
		/>
	)
}

type CartRowProps = (
	| Omit<Extract<LineItemProps, { pending: true }>, "children">
	| Omit<Extract<LineItemProps, { pending?: false }>, "children">
) & { unavailable?: boolean; error?: string }

function CartRow({ unavailable = false, error, ...props }: CartRowProps) {
	return (
		<LineItem {...props}>
			<LineItem.Image>
				<Image alt="" src={thumbnail} />
			</LineItem.Image>
			<LineItem.Body>
				<LineItem.Heading>
					<LineItem.Title>
						<Link href="#product">{props.title}</Link>
					</LineItem.Title>
					<LineItem.Price>
						<PriceBlock state="known" amountLabel="498 Kč" />
					</LineItem.Price>
				</LineItem.Heading>
				<LineItem.Options>100 ks · pozink · kód MS-008</LineItem.Options>
				{unavailable ? (
					<AvailabilityStatus status="unavailable" label="Není skladem" />
				) : null}
				<LineItem.Controls>
					<LineItem.Quantity readOnlyLabel="2 balení">
						<DraftQuantity
							title={props.title}
							pending={props.pending}
							disabled={unavailable}
						/>
					</LineItem.Quantity>
					<LineItem.Actions>
						<LineItem.Remove label="Odebrat" onClick={removed} />
					</LineItem.Actions>
				</LineItem.Controls>
				{error ? <StatusText status="error">{error}</StatusText> : null}
			</LineItem.Body>
		</LineItem>
	)
}

const meta: Meta<typeof LineItem> = {
	title: "Organisms/LineItem",
	component: LineItem,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Compound řádek produktu pro košík a rekapitulaci. Aplikace skládá části a dodává cenu, quantity control a dostupnost. Root sdílí pending/readOnly; Quantity v readOnly nezapojí své editovatelné děti a Actions/Remove se nevykreslí. Žádné výpočty nebo requesty.",
			},
		},
	},
	args: {
		title: productTitle,
		layout: "default",
		readOnly: false,
		pendingLabel: "Ukládáme položku",
	},
	argTypes: {
		title: { control: "text" },
		layout: { control: "select", options: ["default", "compact"] },
		readOnly: { control: "boolean" },
		pending: { control: "boolean" },
		pendingLabel: { control: "text" },
		children: { control: false },
		ref: { control: false },
	},
}
export default meta
type Story = StoryObj<typeof LineItem>

export const Playground: Story = {
	render: (args) => (
		<div className="w-xl max-w-full">
			<CartRow {...args} />
		</div>
	),
}
export const ReadOnly: Story = {
	args: { readOnly: true },
	render: (args) => (
		<div className="w-xl max-w-full">
			<CartRow {...args} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Stejná compound skladba obsahuje QuantityField i Remove. Root readOnly ale quantity nahradí textem a akce úplně vynechá.",
			},
		},
	},
}
export const Pending: Story = {
	args: { pending: true, pendingLabel: "Ukládáme položku" },
	render: (args) => (
		<div className="w-xl max-w-full">
			<CartRow {...args} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Root blokuje Quantity a Actions pomocí inert, Remove navíc deaktivuje. QuantityField dostává pending také pro viditelný stav.",
			},
		},
	},
}
export const Unavailable: Story = {
	render: (args) => (
		<div className="w-xl max-w-full">
			<CartRow {...args} unavailable />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Aplikace označí položku jako nedostupnou a deaktivuje quantity. Odebrání zůstává dostupné.",
			},
		},
	},
}
export const ItemError: Story = {
	render: (args) => (
		<div className="w-xl max-w-full">
			<CartRow
				{...args}
				error="Změnu se nepodařilo uložit. Zkuste upravit množství znovu."
			/>
		</div>
	),
}
export const Layouts: Story = {
	render: (args) => (
		<VariantContainer>
			{(["default", "compact"] as const).map((layout) => (
				<VariantGroup fullWidth key={layout} title={layout}>
					<div className="w-xl max-w-full">
						<CartRow {...args} layout={layout} />
					</div>
				</VariantGroup>
			))}
		</VariantContainer>
	),
}
export const LongContent: Story = {
	args: { title: longProductTitle, layout: "compact" },
	render: (args) => (
		<div className="w-sm max-w-full">
			<CartRow {...args} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Dlouhý název na úzkém viewportu: cena a ovládání zůstávají viditelné.",
			},
		},
	},
}
export const CustomComposition: Story = {
	render: (args) => (
		<div className="w-xl max-w-full">
			<LineItem {...args}>
				<LineItem.Body>
					<LineItem.Title />
					<LineItem.Options>
						Bez fotografie, cena pod názvem a vlastní dodatečná akce.
					</LineItem.Options>
					<LineItem.Price>
						<PriceBlock state="known" amountLabel="498 Kč" />
					</LineItem.Price>
					<LineItem.Controls>
						<LineItem.Quantity readOnlyLabel="2 balení">
							<DraftQuantity title={args.title} pending={args.pending} />
						</LineItem.Quantity>
						<LineItem.Actions>
							<Button
								onClick={saved}
								disabled={args.pending}
								size="sm"
								theme="outlined"
							>
								Uložit na později
							</Button>
							<LineItem.Remove label="Odebrat" onClick={removed} />
						</LineItem.Actions>
					</LineItem.Controls>
				</LineItem.Body>
			</LineItem>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Compound API umožňuje vynechat obrázek, přesunout cenu a doplnit vlastní akce. Přepněte pending/readOnly v Controls: společné pojistky platí i pro vlastní akce.",
			},
		},
	},
}
