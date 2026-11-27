/**
 * The engine's front door: a design, the defaults and a catalog go in;
 * inputs, issues, openings, parts, cutting diagrams, materials, hardware and assembly steps come out.
 * Pure TypeScript: no UI, DOM or network.
 */
import { assemble } from './assembly';
import { layOut } from './layout';
import { chooseMethods, toolsForPlan } from './methods';
import { cutDiagrams, shoppingList } from './cutting';
import { resolveVanity } from './resolve';
import type { GeneratePlan, PlanResult } from './types';
import { buildVanity, toeKickIssue } from './vanity';

const blocked = (base: Pick<PlanResult, 'inputs' | 'issues'>): PlanResult => ({
  ...base,
  canGeneratePlan: false,
  openings: [],
  parts: [],
  cutDiagrams: [],
  materials: [],
  hardware: [],
  tools: [],
  supplies: [],
  placements: [],
  steps: [],
});

export const generatePlan: GeneratePlan = (design, defaults, catalog) => {
  const { resolved, inputs, issues: inputIssues } = resolveVanity(design, defaults, catalog);
  if (!resolved) return blocked({ inputs, issues: inputIssues });

  const layout = layOut(resolved);
  if (!layout.bays) {
    // Report everything that can be known without a layout, so one fix does not reveal the next error.
    const toeKick = toeKickIssue(resolved, []);
    return blocked({ inputs, issues: [...inputIssues, ...layout.issues, ...(toeKick ? [toeKick] : [])] });
  }

  const methods = chooseMethods(resolved);
  const built = buildVanity(resolved, layout.bays, methods);
  const panels = built.parts.filter((p) => p.name.endsWith('centre panel')).length;
  const needed = toolsForPlan(resolved, methods, {
    framedFronts: panels,
    doors: built.openings.filter((o) => o.kind === 'door').length,
    hingeBit: resolved.hinge.boringBit,
    panelThickness: built.facts.panelThickness,
    recessWidth: built.facts.recessWidth,
    grooveDepth: built.facts.grooveDepth,
  });
  const issues = [...inputIssues, ...layout.issues, ...built.issues, ...needed.issues];
  if (issues.some((issue) => issue.severity === 'error')) return blocked({ inputs, issues });

  const diagrams = cutDiagrams(built.parts, catalog, {
    kerf: resolved.kerf.value,
    keepOffcutsFrom: resolved.keepOffcutsFrom.value,
    allowLongCutsFirst: methods.sheetSaw === 'trackSaw',
  });

  const assembly = assemble(resolved, built, methods, catalog);

  return {
    inputs,
    issues,
    canGeneratePlan: true,
    overall: built.overall,
    openings: built.openings,
    parts: built.parts,
    cutDiagrams: diagrams,
    materials: shoppingList(diagrams, built.parts, catalog),
    hardware: built.hardware,
    methods,
    tools: needed.tools,
    placements: built.placements,
    supplies: assembly.supplies,
    steps: assembly.steps,
  };
};
