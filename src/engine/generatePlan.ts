/**
 * The engine's front door: a design, the defaults and a catalog go in;
 * inputs, issues, openings, parts, materials and hardware come out.
 * Pure TypeScript: no UI, DOM or network.
 */
import { layOut } from './layout';
import { shoppingList } from './materials';
import { resolveVanity } from './resolve';
import type { GeneratePlan, PlanResult } from './types';
import { buildVanity, toeKickIssue } from './vanity';

const blocked = (base: Pick<PlanResult, 'inputs' | 'issues'>): PlanResult => ({
  ...base,
  canGeneratePlan: false,
  openings: [],
  parts: [],
  materials: [],
  hardware: [],
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

  const built = buildVanity(resolved, layout.bays);
  const issues = [...inputIssues, ...layout.issues, ...built.issues];
  if (issues.some((issue) => issue.severity === 'error')) return blocked({ inputs, issues });

  return {
    inputs,
    issues,
    canGeneratePlan: true,
    overall: built.overall,
    openings: built.openings,
    parts: built.parts,
    materials: shoppingList(built.parts, catalog, resolved.kerf.value),
    hardware: built.hardware,
    // Assembly steps arrive in Phase 3.
    steps: [],
  };
};
