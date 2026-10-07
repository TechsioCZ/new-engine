import { type ComponentProps, createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, expectTypeOf, it } from "vitest"
import { LineItem, type LineItemProps } from "../src/organisms/line-item"

describe("LineItem compound contract", () => {
	it("requires localized pending copy and a product name", () => {
		const ready: LineItemProps = { title: "Product", children: null }
		// @ts-expect-error Pending requires a localized explanation.
		const unlabeledPending: LineItemProps = { ...ready, pending: true }
		// @ts-expect-error Product name is required for removal naming.
		const unnamed: LineItemProps = { children: null }
		expectTypeOf(ready).toExtend<LineItemProps>()
		expectTypeOf(unlabeledPending).toExtend<LineItemProps>()
		expectTypeOf(unnamed).toExtend<LineItemProps>()
	})
	it("requires readable quantity text and a localized remove label", () => {
		type QuantityProps = ComponentProps<typeof LineItem.Quantity>
		type RemoveProps = ComponentProps<typeof LineItem.Remove>
		expectTypeOf<QuantityProps["readOnlyLabel"]>().toEqualTypeOf<string>()
		// @ts-expect-error A quantity part needs a read-only fallback.
		const missingQuantityLabel: QuantityProps = { children: null }
		// @ts-expect-error Removal needs a visible localized label.
		const missingRemoveLabel: RemoveProps = { onClick: () => undefined }
		const replacedRemoveLabel: RemoveProps = {
			label: "Remove",
			// @ts-expect-error Caller cannot replace the product-specific accessible name.
			"aria-label": "Delete",
		}
		expectTypeOf(missingQuantityLabel).toExtend<QuantityProps>()
		expectTypeOf(missingRemoveLabel).toExtend<RemoveProps>()
		expectTypeOf(replacedRemoveLabel).toExtend<RemoveProps>()
	})
	it("omits editable children and actions when the root is read-only", () => {
		const html = renderToStaticMarkup(
			createElement(LineItem, {
				title: "Product",
				readOnly: true,
				children: [
					createElement(
						LineItem.Quantity,
						{ key: "quantity", readOnlyLabel: "2 pieces" },
						createElement("input", { "aria-label": "Quantity" }),
					),
					createElement(
						LineItem.Actions,
						{ key: "actions" },
						createElement("button", { type: "button" }, "Save"),
					),
					createElement(LineItem.Remove, {
						key: "remove",
						label: "Remove",
						onClick: () => undefined,
					}),
				],
			}),
		)
		expect(html).toContain("2 pieces")
		expect(html).not.toContain("<input")
		expect(html).not.toContain("<button")
	})
	it("rejects a part rendered outside its root", () => {
		expect(() => renderToStaticMarkup(createElement(LineItem.Title))).toThrow(
			"LineItem parts must be rendered inside LineItem",
		)
	})
})
