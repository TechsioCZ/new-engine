/**
 * TotalsSummary — @techsio/ui-kit molecule.
 * @component TotalsSummary
 * @componentVersion v1.0.0
 * @skill totals-summary-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import { type HTMLAttributes, type ReactNode, type Ref, useId } from "react"
import { tv } from "../utils"

const totalsSummaryVariants = tv({
	slots: {
		root: "flex min-w-0 flex-col gap-totals-summary text-totals-summary-fg text-totals-summary-size",
		list: "flex min-w-0 flex-col gap-totals-summary-rows",
		row: "flex min-w-0 items-baseline justify-between gap-totals-summary-columns",
		label: "min-w-0 flex-1 break-words",
		value: "min-w-0 flex-1 break-words text-end",
		note: "block text-totals-summary-note-fg text-totals-summary-note-size",
		total:
			"flex min-w-0 items-baseline justify-between gap-totals-summary-columns border-t-(length:--border-width-totals-summary-divider) border-totals-summary-divider-border pt-totals-summary-total font-totals-summary-total text-totals-summary-total-size",
		footer: "text-totals-summary-note-fg text-totals-summary-note-size",
		actions: "flex flex-col gap-totals-summary-actions",
		pending: "text-totals-summary-note-fg text-totals-summary-note-size",
	},
	variants: {
		emphasis: {
			default: { row: "" },
			discount: { row: "text-totals-summary-discount-fg" },
		},
	},
	defaultVariants: { emphasis: "default" },
})

export type TotalsSummaryRow = {
	id: string
	label: string
	value: string
	emphasis?: "default" | "discount"
	note?: string
}

export type TotalsSummaryProps = Omit<
	HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	rows: readonly TotalsSummaryRow[]
	totalLabel: string
	totalValue: string
	footer?: ReactNode
	actions?: ReactNode
	ref?: Ref<HTMLDivElement>
} & (
		| { pending: true; pendingLabel: string }
		| { pending?: false; pendingLabel?: string }
	)

export function TotalsSummary({
	rows,
	totalLabel,
	totalValue,
	footer,
	actions,
	pending,
	pendingLabel,
	className,
	"aria-describedby": describedBy,
	...props
}: TotalsSummaryProps) {
	const pendingId = useId()
	const styles = totalsSummaryVariants()
	return (
		<div
			{...props}
			aria-busy={pending || undefined}
			aria-describedby={
				[describedBy, pending ? pendingId : undefined]
					.filter(Boolean)
					.join(" ") || undefined
			}
			className={styles.root({ className })}
			data-scope="totals-summary"
			data-state={pending ? "pending" : "ready"}
		>
			<dl className={styles.list()}>
				{rows.map(({ id, label, value, emphasis, note }) => (
					<div className={totalsSummaryVariants({ emphasis }).row()} key={id}>
						<dt className={styles.label()}>{label}</dt>
						<dd className={styles.value()}>
							{value}
							{note ? <span className={styles.note()}>{note}</span> : null}
						</dd>
					</div>
				))}
				<div className={styles.total()}>
					<dt className={styles.label()}>{totalLabel}</dt>
					<dd className={styles.value()}>{totalValue}</dd>
				</div>
			</dl>
			{pending ? (
				<p className={styles.pending()} id={pendingId}>
					{pendingLabel}
				</p>
			) : null}
			{footer ? <div className={styles.footer()}>{footer}</div> : null}
			{actions ? (
				<div className={styles.actions()} inert={pending || undefined}>
					{actions}
				</div>
			) : null}
		</div>
	)
}
