import { useState } from 'react';
import type { CutDiagram, CutStep, Part, PlanResult, Design } from '../engine/types';
import { formatLength, incrementTicks } from '../engine/units';
import { colorOf, fmt } from './format';
import { LengthField } from './LengthField';
import { cutKey, progressOf } from './progress';
import { withChange } from './project';
import { Icon, toolLabel } from './steps/icons';

interface Props {
  readonly design: Design;
  readonly plan: PlanResult;
  readonly onChange: (design: Design) => void;
  readonly checked: Readonly<Record<string, boolean>>;
  readonly onCheck: (key: string, value: boolean) => void;
  /** On paper: no text boxes, every list opened out, empty tick boxes. */
  readonly forPrint?: boolean;
}

// One drawing unit is one tape mark, so every shape is an exact whole number.
const mark = incrementTicks('1/16in');
const u = (ticks: number) => ticks / mark;
/** A size without the inch marks, so two fit on a piece: 58 1/4 × 20. */
const bare = (ticks: number) => fmt(ticks as never).replace('"', '');

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

interface PictureProps {
  readonly diagram: CutDiagram;
  readonly parts: ReadonlyMap<string, Part>;
  /** Which pieces (by their place in the diagram) are already cut. */
  readonly cut: ReadonlySet<number>;
}

/** A sheet, drawn to scale with its length running down the screen. */
function SheetPicture({ diagram, parts, cut }: PictureProps) {
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
        // The size goes under the part number when the piece is big enough to hold both.
        const showSize = !turn && w >= 230 && h >= 120;
        return (
          <g key={`p${i}`} className={cut.has(i) ? 'isCut' : undefined}>
            <rect x={u(p.fromEdge)} y={u(p.fromEnd)} width={w} height={h} fill={color.hex} className="piece" />
            {fontSize >= 20 && (
              <text x={cx} y={showSize ? cy - 18 : cy} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={color.textHex} transform={turn ? `rotate(-90 ${cx} ${cy})` : undefined}>
                {p.partId}
              </text>
            )}
            {showSize && (
              <text x={cx} y={cy + 24} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={color.textHex}>
                {bare(p.along)} × {bare(p.across)}
              </text>
            )}
            {cut.has(i) && <path d={`M ${cx - 22} ${cy} l 14 16 l 30 -34`} className="cutTick" />}
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
function BoardPicture({ diagram, parts, cut }: PictureProps) {
  const length = u(diagram.stockLength);
  const height = 190;
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
        const cx = u(p.fromEnd) + w / 2;
        return (
          <g key={`p${i}`} className={cut.has(i) ? 'isCut' : undefined}>
            <rect x={u(p.fromEnd)} y={0} width={w} height={height} fill={color.hex} className="piece" />
            {w >= 130 && (
              <text x={cx} y={height * 0.36} textAnchor="middle" dominantBaseline="central" fontSize={58} fontWeight={700} fill={color.textHex}>
                {p.partId}
              </text>
            )}
            {w >= 150 && (
              <text x={cx} y={height * 0.74} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={700} fill={color.textHex}>
                {bare(p.along)}
              </text>
            )}
            {cut.has(i) && <path d={`M ${cx - 30} ${height / 2} l 20 24 l 44 -50`} className="cutTick" />}
          </g>
        );
      })}
    </svg>
  );
}

/** Short written templates, filled in with this plan's numbers. The size comes first, in bold. */
function CutLine({ step, diagram, parts }: { step: CutStep; diagram: CutDiagram; parts: ReadonlyMap<string, Part> }) {
  const size = <strong>{fmt(step.measure)}</strong>;
  const part = step.partId ? parts.get(step.partId) : undefined;
  const result = <strong>{part ? part.id : step.makes}</strong>;
  if (step.noCutNeeded) {
    return (
      <>
        No cut: what is left of {step.from} is {result}.
      </>
    );
  }
  if (step.kind === 'section') {
    return (
      <>
        {size} from the end, straight across → {result}
      </>
    );
  }
  if (step.kind === 'strip') {
    return (
      <>
        {step.from === 'the sheet' ? 'Full length' : step.from.replace('section', 'Section')}: {size} from the edge, along the grain → {result}
      </>
    );
  }
  return diagram.kind === 'board' ? (
    <>
      {size} from the end → {result}
    </>
  ) : (
    <>
      {step.from.replace('strip', 'Strip')}: cut at {size} → {result}
    </>
  );
}

function Diagram({ diagram, parts, checked, onCheck, forPrint }: { diagram: CutDiagram; parts: ReadonlyMap<string, Part> } & Pick<Props, 'checked' | 'onCheck' | 'forPrint'>) {
  const [zoomed, setZoomed] = useState(false);
  const kept = diagram.offcuts.filter((o) => o.label);
  const cut = new Set(diagram.steps.filter((s) => s.pieceIndex !== undefined && checked[cutKey(diagram, s)]).map((s) => s.pieceIndex!));
  return (
    <article className="diagram">
      <h3>{diagram.title}</h3>
      <p className="cutWith">
        <Icon id={diagram.saw} />
        <span>
          {toolLabel(diagram.saw)}
          <span className="hint">
            {diagram.kind === 'sheet' ? `${fmt(diagram.stockLength)} × ${fmt(diagram.stockWidth)}, to scale` : `${fmt(diagram.stockLength)} long; width drawn larger`}
          </span>
        </span>
      </p>
      <div className={zoomed ? 'zoomBox zoomed' : 'zoomBox'}>
        {diagram.kind === 'sheet' ? <SheetPicture diagram={diagram} parts={parts} cut={cut} /> : <BoardPicture diagram={diagram} parts={parts} cut={cut} />}
      </div>
      {!forPrint && diagram.kind === 'sheet' && (
        <button type="button" className="quiet" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>
          {zoomed ? 'Make the picture smaller' : 'Make the picture bigger'}
        </button>
      )}
      <ol className="cutList">
        {diagram.steps.map((step) => {
          const key = cutKey(diagram, step);
          return (
            <li key={step.number}>
              <label>
                <input type="checkbox" checked={!forPrint && (checked[key] ?? false)} onChange={(e) => onCheck(key, e.target.checked)} />
                <span>
                  <CutLine step={step} diagram={diagram} parts={parts} />
                </span>
              </label>
            </li>
          );
        })}
      </ol>
      {kept.length > 0 && <p className="hint">Keep: {kept.map((o) => `${o.label} (${fmt(o.along)} × ${fmt(o.across)})`).join(', ')}.</p>}
    </article>
  );
}

export function CuttingTab({ design, plan, onChange, checked, onCheck, forPrint = false }: Props) {
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
  const { cut } = progressOf(plan, checked);

  return (
    <>
      {!forPrint && (
        <section className="beforeCut">
          <h2>Before you cut</h2>
          <p>Measure how thick your plywood really is. If it differs, type it in and every size updates.</p>
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
        <h2>Cutting</h2>
        {!forPrint && (
          <>
            <progress value={cut.done} max={cut.total} aria-label={`${cut.done} of ${cut.total} pieces cut`} />
            <p className="hint">
              {cut.done} of {cut.total} pieces cut
            </p>
          </>
        )}
        <p>
          Measure each cut from the fresh edge. Tick it when it is done, and write the part number on the piece.
          {kerf ? ` The plan allows ${fmt(kerf)} for the blade.` : ''}
        </p>
        {plan.cutDiagrams.some((d) => d.order === 'longCutsFirst') && <p>With the track saw, some sheets are cut into full-length strips first because that saves a sheet.</p>}
      </section>

      {materials.map((id) => (
        <section key={id}>
          {plan.cutDiagrams
            .filter((d) => d.materialId === id)
            .map((d) => (
              <Diagram key={d.id} diagram={d} parts={parts} checked={checked} onCheck={onCheck} forPrint={forPrint} />
            ))}
        </section>
      ))}
    </>
  );
}
