/**
 * FileUpload — @techsio/ui-kit molecule.
 *
 * @component FileUpload
 * @componentVersion v1.1.2
 * @skill file-upload-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the file-upload-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  connect as connectFileUpload,
  type FileChangeDetails,
  type FileRejection,
  type Api as FileUploadApi,
  type ItemType as FileUploadItemType,
  type Machine as FileUploadMachine,
  type Props as FileUploadMachineProps,
  machine as fileUploadMachine,
} from "@zag-js/file-upload"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconType } from "../atoms/icon"
import { Image } from "../atoms/image"
import { Label } from "../atoms/label"
import { StatusText, type StatusTextProps } from "../atoms/status-text"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import { subscribeOwnerFormReset } from "../internal/form-control-lifecycle"
import { useEffectiveDisabled } from "../internal/use-effective-disabled"
import { tv } from "../utils"

const fileUploadStyles = tv({
  slots: {
    root: "focus-visible:file-upload-focus flex w-full flex-col items-start gap-file-upload-root",
    label: [
      "font-file-upload-label text-file-upload-label-fg",
      "data-disabled:text-file-upload-label-disabled-fg",
    ],
    dropzone: [
      "flex min-h-file-upload-dropzone-min-height w-full cursor-pointer flex-col items-center justify-center gap-file-upload-dropzone",
      "file-upload-dropzone-border-dashed file-upload-dropzone-border-width rounded-file-upload-dropzone border-file-upload-dropzone-border bg-file-upload-dropzone-bg p-file-upload-dropzone",
      "transition-colors not-data-disabled:not-data-readonly:hover:bg-file-upload-dropzone-hover-bg motion-reduce:transition-none",
      "focus-visible:file-upload-focus text-file-upload-dropzone-fg",
      "data-dragging:file-upload-dropzone-border-solid data-dragging:border-file-upload-dropzone-dragging-border data-dragging:bg-file-upload-dropzone-dragging-bg",
      "data-invalid:border-file-upload-dropzone-invalid-border",
      "data-disabled:cursor-not-allowed data-disabled:border-file-upload-dropzone-disabled-border data-disabled:bg-file-upload-dropzone-disabled-bg data-disabled:text-file-upload-dropzone-disabled-fg",
      "form-control-readonly data-readonly:cursor-default",
    ],
    trigger: "",
    itemGroup: "flex w-full flex-col gap-file-upload-item-group empty:hidden",
    item: [
      "flex w-full items-center gap-file-upload-item",
      "file-upload-item-border-width rounded-file-upload-item border-file-upload-item-border bg-file-upload-item-bg p-file-upload-item text-file-upload-item",
      "data-[type=rejected]:border-file-upload-item-rejected-border data-[type=rejected]:bg-file-upload-item-rejected-bg",
      "data-disabled:text-file-upload-item-disabled-fg",
    ],
    itemPreview: [
      "flex size-file-upload-item-preview shrink-0 items-center justify-center overflow-clip rounded-file-upload-item-preview text-file-upload-item-preview-fg",
      "data-disabled:text-file-upload-item-disabled-fg",
    ],
    itemPreviewImage: "size-full object-cover",
    itemName: [
      "min-w-0 flex-1 truncate font-file-upload-item-name text-file-upload-item-name-fg",
      "data-disabled:text-file-upload-item-disabled-fg",
    ],
    itemSizeText: [
      "text-file-upload-item-size-fg",
      "data-disabled:text-file-upload-item-disabled-fg",
    ],
    itemDeleteTrigger: "",
    clearTrigger: "",
  },
  variants: {
    size: {
      sm: { root: "text-file-upload-sm", item: "text-file-upload-sm" },
      md: { root: "text-file-upload-md", item: "text-file-upload-md" },
      lg: { root: "text-file-upload-lg", item: "text-file-upload-lg" },
    },
  },
  defaultVariants: { size: "md" },
})

type FileUploadContextValue = {
  api: FileUploadApi
  resetFiles: () => File[]
  cancelPendingFiles: () => void
  required?: boolean
  invalid?: boolean
  size: "sm" | "md" | "lg"
  descriptions: DescribedBy
  errorDescriptions: DescribedBy
  styles: ReturnType<typeof fileUploadStyles>
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null)

function useFileUploadContext() {
  const context = useContext(FileUploadContext)

  if (!context) {
    throw new Error("FileUpload components must be used within FileUpload.Root")
  }

  return context
}

type FileUploadItemGroupContextValue = {
  type: FileUploadItemType
}

const FileUploadItemGroupContext =
  createContext<FileUploadItemGroupContextValue | null>(null)

function useFileUploadItemGroupContext() {
  const context = useContext(FileUploadItemGroupContext)

  if (!context) {
    throw new Error("FileUpload.Item must be used within FileUpload.ItemGroup")
  }

  return context
}

type FileUploadItemContextValue = {
  file: File
  type: FileUploadItemType
}

const FileUploadItemContext = createContext<FileUploadItemContextValue | null>(
  null
)

function useFileUploadItemContext() {
  const context = useContext(FileUploadItemContext)

  if (!context) {
    throw new Error(
      "FileUpload item components must be used within FileUpload.Item"
    )
  }

  return context
}

type FileUploadRootDomProps = Omit<
  ComponentPropsWithoutRef<"div">,
  keyof FileUploadMachineProps
>

export type FileUploadProps = FileUploadRootDomProps &
  Omit<FileUploadMachineProps, "id"> & {
    id?: string
    size?: "sm" | "md" | "lg"
    ref?: Ref<HTMLDivElement>
  }

export function FileUpload({
  accept,
  acceptedFiles,
  allowDrop,
  capture,
  children,
  className,
  defaultAcceptedFiles,
  dir = "ltr",
  directory,
  disabled: explicitDisabled,
  getRootNode,
  id,
  ids,
  invalid,
  locale,
  maxFileSize,
  maxFiles,
  minFileSize,
  name,
  onFileAccept,
  onFileChange,
  onFileReject,
  preventDocumentDrop,
  readOnly,
  ref,
  required,
  size = "md",
  transformFiles,
  translations,
  validate,
  ...props
}: FileUploadProps) {
  const generatedId = useId()
  const probeRef = useRef<HTMLInputElement>(null)
  const [disabledElement, setDisabledElement] =
    useState<HTMLInputElement | null>(null)
  const disabled = useEffectiveDisabled(disabledElement, explicitDisabled)
  const disabledRef = useMemo(
    () => (node: HTMLInputElement | null) => {
      probeRef.current = node
      setDisabledElement(node)
    },
    []
  )
  const [processingError, setProcessingError] = useState<string>()
  // Keep the commit boundary controlled: Zag may finish an asynchronous
  // transform after the interaction that started it has become read-only.
  const initialFiles = useRef(defaultAcceptedFiles ?? [])
  const resetting = useRef(false)
  const committedFiles = useRef(acceptedFiles ?? defaultAcceptedFiles ?? [])
  if (acceptedFiles !== undefined) {
    committedFiles.current = acceptedFiles
  }
  const mutationProposal = useRef<File[] | undefined>(undefined)
  const interaction = useRef({
    blocked: Boolean(readOnly || disabled),
    epoch: 0,
    selection: 0,
    pending: new Set<symbol>(),
  })
  useLayoutEffect(() => {
    const blocked = Boolean(readOnly || disabled)
    if (interaction.current.blocked !== blocked) {
      interaction.current.blocked = blocked
      interaction.current.epoch += 1
      interaction.current.pending.clear()
    }
  }, [readOnly, disabled])
  useEffect(
    () => () => {
      interaction.current.epoch += 1
      interaction.current.pending.clear()
    },
    []
  )
  // Override only the async acceptance action: the upstream action validates
  // before awaiting, then appends stale batches without checking current capacity.
  const coordinatedMachine = useMemo<FileUploadMachine>(() => {
    const actions = fileUploadMachine.implementations?.actions
    if (!(actions?.setEventFiles && actions.clearFiles)) {
      throw new Error("FileUpload machine actions unavailable")
    }
    const select = actions.setEventFiles
    const clear = actions.clearFiles
    const replace = actions.setFiles
    const applyMutation = (
      action: typeof clear,
      params: Parameters<typeof clear>[0]
    ) => {
      mutationProposal.current = undefined
      try {
        action(params)
      } finally {
        mutationProposal.current = undefined
      }
    }
    return {
      ...fileUploadMachine,
      implementations: {
        ...fileUploadMachine.implementations,
        actions: {
          ...actions,
          setFiles(params) {
            // An explicit replacement supersedes every pending addition.
            interaction.current.epoch += 1
            interaction.current.pending.clear()
            params.context.set("transforming", false)
            setProcessingError(undefined)
            if (replace) {
              applyMutation(replace, params)
            }
          },
          clearFiles(params) {
            interaction.current.epoch += 1
            interaction.current.pending.clear()
            params.context.set("transforming", false)
            setProcessingError(undefined)
            applyMutation(clear, params)
          },
          removeFile(params) {
            if (actions.removeFile) {
              applyMutation(actions.removeFile, params)
            }
          },
          clearRejectedFiles(params) {
            if (actions.clearRejectedFiles) {
              applyMutation(actions.clearRejectedFiles, params)
            }
          },
          setEventFiles(params) {
            if (
              interaction.current.blocked ||
              probeRef.current?.matches(":disabled")
            ) {
              return
            }
            const { context, prop } = params
            const transform = prop("transformFiles")
            const withoutTransform: typeof prop = (key) => {
              const value = prop(key)
              return key === "transformFiles"
                ? (undefined as typeof value)
                : value
            }
            const latestContext: typeof context = {
              ...context,
              get: (key) => {
                const value = context.get(key)
                return key === "acceptedFiles"
                  ? (committedFiles.current as typeof value)
                  : value
              },
              set: (key, next) => {
                if (key === "acceptedFiles") {
                  const value =
                    typeof next === "function"
                      ? next(committedFiles.current as never)
                      : next
                  context.set(key, value)
                } else {
                  context.set(key, next)
                }
              },
            }
            if (!transform) {
              applyMutation(select, params)
              return
            }
            const epoch = interaction.current.epoch
            interaction.current.selection += 1
            const selection = interaction.current.selection
            const token = Symbol("file-batch")
            // Run the machine's validator without publishing the provisional collection.
            const provisional: FileChangeDetails = {
              acceptedFiles: committedFiles.current,
              rejectedFiles: context.get("rejectedFiles"),
            }
            const current = provisional.acceptedFiles
            select({
              ...params,
              prop: withoutTransform,
              context: {
                ...context,
                set(key, next) {
                  if (key === "transforming") {
                    return
                  }
                  const previous =
                    key === "acceptedFiles"
                      ? provisional.acceptedFiles
                      : provisional.rejectedFiles
                  const value =
                    typeof next === "function" ? next(previous as never) : next
                  if (key === "acceptedFiles") {
                    provisional.acceptedFiles = value as File[]
                  } else {
                    provisional.rejectedFiles = value as FileRejection[]
                  }
                },
              },
            })
            const files = provisional.acceptedFiles.filter(
              (file) => !current.includes(file)
            )
            const fresh = () =>
              !(
                interaction.current.blocked ||
                probeRef.current?.matches(":disabled")
              ) &&
              epoch === interaction.current.epoch &&
              (params.computed("multiple") ||
                selection === interaction.current.selection)
            if (!files.length) {
              if (fresh()) {
                context.set("rejectedFiles", provisional.rejectedFiles)
              }
              return
            }
            interaction.current.pending.add(token)
            context.set("transforming", true)
            setProcessingError(undefined)
            Promise.resolve()
              .then(() => transform(files))
              .then((transformed) => {
                if (!fresh()) {
                  return
                }
                // Re-run all constraints atomically against the latest collection.
                applyMutation(
                  (commitParams) => {
                    select(commitParams)
                    if (provisional.rejectedFiles.length) {
                      context.set("rejectedFiles", [
                        ...context.get("rejectedFiles"),
                        ...provisional.rejectedFiles,
                      ])
                    }
                  },
                  {
                    ...params,
                    context: latestContext,
                    event: { ...params.event, files: transformed },
                    prop: withoutTransform,
                  }
                )
              })
              .catch(() => {
                if (fresh()) {
                  setProcessingError(
                    "Files could not be processed. Choose the files again to retry."
                  )
                }
              })
              .finally(() => {
                interaction.current.pending.delete(token)
                context.set(
                  "transforming",
                  interaction.current.pending.size > 0
                )
              })
          },
        },
      },
    }
  }, [])
  const service = useMachine(coordinatedMachine, {
    accept,
    acceptedFiles,
    defaultAcceptedFiles,
    allowDrop,
    capture,
    dir,
    directory,
    disabled,
    getRootNode,
    id: id ?? generatedId,
    ids,
    invalid,
    locale,
    maxFileSize,
    maxFiles,
    minFileSize,
    name,
    onFileAccept: (details) => {
      if (!(resetting.current || interaction.current.blocked)) {
        mutationProposal.current = details.files
        if (acceptedFiles === undefined) {
          committedFiles.current = details.files
        }
        onFileAccept?.(details)
      }
    },
    onFileChange: (details) => {
      if (resetting.current || interaction.current.blocked) {
        return
      }
      onFileChange?.({
        ...details,
        acceptedFiles:
          mutationProposal.current ?? acceptedFiles ?? committedFiles.current,
      })
    },
    onFileReject: (details) => {
      if (!(resetting.current || interaction.current.blocked)) {
        onFileReject?.(details)
      }
    },
    preventDocumentDrop,
    readOnly,
    required,
    transformFiles,
    translations,
    validate,
  })
  useLayoutEffect(() => {
    if (disabled || readOnly) {
      service.context.set("transforming", false)
    }
  }, [disabled, readOnly, service])
  const api = connectFileUpload(service, normalizeProps)
  committedFiles.current = api.acceptedFiles
  const styles = fileUploadStyles({ size })
  const descriptions = useDescribedBy()
  const errorDescriptions = useDescribedBy()
  const rootProps = mergeProps(props, api.getRootProps())

  return (
    <FileUploadContext.Provider
      value={{
        api,
        resetFiles: () => {
          resetting.current = true
          try {
            // Reset restores form state; it is not a user mutation and must
            // work even while disabled/read-only. Do not revalidate defaults
            // or route them through guarded/async upload actions.
            service.context.set("rejectedFiles", [])
            const files = acceptedFiles ?? initialFiles.current
            if (acceptedFiles === undefined) {
              service.context.set("acceptedFiles", files)
            }
            committedFiles.current = files
            mutationProposal.current = undefined
            setProcessingError(undefined)
            return files
          } finally {
            resetting.current = false
          }
        },
        cancelPendingFiles: () => {
          interaction.current.epoch += 1
          interaction.current.pending.clear()
          service.context.set("transforming", false)
        },
        required,
        invalid,
        styles,
        size,
        descriptions,
        errorDescriptions,
      }}
    >
      <div
        className={styles.root({ className })}
        ref={ref}
        tabIndex={readOnly && !disabled ? 0 : -1}
        {...rootProps}
        aria-description={
          readOnly
            ? "Read-only files. Uploading and removing files is unavailable."
            : undefined
        }
      >
        <input ref={disabledRef} type="hidden" />
        {children}
        {processingError && (
          <FileUpload.StatusText size={size} status="error">
            {processingError}
          </FileUpload.StatusText>
        )}
      </div>
    </FileUploadContext.Provider>
  )
}

export type FileUploadContextProps = {
  children: (api: FileUploadApi) => ReactNode
}

FileUpload.Context = function FileUploadApiContext({
  children,
}: FileUploadContextProps) {
  const { api } = useFileUploadContext()

  return children(api)
}

export type FileUploadLabelProps = Omit<
  ComponentPropsWithoutRef<typeof Label>,
  "disabled" | "htmlFor" | "required" | "size"
> & {
  ref?: Ref<HTMLLabelElement>
}

FileUpload.Label = function FileUploadLabel({
  children,
  className,
  ref,
  ...props
}: FileUploadLabelProps) {
  const { api, required, styles, size } = useFileUploadContext()
  const labelProps = mergeProps({ ref }, props, api.getLabelProps())

  return (
    <Label
      className={styles.label({ className })}
      required={required}
      size={size}
      {...labelProps}
    >
      {children}
    </Label>
  )
}

export type FileUploadDropzoneProps = ComponentPropsWithoutRef<"div"> & {
  disableClick?: boolean
  ref?: Ref<HTMLDivElement>
}

FileUpload.Dropzone = function FileUploadDropzone({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  disableClick,
  onClick,
  onKeyDown,
  ref,
  ...props
}: FileUploadDropzoneProps) {
  const { api, styles, descriptions, errorDescriptions, invalid } =
    useFileUploadContext()
  const {
    onClick: onMachineClick,
    onKeyDown: onMachineKeyDown,
    ...machineDropzoneProps
  } = api.getDropzoneProps({ disableClick }) as ComponentPropsWithoutRef<"div">
  const dropzoneProps = mergeProps<ComponentPropsWithoutRef<"div">>(
    props,
    machineDropzoneProps,
    {
      role: disableClick || api.readOnly ? "group" : "button",
      tabIndex: api.disabled ? undefined : 0,
      "aria-disabled": api.disabled || undefined,
      "aria-description": api.readOnly
        ? "Read-only files. Uploading and removing files is unavailable."
        : undefined,
      "aria-describedby": joinDescribedBy(
        props["aria-describedby"],
        descriptions.describedById
      ),
      "aria-invalid":
        invalid || Boolean(errorDescriptions.describedById) || undefined,
      "aria-errormessage":
        invalid || errorDescriptions.describedById
          ? errorDescriptions.describedById
          : undefined,
      "aria-label": ariaLabel ?? machineDropzoneProps["aria-label"],
      "aria-labelledby":
        ariaLabelledBy ?? (ariaLabel ? undefined : api.getLabelProps().id),
      onClick(event) {
        onClick?.(event)

        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      },
      onKeyDown(event) {
        onKeyDown?.(event)

        if (!event.defaultPrevented) {
          onMachineKeyDown?.(event)
          // A div with button semantics must not scroll the page on Space.
          if (
            event.key === " " &&
            event.target === event.currentTarget &&
            !disableClick &&
            !api.disabled &&
            !api.readOnly
          ) {
            event.preventDefault()
          }
        }
      },
    }
  )

  return (
    <div
      className={styles.dropzone({ className })}
      ref={ref}
      {...dropzoneProps}
      aria-disabled={api.disabled || undefined}
    >
      {children}
    </div>
  )
}

type MachineOwnedInputProps =
  | "accept"
  | "aria-hidden"
  | "autoFocus"
  | "capture"
  | "defaultValue"
  | "disabled"
  | "files"
  | "id"
  | "multiple"
  | "name"
  | "required"
  | "style"
  | "tabIndex"
  | "type"
  | "value"
  | "webkitdirectory"

export type FileUploadHiddenInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  MachineOwnedInputProps
> & {
  ref?: Ref<HTMLInputElement>
}

FileUpload.HiddenInput = function FileUploadHiddenInput({
  ref,
  ...props
}: FileUploadHiddenInputProps) {
  const { api, resetFiles, cancelPendingFiles } = useFileUploadContext()
  const inputProps = mergeProps(props, api.getHiddenInputProps())
  const submissionRef = useRef<HTMLInputElement>(null)
  const syncSubmission = (files = api.acceptedFiles) => {
    const input = submissionRef.current
    const view = input?.ownerDocument.defaultView
    if (!(input && view && "DataTransfer" in view)) {
      return
    }
    const transfer = new view.DataTransfer()
    for (const file of files) {
      transfer.items.add(file)
    }
    try {
      input.files = transfer.files
    } catch {
      /* Getter-only test hosts. */
    }
  }
  useLayoutEffect(syncSubmission)
  const reset = useRef<() => void>(() => undefined)
  reset.current = () => {
    cancelPendingFiles()
    syncSubmission(resetFiles())
  }
  useEffect(() => {
    const input = submissionRef.current
    return input
      ? subscribeOwnerFormReset(input, () => reset.current())
      : undefined
  }, [])

  return (
    <>
      <input
        {...inputProps}
        disabled={api.disabled || api.readOnly}
        name={undefined}
        ref={ref}
        required={false}
      />
      <input
        aria-hidden="true"
        disabled={api.disabled}
        form={inputProps.form}
        multiple
        name={inputProps.name}
        onInvalid={(event) => {
          event.preventDefault()
          event.currentTarget
            .closest('[data-scope="file-upload"][data-part="root"]')
            ?.querySelector<HTMLElement>(
              '[data-part="dropzone"], [data-part="trigger"]'
            )
            ?.focus()
        }}
        ref={submissionRef}
        required={inputProps.required && !api.readOnly}
        style={inputProps.style}
        tabIndex={-1}
        type="file"
      />
    </>
  )
}

export type FileUploadTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "type"
> & {
  icon?: IconType
  ref?: Ref<HTMLButtonElement>
}

FileUpload.Trigger = function FileUploadTrigger({
  children,
  className,
  disabled,
  icon = "token-icon-file-upload-trigger",
  onClick,
  ref,
  ...props
}: FileUploadTriggerProps) {
  const { api, styles, size, descriptions, errorDescriptions, invalid } =
    useFileUploadContext()
  const {
    disabled: machineDisabled,
    onClick: onMachineClick,
    ...machineTriggerProps
  } = api.getTriggerProps() as ComponentPropsWithoutRef<"button">
  const triggerProps = mergeProps(props, machineTriggerProps)
  const isDisabled = Boolean(disabled || machineDisabled)
  if (api.readOnly) {
    return null
  }

  return (
    <Button
      {...triggerProps}
      aria-describedby={joinDescribedBy(
        props["aria-describedby"],
        descriptions.describedById
      )}
      aria-errormessage={
        invalid || errorDescriptions.describedById
          ? errorDescriptions.describedById
          : undefined
      }
      aria-invalid={
        invalid || Boolean(errorDescriptions.describedById) || undefined
      }
      className={styles.trigger({ className })}
      disabled={isDisabled}
      icon={icon}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      }}
      ref={ref}
      size={size}
      theme="outlined"
      type="button"
      variant="primary"
    >
      {children}
    </Button>
  )
}

export type FileUploadItemGroupProps = ComponentPropsWithoutRef<"ul"> & {
  ref?: Ref<HTMLUListElement>
  type?: FileUploadItemType
}

FileUpload.ItemGroup = function FileUploadItemGroup({
  children,
  className,
  ref,
  type = "accepted",
  ...props
}: FileUploadItemGroupProps) {
  const { api, styles } = useFileUploadContext()
  const itemGroupProps = mergeProps(props, api.getItemGroupProps({ type }))

  return (
    <FileUploadItemGroupContext.Provider value={{ type }}>
      <ul
        className={styles.itemGroup({ className })}
        ref={ref}
        {...itemGroupProps}
      >
        {children}
      </ul>
    </FileUploadItemGroupContext.Provider>
  )
}

export type FileUploadItemProps = ComponentPropsWithoutRef<"li"> & {
  file: File
  ref?: Ref<HTMLLIElement>
}

FileUpload.Item = function FileUploadItem({
  children,
  className,
  file,
  ref,
  ...props
}: FileUploadItemProps) {
  const { api, styles } = useFileUploadContext()
  const { type } = useFileUploadItemGroupContext()
  const itemProps = mergeProps(props, api.getItemProps({ file, type }))

  return (
    <FileUploadItemContext.Provider value={{ file, type }}>
      <li className={styles.item({ className })} ref={ref} {...itemProps}>
        {children}
      </li>
    </FileUploadItemContext.Provider>
  )
}

export type FileUploadItemPreviewProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

FileUpload.ItemPreview = function FileUploadItemPreview({
  children,
  className,
  ref,
  ...props
}: FileUploadItemPreviewProps) {
  const { api, styles } = useFileUploadContext()
  const { file, type } = useFileUploadItemContext()
  const previewProps = mergeProps(
    props,
    api.getItemPreviewProps({ file, type })
  )

  return (
    <div
      className={styles.itemPreview({ className })}
      ref={ref}
      {...previewProps}
    >
      {children ?? <Icon icon="token-icon-file-upload-preview" size="lg" />}
    </div>
  )
}

export type FileUploadItemPreviewImageProps = Omit<
  ComponentPropsWithoutRef<"img">,
  "alt" | "src"
> & {
  ref?: Ref<HTMLImageElement>
}

FileUpload.ItemPreviewImage = function FileUploadItemPreviewImage({
  className,
  ref,
  ...props
}: FileUploadItemPreviewImageProps) {
  const { api, styles } = useFileUploadContext()
  const { file, type } = useFileUploadItemContext()
  const apiRef = useRef(api)
  const [url, setUrl] = useState<string>()
  apiRef.current = api

  useEffect(() => {
    setUrl(undefined)
    return apiRef.current.createFileUrl(file, setUrl)
  }, [file])

  if (!url) {
    return null
  }

  const imageProps = mergeProps(
    { ref },
    props,
    api.getItemPreviewImageProps({ file, type, url })
  )
  const { alt, src, ...imageElementProps } = imageProps

  return (
    <Image
      alt={alt ?? file.name}
      className={styles.itemPreviewImage({ className })}
      size="custom"
      src={src ?? url}
      {...imageElementProps}
    />
  )
}

export type FileUploadItemNameProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

FileUpload.ItemName = function FileUploadItemName({
  children,
  className,
  ref,
  ...props
}: FileUploadItemNameProps) {
  const { api, styles } = useFileUploadContext()
  const { file, type } = useFileUploadItemContext()
  const nameProps = mergeProps(props, api.getItemNameProps({ file, type }))

  return (
    <span className={styles.itemName({ className })} ref={ref} {...nameProps}>
      {children ?? file.name}
    </span>
  )
}

export type FileUploadItemSizeTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

FileUpload.ItemSizeText = function FileUploadItemSizeText({
  children,
  className,
  ref,
  ...props
}: FileUploadItemSizeTextProps) {
  const { api, styles } = useFileUploadContext()
  const { file, type } = useFileUploadItemContext()
  const sizeTextProps = mergeProps(
    props,
    api.getItemSizeTextProps({ file, type })
  )

  return (
    <span
      className={styles.itemSizeText({ className })}
      ref={ref}
      {...sizeTextProps}
    >
      {children ?? api.getFileSize(file)}
    </span>
  )
}

type FileUploadActionIconProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "type"
> & {
  icon?: IconType
  ref?: Ref<HTMLButtonElement>
}

export type FileUploadItemDeleteTriggerProps = FileUploadActionIconProps

FileUpload.ItemDeleteTrigger = function FileUploadItemDeleteTrigger({
  className,
  disabled,
  icon = "token-icon-file-upload-delete",
  onClick,
  ref,
  ...props
}: FileUploadItemDeleteTriggerProps) {
  const { api, styles, size } = useFileUploadContext()
  const { file, type } = useFileUploadItemContext()
  const {
    disabled: machineDisabled,
    onClick: onMachineClick,
    ...machineDeleteProps
  } = api.getItemDeleteTriggerProps({
    file,
    type,
  }) as ComponentPropsWithoutRef<"button">
  const deleteProps = mergeProps(props, machineDeleteProps)
  const isDisabled = Boolean(disabled || machineDisabled)
  if (api.readOnly) {
    return null
  }

  return (
    <ActionIcon
      className={styles.itemDeleteTrigger({ className })}
      disabled={isDisabled}
      icon={icon}
      onClick={(event) => {
        onClick?.(event)

        if (!(event.defaultPrevented || api.disabled || api.readOnly)) {
          const button = event.currentTarget
          const root = button.closest<HTMLElement>(
            '[data-scope="file-upload"][data-part="root"]'
          )
          const buttons = Array.from(
            root?.querySelectorAll<HTMLButtonElement>(
              '[data-part="item-delete-trigger"]:not(:disabled)'
            ) ?? []
          )
          const index = buttons.indexOf(button)
          const next = buttons[index + 1] ?? buttons[index - 1]
          const restoreFocus = button.ownerDocument.activeElement === button
          onMachineClick?.(event)
          if (restoreFocus) {
            requestAnimationFrame(() => {
              const fallback = root?.querySelector<HTMLElement>(
                '[data-part="dropzone"], [data-part="trigger"]:not(:disabled), input:not([type="file"]):not(:disabled)'
              )
              ;(next?.isConnected ? next : (fallback ?? root))?.focus()
            })
          }
        }
      }}
      ref={ref}
      size={size}
      tone="neutral"
      type="button"
      {...deleteProps}
      aria-label={deleteProps["aria-label"] ?? `Delete file ${file.name}`}
    />
  )
}

export type FileUploadClearTriggerProps = FileUploadActionIconProps

FileUpload.ClearTrigger = function FileUploadClearTrigger({
  "aria-label": ariaLabel = "Clear files",
  className,
  disabled,
  icon = "token-icon-file-upload-clear",
  onClick,
  ref,
  ...props
}: FileUploadClearTriggerProps) {
  const { api, styles, size } = useFileUploadContext()
  const {
    disabled: machineDisabled,
    onClick: onMachineClick,
    ...machineClearProps
  } = api.getClearTriggerProps() as ComponentPropsWithoutRef<"button">
  const clearProps = mergeProps(props, machineClearProps)
  const isDisabled = Boolean(disabled || machineDisabled)
  if (api.readOnly) {
    return null
  }

  return (
    <ActionIcon
      aria-label={ariaLabel}
      className={styles.clearTrigger({ className })}
      disabled={isDisabled}
      icon={icon}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      }}
      ref={ref}
      size={size}
      tone="neutral"
      type="button"
      {...clearProps}
      hidden={Boolean(clearProps.hidden) && !api.transforming}
    />
  )
}

export type FileUploadStatusTextProps = StatusTextProps

FileUpload.StatusText = function FileUploadStatusText({
  id: providedId,
  status,
  size: sizeProp,
  ...props
}: FileUploadStatusTextProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const { size, descriptions, errorDescriptions, invalid } =
    useFileUploadContext()
  const resolvedStatus = status ?? (invalid ? "error" : "default")
  useRegisterDescription(id, descriptions.registerDescription)
  useEffect(
    () =>
      resolvedStatus === "error"
        ? errorDescriptions.registerDescription(id)
        : undefined,
    [id, resolvedStatus, errorDescriptions.registerDescription]
  )
  return (
    <StatusText
      {...props}
      id={id}
      showIcon={resolvedStatus === "default" ? props.showIcon : true}
      size={sizeProp ?? size}
      status={resolvedStatus}
    />
  )
}

FileUpload.Root = FileUpload
FileUpload.displayName = "FileUpload"
