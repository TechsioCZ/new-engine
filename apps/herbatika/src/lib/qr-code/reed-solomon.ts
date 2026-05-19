import {
  QR_DATA_BLOCK_GROUPS,
  QR_ECC_CODEWORDS_PER_BLOCK,
} from "./constants";

type QrBlock = {
  data: number[];
  ecc: number[];
};

const GF_EXP = new Array<number>(512);
const GF_LOG = new Array<number>(256);

let gfValue = 1;
for (let index = 0; index < 255; index += 1) {
  GF_EXP[index] = gfValue;
  GF_LOG[gfValue] = index;
  gfValue <<= 1;
  if (gfValue & 0x100) {
    gfValue ^= 0x11d;
  }
}
for (let index = 255; index < GF_EXP.length; index += 1) {
  GF_EXP[index] = GF_EXP[index - 255] ?? 0;
}

export const addErrorCorrectionAndInterleave = (dataCodewords: number[]) => {
  const generator = reedSolomonGenerator(QR_ECC_CODEWORDS_PER_BLOCK);
  const blocks: QrBlock[] = [];
  let offset = 0;

  for (const group of QR_DATA_BLOCK_GROUPS) {
    for (let index = 0; index < group.count; index += 1) {
      const data = dataCodewords.slice(offset, offset + group.dataCodewords);
      offset += group.dataCodewords;
      blocks.push({
        data,
        ecc: reedSolomonRemainder(data, generator),
      });
    }
  }

  const result: number[] = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));
  for (let index = 0; index < maxDataLength; index += 1) {
    for (const block of blocks) {
      if (index < block.data.length) {
        result.push(block.data[index] ?? 0);
      }
    }
  }

  for (let index = 0; index < QR_ECC_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of blocks) {
      result.push(block.ecc[index] ?? 0);
    }
  }

  return result;
};

const reedSolomonGenerator = (degree: number) => {
  const result = Array.from({ length: degree }, () => 0);
  result[degree - 1] = 1;

  let root = 1;
  for (let index = 0; index < degree; index += 1) {
    for (
      let coefficientIndex = 0;
      coefficientIndex < result.length;
      coefficientIndex += 1
    ) {
      result[coefficientIndex] = gfMultiply(
        result[coefficientIndex] ?? 0,
        root,
      );
      if (coefficientIndex + 1 < result.length) {
        result[coefficientIndex] ^= result[coefficientIndex + 1] ?? 0;
      }
    }
    root = gfMultiply(root, 0x02);
  }

  return result;
};

const reedSolomonRemainder = (data: number[], generator: number[]) => {
  const result = Array.from({ length: generator.length }, () => 0);

  for (const codeword of data) {
    const factor = codeword ^ (result.shift() ?? 0);
    result.push(0);
    for (let index = 0; index < generator.length; index += 1) {
      result[index] =
        (result[index] ?? 0) ^ gfMultiply(generator[index] ?? 0, factor);
    }
  }

  return result;
};

const gfMultiply = (left: number, right: number) => {
  if (left === 0 || right === 0) {
    return 0;
  }

  return GF_EXP[(GF_LOG[left] ?? 0) + (GF_LOG[right] ?? 0)] ?? 0;
};
