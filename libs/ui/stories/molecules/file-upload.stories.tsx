import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import {
  expect,
  fireEvent,
  fn,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Input } from "../../src/atoms/input"
import { StatusText } from "../../src/atoms/status-text"
import {
  FileUpload,
  type FileUploadProps,
} from "../../src/molecules/file-upload"

const meta = {
  title: "Molecules/FileUpload",
  component: FileUpload,
  tags: ["autodocs", "file-upload"],
  parameters: {
    layout: "centered",
    controls: {
      include: [
        "accept",
        "disabled",
        "invalid",
        "maxFileSize",
        "maxFiles",
        "minFileSize",
      ],
    },
    docs: {
      description: {
        component:
          "A compound file selector built on Zag.js. It owns browser file selection, validation, drag and drop, and file-list state; uploading files to a server remains an application concern.",
      },
    },
  },
  argTypes: {
    accept: {
      control: "object",
      description: "Accepted MIME types and file extensions.",
    },
    allowDrop: {
      control: "boolean",
      description: "Enables drag-and-drop selection.",
    },
    disabled: {
      control: "boolean",
      description: "Disables file selection and removal.",
    },
    invalid: {
      control: "boolean",
      description: "Marks the file selector as invalid.",
    },
    maxFileSize: {
      control: { type: "number", min: 0, step: 1024 },
      description: "Maximum accepted file size in bytes.",
    },
    maxFiles: {
      control: { type: "number", min: 1, step: 1 },
      description: "Maximum number of accepted files.",
    },
    minFileSize: {
      control: { type: "number", min: 0, step: 1024 },
      description: "Minimum accepted file size in bytes.",
    },
  },
  args: {
    accept: { "image/*": [".png", ".jpg", ".jpeg"] },
    disabled: false,
    invalid: false,
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 3,
    minFileSize: 0,
    onFileAccept: fn(),
    onFileChange: fn(),
    onFileReject: fn(),
  },
} satisfies Meta<typeof FileUpload>

export default meta
type Story = StoryObj<typeof meta>

function createTextFile(name = "brief.txt") {
  return new File(["File upload story fixture"], name, {
    type: "text/plain",
    lastModified: 1,
  })
}

function createPdfFile(name = "brief.pdf") {
  return new File(["File upload story fixture"], name, {
    type: "application/pdf",
    lastModified: 1,
  })
}

function createImageFile(name = "product.png") {
  const bytes = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGUExURf9pAP///9U/IS0AAAABYktHRAH/Ai3eAAAAB3RJTUUH6gkBEhMaTYhYpgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII="
    ),
    (character) => character.charCodeAt(0)
  )

  return new File([bytes], name, {
    type: "image/png",
    lastModified: 1,
  })
}

const transformFiles = fn((files: File[]) => Promise.resolve(files))

const validateImage: NonNullable<FileUploadProps["validate"]> = (file) =>
  file.name === "profile.png" ? ["IMAGE_REQUIRES_ALT_TEXT"] : null

function getValidationErrorMessage(error: string) {
  const messages: Record<string, string> = {
    FILE_EXISTS: "This file has already been selected.",
    FILE_INVALID_TYPE: "This file type is not accepted.",
    FILE_TOO_LARGE: "This file is larger than the maximum size.",
    FILE_TOO_SMALL: "This file is smaller than the minimum size.",
    IMAGE_REQUIRES_ALT_TEXT: "Add alternative text before uploading.",
    TOO_MANY_FILES: "The maximum number of files would be exceeded.",
  }

  return messages[error] ?? "This file could not be accepted."
}

function formatFileSize(bytes: number | undefined) {
  if (bytes === undefined || !Number.isFinite(bytes)) {
    return "no size limit"
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}

function formatAcceptedTypes(accept: FileUploadProps["accept"]) {
  if (!accept) {
    return "Any file type"
  }

  if (typeof accept === "string") {
    return accept
  }

  if (Array.isArray(accept)) {
    return accept.join(", ")
  }

  const extensions = Object.values(accept).flat()
  return extensions.length > 0
    ? extensions.join(", ")
    : Object.keys(accept).join(", ")
}

function formatFileRequirements({
  accept,
  maxFileSize,
  maxFiles,
  minFileSize,
}: Pick<
  FileUploadProps,
  "accept" | "maxFileSize" | "maxFiles" | "minFileSize"
>) {
  const requirements = [formatAcceptedTypes(accept)]

  if (maxFiles !== undefined) {
    requirements.push(`up to ${maxFiles} files`)
  }

  if (minFileSize !== undefined && minFileSize > 0) {
    requirements.push(`at least ${formatFileSize(minFileSize)} each`)
  }

  if (maxFileSize !== undefined && Number.isFinite(maxFileSize)) {
    requirements.push(`${formatFileSize(maxFileSize)} each`)
  }

  return requirements.join(", ")
}

type FileItemsProps = {
  imagePreview?: boolean
  type?: "accepted" | "rejected"
}

function FileItems({ imagePreview = false, type = "accepted" }: FileItemsProps) {
  return (
    <FileUpload.Context>
      {(api) => {
        const entries =
          type === "accepted"
            ? api.acceptedFiles.map((file) => ({ file, errors: [] }))
            : api.rejectedFiles

        return (
          <FileUpload.ItemGroup type={type}>
            {entries.map(({ file, errors }) => (
              <FileUpload.Item
                file={file}
                key={`${file.name}-${file.lastModified}`}
              >
                <FileUpload.ItemPreview>
                  {imagePreview && type === "accepted" ? (
                    <FileUpload.ItemPreviewImage />
                  ) : undefined}
                </FileUpload.ItemPreview>
                <div className="flex min-w-0 flex-1 flex-col gap-50">
                  <FileUpload.ItemName />
                  {errors.map((error) => (
                    <StatusText key={error} size="sm" status="error">
                      {getValidationErrorMessage(error)}
                    </StatusText>
                  ))}
                </div>
                <FileUpload.ItemSizeText />
                <FileUpload.ItemDeleteTrigger />
              </FileUpload.Item>
            ))}
          </FileUpload.ItemGroup>
        )
      }}
    </FileUpload.Context>
  )
}

function DropzoneContent({
  detail = "PNG or JPG",
  title = "Drop files here",
}: {
  detail?: string
  title?: string
}) {
  return (
    <>
      <strong>{title}</strong>
      <span className="text-center text-fg-primary text-md">{detail}</span>
    </>
  )
}

function StandardFileUpload(props: FileUploadProps) {
  return (
    <FileUpload {...props} className="w-full max-w-md">
      <FileUpload.Label>Attachments</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select files</FileUpload.Trigger>
      <FileItems />
    </FileUpload>
  )
}

function PlaygroundFileUpload({
  accept,
  disabled,
  invalid,
  maxFileSize,
  maxFiles,
  minFileSize,
  ...props
}: FileUploadProps) {
  return (
    <FileUpload
      {...props}
      accept={accept}
      className="w-full max-w-md"
      disabled={disabled}
      invalid={invalid}
      maxFileSize={maxFileSize}
      maxFiles={maxFiles}
      minFileSize={minFileSize}
    >
      <FileUpload.Label>Attachments</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone>
        <DropzoneContent
          detail={formatFileRequirements({
            accept,
            maxFileSize,
            maxFiles,
            minFileSize,
          })}
        />
      </FileUpload.Dropzone>
      {invalid ? (
        <StatusText showIcon status="error">
          The current file selection is invalid.
        </StatusText>
      ) : undefined}
      <FileUpload.Context>
        {(api) => {
          const hasFiles =
            api.acceptedFiles.length > 0 || api.rejectedFiles.length > 0

          return hasFiles ? (
            <StatusText
              showIcon={api.rejectedFiles.length > 0}
              size="sm"
              status={api.rejectedFiles.length > 0 ? "error" : "default"}
            >
              {api.acceptedFiles.length} accepted, {api.rejectedFiles.length}{" "}
              rejected, {api.remainingFiles} remaining
            </StatusText>
          ) : undefined
        }}
      </FileUpload.Context>
      <FileItems />
      <FileItems type="rejected" />
    </FileUpload>
  )
}

export const Playground: Story = {
  render: (args) => <PlaygroundFileUpload {...args} />,
}

export const States: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Disabled">
        <StandardFileUpload disabled />
      </VariantGroup>
      <VariantGroup fullWidth title="Read only">
        <StandardFileUpload
          defaultAcceptedFiles={[createPdfFile("invoice.pdf")]}
          readOnly
        />
      </VariantGroup>
      <VariantGroup fullWidth title="Invalid">
        <FileUpload className="w-full max-w-md" invalid>
          <FileUpload.Label>Identity document</FileUpload.Label>
          <FileUpload.HiddenInput />
          <FileUpload.Dropzone>
            <DropzoneContent detail="A valid document is required" />
          </FileUpload.Dropzone>
          <StatusText showIcon status="error">
            Select a supported document.
          </StatusText>
        </FileUpload>
      </VariantGroup>
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const disabledTriggers = canvas.getAllByRole("button", {
      name: "Select files",
      hidden: true,
    })
    const hiddenInputs = canvas.getAllByLabelText("Attachments")
    await expect(disabledTriggers).toHaveLength(2)
    await expect(hiddenInputs).toHaveLength(2)
    await Promise.all(
      disabledTriggers.map((trigger) => expect(trigger).toBeDisabled())
    )
    await Promise.all(hiddenInputs.map((input) => expect(input).toBeDisabled()))
    await expect(canvas.getByText("invoice.pdf")).toBeInTheDocument()
    await expect(canvas.getByText("Select a supported document.")).toBeVisible()
  },
}

export const Basic: Story = {
  render: () => <StandardFileUpload />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Attachments")
    await userEvent.upload(input, createTextFile())
    await expect(canvas.getByText("brief.txt")).toBeVisible()
  },
}

export const AcceptedFiles: Story = {
  args: { onFileAccept: fn() },
  render: (args) => (
    <FileUpload
      accept={{ "application/pdf": [".pdf"] }}
      className="w-full max-w-md"
      maxFiles={2}
      onFileAccept={args.onFileAccept}
    >
      <FileUpload.Label>PDF documents</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select PDF files</FileUpload.Trigger>
      <FileItems />
    </FileUpload>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.upload(
      canvas.getByLabelText("PDF documents"),
      createPdfFile("contract.pdf")
    )
    await expect(canvas.getByText("contract.pdf")).toBeVisible()
    await expect(args.onFileAccept).toHaveBeenCalled()
  },
}

export const Multiple: Story = {
  render: () => (
    <FileUpload
      className="w-full max-w-md"
      maxFiles={3}
      transformFiles={transformFiles}
    >
      <FileUpload.Label>Supporting documents</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select up to three files</FileUpload.Trigger>
      <FileItems />
    </FileUpload>
  ),
  play: async ({ canvasElement }) => {
    transformFiles.mockClear()
    const canvas = within(canvasElement)
    await userEvent.upload(canvas.getByLabelText("Supporting documents"), [
      createPdfFile("invoice.pdf"),
      createTextFile("notes.txt"),
    ])
    await expect(canvas.getByText("invoice.pdf")).toBeVisible()
    await expect(canvas.getByText("notes.txt")).toBeVisible()
    await expect(transformFiles).toHaveBeenCalled()
  },
}

export const Dropzone: Story = {
  args: {
    allowDrop: true,
  },
  parameters: {
    controls: {
      include: ["allowDrop"],
    },
  },
  render: (args) => (
    <FileUpload
      accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
      allowDrop={args.allowDrop}
      className="w-full max-w-md"
      maxFiles={4}
    >
      <FileUpload.Label>Product images</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone>
        <DropzoneContent
          detail={
            args.allowDrop
              ? "PNG or JPG, up to four files"
              : "Click to browse; drag and drop is disabled"
          }
          title={args.allowDrop ? "Drop files here" : "Select product images"}
        />
      </FileUpload.Dropzone>
      <FileItems imagePreview />
    </FileUpload>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Product images")
    const dropzone = canvas.getByRole("button", { name: "dropzone" })
    const openFilePicker = spyOn(input, "click").mockImplementation(
      () => undefined
    )

    try {
      dropzone.focus()
      await userEvent.keyboard("{Enter}")
      await waitFor(() => expect(openFilePicker).toHaveBeenCalledTimes(1))
    } finally {
      dropzone.blur()
      openFilePicker.mockRestore()
    }
  },
}

export const ConditionalDropzone: Story = {
  render: () => (
    <FileUpload className="w-full max-w-md" maxFiles={2}>
      <FileUpload.Label>Evidence</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Context>
        {(api) =>
          api.maxFilesReached ? (
            <StatusText status="success">
              Maximum file count reached.
            </StatusText>
          ) : (
            <FileUpload.Dropzone>
              <DropzoneContent
                detail={`${api.remainingFiles} file${api.remainingFiles === 1 ? "" : "s"} remaining`}
              />
            </FileUpload.Dropzone>
          )
        }
      </FileUpload.Context>
      <FileItems />
    </FileUpload>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.upload(canvas.getByLabelText("Evidence"), [
      createTextFile("one.txt"),
      createTextFile("two.txt"),
    ])
    await expect(canvas.getByText("Maximum file count reached.")).toBeVisible()
  },
}

export const CustomPreview: Story = {
  render: () => (
    <FileUpload
      accept={{ "image/*": [".png"] }}
      className="w-full max-w-md"
      defaultAcceptedFiles={[createImageFile("thumbnail.png")]}
    >
      <FileUpload.Label>Thumbnail</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Replace image</FileUpload.Trigger>
      <FileUpload.Context>
        {(api) => (
          <Button
            onClick={() => api.setFiles([createImageFile("replacement.png")])}
            size="md"
            theme="outlined"
            variant="primary"
          >
            Use replacement image
          </Button>
        )}
      </FileUpload.Context>
      <FileItems imagePreview />
    </FileUpload>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const revokeObjectUrl = spyOn(URL, "revokeObjectURL")

    try {
      await expect(
        await canvas.findByAltText("preview of thumbnail.png")
      ).toBeVisible()
      await userEvent.click(
        canvas.getByRole("button", { name: "Use replacement image" })
      )
      await expect(
        await canvas.findByAltText("preview of replacement.png")
      ).toBeVisible()
      await expect(
        canvas.queryByAltText("preview of thumbnail.png")
      ).not.toBeInTheDocument()
      await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledTimes(1))
      await userEvent.click(
        canvas.getByRole("button", { name: "delete file replacement.png" })
      )
      await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledTimes(2))
      await userEvent.upload(
        canvas.getByLabelText("Thumbnail"),
        createImageFile("thumbnail.png")
      )
      await expect(
        await canvas.findByAltText("preview of thumbnail.png")
      ).toBeVisible()
    } finally {
      revokeObjectUrl.mockRestore()
    }
  },
}

export const RejectedFiles: Story = {
  args: { onFileReject: fn() },
  render: (args) => (
    <FileUpload
      accept={{ "image/*": [".png", ".jpg"] }}
      className="w-full max-w-md"
      onFileReject={args.onFileReject}
      validate={validateImage}
    >
      <FileUpload.Label>Profile photo</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select image</FileUpload.Trigger>
      <FileItems />
      <FileItems type="rejected" />
    </FileUpload>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.upload(
      canvas.getByLabelText("Profile photo"),
      createImageFile("profile.png")
    )
    await expect(canvas.getByText("profile.png")).toBeVisible()
    await expect(
      canvas.getByText("Add alternative text before uploading.")
    ).toBeVisible()
    await expect(args.onFileReject).toHaveBeenCalled()
  },
}

export const Directory: Story = {
  render: () => (
    <FileUpload className="w-full max-w-md" directory maxFiles={20}>
      <FileUpload.Label>Project folder</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select folder</FileUpload.Trigger>
      <StatusText size="sm">
        Directory selection depends on browser support.
      </StatusText>
      <FileItems />
    </FileUpload>
  ),
}

export const MediaCapture: Story = {
  render: () => (
    <FileUpload
      accept={{ "image/*": [] }}
      capture="environment"
      className="w-full max-w-md"
    >
      <FileUpload.Label>Receipt photo</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Take or select photo</FileUpload.Trigger>
      <StatusText size="sm">
        Camera capture availability depends on the browser and device.
      </StatusText>
      <FileItems imagePreview />
    </FileUpload>
  ),
}

export const ProgrammaticOpen: Story = {
  render: () => (
    <FileUpload className="w-full max-w-md">
      <FileUpload.Label>Documents</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Context>
        {(api) => (
          <Button
            onClick={api.openFilePicker}
            size="md"
            theme="outlined"
            variant="primary"
          >
            Browse documents
          </Button>
        )}
      </FileUpload.Context>
      <FileItems />
    </FileUpload>
  ),
}

export const InputLike: Story = {
  render: () => (
    <FileUpload className="w-full max-w-md">
      <FileUpload.Label>Attachment</FileUpload.Label>
      <FileUpload.HiddenInput />
      <div className="flex w-full items-center gap-100">
        <FileUpload.Context>
          {(api) => (
            <Input
              aria-label="Selected file"
              placeholder="No file selected"
              readOnly
              value={api.acceptedFiles.map((file) => file.name).join(", ")}
            />
          )}
        </FileUpload.Context>
        <FileUpload.Trigger>Select</FileUpload.Trigger>
      </div>
      <FileItems />
    </FileUpload>
  ),
}

export const Clearable: Story = {
  render: () => (
    <FileUpload
      accept={{ "application/pdf": [".pdf"] }}
      className="w-full max-w-md"
      defaultAcceptedFiles={[
        createPdfFile("invoice.pdf"),
        createPdfFile("receipt.pdf"),
      ]}
      maxFiles={3}
    >
      <div className="flex w-full items-center justify-between gap-100">
        <FileUpload.Label>Documents</FileUpload.Label>
        <FileUpload.ClearTrigger aria-label="Clear all files" />
      </div>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Add document</FileUpload.Trigger>
      <FileItems />
    </FileUpload>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "delete file invoice.pdf" })
    )
    await waitFor(() =>
      expect(canvas.queryByText("invoice.pdf")).not.toBeInTheDocument()
    )
    await expect(canvas.getByText("receipt.pdf")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear all files" })
    )
    await waitFor(() =>
      expect(canvas.queryByText("receipt.pdf")).not.toBeInTheDocument()
    )
    await userEvent.upload(
      canvas.getByLabelText("Documents"),
      createPdfFile("restored.pdf")
    )
    await expect(await canvas.findByText("restored.pdf")).toBeVisible()
  },
}

export const Clipboard: Story = {
  render: () => (
    <FileUpload className="w-full max-w-md" maxFiles={4}>
      <FileUpload.Label>Clipboard attachments</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Context>
        {(api) => (
          <Input
            aria-label="Paste files"
            onPaste={(event) => api.setClipboardFiles(event.clipboardData)}
            placeholder="Paste files from the clipboard"
          />
        )}
      </FileUpload.Context>
      <FileItems />
    </FileUpload>
  ),
}

function ControlledExample({
  onFileChange,
}: Pick<FileUploadProps, "onFileChange">) {
  const [files, setFiles] = useState<File[]>([])

  return (
    <FileUpload
      acceptedFiles={files}
      className="w-full max-w-md"
      maxFiles={2}
      onFileChange={(details) => {
        setFiles(details.acceptedFiles)
        onFileChange?.(details)
      }}
    >
      <FileUpload.Label>Controlled files</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select files</FileUpload.Trigger>
      <StatusText size="sm">
        {files.length} of 2 files selected
      </StatusText>
      <FileItems />
    </FileUpload>
  )
}

export const Controlled: Story = {
  args: { onFileChange: fn() },
  render: (args) => <ControlledExample onFileChange={args.onFileChange} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.upload(
      canvas.getByLabelText("Controlled files"),
      createTextFile("controlled.txt")
    )
    await expect(
      await canvas.findByText("1 of 2 files selected")
    ).toBeVisible()
    await expect(args.onFileChange).toHaveBeenCalled()
  },
}

const onFormSubmit = fn()

function FormExample() {
  return (
    <form
      aria-label="File upload form"
      className="flex w-full max-w-md flex-col gap-150"
      onSubmit={(event) => {
        event.preventDefault()
        onFormSubmit(new FormData(event.currentTarget))
      }}
    >
      <FileUpload name="attachments" required>
        <FileUpload.Label>Required attachment</FileUpload.Label>
        <FileUpload.HiddenInput />
        <FileUpload.Trigger>Select attachment</FileUpload.Trigger>
        <FileItems />
      </FileUpload>
      <Button type="submit">Submit form</Button>
    </form>
  )
}

export const Form: Story = {
  render: () => <FormExample />,
  play: async ({ canvasElement }) => {
    onFormSubmit.mockClear()
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText<HTMLInputElement>(
      "Required attachment"
    )
    await expect(input).toHaveAttribute("name", "attachments")
    await expect(input).toBeRequired()
    await userEvent.upload(input, createPdfFile("signed.pdf"))
    await expect(input.files).toHaveLength(1)
    await expect(input.files?.[0]?.name).toBe("signed.pdf")
    fireEvent.submit(canvas.getByRole("form", { name: "File upload form" }))
    await expect(onFormSubmit).toHaveBeenCalledTimes(1)
    await expect(onFormSubmit.mock.calls[0]?.[0]).toBeInstanceOf(FormData)
  },
}
