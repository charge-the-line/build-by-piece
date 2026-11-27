/**
 * Where every piece sits (rule A0) and the assembly steps (rules A1-A12,
 * J1-J3). The step pictures are drawn from these positions.
 */
import { describe, expect, it } from 'vitest';
import { choicesOf, layoutFrom, proposedVanityLayout, type BayChoice } from '../defaults/vanity';
import { defaultCatalog } from '../defaults/catalog';
import { userChoice, userEntered } from '../defaults/values';
import { cutDiagrams } from '../cutting';
import type { Overrides, Part, Placement, PlanResult, ToolId, VanityOptions } from '../types';
import { inches, part, plan, problems, vanityWith } from './helpers';

const result = plan();
const name = (r: PlanResult, id: string) => r.parts.find((p) => p.id === id)!.name;

const overlap = (a: Placement, b: Placement) =>
  a.x < b.x + b.sizeX && b.x < a.x + a.sizeX && a.y < b.y + b.sizeY && b.y < a.y + a.sizeY && a.z < b.z + b.sizeZ && b.z < a.z + a.sizeZ;

/** Everything valid placements must satisfy, for any plan. */
function checkPlacements(r: PlanResult, context = '') {
  expect(r.issues.filter((i) => i.severity === 'error').map((i) => i.explanation), `${context} builds`).toEqual([]);
  const expected = r.parts.flatMap((p) => Array.from({ length: p.quantity }, (_, i) => `${p.id}#${i + 1}`)).sort();
  expect(r.placements.map((p) => `${p.partId}#${p.copy}`).sort(), `${context} every piece placed once`).toEqual(expected);

  for (const place of r.placements) {
    const p = r.parts.find((x) => x.id === place.partId)!;
    const asPlaced = [place.sizeX, place.sizeY, place.sizeZ].sort((a, b) => a - b);
    const asCut = [p.thickness, p.length, p.width].sort((a, b) => a - b);
    expect(asPlaced, `${context} ${p.name} is placed at its cut size`).toEqual(asCut);
    expect(Math.min(place.x, place.y, place.z), `${context} ${p.name} is inside the room`).toBeGreaterThanOrEqual(0);
    expect(place.x + place.sizeX, `${context} ${p.name} stays within the cabinet width`).toBeLessThanOrEqual(r.overall!.frameWidth);
  }

  // No two pieces may occupy the same space. The one exception is a centre
  // panel, which sits in a groove cut into the frame pieces around it.
  const inGroove = (a: string, b: string) => {
    const [na, nb] = [name(r, a), name(r, b)];
    const same = na.split(':')[0] === nb.split(':')[0];
    return same && (na.endsWith('centre panel') || nb.endsWith('centre panel'));
  };
  r.placements.forEach((a, i) => {
    for (const b of r.placements.slice(i + 1)) {
      if (inGroove(a.partId, b.partId)) continue;
      expect(overlap(a, b), `${context} ${name(r, a.partId)} #${a.copy} and ${name(r, b.partId)} #${b.copy} share space`).toBe(false);
    }
  });
}

const placed = (r: PlanResult, partName: string) => r.placements.filter((p) => p.partId === part(r, partName).id);

describe('where every piece sits (rule A0)', () => {
  it('places every piece once, at its cut size, without any two sharing space', () => {
    checkPlacements(result);
    expect(result.placements).toHaveLength(95);
  });

  it('stays valid for other sizes, end conditions and plywood thicknesses', () => {
    checkPlacements(plan(vanityWith({ width: '72 1/2', depth: '22', height: '34 1/2' })), 'larger:');
    checkPlacements(plan(vanityWith({ width: '40', depth: '18' })), 'smaller:');
    checkPlacements(plan(vanityWith({}, { ends: { left: userChoice('exposed') } })), 'both open:');
    checkPlacements(plan(vanityWith({}, { ends: { right: userChoice('wall') } })), 'both walls:');
    checkPlacements(plan(vanityWith({}, { measuredThickness: { 'oak-ply-3-4': userEntered('23/32') } })), 'thin plywood:');
    checkPlacements(plan(vanityWith({}, { layout: proposedVanityLayout.slice(1, 3) })), 'two doors:');
    checkPlacements(plan(vanityWith({}, { layout: [proposedVanityLayout[0]!, proposedVanityLayout[3]!] })), 'two drawer columns:');
  });

  it('sets the box on the platform and the face frame at the entered depth', () => {
    const side = placed(result, 'Left side')[0]!;
    expect(side).toMatchObject({ x: inches('1/4'), y: inches('3 1/2'), z: 0, sizeY: inches('30'), sizeZ: inches('20 1/4') });
    const frame = placed(result, 'Vertical frame piece (end)');
    expect(frame.map((f) => f.x)).toEqual([0, inches('58 1/2')]);
    expect(frame[0]!.z + frame[0]!.sizeZ).toBe(inches('21'));
    // The top of the box is the platform plus the entered height.
    expect(side.y + side.sizeY).toBe(inches('33 1/2'));
  });

  it('keeps the exposed right end flush and the wall end overhanging by 1/4"', () => {
    const right = placed(result, 'Right side')[0]!;
    expect(right.x + right.sizeX).toBe(inches('60'));
    expect(placed(result, 'Left side')[0]!.x).toBe(inches('1/4'));
  });

  it('puts each divider flush with the opening on the drawer side (rule B5)', () => {
    const dividers = placed(result, 'Interior divider');
    const leftOpening = result.openings.find((o) => o.bayId === 'left-drawers')!;
    const rightOpening = result.openings.find((o) => o.bayId === 'right-drawers')!;
    expect(dividers[0]!.x).toBe(leftOpening.left + leftOpening.width.result);
    expect(dividers[1]!.x + dividers[1]!.sizeX).toBe(rightOpening.left);
  });

  it('centres each drawer box between its slides, clear of the opening edges (rule X6)', () => {
    for (const opening of result.openings.filter((o) => o.kind === 'drawer')) {
      const sides = result.placements.filter((p) => name(result, p.partId) === `${opening.label}: box side`);
      const left = Math.min(...sides.map((s) => s.x));
      const right = Math.max(...sides.map((s) => s.x + s.sizeX));
      expect(left - opening.left, opening.label).toBe(inches('1/2'));
      expect(opening.left + opening.width.result - right, opening.label).toBe(inches('1/2'));
      // Front of the box is flush with the front of the face frame.
      expect(Math.max(...sides.map((s) => s.z + s.sizeZ))).toBe(inches('21'));
    }
  });

  it('sets the platform back by the toe space at the front and the exposed end (rule P1)', () => {
    const kick = placed(result, 'Toe kick (front)')[0]!;
    expect(kick.z + kick.sizeZ).toBe(inches('21') - inches('3'));
    expect(kick.x + kick.sizeX).toBe(inches('60') - inches('3'));
    const supports = placed(result, 'Platform cross support');
    // Ends, plus one every 16" from the left end.
    expect(supports.map((s) => s.x - supports[0]!.x)).toEqual(['0', '15 1/4', '31 1/4', '47 1/4', '54 1/2'].map((v) => (v === '0' ? 0 : inches(v))));
  });
});

describe('platform cross supports at every width (rule P3)', () => {
  it('never touch each other, and never leave a gap wider than 16" plus two 2x4 thicknesses', () => {
    const thickness = inches('1 1/2');
    for (let half = 30 * 2; half <= 96 * 2; half += 1) {
      const width = half % 2 === 0 ? `${half / 2}` : `${(half - 1) / 2} 1/2`;
      const r = plan(vanityWith({ width }));
      if (!r.canGeneratePlan) continue;
      const xs = placed(r, 'Platform cross support').map((p) => p.x).sort((a, b) => a - b);
      expect(xs.length, width).toBe(part(r, 'Platform cross support').quantity);
      for (let i = 1; i < xs.length; i += 1) {
        const clearGap = xs[i]! - xs[i - 1]! - thickness;
        expect(clearGap, `${width}: supports ${i} and ${i + 1}`).toBeGreaterThanOrEqual(thickness);
        expect(clearGap, `${width}: supports ${i} and ${i + 1}`).toBeLessThanOrEqual(inches('16') + 2 * thickness);
      }
    }
  });
});

describe('assembly steps (section A)', () => {
  const steps = result.steps;
  const step = (id: string, r: PlanResult = result) => r.steps.find((s) => s.id === id)!;
  const ids = (r: PlanResult = result) => r.steps.map((s) => s.id);

  it('breaks the build into many small steps, in building order', () => {
    expect(ids()).toEqual([
      'platformEnds', 'platformMiddle',
      'boxLeft', 'boxRight', 'dividers', 'topSupports', 'mountingStrips', 'back',
      'frameOuter', 'frameInner', 'frameDrawerRails', 'frameOn',
      'spacers',
      'drawerBox1', 'drawerBottom1', 'drawerBox2', 'drawerBottom2',
      'frontFrame1', 'frontRecess1', 'frontPanel1', 'frontFrame2', 'frontRecess2', 'frontPanel2',
      'sand', 'finish', 'topcoat',
      'plumbing', 'setPlatform', 'setBox', 'wallScrews', 'toeKickReturn', 'toeKick',
      'slidesCabinet', 'slidesDrawers', 'drawerFronts',
      'hinges', 'hangDoors', 'handles',
    ]);
    expect(steps.map((s) => s.number)).toEqual(steps.map((_, i) => i + 1));
  });

  it('uses every part in at least one step, and only pieces that exist', () => {
    const partIds = new Set(result.parts.map((p) => p.id));
    const used = new Set(steps.flatMap((s) => s.partIds));
    expect([...partIds].filter((id) => !used.has(id)).map((id) => name(result, id))).toEqual([]);
    const pieces = new Set(result.placements.map((p) => `${p.partId}#${p.copy}`));
    for (const s of steps) {
      expect(s.pieces.length, s.id).toBeGreaterThan(0);
      for (const piece of [...s.pieces, ...s.earlierPieces]) expect(pieces.has(`${piece.partId}#${piece.copy}`), s.id).toBe(true);
    }
  });

  it('shows earlier pieces muted, and never a piece as both new and earlier', () => {
    for (const s of steps) {
      const now = new Set(s.pieces.map((p) => `${p.partId}#${p.copy}`));
      expect(s.earlierPieces.filter((p) => now.has(`${p.partId}#${p.copy}`)), s.id).toEqual([]);
    }
    // In the cabinet, what was fixed in place stays in the picture.
    expect(step('boxRight').earlierPieces.map((p) => name(result, p.partId)).sort()).toEqual(['Bottom', 'Left side']);
    // A sub-assembly is drawn on its own: the face frame starts with nothing around it.
    expect(step('frameOuter')).toMatchObject({ scene: 'bench', earlierPieces: [] });
    expect(step('frameInner').earlierPieces).toHaveLength(4);
  });

  it('adds each piece to the cabinet only when it is installed', () => {
    const firstCabinetStep = (partName: string) => steps.find((s) => s.scene === 'cabinet' && s.pieces.some((p) => name(result, p.partId) === partName))!.id;
    expect(firstCabinetStep('Top frame piece')).toBe('frameOn');
    expect(firstCabinetStep('Left drawers, drawer 1: box side')).toBe('slidesDrawers');
    expect(firstCabinetStep('Left door: door upright')).toBe('hangDoors');
    expect(firstCabinetStep('Platform cross support')).toBe('setPlatform');
  });

  it('says which way each new piece arrives', () => {
    const arrives = (id: string) => [...new Set(step(id).pieces.map((p) => `${name(result, p.partId)}: ${p.from}`))];
    expect(arrives('boxLeft')).toEqual(['Bottom: none', 'Left side: left']);
    expect(arrives('boxRight')).toEqual(['Right side: right']);
    expect(arrives('back')).toEqual(['Back: back']);
    expect(step('frameOn').pieces.every((p) => p.from === 'front')).toBe(true);
    expect(arrives('toeKickReturn')).toEqual(['Toe kick (end return): right']);
    // Spacers go on from inside the cabinet: the wall-side ones travel left, towards the wall side.
    expect(arrives('spacers')).toEqual(['Slide spacer (left drawers, wall side): right', 'Slide spacer (right drawers, right side): left']);
  });

  it('builds one drawer box and one door of each size, and says how many to make', () => {
    expect(step('drawerBox1')).toMatchObject({ repeat: 4, scene: 'bench' });
    expect(step('drawerBox2').repeat).toBe(2);
    expect(step('frontFrame1').repeat).toBe(2);
    // The picture shows one; the step still accounts for the parts of all four.
    expect(step('drawerBox1').pieces).toHaveLength(4);
    expect(step('drawerBox1').partIds).toHaveLength(8);
  });

  it('puts no pocket hole on the outside face of an exposed side (rule J2)', () => {
    const face = (r: PlanResult, sideName: string) => step('frameOn', r).joints.find((j) => j.through === part(r, sideName).id)!.face;
    expect(face(result, 'Right side')).toBe('inside face'); // exposed
    expect(face(result, 'Left side')).toBe('outside face'); // against the wall, never seen
    const flipped = plan(vanityWith({}, { ends: { left: userChoice('exposed'), right: userChoice('wall') } }));
    expect([face(flipped, 'Left side'), face(flipped, 'Right side')]).toEqual(['inside face', 'outside face']);
    // The sides are joined to the bottom from underneath, never through their own faces.
    expect(step('boxLeft').joints).toEqual([{ method: 'pocketScrews', face: 'underside', through: part(result, 'Bottom').id, into: [part(result, 'Left side').id] }]);
    expect(step('boxRight').joints).toEqual([{ method: 'pocketScrews', face: 'underside', through: part(result, 'Bottom').id, into: [part(result, 'Right side').id] }]);
  });

  it('puts divider pocket holes on the drawer side (rule J3)', () => {
    expect(step('dividers').joints.map((j) => j.face)).toEqual(['drawer side']);
  });

  it('shows glue where the new pieces meet the others (rule J4)', () => {
    // The left side meets the end of the bottom: one strip as long as the bottom is deep, as wide as the plywood is thick.
    expect(step('boxLeft').glue).toEqual([{ x: inches('1'), y: inches('3 1/2'), z: inches('1/4'), sizeX: 0, sizeY: inches('3/4'), sizeZ: inches('20') }]);
    expect(step('back').glue.length).toBeGreaterThan(3);
    // Screws alone hold the platform; no glue is shown.
    expect(step('platformEnds').glue).toEqual([]);
    for (const s of steps) {
      for (const g of s.glue) expect([g.sizeX, g.sizeY, g.sizeZ].filter((n) => n === 0), s.id).toHaveLength(1);
    }
  });

  it('places screws along each joint: near both ends and never more than 8" apart (rule J4)', () => {
    // A 20" joint: 2" from each end and one between.
    expect(step('boxLeft').screws.map((p) => p.z - inches('1/4'))).toEqual([inches('2'), inches('10'), inches('18')]);
    // A 30" joint between a side panel and the frame: five screws, 6 1/2" apart.
    const sideToFrame = step('frameOn').screws.filter((p) => p.x < inches('2'));
    expect(sideToFrame.map((p) => p.y - inches('3 1/2'))).toEqual([inches('2'), inches('8 1/2'), inches('15'), inches('21 1/2'), inches('28')]);
    // A 1 1/2" frame joint is too short for two: one screw in the middle.
    expect(step('frameOuter').screws).toHaveLength(4);
    // A 3 1/2" joint takes two.
    expect(step('platformEnds').screws).toHaveLength(8);
  });

  it('counts the screws for the shopping list, by kind', () => {
    const count = (supplyId: string) => result.supplies.find((s) => s.id === supplyId)?.quantity;
    const fromSteps = (supplyId: string) => steps.flatMap((s) => s.fasteners).filter((f) => f.supplyId === supplyId).reduce((n, f) => n + f.quantity, 0);
    for (const id of ['pocket-screws-coarse', 'pocket-screws-fine', 'construction-screws', 'short-screws']) {
      expect(count(id), id).toBe(fromSteps(id));
      expect(count(id), id).toBeGreaterThan(0);
    }
    expect(count('construction-screws')).toBe(20);
    // Repeated steps count every copy: four small drawer boxes at eight screws each.
    expect(step('drawerBox1').fasteners).toEqual([{ supplyId: 'pocket-screws-coarse', quantity: 32 }]);
    // Fine thread only where the screw goes through solid oak.
    expect(step('frameOuter').fasteners).toEqual([{ supplyId: 'pocket-screws-fine', quantity: 4 }]);
    expect(step('boxLeft').fasteners).toEqual([{ supplyId: 'pocket-screws-coarse', quantity: 3 }]);
    expect(result.supplies.find((s) => s.id === 'wood-glue')?.quantity).toBeUndefined();
  });

  it('names the tools each step needs', () => {
    expect(step('boxLeft').tools).toEqual(expect.arrayContaining(['pocketHoleJig', 'drill', 'clamps', 'glue']));
    expect(step('back').tools).toEqual(expect.arrayContaining(['glue', 'hammer']));
    expect(step('frontRecess1').tools).toEqual(['router']);
    expect(step('plumbing').tools).toContain('jigsaw');
    expect(step('sand').tools).toEqual(['sandingBlock']);
    for (const s of steps) expect(s.tools.length, s.id).toBeGreaterThan(0);
  });

  it('hands out all the hardware, and no more, across the steps', () => {
    const used = steps.flatMap((s) => s.hardware).map((h) => [h.hardwareId, h.quantity, h.unit]);
    expect(used).toEqual(result.hardware.map((h) => [h.hardwareId, h.quantity, h.unit]));
  });

  it('quotes sizes that come from the plan', () => {
    expect(step('slidesDrawers').values).toMatchObject({ slideLength: inches('18'), lift: inches('1/4'), drawers: 6 });
    expect(step('platformMiddle').values).toMatchObject({ supports: 3, spacing: inches('16') });
    expect(step('frameOn').values).toMatchObject({ overhang: inches('1/4'), wallEnds: 1 });
    expect(step('frontRecess1').values).toMatchObject({ recess: inches('3/8'), panelThickness: inches('1/4') });
  });

  it('includes sanding, finishing and handles', () => {
    expect(ids()).toEqual(expect.arrayContaining(['sand', 'finish', 'topcoat', 'handles']));
    expect(ids().indexOf('topcoat')).toBeLessThan(ids().indexOf('setPlatform'));
  });

  it('leaves out drawer steps for a cabinet with only doors, and door steps for one with only drawers', () => {
    const doorsOnly = ids(plan(vanityWith({}, { layout: proposedVanityLayout.slice(1, 3) })));
    for (const absent of ['dividers', 'spacers', 'drawerBox1', 'slidesCabinet', 'slidesDrawers', 'drawerFronts']) expect(doorsOnly).not.toContain(absent);
    expect(doorsOnly).toEqual(expect.arrayContaining(['frontFrame1', 'hinges', 'hangDoors', 'plumbing']));
    const drawersOnly = ids(plan(vanityWith({}, { layout: [proposedVanityLayout[0]!, proposedVanityLayout[3]!] })));
    expect(drawersOnly).not.toContain('hangDoors');
    expect(drawersOnly).toContain('slidesDrawers');
  });

  it('produces no steps or positions while an error blocks the plan', () => {
    expect(plan(vanityWith({ depth: '12' }))).toMatchObject({ steps: [], placements: [], supplies: [] });
  });
});

describe('layouts she can choose (rules L0-L3)', () => {
  const withLayout = (choices: readonly BayChoice[], width = '60') => plan(vanityWith({ width }, { layout: layoutFrom(choices) }));

  it('gives the same sizes as the proposed layout when the same choices are made', () => {
    expect(choicesOf(proposedVanityLayout)).toEqual([3, 'door', 'door', 3]);
    const same = withLayout([3, 'door', 'door', 3]);
    expect(same.parts.map((p) => [p.id, p.length, p.width, p.quantity])).toEqual(result.parts.map((p) => [p.id, p.length, p.width, p.quantity]));
  });

  it('builds a sound cabinet for every sensible mix of doors and drawers', () => {
    const layouts: [BayChoice[], string][] = [
      [['door'], '24'],
      [['door', 'door'], '36'],
      [[2, 'door'], '36'],
      [['door', 3], '36'],
      [[1, 'door', 'door', 1], '60'],
      [[4, 'door', 'door', 4], '60'],
      [[3, 3, 3], '48'],
      [['door', 2, 'door'], '54'],
      [[3, 'door', 'door', 'door', 3], '84'],
    ];
    for (const [choices, width] of layouts) {
      const r = withLayout(choices, width);
      const context = `${choices.join(',')} at ${width}":`;
      checkPlacements(r, context);
      // Frame pieces and openings fill the width exactly.
      const widths = r.openings.filter((o, i, all) => all.findIndex((x) => x.bayId === o.bayId) === i).map((o) => o.width.result);
      expect((choices.length + 1) * inches('1 1/2') + widths.reduce((a, b) => a + b, 0), context).toBe(inches(width));
      expect(r.openings.filter((o) => o.kind === 'door'), context).toHaveLength(choices.filter((c) => c === 'door').length);
      expect(r.openings.filter((o) => o.kind === 'drawer'), context).toHaveLength(choices.reduce<number>((n, c) => n + (c === 'door' ? 0 : c), 0));
      expect(r.cutDiagrams.flatMap((d) => d.pieces), context).toHaveLength(r.placements.length);
    }
  });

  it('names the bays of a chosen layout by what they are', () => {
    const r = withLayout(['door', 2, 'door'], '54');
    expect([...new Set(r.openings.map((o) => o.label))]).toEqual(['Door 1', 'Drawers 1, drawer 1', 'Drawers 1, drawer 2', 'Door 2']);
  });

  it('puts a spacer on the divider side when two drawer columns sit next to each other (rule B8)', () => {
    const r = withLayout([3, 3, 3], '48');
    expect(r.parts.filter((p) => p.name.includes('divider side')).map((p) => p.name)).toEqual(['Slide spacer (drawers 2, divider side)', 'Slide spacer (drawers 3, divider side)']);
  });

  it('explains why a layout with too many bays cannot be built', () => {
    const r = withLayout(['door', 'door', 'door', 'door', 'door', 'door'], '40');
    expect(r.canGeneratePlan).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('FRAMED_FRONT_TOO_SMALL');
  });
});

// ---------------------------------------------------------------------------
// Tools and the methods they allow (rules T1-T8)
// ---------------------------------------------------------------------------

const ticks = (changes: Partial<Record<ToolId, boolean>>): Overrides<VanityOptions> => ({
  tools: Object.fromEntries(Object.entries(changes).map(([id, value]) => [id, userChoice(value)])),
});
const withTools = (changes: Partial<Record<ToolId, boolean>>, more: Overrides<VanityOptions> = {}) => plan(vanityWith({}, { ...ticks(changes), ...more }));
const tool = (r: PlanResult, id: string) => r.tools.find((t) => t.id === id);
const sizeOf = (r: PlanResult, partName: string) => [part(r, partName).length, part(r, partName).width];

describe('tools for this plan (rules T1, T2)', () => {
  it('needs nothing bought or borrowed with the default ticks', () => {
    // Her own list has no clamps, so the plan asks for them and nothing else.
    expect(result.tools.filter((t) => t.status === 'buyOrBorrow').map((t) => t.id)).toEqual(['clamps']);
    expect(result.issues.map((i) => [i.severity, i.code, i.inputPaths])).toEqual([['info', 'TOOL_TO_BUY_OR_BORROW', ['tools.clamps']]]);
    expect(result.methods).toEqual({ solidWidths: 'boardsAsSold', sheetSaw: 'circularSaw', boardSaw: 'mitreSaw', panel: 'routedRecess', nailing: 'hammer', sanding: 'sandingBlock', cutouts: 'jigsaw' });
  });

  it('lists the tools the chosen methods use, and not the ones they do not', () => {
    const ids = result.tools.filter((t) => t.kind === 'tool' && t.status !== 'optional').map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['measuring', 'clamps', 'drill', 'pocketHoleJig', 'circularSaw', 'mitreSaw', 'jigsaw', 'router', 'hammer', 'sandingBlock']));
    for (const unused of ['tableSaw', 'trackSaw', 'holeSaw', 'bradNailer', 'sander']) expect(ids).not.toContain(unused);
    for (const t of result.tools) expect(t.usedFor.length, t.name).toBeGreaterThan(0);
  });

  it('lists safety glasses, ear protection and a dust mask as required on every plan', () => {
    for (const r of [result, withTools({ router: false, bradNailer: false }), plan(vanityWith({ width: '24' }, { layout: layoutFrom(['door']) }))]) {
      expect(r.canGeneratePlan).toBe(true);
      expect(r.tools.filter((t) => t.kind === 'safety').map((t) => [t.id, t.status])).toEqual([
        ['safetyGlasses', 'required'],
        ['earProtection', 'required'],
        ['dustMask', 'required'],
      ]);
    }
  });

  it('says to buy or borrow a missing pocket-hole jig, and keeps the joints the same (rule T6)', () => {
    const r = withTools({ pocketHoleJig: false });
    expect(r.canGeneratePlan).toBe(true);
    expect(tool(r, 'pocketHoleJig')?.status).toBe('buyOrBorrow');
    expect(r.issues.map((i) => [i.severity, i.code, i.inputPaths])).toContainEqual(['info', 'TOOL_TO_BUY_OR_BORROW', ['tools.pocketHoleJig']]);
    expect(r.steps.map((s) => s.joints)).toEqual(result.steps.map((s) => s.joints));
  });

  it('names the hinge-boring bit whenever there are doors', () => {
    expect(tool(result, 'bit-hinge')).toMatchObject({ kind: 'bit', status: 'required' });
    const drawersOnly = plan(vanityWith({}, { layout: layoutFrom([3, 3]) }));
    expect(tool(drawersOnly, 'bit-hinge')).toBeUndefined();
  });

  it('uses the powered tools when they are ticked, changing no part (rule T7)', () => {
    const r = withTools({ bradNailer: true, sander: true, mitreSaw: false });
    expect(r.methods).toMatchObject({ nailing: 'bradNailer', sanding: 'sander', boardSaw: 'circularSaw' });
    expect(r.tools.map((t) => t.id)).toEqual(expect.arrayContaining(['bradNailer', 'sander']));
    expect(r.tools.map((t) => t.id)).not.toContain('hammer');
    expect(r.parts).toEqual(result.parts);
    expect(problems(r)).toEqual([]);
  });
});

describe('solid wood widths and a table saw (rule T3)', () => {
  const narrowRail: Overrides<VanityOptions> = { faceFrame: { topRailWidth: userEntered('1 1/4') } };

  it('keeps the board-as-sold widths as defaults when a table saw is ticked', () => {
    const r = withTools({ tableSaw: true });
    expect(r.methods?.solidWidths).toBe('anyWidth');
    expect(r.parts).toEqual(result.parts);
  });

  it('drops the lengthwise-cut warning only when a table saw is ticked', () => {
    expect(problems(plan(vanityWith({}, narrowRail))).map((i) => i.code)).toEqual(['NEEDS_LENGTHWISE_CUT']);
    expect(problems(withTools({ tableSaw: true }, narrowRail))).toEqual([]);
  });
});

describe('framed fronts: how the panel is held (rule T5)', () => {
  it('routs a recess after assembly by default when a router is ticked (rule D9)', () => {
    expect(result.methods?.panel).toBe('routedRecess');
    const panel = part(result, 'Left door: door centre panel');
    expect(panel.derivation.length.ruleId).toBe('D9');
    expect(panel.derivation.length.formula).toContain('recess width');
    // Front 14 1/8" x 28", frame 2 1/2", recess 3/8", clearance 1/8".
    expect([panel.width, panel.length]).toEqual([inches('9 3/4'), inches('23 5/8')]);
    // The panel is let into the back of the frame, flush with it.
    const placedPanel = placed(result, 'Left door: door centre panel')[0]!;
    expect(placedPanel.z).toBe(inches('21'));
    expect(result.steps.filter((s) => s.chapter === 'fronts').map((s) => s.templateId).slice(0, 3)).toEqual(['frontFrame', 'frontRecess', 'frontPanelRecess']);
  });

  it('follows a changed recess width', () => {
    const r = plan(vanityWith({}, { fronts: { panelRecessWidth: userEntered('1/2') } }));
    expect(sizeOf(r, 'Left door: door centre panel')).toEqual([inches('23 7/8'), inches('10')]);
    expect(tool(r, 'bit-recess')?.cut).toMatchObject({ width: inches('1/2') });
  });

  it('keeps the stopped groove as a choice she can make (rule D5)', () => {
    const r = plan(vanityWith({}, { fronts: { panelMethod: userChoice('stoppedGroove') } }));
    expect(r.methods?.panel).toBe('stoppedGroove');
    expect(part(r, 'Left door: door centre panel').derivation.length.ruleId).toBe('D5');
    expect(r.steps.filter((s) => s.chapter === 'fronts').map((s) => s.templateId).slice(0, 2)).toEqual(['frontGrooveRouter', 'frontFrameWithPanel']);
    // Centred in the thickness of the frame, not on its back.
    expect(placed(r, 'Left door: door centre panel')[0]!.z).toBe(inches('21') + inches('1/4'));
    checkPlacements(r, 'stopped groove:');
  });

  it('names the exact router bit, cut to the measured panel thickness', () => {
    expect(tool(result, 'bit-recess')).toMatchObject({ kind: 'bit', status: 'required', cut: { kind: 'recess', width: inches('3/8'), depth: inches('1/4') } });
    const thin = plan(vanityWith({}, { measuredThickness: { 'oak-ply-1-4': userEntered('7/32') } }));
    expect(tool(thin, 'bit-recess')?.cut).toEqual({ kind: 'recess', width: inches('3/8'), depth: inches('7/32') });
    const groove = plan(vanityWith({}, { fronts: { panelMethod: userChoice('stoppedGroove') }, measuredThickness: { 'oak-ply-1-4': userEntered('7/32') } }));
    expect(tool(groove, 'bit-groove')?.cut).toEqual({ kind: 'groove', width: inches('7/32'), depth: inches('3/8') });
    expect(tool(groove, 'bit-recess')).toBeUndefined();
    // The panel thickness it follows is one of the things to check before cutting.
    expect(result.inputs.find((i) => i.path === 'measuredThickness.oak-ply-1-4')?.checkAt).toBe('cutting');
  });

  it('asks for a router when she chooses the groove without one', () => {
    const r = withTools({ router: false }, { fronts: { panelMethod: userChoice('stoppedGroove') } });
    expect(r.canGeneratePlan).toBe(true);
    expect(tool(r, 'router')?.status).toBe('buyOrBorrow');
  });

  it('cuts the groove on the table saw when there is one and no router, with the same sizes', () => {
    const r = withTools({ router: false, tableSaw: true });
    expect(r.methods?.panel).toBe('sawnGroove');
    expect(sizeOf(r, 'Left door: door centre panel')).toEqual(sizeOf(result, 'Left door: door centre panel'));
    expect(tool(r, 'tableSaw')?.status).toBe('have');
    expect(r.tools.some((t) => t.id.startsWith('bit-re') || t.id === 'bit-groove')).toBe(false);
  });
});

describe('panel on the back, with neither router nor table saw (rules D8, D10)', () => {
  const r = withTools({ router: false });
  const gap = inches('1/2') + inches('1/4'); // overlay plus the gap kept from the face frame
  const hingeSpace = inches('1 3/4');

  it('is chosen automatically and needs no extra tool', () => {
    expect(r.methods?.panel).toBe('panelOnBack');
    expect(problems(r)).toEqual([]);
    expect(r.tools.filter((t) => t.status !== 'optional').map((t) => t.id)).not.toContain('router');
    expect(r.steps.filter((s) => s.chapter === 'fronts').map((s) => s.templateId).slice(0, 2)).toEqual(['frontFrame', 'frontPanelOnBack']);
  });

  it('sizes the panel from the front, the gap and the hinge space', () => {
    // Door front 14 1/8" x 28".
    expect([part(r, 'Left door: door centre panel').width, part(r, 'Left door: door centre panel').length]).toEqual([inches('14 1/8') - hingeSpace - gap, inches('28') - 2 * gap]);
    // Large drawer front 14 1/8" x 16": no hinges, so the same gap all round.
    expect(sizeOf(r, 'Left drawers, drawer 3: drawer front centre panel')).toEqual([inches('14 1/8') - 2 * gap, inches('16') - 2 * gap]);
    expect(part(r, 'Left door: door centre panel').derivation.length.ruleId).toBe('D10');
  });

  it('always leaves the hinges a clear place to mount (rule D8)', () => {
    const variants = [
      r,
      withTools({ router: false }, { fronts: { overlay: userEntered('1/2'), panelBackClearance: userEntered('1/8') } }),
      plan(vanityWith({ width: '72', height: '34' }, ticks({ router: false }))),
      plan(vanityWith({ width: '48' }, { ...ticks({ router: false }), layout: layoutFrom(['door', 'door', 'door']) })),
    ];
    for (const v of variants) {
      expect(v.canGeneratePlan).toBe(true);
      const doors = v.openings.filter((o) => o.kind === 'door');
      expect(doors.length).toBeGreaterThan(0);
      for (const door of doors) {
        const panel = v.placements.find((p) => v.parts.find((x) => x.id === p.partId)!.name === `${door.label}: door centre panel`)!;
        const doorLeft = door.frontLeft;
        const doorRight = door.frontLeft + door.frontWidth;
        // The strip of solid wood the hinge needs, along the hinge edge of the door.
        if (door.hingeSide === 'left') expect(panel.x, door.label).toBeGreaterThanOrEqual(doorLeft + hingeSpace);
        else expect(panel.x + panel.sizeX, door.label).toBeLessThanOrEqual(doorRight - hingeSpace);
        // The panel sits inside the opening, clear of the face frame on every side.
        expect(panel.x, door.label).toBeGreaterThan(door.left);
        expect(panel.x + panel.sizeX, door.label).toBeLessThan(door.left + door.width.result);
        // And it still has frame to be glued to.
        const lapHinge = door.hingeSide === 'left' ? doorLeft + inches('2 1/2') - panel.x : panel.x + panel.sizeX - (doorRight - inches('2 1/2'));
        expect(lapHinge, door.label).toBeGreaterThanOrEqual(inches('3/8'));
      }
    }
  });

  it('puts the hinges on opposite edges of neighbouring doors', () => {
    expect(r.openings.filter((o) => o.kind === 'door').map((o) => o.hingeSide)).toEqual(['left', 'right']);
  });

  it('refuses frame pieces too narrow to hold both the hinge and the panel', () => {
    const narrow = withTools({ router: false }, { fronts: { shakerFrameWidth: userEntered('2') } });
    expect(narrow.issues.filter((i) => i.severity === 'error').map((i) => i.code)).toContain('PANEL_HAS_NOTHING_TO_GLUE_TO');
    expect(narrow.issues.find((i) => i.code === 'PANEL_HAS_NOTHING_TO_GLUE_TO')!.explanation).toContain('room for the hinges');
  });

  it('refuses a recess or groove that would reach into the hinge space', () => {
    const narrow = plan(vanityWith({}, { fronts: { shakerFrameWidth: userEntered('2') } }));
    expect(narrow.issues.filter((i) => i.severity === 'error').map((i) => i.code)).toContain('HINGE_HAS_NO_CLEAR_PLACE');
  });

  it('sets every drawer box back by the panel thickness so the panel has room', () => {
    for (const opening of r.openings.filter((o) => o.kind === 'drawer')) {
      const sides = r.placements.filter((p) => name(r, p.partId) === `${opening.label}: box side`);
      expect(Math.max(...sides.map((s) => s.z + s.sizeZ)), opening.label).toBe(inches('21') - inches('1/4'));
    }
    expect(r.steps.find((s) => s.id === 'slidesDrawers')!.values.setback).toBe(inches('1/4'));
    expect(result.steps.find((s) => s.id === 'slidesDrawers')!.values.setback).toBe(0);
  });

  it('still fits together with no two pieces sharing space', () => {
    checkPlacements(r, 'panel on back:');
    checkPlacements(plan(vanityWith({ width: '48' }, { ...ticks({ router: false }), layout: layoutFrom(['door', 3, 'door']) })), 'panel on back, door-drawers-door:');
  });
});

describe('plumbing openings (rule A8)', () => {
  it('adds the step before the cabinet goes against the wall', () => {
    const ids = result.steps.map((s) => s.id);
    expect(ids.indexOf('plumbing')).toBe(ids.indexOf('setPlatform') - 1);
    expect(result.steps.find((s) => s.id === 'plumbing')!.partIds).toEqual([part(result, 'Back').id]);
  });

  it('uses the hole saw when there is one, the jigsaw otherwise', () => {
    expect(result.steps.find((s) => s.id === 'plumbing')!.templateId).toBe('plumbingJigsaw');
    const withHoleSaw = withTools({ holeSaw: true });
    expect(withHoleSaw.steps.find((s) => s.id === 'plumbing')!.templateId).toBe('plumbingHoleSaw');
    expect(tool(withHoleSaw, 'holeSaw')?.status).toBe('have');
    expect(tool(withHoleSaw, 'jigsaw')).toBeUndefined();
  });

  it('asks for a jigsaw when she has neither', () => {
    const neither = withTools({ jigsaw: false });
    expect(tool(neither, 'jigsaw')?.status).toBe('buyOrBorrow');
    expect(neither.canGeneratePlan).toBe(true);
  });
});

describe('breaking down plywood with a track saw (rule T4)', () => {
  const template = part(result, 'Bottom');
  const piece = (id: string, length: string): Part => ({ ...template, id: id as Part['id'], name: id, length: inches(length), width: inches('10'), quantity: 1 });
  // Six pieces whose lengths pair up to fill a sheet end to end, but which need
  // more than one sheet if the sheet is first cut into sections.
  const parts = [piece('P01', '60'), piece('P02', '55'), piece('P03', '50'), piece('P04', '45'), piece('P05', '40'), piece('P06', '35')];
  const options = { kerf: inches('1/8'), keepOffcutsFrom: inches('6'), sheetSaw: 'circularSaw', boardSaw: 'mitreSaw' } as const;
  const sectionsFirst = cutDiagrams(parts, defaultCatalog, { ...options, allowLongCutsFirst: false });
  const withTrackSaw = cutDiagrams(parts, defaultCatalog, { ...options, allowLongCutsFirst: true });

  it('makes long cuts first when that saves a sheet', () => {
    expect(sectionsFirst.map((d) => d.order)).toEqual(['sectionsFirst', 'sectionsFirst']);
    expect(withTrackSaw.map((d) => d.order)).toEqual(['longCutsFirst']);
  });

  it('cuts full-length strips from the sheet, then each strip to length, with room for the blade', () => {
    const d = withTrackSaw[0]!;
    expect(d.steps.some((s) => s.kind === 'section')).toBe(false);
    expect(d.steps.filter((s) => s.kind === 'strip').every((s) => s.from === 'the sheet')).toBe(true);
    expect(d.pieces).toHaveLength(6);
    d.pieces.forEach((a, i) => {
      expect(a.fromEnd + a.along).toBeLessThanOrEqual(d.stockLength);
      expect(a.fromEdge + a.across).toBeLessThanOrEqual(d.stockWidth);
      for (const b of d.pieces.slice(i + 1)) {
        const apart = a.fromEnd + a.along + options.kerf <= b.fromEnd || b.fromEnd + b.along + options.kerf <= a.fromEnd || a.fromEdge + a.across + options.kerf <= b.fromEdge || b.fromEdge + b.across + options.kerf <= a.fromEdge;
        expect(apart, `${a.partId} and ${b.partId}`).toBe(true);
      }
    });
  });

  it('keeps sections first on a tie, as for vanity 01', () => {
    const r = withTools({ trackSaw: true });
    expect(r.methods?.sheetSaw).toBe('trackSaw');
    expect(r.cutDiagrams.filter((d) => d.kind === 'sheet').map((d) => d.order)).toEqual(['sectionsFirst', 'sectionsFirst', 'sectionsFirst', 'sectionsFirst']);
    expect(r.materials).toEqual(result.materials);
    expect(tool(r, 'trackSaw')?.status).toBe('have');
    expect(tool(r, 'circularSaw')).toBeUndefined();
  });
});

describe('three approaches (rule T9)', () => {
  const approach = (value: 'useWhatIOwn' | 'easiest' | 'professional', changes: Partial<Record<ToolId, boolean>> = {}) =>
    plan(vanityWith({}, { ...ticks(changes), approach: userChoice(value) }));
  const toBuy = (r: PlanResult) => r.tools.filter((t) => t.status === 'buyOrBorrow').map((t) => t.id).sort();

  it('uses what she owns by default, buying as little as possible', () => {
    expect(result.inputs.find((i) => i.path === 'approach')).toMatchObject({ value: 'useWhatIOwn', origin: 'appDefault' });
    expect(approach('useWhatIOwn').parts).toEqual(result.parts);
    expect(approach('useWhatIOwn').methods).toEqual(result.methods);
    expect(toBuy(result)).toEqual(['clamps']);
  });

  it('picks the most forgiving methods for "easiest", whatever she owns', () => {
    const r = approach('easiest');
    expect(r.methods).toMatchObject({ panel: 'panelOnBack', cutouts: 'jigsaw', nailing: 'hammer', sanding: 'sandingBlock' });
    expect(toBuy(r)).toEqual(['clamps']);
    expect(approach('easiest', { holeSaw: true }).methods?.cutouts).toBe('jigsaw');
    checkPlacements(r, 'easiest:');
  });

  it('picks the neatest methods for "professional", and lists what to buy', () => {
    const r = approach('professional', { router: false });
    expect(r.methods).toMatchObject({ panel: 'routedRecess', cutouts: 'holeSaw', nailing: 'bradNailer', sanding: 'sander' });
    expect(toBuy(r)).toEqual(['bradNailer', 'clamps', 'holeSaw', 'router', 'sander']);
    expect(r.canGeneratePlan).toBe(true);
    expect(tool(r, 'bit-recess')).toBeDefined();
  });

  it('lets her own choice of panel method win over the approach', () => {
    const r = plan(vanityWith({}, { approach: userChoice('easiest'), fronts: { panelMethod: userChoice('stoppedGroove') } }));
    expect(r.methods?.panel).toBe('stoppedGroove');
  });

  it('lists tools that are optional: not needed, but they would help', () => {
    const optional = (r: PlanResult) => r.tools.filter((t) => t.status === 'optional').map((t) => t.id).sort();
    expect(optional(result)).toEqual(['bradNailer', 'holeSaw', 'sander']);
    expect(optional(approach('easiest', { router: false }))).toContain('router');
    expect(optional(approach('professional'))).toEqual([]);
    for (const t of result.tools.filter((x) => x.status === 'optional')) expect(t.usedFor[0]!.length).toBeGreaterThan(10);
  });
});

describe('cutting diagrams for the picture screen', () => {
  it('links every piece-cutting step to its piece in the picture', () => {
    for (const d of result.cutDiagrams) {
      const pieceSteps = d.steps.filter((s) => s.kind === 'piece');
      expect(pieceSteps.map((s) => s.pieceIndex).sort((a, b) => a! - b!), d.title).toEqual(d.pieces.map((_, i) => i));
      for (const s of pieceSteps) {
        expect(d.pieces[s.pieceIndex!]!.partId, d.title).toBe(s.partId);
        expect(d.pieces[s.pieceIndex!]!.along, d.title).toBe(s.measure);
      }
    }
  });

  it('names the saw for every sheet and board', () => {
    expect([...new Set(result.cutDiagrams.filter((d) => d.kind === 'sheet').map((d) => d.saw))]).toEqual(['circularSaw']);
    expect([...new Set(result.cutDiagrams.filter((d) => d.kind === 'board').map((d) => d.saw))]).toEqual(['mitreSaw']);
    const noMitre = withTools({ mitreSaw: false, trackSaw: true });
    expect([...new Set(noMitre.cutDiagrams.map((d) => d.saw))].sort()).toEqual(['circularSaw', 'trackSaw']);
  });
});
