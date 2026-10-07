import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Link } from "../../src/atoms/link"
import { PriceBlock } from "../../src/molecules/price-block"
import { QuantityField } from "../../src/molecules/quantity-field"
import { TotalsSummary } from "../../src/molecules/totals-summary"
import { LineItem } from "../../src/organisms/line-item"

const checkout = fn()
const remove = fn()
const quantityChange = fn()

function CartExample({ readOnly = false }: { readOnly?: boolean }) {
	const [quantity, setQuantity] = useState("2")
	const title = "Montážní sada M8"
	return (
		<div className="flex w-xl max-w-full flex-col gap-400">
			<LineItem title={title} readOnly={readOnly}>
				<LineItem.Body>
					<LineItem.Heading>
						<LineItem.Title>
							<Link href="#product">{title}</Link>
						</LineItem.Title>
						<LineItem.Price>
							<PriceBlock amountLabel="498 Kč" state="known" />
						</LineItem.Price>
					</LineItem.Heading>
					<LineItem.Options>100 ks · pozink · kód MS-008</LineItem.Options>
					<LineItem.Controls>
						<LineItem.Quantity readOnlyLabel="2 balení">
							<QuantityField
								hideLabel
								label={`Množství: ${title}`}
								min={1}
								onValueChange={(details) => {
									setQuantity(details.value)
									quantityChange(details)
								}}
								size="sm"
								unitLabel="balení"
								value={quantity}
							/>
						</LineItem.Quantity>
						<LineItem.Actions>
							<LineItem.Remove label="Odebrat" onClick={remove} />
						</LineItem.Actions>
					</LineItem.Controls>
				</LineItem.Body>
			</LineItem>
			<TotalsSummary
				rows={[
					{ id: "goods", label: "Zboží", value: "498 Kč" },
					{
						id: "shipping",
						label: "Doprava",
						value: readOnly ? "89 Kč" : "Zvolte dopravu",
					},
				]}
				totalLabel={readOnly ? "Celkem včetně DPH" : "Mezisoučet včetně DPH"}
				totalValue={readOnly ? "587 Kč" : "498 Kč"}
				footer={
					readOnly
						? "Doručení na adresu, platba kartou."
						: "Částky jsou připravené aplikací. Změna draftu množství zde cenu nepřepočítává."
				}
				actions={
					readOnly ? undefined : (
						<Button onClick={checkout}>Pokračovat k objednávce</Button>
					)
				}
			/>
		</div>
	)
}

const meta: Meta<typeof CartExample> = {
	title: "Templates/CartPresentation",
	component: CartExample,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Kompozice LineItem, QuantityField, PriceBlock a TotalsSummary pro košík a rekapitulaci. Ukázka neobsahuje výpočty, síťové požadavky ani chování minikošíku.",
			},
		},
	},
	args: { readOnly: false },
	argTypes: { readOnly: { control: "boolean" } },
}
export default meta
type Story = StoryObj<typeof CartExample>

export const Playground: Story = {}
export const CartAndRecap: Story = {
	render: () => (
		<VariantContainer>
			<VariantGroup
				fullWidth
				title="Košík: úprava množství a nevybraná doprava"
			>
				<CartExample />
			</VariantGroup>
			<VariantGroup
				fullWidth
				title="Rekapitulace: hotové částky a množství bez ovládání"
			>
				<CartExample readOnly />
			</VariantGroup>
		</VariantContainer>
	),
}
