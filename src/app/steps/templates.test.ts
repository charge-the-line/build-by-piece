import { describe, expect, it } from 'vitest';
import { proposedVanityLayout } from '../../engine/defaults/vanity';
import { userChoice } from '../../engine/defaults/values';
import { plan, vanityWith } from '../../engine/__tests__/helpers';
import { stepTemplates } from './templates';

const plans = [
  plan(),
  plan(vanityWith({}, { ends: { left: userChoice('exposed') } })),
  plan(vanityWith({}, { layout: proposedVanityLayout.slice(1, 3) })),
];

describe('step templates', () => {
  it('has a written template for every step the engine can produce', () => {
    for (const p of plans) {
      for (const step of p.steps) expect(stepTemplates[step.templateId], step.templateId).toBeDefined();
    }
  });

  it('fills every template without leaving a gap', () => {
    for (const p of plans) {
      for (const step of p.steps) {
        const t = stepTemplates[step.templateId]!;
        const lines = [t.title, ...t.instructions(step.values), ...t.checklist(step.values)];
        expect(lines.length).toBeGreaterThan(2);
        for (const line of lines) {
          expect(line, step.id).not.toMatch(/undefined|NaN|\bnull\b/);
          expect(line, step.id).not.toMatch(/(^| )0"/); // a size that was never filled in
          expect(line.trim().length).toBeGreaterThan(5);
        }
      }
    }
  });

  it('quotes sizes exactly as the plan gives them', () => {
    const drawers = plans[0]!.steps.find((s) => s.id === 'drawers')!;
    const text = stepTemplates.drawers!.instructions(drawers.values).join(' ');
    expect(text).toContain('18" slides');
    expect(text).toContain('1/4" above');
    expect(text).toContain('1/2" on every side');
  });
});
