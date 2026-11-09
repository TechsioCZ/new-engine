<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/fileupload--2956-157.md (+ fileupload-dropzone, -item, -icon), edited. Storybook: Molecules/FileUpload → UX guidelines. -->

# FileUpload: UX guidelines

FileUpload lets the user pick local files for a named purpose, by browsing or
dropping. It checks and lists them; it does not upload them. Accepted means
"selected locally", never "uploaded".

## When to use

- Attaching files to a record: product images, documents, imports.
- The conditions (types, size, count) are known before the user picks.

## Use something else when

| Need | Use instead |
| --- | --- |
| Picking from existing media | a media library dialog |
| Pasting a URL | `FormInput` |

## Anatomy

- **Label**: `FileUpload.Label`, the purpose (`Product photos`).
- **Dropzone**: `FileUpload.Dropzone` with a visible `FileUpload.Trigger`
  (browse button). Dropping is an extra path, never the only one.
- **Hidden input**: `FileUpload.HiddenInput`, required for the picker and the
  form.
- **File lists**: `FileUpload.ItemGroup type="accepted"` and
  `type="rejected"`, each `FileUpload.Item` with `ItemPreview` (file icon) or
  `ItemPreviewImage` (thumbnail), `ItemName`, `ItemSizeText` and
  `ItemDeleteTrigger`.
- **Status text**: `FileUpload.StatusText` for conditions and errors.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `state=default` | — | No known problem; not proof anything was uploaded. |
| `state=invalid` | `invalid` + `FileUpload.StatusText` | The selection is invalid (missing, too many); each rejected file still says why. |
| `state=disabled` | `disabled` | Can't add files now, for a reason the user can find. |
| `state=readonly` | `readOnly` | Files inspectable at full contrast and submitted; add, clear and remove are hidden. |
| `required=true` / `false` | `required` | Same meaning in validation. |
| dropzone `state=dragging` | automatic (`data-dragging`) | Files are over the zone. Not acceptance and not upload. |
| dropzone `state=hover` / `focus` | not props | Browser states. |
| item `type=accepted` / `rejected` | `ItemGroup type` | Passed or failed the local checks. |
| item `preview=document` / `image` | `ItemPreview` / `ItemPreviewImage` | Match the real file type; a thumbnail only when it adds meaning. |
| — | `size="sm" \| "md" \| "lg"` | Density. Not in Figma. |
| `fileupload-icon` | inside `ItemPreview` | Internal part. |

## Behaviour

**May:** open the file picker, add files, remove them from the pending set;
accept dropped files as a second path to the same selection.

**Must not:** present a locally accepted file as uploaded; delete an already
stored document because a new local attachment was removed.

- Selecting builds a local set. Each file is accepted or rejected with a
  specific reason; one rejected file never clears the accepted ones.
- Upload, progress, success and retry belong to the app. Show them per file,
  not only as a toast.
- Removing a new local file only removes it from the pending set. Deleting a
  stored file is a separate, confirmed action
  ([Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md)).
- Cancelling the system picker adds nothing.

## Content and copy

- State the real conditions before selection: `PNG or JPG, up to 5 MB` — cs:
  `PNG nebo JPG, max. 5 MB`.
- Dropzone: `Drag files here or browse`; button `Choose files` — cs:
  `Přetáhněte soubory sem nebo je vyberte`, `Vybrat soubory`.
- Rejection names the file, the problem and the fix:
  `photo.heic isn't supported. Use PNG or JPG.` — cs:
  `Soubor photo.heic není podporovaný. Použijte PNG nebo JPG.`
- File sizes formatted for the locale
  ([Formatting](../../ux-guidelines/references/formatting.md)).

## Accessibility

- The kit names the dropzone from the label, opens the picker with Enter or
  Space, and links status text to the dropzone and trigger.
- Every remove button has an accessible name with the file name.
- Rejection is shown with text and an icon, not only a red border.
- After a file is removed, focus moves to the next file, the previous one, or
  the dropzone.

## Edge cases

- **Unsupported type among valid files**: the rejected file explains the
  limit; the valid files stay selected.
- **Touch device**: the browse button works without drag and drop. Removing a
  new photo doesn't delete the whole request.
- **Summary error only**: a field-level `invalid` never replaces saying which
  file was rejected and why.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): accepted locally vs confirmed by the server.
- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): deleting stored files.
- [Formatting](../../ux-guidelines/references/formatting.md): file sizes.
