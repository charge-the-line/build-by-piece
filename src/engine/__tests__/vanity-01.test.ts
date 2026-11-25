/**
 * Test list for vanity 01. Everything marked `todo` is pending: it names a
 * behaviour the Phase 1 engine must have. Rule numbers refer to docs/RULES.md.
 *
 * The first block runs today and guards the fixture itself.
 */
import { describe, expect, it } from 'vitest';
import { vanity01, vanity01Catalog, vanity01MockupClaims } from '../fixtures/vanity-01';
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
  it('marks every mock-up measurement in the design as assumed', () => {
    const all = measurementsIn(vanity01);
    expect(all.length).toBeGreaterThan(10);
    expect(all.filter((m) => m.status !== 'assumed')).toEqual([]);
  });

  it('gives every measurement a status and a source', () => {
    for (const m of [...measurementsIn(vanity01), ...measurementsIn(vanity01Catalog)]) {
      expect(['confirmed', 'assumed']).toContain(m.status);
      expect(m.source).toBeTruthy();
    }
  });

  it('refers only to materials that exist in the catalog', () => {
    const ids = new Set(vanity01Catalog.stock.map((s) => s.id));
    const used = [
      vanity01.box.caseMaterial,
      vanity01.box.backMaterial,
      vanity01.faceFrame.material,
      vanity01.fronts.slabMaterial,
      vanity01.fronts.shakerFrameMaterial,
      vanity01.fronts.shakerPanelMaterial,
      vanity01.platform.lumber,
      vanity01.platform.toeKickMaterial,
    ];
    expect(used.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('lays out drawer column, two doors, drawer column from left to right', () => {
    expect(vanity01.bays.map((b) => b.kind)).toEqual(['drawerColumn', 'door', 'door', 'drawerColumn']);
  });

  it('keeps the five conflicting mock-up widths for the engine to reject', () => {
    expect(vanity01MockupClaims.overallWidths).toHaveLength(5);
  });
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
  it.todo('accepts exactly one overall box width and has no second place to enter one');
  it.todo('rejects 79 2/3" and 79 1/3" as widths because thirds are not on a tape measure');
  it.todo('rejects 79 3/5" as a width because fifths are not on a tape measure');
  it.todo('accepts 79 1/2" and 79 5/8" as widths');
  it.todo('derives the bottom, back, long frame pieces, platform and toe kick from the same box width');
  it.todo('changes every width-driven part, and no other part, when the box width changes');
  it.todo('prints no length anywhere in the plan with thirds or fifths of an inch');
  it.todo('prints every length on the 1/16" tape increment');
  it.todo('makes the face frame exactly as wide as the box');
  it.todo('makes the platform exactly as wide as the box when its width is set to match the box');
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
  it.todo('adds a plywood divider at every boundary that touches a drawer column, and none between two doors (rule B5)');
  it.todo('gives every part a unique, stable ID that is the same in the cut list, drawings and steps');
  it.todo('keeps part IDs unchanged when only a measurement changes');
});

describe('known error 4: openings must add up to the width', () => {
  it.todo('reports an error when stiles plus openings do not equal the box width (rule L1)');
  it.todo('refuses the mock-up layout of four 13" columns on a 79 1/2" box');
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
  it.todo('makes the top and bottom rails the box width minus 2 x the stile width (rule F3)');
  it.todo('recalculates every between-pieces length when the plywood thickness changes from 3/4" to 23/32"');
});

describe('known error 6: toe kick matches the platform', () => {
  it.todo('derives toe kick height from the platform height when none is entered (rule P5)');
  it.todo('reports an error for a 4" toe kick on a 3 1/2" platform');
  it.todo('names the toe kick and platform parts in the issue and suggests the platform height as the fix');
  it.todo('takes platform height from the actual width of the 2x4, not its nominal size');
});

describe('further mock-up problems found while writing the rules', () => {
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
  it.todo('warns when plywood thickness is still the shop label rather than a measurement');
  it.todo('reports the measurements still needed: wall space, drawer boxes and slide type');
  it.todo('reports an error when a plywood part is larger than the sheet it is cut from');
  it.todo('uses the fixed color role for each kind of part');
});
