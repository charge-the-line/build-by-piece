/**
 * Where every piece sits (rule A0) and the assembly steps (rules A1-A12,
 * J1-J3). The step pictures are drawn from these positions.
 */
import { describe, expect, it } from 'vitest';
import { choicesOf, layoutFrom, proposedVanityLayout, type BayChoice } from '../defaults/vanity';
import { userChoice, userEntered } from '../defaults/values';
import type { Placement, PlanResult } from '../types';
import { inches, part, plan, vanityWith } from './helpers';

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

describe('assembly steps (rules A1-A12)', () => {
  const steps = result.steps;

  it('lists the steps in building order', () => {
    expect(steps.map((s) => s.id)).toEqual(['platform', 'box', 'dividers', 'supports', 'back', 'faceFrame', 'spacers', 'drawerBoxes', 'fronts', 'install', 'drawers', 'doors']);
    expect(steps.map((s) => s.number)).toEqual(steps.map((_, i) => i + 1));
  });

  it('uses every part in at least one step, and only parts that exist', () => {
    const ids = new Set(result.parts.map((p) => p.id));
    const used = new Set(steps.flatMap((s) => s.partIds));
    expect([...ids].filter((id) => !used.has(id)).map((id) => name(result, id))).toEqual([]);
    expect([...used].every((id) => ids.has(id))).toBe(true);
    for (const joint of steps.flatMap((s) => s.joints)) {
      expect(ids.has(joint.through)).toBe(true);
      expect(joint.into.every((id) => ids.has(id))).toBe(true);
    }
  });

  it('mutes exactly the parts from earlier steps', () => {
    const seen = new Set<string>();
    for (const step of steps) {
      expect([...step.earlierPartIds].sort(), step.id).toEqual([...seen].filter((id) => !step.partIds.includes(id as never)).sort());
      expect(step.partIds.length, step.id).toBeGreaterThan(0);
      step.partIds.forEach((id) => seen.add(id));
    }
  });

  it('puts no pocket hole on the outside face of an exposed side (rule J2)', () => {
    const frameStep = steps.find((s) => s.id === 'faceFrame')!;
    const face = (sideName: string) => frameStep.joints.find((j) => j.through === part(result, sideName).id)!.face;
    expect(face('Right side')).toBe('inside face'); // exposed
    expect(face('Left side')).toBe('outside face'); // against the wall, never seen
    const flipped = plan(vanityWith({}, { ends: { left: userChoice('exposed'), right: userChoice('wall') } }));
    const flippedFace = (sideName: string) => flipped.steps.find((s) => s.id === 'faceFrame')!.joints.find((j) => j.through === part(flipped, sideName).id)!.face;
    expect([flippedFace('Left side'), flippedFace('Right side')]).toEqual(['inside face', 'outside face']);
    // The sides are joined to the bottom from underneath, never through their own faces.
    expect(steps.find((s) => s.id === 'box')!.joints).toEqual([{ method: 'pocketScrews', face: 'underside', through: part(result, 'Bottom').id, into: [part(result, 'Left side').id, part(result, 'Right side').id] }]);
  });

  it('puts divider pocket holes on the drawer side (rule J3)', () => {
    expect(steps.find((s) => s.id === 'dividers')!.joints.map((j) => j.face)).toEqual(['drawer side']);
  });

  it('hands out all the hardware, and no more, across the steps', () => {
    const used = steps.flatMap((s) => s.hardware).map((h) => [h.hardwareId, h.quantity, h.unit]);
    expect(used).toEqual(result.hardware.map((h) => [h.hardwareId, h.quantity, h.unit]));
  });

  it('quotes sizes that come from the plan', () => {
    expect(steps.find((s) => s.id === 'drawers')!.values).toMatchObject({ slideLength: inches('18'), lift: inches('1/4'), overlay: inches('1/2'), drawers: 6 });
    expect(steps.find((s) => s.id === 'platform')!.values).toMatchObject({ supports: 5, spacing: inches('16') });
    expect(steps.find((s) => s.id === 'faceFrame')!.values).toMatchObject({ overhang: inches('1/4'), wallEnds: 1 });
    expect(steps.find((s) => s.id === 'fronts')!.values).toMatchObject({ framed: 4, flat: 4, groove: inches('3/8') });
  });

  it('leaves out drawer steps for a cabinet with only doors, and door steps for one with only drawers', () => {
    const doorsOnly = plan(vanityWith({}, { layout: proposedVanityLayout.slice(1, 3) }));
    expect(doorsOnly.steps.map((s) => s.id)).toEqual(['platform', 'box', 'supports', 'back', 'faceFrame', 'fronts', 'install', 'doors']);
    const drawersOnly = plan(vanityWith({}, { layout: [proposedVanityLayout[0]!, proposedVanityLayout[3]!] }));
    expect(drawersOnly.steps.map((s) => s.id)).not.toContain('doors');
    expect(drawersOnly.steps.map((s) => s.id)).toContain('drawers');
  });

  it('produces no steps or positions while an error blocks the plan', () => {
    expect(plan(vanityWith({ depth: '12' }))).toMatchObject({ steps: [], placements: [] });
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
