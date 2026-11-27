/**
 * A run of cabinets along one wall (docs/RULES.md, section R). The test
 * wall is made up: 120" long, a wall at the left, open at the right, with a
 * drawer base, a sink base, a dishwasher space and a base cabinet.
 */
import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../defaults/catalog';
import { startingRun } from '../defaults/run';
import { vanityDefaults } from '../defaults/vanity';
import { userChoice, userEntered } from '../defaults/values';
import { newCabinet } from '../fixtures/kitchen';
import { generateRun } from '../run';
import type { PlanResult, RunDesign, RunItem } from '../types';
import { checkPlacements, inches, plan, problems } from './helpers';

const planRun = (run: RunDesign = startingRun) => generateRun(run, vanityDefaults, defaultCatalog);
const result = planRun();
const runOf = (items: readonly RunItem[], length = '120', more: Partial<RunDesign> = {}): RunDesign => ({ ...startingRun, length: userEntered(length), items, ...more });
const cabinet = (id: string, kind: 'base' | 'drawerBase' | 'sinkBase', width?: string): RunItem => ({ id, kind: 'cabinet', cabinet: kind, ...(width ? { width: userEntered(width) } : {}) });
const space = (id: string, appliance: 'range' | 'dishwasher' | 'fridge', width?: string): RunItem => ({ id, kind: 'appliance', appliance, ...(width ? { width: userEntered(width) } : {}) });
const errors = (r: PlanResult) => r.issues.filter((i) => i.severity === 'error');
const partNamed = (r: PlanResult, name: string) => r.parts.filter((p) => p.name === name);

describe('sharing the run out (rules R1, R2)', () => {
  it('builds the test wall with no errors or warnings', () => {
    expect(result.canGeneratePlan).toBe(true);
    expect(problems(result)).toEqual([]);
  });

  it('gives the dishwasher 24" and the sink base 36", and shares the rest equally', () => {
    expect(result.run?.cabinets.map((c) => [c.id, c.name, c.left, c.width])).toEqual([
      ['C01', 'Drawer base', 0, inches('30')],
      ['C02', 'Sink base', inches('30'), inches('36')],
      ['C03', 'Base cabinet', inches('90'), inches('30')],
    ]);
    expect(result.run?.spaces.map((s) => [s.name, s.left, s.width])).toEqual([['Space for a dishwasher', inches('66'), inches('24')]]);
  });

  it('always adds up to the run exactly, whatever its length', () => {
    for (const length of ['96', '110 1/2', '117 5/16', '120', '131 7/8', '144']) {
      const r = planRun(runOf(startingRun.items, length));
      if (!r.canGeneratePlan) continue;
      const widths = [...r.run!.cabinets.map((c) => c.width), ...r.run!.spaces.map((s) => s.width)];
      expect(widths.reduce((a, b) => a + b, 0), length).toBe(inches(length));
      // Shares are on the tape; only the last one takes an odd leftover.
      expect(r.run!.cabinets[0]!.width % inches('1/16'), length).toBe(0);
    }
  });

  it('lets her fix a cabinet width; the others share what is left', () => {
    const r = planRun(runOf([cabinet('a', 'drawerBase', '18'), cabinet('b', 'sinkBase'), space('c', 'dishwasher'), cabinet('d', 'base')]));
    expect(r.run?.cabinets.map((c) => c.width)).toEqual([inches('18'), inches('36'), inches('42')]);
    expect(r.inputs.find((i) => i.path === 'items.a.width')).toMatchObject({ origin: 'user', status: 'confirmed' });
    expect(r.inputs.find((i) => i.path === 'items.d.width')).toMatchObject({ origin: 'appDefault', note: 'Shares the run with the other cabinets.' });
  });

  it('marks an appliance space to check before cutting, until she sets it', () => {
    expect(result.inputs.find((i) => i.path === 'items.item-3.width')).toMatchObject({ checkAt: 'cutting', value: inches('24') });
    const set = planRun(runOf([cabinet('a', 'base'), space('b', 'range', '29 7/8')], '72'));
    expect(set.inputs.find((i) => i.path === 'items.b.width')?.checkAt).toBeUndefined();
    expect(set.run?.cabinets[0]?.width).toBe(inches('72') - inches('29 7/8'));
  });

  it('shows a picture when fixed widths do not add up to the run', () => {
    const r = planRun(runOf([cabinet('a', 'base', '30'), cabinet('b', 'sinkBase', '36'), space('c', 'dishwasher')], '120'));
    expect(r.canGeneratePlan).toBe(false);
    const issue = errors(r)[0]!;
    expect(issue).toMatchObject({ code: 'RUN_WIDTH_MISMATCH', ruleId: 'R2' });
    expect(issue.explanation).toContain('add up to 90"');
    expect(issue.explanation).toContain('30" unexplained');
    expect(issue.diagram).toMatchObject({ direction: 'horizontal', total: inches('120'), difference: inches('30') });
    expect(issue.diagram!.segments.map((s) => s.label)).toEqual(['Base cabinet', 'Sink base', 'Space for a dishwasher']);
    const over = planRun(runOf([cabinet('a', 'base', '30'), cabinet('b', 'sinkBase', '36')], '60'));
    expect(errors(over)[0]!.explanation).toContain('6" more than the run');
  });

  it('refuses a cabinet that comes out too narrow or too wide, and says what to do (rule R8)', () => {
    const narrow = planRun(runOf([cabinet('a', 'base'), cabinet('b', 'sinkBase'), space('c', 'range')], '72'));
    expect(errors(narrow).map((i) => [i.code, i.suggestedFix])).toEqual([['RUN_CABINET_WIDTH', 'Remove a cabinet, or make the run longer.']]);
    expect(errors(narrow)[0]!.explanation).toContain('C01 Base cabinet comes out 6" wide');
    const wide = planRun(runOf([cabinet('a', 'base')], '60'));
    expect(errors(wide).map((i) => [i.code, i.suggestedFix])).toEqual([['RUN_CABINET_WIDTH', 'Add a cabinet to the run.']]);
  });

  it('explains a length that is not on a tape measure, and an empty run', () => {
    expect(errors(planRun(runOf(startingRun.items, '120 1/3')))[0]).toMatchObject({ code: 'INPUT_NOT_USABLE', inputPaths: ['length'] });
    expect(errors(planRun(runOf([])))[0]).toMatchObject({ code: 'RUN_IS_EMPTY' });
  });
});

describe('each cabinet in the run (rules R3, R5)', () => {
  it('numbers cabinets left to right and their parts by cabinet', () => {
    const ids = result.parts.map((p) => p.id);
    expect(ids.filter((id) => id.startsWith('C01-')).slice(0, 2)).toEqual(['C01-01', 'C01-02']);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...new Set(ids.map((id) => id.split('-')[0]))]).toEqual(['C01', 'C02', 'C03', 'R']);
    expect(result.parts.find((p) => p.id === 'C02-01')).toMatchObject({ name: 'Left side', assembly: 'C02 Sink base: Box' });
  });

  it('builds each cabinet exactly as it would be built alone at that width, apart from its ends and platform', () => {
    const alone = plan(newCabinet('sinkBase', 'alone', '36'));
    const inRun = result.parts.filter((p) => p.id.startsWith('C02-'));
    const sameName = (name: string) => [inRun.find((p) => p.name === name)!, alone.parts.find((p) => p.name === name)!] as const;
    for (const name of ['Left side', 'Back', 'Top frame piece', 'Left door: door upright', 'Left fixed panel: panel']) {
      const [a, b] = sameName(name);
      expect([a.length, a.width, a.quantity], name).toEqual([b.length, b.width, b.quantity]);
    }
    expect(inRun.filter((p) => /Platform|Toe kick/.test(p.name))).toEqual([]);
  });

  it('applies the frame overhang only at the wall end of the run', () => {
    const box = (id: string) => result.parts.find((p) => p.id.startsWith(`${id}-`) && p.name === 'Bottom')!.length;
    // C01 is 30" with a wall on its left: 30" less the 1/4" overhang, less two sides.
    expect(box('C01')).toBe(inches('30') - inches('1/4') - 2 * inches('3/4'));
    // C03 is 30" with nothing touching a wall.
    expect(box('C03')).toBe(inches('30') - 2 * inches('3/4'));
  });

  it('puts pocket holes on the outside of a side that meets another cabinet, and inside on one that can be seen (rule J2)', () => {
    const face = (cabinetId: string, sideName: string) => {
      const step = result.steps.find((s) => s.id === `${cabinetId}:frameOn`)!;
      return step.joints.find((j) => result.parts.find((p) => p.id === j.through)!.name === sideName)!.face;
    };
    expect(face('C01', 'Left side')).toBe('outside face'); // wall
    expect(face('C01', 'Right side')).toBe('outside face'); // meets C02
    expect(face('C02', 'Right side')).toBe('inside face'); // next to the dishwasher, can be seen
    expect(face('C03', 'Right side')).toBe('inside face'); // open end of the run
  });

  it('fits together: every piece placed once, none sharing space, across the whole run', () => {
    checkPlacements(result, 'test wall:');
    expect(result.placements).toHaveLength(result.parts.reduce((n, p) => n + p.quantity, 0));
  });

  it('stays sound for other runs', () => {
    checkPlacements(planRun(runOf([cabinet('a', 'base'), cabinet('b', 'base'), cabinet('c', 'drawerBase')], '90', { overrides: { ends: { left: userChoice('wall'), right: userChoice('wall') } } })), 'wall to wall:');
    checkPlacements(planRun(runOf([space('a', 'fridge'), cabinet('b', 'drawerBase'), space('c', 'range'), cabinet('d', 'base'), cabinet('e', 'sinkBase')], '168')), 'with a fridge and range:');
    checkPlacements(planRun(runOf([cabinet('a', 'sinkBase')], '36', { overrides: {} })), 'one cabinet:');
  });
});

describe('one platform for each stretch (rule R4)', () => {
  const rails = partNamed(result, 'Platform rail (stretch 1)')[0]!;

  it('runs one platform under each unbroken stretch, stopping at the dishwasher', () => {
    // C01 and C02: 66", less the 1/4" overhang at the wall, less 3 3/4" where it can be seen beside the dishwasher.
    expect([rails.length, rails.quantity]).toEqual([inches('62'), 2]);
    // C03: 30", seen at both ends.
    expect(partNamed(result, 'Platform rail (stretch 2)')[0]!.length).toBe(inches('22 1/2'));
    expect(result.parts.filter((p) => p.id.startsWith('R-')).every((p) => p.colorRole === 'platform')).toBe(true);
  });

  it('follows the single-cabinet rules for supports and toe kick', () => {
    expect(partNamed(result, 'Platform cross support (stretch 1)')[0]).toMatchObject({ length: inches('17 1/4'), quantity: 5 });
    expect(partNamed(result, 'Toe kick, front (stretch 1)')[0]!.length).toBe(inches('62 3/4'));
    expect(partNamed(result, 'Toe kick, end return (stretch 1)')[0]!.quantity).toBe(1);
    expect(partNamed(result, 'Toe kick, end return (stretch 2)')[0]!.quantity).toBe(2);
  });

  it('builds a long stretch in sections no longer than a board, breaking where two cabinets meet', () => {
    const long = planRun(runOf([cabinet('a', 'base'), cabinet('b', 'base'), cabinet('c', 'drawerBase'), cabinet('d', 'base'), cabinet('e', 'base')], '180', { overrides: { ends: { left: userChoice('wall'), right: userChoice('wall') } } }));
    expect(long.canGeneratePlan).toBe(true);
    const sections = long.parts.filter((p) => p.name.startsWith('Platform rail'));
    expect(sections.length).toBeGreaterThan(1);
    for (const s of sections) expect(s.length).toBeLessThanOrEqual(inches('96'));
    // Together the sections run the whole length between the two walls' overhangs.
    expect(sections.reduce((n, s) => n + s.length, 0)).toBe(inches('180') - 2 * inches('1/4'));
    // Each break is where two cabinets meet.
    const joints = long.run!.cabinets.slice(1).map((c) => c.left);
    const starts = long.placements.filter((p) => sections.slice(1).some((s) => s.id === p.partId) && p.copy === 1).map((p) => p.x);
    for (const start of starts) expect(joints).toContain(start);
    checkPlacements(long, 'long run:');
    for (const piece of long.parts.filter((p) => p.name.startsWith('Toe kick'))) expect(piece.length).toBeLessThanOrEqual(inches('96'));
  });
});

describe('one shopping list and shared sheets (rule R6)', () => {
  it('puts every piece of every cabinet on exactly one cutting diagram', () => {
    const expected = result.parts.flatMap((p) => Array.from({ length: p.quantity }, (_, i) => `${p.id}#${i + 1}`)).sort();
    expect(result.cutDiagrams.flatMap((d) => d.pieces.map((p) => `${p.partId}#${p.copy}`)).sort()).toEqual(expected);
  });

  it('puts parts from different cabinets on the same sheet', () => {
    const firstSheet = result.cutDiagrams.find((d) => d.materialId === 'oak-ply-3-4')!;
    expect(new Set(firstSheet.pieces.map((p) => p.partId.split('-')[0])).size).toBeGreaterThan(1);
  });

  it('needs no more plywood than building each cabinet on its own', () => {
    const sheets = (r: PlanResult) => r.materials.filter((m) => m.unit === 'sheet').reduce((n, m) => n + m.quantity, 0);
    const alone = [newCabinet('drawerBase', 'a', '30'), newCabinet('sinkBase', 'b', '36'), newCabinet('base', 'c', '30')].map((d) => sheets(plan(d))).reduce((a, b) => a + b, 0);
    expect(sheets(result)).toBeLessThan(alone);
  });

  it('adds up hardware and screws across the run', () => {
    expect(result.hardware.map((h) => [h.hardwareId, h.quantity])).toEqual([
      ['slide-side-mount', 5],
      ['hinge-face-frame-half-inch', 8],
    ]);
    const fromSteps = (id: string) => result.steps.flatMap((s) => s.fasteners).filter((f) => f.supplyId === id).reduce((n, f) => n + f.quantity, 0);
    for (const id of ['pocket-screws-coarse', 'pocket-screws-fine', 'construction-screws', 'short-screws', 'joining-screws']) {
      expect(result.supplies.find((s) => s.id === id)?.quantity, id).toBe(fromSteps(id));
    }
  });

  it('lists a tool to buy once for the whole run', () => {
    expect(result.issues.filter((i) => i.code === 'TOOL_TO_BUY_OR_BORROW')).toHaveLength(1);
    expect(result.tools.filter((t) => t.id === 'clamps')).toHaveLength(1);
  });
});

describe('building the run (rule R7)', () => {
  const ids = result.steps.map((s) => s.id);

  it('builds each cabinet in turn, then sets them in place, then fits drawers and doors', () => {
    const groups = ids.map((id) => id.split(':')[0]).filter((g, i, all) => g !== all[i - 1]);
    expect(groups).toEqual(['C01', 'C02', 'C03', 'run', 'C01', 'C02', 'C03']);
    expect(ids.filter((id) => id.startsWith('run:'))).toEqual(['run:platform-1', 'run:platform-2', 'run:place-platforms', 'run:set-C01', 'run:set-C02', 'run:set-C03', 'run:wall', 'run:toe-kick']);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.steps.map((s) => s.number)).toEqual(ids.map((_, i) => i + 1));
  });

  it('says which cabinet each step belongs to', () => {
    expect(result.steps.find((s) => s.id === 'C02:boxLeft')?.cabinet).toEqual({ id: 'C02', name: 'Sink base' });
    expect(result.steps.find((s) => s.id === 'run:wall')?.cabinet).toBeUndefined();
  });

  it('uses every part in at least one step', () => {
    const used = new Set(result.steps.flatMap((s) => s.partIds));
    expect(result.parts.filter((p) => !used.has(p.id)).map((p) => `${p.id} ${p.name}`)).toEqual([]);
  });

  it('screws each cabinet to the one before it, but not across an appliance space', () => {
    const set = (id: string) => result.steps.find((s) => s.id === `run:set-${id}`)!;
    expect(set('C01').screws).toEqual([]);
    // C02 meets C01 along 31" of frame: five screws.
    expect(set('C02')).toMatchObject({ fasteners: [{ supplyId: 'joining-screws', quantity: 5 }], values: { cabinet: 2, joins: 1 } });
    expect(set('C02').screws.every((p) => p.x === inches('30'))).toBe(true);
    // C03 is across the dishwasher space.
    expect(set('C03')).toMatchObject({ screws: [], values: { joins: 0 } });
  });

  it('shows the cabinets already in place when the next one is set', () => {
    const earlier = new Set(result.steps.find((s) => s.id === 'run:set-C02')!.earlierPieces.map((p) => p.partId.split('-')[0]));
    expect([...earlier].sort()).toEqual(['C01', 'R']);
  });

  it('keeps the pipe openings step for the sink base, before it is set in place', () => {
    expect(ids.indexOf('C02:plumbing')).toBeGreaterThan(-1);
    expect(ids.indexOf('C02:plumbing')).toBeLessThan(ids.indexOf('run:set-C02'));
  });

  it('puts glue and screw marks where the cabinet sits in the run, not at the wall', () => {
    const step = result.steps.find((s) => s.id === 'C03:boxLeft')!;
    expect(step.screws.every((p) => p.x >= inches('90'))).toBe(true);
    expect(step.glue.every((g) => g.x >= inches('90'))).toBe(true);
  });
});
