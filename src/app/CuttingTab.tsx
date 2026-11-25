import type { CutDiagram, CutStep, Part, PlanResult, VanityDesign } from '../engine/types';
import { formatLength, incrementTicks } from '../engine/units';
import { colorOf, fmt } from './format';
import { LengthField } from './LengthField';
import { withChange } from './project';

interface Props {
  readonly design: VanityDesign;
  readonly plan: PlanResult;
  readonly onChange: (design: VanityDesign) => void;
  /** On paper: no text boxes, and every cut list opened out. */
  readonly forPrint?: boolean;
}

// One drawing unit is one tape mark, so every shape is an exact whole number.
const mark = incrementTicks('1/16in');
const u = (ticks: number) => ticks / mark;

const HATCH = 'offcutHatch';

function Hatch() {
  return (
    <defs>
      <pattern id={HATCH} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="24" height="24" className="scrapFill" />
        <line x1="0" y1="0" x2="0" y2="24" className="scrapLine" />
      </pattern>
    </defs>
  );
}

/** A sheet, drawn to scale with its length running down the screen. */
function SheetPicture({ diagram, parts }: { diagram: CutDiagram; parts: ReadonlyMap<string, Part> }) {
  const width = u(diagram.stockWidth);
  const length = u(diagram.stockLength);
  const margin = 70;
  return (
    <svg viewBox={`${-margin} -10 ${width + margin + 10} ${length + 20}`} role="img" aria-label={`${diagram.title}: ${diagram.pieces.length} pieces. The cuts are listed below.`}>
      <Hatch />
      <rect x={0} y={0} width={width} height={length} className="stock" />
      {diagram.offcuts.map((o, i) => (
        <g key={`o${i}`}>
          <rect x={u(o.fromEdge)} y={u(o.fromEnd)} width={u(o.across)} height={u(o.along)} fill={`url(#${HATCH})`} className="offcut" />
          {o.label && (
            <text x={u(o.fromEdge) + u(o.across) / 2} y={u(o.fromEnd) + u(o.along) / 2 + 10} textAnchor="middle" className="offcutLabel" fontSize={30}>
              {o.label}
            </text>
          )}
        </g>
      ))}
      {diagram.pieces.map((p, i) => {
        const color = colorOf(parts.get(p.partId)!.colorRole);
        const w = u(p.across);
        const h = u(p.along);
        const cx = u(p.fromEdge) + w / 2;
        const cy = u(p.fromEnd) + h / 2;
        const turn = w < 110 && h > w;
        const room = turn ? w : Math.min(w * 0.4, h);
        const fontSize = Math.min(44, room * 0.8);
        return (
          <g key={`p${i}`}>
            <rect x={u(p.fromEdge)} y={u(p.fromEnd)} width={w} height={h} fill={color.hex} className="piece" />
            {fontSize >= 20 && (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={color.textHex} transform={turn ? `rotate(-90 ${cx} ${cy})` : undefined}>
                {p.partId}
              </text>
            )}
          </g>
        );
      })}
      {diagram.hasGrain && (
        <g className="grain">
          <line x1={-36} y1={40} x2={-36} y2={length - 40} />
          <path d={`M -48 60 L -36 36 L -24 60 M -48 ${length - 60} L -36 ${length - 36} L -24 ${length - 60}`} />
          <text x={-36} y={length / 2} textAnchor="middle" fontSize={30} transform={`rotate(-90 -36 ${length / 2})`} dy={-12}>
            grain runs this way
          </text>
        </g>
      )}
    </svg>
  );
}

/** A board, drawn to scale along its length. Its width is drawn larger so labels fit. */
function BoardPicture({ diagram, parts }: { diagram: CutDiagram; parts: ReadonlyMap<string, Part> }) {
  const length = u(diagram.stockLength);
  const height = 150;
  return (
    <svg viewBox={`-10 -10 ${length + 20} ${height + 20}`} role="img" aria-label={`${diagram.title}: ${diagram.pieces.length} pieces. The cuts are listed below.`}>
      <Hatch />
      <rect x={0} y={0} width={length} height={height} className="stock" />
      {diagram.offcuts.map((o, i) => (
        <g key={`o${i}`}>
          <rect x={u(o.fromEnd)} y={0} width={u(o.along)} height={height} fill={`url(#${HATCH})`} className="offcut" />
          {o.label && u(o.along) > 220 && (
            <text x={u(o.fromEnd) + u(o.along) / 2} y={height / 2} textAnchor="middle" dominantBaseline="central" className="offcutLabel" fontSize={56}>
              {o.label}
            </text>
          )}
        </g>
      ))}
      {diagram.pieces.map((p, i) => {
        const color = colorOf(parts.get(p.partId)!.colorRole);
        const w = u(p.along);
        return (
          <g key={`p${i}`}>
            <rect x={u(p.fromEnd)} y={0} width={w} height={height} fill={color.hex} className="piece" />
            {w >= 130 && (
              <text x={u(p.fromEnd) + w / 2} y={height / 2} textAnchor="middle" dominantBaseline="central" fontSize={60} fontWeight={700} fill={color.textHex}>
                {p.partId}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Written templates, filled in with this plan's numbers. */
function sentence(step: CutStep, diagram: CutDiagram, parts: ReadonlyMap<string, Part>, boardSaw: string): string {
  const size = fmt(step.measure);
  const part = step.partId ? parts.get(step.partId) : undefined;
  const named = part ? `${part.id} ${part.name}` : step.makes;
  if (step.kind === 'section') {
    return step.noCutNeeded
      ? `What is left of the sheet is ${step.makes}. No cut needed.`
      : `Measure ${size} from the end of the sheet and cut straight across, across the grain. This piece is ${step.makes}.`;
  }
  if (step.kind === 'strip') {
    return step.noCutNeeded
      ? `What is left of ${step.from} is ${step.makes}. No cut needed.`
      : step.from === 'the sheet'
        ? `Measure ${size} from the edge of the sheet and cut the full length, along the grain. This is ${step.makes}.`
        : `On ${step.from}, measure ${size} from the edge and cut along the grain. This is ${step.makes}.`;
  }
  if (diagram.kind === 'board') {
    return step.noCutNeeded
      ? `What is left of the board is ${named}. No cut needed.`
      : `Measure ${size} from the end and cut ${boardSaw}. This is ${named}.`;
  }
  return step.noCutNeeded
    ? `What is left of ${step.from} is ${size} long. It is ${named}. No cut needed.`
    : `Measure ${size} along ${step.from} and cut. This is ${named}.`;
}

function Diagram({ diagram, parts, open, boardSaw }: { diagram: CutDiagram; parts: ReadonlyMap<string, Part>; open: boolean; boardSaw: string }) {
  const kept = diagram.offcuts.filter((o) => o.label);
  return (
    <article className="diagram">
      <h3>{diagram.title}</h3>
      <p className="hint">
        {diagram.kind === 'sheet'
          ? `${fmt(diagram.stockLength)} long × ${fmt(diagram.stockWidth)} wide. Drawn to scale.`
          : `${fmt(diagram.stockLength)} long. Length is to scale; the width is drawn larger so the numbers fit.`}
      </p>
      {diagram.kind === 'sheet' ? <SheetPicture diagram={diagram} parts={parts} /> : <BoardPicture diagram={diagram} parts={parts} />}
      <details open={open || diagram.kind === 'board'}>
        <summary>
          {diagram.steps.length} {diagram.steps.length === 1 ? 'step' : 'steps'}, in order
        </summary>
        <ol className="cuts">
          {diagram.steps.map((step) => (
            <li key={step.number}>{sentence(step, diagram, parts, boardSaw)}</li>
          ))}
        </ol>
      </details>
      {kept.length > 0 && (
        <p className="hint">
          Worth keeping:{' '}
          {kept.map((o) => `${o.label} (${fmt(o.along)} × ${fmt(o.across)})`).join(', ')}. Striped areas are leftovers.
        </p>
      )}
    </article>
  );
}

export function CuttingTab({ design, plan, onChange, forPrint = false }: Props) {
  if (!plan.canGeneratePlan) {
    return (
      <section>
        <h2>Cutting</h2>
        <p>There is a problem with the sizes. Fix it on the Size screen and the cutting diagrams will appear here.</p>
      </section>
    );
  }
  const parts = new Map(plan.parts.map((p) => [p.id, p]));
  const toCheck = plan.inputs.filter((i) => i.path.startsWith('measuredThickness.') && typeof i.value === 'number');
  const kerf = plan.cutDiagrams[0]?.kerf;
  const materials = [...new Set(plan.cutDiagrams.map((d) => d.materialId))];
  const boardSaw = plan.methods?.boardSaw === 'mitreSaw' ? 'with the mitre saw' : 'with the circular saw and a square';
  const longCuts = plan.cutDiagrams.some((d) => d.order === 'longCutsFirst');

  return (
    <>
      {!forPrint && (
        <section className="beforeCut">
          <h2>Before you cut</h2>
          <p>Measure how thick your plywood really is. If it is different, type what you measure and every size updates.</p>
          {toCheck.map((input) => (
            <LengthField
              key={input.path}
              label={input.label.charAt(0).toUpperCase() + input.label.slice(1)}
              value={formatLength(input.value as never, '1/32in').text.replace('"', '')}
              hint={input.origin === 'user' ? 'You measured this' : 'Standard size, not measured yet'}
              onValid={(entered) => onChange(withChange(design, input.path, entered))}
            />
          ))}
        </section>
      )}

      <section className="cuttingIntro">
        <h2>Cutting diagrams</h2>
        <p>
          One picture for each sheet and board on the shopping list. Each cut is measured from the fresh edge the
          last cut left{kerf ? `, and ${fmt(kerf)} is allowed for the saw blade between pieces` : ''}. Write the part
          number on each piece as you cut it.
        </p>
        {longCuts && <p>With the track saw, some sheets are cut into full-length strips first because that saves a sheet.</p>}
      </section>

      {materials.map((id) => (
        <section key={id}>
          {plan.cutDiagrams
            .filter((d) => d.materialId === id)
            .map((d) => (
              <Diagram key={d.id} diagram={d} parts={parts} open={forPrint} boardSaw={boardSaw} />
            ))}
        </section>
      ))}
    </>
  );
}
