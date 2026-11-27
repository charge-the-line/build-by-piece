import type { PlanResult } from '../engine/types';
import { incrementTicks } from '../engine/units';
import { colorOf, fmt } from './format';

/**
 * The front of the cabinet, drawn to scale from the engine's openings.
 * Every position and every printed size comes from the plan.
 */
export function FrontView({ plan }: { plan: PlanResult }) {
  if (!plan.overall) return null;
  // One drawing unit is one tape mark, so shapes stay exact whole numbers.
  const mark = incrementTicks('1/16in');
  const u = (ticks: number) => ticks / mark;
  const width = u(plan.overall.frameWidth);
  const height = u(plan.overall.frameHeight);
  const pad = 24;
  const frame = colorOf('faceFrame');
  const fontSize = width / 20;

  return (
    <figure className="frontView">
      <figcaption>Front of the cabinet, to scale</figcaption>
      <svg
        viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}`}
        role="img"
        aria-label={`Front view: ${plan.openings.map((o) => `${o.label}, front ${fmt(o.frontWidth)} by ${fmt(o.frontHeight)}`).join('; ')}.`}
      >
        <rect x={0} y={0} width={width} height={height} fill={frame.hex} />
        {plan.openings.map((o) => {
          const color = colorOf(o.kind === 'door' ? 'door' : 'drawerFront');
          const x = u(o.frontLeft);
          const y = u(o.frontTop);
          const w = u(o.frontWidth);
          const h = u(o.frontHeight);
          return (
            <g key={o.id}>
              <rect x={x} y={y} width={w} height={h} fill={color.hex} stroke="#000000" strokeWidth={2} />
              <text x={x + w / 2} y={y + h / 2 + fontSize * 0.35} textAnchor="middle" fontSize={fontSize} fontWeight={700} fill={color.textHex}>
                {o.partIds[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="frontSizes">
        {plan.openings.map((o) => (
          <li key={o.id}>
            <strong>{o.partIds[0]}</strong> {o.label}: {fmt(o.frontWidth)} wide × {fmt(o.frontHeight)} high
          </li>
        ))}
      </ul>
      <p className="note">{frame.colorName.charAt(0).toUpperCase() + frame.colorName.slice(1)} is the face frame. Each door and drawer front shows its first part number.</p>
    </figure>
  );
}
