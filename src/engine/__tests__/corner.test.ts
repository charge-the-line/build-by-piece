/**
 * A corner: two walls that meet (docs/RULES.md, section N). The test kitchen
 * is made up, shaped like Ashley's: a 150" sink wall with the corner at its
 * right end, and a 126" range wall.
 */
import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../defaults/catalog';
import { startingCorner } from '../defaults/run';
import { vanityDefaults } from '../defaults/vanity';
import { userEntered } from '../defaults/values';
import { generateRun } from '../run';
import type { PlanResult, RunDesign } from '../types';
import { checkPlacements, inches, problems } from './helpers';

const planOf = (run: RunDesign = startingCorner) => generateRun(run, vanityDefaults, defaultCatalog);
const withCorner = (change: Partial<NonNullable<RunDesign['corner']>>, more: Partial<RunDesign> = {}): RunDesign => ({ ...startingCorner, ...more, corner: { ...startingCorner.corner!, ...change } });
const result = planOf();
const mirrored = planOf(withCorner({ side: 'left' }));
const errors = (r: PlanResult) => r.issues.filter((i) => i.severity === 'error');
const part = (r: PlanResult, id: string) => r.parts.find((p) => p.id === id)!;
const named = (r: PlanResult, cabinet: string, name: string) => r.parts.find((p) => p.id.startsWith(`${cabinet}-`) && p.name === name)!;

describe('the corner cabinet (rules N2, N3)', () => {
  it('builds the test kitchen with no errors or warnings', () => {
    expect(result.canGeneratePlan).toBe(true);
    expect(problems(result)).toEqual([]);
  });

  it('adds a corner cabinet at the corner end of the first wall, without being asked', () => {
    expect(result.run!.cabinets.map((c) => [c.id, c.name, c.left, c.width])).toEqual([
      ['C01', 'Drawer base', 0, inches('22 1/2')],
      ['C02', 'Sink base', inches('22 1/2'), inches('36')],
      ['C03', 'Base cabinet', inches('82 1/2'), inches('22 1/2')],
      ['C04', 'Corner base cabinet', inches('105'), inches('45')],
    ]);
    expect(mirrored.run!.cabinets.map((c) => [c.id, c.name, c.left])).toEqual([
      ['C01', 'Corner base cabinet', 0],
      ['C02', 'Drawer base', inches('45')],
      ['C03', 'Sink base', inches('67 1/2')],
      ['C04', 'Base cabinet', inches('127 1/2')],
    ]);
    expect(result.inputs.find((i) => i.path === 'items.corner.width')).toMatchObject({ value: inches('45'), origin: 'appDefault' });
  });

  it('hides 27 1/2" of it behind the other wall: 24" of cabinet and the 3 1/2" gap', () => {
    // The frame is the 17 1/2" that shows; the box runs the full 45".
    expect(named(result, 'C04', 'Top frame piece').length).toBe(inches('17 1/2') - 2 * inches('1 1/2'));
    expect(named(result, 'C04', 'Bottom').length).toBe(inches('45') - 2 * inches('3/4'));
    expect(named(result, 'C04', 'Blind panel')).toMatchObject({ length: inches('31'), width: inches('27 1/2'), colorRole: 'support' });
    expect(named(result, 'C04', 'Blind panel').derivation.width.ruleId).toBe('N3');
    // One door, no drawer, one shelf the full width of the box.
    expect(result.openings.filter((o) => o.id.startsWith('C04-')).map((o) => o.kind)).toEqual(['door']);
    expect(named(result, 'C04', 'Shelf').length).toBe(inches('43 1/2'));
  });

  it('hinges the door on the side away from the corner', () => {
    expect(result.openings.find((o) => o.id.startsWith('C04-'))!.hingeSide).toBe('left');
    expect(mirrored.openings.find((o) => o.id.startsWith('C01-'))!.hingeSide).toBe('right');
  });

  it('closes the hidden part with the blind panel, in its own step', () => {
    const step = result.steps.find((s) => s.id === 'C04:blindPanel')!;
    expect(step.pieces.map((p) => part(result, p.partId).name)).toEqual(['Blind panel']);
    expect(step.screws.length).toBeGreaterThan(0);
    expect(step.glue.length).toBeGreaterThan(0);
    expect(result.steps.some((s) => s.id === 'C01:blindPanel')).toBe(false);
  });

  it('lets her change its width, and refuses one too narrow for a door', () => {
    const wide = planOf(withCorner({ cabinetWidth: userEntered('48') }));
    expect(wide.run!.cabinets.at(-1)).toMatchObject({ width: inches('48') });
    expect(wide.inputs.find((i) => i.path === 'items.corner.width')).toMatchObject({ origin: 'user' });
    const narrow = planOf(withCorner({ cabinetWidth: userEntered('34') }));
    expect(errors(narrow).map((i) => [i.code, i.ruleId, i.suggestedFix])).toEqual([['CORNER_CABINET_NARROW', 'N3', 'Make the corner cabinet wider.']]);
    expect(errors(narrow)[0]!.explanation).toContain('27 1/2" of it is hidden');
  });
});

describe('the second wall (rules N4, N5, N6)', () => {
  const second = result.run!.second!;

  it('starts its cabinets after the first wall\'s depth and the gap', () => {
    // 126" less 24" less 3 1/2" leaves 98 1/2"; less the 30" range, shared by two.
    expect(second.cabinets.map((c) => [c.id, c.name, c.left, c.width])).toEqual([
      ['C05', 'Base cabinet', inches('27 1/2'), inches('34 1/4')],
      ['C06', 'Base cabinet', inches('91 3/4'), inches('34 1/4')],
    ]);
    expect(second.spaces.map((s) => [s.name, s.left, s.width])).toEqual([['Space for a range', inches('61 3/4'), inches('30')]]);
    expect(result.inputs.find((i) => i.path === 'corner.length')).toMatchObject({ value: inches('126'), label: 'second wall: length of the run' });
    expect(result.inputs.find((i) => i.path === 'corner.items.item-1.width')).toMatchObject({ value: inches('34 1/4') });
  });

  it('covers the gap with an oak board at the width it is sold', () => {
    const strip = result.parts.find((p) => p.name === 'Gap strip')!;
    expect(strip).toMatchObject({ materialId: 'oak-1x4', length: inches('31'), width: inches('3 1/2'), quantity: 1, colorRole: 'faceFrame' });
    expect(strip.derivation.width.ruleId).toBe('N4');
    const step = result.steps.find((s) => s.id === 'run2:gap-strip')!;
    expect(step).toMatchObject({ wall: 2, fasteners: [{ supplyId: 'joining-screws', quantity: 5 }] });
    const ids = result.steps.map((s) => s.id);
    expect(ids.indexOf('run2:gap-strip')).toBe(ids.indexOf('run2:set-C05') + 1);
  });

  it('refuses an appliance space as the first thing at the corner', () => {
    const r = planOf(withCorner({ items: [{ id: 'a', kind: 'appliance', appliance: 'range' }, { id: 'b', kind: 'cabinet', cabinet: 'base' }] }));
    expect(errors(r).map((i) => [i.code, i.ruleId])).toEqual([['CORNER_NEEDS_CABINET', 'N5']]);
    expect(errors(r)[0]!.explanation).toMatch(/^Second wall: /);
  });

  it('says which wall a problem is on', () => {
    const r = planOf(withCorner({ length: userEntered('70') }));
    expect(r.canGeneratePlan).toBe(false);
    expect(errors(r).every((i) => i.explanation.startsWith('Second wall: '))).toBe(true);
    expect(errors(r)[0]!.inputPaths).toContain('corner.length');
  });

  it('runs its platform and toe kick across the gap to meet the first wall\'s toe kick', () => {
    const facing = second.placements;
    const rail = result.parts.filter((p) => p.name.startsWith('Platform rail')).at(-2)!;
    const start = Math.min(...facing.filter((p) => p.partId === rail.id).map((p) => p.x));
    // The first wall's toe kick face is 24" less the 3" toe space: 21".
    expect(start).toBe(inches('21'));
  });

  it('treats its far end as open unless she says there is a wall', () => {
    expect(result.inputs.find((i) => i.path === 'corner.end')).toMatchObject({ value: 'exposed', origin: 'appDefault' });
    const walled = planOf(withCorner({ end: 'wall' }));
    expect(walled.inputs.find((i) => i.path === 'corner.end')).toMatchObject({ value: 'wall', origin: 'user' });
    expect(named(walled, 'C06', 'Bottom').length).toBe(inches('34 1/4') - inches('1/4') - 2 * inches('3/4'));
  });
});

describe('upper cabinets at the corner (rule N7)', () => {
  it('runs the first wall\'s corner upper into the corner and hides 15 1/2" of it', () => {
    expect(result.run!.uppers.at(-1)).toMatchObject({ id: 'U04', left: inches('105'), width: inches('45') });
    expect(named(result, 'U04', 'Blind panel')).toMatchObject({ length: inches('30'), width: inches('15 1/2') });
    expect(result.openings.filter((o) => o.id.startsWith('U04-'))).toHaveLength(2);
  });

  it('starts the second wall\'s uppers 15 1/2" from the corner, so the first is 12" wider than the cabinet under it', () => {
    expect(result.run!.second!.uppers.map((u) => [u.id, u.left, u.width])).toEqual([
      ['U05', inches('15 1/2'), inches('46 1/4')],
      ['U06', inches('91 3/4'), inches('34 1/4')],
    ]);
    expect(result.parts.find((p) => p.name === 'Gap strip (upper cabinets)')).toMatchObject({ length: inches('30'), width: inches('3 1/2') });
    expect(result.steps.some((s) => s.id === 'run2:upper-gap-strip')).toBe(true);
  });

  it('needs no blind panel or strip when one wall has nothing at the corner', () => {
    const none2 = planOf(withCorner({ above: { 'item-1': 'none' } }));
    expect(none2.parts.some((p) => p.id.startsWith('U04-') && p.name === 'Blind panel')).toBe(false);
    expect(none2.parts.some((p) => p.name === 'Gap strip (upper cabinets)')).toBe(false);
    checkPlacements(none2, 'no upper on the second wall at the corner:');
    const none1 = planOf(withCorner({}, { uppers: { above: { corner: 'none' } } }));
    expect(none1.run!.uppers.map((u) => u.id)).toEqual(['U01', 'U02', 'U03']);
    expect(none1.parts.some((p) => p.name === 'Gap strip (upper cabinets)')).toBe(false);
    checkPlacements(none1, 'no upper on the first wall at the corner:');
  });
});

describe('both walls together (rule N8)', () => {
  it('fits in one room: every piece placed once and none sharing space, whichever side the second wall is on', () => {
    checkPlacements(result, 'corner on the right:');
    checkPlacements(mirrored, 'corner on the left:');
    // The same pieces, seen facing the second wall.
    checkPlacements({ ...result, placements: result.run!.second!.placements }, 'facing the second wall:');
  });

  it('turns the second wall into the room: its cabinets stand against it, in front of the first wall\'s', () => {
    const boxes = Object.fromEntries(result.run!.fromAbove!.boxes.map((b) => [b.label, [b.x, b.z, b.sizeX, b.sizeZ]]));
    expect(boxes.C04).toEqual([inches('105'), 0, inches('45'), inches('24')]);
    expect(boxes.C05).toEqual([inches('126'), inches('27 1/2'), inches('24'), inches('34 1/4')]);
    expect(mirrored.run!.fromAbove!.boxes.find((b) => b.label === 'C06')).toMatchObject({ x: 0, z: inches('27 1/2') });
    expect(result.run!.fromAbove).toMatchObject({ width: inches('150'), depth: inches('126') });
  });

  it('numbers cabinets along the first wall, then the second, with no number used twice', () => {
    const ids = result.parts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...new Set(ids.map((id) => id.split('-')[0]))]).toEqual(['C01', 'C02', 'C03', 'C04', 'U01', 'U02', 'U03', 'U04', 'R', 'C05', 'C06', 'U05', 'U06']);
    const stepIds = result.steps.map((s) => s.id);
    expect(new Set(stepIds).size).toBe(stepIds.length);
    expect(result.steps.map((s) => s.number)).toEqual(stepIds.map((_, i) => i + 1));
  });

  it('builds everything, then sets each wall starting at the corner, then hangs the uppers, then fits doors', () => {
    const groups = result.steps.map((s) => s.id.split(':')[0]!.replace(/\d+$/, (n) => (s.id.startsWith('run') ? n : ''))).filter((g, i, all) => g !== all[i - 1]);
    expect(groups).toEqual(['C', 'U', 'run', 'run2', 'run', 'run2', 'C', 'U', 'C', 'U']);
    const run = result.steps.filter((s) => s.id.startsWith('run')).map((s) => s.id);
    expect(run.filter((id) => id.includes(':set-') || id.includes(':hang-'))).toEqual([
      'run:set-C04',
      'run:set-C03',
      'run:set-C02',
      'run:set-C01',
      'run2:set-C05',
      'run2:set-C06',
      'run:hang-U04',
      'run:hang-U03',
      'run:hang-U02',
      'run:hang-U01',
      'run2:hang-U05',
      'run2:hang-U06',
    ]);
    expect(result.steps.find((s) => s.id === 'run:set-C03')).toMatchObject({ values: { cabinet: 3, joins: 1 }, fasteners: [{ supplyId: 'joining-screws', quantity: 5 }] });
  });

  it('shows the first wall already in place when the second wall goes in', () => {
    const earlier = new Set(result.steps.find((s) => s.id === 'run2:set-C05')!.earlierPieces.map((p) => p.partId.split('-')[0]));
    expect([...earlier].sort()).toEqual(['C01', 'C02', 'C03', 'C04', 'R']);
    expect(result.steps.filter((s) => s.wall === 2).every((s) => /^(run2|C0[56]|U0[56]):/.test(s.id))).toBe(true);
  });

  it('uses every part in a step and puts every piece on one cutting diagram', () => {
    const used = new Set(result.steps.flatMap((s) => s.partIds));
    expect(result.parts.filter((p) => !used.has(p.id)).map((p) => `${p.id} ${p.name}`)).toEqual([]);
    const expected = result.parts.flatMap((p) => Array.from({ length: p.quantity }, (_, i) => `${p.id}#${i + 1}`)).sort();
    expect(result.cutDiagrams.flatMap((d) => d.pieces.map((p) => `${p.partId}#${p.copy}`)).sort()).toEqual(expected);
  });

  it('adds up screws, hardware and tools across both walls', () => {
    const fromSteps = (id: string) => result.steps.flatMap((s) => s.fasteners).filter((f) => f.supplyId === id).reduce((n, f) => n + f.quantity, 0);
    for (const id of ['pocket-screws-coarse', 'pocket-screws-fine', 'construction-screws', 'short-screws', 'joining-screws']) {
      expect(result.supplies.find((s) => s.id === id)?.quantity, id).toBe(fromSteps(id));
    }
    expect(result.issues.filter((i) => i.code === 'TOOL_TO_BUY_OR_BORROW')).toHaveLength(1);
    expect(result.tools.filter((t) => t.id === 'clamps')).toHaveLength(1);
  });

  it('leaves a run without a corner exactly as it was', () => {
    const { corner: _corner, ...straight } = startingCorner;
    const r = planOf(straight);
    expect(r.run!.second).toBeUndefined();
    expect(r.run!.fromAbove).toBeUndefined();
    expect(r.parts.some((p) => p.name === 'Blind panel' || p.name.startsWith('Gap strip'))).toBe(false);
    expect(r.steps.some((s) => s.wall === 2)).toBe(false);
  });
});
