import type { PlanResult } from '../engine/types';
import { fmt } from './format';

export function ShoppingTab({ plan }: { plan: PlanResult }) {
  if (!plan.canGeneratePlan) {
    return (
      <section>
        <h2>Shopping list</h2>
        <p>There is a problem with the sizes. Fix it on the Size screen and the shopping list will appear here.</p>
      </section>
    );
  }
  return (
    <>
      <section>
        <h2>Wood</h2>
        <ul className="shop">
          {plan.materials.map((line) => (
            <li key={`${line.materialId}-${line.stockLength ?? 'sheet'}`}>
              <span className="shopQty">{line.quantity}</span>
              <span>
                {line.name}
                {line.stockLength ? `, ${fmt(line.stockLength)} long` : ', full sheet'}
              </span>
            </li>
          ))}
        </ul>
        <p className="hint">Counts allow for the width of the saw blade between pieces.</p>
      </section>
      <section>
        <h2>Hardware</h2>
        <ul className="shop">
          {plan.hardware.map((line) => (
            <li key={line.hardwareId}>
              <span className="shopQty">{line.quantity}</span>
              <span>
                {line.name}
                {line.length ? `, ${fmt(line.length.result)} long` : ''}
                {line.unit === 'pair' ? ' (pairs)' : ''}
              </span>
            </li>
          ))}
        </ul>
        <p className="hint">Screws, glue, handles and finish are not listed yet.</p>
      </section>
    </>
  );
}
