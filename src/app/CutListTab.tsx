import type { Derivation, Part, PlanResult } from '../engine/types';
import { colorOf, fmt, materialName } from './format';

function Worked({ title, derivation }: { title: string; derivation: Derivation }) {
  return (
    <div className="worked">
      <p>
        <strong>
          {title}: {fmt(derivation.result)}
        </strong>{' '}
        = {derivation.formula} <span className="rule">(rule {derivation.ruleId})</span>
      </p>
      <ul>
        {derivation.inputs.map((input, i) => (
          <li key={i}>
            {input.label}: {fmt(input.value)}
            {input.checkAt ? ' (check before you cut)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PartCard({ part }: { part: Part }) {
  const color = colorOf(part.colorRole);
  return (
    <li className="part">
      <div className="partHead">
        <span className="partId" style={{ background: color.hex, color: color.textHex }}>
          {part.id}
        </span>
        <span className="partName">{part.name}</span>
        <span className="partQty">× {part.quantity}</span>
      </div>
      <p className="partSize">
        {fmt(part.length)} long × {fmt(part.width)} wide
      </p>
      <p className="hint">
        {materialName(part.materialId)}, {fmt(part.thickness)} thick
        {part.needsCheck ? '. Check your plywood thickness before cutting.' : ''}
      </p>
      <details>
        <summary>How this size was worked out</summary>
        <Worked title="Length" derivation={part.derivation.length} />
        <Worked title="Width" derivation={part.derivation.width} />
      </details>
    </li>
  );
}

export function CutListTab({ plan }: { plan: PlanResult }) {
  if (!plan.canGeneratePlan) {
    return (
      <section>
        <h2>Cut list</h2>
        <p>There is a problem with the sizes. Fix it on the Size screen and the cut list will appear here.</p>
      </section>
    );
  }
  const groups = [...new Set(plan.parts.map((p) => p.assembly))];
  const pieces = plan.parts.reduce((n, p) => n + p.quantity, 0);
  return (
    <>
      <section>
        <h2>Cut list</h2>
        <p>
          {pieces} pieces. Write the part number on each piece as you cut it. Length runs with the grain of the wood.
        </p>
      </section>
      {groups.map((group) => (
        <section key={group}>
          <h3>{group}</h3>
          <ul className="parts">
            {plan.parts
              .filter((p) => p.assembly === group)
              .map((p) => (
                <PartCard key={p.id} part={p} />
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
