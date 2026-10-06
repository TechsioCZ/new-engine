import type { Meta, StoryObj } from "@storybook/react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
	PriceBlock,
	type PriceBlockProps,
} from "../../src/molecules/price-block"

const meta: Meta<typeof PriceBlock> = {
	title: "Molecules/PriceBlock",
	component: PriceBlock,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
}

export default meta
type Story = Omit<StoryObj<typeof meta>, "args"> & {
	args?: Partial<PriceBlockProps>
}
type PlaygroundStory = StoryObj<
	Extract<PriceBlockProps, { state: "discounted" }>
>

export const Playground: PlaygroundStory = {
	args: {
		state: "discounted",
		amountLabel: "249 Kč",
		originalLabel: "299 Kč",
		originalSrLabel: "Původní cena",
		taxLabel: "vč. DPH",
		unitLabel: "za balení",
		discountLabel: "Akce",
	},
	argTypes: {
		state: { control: false },
		amountLabel: { control: "text" },
		originalLabel: { control: "text" },
		originalSrLabel: {
			control: "text",
			description:
				"Localized label identifying the original price for screen readers.",
		},
		taxLabel: { control: "text" },
		unitLabel: { control: "text" },
		discountLabel: { control: "text" },
	},
}

export const States: Story = {
	render: () => (
		<VariantContainer>
			<VariantGroup title="Price states" fullWidth>
				<PriceBlock
					state="known"
					amountLabel="249 Kč"
					taxLabel="205,79 Kč bez DPH"
					unitLabel="za balení"
				/>
				<PriceBlock
					state="from"
					prefix="Od"
					amountLabel="149 Kč"
					unitLabel="za kus"
				/>
				<PriceBlock
					state="discounted"
					amountLabel="249 Kč"
					originalLabel="299 Kč"
					originalSrLabel="Původní cena"
					taxLabel="vč. DPH"
					unitLabel="za balení"
					discountLabel="Akce"
				/>
				<PriceBlock
					state="on-request"
					label="Cena na dotaz"
					detail="Cenu nyní nelze zobrazit."
				/>
				<PriceBlock state="pending" pendingLabel="Načítání ceny" />
			</VariantGroup>
		</VariantContainer>
	),
}

export const LongContent: Story = {
	render: () => (
		<VariantContainer>
			<VariantGroup title="Narrow layout" fullWidth>
				<div className="w-3xs">
					<PriceBlock
						state="from"
						prefix="Cena za jednu samostatně prodejnou jednotku od"
						amountLabel="12 345 678,90 Kč"
						taxLabel="10 203 040,41 Kč bez DPH"
						unitLabel="za velkoobchodní balení po dvaceti čtyřech kusech"
					/>
				</div>
				<div className="w-3xs">
					<PriceBlock
						state="discounted"
						amountLabel="12 345 678,90 Kč"
						originalLabel="14 999 999,90 Kč"
						originalSrLabel="Původní cena"
						taxLabel="včetně daně z přidané hodnoty"
						unitLabel="za velkoobchodní balení"
						discountLabel="Mimořádná akční nabídka"
					/>
				</div>
				<div className="w-3xs">
					<PriceBlock
						state="on-request"
						label="Cena je dostupná na vyžádání u obchodního zástupce"
						detail="Konečná cena závisí na objednaném množství a zvoleném způsobu dopravy."
					/>
				</div>
			</VariantGroup>
		</VariantContainer>
	),
}
