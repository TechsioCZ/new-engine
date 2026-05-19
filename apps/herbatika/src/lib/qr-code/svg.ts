import { QR_MAX_DATA_CODEWORDS, QR_PAD_CODEWORDS } from "./constants";
import { createQrMatrixSvg } from "./matrix";
import { addErrorCorrectionAndInterleave } from "./reed-solomon";

class BitBuffer {
  readonly bits: number[] = [];

  append(value: number, length: number) {
    for (let index = length - 1; index >= 0; index -= 1) {
      this.bits.push((value >>> index) & 1);
    }
  }
}

export const createQrSvg = (value: string): string | null => {
  const dataCodewords = buildDataCodewords(value);
  if (!dataCodewords) {
    return null;
  }

  return createQrMatrixSvg(addErrorCorrectionAndInterleave(dataCodewords));
};

const buildDataCodewords = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > QR_MAX_DATA_CODEWORDS) {
    return null;
  }

  const buffer = new BitBuffer();
  buffer.append(0b0100, 4);
  buffer.append(bytes.length, 8);

  for (const byte of bytes) {
    buffer.append(byte, 8);
  }

  const maxDataBits = QR_MAX_DATA_CODEWORDS * 8;
  buffer.append(0, Math.min(4, maxDataBits - buffer.bits.length));
  while (buffer.bits.length % 8 !== 0) {
    buffer.bits.push(0);
  }

  const codewords: number[] = [];
  for (let offset = 0; offset < buffer.bits.length; offset += 8) {
    let codeword = 0;
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      codeword = (codeword << 1) | (buffer.bits[offset + bitIndex] ?? 0);
    }
    codewords.push(codeword);
  }

  let padIndex = 0;
  while (codewords.length < QR_MAX_DATA_CODEWORDS) {
    codewords.push(QR_PAD_CODEWORDS[padIndex % QR_PAD_CODEWORDS.length]);
    padIndex += 1;
  }

  return codewords;
};
