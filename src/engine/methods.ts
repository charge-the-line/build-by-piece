/**
 * Tools and the methods they allow (docs/RULES.md, rules T1-T8).
 *
 * For each job that can be done more than one way, the first method her
 * tools allow is used. A missing tool never blocks the plan: the simplest
 * method is used and the tool is listed to buy or borrow.
 */
import { handTools, safetyGear, toolName } from './defaults/tools';
import type { Resolved } from './resolve';
import type { PanelMethod, PlanMethods, PlanTool, Ticks, ToolId, ValidationIssue } from './types';

export function chooseMethods(r: Resolved): PlanMethods {
  const has = r.tools;
  // T5: the easiest panel method her tools allow, unless she picked one.
  const panel: PanelMethod = r.panelMethod !== 'auto' ? r.panelMethod : has.router ? 'routedRecess' : has.tableSaw ? 'sawnGroove' : 'panelOnBack';
  return {
    solidWidths: has.tableSaw ? 'anyWidth' : 'boardsAsSold',
    // T4: sections first is only replaced when a track saw is ticked; see cutting.ts for the comparison.
    sheetSaw: has.trackSaw ? 'trackSaw' : 'circularSaw',
    boardSaw: has.mitreSaw ? 'mitreSaw' : 'circularSaw',
    panel,
    nailing: has.bradNailer ? 'bradNailer' : 'hammer',
    sanding: has.sander ? 'sander' : 'sandingBlock',
    // Plumbing openings: a hole saw is neater; a jigsaw is the fallback, and what is asked for if she has neither.
    cutouts: has.holeSaw ? 'holeSaw' : 'jigsaw',
  };
}

export interface PlanFacts {
  readonly framedFronts: number;
  readonly doors: number;
  readonly hingeBit: string;
  /** Thickness of the panel a recess or groove has to take. */
  readonly panelThickness: Ticks;
  readonly recessWidth: Ticks;
  readonly grooveDepth: Ticks;
}

export function toolsForPlan(r: Resolved, methods: PlanMethods, facts: PlanFacts): { tools: PlanTool[]; issues: ValidationIssue[] } {
  const needs = new Map<ToolId, string[]>();
  const need = (id: ToolId, why: string) => needs.set(id, [...(needs.get(id) ?? []), why]);

  need('measuring', 'Every step.');
  need('clamps', 'Holding joints while you screw them.');
  need('drill', 'Pocket holes and every screw.');
  need('pocketHoleJig', 'Every joint in the plan.');
  need(methods.sheetSaw, 'Cutting the plywood.');
  need(methods.boardSaw, 'Cutting boards to length.');
  need(methods.cutouts, 'Cutting the opening for the pipes in the back panel.');
  if (methods.nailing === 'bradNailer') need('bradNailer', 'Fixing the back panel and drawer bottoms.');
  if (methods.sanding === 'sander') need('sander', 'Smoothing faces and edges.');
  if (facts.framedFronts > 0) {
    if (methods.panel === 'routedRecess') need('router', 'Cutting the recess for the panel in framed doors and drawer fronts.');
    if (methods.panel === 'stoppedGroove') need('router', 'Cutting the groove for the panel in framed doors and drawer fronts.');
    if (methods.panel === 'sawnGroove') need('tableSaw', 'Cutting the groove for the panel in framed doors and drawer fronts.');
  }

  const tools: PlanTool[] = [...needs].map(([id, usedFor]) => ({
    id,
    kind: 'tool',
    name: toolName(id),
    status: r.tools[id] ? 'have' : 'buyOrBorrow',
    usedFor,
  }));

  // T7: basic hand tools stand in for the powered ones.
  if (methods.nailing === 'hammer') tools.push({ id: 'hammer', kind: 'tool', name: handTools.hammer, status: 'required', usedFor: ['Fixing the back panel and drawer bottoms.'] });
  if (methods.sanding === 'sandingBlock') tools.push({ id: 'sandingBlock', kind: 'tool', name: handTools.sandingBlock, status: 'required', usedFor: ['Smoothing faces and edges.'] });

  // The exact bit for the chosen panel method. Its cut follows the measured panel thickness.
  if (facts.framedFronts > 0 && methods.panel === 'routedRecess') {
    tools.push({
      id: 'bit-recess',
      kind: 'bit',
      name: 'Router bit: rabbeting bit with a guide bearing',
      status: 'required',
      usedFor: ['The recess round the back of each framed front.'],
      cut: { kind: 'recess', width: facts.recessWidth, depth: facts.panelThickness },
    });
  }
  if (facts.framedFronts > 0 && methods.panel === 'stoppedGroove') {
    tools.push({
      id: 'bit-groove',
      kind: 'bit',
      name: 'Router bit: straight bit',
      status: 'required',
      usedFor: ['The groove in each frame piece of a framed front.'],
      cut: { kind: 'groove', width: facts.panelThickness, depth: facts.grooveDepth },
    });
  }
  if (facts.doors > 0) {
    tools.push({ id: 'bit-hinge', kind: 'bit', name: facts.hingeBit, status: 'required', usedFor: ['The cup hole for each door hinge.'] });
  }

  for (const gear of safetyGear) tools.push({ id: gear.id, kind: 'safety', name: gear.name, status: 'required', usedFor: [gear.usedFor] });

  const issues: ValidationIssue[] = tools
    .filter((t) => t.status === 'buyOrBorrow')
    .map((t) => ({
      code: 'TOOL_TO_BUY_OR_BORROW',
      ruleId: 'T2',
      severity: 'info',
      partIds: [],
      inputPaths: [`tools.${t.id}`],
      explanation: `This plan needs a tool that is not ticked: ${t.name}. It is used for: ${t.usedFor.join(' ').replace(/\.$/, '').toLowerCase()}.`,
      suggestedFix: 'Buy or borrow one, or tick it on the Choices screen if you already have it.',
    }));

  return { tools, issues };
}
