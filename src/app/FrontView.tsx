import type { PlanResult } from '../engine/types';
import { incrementTicks } from '../engine/units';
import { colorOf, fmt } from './format';

/**
 * The front of the cabinet, drawn to scale from the engine's openings.
 * Every position and every printed size comes from the plan.
 */
export function FrontView({ plan, wall = 1 }: { plan: PlanResult; wall?: 1 | 2 }) {
  if (!plan.overall) return null;
  // With a corner, each wall is drawn on its own, as she faces it.
  const second = wall === 2 ? plan.run?.second : undefined;
  const row = second ?? plan.run;
  const openings = plan.run?.second ? plan.openings.filter((o) => (o.wall === 2) === (wall === 2)) : plan.openings;
  // One drawing unit is one tape mark, so shapes stay exact whole numbers.
  const mark = incrementTicks('1/16in');
  const u = (ticks: number) => ticks / mark;
  const width = u(second ? second.length : plan.overall.frameWidth);
  const height = u(plan.run ? plan.run.pictureHeight : plan.overall.frameHeight);
  const pad = plan.run ? width / 16 : 24;
  const frame = colorOf('faceFrame');
  const fontSize = plan.run ? width / 32 : width / 20;

  return (
    <figure className="frontView">
      <figcaption>{plan.run?.second ? (wall === 2 ? 'The second wall from the front, to scale' : 'The first wall from the front, to scale') : plan.run ? 'The run from the front, to scale' : 'Front of the cabinet, to scale'}</figcaption>
      <svg
        viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}`}
        role="img"
        aria-label={`Front view: ${openings.map((o) => `${o.label}, front ${fmt(o.frontWidth)} by ${fmt(o.frontHeight)}`).join('; ')}.`}
      >
        {plan.run && row ? (
          <>
            {[...row.cabinets, ...row.uppers].map((c) => (
              <g key={c.id}>
                <rect x={u(c.left)} y={u(c.fromTop)} width={u(c.width)} height={u(c.height)} fill={frame.hex} stroke="#000000" strokeWidth={2} />
                {/* Upper numbers go above the picture, base numbers below the floor. */}
                <text x={u(c.left) + u(c.width) / 2} y={c.row === 'upper' ? -pad * 0.3 : height + pad * 0.85} textAnchor="middle" fontSize={fontSize} fontWeight={700} className="runLabel">
                  {c.id}
                </text>
              </g>
            ))}
            {row.spaces.map((s) => (
              <rect key={s.itemId} x={u(s.left)} y={u(s.fromTop)} width={u(s.width)} height={u(s.height)} className="applianceSpace" />
            ))}
            <line x1={-pad} x2={width + pad} y1={height} y2={height} className="floorLine" />
          </>
        ) : (
          <rect x={0} y={0} width={width} height={height} fill={frame.hex} />
        )}
        {openings.map((o) => {
          const color = colorOf(o.kind === 'door' ? 'door' : 'drawerFront');
          const x = u(o.frontLeft);
          const y = u(o.frontTop);
          const w = u(o.frontWidth);
          const h = u(o.frontHeight);
          return (
            <g key={o.id}>
              <rect x={x} y={y} width={w} height={h} fill={color.hex} stroke="#000000" strokeWidth={2} />
              {!plan.run && (
                <text x={x + w / 2} y={y + h / 2 + fontSize * 0.35} textAnchor="middle" fontSize={fontSize} fontWeight={700} fill={color.textHex}>
                  {o.partIds[0]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {plan.run && row ? (
        <>
          <ul className="frontSizes">
            {[
              ...row.uppers.map((c) => ({ row: 0, left: c.left, text: `${c.id} ${c.name}`, width: c.width })),
              ...row.cabinets.map((c) => ({ row: 1, left: c.left, text: `${c.id} ${c.name}`, width: c.width })),
              ...row.spaces.map((s) => ({ row: 1, left: s.left, text: s.name, width: s.width })),
            ]
              .sort((a, b) => a.row - b.row || a.left - b.left)
              .map((item) => (
                <li key={`${item.row}-${item.left}`}>
                  <strong>{item.text}</strong>: {fmt(item.width)} wide
                </li>
              ))}
          </ul>
          <p className="note">
            Dashed boxes are spaces for appliances. Each cabinet has its own frame.
            {plan.run.upperBottom && wall === 1 ? ` The upper cabinets start ${fmt(plan.run.upperBottom.result)} above the floor.` : ''}
          </p>
        </>
      ) : (
        <>
          <ul className="frontSizes">
            {plan.openings.map((o) => (
              <li key={o.id}>
                <strong>{o.partIds[0]}</strong> {o.label}: {fmt(o.frontWidth)} wide × {fmt(o.frontHeight)} high
              </li>
            ))}
          </ul>
          <p className="note">{frame.colorName.charAt(0).toUpperCase() + frame.colorName.slice(1)} is the face frame. Each door and drawer front shows its first part number.</p>
        </>
      )}
    </figure>
  );
}

/**
 * Both walls of a corner from above, to scale, drawn from the engine's floor
 * boxes. The thick lines are the walls.
 */
export function FloorView({ plan }: { plan: PlanResult }) {
  const floor = plan.run?.fromAbove;
  const second = plan.run?.second;
  if (!floor || !second) return null;
  const mark = incrementTicks('1/16in');
  const u = (ticks: number) => ticks / mark;
  const width = u(floor.width);
  const depth = u(floor.depth);
  const pad = width / 16;
  const frame = colorOf('faceFrame');
  const wallX = second.side === 'right' ? width : 0;
  return (
    <figure className="frontView">
      <figcaption>Both walls from above, to scale</figcaption>
      <svg viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${depth + 2 * pad}`} role="img" aria-label={`From above: ${floor.boxes.map((b) => b.label).join(', ')}.`}>
        {floor.boxes.map((b) =>
          b.kind === 'space' ? (
            <rect key={b.label + b.x + b.z} x={u(b.x)} y={u(b.z)} width={u(b.sizeX)} height={u(b.sizeZ)} className="applianceSpace" />
          ) : (
            <g key={b.label}>
              <rect x={u(b.x)} y={u(b.z)} width={u(b.sizeX)} height={u(b.sizeZ)} fill={frame.hex} stroke="#000000" strokeWidth={2} />
              <text x={u(b.x) + u(b.sizeX) / 2} y={u(b.z) + u(b.sizeZ) / 2 + width / 96} textAnchor="middle" fontSize={width / 32} fontWeight={700} fill={frame.textHex}>
                {b.label}
              </text>
            </g>
          ),
        )}
        <line x1={0} x2={width} y1={0} y2={0} className="wallLine" />
        <line x1={wallX} x2={wallX} y1={0} y2={depth} className="wallLine" />
      </svg>
      <p className="note">The thick lines are the walls. The first wall is along the top; you stand below it, looking up the page.</p>
    </figure>
  );
}
