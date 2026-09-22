// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2956-157
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/file-upload.tsx
// component=FileUpload

import figma from "figma"

const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  invalid: false,
  disabled: true,
  readonly: false,
})
const invalid = figma.selectedInstance.getEnum("state", {
  default: false,
  invalid: true,
  disabled: false,
  readonly: false,
})
const readOnly = figma.selectedInstance.getEnum("state", {
  default: false,
  invalid: false,
  disabled: false,
  readonly: true,
})
const required = figma.selectedInstance.getEnum("required", {
  false: false,
  true: true,
})

export default {
  id: "FileUpload",
  imports: [
    'import { FileUpload } from "@techsio/ui-kit/molecules/file-upload"',
  ],
  example: figma.code`<FileUpload.Root${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "invalid",
    invalid,
  )}${figma.helpers.react.renderProp(
    "readOnly",
    readOnly,
  )}${figma.helpers.react.renderProp("required", required)}>
        <FileUpload.Label>Attachments</FileUpload.Label>
        <FileUpload.HiddenInput />
        <FileUpload.Dropzone>Drop files here</FileUpload.Dropzone>
        <FileUpload.Trigger>Select files</FileUpload.Trigger>
      </FileUpload.Root>`,
  metadata: { nestable: true },
}
