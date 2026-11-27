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
  const pad = plan.run ? width / 16 : 24;
  const frame = colorOf('faceFrame');
  const fontSize = plan.run ? width / 32 : width / 20;

  return (
    <figure className="frontView">
      <figcaption>{plan.run ? 'The run from the front, to scale' : 'Front of the cabinet, to scale'}</figcaption>
      <svg
        viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}`}
        role="img"
        aria-label={`Front view: ${plan.openings.map((o) => `${o.label}, front ${fmt(o.frontWidth)} by ${fmt(o.frontHeight)}`).join('; ')}.`}
      >
        {plan.run ? (
          <>
            {plan.run.cabinets.map((c) => (
              <g key={c.id}>
                <rect x={u(c.left)} y={0} width={u(c.width)} height={height} fill={frame.hex} stroke="#000000" strokeWidth={2} />
                <text x={u(c.left) + u(c.width) / 2} y={-pad * 0.35} textAnchor="middle" fontSize={fontSize} fontWeight={700} className="runLabel">
                  {c.id}
                </text>
              </g>
            ))}
            {plan.run.spaces.map((s) => (
              <rect key={s.itemId} x={u(s.left)} y={0} width={u(s.width)} height={height} className="applianceSpace" />
            ))}
          </>
        ) : (
          <rect x={0} y={0} width={width} height={height} fill={frame.hex} />
        )}
        {plan.openings.map((o) => {
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
      {plan.run ? (
        <>
          <ul className="frontSizes">
            {[...plan.run.cabinets.map((c) => ({ left: c.left, text: `${c.id} ${c.name}`, width: c.width })), ...plan.run.spaces.map((s) => ({ left: s.left, text: s.name, width: s.width }))]
              .sort((a, b) => a.left - b.left)
              .map((item) => (
                <li key={item.left}>
                  <strong>{item.text}</strong>: {fmt(item.width)} wide
                </li>
              ))}
          </ul>
          <p className="note">Dashed boxes are spaces for appliances. Each cabinet has its own frame.</p>
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
