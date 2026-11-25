/**
 * Cutting diagrams and the shopping list that follows from them
 * (docs/RULES.md, rules C1-C6).
 *
 * Every piece in the cut list is placed on exactly one sheet or board, with
 * the saw blade's width between pieces. The number of sheets and boards to
 * buy is simply the number of diagrams, so the two can never disagree.
 */
import type {
  BoardStock,
  CutDiagram,
  CutPiece,
  CutStep,
  MaterialCatalog,
  MaterialLine,
  Offcut,
  Part,
  PartId,
  SheetStock,
  Ticks,
} from './types';
import { asTicks } from './units';
import { lengthOf, sheetSize } from './vanity';

interface Item {
  readonly partId: PartId;
  readonly copy: number;
  /** Along the grain of a sheet, or along a board. */
  readonly along: number;
  readonly across: number;
}

function itemsOf(parts: readonly Part[]): Item[] {
  return parts.flatMap((part) =>
    Array.from({ length: part.quantity }, (_, i) => ({
      partId: part.id,
      copy: i + 1,
      along: part.grain === 'alongWidth' ? part.width : part.length,
      across: part.grain === 'alongWidth' ? part.length : part.width,
    })),
  );
}

export interface CuttingOptions {
  readonly kerf: Ticks;
  readonly keepOffcutsFrom: Ticks;
  /** T4: with a track saw, long cuts first is tried too and used when it needs fewer sheets. */
  readonly allowLongCutsFirst: boolean;
}

/** Numbers the leftovers worth keeping; the rest stay unlabelled scrap. */
function labelOffcuts(raw: readonly Omit<Offcut, 'label'>[], keepFrom: Ticks, lengthOnly = false): Offcut[] {
  let kept = 0;
  return raw
    .filter((o) => o.along > 0 && o.across > 0)
    .map((o) => {
      // A board is kept for its length; a sheet leftover must be big both ways.
      const keep = o.along >= keepFrom && (lengthOnly || o.across >= keepFrom);
      if (keep) kept += 1;
      return { ...o, label: keep ? `Offcut ${kept}` : '' };
    });
}

// --- Sheets ----------------------------------------------------------------
// Rule C4: three kinds of cut, in order.
//   1. Cut across the sheet into sections (short cuts across the grain).
//   2. Cut each section into strips along the grain.
//   3. Cut each strip to length.
// A strip only holds pieces of exactly its own width, so no piece ever needs
// a fourth trimming cut.

interface Strip {
  readonly width: number;
  readonly fromEdge: number;
  used: number;
  readonly items: { item: Item; start: number }[];
}

interface Section {
  readonly length: number;
  readonly fromEnd: number;
  usedAcross: number;
  readonly strips: Strip[];
}

interface SheetLayout {
  usedLength: number;
  readonly sections: Section[];
}

/** Tries a few sensible orders and keeps the one that needs the fewest sheets. */
function layOutSheets(items: readonly Item[], sheet: { length: Ticks; width: Ticks }, kerf: Ticks, longCutsFirst = false): SheetLayout[] {
  const orders: ((a: Item, b: Item) => number)[] = [
    // Longest pieces first, so each section is as long as the first piece put in it.
    (a, b) => b.along - a.along || b.across - a.across,
    // Longest first, but narrow pieces before wide ones of the same length.
    (a, b) => b.along - a.along || a.across - b.across,
  ];
  let best: SheetLayout[] | undefined;
  for (const order of orders) {
    const attempt = layOutSheetsInOrder([...items].sort(order), sheet, kerf, longCutsFirst);
    if (!best || attempt.length < best.length) best = attempt;
  }
  return best ?? [];
}

function layOutSheetsInOrder(sorted: readonly Item[], sheet: { length: Ticks; width: Ticks }, kerf: Ticks, longCutsFirst: boolean): SheetLayout[] {
  const sheets: SheetLayout[] = [];

  const tryPlace = (s: SheetLayout, item: Item): boolean => {
    for (const section of s.sections) {
      if (section.length < item.along) continue;
      const strip = section.strips.find((st) => st.width === item.across && st.used + item.along <= section.length);
      if (strip) {
        strip.items.push({ item, start: strip.used });
        strip.used += item.along + kerf;
        return true;
      }
    }
    for (const section of s.sections) {
      if (section.length < item.along || section.usedAcross + item.across > sheet.width) continue;
      section.strips.push({ width: item.across, fromEdge: section.usedAcross, used: item.along + kerf, items: [{ item, start: 0 }] });
      section.usedAcross += item.across + kerf;
      return true;
    }
    if (s.usedLength + item.along > sheet.length) return false;
    s.sections.push({
      // Long cuts first: the whole sheet is one section, so every strip runs its full length.
      length: longCutsFirst ? sheet.length : item.along,
      fromEnd: s.usedLength,
      usedAcross: item.across + kerf,
      strips: [{ width: item.across, fromEdge: 0, used: item.along + kerf, items: [{ item, start: 0 }] }],
    });
    s.usedLength += longCutsFirst ? sheet.length : item.along + kerf;
    return true;
  };

  for (const item of sorted) {
    if (sheets.some((s) => tryPlace(s, item))) continue;
    const fresh: SheetLayout = { usedLength: 0, sections: [] };
    tryPlace(fresh, item);
    sheets.push(fresh);
  }
  return sheets;
}

const letter = (index: number) => String.fromCharCode(65 + (index % 26)) + (index >= 26 ? String(Math.floor(index / 26)) : '');

function sheetDiagram(
  layout: SheetLayout,
  stock: SheetStock,
  size: { length: Ticks; width: Ticks },
  index: number,
  count: number,
  options: CuttingOptions,
  longCutsFirst: boolean,
): CutDiagram {
  const pieces: CutPiece[] = [];
  const offcuts: Omit<Offcut, 'label'>[] = [];
  const sectionCuts: Omit<CutStep, 'number'>[] = [];
  const laterCuts: Omit<CutStep, 'number'>[] = [];

  layout.sections.forEach((section, s) => {
    const sectionName = longCutsFirst ? 'the sheet' : `section ${letter(s)}`;
    const reachesEnd = section.fromEnd + section.length === size.length;
    if (!longCutsFirst) sectionCuts.push({ kind: 'section', from: 'the sheet', measure: asTicks(section.length), makes: sectionName, noCutNeeded: reachesEnd });

    section.strips.forEach((strip, t) => {
      const stripName = longCutsFirst ? `strip ${t + 1}` : `strip ${letter(s)}${t + 1}`;
      const fillsSection = strip.fromEdge + strip.width === size.width;
      laterCuts.push({ kind: 'strip', from: sectionName, measure: asTicks(strip.width), makes: stripName, noCutNeeded: fillsSection });

      for (const { item, start } of strip.items) {
        pieces.push({
          partId: item.partId,
          copy: item.copy,
          along: asTicks(item.along),
          across: asTicks(item.across),
          fromEnd: asTicks(section.fromEnd + start),
          fromEdge: asTicks(strip.fromEdge),
        });
        laterCuts.push({
          kind: 'piece',
          from: stripName,
          measure: asTicks(item.along),
          makes: item.partId,
          partId: item.partId,
          // The last piece is whatever is left of the strip when that is exactly its length.
          noCutNeeded: start + item.along === section.length,
        });
      }
      // What is left at the end of the strip.
      offcuts.push({
        along: asTicks(Math.max(0, section.length - strip.used)),
        across: asTicks(strip.width),
        fromEnd: asTicks(section.fromEnd + strip.used),
        fromEdge: asTicks(strip.fromEdge),
      });
    });
    // What is left along the edge of the section.
    offcuts.push({
      along: asTicks(section.length),
      across: asTicks(Math.max(0, size.width - section.usedAcross)),
      fromEnd: asTicks(section.fromEnd),
      fromEdge: asTicks(section.usedAcross),
    });
  });
  // What is left at the end of the sheet.
  offcuts.push({
    along: asTicks(Math.max(0, size.length - layout.usedLength)),
    across: size.width,
    fromEnd: asTicks(layout.usedLength),
    fromEdge: asTicks(0),
  });

  return {
    id: `${stock.id}-${index + 1}`,
    materialId: stock.id,
    title: `${stock.name}, sheet ${index + 1} of ${count}`,
    kind: 'sheet',
    stockLength: size.length,
    stockWidth: size.width,
    hasGrain: stock.hasGrain,
    kerf: options.kerf,
    order: longCutsFirst ? 'longCutsFirst' : 'sectionsFirst',
    pieces,
    offcuts: labelOffcuts(offcuts, options.keepOffcutsFrom),
    steps: [...sectionCuts, ...laterCuts].map((step, i) => ({ ...step, number: i + 1 })),
  };
}

// --- Boards ----------------------------------------------------------------
// Longest pieces first, each onto the first board with room. Each board is
// then bought at the shortest length sold that holds its pieces.

interface BoardLayout {
  used: number;
  readonly items: { item: Item; start: number }[];
}

function layOutBoards(items: readonly Item[], longest: number, kerf: Ticks): BoardLayout[] {
  const boards: BoardLayout[] = [];
  for (const item of [...items].sort((a, b) => b.along - a.along)) {
    let board = boards.find((b) => b.used + item.along <= longest);
    if (!board) {
      board = { used: 0, items: [] };
      boards.push(board);
    }
    board.items.push({ item, start: board.used });
    board.used += item.along + kerf;
  }
  return boards;
}

function boardDiagram(
  layout: BoardLayout,
  stock: BoardStock,
  stockLengths: readonly Ticks[],
  index: number,
  count: number,
  options: CuttingOptions,
): CutDiagram {
  const needed = layout.used - options.kerf; // no cut is needed after the last piece
  const stockLength = [...stockLengths].sort((a, b) => a - b).find((l) => l >= needed) ?? asTicks(Math.max(...stockLengths));
  const stockWidth = lengthOf(stock.actualWidth);
  const pieces: CutPiece[] = layout.items.map(({ item, start }) => ({
    partId: item.partId,
    copy: item.copy,
    along: asTicks(item.along),
    across: asTicks(item.across),
    fromEnd: asTicks(start),
    fromEdge: asTicks(0),
  }));
  const steps: CutStep[] = layout.items.map(({ item, start }, i) => ({
    number: i + 1,
    kind: 'piece',
    from: 'the board',
    measure: asTicks(item.along),
    makes: item.partId,
    partId: item.partId,
    noCutNeeded: start + item.along === stockLength,
  }));
  return {
    id: `${stock.id}-${index + 1}`,
    materialId: stock.id,
    title: `${stock.name}, board ${index + 1} of ${count}`,
    kind: 'board',
    stockLength,
    stockWidth,
    hasGrain: true,
    kerf: options.kerf,
    order: 'sectionsFirst',
    pieces,
    offcuts: labelOffcuts(
      [{ along: asTicks(Math.max(0, stockLength - layout.used)), across: stockWidth, fromEnd: asTicks(Math.min(layout.used, stockLength)), fromEdge: asTicks(0) }],
      options.keepOffcutsFrom,
      true,
    ),
    steps,
  };
}

/** One diagram for every sheet and every board the parts need, in catalog order. */
export function cutDiagrams(parts: readonly Part[], catalog: MaterialCatalog, options: CuttingOptions): CutDiagram[] {
  const diagrams: CutDiagram[] = [];
  for (const stock of catalog.stock) {
    const items = itemsOf(parts.filter((p) => p.materialId === stock.id));
    if (items.length === 0) continue;
    if (stock.kind === 'sheet') {
      const size = sheetSize(stock);
      const sections = layOutSheets(items, size, options.kerf);
      const long = options.allowLongCutsFirst ? layOutSheets(items, size, options.kerf, true) : undefined;
      // T4: long cuts first only when it saves a sheet; on a tie, sections are easier to handle.
      const useLong = long !== undefined && long.length < sections.length;
      const layouts = useLong ? long : sections;
      layouts.forEach((layout, i) => diagrams.push(sheetDiagram(layout, stock, size, i, layouts.length, options, useLong)));
    } else {
      const lengths = stock.stockLengths.map(lengthOf);
      const layouts = layOutBoards(items, Math.max(...lengths), options.kerf);
      layouts.forEach((layout, i) => diagrams.push(boardDiagram(layout, stock, lengths, i, layouts.length, options)));
    }
  }
  return diagrams;
}

/** Rule C6: the shopping list is the diagrams, counted. */
export function shoppingList(diagrams: readonly CutDiagram[], parts: readonly Part[], catalog: MaterialCatalog): MaterialLine[] {
  const lines: MaterialLine[] = [];
  for (const stock of catalog.stock) {
    const mine = diagrams.filter((d) => d.materialId === stock.id);
    if (mine.length === 0) continue;
    const status = parts.some((p) => p.materialId === stock.id && p.status === 'assumed') ? 'assumed' : 'confirmed';
    const idsOn = (ds: readonly CutDiagram[]) => [...new Set(ds.flatMap((d) => d.pieces.map((p) => p.partId)))];
    if (stock.kind === 'sheet') {
      lines.push({ materialId: stock.id, name: stock.name, quantity: mine.length, unit: 'sheet', partIds: idsOn(mine), status });
      continue;
    }
    for (const stockLength of [...new Set(mine.map((d) => d.stockLength))].sort((a, b) => a - b)) {
      const ofLength = mine.filter((d) => d.stockLength === stockLength);
      lines.push({ materialId: stock.id, name: stock.name, quantity: ofLength.length, unit: 'board', stockLength, partIds: idsOn(ofLength), status });
    }
  }
  return lines;
}
