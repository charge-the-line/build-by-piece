import { defaultCatalog } from '../defaults/catalog';
import { vanityDefaults } from '../defaults/vanity';
import { userEntered } from '../defaults/values';
import { vanity01 } from '../fixtures/vanity-01';
import { generatePlan } from '../generatePlan';
import { expect } from 'vitest';
import type { Overrides, Part, Placement, PlanResult, Ticks, VanityDesign, VanityOptions } from '../types';
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

export const nameOf = (r: PlanResult, id: string) => r.parts.find((p) => p.id === id)!.name;
const name = nameOf;

const overlap = (a: Placement, b: Placement) =>
  a.x < b.x + b.sizeX && b.x < a.x + a.sizeX && a.y < b.y + b.sizeY && b.y < a.y + a.sizeY && a.z < b.z + b.sizeZ && b.z < a.z + a.sizeZ;

/** Everything valid placements must satisfy, for any plan. */
export function checkPlacements(r: PlanResult, context = '') {
  expect(r.issues.filter((i) => i.severity === 'error').map((i) => i.explanation), `${context} builds`).toEqual([]);
  const expected = r.parts.flatMap((p) => Array.from({ length: p.quantity }, (_, i) => `${p.id}#${i + 1}`)).sort();
  expect(r.placements.map((p) => `${p.partId}#${p.copy}`).sort(), `${context} every piece placed once`).toEqual(expected);

  for (const place of r.placements) {
    const p = r.parts.find((x) => x.id === place.partId)!;
    const asPlaced = [place.sizeX, place.sizeY, place.sizeZ].sort((a, b) => a - b);
    const asCut = [p.thickness, p.length, p.width].sort((a, b) => a - b);
    expect(asPlaced, `${context} ${p.name} is placed at its cut size`).toEqual(asCut);
    expect(Math.min(place.x, place.y, place.z), `${context} ${p.name} is inside the room`).toBeGreaterThanOrEqual(0);
    expect(place.x + place.sizeX, `${context} ${p.name} stays within the cabinet width`).toBeLessThanOrEqual(r.overall!.frameWidth);
  }

  // No two pieces may occupy the same space. The one exception is a centre
  // panel, which sits in a groove cut into the frame pieces around it.
  const inGroove = (a: string, b: string) => {
    const [na, nb] = [name(r, a), name(r, b)];
    const same = na.split(':')[0] === nb.split(':')[0];
    return same && (na.endsWith('centre panel') || nb.endsWith('centre panel'));
  };
  r.placements.forEach((a, i) => {
    for (const b of r.placements.slice(i + 1)) {
      if (inGroove(a.partId, b.partId)) continue;
      expect(overlap(a, b), `${context} ${name(r, a.partId)} #${a.copy} and ${name(r, b.partId)} #${b.copy} share space`).toBe(false);
    }
  });
}

