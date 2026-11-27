import { defaultCatalog } from '../../engine/defaults/catalog';
import type { Joint, PlanResult, Step } from '../../engine/types';
import { colorOf, fmt } from '../format';
import { Icon, toolLabel } from './icons';
import { StepPicture } from './StepPicture';
import { chapterNames, stepTemplates } from './templates';

interface Props {
  readonly plan: PlanResult;
  readonly step: Step;
}

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
    if (joint.method === 'pocketScrews') return `Pocket holes go in the ${joint.face} of ${pieces}. Screw into ${targets}.`;
    if (joint.method === 'glueAndNails') return `Glue and nail ${pieces} to ${targets}.`;
    if (joint.method === 'glue') return `Glue ${pieces} to ${targets}.`;
    return joint.into.length === 0 ? `Screw through ${pieces} into the wall studs.` : `Screw through ${pieces} into ${targets}.`;
  });
}

const supplyName = (id: string) => defaultCatalog.supplies.find((s) => s.id === id)?.name ?? id;

export function StepView({ plan, step }: Props) {
  const template = stepTemplates[step.templateId]!;
  const methods = plan.methods!;
  const title = template.title(step.values);
  const moves = step.pieces.some((p) => p.from !== 'none');
  const shown = [...new Set(step.pieces.map((p) => p.partId))].map((id) => ({
    part: plan.parts.find((p) => p.id === id)!,
    count: step.pieces.filter((p) => p.partId === id).length,
  }));
  const joints = jointLines(step.joints);

  return (
    <article className="step">
      <p className="stepMeta">
        Step {step.number} of {plan.steps.length} · {chapterNames[step.chapter]}
      </p>
      <h2>{title}</h2>
      {step.repeat > 1 && <p className="repeat">Make {step.repeat} of these</p>}

      {step.view === 'back' && <p className="viewNote">Seen from the back</p>}
      <StepPicture plan={plan} step={step} title={title} mode="before" />
      <ul className="legend" aria-label="What the picture shows">
        {moves && (
          <li>
            <span className="key keyArrow" aria-hidden="true" /> where it goes
          </li>
        )}
        {step.glue.length > 0 && (
          <li>
            <span className="key keyGlue" aria-hidden="true" /> glue
          </li>
        )}
        {step.screws.length > 0 && (
          <li>
            <span className="key keyScrew" aria-hidden="true" /> screw
          </li>
        )}
      </ul>

      <p className="say">{template.say(step.values, methods)}</p>

      {moves && (
        <figure className="after">
          <figcaption>When it is done</figcaption>
          <StepPicture plan={plan} step={step} title={title} mode="after" />
        </figure>
      )}

      <h3>Pieces</h3>
      <ul className="pieceCards">
        {shown.map(({ part, count }) => {
          const color = colorOf(part.colorRole);
          return (
            <li key={part.id}>
              <span className="partId" style={{ background: color.hex, color: color.textHex }}>
                {part.id}
              </span>
              <span className="pieceCount">× {count}</span>
              <span className="pieceSize">
                {fmt(part.length)} × {fmt(part.width)}
              </span>
            </li>
          );
        })}
      </ul>

      <h3>Tools</h3>
      <ul className="toolIcons">
        {step.tools.map((id) => (
          <li key={id}>
            <Icon id={id} />
            <span>{toolLabel(id)}</span>
          </li>
        ))}
      </ul>

      {(step.fasteners.length > 0 || step.hardware.length > 0) && (
        <>
          <h3>Screws and hardware</h3>
          <ul className="toolIcons wide">
            {step.fasteners.map((f) => (
              <li key={f.supplyId}>
                <Icon id="screw" />
                <span>
                  <strong>× {f.quantity}</strong> {supplyName(f.supplyId)}
                </span>
              </li>
            ))}
            {step.hardware.map((h) => {
              const item = defaultCatalog.hardware.find((x) => x.id === h.hardwareId);
              return (
                <li key={h.hardwareId}>
                  <Icon id={item?.kind === 'hinge' ? 'hinge' : 'slide'} />
                  <span>
                    <strong>
                      × {h.quantity}
                      {h.unit === 'pair' ? ' pairs' : ''}
                    </strong>{' '}
                    {item?.name ?? h.hardwareId}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <details className="more">
        <summary>More detail</summary>
        <ul>
          {template.more(step.values, methods).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
          {joints.map((line, i) => (
            <li key={`j${i}`}>{line}</li>
          ))}
          {shown.map(({ part }) => (
            <li key={part.id}>
              {part.id} is {part.name.charAt(0).toLowerCase() + part.name.slice(1)}.
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
