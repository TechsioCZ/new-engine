import {
  QR_ALIGNMENT_PATTERN_POSITIONS,
  QR_FORMAT_BITS_M_MASK_0,
  QR_QUIET_ZONE,
  QR_SIZE,
} from "./constants";

export const createQrMatrixSvg = (codewords: number[]) => {
  const modules = createModules();
  const reserved = createModules();

  drawFunctionPatterns(modules, reserved);
  drawCodewords(modules, reserved, codewords);

  return renderSvg(modules);
};

const createModules = () => {
  return Array.from({ length: QR_SIZE }, () =>
    Array.from({ length: QR_SIZE }, () => false),
  );
};

const drawFunctionPatterns = (modules: boolean[][], reserved: boolean[][]) => {
  drawFinderPattern(modules, reserved, 0, 0);
  drawFinderPattern(modules, reserved, 0, QR_SIZE - 7);
  drawFinderPattern(modules, reserved, QR_SIZE - 7, 0);

  for (const row of QR_ALIGNMENT_PATTERN_POSITIONS) {
    for (const column of QR_ALIGNMENT_PATTERN_POSITIONS) {
      const overlapsFinder =
        (row === 6 && column === 6) ||
        (row === 6 && column === QR_SIZE - 7) ||
        (row === QR_SIZE - 7 && column === 6);

      if (!overlapsFinder) {
        drawAlignmentPattern(modules, reserved, row, column);
      }
    }
  }

  for (let index = 0; index < QR_SIZE; index += 1) {
    if (!reserved[6]?.[index]) {
      setFunctionModule(modules, reserved, 6, index, index % 2 === 0);
    }
    if (!reserved[index]?.[6]) {
      setFunctionModule(modules, reserved, index, 6, index % 2 === 0);
    }
  }

  drawFormatBits(modules, reserved);
};

const drawFinderPattern = (
  modules: boolean[][],
  reserved: boolean[][],
  row: number,
  column: number,
) => {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const nextRow = row + dy;
      const nextColumn = column + dx;
      if (!isInBounds(nextRow, nextColumn)) {
        continue;
      }

      const isFinderArea = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const isDark =
        isFinderArea &&
        (dx === 0 ||
          dx === 6 ||
          dy === 0 ||
          dy === 6 ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));

      setFunctionModule(modules, reserved, nextRow, nextColumn, isDark);
    }
  }
};

const drawAlignmentPattern = (
  modules: boolean[][],
  reserved: boolean[][],
  centerRow: number,
  centerColumn: number,
) => {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunctionModule(
        modules,
        reserved,
        centerRow + dy,
        centerColumn + dx,
        distance === 0 || distance === 2,
      );
    }
  }
};

const drawFormatBits = (modules: boolean[][], reserved: boolean[][]) => {
  for (let index = 0; index <= 5; index += 1) {
    setFunctionModule(
      modules,
      reserved,
      index,
      8,
      getBit(QR_FORMAT_BITS_M_MASK_0, index),
    );
  }
  setFunctionModule(modules, reserved, 7, 8, getBit(QR_FORMAT_BITS_M_MASK_0, 6));
  setFunctionModule(modules, reserved, 8, 8, getBit(QR_FORMAT_BITS_M_MASK_0, 7));
  setFunctionModule(modules, reserved, 8, 7, getBit(QR_FORMAT_BITS_M_MASK_0, 8));

  for (let index = 9; index < 15; index += 1) {
    setFunctionModule(
      modules,
      reserved,
      8,
      14 - index,
      getBit(QR_FORMAT_BITS_M_MASK_0, index),
    );
  }

  for (let index = 0; index < 8; index += 1) {
    setFunctionModule(
      modules,
      reserved,
      8,
      QR_SIZE - 1 - index,
      getBit(QR_FORMAT_BITS_M_MASK_0, index),
    );
  }

  for (let index = 8; index < 15; index += 1) {
    setFunctionModule(
      modules,
      reserved,
      QR_SIZE - 15 + index,
      8,
      getBit(QR_FORMAT_BITS_M_MASK_0, index),
    );
  }

  setFunctionModule(modules, reserved, QR_SIZE - 8, 8, true);
};

const drawCodewords = (
  modules: boolean[][],
  reserved: boolean[][],
  codewords: number[],
) => {
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1),
  );
  let bitIndex = 0;
  let direction = -1;

  for (let column = QR_SIZE - 1; column >= 1; column -= 2) {
    if (column === 6) {
      column -= 1;
    }

    for (
      let row = direction === -1 ? QR_SIZE - 1 : 0;
      row >= 0 && row < QR_SIZE;
      row += direction
    ) {
      for (let offset = 0; offset < 2; offset += 1) {
        const nextColumn = column - offset;
        if (reserved[row]?.[nextColumn]) {
          continue;
        }

        modules[row][nextColumn] =
          Boolean(bits[bitIndex] ?? 0) !== shouldApplyMask(row, nextColumn);
        bitIndex += 1;
      }
    }

    direction *= -1;
  }
};

const setFunctionModule = (
  modules: boolean[][],
  reserved: boolean[][],
  row: number,
  column: number,
  isDark: boolean,
) => {
  if (!isInBounds(row, column)) {
    return;
  }

  modules[row][column] = isDark;
  reserved[row][column] = true;
};

const shouldApplyMask = (row: number, column: number) => {
  return (row + column) % 2 === 0;
};

const isInBounds = (row: number, column: number) => {
  return row >= 0 && row < QR_SIZE && column >= 0 && column < QR_SIZE;
};

const getBit = (value: number, index: number) => {
  return Boolean((value >>> index) & 1);
};

const renderSvg = (modules: boolean[][]) => {
  const viewSize = QR_SIZE + QR_QUIET_ZONE * 2;
  const path = modules
    .flatMap((row, rowIndex) =>
      row.map((isDark, columnIndex) =>
        isDark
          ? `M${columnIndex + QR_QUIET_ZONE} ${rowIndex + QR_QUIET_ZONE}h1v1h-1z`
          : "",
      ),
    )
    .filter(Boolean)
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges">`,
    `<rect width="${viewSize}" height="${viewSize}" fill="#fff"/>`,
    `<path fill="#000" d="${path}"/>`,
    "</svg>",
  ].join("");
};
