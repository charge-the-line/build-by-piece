import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../../engine/defaults/catalog';
import { startingRun } from '../../engine/defaults/run';
import { proposedVanityLayout, vanityDefaults } from '../../engine/defaults/vanity';
import { generateRun } from '../../engine/run';
import { userChoice } from '../../engine/defaults/values';
import { plan, vanityWith } from '../../engine/__tests__/helpers';
import { base01, base02, drawerBase01, sinkBase01, upper01 } from '../../engine/fixtures/kitchen';
import type { PlanResult } from '../../engine/types';
import { chapterNames, stepTemplates } from './templates';

const tools = (changes: Record<string, boolean>) => ({ tools: Object.fromEntries(Object.entries(changes).map(([id, value]) => [id, userChoice(value)])) });

const plans = [
  plan(),
  plan(vanityWith({}, { ends: { left: userChoice('exposed') } })),
  plan(vanityWith({}, { layout: proposedVanityLayout.slice(1, 3) })),
  plan(vanityWith({}, { fronts: { panelMethod: userChoice('stoppedGroove') } })),
  plan(vanityWith({}, tools({ router: false }))),
  plan(vanityWith({}, tools({ router: false, tableSaw: true, holeSaw: true, bradNailer: true, sander: true }))),
  ...[base01, base02, drawerBase01, sinkBase01, upper01].map((design) => plan(design)),
  generateRun(startingRun, vanityDefaults, defaultCatalog),
];

const words = (p: PlanResult, id: string) => {
  const step = p.steps.find((s) => s.id === id)!;
  const t = stepTemplates[step.templateId]!;
  return { title: t.title(step.values), say: t.say(step.values, p.methods!), more: t.more(step.values, p.methods!) };
};

describe('step templates', () => {
  it('has a written template and a chapter name for every step the engine can produce', () => {
    for (const p of plans) {
      for (const step of p.steps) {
        expect(stepTemplates[step.templateId], step.templateId).toBeDefined();
        expect(chapterNames[step.chapter], step.chapter).toBeTruthy();
      }
    }
  });

  it('fills every template without leaving a gap', () => {
    for (const p of plans) {
      for (const step of p.steps) {
        const w = words(p, step.id);
        for (const line of [w.title, w.say, ...w.more]) {
          expect(line, step.id).not.toMatch(/undefined|NaN|\bnull\b/);
          expect(line, step.id).not.toMatch(/(^| )0"/); // a size that was never filled in
          expect(line.trim().length, step.id).toBeGreaterThan(5);
        }
      }
    }
  });

  it('keeps the words under each picture short: two sentences or fewer, with a few exceptions of three', () => {
    let three = 0;
    for (const p of plans) {
      for (const step of p.steps) {
        const say = words(p, step.id).say;
        const sentences = say.split(/(?<=[.!?])\s+/).filter(Boolean).length;
        expect(sentences, `${step.id}: ${say}`).toBeLessThanOrEqual(3);
        expect(say.split(/\s+/).length, `${step.id}: ${say}`).toBeLessThanOrEqual(30);
        if (sentences === 3) three += 1;
        expect(words(p, step.id).title.split(/\s+/).length, step.id).toBeLessThanOrEqual(7);
      }
    }
    expect(three).toBeLessThanOrEqual(plans.length * 3);
  });

  it('quotes sizes exactly as the plan gives them', () => {
    expect(words(plans[0]!, 'slidesCabinet').say).toContain('18" slide');
    expect(words(plans[0]!, 'slidesDrawers').say).toContain('1/4" above');
    expect(words(plans[0]!, 'drawerFronts').say).toContain('1/2" all round');
    expect(words(plans[0]!, 'platformMiddle').say).toContain('3 more, one every 16"');
    expect(words(plans[0]!, 'hinges').say).toContain('3" from the top and bottom');
  });

  it('covers every panel method and both ways of cutting for pipes', () => {
    const used = new Set(plans.flatMap((p) => p.steps.map((s) => s.templateId)));
    for (const id of ['frontFrame', 'frontRecess', 'frontPanelRecess', 'frontPanelOnBack', 'frontGrooveRouter', 'frontGrooveSaw', 'frontFrameWithPanel', 'plumbingJigsaw', 'plumbingHoleSaw']) {
      expect(used, id).toContain(id);
    }
  });

  it('tells her the recess size from her panel, and the hinge space on a back panel', () => {
    expect(words(plans[0]!, 'frontRecess1').say).toContain('recess 3/8" wide and 1/4" deep');
    const onBack = plans[4]!;
    const doorPanel = onBack.steps.find((s) => s.templateId === 'frontPanelOnBack' && s.values.isDoor === 1)!;
    expect(words(onBack, doorPanel.id).say).toContain('1 3/4" from the hinge edge and 3/4" from the others');
    const drawerPanel = onBack.steps.find((s) => s.templateId === 'frontPanelOnBack' && s.values.isDoor === 0)!;
    expect(words(onBack, drawerPanel.id).say).toContain('3/4" in from every edge');
  });

  it('words the new kitchen steps from the plan', () => {
    const upper = plans[10]!;
    expect(words(upper, 'shelves')).toMatchObject({ title: 'Fit the shelves' });
    expect(words(upper, 'shelves').say).toContain('2 shelves');
    expect(words(plans[6]!, 'shelves').title).toBe('Fit the shelf');
    expect(words(upper, 'boxLeft').more[0]).toContain('top face');
    expect(words(plans[0]!, 'boxLeft').more[0]).toContain('underside');
    expect(words(plans[9]!, 'fixedPanels').say).toContain('1/2" all round');
    expect(upper.steps.map((s) => s.templateId)).toEqual(expect.arrayContaining(['topPanel', 'ledger', 'hangCabinet']));
  });

  it('words the steps that set a run in place', () => {
    const run = plans[11]!;
    expect(words(run, 'run:set-C02')).toMatchObject({ title: 'Set cabinet C02 in place' });
    expect(words(run, 'run:set-C02').say).toContain('screw them together');
    expect(words(run, 'run:set-C03').say).toContain('back against the wall');
    expect(words(run, 'run:platform-1').title).toBe('Build platform 1 of 2');
    expect(words(run, 'run:platform-1').say).toContain('5 short supports');
  });

  it('names doors and drawer fronts by what they are', () => {
    const titles = plans[0]!.steps.filter((s) => s.templateId === 'frontFrame').map((s) => stepTemplates.frontFrame!.title(s.values));
    expect(titles.sort()).toEqual(['Build a door frame', 'Build a drawer front frame']);
  });

  it('changes only the words when a hand tool stands in', () => {
    expect(words(plans[0]!, 'back').say).toContain('with a hammer and small nails');
    expect(words(plans[5]!, 'back').say).toContain('with the brad nailer');
    expect(words(plans[0]!, 'sand').say).toContain('with a sanding block');
  });
});
