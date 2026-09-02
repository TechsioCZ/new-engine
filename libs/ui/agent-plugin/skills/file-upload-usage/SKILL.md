---
component_version: "1.0.0"
name: file-upload-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit FileUpload to
  select, validate, preview, and manage local File objects through the Zag.js
  compound API, including accepted/rejected files and native form behavior.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
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
              <FileUpload.ItemPreview>
                <FileUpload.ItemPreviewImage />
              </FileUpload.ItemPreview>
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
`ItemSizeText` render the current file values by default. `ItemPreviewImage`
creates its object URL through Zag and revokes it when the file changes or the
part unmounts.

There is no `Items`, `List`, `FileText`, `PropsProvider`, public store/provider,
`size`, or `variant` API. Compose ordinary content around the public parts when
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
native file input or override its machine-owned attributes.

### Render accepted and rejected files deliberately

The root does not choose an accepted-only presentation. Read both collections
through `FileUpload.Context`, use the matching `ItemGroup` type, and render the
raw Zag rejection errors in application-appropriate copy.

`FileUpload.ClearTrigger` clears both accepted and rejected files. Use
`api.clearRejectedFiles()` when an action should clear only rejected files.

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
<FileUpload size="lg" variant="dashed">
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
rg -n "<input[^>]*type=['\"]file|<FileUpload[^>]*(onUpload|progress|retry|size|variant)" apps
rg -n "FileUpload\.(Items|List|FileText|PropsProvider|RootProvider)" apps
rg -U -P -n "<FileUpload(?![\\s\\S]{0,1200}<FileUpload\\.HiddenInput)" apps
rg -n "<FileUpload[^>]*className=.*(bg-|text-|border-|p-|px-|py-|rounded-)" apps
```
