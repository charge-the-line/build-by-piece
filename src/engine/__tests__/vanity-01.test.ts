/**
 * Vanity 01: 60" wide x 21" deep x 30" high, left end on a wall, right end
 * exposed. Three numbers in, a whole plan out. Rule numbers refer to
 * docs/RULES.md; the expected sizes are the worked example in that document.
 */
import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../defaults/catalog';
import { proposedVanityLayout, vanityDefaults } from '../defaults/vanity';
import { appDefault, userChoice, userEntered } from '../defaults/values';
import { vanity01 } from '../fixtures/vanity-01';
import { generatePlan } from '../generatePlan';
import type { Measurement, Part } from '../types';
import { inches, part, plan, size, sized, vanityWith } from './helpers';

/** Collects every Measurement anywhere inside a value. */
function measurementsIn(value: unknown, found: Measurement[] = []): Measurement[] {
  if (value === null || typeof value !== 'object') return found;
  const record = value as Record<string, unknown>;
  if (typeof record.entered === 'string' && typeof record.status === 'string') {
    found.push(record as unknown as Measurement);
    return found;
  }
  for (const child of Object.values(record)) measurementsIn(child, found);
  return found;
}

const result = plan();
const errors = (r = result) => r.issues.filter((i) => i.severity === 'error');

describe('vanity 01 fixture', () => {
  it('contains exactly three measurements: width, depth and height', () => {
    expect(measurementsIn(vanity01)).toEqual([vanity01.width, vanity01.depth, vanity01.height]);
  });

  it('is 60" wide, 21" deep and 30" high, all entered by the user', () => {
    expect([vanity01.width.entered, vanity01.depth.entered, vanity01.height.entered]).toEqual(['60', '21', '30']);
    for (const m of [vanity01.width, vanity01.depth, vanity01.height]) {
      expect(m).toMatchObject({ status: 'confirmed', origin: 'user' });
    }
  });

  it('changes nothing from the defaults except which ends touch a wall', () => {
    expect(Object.keys(vanity01.overrides)).toEqual(['ends']);
  });
});

describe('defaults and catalog', () => {
  const defaults = measurementsIn(vanityDefaults);
  const catalog = measurementsIn(defaultCatalog);

  it('marks every default as decided by the app, with a note saying why', () => {
    expect(defaults.length).toBeGreaterThan(5);
    for (const m of [...defaults, ...catalog]) {
      expect(m.origin).toBe('appDefault');
      expect(m.note).toBeTruthy();
    }
  });

  it('never marks a default as confirmed unless it is a published standard size', () => {
    const confirmed = [...defaults, ...catalog].filter((m) => m.status === 'confirmed');
    expect(confirmed.filter((m) => m.note !== 'standard size')).toEqual([]);
  });

  it('asks her to check every plywood thickness at the cutting step', () => {
    for (const sheet of defaultCatalog.stock.filter((s) => s.kind === 'sheet')) {
      expect(sheet.actualThickness).toMatchObject({ status: 'assumed', checkAt: 'cutting' });
    }
  });

  it('proposes drawers, two doors, drawers, with every width shared', () => {
    expect(proposedVanityLayout.map((b) => b.kind)).toEqual(['drawerColumn', 'door', 'door', 'drawerColumn']);
    expect(proposedVanityLayout.every((b) => b.width.by === 'fill')).toBe(true);
  });
});

describe('three numbers in, a whole plan out (rules G1-G3)', () => {
  it('builds a complete plan from width, depth and height alone', () => {
    const bare = generatePlan({ ...vanity01, overrides: {} }, vanityDefaults, defaultCatalog);
    expect(bare.canGeneratePlan).toBe(true);
    expect(bare.parts.length).toBeGreaterThan(40);
    expect(bare.materials.length).toBeGreaterThan(0);
    expect(bare.hardware.length).toBe(2);
  });

  it('builds vanity 01 with no errors and no warnings', () => {
    expect(result.canGeneratePlan).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('lists every value it used, each with a label, and every default with its reason', () => {
    expect(result.inputs.length).toBeGreaterThan(25);
    for (const input of result.inputs) {
      expect(input.label).toBeTruthy();
      if (input.origin === 'appDefault') expect(input.note, input.path).toBeTruthy();
    }
  });

  it('labels each value as entered by her, chosen by the app, or to check before cutting', () => {
    const by = (path: string) => result.inputs.find((i) => i.path === path)!;
    expect(by('width')).toMatchObject({ origin: 'user', status: 'confirmed' });
    expect(by('ends.left')).toMatchObject({ origin: 'user', value: 'wall' });
    expect(by('fronts.overlay')).toMatchObject({ origin: 'appDefault', status: 'assumed' });
    expect(by('fronts.overlay').checkAt).toBeUndefined();
    expect(by('measuredThickness.oak-ply-3-4')).toMatchObject({ origin: 'appDefault', checkAt: 'cutting' });
    expect(result.inputs.filter((i) => i.origin === 'user').map((i) => i.path)).toEqual(['width', 'depth', 'height', 'ends.left', 'ends.right']);
  });

  it('uses a changed default everywhere that default was used', () => {
    const changed = plan(vanityWith({}, { fronts: { overlay: userEntered('3/8') } }));
    // Hinges are made for 1/2", so the engine refuses rather than quietly mixing overlays.
    expect(errors(changed).map((i) => i.code)).toEqual(['HINGE_OVERLAY_MISMATCH']);

    const wider = plan(vanityWith({}, { ends: { wallOverhang: userEntered('1/2') } }));
    expect(wider.overall?.boxWidth.result).toBe(inches('59 1/2'));
    expect(part(wider, 'Bottom').length).toBe(inches('58'));
    expect(part(wider, 'Back').length).toBe(inches('58'));
    expect(part(wider, 'Platform rail (front and back)').length).toBe(inches('55 3/4'));
  });

  it('goes back to the app default when a change is removed', () => {
    expect(plan(vanityWith({}, {}))).toEqual(result);
  });

  it('treats 60" as the full cabinet width, including the frame overhang on a wall end', () => {
    expect(result.overall?.frameWidth).toBe(inches('60'));
    expect(result.overall?.boxWidth.result).toBe(inches('59 3/4'));
    expect(result.overall?.boxWidth.ruleId).toBe('B1');
  });

  it('makes the box as wide as the cabinet when both ends are exposed, and 1/2" narrower between two walls', () => {
    const open = plan(vanityWith({}, { ends: { left: userChoice('exposed') } }));
    expect(open.overall?.boxWidth.result).toBe(inches('60'));
    const walled = plan(vanityWith({}, { ends: { right: userChoice('wall') } }));
    expect(walled.overall?.boxWidth.result).toBe(inches('59 1/2'));
  });

  it('treats 21" as wall to the front of the face frame, so the side panels are 20 1/4" deep (rule B1)', () => {
    expect(result.overall?.boxDepth.result).toBe(inches('20 1/4'));
    expect(part(result, 'Left side').width).toBe(inches('20 1/4'));
  });

  it('treats 30" as the box only, with platform and top added on for the finished height (rule H1)', () => {
    expect(part(result, 'Left side').length).toBe(inches('30'));
    expect(result.overall?.platformHeight.result).toBe(inches('3 1/2'));
    expect(result.overall?.finishedHeight.result).toBe(inches('34 3/4'));
  });

  it('carries the check-at-cutting prompt for plywood thickness into the parts that depend on it', () => {
    expect(part(result, 'Bottom').needsCheck).toBe(true);
    expect(part(result, 'Left side').needsCheck).toBe(true);
    expect(part(result, 'Top frame piece').needsCheck).toBe(false);
    expect(part(result, 'Platform cross support').needsCheck).toBe(false);
  });

  it('recalculates every affected part when plywood thickness changes from 3/4" to 23/32"', () => {
    const thin = plan(vanityWith({}, { measuredThickness: { 'oak-ply-3-4': userEntered('23/32') } }));
    expect(errors(thin)).toEqual([]);
    expect(part(thin, 'Bottom').length).toBe(inches('58 5/16'));
    expect(part(thin, 'Back').length).toBe(inches('58 5/16'));
    expect(part(thin, 'Interior divider').length).toBe(inches('29 9/32'));
    expect(part(thin, 'Left side').thickness).toBe(inches('23/32'));
    expect(part(thin, 'Left drawers, drawer 1: box front and back').length).toBe(inches('10 23/32'));
    // Frame, fronts and platform do not depend on plywood thickness.
    for (const name of ['Top frame piece', 'Left door: door upright', 'Platform rail (front and back)', 'Toe kick (front)']) {
      expect(size(part(thin, name)), name).toEqual(size(part(result, name)));
    }
    expect(thin.inputs.find((i) => i.path === 'measuredThickness.oak-ply-3-4')).toMatchObject({ origin: 'user', status: 'confirmed' });
  });

  it('needs no lengthwise cut in any solid-wood part with the default settings (rule M5)', () => {
    expect(result.issues.filter((i) => i.code === 'NEEDS_LENGTHWISE_CUT')).toEqual([]);
    const ripped = plan(vanityWith({}, { faceFrame: { topRailWidth: appDefault('1 1/4', 'test') } }));
    expect(ripped.canGeneratePlan).toBe(true);
    expect(ripped.issues.filter((i) => i.code === 'NEEDS_LENGTHWISE_CUT').map((i) => i.partIds)).toEqual([[part(ripped, 'Top frame piece').id]]);
  });
});

describe('layout (rules L0-L4)', () => {
  it('proposes drawers, two doors, drawers for a 60" vanity and sizes every opening itself', () => {
    expect(result.openings.map((o) => o.kind)).toEqual(['drawer', 'drawer', 'drawer', 'door', 'door', 'drawer', 'drawer', 'drawer']);
  });

  it('sizes four equal openings that, with five frame pieces, add up to exactly 60" (rule L1)', () => {
    const widths = ['left-drawers', 'left-door', 'right-door', 'right-drawers'].map((bay) => result.openings.find((o) => o.bayId === bay)!.width.result);
    expect(widths).toEqual(Array(4).fill(inches('13 1/8')));
    expect(5 * inches('1 1/2') + widths.reduce((a, b) => a + b, 0)).toBe(inches('60'));
  });

  it('makes each small drawer front one 1x6 board high and gives the large drawer the rest (rules L2, L4)', () => {
    const column = result.openings.filter((o) => o.bayId === 'left-drawers');
    expect(column.map((o) => o.height.result)).toEqual([inches('4 1/2'), inches('4 1/2'), inches('15')]);
    expect(column.map((o) => o.frontHeight)).toEqual([inches('5 1/2'), inches('5 1/2'), inches('16')]);
    expect(4 * inches('1 1/2') + column.reduce((a, o) => a + o.height.result, 0)).toBe(inches('30'));
  });

  it('places each opening in the frame, left to right and top to bottom', () => {
    expect(result.openings.find((o) => o.id === 'left-door')).toMatchObject({ left: inches('16 1/8'), top: inches('1 1/2') });
    expect(result.openings.find((o) => o.id === 'right-drawer-3')).toMatchObject({ left: inches('45 3/8'), top: inches('13 1/2') });
  });

  it('never produces an opening layout that fails the checks when the layout is left to the app', () => {
    for (let sixteenths = 36 * 16; sixteenths <= 96 * 16; sixteenths += 7) {
      const width = `${Math.floor(sixteenths / 16)} ${sixteenths % 16}/16`.replace(' 0/16', '');
      const r = plan(vanityWith({ width }));
      expect(r.issues.filter((i) => i.code.startsWith('LAYOUT_')), width).toEqual([]);
      if (!r.canGeneratePlan) continue;
      const across = ['left-drawers', 'left-door', 'right-door', 'right-drawers'].map((bay) => r.openings.find((o) => o.bayId === bay)!.width.result);
      expect(5 * inches('1 1/2') + across.reduce((a, b) => a + b, 0), width).toBe(r.overall!.frameWidth);
    }
  });

  it('splits leftover width so the shares still add up exactly, with no rounding loss (rule U4)', () => {
    const r = plan(vanityWith({ width: '60 1/16' }));
    const widths = ['left-drawers', 'left-door', 'right-door', 'right-drawers'].map((bay) => r.openings.find((o) => o.bayId === bay)!.width.result);
    expect(widths).toEqual([inches('13 1/8'), inches('13 1/8'), inches('13 1/8'), inches('13 3/16')]);
  });
});

describe('the box (rules B1-B8)', () => {
  it('matches the worked example', () => {
    expect(size(part(result, 'Left side'))).toEqual(sized('30', '20 1/4'));
    expect(size(part(result, 'Right side'))).toEqual(sized('30', '20 1/4'));
    expect(size(part(result, 'Bottom'))).toEqual(sized('58 1/4', '20'));
    expect(size(part(result, 'Back'))).toEqual(sized('58 1/4', '30'));
    expect(size(part(result, 'Interior divider'))).toEqual(sized('29 1/4', '20'));
    expect(part(result, 'Interior divider').quantity).toBe(2);
  });

  it('fits a 1/4" back between the sides so no back edge shows on the exposed end (rule B4)', () => {
    const back = part(result, 'Back');
    expect(back.thickness).toBe(inches('1/4'));
    expect(back.length).toBe(part(result, 'Bottom').length);
    expect(back.length + 2 * part(result, 'Left side').thickness).toBe(result.overall!.boxWidth.result);
  });

  it('adds a plywood divider at every boundary that touches a drawer column, and none between two doors (rule B5)', () => {
    expect(part(result, 'Interior divider').quantity).toBe(2);
    const twoDoors = plan(vanityWith({}, { layout: proposedVanityLayout.slice(1, 3) }));
    expect(twoDoors.canGeneratePlan).toBe(true);
    expect(twoDoors.parts.filter((p) => p.colorRole === 'divider')).toEqual([]);
  });

  it('adds one mounting strip and one top front support to each section of the box (rules B6, B7)', () => {
    const lengths = (prefix: string) => result.parts.filter((p) => p.name.startsWith(prefix)).map((p) => p.length);
    const expected = [inches('13 5/8'), inches('29 1/4'), inches('13 7/8')];
    expect(lengths('Top front support')).toEqual(expected);
    expect(lengths('Mounting strip')).toEqual(expected);
    // The three sections, two dividers and two sides fill the box exactly.
    expect(expected.reduce((a, b) => a + b, 0) + 4 * inches('3/4')).toBe(result.overall!.boxWidth.result);
  });

  it('makes the slide spacer on each cabinet side as thick as the frame piece stands proud of the plywood (rule B8)', () => {
    const wall = part(result, 'Slide spacer (left drawers, wall side)');
    const open = part(result, 'Slide spacer (right drawers, right side)');
    // Wall side: 1 1/2" - 1/4" overhang - 3/4" = 1/2", as two layers of 1/4" for each of three drawers.
    expect([wall.thickness, wall.quantity]).toEqual([inches('1/4'), 6]);
    // Exposed side: 1 1/2" - 3/4" = 3/4", one layer for each of three drawers.
    expect([open.thickness, open.quantity]).toEqual([inches('3/4'), 3]);
    expect(wall.length).toBe(inches('18'));
  });

  it('allows for a spacer that falls slightly short when the plywood is thinner than its label', () => {
    const thin = plan(vanityWith({}, { measuredThickness: { 'oak-ply-3-4': userEntered('23/32') } }));
    // Exposed side needs 25/32" and gets one 23/32" layer: 1/16" short, added to the drawer box width.
    expect(part(thin, 'Right drawers, drawer 1: box bottom').width).toBe(inches('12 3/16'));
    // Wall side needs 17/32" and gets two 1/4" layers: 1/32" short.
    expect(part(thin, 'Left drawers, drawer 1: box bottom').width).toBe(inches('12 5/32'));
  });

  it('refuses plywood thicker than the frame piece that has to cover its edge', () => {
    const r = plan(vanityWith({}, { faceFrame: { stileWidth: userEntered('3/4') } }));
    expect(errors(r).map((i) => i.code)).toContain('SIDE_SHOWS_IN_OPENING');
  });
});

describe('the face frame (rules F1-F5)', () => {
  it('makes the face frame exactly as wide as the cabinet width and as tall as the box', () => {
    expect(result.overall).toMatchObject({ frameWidth: inches('60'), frameHeight: inches('30') });
    expect(part(result, 'Top frame piece').length + 2 * inches('1 1/2')).toBe(inches('60'));
  });

  it('makes the top rail, bottom rail and every other frame piece 1 1/2" wide', () => {
    const frame = result.parts.filter((p) => p.colorRole === 'faceFrame');
    expect(frame.length).toBe(6);
    expect(frame.every((p) => p.width === inches('1 1/2') && p.thickness === inches('3/4'))).toBe(true);
  });

  it('matches the worked example', () => {
    expect([part(result, 'Vertical frame piece (end)').length, part(result, 'Vertical frame piece (end)').quantity]).toEqual([inches('30'), 2]);
    expect(part(result, 'Top frame piece').length).toBe(inches('57'));
    expect(part(result, 'Bottom frame piece').length).toBe(inches('57'));
    expect([part(result, 'Vertical frame piece (inner)').length, part(result, 'Vertical frame piece (inner)').quantity]).toEqual([inches('27'), 3]);
  });

  it('keeps a vertical frame piece between the two doors: three inner pieces for four bays (rule F4)', () => {
    expect(part(result, 'Vertical frame piece (inner)').quantity).toBe(3);
  });

  it('lists four drawer rails for two columns of three drawers (rule F5)', () => {
    const rails = result.parts.filter((p) => p.name.startsWith('Piece between drawers'));
    expect(rails.map((p) => [p.quantity, p.length])).toEqual([[2, inches('13 1/8')], [2, inches('13 1/8')]]);
  });
});

describe('doors, drawer fronts and hinges (rules D1-D7)', () => {
  it('matches the worked example', () => {
    expect(size(part(result, 'Left door: door upright'))).toEqual(sized('28', '2 1/2'));
    expect(size(part(result, 'Left door: door cross piece'))).toEqual(sized('9 1/8', '2 1/2'));
    expect(size(part(result, 'Left door: door centre panel'))).toEqual(sized('23 5/8', '9 3/4'));
    expect(size(part(result, 'Left drawers, drawer 1: drawer front'))).toEqual(sized('14 1/8', '5 1/2'));
    expect(size(part(result, 'Left drawers, drawer 3: drawer front upright'))).toEqual(sized('16', '2 1/2'));
    expect(size(part(result, 'Left drawers, drawer 3: drawer front centre panel'))).toEqual(sized('9 3/4', '11 5/8'));
    expect(result.openings.find((o) => o.id === 'left-door')).toMatchObject({ frontWidth: inches('14 1/8'), frontHeight: inches('28') });
  });

  it('chooses hinges that match the overlay and lists two for each door (rule D7)', () => {
    const hinges = result.hardware.find((h) => h.hardwareId === 'hinge-face-frame-half-inch');
    expect(hinges).toMatchObject({ quantity: 4, unit: 'each' });
  });

  it('reports an error when two fronts sharing a frame piece would touch or overlap (rule D3)', () => {
    const r = plan(vanityWith({}, { fronts: { overlay: userEntered('3/4') } }));
    expect(errors(r).map((i) => i.code)).toContain('FRONTS_TOO_CLOSE');
  });

  it('reports an error for a framed front too small to show a panel (rule D6)', () => {
    const r = plan(vanityWith({ width: '26' }));
    expect(errors(r).map((i) => i.code)).toContain('FRAMED_FRONT_TOO_SMALL');
    expect(r.parts).toEqual([]);
  });
});

describe('drawer boxes and slides (rules X1-X5)', () => {
  it('chooses the longest slide that fits and lists one pair for each drawer (rule X1)', () => {
    const slides = result.hardware.find((h) => h.hardwareId === 'slide-side-mount');
    expect(slides).toMatchObject({ quantity: 6, unit: 'pair' });
    expect(slides?.length?.result).toBe(inches('18'));
    const shallow = plan(vanityWith({ depth: '18' }));
    expect(shallow.hardware.find((h) => h.hardwareId === 'slide-side-mount')?.length?.result).toBe(inches('16'));
  });

  it('sizes each drawer box from its opening (rules X2-X5)', () => {
    // Small drawers: 12 1/8" wide, 3 1/2" high, 18" deep.
    expect(size(part(result, 'Left drawers, drawer 1: box side'))).toEqual(sized('18', '3 1/4'));
    expect(size(part(result, 'Left drawers, drawer 1: box front and back'))).toEqual(sized('10 5/8', '3 1/4'));
    expect(size(part(result, 'Left drawers, drawer 1: box bottom'))).toEqual(sized('18', '12 1/8'));
    // Large drawers: 14" high.
    expect(size(part(result, 'Right drawers, drawer 3: box side'))).toEqual(sized('18', '13 3/4'));
  });

  it('lists every drawer box part for every drawer', () => {
    const drawers = result.openings.filter((o) => o.kind === 'drawer');
    expect(drawers).toHaveLength(6);
    for (const drawer of drawers) {
      const names = drawer.partIds.map((id) => result.parts.find((p) => p.id === id)!.name.replace(`${drawer.label}: `, ''));
      expect(names).toEqual(expect.arrayContaining(['box side', 'box front and back', 'box bottom']));
    }
  });

  it('reports an error when no slide sold is short enough', () => {
    const r = plan(vanityWith({ depth: '12' }));
    expect(errors(r).map((i) => i.code)).toContain('NO_SLIDE_FITS');
  });
});

describe('the platform and toe kick (rules P1-P5)', () => {
  it('matches the worked example', () => {
    const rails = part(result, 'Platform rail (front and back)');
    const supports = part(result, 'Platform cross support');
    expect([rails.length, rails.quantity]).toEqual([inches('56'), 2]);
    expect([supports.length, supports.quantity]).toEqual([inches('14 1/4'), 5]);
    expect(size(part(result, 'Toe kick (front)'))).toEqual(sized('56 3/4', '3 1/2'));
    expect(size(part(result, 'Toe kick (end return)'))).toEqual(sized('17 1/4', '3 1/2'));
  });

  it('sets the platform back from the exposed end by the same toe space as the front (rule P1)', () => {
    const box = result.overall!.boxWidth.result;
    const toeSpacePlusKick = inches('3') + inches('3/4');
    expect(part(result, 'Platform rail (front and back)').length).toBe(box - toeSpacePlusKick);
    expect(part(result, 'Toe kick (end return)').length + toeSpacePlusKick).toBe(inches('21'));
  });

  it('adds a toe kick return on each exposed end and none on a wall end (rule P5)', () => {
    expect(part(result, 'Toe kick (end return)').quantity).toBe(1);
    const walled = plan(vanityWith({}, { ends: { right: userChoice('wall') } }));
    expect(walled.parts.filter((p) => p.name === 'Toe kick (end return)')).toEqual([]);
    const open = plan(vanityWith({}, { ends: { left: userChoice('exposed') } }));
    expect(part(open, 'Toe kick (end return)').quantity).toBe(2);
  });

  it('takes platform height from the actual width of the 2x4, not its nominal size', () => {
    expect(part(result, 'Platform cross support').width).toBe(inches('3 1/2'));
    expect(part(result, 'Platform cross support').thickness).toBe(inches('1 1/2'));
  });

  it('adds a cross support every 16" so no gap is wider than that (rule P3)', () => {
    expect(part(plan(vanityWith({ width: '36' })), 'Platform cross support').quantity).toBe(3);
    expect(part(plan(vanityWith({ width: '96' })), 'Platform cross support').quantity).toBe(7);
  });

  it('warns when the toe space is changed to something uncomfortable (rule P4)', () => {
    const r = plan(vanityWith({}, { platform: { toeSpace: userEntered('1') } }));
    expect(r.canGeneratePlan).toBe(true);
    expect(r.issues.map((i) => [i.severity, i.code])).toEqual([['warning', 'TOE_SPACE_UNUSUAL']]);
  });
});

describe('every part (architecture rules)', () => {
  it('gives every part a unique, stable ID', () => {
    const ids = result.parts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('P01');
    expect(ids.every((id) => /^P\d{2}$/.test(id))).toBe(true);
  });

  it('keeps part IDs and names unchanged when only a measurement changes', () => {
    const other = plan(vanityWith({ width: '72 1/2', depth: '22', height: '32' }));
    expect(other.canGeneratePlan).toBe(true);
    expect(other.parts.map((p) => [p.id, p.name])).toEqual(result.parts.map((p) => [p.id, p.name]));
  });

  it('gives every part a name, color role, material, thickness, length, width, grain direction and quantity', () => {
    const materials = new Set(defaultCatalog.stock.map((s) => s.id));
    for (const p of result.parts) {
      expect(p.name).toBeTruthy();
      expect(p.colorRole).toBeTruthy();
      expect(p.assembly).toBeTruthy();
      expect(materials.has(p.materialId), p.name).toBe(true);
      expect(Math.min(p.thickness, p.length, p.width), p.name).toBeGreaterThan(0);
      expect(['alongLength', 'alongWidth']).toContain(p.grain);
      expect(p.quantity).toBeGreaterThan(0);
    }
  });

  it('gives every part dimension a derivation with a rule number, a plain-English formula and its inputs', () => {
    for (const p of result.parts) {
      for (const d of [p.derivation.thickness, p.derivation.length, p.derivation.width]) {
        expect(d.ruleId, p.name).toMatch(/^[A-Z]\d$/);
        expect(d.formula.length, p.name).toBeGreaterThan(5);
        expect(d.inputs.length, p.name).toBeGreaterThan(0);
      }
      expect(p.derivation.length.result).toBe(p.length);
      expect(p.derivation.width.result).toBe(p.width);
      expect(p.derivation.thickness.result).toBe(p.thickness);
    }
  });

  it('recomputes each part dimension from its derivation inputs and gets the same result', () => {
    let sums = 0;
    for (const p of result.parts) {
      for (const d of [p.derivation.thickness, p.derivation.length, p.derivation.width]) {
        if (d.kind !== 'sum') continue;
        sums += 1;
        expect(d.inputs.reduce((total, i) => total + (i.times ?? 1) * i.value, 0), `${p.name}: ${d.formula}`).toBe(d.result);
      }
    }
    expect(sums).toBeGreaterThan(100);
  });

  it('never produces a non-integer tick value from any formula', () => {
    const values = result.parts.flatMap((p) => [p.thickness, p.length, p.width]);
    expect(values.every(Number.isInteger)).toBe(true);
  });

  it('prints every length on the 1/16" tape increment, with no thirds or fifths', () => {
    const sixteenth = inches('1/16');
    for (const p of result.parts) {
      expect(p.length % sixteenth, p.name).toBe(0);
      expect(p.width % sixteenth, p.name).toBe(0);
    }
  });

  it('marks a part assumed when any number in its derivation is assumed', () => {
    const isAssumed = (p: Part) => Object.values(p.derivation).some((d) => d.inputs.some((i) => i.status === 'assumed'));
    for (const p of result.parts) expect(p.status === 'assumed', p.name).toBe(isAssumed(p));
    // Built only from the entered cabinet size and standard lumber sizes.
    expect(part(result, 'Platform cross support').status).toBe('assumed'); // depends on the default toe space
    expect(result.parts.some((p) => p.status === 'assumed')).toBe(true);
  });

  it('uses the fixed color role for each kind of part', () => {
    const roles = (name: string) => part(result, name).colorRole;
    expect(roles('Left side')).toBe('leftSide');
    expect(roles('Right side')).toBe('rightSide');
    expect(roles('Bottom')).toBe('bottom');
    expect(roles('Back')).toBe('back');
    expect(roles('Interior divider')).toBe('divider');
    expect(roles('Top frame piece')).toBe('faceFrame');
    expect(roles('Left door: door upright')).toBe('door');
    expect(roles('Left drawers, drawer 1: drawer front')).toBe('drawerFront');
    expect(roles('Left drawers, drawer 1: box side')).toBe('drawerBox');
    expect(roles('Mounting strip (section 1 of 3)')).toBe('support');
    expect(roles('Platform cross support')).toBe('platform');
    expect(roles('Toe kick (front)')).toBe('platform');
  });

  it('gives every issue a severity, an explanation and a suggested fix', () => {
    const bad = plan(vanityWith({ width: '32', depth: '12' }, { platform: { toeSpace: userEntered('1') } }));
    expect(bad.issues.length).toBeGreaterThan(1);
    for (const issue of bad.issues) {
      expect(['error', 'warning', 'info']).toContain(issue.severity);
      expect(issue.explanation.length).toBeGreaterThan(20);
      expect(issue.suggestedFix.length).toBeGreaterThan(10);
      expect(issue.ruleId).toMatch(/^[A-Z]\d$/);
    }
  });

  it('blocks plan generation when any issue is an error, and allows it with only warnings', () => {
    const blocked = plan(vanityWith({ depth: '12' }));
    expect(blocked).toMatchObject({ canGeneratePlan: false, parts: [], materials: [], hardware: [], openings: [] });
    const warned = plan(vanityWith({}, { platform: { toeSpace: userEntered('1') } }));
    expect(warned.canGeneratePlan).toBe(true);
    expect(warned.parts.length).toBeGreaterThan(0);
  });

  it('reports an error when a plywood part is larger than the sheet it is cut from (rule M3)', () => {
    const r = plan(vanityWith({ width: '100' }));
    const tooBig = errors(r).filter((i) => i.code === 'PART_LARGER_THAN_SHEET');
    expect(tooBig.length).toBeGreaterThan(0);
    expect(tooBig.every((i) => i.partIds.length === 1)).toBe(true);
  });

  it('explains an entry that is not on a tape measure, and blocks the plan', () => {
    const r = plan(vanityWith({ width: '60 1/3' }));
    expect(r.canGeneratePlan).toBe(false);
    expect(errors(r)).toHaveLength(1);
    expect(errors(r)[0]).toMatchObject({ code: 'INPUT_NOT_USABLE', inputPaths: ['width'] });
    expect(errors(r)[0]!.explanation).toMatch(/tape measure/);
  });
});

describe('one width drives every part', () => {
  it('changes every width-driven part, and no other part, when the cabinet width changes', () => {
    const wider = plan(vanityWith({ width: '64' }));
    const changed = wider.parts.filter((p, i) => p.length !== result.parts[i]!.length || p.width !== result.parts[i]!.width).map((p) => p.name);
    const unchanged = ['Left side', 'Right side', 'Interior divider', 'Vertical frame piece (end)', 'Vertical frame piece (inner)', 'Platform cross support', 'Toe kick (end return)', 'Left door: door upright', 'Left drawers, drawer 1: box side'];
    for (const name of unchanged) expect(changed, name).not.toContain(name);
    for (const name of ['Bottom', 'Back', 'Top frame piece', 'Bottom frame piece', 'Platform rail (front and back)', 'Toe kick (front)', 'Left door: door cross piece']) {
      expect(changed, name).toContain(name);
      expect(part(wider, name).length - part(result, name).length, name).toBeGreaterThan(0);
    }
    for (const name of ['Bottom', 'Back', 'Top frame piece', 'Platform rail (front and back)', 'Toe kick (front)']) {
      expect(part(wider, name).length - part(result, name).length, name).toBe(inches('4'));
    }
  });

  it('changes every stile length when the box height changes (rule F2)', () => {
    const taller = plan(vanityWith({ height: '32' }));
    expect(part(taller, 'Vertical frame piece (end)').length).toBe(inches('32'));
    expect(part(taller, 'Vertical frame piece (inner)').length).toBe(inches('29'));
  });

  it('has no input for stile length: it comes only from the box height', () => {
    expect(part(result, 'Vertical frame piece (end)').derivation.length.inputs.map((i) => i.source)).toEqual(['height']);
    expect(result.inputs.filter((i) => /length/i.test(i.path))).toEqual([]);
  });

  it('derives the platform width from the cabinet width and the end conditions, with no input for it', () => {
    expect(result.inputs.filter((i) => /platform\.(width|depth)/.test(i.path))).toEqual([]);
  });
});

describe('still to come', () => {
  it.todo('draws every part that is in the cut list, and lists every part that is drawn (Phase 2)');
  it.todo('puts no screw or pocket hole on the outside face of the exposed side (rule J2, Phase 3)');
  it.todo('puts divider pocket holes on the drawer side (rule J3, Phase 3)');
});
