import { defaultCatalog } from '../../engine/defaults/catalog';
import type { Joint, PlanResult, Step } from '../../engine/types';
import { colorOf, fmt } from '../format';
import { StepPicture } from './StepPicture';
import { stepTemplates } from './templates';

interface Props {
  readonly plan: PlanResult;
  readonly step: Step;
  /** Which checklist lines are ticked. Omitted when printing, where boxes are left empty. */
  readonly checked?: Readonly<Record<string, boolean>>;
  readonly onCheck?: (key: string, value: boolean) => void;
}

export const checkKey = (step: Step, index: number) => `${step.id}:${index}`;

const list = (ids: readonly string[]) => (ids.length <= 1 ? ids.join('') : `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}`);

/** Joints that differ only in which piece is drilled are described together. */
function jointLines(joints: readonly Joint[]): string[] {
  const groups = new Map<string, { joint: Joint; through: string[] }>();
  for (const joint of joints) {
    const key = `${joint.method}|${joint.face ?? ''}|${joint.into.join(',')}`;
    const group = groups.get(key) ?? { joint, through: [] };
    group.through.push(joint.through);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ joint, through }) => {
    const pieces = list(through);
    const targets = list(joint.into);
    if (joint.method === 'pocketScrews') return `Pocket screws and glue: drill pocket holes in the ${joint.face} of ${pieces}, then screw into ${targets}.`;
    if (joint.method === 'glueAndNails') return `Glue and nails: fix ${pieces} to ${targets}.`;
    if (joint.method === 'glue') return `Glue only: fix ${pieces} to ${targets}.`;
    return joint.into.length === 0 ? `Screws: through ${pieces} into the wall studs.` : `Screws: through ${pieces} into ${targets}.`;
  });
}

export function StepView({ plan, step, checked, onCheck }: Props) {
  const template = stepTemplates[step.templateId]!;
  const parts = plan.parts.filter((p) => step.partIds.includes(p.id));
  const joints = jointLines(step.joints);
  return (
    <article className="step">
      <h2>
        Step {step.number}: {template.title}
      </h2>
      <StepPicture plan={plan} step={step} title={template.title} />
      <p className="hint">Coloured pieces are the ones for this step. Grey pieces are already built. The picture shows where each piece ends up.</p>

      <h3>You need</h3>
      <ul className="need">
        {parts.map((p) => {
          const color = colorOf(p.colorRole);
          return (
            <li key={p.id}>
              <span className="partId" style={{ background: color.hex, color: color.textHex }}>
                {p.id}
              </span>
              <span>
                {p.name} × {p.quantity}
                <span className="needSize">
                  {fmt(p.length)} × {fmt(p.width)}
                </span>
              </span>
            </li>
          );
        })}
        {step.hardware.map((h) => (
          <li key={h.hardwareId}>
            <span className="partId hardware">{h.quantity}</span>
            <span>
              {defaultCatalog.hardware.find((x) => x.id === h.hardwareId)?.name ?? h.hardwareId}
              {h.unit === 'pair' ? ' (pairs)' : ''}
            </span>
          </li>
        ))}
      </ul>

      <h3>What to do</h3>
      <ol className="todo">
        {template.instructions(step.values, plan.methods!).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>

      {joints.length > 0 && (
        <>
          <h3>How it is joined</h3>
          <ul className="joints">
            {joints.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </>
      )}

      <h3>Check before moving on</h3>
      <ul className="checks">
        {template.checklist(step.values, plan.methods!).map((line, i) => {
          const key = checkKey(step, i);
          return (
            <li key={key}>
              <label>
                <input type="checkbox" checked={checked?.[key] ?? false} onChange={(e) => onCheck?.(key, e.target.checked)} />
                <span>{line}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
