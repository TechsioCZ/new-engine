---
name: file-upload-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit FileUpload to
  select, validate, preview, and manage local File objects through the Zag.js
  compound API, including accepted/rejected files and native form behavior.
metadata:
  component_version: "1.1.5"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/file-upload.tsx"
  - "libs/ui/src/tokens/components/molecules/_file-upload.css"
  - "libs/ui/stories/molecules/file-upload.stories.tsx"
  - "https://zagjs.com/components/react/file-upload"
---

# @techsio/ui-kit FileUpload Usage

FileUpload manages local browser `File` objects for selection, validation,
preview, and removal; it does not upload files to a server. Network transport,
progress, cancellation, retry, and server errors belong to the consuming app.

## Shared field contract

`size="sm" | "md" | "lg"` (default `md`) controls the field typography, label,
feedback and action sizes; the multiline dropzone retains its content-driven
minimum height. Use `FileUpload.StatusText` for field helper/validation messages:
it registers a unique ID on the dropzone and picker trigger, merges external
descriptions, and links errors through `aria-errormessage` and `aria-invalid`.

Read-only files stay inspectable at full contrast. The root/dropzone retains a
focus target, clearly describes its read-only state, and upload, clear and delete
actions are omitted. Zag guards drop, paste and exposed mutation APIs; the
component also rejects in-flight transformations after read-only/disabled changes,
even if editing is restored before they finish. `HiddenInput` synchronizes both
preloaded (`defaultAcceptedFiles` / `acceptedFiles`) and subsequently selected
files into its native FileList, preserving read-only submission; disabled wins. Deleting
a focused file moves focus to the next file, previous file or the dropzone/picker
instead of the document body.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `FileUpload`.

**Use it when**

- Attaching files to a record: product images, documents, imports.
- Drag-and-drop with a visible click-to-browse alternative.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Picking from existing media | a media library dialog |
| Pasting a URL | FormInput |

**Do**

- State accepted types and max size before selection (`PNG or JPG, up to 5 MB`).
- Show each file with name, size (formatted), progress, and a remove action with an accessible label.
- Show rejected files with the reason and how to fix it (`photo.heic isn't supported. Use PNG or JPG.`).
- Upload progress, retry and server errors belong to the app — surface them per file, not only as a toast.

**Don't**

- Make drag-and-drop the only way to add files.
- Clear already accepted files when one file is rejected.

**Copy and states**

- Dropzone text: `Drag files here or browse`; button label `Choose files`.

## Setup

Render the required hidden input and compose accepted and rejected collections
from the connected Zag API:

```tsx
import { FileUpload } from "@techsio/ui-kit/molecules/file-upload"

<FileUpload
  accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
  maxFiles={4}
  name="attachments"
>
  <FileUpload.Label>Attachments</FileUpload.Label>
  <FileUpload.Dropzone>
    <FileUpload.Trigger>Choose files</FileUpload.Trigger>
  </FileUpload.Dropzone>
  <FileUpload.HiddenInput />

  <FileUpload.Context>
    {(api) => (
      <>
        <FileUpload.ItemGroup type="accepted">
          {api.acceptedFiles.map((file) => (
            <FileUpload.Item
              file={file}
              key={`${file.name}-${file.lastModified}`}
            >
              <FileUpload.ItemPreview />
              <FileUpload.ItemName />
              <FileUpload.ItemSizeText />
              <FileUpload.ItemDeleteTrigger />
            </FileUpload.Item>
          ))}
        </FileUpload.ItemGroup>

        <FileUpload.ItemGroup type="rejected">
          {api.rejectedFiles.map(({ file, errors }) => (
            <FileUpload.Item
              file={file}
              key={`${file.name}-${file.lastModified}`}
            >
              <FileUpload.ItemName />
              <span>{errors.join(", ")}</span>
              <FileUpload.ItemDeleteTrigger />
            </FileUpload.Item>
          ))}
        </FileUpload.ItemGroup>
      </>
    )}
  </FileUpload.Context>
</FileUpload>
```

## Public Compound API

```text
FileUpload / FileUpload.Root
FileUpload.Context
FileUpload.Label
FileUpload.Dropzone
FileUpload.HiddenInput
FileUpload.Trigger
FileUpload.ItemGroup
FileUpload.Item
FileUpload.ItemPreview
FileUpload.ItemPreviewImage
FileUpload.ItemName
FileUpload.ItemSizeText
FileUpload.ItemDeleteTrigger
FileUpload.ClearTrigger
```

`FileUpload.Context` passes the connected Zag API unchanged. `ItemGroup`
provides `type="accepted" | "rejected"` to its items, and `Item` provides its
`file` to the preview, name, size, and delete parts. `ItemName` and
`ItemSizeText` render the current file values by default. `ItemPreview` renders
a stable file icon by default and accepts custom content when a file-type icon
is more useful. Use `ItemPreviewImage` only when an actual image thumbnail adds
meaning; it creates its object URL through Zag and revokes it when the file
changes or the part unmounts.

There is no `Items`, `List`, `FileText`, `PropsProvider`, public store/provider,
or `variant` API. Canonical `size` is supported. Compose ordinary content around the public parts when
the application needs a different layout.

## Zag Capabilities

Supported root behavior comes from `@zag-js/file-upload`:

```text
selection: acceptedFiles, defaultAcceptedFiles, maxFiles
validation: accept, minFileSize, maxFileSize, validate
state: disabled, readOnly, invalid, required
input: name, allowDrop, preventDocumentDrop, directory, capture
processing: transformFiles
callbacks: onFileChange, onFileAccept, onFileReject
localization/composition: locale, dir, translations, ids, getRootNode
```

The context API exposes `acceptedFiles`, `rejectedFiles`, `transforming`,
`remainingFiles`, `maxFilesReached`, `openFilePicker`, `setFiles`, `deleteFile`,
`clearFiles`, `clearRejectedFiles`, `setClipboardFiles`, `getFileSize`, and the
connected Zag prop getters. Use these capabilities directly instead of adding a
second file-state model.

## Core Patterns

### Keep HiddenInput for native form behavior

`FileUpload.HiddenInput` is required for the native picker and form contract.
Set `name` and `required` on the root; do not replace the part with a separate
native file input or override its machine-owned attributes. Root `required`
also renders the shared required indicator through `FileUpload.Label`.

### Render accepted and rejected files deliberately

The root does not choose an accepted-only presentation. Read both collections
through `FileUpload.Context`, use the matching `ItemGroup` type, and render the
raw Zag rejection errors in application-appropriate copy.

`FileUpload.ClearTrigger` clears both accepted and rejected files. Use
`api.clearRejectedFiles()` when an action should clear only rejected files.

### Name drop zones and explain their states

A clickable Dropzone takes its accessible name from `FileUpload.Label`; override
with `aria-label` or `aria-labelledby` when a different name is needed. Enter
and Space open the native picker without scrolling the page. With
`disableClick`, Dropzone is a group rather than an application-mode region;
include a separate `FileUpload.Trigger` for keyboard browsing.

Connect requirements and validation copy with `aria-describedby`. Explain
rejection with text and an icon, not just a red border. Accepted means selected
locally, not uploaded. Disabled controls need a visible reason. The Drop zone
states story deliberately separates labelled static previews from its interactive
selector; `data-dragging` in a preview is only a visual fixture, not a public
machine-state control.

### Preserve controlled Zag state

Use `defaultAcceptedFiles` for uncontrolled initialization. For controlled
state, pass `acceptedFiles` and update it from `onFileChange`:

```tsx
<FileUpload
  acceptedFiles={files}
  onFileChange={({ acceptedFiles }) => setFiles(acceptedFiles)}
>
  <FileUpload.Trigger>Choose files</FileUpload.Trigger>
  <FileUpload.HiddenInput />
</FileUpload>
```

Do not mirror rejected files or validation results into another local state
model unless the application must persist them outside the component lifecycle.

### Use browser-dependent capabilities honestly

- Call `api.openFilePicker()` for a programmatic picker action.
- Pass paste event `clipboardData` to `api.setClipboardFiles()`.
- Use `directory` only where WebKit directory selection is supported.
- Use `capture="user" | "environment"` as a browser hint, not a camera guarantee.
- Use `transformFiles` for asynchronous local file transformations before
  acceptance; it still does not perform network transport.

## Common Mistakes

### HIGH Treating FileUpload as network transport

Wrong:

```tsx
<FileUpload onUpload={sendFiles} progress={percent} retry />
```

Correct:

```tsx
<FileUpload onFileChange={({ acceptedFiles }) => setPendingFiles(acceptedFiles)}>
  <FileUpload.HiddenInput />
</FileUpload>
```

Send `pendingFiles` through the application's transport layer separately.

### HIGH Omitting the hidden input

Wrong:

```tsx
<FileUpload><FileUpload.Trigger>Choose files</FileUpload.Trigger></FileUpload>
```

Correct:

```tsx
<FileUpload>
  <FileUpload.Trigger>Choose files</FileUpload.Trigger>
  <FileUpload.HiddenInput />
</FileUpload>
```

Source: libs/ui/src/molecules/file-upload.tsx

### HIGH Inventing convenience parts or visual props

Wrong:

```tsx
<FileUpload variant="dashed">
  <FileUpload.Items />
</FileUpload>
```

Correct:

```tsx
<FileUpload>
  <FileUpload.Context>
    {(api) => (
      <FileUpload.ItemGroup>
        {api.acceptedFiles.map((file) => (
          <FileUpload.Item file={file} key={file.name} />
        ))}
      </FileUpload.ItemGroup>
    )}
  </FileUpload.Context>
</FileUpload>
```

Source: libs/ui/src/molecules/file-upload.tsx

### HIGH Duplicating validation outside Zag

Wrong:

```tsx
<input type="file" onChange={(event) => validateFiles(event.target.files)} />
```

Correct:

```tsx
<FileUpload
  accept={{ "application/pdf": [".pdf"] }}
  maxFileSize={5_000_000}
  validate={validateFile}
>
  <FileUpload.HiddenInput />
</FileUpload>
```

Source: https://zagjs.com/components/react/file-upload

## Validation Commands

```sh
rg -n "<input[^>]*type=['\"]file|<FileUpload[^>]*(onUpload|progress|retry|variant)" apps
rg -n "FileUpload\.(Items|List|FileText|PropsProvider|RootProvider)" apps
rg -U -P -n "<FileUpload(?![\\s\\S]{0,1200}<FileUpload\\.HiddenInput)" apps
rg -n "<FileUpload[^>]*className=.*(bg-|text-|border-|p-|px-|py-|rounded-)" apps
```

The unnamed picker is separate from the named native submission input, which projects committed acceptedFiles only. Raw, rejected and pending files never enter FormData or satisfy required. Async batches revalidate against current capacity and duplicates at commit; single-file replacement is latest-request-wins. Clear (button or api.clearFiles) and explicit api.setFiles replacement cancel outstanding batches; disabled/read-only transitions also invalidate them. Individual deletion does not cancel unrelated pending additions. Transform failures keep prior files and show retry guidance.

A non-prevented native form reset cancels pending work and requests restoration of `defaultAcceptedFiles` (empty by default); a controlled parent still owns whether that request is accepted. Calling `preventDefault()` on the reset event leaves pending transformations, processing state and accepted files intact. Read-only/disabled collections remain intact, including their native submission projection.

After deleting a focused file, focus moves to a surviving delete action or
a visible upload control/dropzone, never the hidden native submission input.

Expose inherited disabled state and announce error messages explicitly.
