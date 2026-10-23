// Parent updates must arrive in order. Pending native edits protect the live
// query/caret: an acknowledgement retires its prefix, including the latest edit.
// Restoring a still-pending value is indistinguishable from an acknowledgement;
// after the latest is acknowledged, old values are replacements. Async parents
// must discard out-of-order responses themselves.
export function queueComboboxQuery(
  pending: readonly string[],
  edit: string,
  inputValue: string
): string[] {
  // React skips an unchanged prop, so this edit completes the batch immediately.
  return edit === inputValue ? [] : [...pending, edit]
}

/** null means an external replacement; an array keeps the native query/caret. */
export function acknowledgeComboboxQuery(
  pending: readonly string[],
  inputValue: string
): string[] | null {
  // Prefer the newest occurrence when native values repeat.
  const index = pending.lastIndexOf(inputValue)
  return index === -1 ? null : pending.slice(index + 1)
}
