import type { PlanResult, PlanTool } from '../engine/types';
import { defaultCatalog } from '../engine/defaults/catalog';
import { fmt } from './format';

/** Written templates for the cut a router bit has to make, filled with the plan's sizes. */
function bitNote(tool: PlanTool): string {
  if (!tool.cut) return '';
  return tool.cut.kind === 'recess'
    ? ` Choose one that cuts a recess ${fmt(tool.cut.width)} wide. Set its depth to ${fmt(tool.cut.depth)}, the thickness of your panel.`
    : ` Choose one that cuts a groove ${fmt(tool.cut.width)} wide, the thickness of your panel, and set its depth to ${fmt(tool.cut.depth)}.`;
}

function ToolList({ tools }: { tools: readonly PlanTool[] }) {
  return (
    <ul className="supplies">
      {tools.map((tool) => (
        <li key={tool.id}>
          <strong>{tool.name}</strong>
          <span className="hint">
            {tool.usedFor.join(' ')}
            {bitNote(tool)}
          </span>
        </li>
      ))}
    </ul>
  );
}

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
      </section>
      <section>
        <h2>Tools for this plan</h2>
        {plan.tools.some((t) => t.status === 'buyOrBorrow') && (
          <div className="issue">
            <h3>Buy or borrow</h3>
            <p>This plan uses these, and they are not ticked in your tools.</p>
            <ToolList tools={plan.tools.filter((t) => t.status === 'buyOrBorrow')} />
          </div>
        )}
        <h3>Bits</h3>
        <ToolList tools={plan.tools.filter((t) => t.kind === 'bit')} />
        <h3>Safety, on every plan</h3>
        <ToolList tools={plan.tools.filter((t) => t.kind === 'safety')} />
        <h3>From your tools</h3>
        <ToolList tools={plan.tools.filter((t) => t.kind === 'tool' && t.status !== 'buyOrBorrow')} />
        <p className="hint">Change which tools you have on the Choices screen. The plan picks its methods to suit.</p>
      </section>
      <section>
        <h2>Also needed</h2>
        <ul className="supplies">
          {defaultCatalog.supplies.map((supply) => (
            <li key={supply.id}>
              <strong>{supply.name}</strong>
              <span className="hint">{supply.use}</span>
            </li>
          ))}
        </ul>
        <p className="hint">The app does not work out how much of each yet. Handles and the finish are your choice.</p>
      </section>
    </>
  );
}
