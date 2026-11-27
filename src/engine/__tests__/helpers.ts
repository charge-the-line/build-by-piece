import { defaultCatalog } from '../defaults/catalog';
import { vanityDefaults } from '../defaults/vanity';
import { userEntered } from '../defaults/values';
import { vanity01 } from '../fixtures/vanity-01';
import { generatePlan } from '../generatePlan';
import type { Overrides, Part, PlanResult, Ticks, VanityDesign, VanityOptions } from '../types';
import { parseLength } from '../units';

/** Inches as a person would type them, to exact ticks. */
export function inches(entered: string): Ticks {
  const parsed = parseLength(entered, 'in');
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.ticks;
}

export const plan = (design: VanityDesign = vanity01): PlanResult => generatePlan(design, vanityDefaults, defaultCatalog);

/** Vanity 01 with different numbers and/or extra changes to the defaults. */
export function vanityWith(
  change: { width?: string; depth?: string; height?: string } = {},
  overrides: Overrides<VanityOptions> = {},
): VanityDesign {
  return {
    ...vanity01,
    ...(change.width ? { width: userEntered(change.width) } : {}),
    ...(change.depth ? { depth: userEntered(change.depth) } : {}),
    ...(change.height ? { height: userEntered(change.height) } : {}),
    overrides: mergeChanges(vanity01.overrides, overrides) as Overrides<VanityOptions>,
  };
}

/** Lays one set of changes over another, replacing whole values (a measurement, a choice, a list). */
function mergeChanges(base: unknown, changes: unknown): unknown {
  const isGroup = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) && !('status' in v);
  if (!isGroup(base) || !isGroup(changes)) return changes;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(changes)) merged[key] = key in merged ? mergeChanges(merged[key], value) : value;
  return merged;
}

export function part(result: PlanResult, name: string): Part {
  const found = result.parts.filter((p) => p.name === name);
  if (found.length !== 1) throw new Error(`Expected one part named "${name}", found ${found.length}`);
  return found[0]!;
}

/** Length x width of a part, in typed inches, for readable assertions. */
export const size = (p: Part) => ({ length: p.length, width: p.width });
export const sized = (length: string, width: string) => ({ length: inches(length), width: inches(width) });

/** Errors and warnings, leaving out "buy or borrow" notes about tools. */
export const problems = (r: PlanResult) => r.issues.filter((i) => i.severity !== 'info');
