// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3861-1334
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/quantity-field.tsx
// component=QuantityField

import figma from "figma"

const instance = figma.selectedInstance
const size = instance.getEnum("size", { sm: "sm", md: "md", lg: "lg" })
const state = instance.getEnum("state", {
	default: "default",
	error: "error",
	pending: "pending",
	disabled: "disabled",
	readonly: "readonly",
})
const hideLabel = instance.getEnum("hideLabel", { false: false, true: true })
const unitLabel = instance.getString("unitLabel")
const showHelperText = instance.getBoolean("showHelperText")

// These nested texts become QuantityField prop values, rather than child JSX.
function text(name, path) {
	const layer = instance.findText(name, { traverseInstances: true, path })
	return layer.type === "TEXT" ? layer.textContent : undefined
}

const label = text("Label", ["Label"])
const initialValue = text("Value", ["NumericInput"]) ?? ""
const helperText = showHelperText
	? text("Default supporting text", ["Helper"])
	: undefined
const error = state === "error" ? text("Error message", ["Error"]) : undefined
const pendingLabel =
	state === "pending" ? text("Default supporting text", ["Pending"]) : undefined
const labelInstance = instance.findInstance("Label")
const required =
	labelInstance.type === "INSTANCE"
		? labelInstance.getEnum("required", { false: false, true: true })
		: undefined

export default {
	id: "QuantityField",
	imports: [
		'import { useState } from "react"',
		'import { QuantityField } from "@techsio/ui-kit/molecules/quantity-field"',
	],
	example: figma.code`const [value, setValue] = useState(${JSON.stringify(initialValue)});

<QuantityField${figma.helpers.react.renderProp("label", label)}${figma.helpers.react.renderProp(
		"unitLabel",
		unitLabel,
	)}${figma.helpers.react.renderProp("size", size)}${figma.helpers.react.renderProp(
		"hideLabel",
		hideLabel,
	)}${figma.helpers.react.renderProp("required", required)}${figma.helpers.react.renderProp(
		"helperText",
		helperText,
	)}${figma.helpers.react.renderProp("error", error)}${figma.helpers.react.renderProp(
		"disabled",
		state === "disabled",
	)}${figma.helpers.react.renderProp("readOnly", state === "readonly")}${
		state === "pending"
			? figma.code` pending={true}${figma.helpers.react.renderProp("pendingLabel", pendingLabel)}`
			: ""
	}
  value={value}
  onValueChange={({ value }) => setValue(value)}
/>`,
	metadata: { nestable: false },
}
