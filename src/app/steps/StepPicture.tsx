import type { Direction, Patch, Placement, PlanResult, Step } from '../../engine/types';
import { incrementTicks } from '../../engine/units';
import { colorOf } from '../format';

// One drawing unit is one tape mark. The view looks at the front of the
// cabinet from slightly above and to the right; depth runs back and to the left.
const mark = incrementTicks('1/16in');
const DEPTH_X = -0.36;
const DEPTH_Y = -0.3;

interface Solid {
  readonly place: Placement;
  /** Which way it is travelling into place, when drawn pulled apart. */
  readonly from: Direction;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z0: number;
  readonly z1: number;
}

/** How far, and which way, a piece is pulled back from its place. */
const PULL: Readonly<Record<Direction, readonly [number, number, number]>> = {
  left: [-1, 0, 0],
  right: [1, 0, 0],
  above: [0, 1, 0],
  below: [0, -1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
  none: [0, 0, 0],
};

/**
 * Seen from the back, left and right swap and so do front and back. Turning
 * the scene round (rather than the camera) keeps one way of drawing.
 */
const turn = (flip: boolean, low: number, size: number): readonly [number, number] => (flip ? [-(low + size) / mark, -low / mark] : [low / mark, (low + size) / mark]);

const solid = (p: Placement, from: Direction = 'none', pull = 0, flip = false): Solid => {
  const [dx, dy, dz] = PULL[from];
  const sign = flip ? -1 : 1;
  const [x0, x1] = turn(flip, p.x, p.sizeX);
  const [z0, z1] = turn(flip, p.z, p.sizeZ);
  return {
    place: p,
    from,
    x0: x0 + sign * dx * pull,
    x1: x1 + sign * dx * pull,
    y0: p.y / mark + dy * pull,
    y1: (p.y + p.sizeY) / mark + dy * pull,
    z0: z0 + sign * dz * pull,
    z1: z1 + sign * dz * pull,
  };
};

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
const keyOf = (ref: { partId: string; copy: number }) => `${ref.partId}#${ref.copy}`;

interface Props {
  readonly plan: PlanResult;
  readonly step: Step;
  readonly title: string;
  /** before: new pieces pulled back, with arrows, glue and screws. after: everything in place. */
  readonly mode: 'before' | 'after';
}

export function StepPicture({ plan, step, title, mode }: Props) {
  const placeOf = new Map(plan.placements.map((p) => [keyOf(p), p]));
  const partOf = new Map(plan.parts.map((p) => [p.id, p]));
  const earlierPlaces = step.earlierPieces.map((ref) => placeOf.get(keyOf(ref))!);
  const newPlaces = step.pieces.map((piece) => ({ piece, place: placeOf.get(keyOf(piece))! }));

  // The frame of the picture: the whole cabinet for a step done in place, or
  // just the sub-assembly for one built on the bench.
  const whole = step.cabinet ? plan.placements.filter((p) => p.partId.startsWith(`${step.cabinet!.id}-`)) : plan.placements;
  const framed = step.scene === 'cabinet' ? whole : [...earlierPlaces, ...newPlaces.map((n) => n.place)];
  const extent = (lowKey: 'x' | 'y' | 'z', sizeKey: 'sizeX' | 'sizeY' | 'sizeZ') =>
    Math.max(...framed.map((p) => p[lowKey] + p[sizeKey])) / mark - Math.min(...framed.map((p) => p[lowKey])) / mark;
  const span = Math.max(extent('x', 'sizeX'), extent('y', 'sizeY'), extent('z', 'sizeZ'));
  const pull = span * 0.28;

  const flip = step.view === 'back';
  const inPlace = newPlaces.map((n) => solid(n.place, n.piece.from, 0, flip));
  const pulled = newPlaces.map((n) => solid(n.place, n.piece.from, pull, flip));
  const now = mode === 'before' ? pulled : inPlace;
  const before = earlierPlaces.map((p) => solid(p, 'none', 0, flip));

  // One depth reference and one frame for both pictures of a step, so nothing jumps.
  const everything = [...framed.map((p) => solid(p, 'none', 0, flip)), ...pulled];
  const zFront = Math.max(...everything.map((s) => s.z1));
  const point = (x: number, y: number, z: number) => project(zFront, x, y, z);
  const path = (corners: readonly (readonly [number, number])[]) => `M ${corners.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
  const corners = everything.flatMap((s) => [s.x0, s.x1].flatMap((x) => [s.y0, s.y1].flatMap((y) => [s.z0, s.z1].map((z) => point(x, y, z)))));
  const minX = Math.min(...corners.map((c) => c[0]));
  const maxX = Math.max(...corners.map((c) => c[0]));
  const minY = Math.min(...corners.map((c) => c[1]));
  const maxY = Math.max(...corners.map((c) => c[1]));
  const width = maxX - minX;
  const pad = width * 0.04;
  const line = width / 220;

  const draw = (s: Solid, highlighted: boolean) => {
    const base = highlighted ? colorOf(partOf.get(s.place.partId)!.colorRole).hex : MUTED;
    const faces = [
      { d: path([point(s.x0, s.y1, s.z1), point(s.x1, s.y1, s.z1), point(s.x1, s.y1, s.z0), point(s.x0, s.y1, s.z0)]), fill: mix(base, 255, 0.35) },
      { d: path([point(s.x1, s.y0, s.z1), point(s.x1, s.y1, s.z1), point(s.x1, s.y1, s.z0), point(s.x1, s.y0, s.z0)]), fill: mix(base, 0, 0.22) },
      { d: path([point(s.x0, s.y0, s.z1), point(s.x1, s.y0, s.z1), point(s.x1, s.y1, s.z1), point(s.x0, s.y1, s.z1)]), fill: base },
    ];
    return (
      <g key={keyOf(s.place)} className={highlighted ? 'now' : 'before'} strokeWidth={highlighted ? line * 1.4 : line * 0.7}>
        {faces.map((face, i) => (
          <path key={i} d={face.d} fill={face.fill} />
        ))}
      </g>
    );
  };

  /** A flat patch of glue, drawn where the pieces will meet. */
  const gluePath = (g: Patch) => {
    const [x0, x1] = turn(flip, g.x, g.sizeX);
    const [z0, z1] = turn(flip, g.z, g.sizeZ);
    const [y0, y1] = [g.y / mark, (g.y + g.sizeY) / mark];
    if (g.sizeX === 0) return path([point(x0, y0, z0), point(x0, y1, z0), point(x0, y1, z1), point(x0, y0, z1)]);
    if (g.sizeY === 0) return path([point(x0, y0, z0), point(x1, y0, z0), point(x1, y0, z1), point(x0, y0, z1)]);
    return path([point(x0, y0, z0), point(x1, y0, z0), point(x1, y1, z0), point(x0, y1, z0)]);
  };

  // One arrow for each direction pieces arrive from, from where they wait to where they go.
  const arrows = (['left', 'right', 'above', 'below', 'front', 'back'] as const).flatMap((direction) => {
    const waiting = pulled.filter((s) => s.from === direction);
    if (waiting.length === 0 || mode === 'after') return [];
    const home = inPlace.filter((s) => s.from === direction);
    const centre = (solids: readonly Solid[]) => {
      const mid = (a: 'x0' | 'y0' | 'z0', b: 'x1' | 'y1' | 'z1') => solids.reduce((sum, s) => sum + (s[a] + s[b]) / 2, 0) / solids.length;
      return point(mid('x0', 'x1'), mid('y0', 'y1'), mid('z0', 'z1'));
    };
    const [fromX, fromY] = centre(waiting);
    const [toX, toY] = centre(home);
    // Stop a little short, so the arrow head sits clear of where the piece lands.
    const [endX, endY] = [fromX + (toX - fromX) * 0.8, fromY + (toY - fromY) * 0.8];
    return [{ direction, fromX, fromY, endX, endY }];
  });

  const distinctParts = new Set(step.pieces.map((p) => p.partId));
  const fontSize = width / 24;
  const labelled = distinctParts.size <= 8 ? now.filter((s) => s.place.copy === Math.min(...step.pieces.filter((p) => p.partId === s.place.partId).map((p) => p.copy))) : [];
  const markerId = `arrow-${step.id}`;

  return (
    <svg
      className="stepPicture"
      viewBox={`${minX - pad} ${minY - pad} ${width + 2 * pad} ${maxY - minY + 2 * pad}`}
      role="img"
      aria-label={mode === 'before' ? `${title}: how the pieces go together. Pieces: ${[...distinctParts].join(', ')}.` : `${title}: what it looks like when it is done.`}
    >
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="arrowHead" />
        </marker>
      </defs>
      {backToFront(before, zFront).map((s) => draw(s, false))}
      {mode === 'before' && step.glue.map((g, i) => <path key={`g${i}`} d={gluePath(g)} className="glue" strokeWidth={line} />)}
      {backToFront(now, zFront).map((s) => draw(s, true))}
      {mode === 'before' &&
        step.screws.map((p, i) => {
          const [x, y] = point(turn(flip, p.x, 0)[0], p.y / mark, turn(flip, p.z, 0)[0]);
          return <circle key={`s${i}`} cx={x} cy={y} r={line * 3.2} className="screwDot" strokeWidth={line * 1.2} />;
        })}
      {arrows.map((a) => (
        <g key={a.direction}>
          <line x1={a.fromX} y1={a.fromY} x2={a.endX} y2={a.endY} className="arrowHalo" strokeWidth={line * 9} />
          <line x1={a.fromX} y1={a.fromY} x2={a.endX} y2={a.endY} className="arrow" strokeWidth={line * 5} markerEnd={`url(#${markerId})`} />
        </g>
      ))}
      {labelled.map((s) => {
        const [x, y] = point((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, s.z1);
        return (
          <text key={`label-${keyOf(s.place)}`} x={x} y={y} fontSize={fontSize} strokeWidth={fontSize / 4} textAnchor="middle" dominantBaseline="central" className="stepLabel">
            {s.place.partId}
          </text>
        );
      })}
    </svg>
  );
}
