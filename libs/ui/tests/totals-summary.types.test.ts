import { describe, expectTypeOf, it } from "vitest"
import type {
	TotalsSummaryProps,
	TotalsSummaryRow,
} from "../src/molecules/totals-summary"

describe("TotalsSummary presentation contract", () => {
	it("accepts readonly prepared rows and formatted totals", () => {
		expectTypeOf<TotalsSummaryProps["rows"]>().toEqualTypeOf<
			readonly TotalsSummaryRow[]
		>()
		expectTypeOf<TotalsSummaryProps["totalValue"]>().toEqualTypeOf<string>()
		expectTypeOf<TotalsSummaryRow["value"]>().toEqualTypeOf<string>()
	})
	it("requires localized text while pending", () => {
		const ready: TotalsSummaryProps = {
			rows: [],
			totalLabel: "Total",
			totalValue: "Choose shipping",
		}
		const pending: TotalsSummaryProps = {
			...ready,
			pending: true,
			pendingLabel: "Updating total",
		}
		// @ts-expect-error An updating summary requires a localized explanation.
		const missingLabel: TotalsSummaryProps = { ...ready, pending: true }
		expectTypeOf(pending).toExtend<TotalsSummaryProps>()
		expectTypeOf(missingLabel).toExtend<TotalsSummaryProps>()
	})
})
