/**
 * LineItem — @techsio/ui-kit organism.
 * @component LineItem
 * @componentVersion v1.0.0
 * @skill line-item-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import {
	createContext,
	type HTMLAttributes,
	type ReactNode,
	type Ref,
	useContext,
	useId,
} from "react"
import { Button, type ButtonProps } from "../atoms/button"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const lineItemVariants = tv({
	slots: {
		root: "grid min-w-0 gap-line-item text-line-item-content-fg has-[>[data-part=image]]:grid-cols-line-item",
		image:
			"size-line-item-image overflow-hidden rounded-line-item-image [&>img]:size-full [&>img]:object-contain",
		body: "flex min-w-0 flex-col gap-line-item-content",
		heading: "flex min-w-0 flex-wrap items-start gap-line-item-heading",
		title:
			"min-w-0 break-words font-line-item-title text-line-item-title-size [[data-part=heading]>&]:flex-1 [[data-part=heading]>&]:basis-line-item-title-min-width",
		price: "min-w-0 max-w-full",
		options: "break-words text-line-item-options-fg text-line-item-detail-size",
		controls: "flex min-w-0 flex-wrap items-end gap-line-item-controls",
		quantity: "min-w-0 max-w-full flex-1 basis-line-item-quantity-width",
		quantityLabel: "break-words text-line-item-detail-size",
		actions: "flex flex-wrap items-center gap-line-item-controls",
		pending: "col-span-full text-line-item-content-fg",
	},
	variants: {
		layout: {
			default: {},
			compact: {
				image: "size-line-item-image-compact",
				root: "gap-line-item-compact",
			},
		},
	},
	defaultVariants: { layout: "default" },
})

type LineItemContextValue = {
	title: string
	readOnly: boolean
	pending: boolean
	styles: ReturnType<typeof lineItemVariants>
}
const LineItemContext = createContext<LineItemContextValue | null>(null)
function useLineItemContext() {
	const context = useContext(LineItemContext)
	if (!context)
		throw new Error("LineItem parts must be rendered inside LineItem")
	return context
}

export type LineItemPartProps = HTMLAttributes<HTMLDivElement> & {
	ref?: Ref<HTMLDivElement>
}
export type LineItemQuantityProps = LineItemPartProps & {
	readOnlyLabel: string
}
export type LineItemRemoveProps = Omit<
	ButtonProps,
	"children" | "aria-label" | "aria-labelledby" | "type"
> & {
	label: string
	children?: never
	"aria-label"?: never
	"aria-labelledby"?: never
}
export type LineItemProps = Omit<
	HTMLAttributes<HTMLDivElement>,
	"title" | "children"
> & {
	title: string
	children: ReactNode
	readOnly?: boolean
	layout?: "default" | "compact"
	ref?: Ref<HTMLDivElement>
} & (
		| { pending: true; pendingLabel: string }
		| { pending?: false; pendingLabel?: string }
	)

export function LineItem({
	title,
	children,
	readOnly = false,
	pending = false,
	pendingLabel,
	layout = "default",
	className,
	ref,
	"aria-describedby": ariaDescribedBy,
	...props
}: LineItemProps) {
	const pendingId = useId()
	const describedBy =
		[ariaDescribedBy, pending ? pendingId : undefined]
			.filter(Boolean)
			.join(" ") || undefined
	const styles = lineItemVariants({ layout })
	return (
		<LineItemContext.Provider value={{ title, readOnly, pending, styles }}>
			<div
				{...props}
				aria-busy={pending || undefined}
				aria-describedby={describedBy}
				className={styles.root({ className })}
				data-scope="line-item"
				data-layout={layout}
				data-pending={pending || undefined}
				data-readonly={readOnly || undefined}
				ref={ref}
			>
				{children}
				{pending ? (
					<StatusText className={styles.pending()} id={pendingId}>
						{pendingLabel}
					</StatusText>
				) : null}
			</div>
		</LineItemContext.Provider>
	)
}

LineItem.Image = function LineItemImage({
	className,
	...props
}: LineItemPartProps) {
	const { styles } = useLineItemContext()
	return (
		<div {...props} className={styles.image({ className })} data-part="image" />
	)
}
LineItem.Body = function LineItemBody({
	className,
	...props
}: LineItemPartProps) {
	const { styles } = useLineItemContext()
	return (
		<div {...props} className={styles.body({ className })} data-part="body" />
	)
}
LineItem.Heading = function LineItemHeading({
	className,
	...props
}: LineItemPartProps) {
	const { styles } = useLineItemContext()
	return (
		<div
			{...props}
			className={styles.heading({ className })}
			data-part="heading"
		/>
	)
}
LineItem.Title = function LineItemTitle({
	className,
	children,
	...props
}: LineItemPartProps) {
	const { title, styles } = useLineItemContext()
	return (
		<div {...props} className={styles.title({ className })} data-part="title">
			{children ?? title}
		</div>
	)
}
LineItem.Price = function LineItemPrice({
	className,
	...props
}: LineItemPartProps) {
	const { styles } = useLineItemContext()
	return (
		<div {...props} className={styles.price({ className })} data-part="price" />
	)
}
LineItem.Options = function LineItemOptions({
	className,
	...props
}: LineItemPartProps) {
	const { styles } = useLineItemContext()
	return (
		<div
			{...props}
			className={styles.options({ className })}
			data-part="options"
		/>
	)
}
LineItem.Controls = function LineItemControls({
	className,
	...props
}: LineItemPartProps) {
	const { styles } = useLineItemContext()
	return (
		<div
			{...props}
			className={styles.controls({ className })}
			data-part="controls"
		/>
	)
}
LineItem.Quantity = function LineItemQuantity({
	readOnlyLabel,
	children,
	className,
	...props
}: LineItemQuantityProps) {
	const { styles, readOnly, pending } = useLineItemContext()
	return readOnly ? (
		<div
			{...props}
			className={styles.quantityLabel({ className })}
			data-part="quantity"
		>
			{readOnlyLabel}
		</div>
	) : (
		<div
			{...props}
			className={styles.quantity({ className })}
			data-part="quantity"
			inert={pending || undefined}
		>
			{children}
		</div>
	)
}
LineItem.Actions = function LineItemActions({
	className,
	...props
}: LineItemPartProps) {
	const { styles, readOnly, pending } = useLineItemContext()
	if (readOnly) return null
	return (
		<div
			{...props}
			className={styles.actions({ className })}
			data-part="actions"
			inert={pending || undefined}
		/>
	)
}
LineItem.Remove = function LineItemRemove({
	label,
	onClick,
	disabled,
	size = "sm",
	theme = "borderless",
	...props
}: LineItemRemoveProps) {
	const { title, readOnly, pending } = useLineItemContext()
	if (readOnly) return null
	return (
		<Button
			{...props}
			aria-label={`${label}: ${title}`}
			data-part="remove"
			disabled={pending || disabled}
			onClick={(event) => {
				if (!pending && !disabled) onClick?.(event)
			}}
			size={size}
			theme={theme}
			type="button"
		>
			{label}
		</Button>
	)
}
