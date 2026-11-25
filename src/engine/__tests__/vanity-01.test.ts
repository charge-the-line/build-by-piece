/**
 * Test list. Everything marked `todo` is pending: it names a behaviour the
 * Phase 1 engine must have. Rule numbers refer to docs/RULES.md.
 *
 * Two fixtures:
 *  - vanity01: the design being built (60" x 21" x 30", three numbers in).
 *  - mockupDesign / mockupClaims: the old AI mock-up, kept only for its errors.
 *
 * The first two blocks run today and guard the fixtures and defaults.
 */
import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../defaults/catalog';
import { proposedVanityLayout, vanityDefaults } from '../defaults/vanity';
import { mockupClaims, mockupDesign } from '../fixtures/mockup-errors';
import { vanity01 } from '../fixtures/vanity-01';
import type { Measurement } from '../types';

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

describe('vanity 01 fixture', () => {
  it('contains exactly three measurements: width, depth and height', () => {
    expect(measurementsIn(vanity01)).toEqual([vanity01.width, vanity01.depth, vanity01.height]);
  });

  it('marks all three as entered by the user', () => {
    for (const m of [vanity01.width, vanity01.depth, vanity01.height]) {
      expect(m).toMatchObject({ status: 'confirmed', origin: 'user', unit: 'in' });
    }
  });

  it('is 60" wide, 21" deep and 30" high', () => {
    expect([vanity01.width.entered, vanity01.depth.entered, vanity01.height.entered]).toEqual(['60', '21', '30']);
  });

  it('changes nothing from the defaults except which ends touch a wall', () => {
    expect(Object.keys(vanity01.overrides)).toEqual(['ends']);
    expect(vanity01.overrides.ends?.left?.value).toBe('wall');
    expect(vanity01.overrides.ends?.right?.value).toBe('exposed');
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
    const sheets = defaultCatalog.stock.filter((s) => s.kind === 'sheet');
    expect(sheets.length).toBeGreaterThan(0);
    for (const sheet of sheets) {
      expect(sheet.actualThickness).toMatchObject({ status: 'assumed', checkAt: 'cutting' });
    }
  });

  it('refers only to materials and hardware that exist in the catalog', () => {
    const stock = new Set(defaultCatalog.stock.map((s) => s.id));
    const hardware = new Set(defaultCatalog.hardware.map((h) => h.id));
    const d = vanityDefaults;
    const materials = [
      d.box.caseMaterial,
      d.box.backMaterial,
      d.box.supportMaterial,
      ...d.box.spacerMaterials,
      d.faceFrame.material,
      d.fronts.slabMaterial,
      d.fronts.shakerFrameMaterial,
      d.fronts.shakerPanelMaterial,
      d.drawers.boxMaterial,
      d.drawers.bottomMaterial,
      d.platform.lumber,
      d.platform.toeKickMaterial,
    ];
    expect(materials.filter((id) => !stock.has(id))).toEqual([]);
    expect([d.fronts.hinge, d.drawers.slide].filter((id) => !hardware.has(id))).toEqual([]);
  });

  it('proposes drawers, two doors, drawers, with every width shared', () => {
    expect(proposedVanityLayout.map((b) => b.kind)).toEqual(['drawerColumn', 'door', 'door', 'drawerColumn']);
    expect(proposedVanityLayout.every((b) => b.width.by === 'fill')).toBe(true);
  });

  it('leaves one opening in every column free to take up the leftover height', () => {
    for (const bay of proposedVanityLayout) {
      const heights = bay.kind === 'door' ? [bay.height] : bay.drawers.map((d) => d.height);
      expect(heights.filter((h) => h.by === 'fill')).toHaveLength(1);
    }
  });
});

describe('mock-up fixture', () => {
  it('marks every mock-up number as assumed', () => {
    const all = measurementsIn(mockupDesign);
    expect(all.length).toBeGreaterThan(10);
    expect(all.filter((m) => m.status !== 'assumed')).toEqual([]);
  });

  it('keeps the five conflicting widths for the engine to reject', () => {
    expect(mockupClaims.overallWidths).toHaveLength(5);
  });
});

describe('three numbers in, a whole plan out (rules G1-G3)', () => {
  it.todo('builds a complete plan from width, depth and height alone');
  it.todo('builds vanity 01 with no errors');
  it.todo('has no required input other than width, depth and height');
  it.todo('lists every default it used, each with its value and the reason for it');
  it.todo('labels each value as entered by her, chosen by the app, or to check before cutting');
  it.todo('uses a changed default everywhere that default was used');
  it.todo('goes back to the app default when a change is removed');
  it.todo('treats 60" as the full cabinet width, including the frame overhang on a wall end');
  it.todo('makes the box 1/4" narrower than the cabinet when one end is on a wall (rule B1)');
  it.todo('treats 21" as wall to the front of the face frame, so the side panels are 20 1/4" deep (rule B1)');
  it.todo('treats 30" as the box only, with platform and top added on for the finished height (rule H1)');
  it.todo('proposes drawers, two doors, drawers for a 60" vanity and sizes every opening itself (rule L0)');
  it.todo('sizes four equal openings that, with five frame pieces, add up to exactly 60" (rule L1)');
  it.todo('chooses the drawer slides and sizes each drawer box from its opening (rules X1-X3)');
  it.todo('chooses hinges that match the overlay and lists two for each door (rule D7)');
  it.todo('carries the check-at-cutting prompt for plywood thickness into the plan');
  it.todo('recalculates every affected part when plywood thickness changes from 3/4" to 23/32"');
  it.todo('needs no lengthwise cut in any solid-wood part with the default settings (rule M5)');
});

describe('vanity 01 construction choices', () => {
  it.todo('overhangs the face frame 1/4" past the box on the wall end and keeps it flush on the exposed end (rule F1)');
  it.todo('fits a 1/4" back between the sides so no back edge shows on the exposed end (rule B4)');
  it.todo('adds one mounting strip and one top front support to each section of the box (rules B6, B7)');
  it.todo('keeps the cabinet floor flush with the bottom of the box (rule B3)');
  it.todo('makes the top rail, bottom rail and every other frame piece 1 1/2" wide (rules F2-F5)');
  it.todo('keeps a vertical frame piece between the two doors (rule F4)');
  it.todo('sets the platform back from the exposed end by the same toe space as the front (rule P1)');
  it.todo('adds a toe kick return on the exposed end and none on the wall end (rule P5)');
  it.todo('makes the slide spacer on each cabinet side as thick as the frame piece stands proud of the plywood (rule B8)');
  it.todo('puts no screw or pocket hole on the outside face of the exposed side (rule J2)');
  it.todo('gives every drawer box part, slide and hinge a place in the cut list or hardware list');
});

describe('units (rules U1-U4)', () => {
  it.todo('parses fractional inches, decimal inches and millimetres to whole ticks');
  it.todo('represents 1/32" as 127 ticks and 1 mm as 160 ticks exactly');
  it.todo('rejects a fraction whose bottom number is not 2, 4, 8, 16 or 32, such as 79 2/3 or 79 3/5');
  it.todo('rounds a decimal-inch entry that is not on a tick to the nearest tick and reports the rounding');
  it.todo('never produces a non-integer tick value from any formula');
  it.todo('prints inches as proper fractions on the chosen tape increment, such as 79 1/2"');
});

describe('known error 1: one width drives every part', () => {
  it.todo('accepts exactly one cabinet width and has no second place to enter one');
  it.todo('rejects 79 2/3" and 79 1/3" as widths because thirds are not on a tape measure');
  it.todo('rejects 79 3/5" as a width because fifths are not on a tape measure');
  it.todo('accepts 79 1/2" and 79 5/8" as widths');
  it.todo('derives the bottom, back, long frame pieces, platform and toe kick from the one cabinet width');
  it.todo('changes every width-driven part, and no other part, when the cabinet width changes');
  it.todo('prints no length anywhere in the plan with thirds or fifths of an inch');
  it.todo('prints every length on the 1/16" tape increment');
  it.todo('makes the face frame exactly as wide as the cabinet width');
  it.todo('derives the platform width from the box width and the end conditions, with no input for it (rule P1)');
});

describe('known error 2: stile length follows box height', () => {
  it.todo('makes each end stile as long as the box is tall (rule F2)');
  it.todo('does not produce the mock-up length of 25 1/2" for a 30" box');
  it.todo('makes each inner stile the box height minus the top rail width minus the bottom rail width (rule F4)');
  it.todo('changes every stile length when the box height changes');
  it.todo('has no input for stile length');
});

describe('known error 3: drawn pieces and cut list always match', () => {
  it.todo('puts every part that appears in a drawing in the cut list');
  it.todo('draws every part that is in the cut list');
  it.todo('adds one inner stile at every boundary between two bays (rule F4)');
  it.todo('adds one drawer rail between every two drawers in a column (rule F5)');
  it.todo('lists four drawer rails for two columns of three drawers');
  it.todo('lists three inner stiles for four bays');
  it.todo('lists every drawer box part for every drawer');
  it.todo('adds a plywood divider at every boundary that touches a drawer column, and none between two doors (rule B5)');
  it.todo('gives every part a unique, stable ID that is the same in the cut list, drawings and steps');
  it.todo('keeps part IDs unchanged when only a measurement changes');
});

describe('known error 4: openings must add up to the width', () => {
  it.todo('reports an error when frame pieces plus openings do not equal the cabinet width (rule L1)');
  it.todo('refuses the mock-up layout of four 13" columns on a 79 1/2" box');
  it.todo('never produces an opening layout that fails this check when the layout is left to the app');
  it.todo('states the unexplained width in the explanation');
  it.todo('attaches a diagram listing each stile and opening against the box width, with the gap shown');
  it.todo('suggests letting the door openings share the leftover width as the fix');
  it.todo('passes once the door bays are set to share the leftover width (rule L3)');
  it.todo('splits leftover width so the shares still add up exactly, with no rounding loss');
  it.todo('reports an error when openings add up to more than the box width');
  it.todo('produces no parts, materials or steps while the layout error stands');
});

describe('known error 5: lengths account for the pieces they sit between', () => {
  it.todo('makes each platform cross support the platform depth minus 2 x the 2x4 thickness (rule P3)');
  it.todo('does not produce the mock-up length of 17 1/2" for a cross support on a 17 1/2" deep platform');
  it.todo('makes the platform front and back rails the full platform width (rule P2)');
  it.todo('reads the 2x4 thickness and width from the material catalog, not from a constant');
  it.todo('makes the bottom panel the box width minus 2 x the side panel thickness (rule B3)');
  it.todo('makes the top and bottom rails the cabinet width minus 2 x the stile width (rule F3)');
  it.todo('recalculates every between-pieces length when the plywood thickness changes from 3/4" to 23/32"');
});

describe('known error 6: toe kick matches the platform', () => {
  it.todo('derives toe kick height from the platform height when none is entered (rule P5)');
  it.todo('reports an error for a 4" toe kick on a 3 1/2" platform');
  it.todo('names the toe kick and platform parts in the issue and suggests the platform height as the fix');
  it.todo('takes platform height from the actual width of the 2x4, not its nominal size');
});

describe('mock-up errors 7 and 8: heights must add up too', () => {
  it.todo('reports an error when rails plus opening heights in a drawer column do not equal the box height (rule L2)');
  it.todo('reports an error when a door front and its opening do not account for the frame opening height (rule L2)');
  it.todo('reports an error when two fronts sharing a frame piece would touch or overlap (rule D3)');
});

describe('inputs, parts and issues (architecture rules)', () => {
  it.todo('returns every input used, each marked confirmed or assumed');
  it.todo('marks a part assumed when any number in its derivation is assumed');
  it.todo('gives every part a name, color role, material, thickness, length, width, grain direction and quantity');
  it.todo('gives every part dimension a derivation with a rule number, a plain-English formula and its inputs');
  it.todo('recomputes each part dimension from its derivation inputs and gets the same result');
  it.todo('gives every issue a severity, the parts involved, an explanation and a suggested fix');
  it.todo('blocks plan generation when any issue is an error, and allows it with only warnings');
  it.todo('reports an error when a plywood part is larger than the sheet it is cut from');
  it.todo('uses the fixed color role for each kind of part');
});
