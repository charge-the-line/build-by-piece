/**
 * Kitchen cabinets (docs/RULES.md, section K): base, drawer base, sink base
 * and upper, one at a time. The sizes are standard test sizes, not a real
 * kitchen.
 */
import { describe, expect, it } from 'vitest';
import { cabinetKinds, doorSpaces } from '../defaults/cabinets';
import { userEntered } from '../defaults/values';
import { base01, base02, drawerBase01, newCabinet, sinkBase01, upper01 } from '../fixtures/kitchen';
import type { PlanResult, VanityDesign } from '../types';
import { checkPlacements, inches, part, plan, problems, sized, size } from './helpers';

const plans = { base01: plan(base01), base02: plan(base02), drawerBase01: plan(drawerBase01), sinkBase01: plan(sinkBase01), upper01: plan(upper01) };
const names = (r: PlanResult) => r.parts.map((p) => p.name);
const ids = (r: PlanResult) => r.steps.map((s) => s.id);
const placed = (r: PlanResult, partName: string) => r.placements.filter((p) => p.partId === part(r, partName).id);

describe('every kitchen cabinet', () => {
  it('builds from its kind and three numbers alone, with no errors or warnings', () => {
    for (const [id, r] of Object.entries(plans)) {
      expect(r.canGeneratePlan, id).toBe(true);
      expect(problems(r), id).toEqual([]);
    }
  });

  it('places every piece once, at its cut size, with no two sharing space', () => {
    for (const [id, r] of Object.entries(plans)) checkPlacements(r, `${id}:`);
  });

  it('puts every piece on a cutting diagram and uses every part in a step', () => {
    for (const [id, r] of Object.entries(plans)) {
      const pieces = r.parts.reduce((n, p) => n + p.quantity, 0);
      expect(r.cutDiagrams.reduce((n, d) => n + d.pieces.length, 0), id).toBe(pieces);
      const used = new Set(r.steps.flatMap((s) => s.partIds));
      expect(r.parts.filter((p) => !used.has(p.id)).map((p) => p.name), id).toEqual([]);
    }
  });

  it('stays sound across a range of widths', () => {
    for (const kind of cabinetKinds.filter((k) => k.type !== 'vanity')) {
      for (const width of ['12', '15', '21', '24', '27', '33', '36', '42', '48']) {
        const r = plan(newCabinet(kind.type, `${kind.type}-${width}`, width));
        if (!r.canGeneratePlan) continue;
        checkPlacements(r, `${kind.type} at ${width}":`);
        // Frame pieces and openings fill the width exactly.
        const widths = r.openings.filter((o, i, all) => all.findIndex((x) => x.bayId === o.bayId) === i).map((o) => o.width.result);
        expect((widths.length + 1) * inches('1 1/2') + widths.reduce((a, b) => a + b, 0), `${kind.type} at ${width}"`).toBe(inches(width));
      }
    }
  });

  it('builds at its starting sizes for every kind in the library', () => {
    for (const kind of cabinetKinds) {
      const r = plan(newCabinet(kind.type, kind.type));
      expect(r.canGeneratePlan, kind.name).toBe(true);
      expect(r.overall?.frameWidth, kind.name).toBe(inches(kind.start.width));
    }
  });
});

describe('starting sizes and the platform (rules K1, K2)', () => {
  it('starts base cabinets at 24" deep with a 31" box, which is 34 1/2" on the platform and 36" with a countertop', () => {
    expect([base01.depth.entered, base01.height.entered]).toEqual(['24', '31']);
    const r = plans.base01;
    expect(r.overall?.platformHeight?.result).toBe(inches('3 1/2'));
    expect(r.overall?.finishedHeight.result).toBe(inches('36'));
    expect(size(part(r, 'Left side'))).toEqual(sized('31', '23 1/4'));
    expect(placed(r, 'Left side')[0]!.y).toBe(inches('3 1/2'));
  });

  it('uses the same platform and toe kick rules as the vanity', () => {
    const r = plans.sinkBase01;
    // Both ends open by default: 36" less 3 3/4" at each end.
    expect([part(r, 'Platform rail (front and back)').length, part(r, 'Platform cross support').length]).toEqual([inches('28 1/2'), inches('17 1/4')]);
    expect(part(r, 'Toe kick (end return)').quantity).toBe(2);
  });

  it('gives an upper cabinet no platform, no toe kick and no countertop', () => {
    const r = plans.upper01;
    expect(names(r).filter((n) => /Platform|Toe kick/.test(n))).toEqual([]);
    expect(r.overall?.platformHeight).toBeUndefined();
    expect(r.overall?.finishedHeight.result).toBe(inches('30'));
    expect(placed(r, 'Left side')[0]!.y).toBe(0);
    expect(ids(r).filter((id) => /Platform|toeKick|plumbing/.test(id))).toEqual([]);
  });
});

describe('a drawer over a door (rule K3)', () => {
  const r = plans.base01;

  it('stacks a drawer, a frame piece and a door in one space', () => {
    expect(r.openings.map((o) => [o.label, o.kind, o.height.result])).toEqual([
      ['Drawer', 'drawer', inches('4 1/2')],
      ['Door', 'door', inches('22')],
    ]);
    // Top piece, drawer opening, piece between, door opening, bottom piece.
    expect(inches('1 1/2') + inches('4 1/2') + inches('1 1/2') + inches('22') + inches('1 1/2')).toBe(inches('31'));
    expect([part(r, 'Piece between openings').length, part(r, 'Piece between openings').quantity]).toEqual([inches('15'), 1]);
  });

  it('sizes the drawer front, door and drawer box by the usual rules', () => {
    expect(size(part(r, 'Drawer: drawer front'))).toEqual(sized('16', '5 1/2'));
    expect(size(part(r, 'Door: door upright'))).toEqual(sized('23', '2 1/2'));
    // 24" deep takes a 22" slide; the box is the opening less 1/2" each side.
    expect(r.hardware.find((h) => h.hardwareId === 'slide-side-mount')).toMatchObject({ quantity: 1 });
    expect(size(part(r, 'Drawer: box bottom'))).toEqual(sized('22', '14'));
  });

  it('puts a slide spacer on each cabinet side for the one drawer', () => {
    expect(names(r).filter((n) => n.startsWith('Slide spacer'))).toEqual(['Slide spacer (left side)', 'Slide spacer (right side)']);
    expect(part(r, 'Slide spacer (left side)').quantity).toBe(1);
  });
});

describe('one door or two (rule K4)', () => {
  it('works out how many door-wide spaces a width needs', () => {
    const spaces = (width: string) => doorSpaces(inches(width), inches('1 1/2'), inches('18'));
    expect(['12', '18', '21', '21 1/16', '24', '36', '40 1/2', '42', '60'].map(spaces)).toEqual([1, 1, 1, 2, 2, 2, 2, 3, 3]);
  });

  it('gives an 18" base one door and a 30" base two, each with its own drawer', () => {
    expect(plans.base01.openings.filter((o) => o.kind === 'door')).toHaveLength(1);
    const wide = plans.base02;
    expect(wide.openings.map((o) => o.label)).toEqual(['Left drawer', 'Left door', 'Right drawer', 'Right door']);
    expect(wide.openings.every((o) => o.width.result === inches('12 3/4'))).toBe(true);
    expect(part(wide, 'Vertical frame piece (inner)').quantity).toBe(1);
    // Two drawers side by side need a divider between them for the slides.
    expect(part(wide, 'Interior divider').quantity).toBe(1);
  });

  it('hinges neighbouring doors on opposite edges', () => {
    expect(plans.base02.openings.filter((o) => o.kind === 'door').map((o) => o.hingeSide)).toEqual(['left', 'right']);
    expect(plans.base01.openings.find((o) => o.kind === 'door')?.hingeSide).toBe('left');
  });

  it('never proposes an opening wider than the widest door', () => {
    for (const width of ['21 1/16', '30', '39', '45', '54']) {
      const r = plan(newCabinet('upper', `u-${width}`, width));
      for (const o of r.openings) expect(o.width.result, width).toBeLessThanOrEqual(inches('18'));
    }
  });

  it('follows a changed widest-door setting', () => {
    const design: VanityDesign = { ...base02, overrides: { fronts: { maxDoorWidth: userEntered('30') } } };
    expect(plan(design).openings.filter((o) => o.kind === 'door')).toHaveLength(1);
  });
});

describe('shelves (rule K5)', () => {
  it('gives a base cabinet one shelf per section, halfway up the door opening and set back 1"', () => {
    const r = plans.base01;
    expect(size(part(r, 'Shelf'))).toEqual(sized('16 1/2', '22'));
    const shelf = placed(r, 'Shelf')[0]!;
    const door = r.openings.find((o) => o.kind === 'door')!;
    const doorBottom = inches('3 1/2') + inches('31') - door.top - door.height.result;
    expect(shelf.y + inches('3/8')).toBe(doorBottom + door.height.result / 2);
    expect(shelf.z + shelf.sizeZ).toBe(inches('23 1/4') - inches('1'));
    expect(names(plans.base02).filter((n) => n.startsWith('Shelf'))).toEqual(['Shelf (section 1 of 2)', 'Shelf (section 2 of 2)']);
  });

  it('gives a 30" upper two shelves, evenly spaced, with no gap over 14"', () => {
    const r = plans.upper01;
    expect([part(r, 'Shelf').quantity, part(r, 'Shelf').length, part(r, 'Shelf').width]).toEqual([2, inches('28 1/2'), inches('11')]);
    const ys = placed(r, 'Shelf').map((s) => s.y);
    const thickness = inches('3/4');
    const gaps = [ys[0]! - thickness, ys[1]! - ys[0]! - thickness, inches('30') - thickness - ys[1]! - thickness];
    expect(gaps).toEqual([inches('9'), inches('9'), inches('9')]);
  });

  it('adds shelves as an upper gets taller, keeping every gap to 14" or less', () => {
    const thickness = inches('3/4');
    const counts = ['30', '42', '48'].map((height) => {
      const r = plan({ ...upper01, height: userEntered(height) });
      const ys = placed(r, 'Shelf').map((s) => s.y).sort((a, b) => a - b);
      const edges = [thickness, ...ys.flatMap((y) => [y, y + thickness]), inches(height) - thickness];
      for (let i = 0; i < edges.length; i += 2) expect(edges[i + 1]! - edges[i]!, height).toBeLessThanOrEqual(inches('14'));
      return ys.length;
    });
    expect(counts).toEqual([2, 2, 3]);
  });

  it('gives a drawer base and a sink base no shelf', () => {
    expect(names(plans.drawerBase01).filter((n) => n.startsWith('Shelf'))).toEqual([]);
    expect(names(plans.sinkBase01).filter((n) => n.startsWith('Shelf'))).toEqual([]);
  });

  it('fits the shelves before the back goes on', () => {
    for (const r of [plans.base01, plans.upper01]) {
      expect(ids(r).indexOf('shelves')).toBeGreaterThan(-1);
      expect(ids(r).indexOf('shelves')).toBeLessThan(ids(r).indexOf('back'));
    }
  });
});

describe('drawer base', () => {
  const r = plans.drawerBase01;

  it('stacks one shallow drawer over two equal deep ones', () => {
    expect(r.openings.map((o) => [o.label, o.height.result])).toEqual([
      ['Drawer 1', inches('4 1/2')],
      ['Drawer 2', inches('10 1/4')],
      ['Drawer 3', inches('10 1/4')],
    ]);
    expect(part(r, 'Piece between drawers').quantity).toBe(2);
    expect(r.hardware.map((h) => [h.hardwareId, h.quantity])).toEqual([['slide-side-mount', 3]]);
  });

  it('has no doors, hinges or pipe openings', () => {
    expect(ids(r).filter((id) => /hinges|hangDoors|plumbing/.test(id))).toEqual([]);
    expect(r.tools.find((t) => t.id === 'bit-hinge')).toBeUndefined();
  });
});

describe('sink base (rule K6)', () => {
  const r = plans.sinkBase01;

  it('has a fixed panel over each door, and no drawer boxes or slides', () => {
    expect(r.openings.map((o) => o.kind)).toEqual(['falseFront', 'door', 'falseFront', 'door']);
    expect(size(part(r, 'Left fixed panel: panel'))).toEqual(sized('16 3/4', '5 1/2'));
    expect(r.parts.filter((p) => p.colorRole === 'drawerBox')).toEqual([]);
    expect(r.hardware.map((h) => h.hardwareId)).toEqual(['hinge-face-frame-half-inch']);
    expect(names(r).filter((n) => n.startsWith('Slide spacer'))).toEqual([]);
  });

  it('screws the fixed panels on from behind, through the frame', () => {
    const step = r.steps.find((s) => s.id === 'fixedPanels')!;
    expect(step.pieces.map((p) => p.from)).toEqual(['front', 'front']);
    expect(step.joints.every((j) => j.method === 'screws')).toBe(true);
    expect(step.screws.length).toBeGreaterThan(0);
    expect(ids(r)).not.toContain('drawerFronts');
  });

  it('keeps the back and has a step for the pipe openings', () => {
    expect(part(r, 'Back').quantity).toBe(1);
    expect(ids(r)).toContain('plumbing');
  });

  it('warns when it is narrower than most sinks need', () => {
    const narrow = plan(newCabinet('sinkBase', 'narrow', '24'));
    expect(narrow.canGeneratePlan).toBe(true);
    expect(problems(narrow).map((i) => [i.severity, i.code])).toEqual([['warning', 'SINK_BASE_NARROW']]);
  });
});

describe('upper cabinet (rule K7)', () => {
  const r = plans.upper01;

  it('has a top panel the same size as its bottom, between the sides', () => {
    expect(size(part(r, 'Top'))).toEqual(size(part(r, 'Bottom')));
    expect(size(part(r, 'Top'))).toEqual(sized('28 1/2', '11'));
    expect(part(r, 'Top').colorRole).toBe('top');
    const top = placed(r, 'Top')[0]!;
    expect(top.y + top.sizeY).toBe(inches('30'));
    expect(names(r).filter((n) => n.startsWith('Top front support'))).toEqual([]);
  });

  it('has a mounting strip at the top and another at the bottom, inside the box', () => {
    const upperStrip = placed(r, 'Mounting strip')[0]!;
    const lowerStrip = placed(r, 'Lower mounting strip')[0]!;
    expect(upperStrip.y + upperStrip.sizeY).toBe(inches('30') - inches('3/4'));
    expect(lowerStrip.y).toBe(inches('3/4'));
  });

  it('puts the pocket holes for the bottom on its top face, where they are not seen from below', () => {
    expect(r.steps.find((s) => s.id === 'boxLeft')!.joints[0]!.face).toBe('top face');
    expect(plans.base01.steps.find((s) => s.id === 'boxLeft')!.joints[0]!.face).toBe('underside');
  });

  it('is hung from a temporary ledge and screwed to the wall through both strips', () => {
    expect(ids(r).slice(ids(r).indexOf('topcoat') + 1)).toEqual(['ledger', 'setBox', 'wallScrews', 'hinges', 'hangDoors', 'handles']);
    expect(r.steps.find((s) => s.id === 'setBox')!.templateId).toBe('hangCabinet');
    expect(r.steps.find((s) => s.id === 'wallScrews')!.pieces).toHaveLength(2);
    expect(plans.base01.steps.find((s) => s.id === 'setBox')!.templateId).toBe('setBox');
  });

  it('adds the top panel right after the sides', () => {
    expect(ids(r).slice(0, 3)).toEqual(['boxLeft', 'boxRight', 'topPanel']);
  });
});
