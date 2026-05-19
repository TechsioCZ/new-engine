export const QR_VERSION = 9;
export const QR_SIZE = 17 + QR_VERSION * 4;
export const QR_QUIET_ZONE = 4;
export const QR_MAX_DATA_CODEWORDS = 182;
export const QR_ECC_CODEWORDS_PER_BLOCK = 22;
export const QR_FORMAT_BITS_M_MASK_0 = 0x5412;
export const QR_ALIGNMENT_PATTERN_POSITIONS = [6, 26, 46] as const;
export const QR_DATA_BLOCK_GROUPS = [
  { count: 3, dataCodewords: 36 },
  { count: 2, dataCodewords: 37 },
] as const;
export const QR_PAD_CODEWORDS = [0xec, 0x11] as const;
