/**
 * Shopping list: how many sheets and boards the parts need
 * (docs/RULES.md, rule M6).
 *
 * The counts come from actually laying the parts out, with the saw blade's
 * width between them, so the number bought is always enough. Phase 2 will
 * turn the same layouts into cutting diagrams.
 */
import type { BoardStock, MaterialCatalog, MaterialLine, Part, PartId, SheetStock, Ticks } from './types';
import { asTicks } from './units';
import { lengthOf, sheetSize } from './vanity';

interface Piece {
  readonly partId: PartId;
  /** Along the sheet's grain, or along the board. */
  readonly along: number;
  /** Across the grain. Unused for boards. */
  readonly across: number;
}

function piecesOf(parts: readonly Part[]): Piece[] {
  return parts.flatMap((part) =>
    Array.from({ length: part.quantity }, () => ({
      partId: part.id,
      along: part.grain === 'alongWidth' ? part.width : part.length,
      across: part.grain === 'alongWidth' ? part.length : part.width,
    })),
  );
}

/**
 * Sheets are cut into strips along the grain; each strip is as wide as its
 * widest piece, and pieces sit end to end along it. Widest pieces first.
 */
export function countSheets(pieces: readonly Piece[], sheet: { length: Ticks; width: Ticks }, kerf: Ticks): number {
  interface Strip {
    readonly width: number;
    used: number;
  }
  const sheets: { strips: Strip[]; usedWidth: number }[] = [];
  const sorted = [...pieces].sort((a, b) => b.across - a.across || b.along - a.along);

  for (const piece of sorted) {
    let placed = false;
    for (const s of sheets) {
      const strip = s.strips.find((st) => st.width >= piece.across && st.used + piece.along <= sheet.length);
      if (strip) {
        strip.used += piece.along + kerf;
        placed = true;
        break;
      }
      if (s.usedWidth + piece.across <= sheet.width) {
        s.strips.push({ width: piece.across, used: piece.along + kerf });
        s.usedWidth += piece.across + kerf;
        placed = true;
        break;
      }
    }
    if (!placed) {
      sheets.push({ strips: [{ width: piece.across, used: piece.along + kerf }], usedWidth: piece.across + kerf });
    }
  }
  return sheets.length;
}

/**
 * Boards: longest pieces first, each into the first board with room. Each
 * board is then bought at the shortest length sold that holds its pieces.
 * Returns how many boards of each stock length.
 */
export function countBoards(pieces: readonly Piece[], stockLengths: readonly Ticks[], kerf: Ticks): Map<Ticks, number> {
  const longest = Math.max(...stockLengths);
  const boards: number[] = []; // length used on each board, including a blade width after every piece
  for (const piece of [...pieces].sort((a, b) => b.along - a.along)) {
    const index = boards.findIndex((used) => used + piece.along <= longest);
    if (index === -1) boards.push(piece.along + kerf);
    else boards[index] = boards[index]! + piece.along + kerf;
  }
  const counts = new Map<Ticks, number>();
  for (const used of boards) {
    const needed = used - kerf; // no cut is needed after the last piece
    const buy = [...stockLengths].sort((a, b) => a - b).find((l) => l >= needed) ?? longest;
    counts.set(asTicks(buy), (counts.get(asTicks(buy)) ?? 0) + 1);
  }
  return counts;
}

export function shoppingList(parts: readonly Part[], catalog: MaterialCatalog, kerf: Ticks): MaterialLine[] {
  const lines: MaterialLine[] = [];
  for (const stock of catalog.stock) {
    const mine = parts.filter((p) => p.materialId === stock.id);
    if (mine.length === 0) continue;
    const partIds = mine.map((p) => p.id);
    const status = mine.some((p) => p.status === 'assumed') ? 'assumed' : 'confirmed';
    if (stock.kind === 'sheet') {
      lines.push({ materialId: stock.id, name: stock.name, quantity: countSheets(piecesOf(mine), sheetSize(stock as SheetStock), kerf), unit: 'sheet', partIds, status });
    } else {
      const lengths = (stock as BoardStock).stockLengths.map(lengthOf);
      const counts = countBoards(piecesOf(mine), lengths, kerf);
      for (const [stockLength, quantity] of [...counts].sort(([a], [b]) => a - b)) {
        lines.push({ materialId: stock.id, name: stock.name, quantity, unit: 'board', stockLength, partIds, status });
      }
    }
  }
  return lines;
}
