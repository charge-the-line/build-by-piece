import { useState } from 'react';
import { cabinetKind } from '../engine/defaults/cabinets';
import { aboveFor, applianceKind, applianceKinds } from '../engine/defaults/run';
import type { EndCondition, PlanResult, RunDesign, RunItem } from '../engine/types';
import { fmt } from './format';
import { FrontView } from './FrontView';
import { IssueList } from './IssueList';
import { LengthField } from './LengthField';
import { newItemId, withAbove, withEnd, withItemWidth, withRunItems, withRunSize } from './project';
import { CABINET_PICTURES } from './ProjectsPanel';
import { EndPicker } from './SizeTab';

interface Props {
  readonly design: RunDesign;
  readonly plan: PlanResult;
  readonly onChange: (design: RunDesign) => void;
}

/** A dashed box with a dial or handle: enough to tell the appliance spaces apart. */
const APPLIANCE_PICTURES = {
  range: 'M8 8h32v34H8zM8 16h32M14 12h2M22 12h2M30 12h2M14 24h20v12H14z',
  dishwasher: 'M10 8h28v34H10zM10 14h28M20 11h8',
  fridge: 'M12 4h24v40H12zM12 18h24M16 10v4M16 24v8',
} as const;

const nameOf = (item: RunItem) => (item.kind === 'cabinet' ? cabinetKind(item.cabinet).name : applianceKind(item.appliance).name);

function Picture({ item }: { item: RunItem }) {
  return (
    <svg className={item.kind === 'cabinet' ? 'icon' : 'icon dashed'} viewBox="0 0 48 48" aria-hidden="true">
      <path d={item.kind === 'cabinet' ? CABINET_PICTURES[item.cabinet] : APPLIANCE_PICTURES[item.appliance]} />
    </svg>
  );
}

export function RunTab({ design, plan, onChange }: Props) {
  const [sizing, setSizing] = useState<string>();
  const end = (side: 'left' | 'right'): EndCondition => design.overrides.ends?.[side]?.value ?? 'exposed';
  const widthOf = (item: RunItem) => plan.inputs.find((i) => i.path === `items.${item.id}.width`)?.value;
  const numberOf = (item: RunItem) => plan.run?.cabinets.find((c) => c.itemId === item.id)?.id;
  const move = (index: number, by: number) => {
    const items = [...design.items];
    const [item] = items.splice(index, 1);
    items.splice(index + by, 0, item!);
    onChange(withRunItems(design, items));
  };
  const add = (make: (id: string) => RunItem) => onChange(withRunItems(design, [...design.items, make(newItemId(design))]));

  return (
    <>
      <section>
        <h2>Your wall</h2>
        <p>Give the length of the run. The app sizes every cabinet to fit.</p>
        <LengthField label="Length of the run" value={design.length.entered} hint="End to end, along the wall" onValid={(v) => onChange(withRunSize(design, 'length', v))} />
        <LengthField label="Depth" value={design.depth.entered} hint="Wall to the front of the face frames" onValid={(v) => onChange(withRunSize(design, 'depth', v))} />
        <LengthField label="Height" value={design.height.entered} hint="The boxes only: no platform, no top" onValid={(v) => onChange(withRunSize(design, 'height', v))} />
        <EndPicker side="Left" value={end('left')} onPick={(v) => onChange(withEnd(design, 'left', v))} />
        <EndPicker side="Right" value={end('right')} onPick={(v) => onChange(withEnd(design, 'right', v))} />
      </section>

      <IssueList issues={plan.issues} />

      {plan.run && plan.overall && (
        <section>
          <h2>What you get</h2>
          <FrontView plan={plan} />
        </section>
      )}

      <section>
        <h2>What goes along it</h2>
        <p>Left to right. Cabinets with no width set share the space that is left.</p>
        <ol className="runItems">
          {design.items.map((item, i) => {
            const width = widthOf(item);
            return (
              <li key={item.id}>
                <div className="runItemHead">
                  <Picture item={item} />
                  <span>
                    <strong>
                      {numberOf(item) ? `${numberOf(item)} ` : ''}
                      {nameOf(item)}
                    </strong>
                    <span className="hint">
                      {typeof width === 'number' && width > 0 ? `${fmt(width as never)} wide` : ''}
                      {item.width ? ', set by you' : item.kind === 'appliance' ? ', check your appliance' : item.cabinet === 'sinkBase' ? '' : ', shared'}
                    </span>
                  </span>
                </div>
                <div className="runItemActions">
                  <button type="button" aria-label={`Move ${nameOf(item)} left`} disabled={i === 0} onClick={() => move(i, -1)}>
                    ←
                  </button>
                  <button type="button" aria-label={`Move ${nameOf(item)} right`} disabled={i === design.items.length - 1} onClick={() => move(i, 1)}>
                    →
                  </button>
                  <button type="button" onClick={() => setSizing(sizing === item.id ? undefined : item.id)}>
                    Width
                  </button>
                  <button type="button" disabled={design.items.length === 1} onClick={() => onChange(withRunItems(design, design.items.filter((x) => x.id !== item.id)))}>
                    Remove
                  </button>
                </div>
                {sizing === item.id && (
                  <div className="choiceEdit">
                    <LengthField
                      label={`Width of ${nameOf(item).toLowerCase()}`}
                      value={item.width?.entered ?? (typeof width === 'number' ? fmt(width as never).replace('"', '') : '')}
                      hint="The other cabinets adjust to fit"
                      onValid={(entered) => onChange(withItemWidth(design, item.id, entered))}
                    />
                    {item.width && (
                      <button type="button" onClick={() => onChange(withItemWidth(design, item.id, undefined))}>
                        Let the app decide
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2>Above</h2>
        <p>The app lines an upper cabinet up with what is underneath. Change any of them.</p>
        <ol className="runItems aboveList">
          {design.items.map((item) => {
            const above = aboveFor(item, design.uppers);
            const upperId = plan.run?.above.find((a) => a.itemId === item.id)?.upperId;
            return (
              <li key={item.id}>
                <div className="runItemHead">
                  <svg className={above.choice === 'upper' ? 'icon' : 'icon dashed'} viewBox="0 0 48 48" aria-hidden="true">
                    <path d={above.choice === 'upper' ? CABINET_PICTURES.upper : 'M8 8h32v24H8z'} />
                  </svg>
                  <span>
                    <strong>{above.choice === 'upper' ? `${upperId ? `${upperId} ` : ''}Upper cabinet` : 'Nothing'}</strong>
                    <span className="hint">
                      Over the {numberOf(item) ? `${numberOf(item)} ` : ''}
                      {nameOf(item).toLowerCase()}
                      {above.proposed ? `. ${above.reason}` : ', set by you'}
                    </span>
                  </span>
                </div>
                <div className="runItemActions">
                  <button type="button" onClick={() => onChange(withAbove(design, item.id, above.choice === 'upper' ? 'none' : 'upper'))}>
                    {above.choice === 'upper' ? 'Leave this empty' : 'Put an upper cabinet here'}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="note">The size of the upper cabinets and their height on the wall are on the Choices screen.</p>
      </section>

      <section>
        <h2>Add to the run</h2>
        <ul className="kinds">
          {(['base', 'drawerBase', 'sinkBase'] as const).map((cabinet) => (
            <li key={cabinet}>
              <button type="button" onClick={() => add((id) => ({ id, kind: 'cabinet', cabinet }))}>
                <Picture item={{ id: '', kind: 'cabinet', cabinet }} />
                <span>{cabinetKind(cabinet).name}</span>
              </button>
            </li>
          ))}
          {applianceKinds.map((kind) => (
            <li key={kind.type}>
              <button type="button" onClick={() => add((id) => ({ id, kind: 'appliance', appliance: kind.type }))}>
                <Picture item={{ id: '', kind: 'appliance', appliance: kind.type }} />
                <span>{kind.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
