import type {
  DraftEntryId,
  DraftSourcePage,
  LegalTemplateEntryId,
  NonLegalDraftEntryId,
} from "../types"

export const nonLegalPage = (
  ...[entryId, title, lead, heading, body]: readonly [
    NonLegalDraftEntryId,
    string,
    string,
    string,
    readonly string[],
  ]
): DraftSourcePage => ({
  entryId,
  lead,
  requiredOperatorFields: [],
  sections: [{ body, heading }],
  title,
})

export const legalTemplate = (
  ...[entryId, title, lead, fields, heading, body]: readonly [
    LegalTemplateEntryId,
    string,
    string,
    readonly string[],
    string,
    readonly string[],
  ]
): DraftSourcePage => ({
  entryId: entryId as DraftEntryId,
  lead,
  requiredOperatorFields: fields,
  sections: [{ body, heading }],
  title,
})
