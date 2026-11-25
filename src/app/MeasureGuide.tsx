import type { ReactNode } from 'react';
import { colorRoles } from '../engine/colorRoles';
import type { ColorRole, VanityDesign } from '../engine/types';

const hex = (role: ColorRole) => colorRoles.find((c) => c.role === role)?.hex ?? '#888888';

/** The number exactly as entered, with its unit mark. Never a typed-in dimension. */
const shown = (m: VanityDesign['width']) => `${m.entered}${m.unit === 'in' ? '"' : ' mm'}`;

function Bracket({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const horizontal = y1 === y2;
  const tick = 7;
  return (
    <g className="bracket">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {horizontal ? (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
        </>
      ) : (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
        </>
      )}
    </g>
  );
}

function Wall({ x }: { x: number }) {
  return (
    <g>
      <rect className="wall" x={x} y={40} width={14} height={200} />
      <text className="small" x={x + 7} y={34} textAnchor="middle">
        wall
      </text>
    </g>
  );
}

function View({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <figure>
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 340 262" role="img" aria-label={label}>
        <line className="floor" x1={0} y1={240} x2={340} y2={240} />
        {children}
      </svg>
    </figure>
  );
}

/**
 * Shows what width, depth and height each include (docs/RULES.md, rule G2).
 * A diagram of meaning, not to scale: the only numbers on it are the three
 * the user entered.
 */
export function MeasureGuide({ design }: { design: VanityDesign }) {
  const width = shown(design.width);
  const depth = shown(design.depth);
  const height = shown(design.height);
  const leftWall = design.overrides.ends?.left?.value === 'wall';

  return (
    <div className="guide">
      <View
        title="From the front"
        label={`Front view. Width ${width} is the whole cabinet from end to end. Height ${height} is the box only.`}
      >
        {leftWall && <Wall x={10} />}
        <rect className="top" x={24} y={84} width={222} height={16} />
        <text className="small" x={132} y={78} textAnchor="middle">
          top (not included)
        </text>
        <rect x={24} y={100} width={216} height={116} fill={hex('faceFrame')} />
        <rect x={32} y={110} width={44} height={96} fill={hex('drawerFront')} />
        <rect x={84} y={110} width={44} height={96} fill={hex('door')} />
        <rect x={136} y={110} width={44} height={96} fill={hex('door')} />
        <rect x={188} y={110} width={44} height={96} fill={hex('drawerFront')} />
        <rect x={24} y={216} width={192} height={24} fill={hex('platform')} />
        <text className="small" x={120} y={258} textAnchor="middle">
          platform (not included)
        </text>
        <Bracket x1={24} y1={56} x2={240} y2={56} />
        <text className="dim" x={132} y={48} textAnchor="middle">
          Width {width}
        </text>
        <Bracket x1={258} y1={100} x2={258} y2={216} />
        <text className="dim" x={270} y={152}>
          <tspan x={270}>Height</tspan>
          <tspan x={270} dy={22}>
            {height}
          </tspan>
        </text>
      </View>

      <View
        title="From the side"
        label={`Side view. Depth ${depth} runs from the wall to the front of the face frame. Doors stick out further.`}
      >
        <Wall x={10} />
        <rect className="top" x={24} y={84} width={196} height={16} />
        <rect className="box" x={24} y={100} width={160} height={116} />
        <text className="small" x={104} y={162} textAnchor="middle">
          box
        </text>
        <rect x={184} y={100} width={12} height={116} fill={hex('faceFrame')} />
        <rect className="outside" x={196} y={106} width={10} height={104} stroke={hex('door')} />
        <rect x={24} y={216} width={136} height={24} fill={hex('platform')} />
        <Bracket x1={24} y1={56} x2={196} y2={56} />
        <text className="dim" x={110} y={48} textAnchor="middle">
          Depth {depth}
        </text>
        <line className="leader" x1={190} y1={100} x2={236} y2={78} />
        <text className="small" x={240} y={76}>
          <tspan x={240}>face frame</tspan>
          <tspan x={240} dy={16}>
            (included)
          </tspan>
        </text>
        <line className="leader" x1={206} y1={160} x2={236} y2={160} />
        <text className="small" x={240} y={156}>
          <tspan x={240}>door</tspan>
          <tspan x={240} dy={16}>
            (not included)
          </tspan>
        </text>
      </View>

      <dl className="includes">
        <dt>Width {width}</dt>
        <dd>
          The whole cabinet from end to end{leftWall ? ', starting at the wall' : ''}. This is the space it takes
          along the wall.
        </dd>
        <dt>Depth {depth}</dt>
        <dd>
          From the wall to the front of the face frame. Doors, drawer fronts and handles stick out a little
          further.
        </dd>
        <dt>Height {height}</dt>
        <dd>The box only. The platform underneath and the top are added on.</dd>
      </dl>
      <p className="note">Pictures show what each number means. They are not to scale.</p>
    </div>
  );
}
