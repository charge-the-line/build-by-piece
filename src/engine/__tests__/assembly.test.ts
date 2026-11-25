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
    expect(steps.map((s) => s.id)).toEqual(['platform', 'box', 'dividers', 'supports', 'back', 'faceFrame', 'spacers', 'drawerBoxes', 'fronts', 'plumbing', 'install', 'drawers', 'doors']);
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
    expect(doorsOnly.steps.map((s) => s.id)).toEqual(['platform', 'box', 'supports', 'back', 'faceFrame', 'fronts', 'plumbing', 'install', 'doors']);
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
    expect(result.tools.filter((t) => t.status === 'buyOrBorrow')).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.methods).toEqual({ solidWidths: 'boardsAsSold', sheetSaw: 'circularSaw', boardSaw: 'mitreSaw', panel: 'routedRecess', nailing: 'bradNailer', sanding: 'sander', cutouts: 'jigsaw' });
  });

  it('lists the tools the chosen methods use, and not the ones they do not', () => {
    const ids = result.tools.filter((t) => t.kind === 'tool').map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['measuring', 'clamps', 'drill', 'pocketHoleJig', 'circularSaw', 'mitreSaw', 'jigsaw', 'router', 'bradNailer', 'sander']));
    for (const unused of ['tableSaw', 'trackSaw', 'holeSaw']) expect(ids).not.toContain(unused);
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
    expect(r.issues.map((i) => [i.severity, i.code, i.inputPaths])).toEqual([['info', 'TOOL_TO_BUY_OR_BORROW', ['tools.pocketHoleJig']]]);
    expect(r.steps.map((s) => s.joints)).toEqual(result.steps.map((s) => s.joints));
  });

  it('names the hinge-boring bit whenever there are doors', () => {
    expect(tool(result, 'bit-hinge')).toMatchObject({ kind: 'bit', status: 'required' });
    const drawersOnly = plan(vanityWith({}, { layout: layoutFrom([3, 3]) }));
    expect(tool(drawersOnly, 'bit-hinge')).toBeUndefined();
  });

  it('swaps in hand tools when the powered ones are not ticked, changing no part (rule T7)', () => {
    const r = withTools({ bradNailer: false, sander: false, mitreSaw: false });
    expect(r.methods).toMatchObject({ nailing: 'hammer', sanding: 'sandingBlock', boardSaw: 'circularSaw' });
    expect(r.tools.map((t) => t.id)).toEqual(expect.arrayContaining(['hammer', 'sandingBlock']));
    expect(r.tools.map((t) => t.id)).not.toContain('bradNailer');
    expect(r.parts).toEqual(result.parts);
    expect(r.issues).toEqual([]);
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
    expect(plan(vanityWith({}, narrowRail)).issues.map((i) => i.code)).toEqual(['NEEDS_LENGTHWISE_CUT']);
    expect(withTools({ tableSaw: true }, narrowRail).issues).toEqual([]);
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
    expect(result.steps.find((s) => s.id === 'fronts')!.templateId).toBe('fronts-routedRecess');
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
    expect(r.steps.find((s) => s.id === 'fronts')!.templateId).toBe('fronts-stoppedGroove');
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
    expect(r.issues).toEqual([]);
    expect(r.tools.map((t) => t.id)).not.toContain('router');
    expect(r.steps.find((s) => s.id === 'fronts')!.templateId).toBe('fronts-panelOnBack');
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
    expect(r.steps.find((s) => s.id === 'drawers')!.values.setback).toBe(inches('1/4'));
    expect(result.steps.find((s) => s.id === 'drawers')!.values.setback).toBe(0);
  });

  it('still fits together with no two pieces sharing space', () => {
    checkPlacements(r, 'panel on back:');
    checkPlacements(plan(vanityWith({ width: '48' }, { ...ticks({ router: false }), layout: layoutFrom(['door', 3, 'door']) })), 'panel on back, door-drawers-door:');
  });
});

describe('plumbing openings (rule A10)', () => {
  it('adds the step before the cabinet goes against the wall', () => {
    const ids = result.steps.map((s) => s.id);
    expect(ids.indexOf('plumbing')).toBe(ids.indexOf('install') - 1);
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
  const options = { kerf: inches('1/8'), keepOffcutsFrom: inches('6') };
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
