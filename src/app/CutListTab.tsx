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

/** The whole cut list as one compact table, for paper. */
function CutTable({ plan }: { plan: PlanResult }) {
  return (
    <section className="cutTable">
      <h2>Cut list</h2>
      <p>Length runs with the grain of the wood. Write the part number on each piece as you cut it.</p>
      <table>
        <thead>
          <tr>
            <th>Part</th>
            <th>Name</th>
            <th>How many</th>
            <th>Length</th>
            <th>Width</th>
            <th>Thick</th>
            <th>Cut from</th>
          </tr>
        </thead>
        <tbody>
          {plan.parts.map((p) => {
            const color = colorOf(p.colorRole);
            return (
              <tr key={p.id}>
                <td>
                  <span className="partId" style={{ background: color.hex, color: color.textHex }}>
                    {p.id}
                  </span>
                </td>
                <td>{p.name}</td>
                <td>{p.quantity}</td>
                <td>{fmt(p.length)}</td>
                <td>{fmt(p.width)}</td>
                <td>{fmt(p.thickness)}</td>
                <td>{materialName(p.materialId)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function CutListTab({ plan, forPrint = false }: { plan: PlanResult; forPrint?: boolean }) {
  if (forPrint) return <CutTable plan={plan} />;
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
