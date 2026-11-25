import { describe, expect, it } from 'vitest';
import { proposedVanityLayout } from '../../engine/defaults/vanity';
import { userChoice } from '../../engine/defaults/values';
import { plan, vanityWith } from '../../engine/__tests__/helpers';
import { stepTemplates } from './templates';

const tools = (changes: Record<string, boolean>) => ({ tools: Object.fromEntries(Object.entries(changes).map(([id, value]) => [id, userChoice(value)])) });

const plans = [
  plan(),
  plan(vanityWith({}, { ends: { left: userChoice('exposed') } })),
  plan(vanityWith({}, { layout: proposedVanityLayout.slice(1, 3) })),
  plan(vanityWith({}, { fronts: { panelMethod: userChoice('stoppedGroove') } })),
  plan(vanityWith({}, tools({ router: false }))),
  plan(vanityWith({}, tools({ router: false, tableSaw: true, holeSaw: true, bradNailer: false, sander: false }))),
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
        const lines = [t.title, ...t.instructions(step.values, p.methods!), ...t.checklist(step.values, p.methods!)];
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
    const text = stepTemplates.drawers!.instructions(drawers.values, plans[0]!.methods!).join(' ');
    expect(text).toContain('18" slides');
    expect(text).toContain('1/4" above');
    expect(text).toContain('1/2" on every side');
  });

  it('covers every panel method and both ways of cutting for pipes', () => {
    const used = new Set(plans.flatMap((p) => p.steps.map((s) => s.templateId)));
    for (const id of ['fronts-routedRecess', 'fronts-stoppedGroove', 'fronts-sawnGroove', 'fronts-panelOnBack', 'plumbingJigsaw', 'plumbingHoleSaw']) {
      expect(used, id).toContain(id);
    }
  });

  it('tells her the recess depth from her panel and the hinge space on a back panel', () => {
    const recess = plans[0]!;
    const frontsStep = recess.steps.find((s) => s.id === 'fronts')!;
    const words = stepTemplates[frontsStep.templateId]!.instructions(frontsStep.values, recess.methods!).join(' ');
    expect(words).toContain('recess 3/8" wide');
    expect(words).toContain('depth of cut to 1/4"');
    const onBack = plans[4]!;
    const backStep = onBack.steps.find((s) => s.id === 'fronts')!;
    const backWords = stepTemplates[backStep.templateId]!.instructions(backStep.values, onBack.methods!).join(' ');
    expect(backWords).toContain('1 3/4" in from that edge');
    expect(backWords).toContain('3/4" in from the edges');
  });

  it('changes only the words when a hand tool stands in', () => {
    const powered = plans[0]!;
    const byHand = plans[5]!;
    const back = (p: typeof powered) => stepTemplates.back!.instructions(p.steps.find((s) => s.id === 'back')!.values, p.methods!).join(' ');
    expect(back(powered)).toContain('with the brad nailer');
    expect(back(byHand)).toContain('with a hammer and small nails');
  });
});
