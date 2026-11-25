/**
 * Cutting diagrams (docs/RULES.md, rules C1-C6): one per sheet and board,
 * with the blade width between pieces, grain respected, a cut order and
 * labelled offcuts.
 */
import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../defaults/catalog';
import { userEntered } from '../defaults/values';
import type { CutDiagram, CutPiece, Offcut, PlanResult } from '../types';
import { inches, plan, vanityWith } from './helpers';

const result = plan();
const kerf = inches('1/8');

type Box = Pick<CutPiece | Offcut, 'along' | 'across' | 'fromEnd' | 'fromEdge'>;
/** True when two rectangles are at least `gap` apart in one direction. */
const apart = (a: Box, b: Box, gap: number) =>
  a.fromEnd + a.along + gap <= b.fromEnd ||
  b.fromEnd + b.along + gap <= a.fromEnd ||
  a.fromEdge + a.across + gap <= b.fromEdge ||
  b.fromEdge + b.across + gap <= a.fromEdge;

/** Everything a valid set of diagrams must satisfy, for any plan. */
function checkDiagrams(r: PlanResult, bladeWidth: number, context = '') {
  const expected = r.parts.flatMap((p) => Array.from({ length: p.quantity }, (_, i) => `${p.id}#${i + 1}`)).sort();
  const placed = r.cutDiagrams.flatMap((d) => d.pieces.map((p) => `${p.partId}#${p.copy}`)).sort();
  expect(placed, `${context} every piece once`).toEqual(expected);

  for (const d of r.cutDiagrams) {
    const where = `${context} ${d.title}`;
    for (const piece of d.pieces) {
      const part = r.parts.find((p) => p.id === piece.partId)!;
      expect(part.materialId, where).toBe(d.materialId);
      expect([piece.along, piece.across], `${where} ${piece.partId} runs with the grain`).toEqual([part.length, part.width]);
      expect(piece.fromEnd >= 0 && piece.fromEdge >= 0, where).toBe(true);
      expect(piece.fromEnd + piece.along, `${where} ${piece.partId} fits the length`).toBeLessThanOrEqual(d.stockLength);
      expect(piece.fromEdge + piece.across, `${where} ${piece.partId} fits the width`).toBeLessThanOrEqual(d.stockWidth);
    }
    d.pieces.forEach((a, i) => {
      for (const b of d.pieces.slice(i + 1)) {
        expect(apart(a, b, bladeWidth), `${where}: ${a.partId} and ${b.partId} leave room for the blade`).toBe(true);
      }
      for (const offcut of d.offcuts) expect(apart(a, offcut, 0), `${where}: offcut clear of ${a.partId}`).toBe(true);
    });
    d.offcuts.forEach((a, i) => {
      expect(a.fromEnd + a.along, where).toBeLessThanOrEqual(d.stockLength);
      expect(a.fromEdge + a.across, where).toBeLessThanOrEqual(d.stockWidth);
      for (const b of d.offcuts.slice(i + 1)) expect(apart(a, b, 0), `${where}: offcuts do not overlap`).toBe(true);
    });
    expect(d.steps.map((s) => s.number), where).toEqual(d.steps.map((_, i) => i + 1));
  }
}

const sheets = (r: PlanResult, id: string) => r.cutDiagrams.filter((d) => d.materialId === id);

describe('cutting diagrams (rules C1-C6)', () => {
  it('makes one diagram for every sheet and every board on the shopping list (rules C1, C6)', () => {
    const bought = result.materials.reduce((n, line) => n + line.quantity, 0);
    expect(result.cutDiagrams).toHaveLength(bought);
    for (const line of result.materials) {
      const mine = result.cutDiagrams.filter((d) => d.materialId === line.materialId && (line.unit === 'sheet' || d.stockLength === line.stockLength));
      expect(mine, line.name).toHaveLength(line.quantity);
    }
  });

  it('puts every piece in the cut list on exactly one diagram, and nothing else', () => {
    checkDiagrams(result, kerf);
    expect(result.cutDiagrams.reduce((n, d) => n + d.pieces.length, 0)).toBe(95);
  });

  it('keeps the same shopping list as before for vanity 01', () => {
    expect(result.materials.map((m) => [m.quantity, m.materialId, m.stockLength ?? 0])).toEqual([
      [2, 'oak-ply-3-4', 0],
      [2, 'oak-ply-1-4', 0],
      [1, 'oak-1x2', inches('48')],
      [3, 'oak-1x2', inches('96')],
      [1, 'oak-1x3', inches('72')],
      [2, 'oak-1x3', inches('96')],
      [1, 'oak-1x4', inches('96')],
      [1, 'oak-1x6', inches('72')],
      [1, 'pine-1x4', inches('72')],
      [1, 'pine-1x4', inches('96')],
      [3, 'stud-2x4', inches('96')],
    ]);
  });

  it('leaves at least the blade width between neighbouring pieces, whatever the blade (rule C2)', () => {
    const thick = plan(vanityWith({}, { cutting: { kerf: userEntered('1/4') } }));
    expect(thick.cutDiagrams.every((d) => d.kerf === inches('1/4'))).toBe(true);
    checkDiagrams(thick, inches('1/4'));
  });

  it('runs every plywood piece with the grain of its sheet (rule C3)', () => {
    const door = result.parts.find((p) => p.name === 'Left door: door centre panel')!;
    const placed = result.cutDiagrams.flatMap((d) => d.pieces).find((p) => p.partId === door.id)!;
    // A door panel's grain runs up and down, so its height lies along the sheet.
    expect(placed.along).toBe(inches('23 5/8'));
    const drawer = result.parts.find((p) => p.name === 'Left drawers, drawer 3: drawer front centre panel')!;
    const drawerPlaced = result.cutDiagrams.flatMap((d) => d.pieces).find((p) => p.partId === drawer.id)!;
    // A drawer front panel's grain runs side to side, so its width lies along the sheet.
    expect(drawerPlaced.along).toBe(inches('9 3/4'));
    expect(result.cutDiagrams.every((d) => d.hasGrain)).toBe(true);
  });

  it('cuts a sheet into sections first, then strips, then pieces (rule C4)', () => {
    for (const d of result.cutDiagrams.filter((x) => x.kind === 'sheet')) {
      const kinds = d.steps.map((s) => s.kind);
      const lastSection = kinds.lastIndexOf('section');
      expect(kinds.slice(0, lastSection + 1).every((k) => k === 'section'), d.title).toBe(true);
      // Every strip is cut before the pieces that come out of it.
      for (const [i, step] of d.steps.entries()) {
        if (step.kind !== 'piece') continue;
        const strip = d.steps.findIndex((s) => s.kind === 'strip' && s.makes === step.from);
        expect(strip, `${d.title} ${step.makes}`).toBeGreaterThanOrEqual(0);
        expect(strip).toBeLessThan(i);
      }
    }
  });

  it('gives every piece its own cutting step with the length to measure', () => {
    for (const d of result.cutDiagrams) {
      const pieceSteps = d.steps.filter((s) => s.kind === 'piece');
      expect(pieceSteps.map((s) => [s.partId, s.measure]).sort(), d.title).toEqual(d.pieces.map((p) => [p.partId, p.along]).sort());
    }
  });

  it('starts the first sheet with the longest piece, which needs no cut to length', () => {
    const first = sheets(result, 'oak-ply-3-4')[0]!;
    expect(first.steps[0]).toMatchObject({ kind: 'section', from: 'the sheet', measure: inches('58 1/4'), makes: 'section A', noCutNeeded: false });
    const bottom = result.parts.find((p) => p.name === 'Bottom')!;
    expect(first.steps.find((s) => s.partId === bottom.id)).toMatchObject({ measure: inches('58 1/4'), noCutNeeded: true });
  });

  it('labels offcuts worth keeping and leaves small scrap unlabelled (rule C5)', () => {
    const all = result.cutDiagrams.flatMap((d) => d.offcuts.map((o) => ({ ...o, kind: d.kind })));
    const kept = all.filter((o) => o.label !== '');
    expect(kept.length).toBeGreaterThan(0);
    for (const o of kept) {
      expect(o.label).toMatch(/^Offcut \d+$/);
      expect(o.along).toBeGreaterThanOrEqual(inches('6'));
      if (o.kind === 'sheet') expect(o.across).toBeGreaterThanOrEqual(inches('6'));
    }
    for (const o of all.filter((x) => x.label === '' && x.kind === 'sheet')) {
      expect(Math.min(o.along, o.across)).toBeLessThan(inches('6'));
    }
    // The last 2x4 holds one short support, leaving most of the board.
    const lastStud = sheets(result, 'stud-2x4').at(-1)!;
    expect(lastStud.offcuts).toEqual([expect.objectContaining({ label: 'Offcut 1', along: inches('96') - inches('14 1/4') - kerf })]);
  });

  it('buys each board at the shortest length sold that holds its pieces', () => {
    const lengths = defaultCatalog.stock.find((s) => s.id === 'oak-1x2');
    expect(lengths?.kind).toBe('board');
    for (const d of result.cutDiagrams.filter((x) => x.kind === 'board')) {
      const used = Math.max(...d.pieces.map((p) => p.fromEnd + p.along));
      expect(used, d.title).toBeLessThanOrEqual(d.stockLength);
    }
    expect(sheets(result, 'oak-1x2').map((d) => d.stockLength)).toContain(inches('48'));
  });

  it('stays valid across a range of cabinet sizes', () => {
    for (const [width, depth, height] of [['36', '18', '30'], ['48', '21', '32'], ['72 1/2', '22', '34 1/2'], ['84', '24', '30'], ['96', '21', '36']] as const) {
      const r = plan(vanityWith({ width, depth, height }));
      if (!r.canGeneratePlan) continue;
      checkDiagrams(r, kerf, `${width} x ${depth} x ${height}:`);
      expect(r.cutDiagrams.length).toBe(r.materials.reduce((n, m) => n + m.quantity, 0));
    }
  });

  it('produces no diagrams while an error blocks the plan', () => {
    expect(plan(vanityWith({ depth: '12' })).cutDiagrams).toEqual([]);
  });

  it('gives every diagram a title that says which sheet or board it is', () => {
    const titles = result.cutDiagrams.map((d: CutDiagram) => d.title);
    expect(titles).toContain('3/4" oak plywood, sheet 1 of 2');
    expect(titles).toContain('2x4 stud, board 3 of 3');
    expect(new Set(result.cutDiagrams.map((d) => d.id)).size).toBe(result.cutDiagrams.length);
  });
});
