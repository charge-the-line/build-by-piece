/**
 * The AI mock-up's errors. Each known error is something the engine must
 * make impossible. Rule numbers refer to docs/RULES.md.
 */
import { describe, expect, it } from 'vitest';
import { appDefault, userEntered } from '../defaults/values';
import { mockupClaims, mockupDesign } from '../fixtures/mockup-errors';
import { parseLength } from '../units';
import { inches, part, plan, vanityWith } from './helpers';

const result = plan(mockupDesign);
const errors = result.issues.filter((i) => i.severity === 'error');
const byCode = (code: string) => errors.filter((i) => i.code === code);

/** The mock-up's three overall sizes with everything else left to the app, so the rules can be checked at its size. */
const repaired = plan({ ...mockupDesign, overrides: { ends: mockupDesign.overrides.ends! } });

describe('the mock-up as drawn', () => {
  it('is refused, and produces no parts, materials or hardware', () => {
    expect(result).toMatchObject({ canGeneratePlan: false, parts: [], materials: [], hardware: [], steps: [] });
  });

  it('reports every problem at once', () => {
    expect(errors.map((i) => i.code).sort()).toEqual([
      'LAYOUT_HEIGHT_MISMATCH',
      'LAYOUT_HEIGHT_MISMATCH',
      'LAYOUT_HEIGHT_MISMATCH',
      'LAYOUT_HEIGHT_MISMATCH',
      'LAYOUT_WIDTH_MISMATCH',
      'TOE_KICK_HEIGHT_MISMATCH',
    ]);
  });

  it('builds without errors once everything but its overall size is left to the app', () => {
    expect(repaired.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(repaired.canGeneratePlan).toBe(true);
  });
});

describe('known error 1: one width drives every part', () => {
  it('rejects 79 2/3", 79 1/3" and 79 3/5" because thirds and fifths are not on a tape measure', () => {
    const outcome = Object.fromEntries(mockupClaims.overallWidths.map((w) => [w, parseLength(w, 'in').ok]));
    expect(outcome).toEqual({ '79 2/3': false, '79 1/3': false, '79 1/2': true, '79 3/5': false, '79 5/8': true });
  });

  it('blocks the plan when such a width is entered', () => {
    const r = plan(vanityWith({ width: '79 2/3' }));
    expect(r.canGeneratePlan).toBe(false);
    expect(r.issues[0]).toMatchObject({ code: 'INPUT_NOT_USABLE', inputPaths: ['width'] });
  });

  it('accepts exactly one cabinet width and has no second place to enter one', () => {
    expect(repaired.inputs.filter((i) => i.path === 'width')).toHaveLength(1);
    expect(repaired.inputs.filter((i) => /width/i.test(i.label) && i.value === inches('79 1/2')).map((i) => i.path)).toEqual(['width']);
  });

  it('derives the bottom, back, long frame pieces, platform and toe kick from the one cabinet width', () => {
    const usesWidth = (name: string) => {
      const d = part(repaired, name).derivation.length;
      return d.inputs.some((i) => i.source === 'width' || i.source === 'rule B1' || i.source === 'rule P1');
    };
    for (const name of ['Bottom', 'Back', 'Top frame piece', 'Bottom frame piece', 'Platform rail (front and back)', 'Toe kick (front)']) {
      expect(usesWidth(name), name).toBe(true);
    }
    expect(repaired.overall?.frameWidth).toBe(inches('79 1/2'));
  });
});

describe('known error 2: stile length follows box height', () => {
  it('makes each end stile as long as the box is tall (rule F2)', () => {
    expect(part(repaired, 'Vertical frame piece (end)').length).toBe(inches('30'));
  });

  it('does not produce the mock-up length of 25 1/2" for a 30" box', () => {
    const wrong = inches(mockupClaims.sideStileLength);
    expect(repaired.parts.filter((p) => p.colorRole === 'faceFrame' && p.length === wrong)).toEqual([]);
  });

  it('makes each inner stile the box height minus the top and bottom rail widths (rule F4)', () => {
    expect(part(repaired, 'Vertical frame piece (inner)').length).toBe(inches('30') - 2 * inches('1 1/2'));
  });
});

describe('known error 3: drawn pieces and cut list always match', () => {
  it('adds one inner stile at every boundary between two bays (rule F4)', () => {
    expect(part(repaired, 'Vertical frame piece (inner)').quantity).toBe(3);
    expect(mockupClaims.cutList.centerStiles).toBe(1);
  });

  it('adds one drawer rail between every two drawers in a column (rule F5)', () => {
    const rails = repaired.parts.filter((p) => p.name.startsWith('Piece between drawers'));
    expect(rails.reduce((n, p) => n + p.quantity, 0)).toBe(4);
    expect(mockupClaims.cutList.drawerRails).toBe(0);
  });

  it('links every opening to the parts that fill it, and every such part is in the cut list', () => {
    const ids = new Set(repaired.parts.map((p) => p.id));
    for (const opening of repaired.openings) {
      expect(opening.partIds.length).toBeGreaterThan(0);
      expect(opening.partIds.every((id) => ids.has(id))).toBe(true);
    }
  });
});

describe('known error 4: openings must add up to the width', () => {
  const issue = byCode('LAYOUT_WIDTH_MISMATCH')[0]!;

  it('refuses the mock-up layout of four 13" columns on a 79 1/2" box (rule L1)', () => {
    expect(issue).toMatchObject({ severity: 'error', ruleId: 'L1' });
  });

  it('states the unexplained width in the explanation', () => {
    expect(issue.explanation).toContain('55 1/2"');
    expect(issue.explanation).toContain('79 1/2"');
    expect(issue.explanation).toContain('24" unexplained');
  });

  it('attaches a diagram listing each frame piece and opening against the cabinet width, with the gap shown', () => {
    const d = issue.diagram!;
    expect(d).toMatchObject({ direction: 'horizontal', total: inches('79 1/2'), difference: inches('24') });
    expect(d.segments.map((s) => s.label)).toEqual([
      'frame piece',
      'Left drawers opening',
      'frame piece',
      'Left door opening',
      'frame piece',
      'Right door opening',
      'frame piece',
      'Right drawers opening',
      'frame piece',
    ]);
    expect(d.segments.reduce((total, s) => total + s.length, 0) + d.difference).toBe(d.total);
  });

  it('suggests letting the door openings share the leftover width as the fix', () => {
    expect(issue.suggestedFix).toMatch(/door openings share the leftover width/);
  });

  it('reports an error when openings add up to more than the cabinet width', () => {
    const r = plan({ ...mockupDesign, width: userEntered('50') });
    const over = r.issues.find((i) => i.code === 'LAYOUT_WIDTH_MISMATCH')!;
    expect(over.diagram!.difference).toBe(inches('50') - inches('55 1/2'));
    expect(over.explanation).toContain('more than the cabinet width');
  });
});

describe('known error 5: lengths account for the pieces they sit between', () => {
  it('makes each platform cross support the platform depth minus 2 x the 2x4 thickness (rule P3)', () => {
    const d = part(repaired, 'Platform cross support').derivation.length;
    expect(d.ruleId).toBe('P3');
    expect(d.inputs.map((i) => [i.times, i.value])).toEqual([[1, inches('16 3/4')], [-2, inches('1 1/2')]]);
    expect(d.result).toBe(inches('13 3/4'));
  });

  it('never makes a cross support as long as the platform is deep', () => {
    for (const depth of ['18', '20 1/2', '21', '24']) {
      const r = plan(vanityWith({ depth }));
      const support = part(r, 'Platform cross support');
      const platformDepth = part(r, 'Toe kick (end return)').length;
      expect(platformDepth - support.length, depth).toBe(2 * inches('1 1/2'));
    }
  });

  it('makes the platform front and back rails the full platform width (rule P2)', () => {
    expect(part(repaired, 'Platform rail (front and back)').derivation.length.formula).toBe('platform width');
  });

  it('makes the bottom panel the box width minus 2 x the side panel thickness (rule B3)', () => {
    expect(part(repaired, 'Bottom').length).toBe(inches('79 1/2') - 2 * inches('3/4'));
  });

  it('makes the top and bottom rails the cabinet width minus 2 x the stile width (rule F3)', () => {
    expect(part(repaired, 'Top frame piece').length).toBe(inches('79 1/2') - 2 * inches('1 1/2'));
  });
});

describe('known error 6: toe kick matches the platform', () => {
  it('reports an error for a 4" toe kick on a 3 1/2" platform', () => {
    const issue = byCode('TOE_KICK_HEIGHT_MISMATCH')[0]!;
    expect(issue.ruleId).toBe('P5');
    expect(issue.explanation).toContain('4"');
    expect(issue.explanation).toContain('3 1/2"');
    expect(issue.suggestedFix).toContain('3 1/2"');
  });

  it('names the toe kick and platform parts when the rest of the design is sound', () => {
    const r = plan(vanityWith({}, { platform: { toeKickHeight: appDefault('4', 'test') } }));
    const issue = r.issues.find((i) => i.code === 'TOE_KICK_HEIGHT_MISMATCH')!;
    expect(issue.partIds).toHaveLength(4);
    expect(r.canGeneratePlan).toBe(false);
  });

  it('derives toe kick height from the platform height when none is entered (rule P5)', () => {
    expect(part(repaired, 'Toe kick (front)').width).toBe(inches('3 1/2'));
    expect(part(repaired, 'Toe kick (front)').width).toBe(part(repaired, 'Platform cross support').width);
  });
});

describe('mock-up errors 7 and 8: heights must add up too', () => {
  const heights = byCode('LAYOUT_HEIGHT_MISMATCH');

  it('reports an error when rails plus opening heights in a drawer column do not equal the box height (rule L2)', () => {
    const column = heights.find((i) => i.explanation.startsWith('Left drawers'))!;
    expect(column.explanation).toContain('add up to 26"');
    expect(column.diagram).toMatchObject({ direction: 'vertical', total: inches('30'), difference: inches('4') });
    expect(column.diagram!.segments).toHaveLength(7);
  });

  it('reports an error when a door and its rails do not account for the box height (rule L2)', () => {
    const door = heights.find((i) => i.explanation.startsWith('Left door'))!;
    expect(door.explanation).toContain('add up to 21"');
    expect(door.diagram!.difference).toBe(inches('9'));
  });
});
