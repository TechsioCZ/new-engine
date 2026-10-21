import type { Meta, StoryObj } from "@storybook/react"
import { useId, useRef, useState } from "react"
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
import { Icon, type IconType } from "../../src/atoms/icon"
import { Input } from "../../src/atoms/input"
import {
  FileUpload,
  type FileUploadProps,
} from "../../src/molecules/file-upload"

const meta = {
  title: "Molecules/FileUpload",
  component: FileUpload,
  tags: ["autodocs", "file-upload"],
  parameters: {
    layout: "padded",
    controls: {
      disable: false,
      include: [
        "size",
        "accept",
        "allowDrop",
        "disabled",
        "invalid",
        "maxFileSize",
        "maxFiles",
        "minFileSize",
        "readOnly",
        "required",
      ],
    },
    docs: {
      description: {
        component:
          "FileUpload lets people choose, validate, and remove local attachments using a keyboard-accessible picker or drop zone; use it for documents and images, not as an upload-progress indicator, because sending files to a server remains an application concern.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
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
    readOnly: {
      control: "boolean",
      description: "Prevents changing the current file selection.",
    },
    required: {
      control: "boolean",
      description: "Marks the native file input and label as required.",
    },
  },
  args: {
    accept: { "image/*": [".png", ".jpg", ".jpeg"] },
    allowDrop: true,
    disabled: false,
    invalid: false,
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 3,
    minFileSize: 0,
    onFileAccept: fn(),
    onFileChange: fn(),
    onFileReject: fn(),
    readOnly: false,
    required: false,
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

function getValidationErrorMessage(error: string) {
  const messages: Record<string, string> = {
    FILE_EXISTS: "This file has already been selected.",
    FILE_INVALID_TYPE: "This file type is not accepted.",
    FILE_TOO_LARGE: "This file is too large. Choose a smaller file.",
    FILE_TOO_SMALL: "This file is smaller than the minimum size.",
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
  previewIcon?: IconType
  type?: "accepted" | "rejected"
}

function FileItems({
  imagePreview = false,
  previewIcon,
  type = "accepted",
}: FileItemsProps) {
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
                  {previewIcon ? (
                    <Icon icon={previewIcon} size="lg" />
                  ) : imagePreview && type === "accepted" ? (
                    <FileUpload.ItemPreviewImage />
                  ) : undefined}
                </FileUpload.ItemPreview>
                <div className="flex min-w-0 flex-1 flex-col gap-50">
                  <FileUpload.ItemName />
                  {errors.map((error) => (
                    <FileUpload.StatusText key={error} showIcon status="error">
                      {getValidationErrorMessage(error)}
                    </FileUpload.StatusText>
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
  detailId,
  title = "Drag files here or browse",
}: {
  detail?: string
  detailId?: string
  title?: string
}) {
  return (
    <>
      <strong>{title}</strong>
      <FileUpload.StatusText
        className="text-center"
        id={detailId}
        status="default"
      >
        {detail}
      </FileUpload.StatusText>
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
  const requirementsId = useId()
  const feedbackId = useId()
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
      <FileUpload.Dropzone aria-describedby={`${requirementsId} ${feedbackId}`}>
        <DropzoneContent
          detailId={requirementsId}
          detail={formatFileRequirements({
            accept,
            maxFileSize,
            maxFiles,
            minFileSize,
          })}
        />
      </FileUpload.Dropzone>
      {invalid ? (
        <FileUpload.StatusText showIcon status="error">
          The current file selection is invalid.
        </FileUpload.StatusText>
      ) : undefined}
      <FileUpload.Context>
        {(api) => {
          const hasFiles =
            api.acceptedFiles.length > 0 || api.rejectedFiles.length > 0

          return (
            <FileUpload.StatusText
              id={feedbackId}
              role="status"
              showIcon={api.rejectedFiles.length > 0}
              status={api.rejectedFiles.length > 0 ? "error" : "default"}
            >
              {hasFiles
                ? `${api.acceptedFiles.length} accepted, ${api.rejectedFiles.length} rejected, ${api.remainingFiles} remaining`
                : "No files selected."}
            </FileUpload.StatusText>
          )
        }}
      </FileUpload.Context>
      <FileItems />
      <FileItems type="rejected" />
    </FileUpload>
  )
}

export const Playground: Story = {
  parameters: {
    controls: { disable: false },
    docs: {
      description: {
        story:
          "Choose or drop images to try live validation, accepted and rejected file lists, removal, and the controls that change file requirements.",
      },
    },
  },
  render: (args) => <PlaygroundFileUpload {...args} />,
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare Small (sm), Medium (md), and Large (lg) with identical copy and values to choose the right form density.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          fullWidth
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
        >
          <PlaygroundFileUpload {...args} size={size} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable controls retain their visible values but cannot receive keyboard focus or change.",
      },
    },
  },
  render: () => (
    <StandardFileUpload
      disabled
      defaultAcceptedFiles={[createPdfFile("project-brief.pdf")]}
    />
  ),
}
export const ReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Read-only values remain focusable and legible while pointer, keyboard and other editing paths are blocked.",
      },
    },
  },
  name: "Read-only",
  render: () => (
    <form
      aria-label="Read-only documents"
      className="w-full max-w-md"
      onSubmit={(event) => event.preventDefault()}
    >
      <FileUpload
        readOnly
        name="attachments"
        defaultAcceptedFiles={[createPdfFile("project-brief.pdf")]}
        className="w-full max-w-md"
      >
        <FileUpload.Label>Project documents</FileUpload.Label>
        <FileUpload.HiddenInput />
        <FileUpload.Dropzone>Read-only project documents</FileUpload.Dropzone>
        <FileUpload.Trigger>Select files</FileUpload.Trigger>
        <FileItems />
        <FileUpload.StatusText>
          These documents are available for inspection; uploading and removing
          are unavailable.
        </FileUpload.StatusText>
      </FileUpload>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.queryByRole("button", { name: /delete file/i })
    ).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("button", { name: "Select files" })
    ).not.toBeInTheDocument()
    const zone = canvas.getByRole("group", { name: "Project documents" })
    zone.focus()
    await userEvent.keyboard("{Enter} ")
    await expect(zone).toHaveFocus()
    await expect(canvas.getByText("project-brief.pdf")).toBeVisible()
    const form = canvas.getByRole<HTMLFormElement>("form", {
      name: "Read-only documents",
    })
    const file = new FormData(form).get("attachments")
    await expect(file).toBeInstanceOf(File)
    await expect((file as File).name).toBe("project-brief.pdf")
    await expect((file as File).size).toBeGreaterThan(0)
  },
}

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Disabled, read-only, invalid, and required selectors explain availability, validation, and native form requirements without relying on color alone.",
      },
    },
  },
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
          <FileUpload.StatusText showIcon status="error">
            Select a supported document.
          </FileUpload.StatusText>
        </FileUpload>
      </VariantGroup>
      <VariantGroup fullWidth title="Required">
        <FileUpload className="w-full max-w-md" required>
          <FileUpload.Label>Required attachments</FileUpload.Label>
          <FileUpload.HiddenInput />
          <FileUpload.Trigger>Select required files</FileUpload.Trigger>
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
    await expect(canvas.getByLabelText(/Required attachments/)).toBeRequired()
    await expect(canvas.getByText("*")).toBeVisible()
  },
}

export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A compact file-picker button adds an attachment without taking the space of a drop zone.",
      },
    },
  },
  render: () => <StandardFileUpload />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Attachments")
    await userEvent.upload(input, createTextFile())
    await expect(canvas.getByText("brief.txt")).toBeVisible()
  },
}

export const AcceptedFiles: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A PDF-only selector demonstrates MIME restrictions and acceptance events for document attachments.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Selecting up to three supporting documents demonstrates multi-file selection and the preprocessing callback.",
      },
    },
  },
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
      disable: false,
      include: ["allowDrop"],
    },
    docs: {
      description: {
        story:
          "A product-image drop zone remains keyboard browsable when drag and drop is disabled through Controls.",
      },
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
    const input = canvas.getByLabelText("Product images", { selector: "input" })
    const dropzone = canvas.getByRole("button", { name: "Product images" })
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

export const DropzoneStates: Story = {
  name: "Drop zone states",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Labelled, non-interactive previews explain idle, drag-over, accepted, rejected, and disabled states alongside a working image selector; server upload progress belongs to the application.",
      },
    },
  },
  render: () => (
    <div className="flex w-full max-w-3xl flex-col gap-300">
      <p className="text-fg-secondary text-sm">
        The first five examples are static previews, not upload targets. Try
        choosing or dropping files in the interactive example below.
      </p>
      <div className="grid grid-cols-1 gap-300 md:grid-cols-2">
        <StaticDropzone state="idle" />
        <StaticDropzone state="dragging" />
        <StaticDropzone state="accepted" />
        <StaticDropzone state="rejected" />
        <StaticDropzone state="disabled" />
      </div>
      <section
        aria-label="Interactive file selection"
        className="flex flex-col gap-150"
      >
        <h3 className="font-semibold">Try it: choose, drop, or remove files</h3>
        <p className="text-fg-secondary text-sm">
          Choose a PNG or JPG to see acceptance. Drop a PDF to see the rejection
          reason. Use Tab then Enter or Space to browse without a mouse.
        </p>
        <PlaygroundFileUpload
          accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
          allowDrop
          maxFileSize={5 * 1024 * 1024}
          maxFiles={3}
        />
      </section>
      <p className="text-fg-secondary text-sm">
        Selecting a file does not upload it. FileUpload has no server-upload or
        progress API; the application sends accepted files and displays its own
        transfer progress.
      </p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const interactive = within(
      within(canvasElement).getByRole("region", {
        name: "Interactive file selection",
      })
    )
    const input = interactive.getByLabelText("Attachments", {
      selector: "input",
    })
    const browse = interactive.getByRole("button", { name: "Attachments" })
    const openFilePicker = spyOn(input, "click").mockImplementation(
      () => undefined
    )
    try {
      browse.focus()
      await userEvent.keyboard("{Enter} ")
      await waitFor(() => expect(openFilePicker).toHaveBeenCalledTimes(2))
    } finally {
      openFilePicker.mockRestore()
    }
    await userEvent.upload(input, createImageFile("accepted.png"))
    await expect(interactive.getByText("accepted.png")).toBeVisible()
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(createPdfFile("report.pdf"))
    // Synthetic DataTransfer items have no filesystem entry; model a real file drag.
    const items = Array.from(dataTransfer.items)
    Object.defineProperty(items[0], "webkitGetAsEntry", {
      value: () => ({ isFile: true, isDirectory: false }),
    })
    Object.defineProperty(dataTransfer, "items", { value: items })
    fireEvent.dragOver(browse, { dataTransfer })
    await waitFor(() => expect(browse).toHaveAttribute("data-dragging"))
    fireEvent.drop(browse, { dataTransfer })
    await expect(
      await interactive.findByText("This file type is not accepted.")
    ).toBeVisible()
    await expect(interactive.getByText("accepted.png")).toBeVisible()
  },
}

type StaticDropzoneState =
  | "idle"
  | "dragging"
  | "accepted"
  | "rejected"
  | "disabled"

const staticDropzoneCopy = {
  idle: {
    label: "Idle",
    title: "Drag images here or browse",
    detail: "PNG or JPG, up to 5 MB each",
  },
  dragging: {
    label: "Drag-over",
    title: "Release to add images",
    detail: "A solid border highlights the active drop target",
  },
  accepted: {
    label: "Accepted",
    title: "Image ready",
    detail: "product-front.png has been selected, not uploaded",
  },
  rejected: {
    label: "Rejected / error",
    title: "Choose a supported image",
    detail: "PNG or JPG, up to 5 MB each",
  },
  disabled: {
    label: "Disabled",
    title: "Image selection unavailable",
    detail: "You need editor access to add product images",
  },
} satisfies Record<
  StaticDropzoneState,
  { label: string; title: string; detail: string }
>

function StaticDropzone({ state }: { state: StaticDropzoneState }) {
  const { label, title, detail } = staticDropzoneCopy[state]
  return (
    <section
      aria-label={`${label} static preview`}
      className="flex flex-col gap-150"
    >
      <h3 className="font-semibold">
        {label}{" "}
        <span className="font-normal text-fg-secondary text-sm">
          — static preview
        </span>
      </h3>
      <FileUpload
        allowDrop={false}
        disabled={state === "disabled"}
        invalid={state === "rejected"}
        readOnly={state !== "disabled"}
      >
        <FileUpload.Label className="sr-only">{label} example</FileUpload.Label>
        <FileUpload.HiddenInput />
        <FileUpload.Dropzone
          data-dragging={state === "dragging" ? "" : undefined}
        >
          <Icon
            icon={
              state === "accepted"
                ? "token-icon-status-text-success"
                : state === "rejected"
                  ? "token-icon-status-text-error"
                  : "token-icon-file-upload-trigger"
            }
            size="lg"
          />
          <DropzoneContent title={title} detail={detail} />
        </FileUpload.Dropzone>
        {state === "accepted" && (
          <FileUpload.StatusText role="note" showIcon status="success">
            product-front.png is ready to upload.
          </FileUpload.StatusText>
        )}
        {state === "rejected" && (
          <FileUpload.StatusText role="note" showIcon status="error">
            report.pdf is not supported. Choose a PNG or JPG.
          </FileUpload.StatusText>
        )}
        {state === "disabled" && (
          <FileUpload.StatusText>
            Editor access is required to add product images.
          </FileUpload.StatusText>
        )}
      </FileUpload>
    </section>
  )
}

export const ConditionalDropzone: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The drop zone disappears at the two-file limit and returns when a selected file is removed.",
      },
    },
  },
  render: () => (
    <FileUpload className="w-full max-w-md" maxFiles={2}>
      <FileUpload.Label>Evidence</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Context>
        {(api) =>
          api.maxFilesReached ? (
            <FileUpload.StatusText status="success">
              Maximum file count reached.
            </FileUpload.StatusText>
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
    await userEvent.upload(
      canvas.getByLabelText("Evidence", { selector: "input" }),
      [createTextFile("one.txt"), createTextFile("two.txt")]
    )
    await expect(canvas.getByText("Maximum file count reached.")).toBeVisible()
  },
}

export const CustomPreview: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A file-type icon demonstrates custom previews, replacement, and removal without requiring an image thumbnail.",
      },
    },
  },
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
      <FileItems previewIcon="token-icon-file-upload-image" />
    </FileUpload>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("thumbnail.png")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Use replacement image" })
    )
    await expect(canvas.getByText("replacement.png")).toBeVisible()
    await expect(canvas.queryByText("thumbnail.png")).not.toBeInTheDocument()
    await userEvent.click(
      canvas.getByRole("button", { name: "delete file replacement.png" })
    )
    await waitFor(() =>
      expect(canvas.queryByText("replacement.png")).not.toBeInTheDocument()
    )
    await userEvent.upload(
      canvas.getByLabelText("Thumbnail"),
      createImageFile("thumbnail.png")
    )
    await expect(await canvas.findByText("thumbnail.png")).toBeVisible()
  },
}

export const RejectedFiles: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A file-size limit rejects an oversized photo, then accepts a smaller replacement so recovery is actionable.",
      },
    },
  },
  args: { onFileReject: fn() },
  render: (args) => (
    <FileUpload
      accept={{ "image/*": [".png", ".jpg"] }}
      className="w-full max-w-md"
      onFileReject={args.onFileReject}
      maxFileSize={100}
    >
      <FileUpload.Label>Profile photo</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select image</FileUpload.Trigger>
      <FileUpload.StatusText>
        Choose an image no larger than 100 bytes.
      </FileUpload.StatusText>
      <FileItems />
      <FileItems type="rejected" />
    </FileUpload>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.upload(
      canvas.getByLabelText("Profile photo"),
      new File([new Uint8Array(101)], "profile.png", { type: "image/png" })
    )
    await expect(canvas.getByText("profile.png")).toBeVisible()
    await expect(
      canvas.getByText("This file is too large. Choose a smaller file.")
    ).toBeVisible()
    await expect(args.onFileReject).toHaveBeenCalled()
    await userEvent.upload(
      canvas.getByLabelText("Profile photo"),
      new File(["small image"], "smaller.png", { type: "image/png" })
    )
    await expect(await canvas.findByText("smaller.png")).toBeVisible()
    await expect(
      canvas.queryByText("This file is too large. Choose a smaller file.")
    ).not.toBeInTheDocument()
  },
}

export const Directory: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Folder selection collects project files where the browser supports directory picking.",
      },
    },
  },
  render: () => (
    <FileUpload className="w-full max-w-md" directory maxFiles={20}>
      <FileUpload.Label>Project folder</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Select folder</FileUpload.Trigger>
      <FileUpload.StatusText>
        Directory selection depends on browser support.
      </FileUpload.StatusText>
      <FileItems />
    </FileUpload>
  ),
}

export const MediaCapture: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A receipt-photo picker offers camera capture on supported devices and falls back to normal file selection.",
      },
    },
  },
  render: () => (
    <FileUpload
      accept={{ "image/*": [] }}
      capture="environment"
      className="w-full max-w-md"
    >
      <FileUpload.Label>Receipt photo</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Trigger>Take or select photo</FileUpload.Trigger>
      <FileUpload.StatusText>
        Camera capture availability depends on the browser and device.
      </FileUpload.StatusText>
      <FileItems imagePreview />
    </FileUpload>
  ),
}

export const ProgrammaticOpen: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A custom Browse documents button opens the native file picker through the context API.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "A read-only filename field pairs with a picker button for compact attachment forms.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "A prefilled document list supports removing one attachment or clearing the entire selection.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Pasting clipboard files into the text field adds them to the selection when supported by the browser.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.upload(
      canvas.getByLabelText("Clipboard attachments", { selector: "input" }),
      [createPdfFile("first.pdf"), createPdfFile("second.pdf")]
    )
    const first = canvas.getByRole("button", { name: /delete file first.pdf/i })
    first.focus()
    await userEvent.keyboard("{Enter}")
    const second = canvas.getByRole("button", {
      name: /delete file second.pdf/i,
    })
    await waitFor(() => expect(second).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Clipboard attachments" })
      ).toHaveFocus()
    )
  },
  render: () => (
    <FileUpload className="w-full max-w-md" maxFiles={4}>
      <FileUpload.Label>Clipboard attachments</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone>Drop attachments here or browse</FileUpload.Dropzone>
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
      <FileUpload.StatusText>
        {files.length} of 2 files selected
      </FileUpload.StatusText>
      <FileItems />
    </FileUpload>
  )
}

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Application-owned file state stays synchronized with selection, removal, and the visible file count.",
      },
    },
  },
  args: { onFileChange: fn() },
  render: (args) => <ControlledExample onFileChange={args.onFileChange} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.upload(
      canvas.getByLabelText("Controlled files"),
      createTextFile("controlled.txt")
    )
    await expect(await canvas.findByText("1 of 2 files selected")).toBeVisible()
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
  parameters: {
    docs: {
      description: {
        story:
          "A required attachment participates in native form validation and FormData without a separate file-state model.",
      },
    },
  },
  render: () => <FormExample />,
  play: async ({ canvasElement }) => {
    onFormSubmit.mockClear()
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText<HTMLInputElement>(/Required attachment/)
    await expect(canvas.getByText("*")).toBeVisible()
    const committed = canvasElement.querySelector<HTMLInputElement>(
      'input[name="attachments"]'
    )!
    await expect(input).not.toHaveAttribute("name")
    await expect(committed).toBeRequired()
    await expect(input).not.toBeRequired()
    await userEvent.upload(input, createPdfFile("signed.pdf"))
    await waitFor(() => expect(committed.files).toHaveLength(1))
    await expect(committed.files?.[0]?.name).toBe("signed.pdf")
    fireEvent.submit(canvas.getByRole("form", { name: "File upload form" }))
    await expect(onFormSubmit).toHaveBeenCalledTimes(1)
    await expect(onFormSubmit.mock.calls[0]?.[0]).toBeInstanceOf(FormData)
  },
}

export const PendingTransformation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pending file processing is discarded when the field becomes read-only or disabled, even if editing is restored before processing finishes.",
      },
    },
  },
  render: () => {
    const [readOnly, setReadOnly] = useState(false)
    const [disabled, setDisabled] = useState(false)
    const complete = useRef<(() => void) | null>(null)
    return (
      <div className="flex w-full max-w-md flex-col gap-200">
        <FileUpload
          readOnly={readOnly}
          disabled={disabled}
          maxFiles={3}
          defaultAcceptedFiles={[createPdfFile("project-brief.pdf")]}
          transformFiles={(files) =>
            new Promise((resolve) => {
              complete.current = () => resolve(files)
            })
          }
        >
          <FileUpload.Label>Project attachments</FileUpload.Label>
          <FileUpload.HiddenInput />
          <FileUpload.Trigger>Choose attachment</FileUpload.Trigger>
          <FileItems />
          <FileUpload.Context>
            {(api) => (
              <FileUpload.StatusText>
                {api.transforming
                  ? "Processing attachment…"
                  : "Ready to choose an attachment."}
              </FileUpload.StatusText>
            )}
          </FileUpload.Context>
        </FileUpload>
        <Button theme="outlined" onClick={() => setReadOnly((value) => !value)}>
          Toggle read-only
        </Button>
        <Button theme="outlined" onClick={() => setDisabled((value) => !value)}>
          Toggle disabled
        </Button>
        <Button onClick={() => complete.current?.()}>Finish processing</Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText<HTMLInputElement>(
      "Project attachments",
      { selector: "input" }
    )
    for (const state of ["read-only", "disabled"]) {
      // Also cover re-enabling before a stale transform completes.
      for (const restoreBeforeFinish of [false, true]) {
        const name = `pending-${state}-${restoreBeforeFinish}.pdf`
        await userEvent.upload(input, createPdfFile(name))
        await canvas.findByText("Processing attachment…")
        await userEvent.click(
          canvas.getByRole("button", { name: `Toggle ${state}` })
        )
        if (restoreBeforeFinish)
          await userEvent.click(
            canvas.getByRole("button", { name: `Toggle ${state}` })
          )
        await userEvent.click(
          canvas.getByRole("button", { name: "Finish processing" })
        )
        await canvas.findByText("Ready to choose an attachment.")
        await expect(canvas.queryByText(name)).not.toBeInTheDocument()
        await expect(canvas.getByText("project-brief.pdf")).toBeVisible()
        if (!restoreBeforeFinish)
          await userEvent.click(
            canvas.getByRole("button", { name: `Toggle ${state}` })
          )
      }
    }
  },
}

export const BatchRegressions: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Deferred batches exercise reverse completion, capacity, cancellation, failure and committed native form submission.",
      },
    },
  },
  render: () => <BatchRegressionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", {
      name: "Batch form",
    }) as HTMLFormElement
    const picker = canvas.getByLabelText<HTMLInputElement>(/Batch attachments/)
    const files = (names: string[]) =>
      names.map((name) => new File(["small"], name, { type: "text/plain" }))
    const names = () =>
      new FormData(form)
        .getAll("attachments")
        .map((file) => (file as File).name)
        .filter(Boolean)
    await userEvent.upload(picker, files(["one.txt", "two.txt"]))
    await canvas.findByText("Processing batches")
    await expect(names()).toEqual([])
    await expect(form.checkValidity()).toBe(false)
    await userEvent.upload(picker, files(["three.txt", "four.txt"]))
    await userEvent.click(canvas.getByRole("button", { name: "Finish newest" }))
    await waitFor(() => expect(names()).toEqual(["three.txt", "four.txt"]))
    await expect(canvas.getByText("Processing batches")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Finish oldest" }))
    await canvas.findByText("Batches settled")
    await expect(names()).toEqual(["three.txt", "four.txt"])
    await expect(
      canvas.getAllByText("The maximum number of files would be exceeded.")
    ).toHaveLength(2)
    await userEvent.click(canvas.getByRole("button", { name: "Clear via API" }))
    await userEvent.upload(picker, files(["late.txt"]))
    await canvas.findByText("Processing batches")
    await userEvent.click(canvas.getByRole("button", { name: "Clear files" }))
    await userEvent.click(canvas.getByRole("button", { name: "Finish oldest" }))
    await canvas.findByText("Batches settled")
    await expect(names()).toEqual([])
    await expect(canvas.queryByText("late.txt")).not.toBeInTheDocument()
    await userEvent.upload(picker, files(["failure.txt"]))
    await canvas.findByText("Processing batches")
    await userEvent.click(canvas.getByRole("button", { name: "Fail oldest" }))
    await expect(
      await canvas.findByText(
        "Files could not be processed. Choose the files again to retry."
      )
    ).toBeVisible()
    await expect(names()).toEqual([])
    await userEvent.upload(picker, files(["good.txt"]))
    await canvas.findByText("Processing batches")
    await userEvent.click(canvas.getByRole("button", { name: "Finish oldest" }))
    await waitFor(() => expect(names()).toEqual(["good.txt"]))
    await userEvent.upload(
      picker,
      new File([new Uint8Array(101)], "too-large.txt", { type: "text/plain" })
    )
    await expect(names()).toEqual(["good.txt"])
    await expect(
      canvas.getByText("This file is too large. Choose a smaller file.")
    ).toBeVisible()
    await userEvent.upload(picker, files(["reset-pending.txt"]))
    await canvas.findByText("Processing batches")
    await userEvent.click(canvas.getByRole("button", { name: "Reset attachments" }))
    await userEvent.click(canvas.getByRole("button", { name: "Finish oldest" }))
    await canvas.findByText("Batches settled")
    await expect(names()).toEqual([])
    await expect(canvas.queryByText("reset-pending.txt")).not.toBeInTheDocument()
    await userEvent.upload(picker, files(["preserve-pending.txt"]))
    await canvas.findByText("Processing batches")
    // A later listener can cancel reset: neither the batch nor its epoch changes.
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true })
    await userEvent.click(canvas.getByRole("button", { name: "Reset attachments" }))
    await expect(canvas.getByText("Processing batches")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Finish oldest" }))
    await canvas.findByText("Batches settled")
    await waitFor(() => expect(names()).toEqual(["preserve-pending.txt"]))
    await userEvent.click(canvas.getByRole("button", { name: "Reset attachments" }))
    await waitFor(() => expect(names()).toEqual([]))
  },
}
function BatchRegressionExample({ maxFiles = 3 }: { maxFiles?: number } = {}) {
  const pending = useRef<
    Array<{
      files: File[]
      resolve: (files: File[]) => void
      reject: (error: Error) => void
    }>
  >([])
  const [readOnly, setReadOnly] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [controlled, setControlled] = useState(false)
  return (
    <div className="flex w-full max-w-md flex-col gap-200">
      <form
        aria-label="Batch form"
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset disabled={disabled}>
          <legend>Attachments</legend>
          <FileUpload
            name="attachments"
            maxFiles={maxFiles}
            required
            readOnly={readOnly}
            acceptedFiles={controlled ? [] : undefined}
            maxFileSize={100}
            transformFiles={(files) =>
              new Promise((resolve, reject) => {
                pending.current.push({ files, resolve, reject })
              })
            }
          >
            <FileUpload.Label>Batch attachments</FileUpload.Label>
            <FileUpload.HiddenInput />
            <FileUpload.Trigger>Select files</FileUpload.Trigger>
            <FileUpload.Context>
              {(api) => (
                <>
                  <Button type="button" onClick={() => api.clearFiles()}>
                    Clear via API
                  </Button>
                  <FileUpload.StatusText>
                    {api.transforming
                      ? "Processing batches"
                      : "Batches settled"}
                  </FileUpload.StatusText>
                </>
              )}
            </FileUpload.Context>
            <FileUpload.ClearTrigger />
            <FileItems />
            <FileItems type="rejected" />
          </FileUpload>
        </fieldset>
        <Button type="submit">Submit attachments</Button>
        <Button type="reset" theme="outlined">Reset attachments</Button>
      </form>
      <Button
        type="button"
        onClick={() => {
          const batch = pending.current.shift()
          batch?.resolve(batch.files)
        }}
      >
        Finish oldest
      </Button>
      <Button
        type="button"
        onClick={() => {
          const batch = pending.current.pop()
          batch?.resolve(batch.files)
        }}
      >
        Finish newest
      </Button>
      <Button
        type="button"
        onClick={() =>
          pending.current.shift()?.reject(new Error("Processing failed"))
        }
      >
        Fail oldest
      </Button>
      <Button type="button" onClick={() => setReadOnly((value) => !value)}>
        Toggle batch read-only
      </Button>
      <Button type="button" onClick={() => setDisabled((value) => !value)}>
        Toggle batch fieldset
      </Button>
      <Button type="button" onClick={() => setControlled((value) => !value)}>
        Toggle rejected controlled state
      </Button>
    </div>
  )
}

export const ReplacementRegressions: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Single-file replacement is latest-request-wins, including when the controlled parent declines a proposal.",
      },
    },
  },
  render: () => <BatchRegressionExample maxFiles={1} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const picker = canvas.getByLabelText<HTMLInputElement>(/Batch attachments/)
    const form = canvas.getByRole("form", {
      name: "Batch form",
    }) as HTMLFormElement
    const names = () =>
      new FormData(form)
        .getAll("attachments")
        .map((file) => (file as File).name)
        .filter(Boolean)
    await userEvent.upload(picker, new File(["old"], "old.txt"))
    await canvas.findByText("Processing batches")
    await userEvent.upload(picker, new File(["new"], "new.txt"))
    await userEvent.click(canvas.getByRole("button", { name: "Finish newest" }))
    await waitFor(() => expect(names()).toEqual(["new.txt"]))
    await userEvent.click(canvas.getByRole("button", { name: "Finish oldest" }))
    await canvas.findByText("Batches settled")
    await expect(names()).toEqual(["new.txt"])
    await expect(canvas.queryByText("old.txt")).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Clear via API" }))
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle rejected controlled state" })
    )
    await userEvent.upload(picker, new File(["controlled"], "declined.txt"))
    await canvas.findByText("Processing batches")
    await userEvent.click(canvas.getByRole("button", { name: "Finish oldest" }))
    await canvas.findByText("Batches settled")
    await expect(names()).toEqual([])
    await expect(canvas.queryByText("declined.txt")).not.toBeInTheDocument()
  },
}
