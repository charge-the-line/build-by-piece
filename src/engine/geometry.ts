/**
 * Where pieces meet, and where the screws go along a joint
 * (docs/RULES.md, rule J4). Whole ticks only.
 */
import type { Patch, Placement, Point3, Ticks } from './types';
import { asTicks } from './units';

type Axis = 'x' | 'y' | 'z';
const AXES: readonly Axis[] = ['x', 'y', 'z'];
const sizeKey = { x: 'sizeX', y: 'sizeY', z: 'sizeZ' } as const;

const low = (p: Placement, axis: Axis): number => p[axis];
const high = (p: Placement, axis: Axis): number => p[axis] + p[sizeKey[axis]];

/**
 * The rectangle where two pieces meet, if they do: either they touch face
 * to face, or one is let into the other (a panel in its recess or groove),
 * in which case it is the widest face of the part they share.
 */
export function contact(a: Placement, b: Placement): Patch | undefined {
  const from = { x: 0, y: 0, z: 0 };
  const size = { x: 0, y: 0, z: 0 };
  let flat: Axis | undefined;
  for (const axis of AXES) {
    const start = Math.max(low(a, axis), low(b, axis));
    const end = Math.min(high(a, axis), high(b, axis));
    if (end < start) return undefined; // apart along this axis
    if (end === start) {
      if (flat) return undefined; // only an edge or a corner in common
      flat = axis;
    }
    from[axis] = start;
    size[axis] = end - start;
  }
  if (!flat) {
    // Let in: flatten the shared block along its thinnest direction.
    flat = AXES.reduce((thinnest, axis) => (size[axis] < size[thinnest] ? axis : thinnest));
    size[flat] = 0;
  }
  return { x: asTicks(from.x), y: asTicks(from.y), z: asTicks(from.z), sizeX: asTicks(size.x), sizeY: asTicks(size.y), sizeZ: asTicks(size.z) };
}

export interface ScrewRule {
  /** A screw this far from each end of the joint. */
  readonly endInset: Ticks;
  /** No two screws further apart than this. */
  readonly spacing: Ticks;
}

/**
 * J4: screws along the length of a joint. One in the middle of a very short
 * joint; otherwise one near each end and enough between that none are
 * further apart than the spacing.
 */
export function screwsAlong(patch: Patch, rule: ScrewRule): Point3[] {
  const sizes = { x: patch.sizeX, y: patch.sizeY, z: patch.sizeZ };
  const long = AXES.reduce((longest, axis) => (sizes[axis] > sizes[longest] ? axis : longest));
  const length = sizes[long];
  const centre = { x: patch.x + Math.floor(patch.sizeX / 2), y: patch.y + Math.floor(patch.sizeY / 2), z: patch.z + Math.floor(patch.sizeZ / 2) };
  const at = (along: number): Point3 => {
    const point = { ...centre, [long]: patch[long] + along };
    return { x: asTicks(point.x), y: asTicks(point.y), z: asTicks(point.z) };
  };
  // Too short for two screws to sit clear of the ends.
  if (length < 2 * rule.endInset) {
    if (length < rule.endInset) return [at(Math.floor(length / 2))];
    const quarter = Math.floor(length / 4);
    return [at(quarter), at(length - quarter)];
  }
  const span = length - 2 * rule.endInset;
  const gaps = Math.max(1, Math.ceil(span / rule.spacing));
  return Array.from({ length: gaps + 1 }, (_, i) => at(rule.endInset + Math.floor((span * i) / gaps)));
}
