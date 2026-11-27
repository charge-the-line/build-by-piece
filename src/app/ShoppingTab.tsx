import type { ReactNode } from 'react';
import { defaultCatalog } from '../engine/defaults/catalog';
import type { MaterialLine, PlanResult, PlanTool } from '../engine/types';
import { fmt } from './format';
import { boughtKey, boughtMaterialKey, progressOf } from './progress';
import { Icon } from './steps/icons';

interface Props {
  readonly plan: PlanResult;
  readonly checked: Readonly<Record<string, boolean>>;
  readonly onCheck: (key: string, value: boolean) => void;
  /** On paper: empty tick boxes. */
  readonly forPrint?: boolean;
}

/** A sheet or a board as a small outline, so the list can be read at a glance. */
function WoodPicture({ line }: { line: MaterialLine }) {
  return (
    <svg className="icon" viewBox="0 0 48 48" aria-hidden="true">
      {line.unit === 'sheet' ? <path d="M12 6h24v36H12zM12 14h24M12 22h24M12 30h24" /> : <path d="M4 20h40v8H4zM10 20v8M30 20v8" />}
    </svg>
  );
}

/** Written templates for the cut a router bit has to make, filled with the plan's sizes. */
function bitNote(tool: PlanTool): string {
  if (!tool.cut) return '';
  return tool.cut.kind === 'recess'
    ? ` Cuts ${fmt(tool.cut.width)} wide; set it ${fmt(tool.cut.depth)} deep.`
    : ` Cuts ${fmt(tool.cut.width)} wide; set it ${fmt(tool.cut.depth)} deep.`;
}

export function ShoppingTab({ plan, checked, onCheck, forPrint = false }: Props) {
  if (!plan.canGeneratePlan) {
    return (
      <section>
        <h2>Shopping</h2>
        <p>There is a problem with the sizes. Fix it on the Size screen and the shopping lists will appear here.</p>
      </section>
    );
  }
  const { bought } = progressOf(plan, checked);

  /** One line of a list: a tick box to mark it bought, a picture, a count and a name. */
  const row = (key: string | undefined, picture: ReactNode, count: ReactNode, name: ReactNode, note?: ReactNode) => (
    <li key={key ?? String(name)}>
      {key ? (
        <label>
          <input type="checkbox" checked={!forPrint && (checked[key] ?? false)} onChange={(e) => onCheck(key, e.target.checked)} aria-label="Bought" />
          {picture}
          <span className="shopCount">{count}</span>
          <span className="shopName">
            {name}
            {note && <span className="hint">{note}</span>}
          </span>
        </label>
      ) : (
        <div className="noTick">
          {picture}
          <span className="shopCount">{count}</span>
          <span className="shopName">
            {name}
            {note && <span className="hint">{note}</span>}
          </span>
        </div>
      )}
    </li>
  );

  const toolRow = (t: PlanTool, tick: boolean) => row(tick ? boughtKey('tool', t.id) : undefined, <Icon id={t.kind === 'bit' ? (t.id === 'bit-hinge' ? 'hingeBit' : 'router') : t.id} />, '', t.name, `${t.usedFor.join(' ')}${bitNote(t)}`);
  const group = (title: string, tools: readonly PlanTool[], tick: boolean) =>
    tools.length > 0 && (
      <>
        <h3>{title}</h3>
        <ul className="shopList">{tools.map((t) => toolRow(t, tick))}</ul>
      </>
    );
  const toBuy = plan.tools.filter((t) => t.status === 'buyOrBorrow' || t.kind === 'bit');

  return (
    <>
      {!forPrint && (
        <section className="progress" aria-label="Shopping progress">
          <progress value={bought.done} max={bought.total} aria-label={`${bought.done} of ${bought.total} bought`} />
          <p>
            {bought.done} of {bought.total} bought
          </p>
        </section>
      )}

      <section>
        <h2>1. Wood</h2>
        <ul className="shopList">
          {plan.materials.map((line) => row(boughtMaterialKey(line), <WoodPicture line={line} />, `× ${line.quantity}`, line.name, line.stockLength ? `${fmt(line.stockLength)} long` : 'Full sheet'))}
        </ul>
      </section>

      <section>
        <h2>2. Hardware and supplies</h2>
        <ul className="shopList">
          {plan.hardware.map((line) =>
            row(
              boughtKey('hardware', line.hardwareId),
              <Icon id={defaultCatalog.hardware.find((h) => h.id === line.hardwareId)?.kind === 'hinge' ? 'hinge' : 'slide'} />,
              `× ${line.quantity}`,
              line.name,
              `${line.length ? `${fmt(line.length.result)} long. ` : ''}${line.unit === 'pair' ? 'Sold in pairs.' : ''}`,
            ),
          )}
          {plan.supplies.map((supply) => row(boughtKey('supply', supply.id), <Icon id={supply.id.includes('screw') ? 'screw' : supply.id === 'wood-glue' ? 'glue' : supply.id === 'brad-nails' ? 'nail' : supply.id === 'sandpaper' ? 'sandingBlock' : 'measuring'} />, supply.quantity ? `× ${supply.quantity}` : '', supply.name, supply.use))}
        </ul>
        <p className="hint">Screw counts are what the steps use; buy a few spare. Handles, stain or paint and the clear coat are your choice.</p>
      </section>

      <section>
        <h2>3. Tools</h2>
        {group('To buy or borrow', toBuy, true)}
        {group('You have', plan.tools.filter((t) => t.kind === 'tool' && (t.status === 'have' || t.status === 'required')), false)}
        {group('Safety, every time', plan.tools.filter((t) => t.kind === 'safety'), false)}
        {group('Optional: these would help', plan.tools.filter((t) => t.status === 'optional'), false)}
        {!forPrint && <p className="hint">Change your tools, or how the plan chooses its methods, on the Choices screen.</p>}
      </section>
    </>
  );
}
