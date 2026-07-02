import type { AddressParts } from '@techsio/smart-suggest-core';

export type AddressSearchVisibility = 'hidden' | 'searchable';

export type AddressSnapshotRuianIdentifiers = {
  addressPlaceCode: string;
  stableAddressId: string;
  buildingObjectCode?: string;
  districtCode?: string;
  municipalityCode?: string;
  municipalityDistrictCode?: string;
  municipalityPartCode?: string;
  postalCode?: string;
  regionCode?: string;
  streetCode?: string;
};

export type AddressSnapshotRuianFeedId = 'RUIAN-CSV-ADR-ST' | 'RUIAN-S-ZA-U' | 'RUIAN-S-ZA-Z';

export type AddressSnapshotRuianFileKind = 'baseline' | 'delta';

export type AddressSnapshotSourceLineage = {
  sourceId: string;
  sourceRowId: string;
  atomEntryId?: string;
  checksumSha256?: string;
  datasetVersion?: string;
  fileKind?: AddressSnapshotRuianFileKind;
  feedId?: AddressSnapshotRuianFeedId;
  previousAtomEntryId?: string;
  sourceGeneratedAt?: string;
  sourceUri?: string;
  sourceValidAt?: string;
  sourceVersion?: string;
  snapshotUri?: string;
};

export type AddressSnapshotVisibilityMetadata = {
  searchVisibility: AddressSearchVisibility;
  changeProposalGlobalId?: string;
  invalid?: boolean;
  reason?: string;
  sourceStatus?: string;
  transactionId?: string;
  validFrom?: string;
  validTo?: string;
};

export type AddressSnapshotRow = {
  id: string;
  parts: AddressParts;
  quality?: number;
  latitude?: number;
  longitude?: number;
  ruian?: AddressSnapshotRuianIdentifiers;
  sourceLineage?: AddressSnapshotSourceLineage;
  visibility?: AddressSnapshotVisibilityMetadata;
};

export type AddressTombstoneRow = {
  id: string;
  deletedAt?: string;
  reason?: string;
  ruian?: AddressSnapshotRuianIdentifiers;
  sourceLineage?: AddressSnapshotSourceLineage;
};
