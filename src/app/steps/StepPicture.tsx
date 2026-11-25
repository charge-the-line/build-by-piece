import type { Placement, PlanResult, Step } from '../../engine/types';
import { incrementTicks } from '../../engine/units';
import { colorOf } from '../format';

// One drawing unit is one tape mark. The view looks at the front of the
// cabinet from slightly above and to the right; depth runs back and to the left.
const mark = incrementTicks('1/16in');
const DEPTH_X = -0.36;
const DEPTH_Y = -0.3;

interface Solid {
  readonly place: Placement;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z0: number;
  readonly z1: number;
}

const solid = (p: Placement): Solid => ({
  place: p,
  x0: p.x / mark,
  x1: (p.x + p.sizeX) / mark,
  y0: p.y / mark,
  y1: (p.y + p.sizeY) / mark,
  z0: p.z / mark,
  z1: (p.z + p.sizeZ) / mark,
});

/** Where a point in the cabinet lands on the page, given the front-most depth. */
const project = (zFront: number, x: number, y: number, z: number) => [x + (zFront - z) * DEPTH_X, -y + (zFront - z) * DEPTH_Y] as const;

/**
 * Draw order, so nearer pieces cover farther ones. Two pieces only need
 * ordering if they overlap on the page; the one in front, above or to the
 * right of the other is nearer to the viewer and is drawn later.
 */
function backToFront(solids: readonly Solid[], zFront: number): Solid[] {
  const onPage = solids.map((s) => {
    const points = [s.x0, s.x1].flatMap((x) => [s.y0, s.y1].flatMap((y) => [s.z0, s.z1].map((z) => project(zFront, x, y, z))));
    return {
      left: Math.min(...points.map((p) => p[0])),
      right: Math.max(...points.map((p) => p[0])),
      top: Math.min(...points.map((p) => p[1])),
      bottom: Math.max(...points.map((p) => p[1])),
    };
  });
  const touch = (i: number, j: number) => {
    const [a, b] = [onPage[i]!, onPage[j]!];
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  };
  const before = (a: Solid, b: Solid): boolean | undefined => {
    if (a.z1 <= b.z0) return true;
    if (b.z1 <= a.z0) return false;
    if (a.y1 <= b.y0) return true;
    if (b.y1 <= a.y0) return false;
    if (a.x1 <= b.x0) return true;
    if (b.x1 <= a.x0) return false;
    return undefined;
  };
  const waiting = solids.map(() => 0);
  const after: number[][] = solids.map(() => []);
  solids.forEach((a, i) => {
    for (let j = i + 1; j < solids.length; j += 1) {
      if (!touch(i, j)) continue;
      const order = before(a, solids[j]!);
      if (order === undefined) continue;
      const [first, second] = order ? [i, j] : [j, i];
      after[first]!.push(second);
      waiting[second]! += 1;
    }
  });
  // Among pieces free to be drawn, take the one farthest back first.
  const ready = solids.map((_, i) => i).filter((i) => waiting[i] === 0);
  const ordered: number[] = [];
  const drawn = new Set<number>();
  while (ordered.length < solids.length) {
    if (ready.length === 0) {
      // A tangle the rule cannot order: release the farthest-back piece still waiting.
      const stuck = solids.map((_, i) => i).filter((i) => !drawn.has(i));
      ready.push(stuck.reduce((best, i) => (solids[i]!.z1 < solids[best]!.z1 ? i : best)));
    }
    ready.sort((i, j) => solids[i]!.z1 - solids[j]!.z1 || solids[i]!.y1 - solids[j]!.y1);
    const i = ready.shift()!;
    if (drawn.has(i)) continue;
    drawn.add(i);
    ordered.push(i);
    for (const j of after[i]!) {
      waiting[j]! -= 1;
      if (waiting[j] === 0 && !drawn.has(j)) ready.push(j);
    }
  }
  return ordered.map((i) => solids[i]!);
}

function mix(hex: string, towards: number, amount: number): string {
  const channel = (i: number) => {
    const value = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(value + (towards - value) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

const MUTED = '#d5d9df';

export function StepPicture({ plan, step, title }: { plan: PlanResult; step: Step; title: string }) {
  const all = plan.placements.map(solid);
  const zFront = Math.max(...all.map((s) => s.z1));
  const point = (x: number, y: number, z: number) => project(zFront, x, y, z);
  const path = (corners: readonly (readonly [number, number])[]) => `M ${corners.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;

  // The same frame for every step, so pieces stay put from one picture to the next.
  const corners = all.flatMap((s) => [point(s.x0, s.y0, s.z0), point(s.x1, s.y1, s.z0), point(s.x0, s.y0, s.z1), point(s.x1, s.y1, s.z1), point(s.x1, s.y0, s.z0), point(s.x0, s.y1, s.z1)]);
  const minX = Math.min(...corners.map((c) => c[0]));
  const maxX = Math.max(...corners.map((c) => c[0]));
  const minY = Math.min(...corners.map((c) => c[1]));
  const maxY = Math.max(...corners.map((c) => c[1]));
  const pad = 16;

  const current = new Set<string>(step.partIds);
  const earlier = new Set<string>(step.earlierPartIds);
  const partOf = new Map(plan.parts.map((p) => [p.id, p]));

  const draw = (s: Solid, highlighted: boolean) => {
    const base = highlighted ? colorOf(partOf.get(s.place.partId)!.colorRole).hex : MUTED;
    const faces = [
      // top
      { d: path([point(s.x0, s.y1, s.z1), point(s.x1, s.y1, s.z1), point(s.x1, s.y1, s.z0), point(s.x0, s.y1, s.z0)]), fill: mix(base, 255, 0.35) },
      // right end
      { d: path([point(s.x1, s.y0, s.z1), point(s.x1, s.y1, s.z1), point(s.x1, s.y1, s.z0), point(s.x1, s.y0, s.z0)]), fill: mix(base, 0, 0.22) },
      // front
      { d: path([point(s.x0, s.y0, s.z1), point(s.x1, s.y0, s.z1), point(s.x1, s.y1, s.z1), point(s.x0, s.y1, s.z1)]), fill: base },
    ];
    return (
      <g key={`${s.place.partId}-${s.place.copy}`} className={highlighted ? 'now' : 'before'}>
        {faces.map((face, i) => (
          <path key={i} d={face.d} fill={face.fill} />
        ))}
      </g>
    );
  };

  const now = backToFront(all.filter((s) => current.has(s.place.partId)), zFront);
  const before = backToFront(all.filter((s) => earlier.has(s.place.partId)), zFront);

  // One label per part number, on its first piece, so a busy step stays readable.
  const fontSize = (maxX - minX) / 26;
  const labelled = now.filter((s) => s.place.copy === 1);

  return (
    <svg
      className="stepPicture"
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`}
      role="img"
      aria-label={`${title}. Highlighted: ${[...current].join(', ')}. The parts are listed below.`}
    >
      {before.map((s) => draw(s, false))}
      {now.map((s) => draw(s, true))}
      {labelled.map((s) => {
        const [x, y] = point((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, s.z1);
        return (
          <text key={`label-${s.place.partId}`} x={x} y={y} fontSize={fontSize} textAnchor="middle" dominantBaseline="central" className="stepLabel">
            {s.place.partId}
          </text>
        );
      })}
    </svg>
  );
}
