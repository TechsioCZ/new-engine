/**
 * FileUpload — @techsio/ui-kit molecule.
 *
 * @component FileUpload
 * @componentVersion v1.0.0
 * @skill file-upload-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the file-upload-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  connect as connectFileUpload,
  type Api as FileUploadApi,
  type ItemType as FileUploadItemType,
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
  useRef,
  useState,
} from "react"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconType } from "../atoms/icon"
import { Image } from "../atoms/image"
import { Label } from "../atoms/label"
import { tv } from "../utils"

const fileUploadStyles = tv({
  slots: {
    root: "flex w-full flex-col items-start gap-file-upload-root",
    label: [
      "font-file-upload-label text-file-upload-label text-file-upload-label-fg",
      "data-disabled:text-file-upload-label-disabled-fg",
    ],
    dropzone: [
      "flex min-h-file-upload-dropzone-min-height w-full cursor-pointer flex-col items-center justify-center gap-file-upload-dropzone",
      "file-upload-dropzone-border-dashed file-upload-dropzone-border-width rounded-file-upload-dropzone border-file-upload-dropzone-border bg-file-upload-dropzone-bg p-file-upload-dropzone",
      "transition-colors hover:bg-file-upload-dropzone-hover-bg motion-reduce:transition-none",
      "focus-visible:file-upload-focus",
      "data-dragging:file-upload-dropzone-border-solid data-dragging:border-file-upload-dropzone-dragging-border data-dragging:bg-file-upload-dropzone-dragging-bg",
      "data-invalid:border-file-upload-dropzone-invalid-border",
      "data-disabled:cursor-not-allowed data-disabled:border-file-upload-dropzone-disabled-border data-disabled:bg-file-upload-dropzone-disabled-bg",
      "data-readonly:cursor-default",
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
      "flex size-file-upload-item-preview shrink-0 items-center justify-center overflow-hidden rounded-file-upload-item-preview text-file-upload-item-preview-fg",
      "data-disabled:text-file-upload-item-disabled-fg",
    ],
    itemPreviewImage: "size-full object-cover",
    itemName: [
      "min-w-0 flex-1 truncate font-file-upload-item-name text-file-upload-item-name-fg",
      "data-disabled:text-file-upload-item-disabled-fg",
    ],
    itemSizeText: [
      "text-file-upload-item-size text-file-upload-item-size-fg",
      "data-disabled:text-file-upload-item-disabled-fg",
    ],
    itemDeleteTrigger: "",
    clearTrigger: "",
  },
})

type FileUploadContextValue = {
  api: FileUploadApi
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
  disabled,
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
  transformFiles,
  translations,
  validate,
  ...props
}: FileUploadProps) {
  const generatedId = useId()
  const service = useMachine(fileUploadMachine, {
    accept,
    acceptedFiles,
    allowDrop,
    capture,
    defaultAcceptedFiles,
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
    onFileAccept,
    onFileChange,
    onFileReject,
    preventDocumentDrop,
    readOnly,
    required,
    transformFiles,
    translations,
    validate,
  })
  const api = connectFileUpload(service, normalizeProps)
  const styles = fileUploadStyles()
  const rootProps = mergeProps(props, api.getRootProps())

  return (
    <FileUploadContext.Provider value={{ api, styles }}>
      <div className={styles.root({ className })} ref={ref} {...rootProps}>
        {children}
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
  const { api, styles } = useFileUploadContext()
  const labelProps = mergeProps({ ref }, props, api.getLabelProps())

  return (
    <Label
      className={styles.label({ className })}
      size="current"
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
  children,
  className,
  disableClick,
  onClick,
  onKeyDown,
  ref,
  ...props
}: FileUploadDropzoneProps) {
  const { api, styles } = useFileUploadContext()
  const {
    onClick: onMachineClick,
    onKeyDown: onMachineKeyDown,
    ...machineDropzoneProps
  } = api.getDropzoneProps({ disableClick }) as ComponentPropsWithoutRef<"div">
  const dropzoneProps = mergeProps<ComponentPropsWithoutRef<"div">>(
    props,
    machineDropzoneProps,
    {
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
        }
      },
    }
  )

  return (
    <div
      className={styles.dropzone({ className })}
      ref={ref}
      {...dropzoneProps}
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
  const { api } = useFileUploadContext()
  const inputProps = mergeProps(props, api.getHiddenInputProps())

  return <input ref={ref} {...inputProps} />
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
  const { api, styles } = useFileUploadContext()
  const {
    disabled: machineDisabled,
    onClick: onMachineClick,
    ...machineTriggerProps
  } = api.getTriggerProps() as ComponentPropsWithoutRef<"button">
  const triggerProps = mergeProps(props, machineTriggerProps)
  const isDisabled = Boolean(disabled || machineDisabled)

  return (
    <Button
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
      size="md"
      theme="outlined"
      type="button"
      variant="primary"
      {...triggerProps}
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
  const { api, styles } = useFileUploadContext()
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

  return (
    <ActionIcon
      className={styles.itemDeleteTrigger({ className })}
      disabled={isDisabled}
      icon={icon}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      }}
      ref={ref}
      size="md"
      tone="neutral"
      type="button"
      {...deleteProps}
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
  const { api, styles } = useFileUploadContext()
  const {
    disabled: machineDisabled,
    onClick: onMachineClick,
    ...machineClearProps
  } = api.getClearTriggerProps() as ComponentPropsWithoutRef<"button">
  const clearProps = mergeProps(props, machineClearProps)
  const isDisabled = Boolean(disabled || machineDisabled)

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
      size="md"
      tone="neutral"
      type="button"
      {...clearProps}
    />
  )
}

FileUpload.Root = FileUpload
FileUpload.displayName = "FileUpload"
