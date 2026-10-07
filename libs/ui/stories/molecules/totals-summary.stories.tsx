import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
	TotalsSummary,
	type TotalsSummaryRow,
} from "../../src/molecules/totals-summary"

const checkout = fn()
const completeRows: readonly TotalsSummaryRow[] = [
	{ id: "goods", label: "Zboží", value: "1 498 Kč" },
	{
		id: "shipping",
		label: "Doprava",
		value: "89 Kč",
		note: "Doručení na adresu",
	},
	{ id: "payment", label: "Platba", value: "Zdarma", note: "Kartou online" },
]
const partialRows: readonly TotalsSummaryRow[] = [
	{ id: "goods", label: "Zboží", value: "1 498 Kč" },
	{ id: "shipping", label: "Doprava", value: "Zvolte dopravu" },
	{ id: "payment", label: "Platba", value: "Zvolte platbu" },
]

const meta: Meta<typeof TotalsSummary> = {
	title: "Molecules/TotalsSummary",
	component: TotalsSummary,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Rozpis hotových popisků a částek. Aplikace určuje řádky i výsledný součet; nevybraná doprava není nula. Pending zachová poslední částky a zablokuje akce.",
			},
		},
	},
	args: {
		rows: completeRows,
		totalLabel: "Celkem včetně DPH",
		totalValue: "1 587 Kč",
		pendingLabel: "Aktualizujeme souhrn objednávky",
		footer: "Částky jsou uvedeny včetně DPH.",
	},
	argTypes: {
		rows: { control: "object" },
		totalLabel: { control: "text" },
		totalValue: { control: "text" },
		pending: { control: "boolean" },
		pendingLabel: { control: "text" },
		footer: { control: "text" },
		actions: { control: false },
		ref: { control: false },
	},
}
export default meta
type Story = StoryObj<typeof TotalsSummary>

export const Playground: Story = {
	render: (args) => (
		<div className="w-md max-w-full">
			<TotalsSummary
				{...args}
				actions={
					<Button disabled={args.pending} onClick={checkout}>
						Pokračovat k objednávce
					</Button>
				}
			/>
		</div>
	),
}

export const Partial: Story = {
	name: "Částečný souhrn — doprava ještě není vybraná",
	args: {
		rows: partialRows,
		totalLabel: "Mezisoučet včetně DPH",
		totalValue: "1 498 Kč",
		footer: "Konečná cena bude dostupná po výběru dopravy a platby.",
	},
	render: (args) => (
		<div className="w-md max-w-full">
			<TotalsSummary {...args} />
		</div>
	),
}

export const Complete: Story = {
	name: "Kompletní souhrn — vybraná doprava a platba",
	render: (args) => (
		<div className="w-md max-w-full">
			<TotalsSummary
				{...args}
				actions={<Button onClick={checkout}>Pokračovat k objednávce</Button>}
			/>
		</div>
	),
}

export const Discounted: Story = {
	name: "Sleva — samostatný záporný řádek",
	args: {
		rows: [
			...completeRows,
			{
				id: "discount",
				label: "Sleva VITEJTE",
				value: "−150 Kč",
				emphasis: "discount",
				note: "Platný slevový kód",
			},
		],
		totalValue: "1 437 Kč",
	},
	render: (args) => (
		<div className="w-md max-w-full">
			<TotalsSummary {...args} />
		</div>
	),
}

export const Pending: Story = {
	name: "Aktualizace — poslední částky a zablokovaná akce",
	args: { pending: true, pendingLabel: "Aktualizujeme souhrn objednávky" },
	render: (args) => (
		<div className="w-md max-w-full">
			<TotalsSummary
				{...args}
				actions={
					<Button disabled={args.pending} onClick={checkout}>
						Pokračovat k objednávce
					</Button>
				}
			/>
		</div>
	),
}

export const CustomRows: Story = {
	name: "Vlastní řádky — bez předepsaných poplatků a výpočtů",
	render: () => (
		<VariantContainer>
			<VariantGroup title="Souhrn s vlastními řádky" fullWidth>
				<div className="w-md max-w-full">
					<TotalsSummary
						rows={[
							{ id: "net", label: "Základ daně", value: "1 000 Kč" },
							{ id: "tax", label: "DPH 21 %", value: "210 Kč" },
							{
								id: "deposit",
								label: "Vratná záloha za obal",
								value: "100 Kč",
								note: "Vracíme po odevzdání obalu",
							},
						]}
						totalLabel="Celkem včetně zálohy"
						totalValue="1 310 Kč"
					/>
				</div>
			</VariantGroup>
		</VariantContainer>
	),
}
