import { useState } from 'react';
import { cabinetKind } from '../engine/defaults/cabinets';
import { aboveFor, applianceKind, applianceKinds, CORNER_ITEM } from '../engine/defaults/run';
import { userEntered } from '../engine/defaults/values';
import type { EndCondition, PlanResult, RunDesign, RunItem } from '../engine/types';
import { fmt } from './format';
import { FloorView, FrontView } from './FrontView';
import { IssueList } from './IssueList';
import { LengthField } from './LengthField';
import { itemsWithWidth, newItemId, withAbove, withCorner, withCornerWidth, withEnd, withRunItems, withRunSize, withWallsSwapped } from './project';
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

/** The corner cabinet the app adds to the first wall (rule N3). It is not in her list. */
const CORNER: RunItem = { id: CORNER_ITEM, kind: 'cabinet', cabinet: 'cornerBase' };

function Picture({ item }: { item: RunItem }) {
  return (
    <svg className={item.kind === 'cabinet' ? 'icon' : 'icon dashed'} viewBox="0 0 48 48" aria-hidden="true">
      <path d={item.kind === 'cabinet' ? CABINET_PICTURES[item.cabinet] : APPLIANCE_PICTURES[item.appliance]} />
    </svg>
  );
}

interface WallProps extends Props {
  readonly wall: 1 | 2;
}

/** What goes along one wall, what goes above it, and the buttons to add more. */
function Wall({ design, plan, onChange, wall }: WallProps) {
  const [sizing, setSizing] = useState<string>();
  const corner = design.corner;
  const items = wall === 2 ? (corner?.items ?? []) : design.items;
  const setItems = (next: readonly RunItem[]) => onChange(wall === 2 ? withCorner(design, { items: next }) : withRunItems(design, next));
  const path = (item: RunItem) => `${wall === 2 ? 'corner.' : ''}items.${item.id}.width`;
  const widthOf = (item: RunItem) => plan.inputs.find((i) => i.path === path(item))?.value;
  const row = wall === 2 ? plan.run?.second : plan.run;
  const numberOf = (item: RunItem) => row?.cabinets.find((c) => c.itemId === item.id)?.id;
  // The corner cabinet shows in the first wall's list, at the corner end, but cannot be moved or removed.
  const cornerFirst = wall === 1 && corner?.side === 'left';
  const cornerLast = wall === 1 && corner?.side === 'right';
  const shown = [...(cornerFirst ? [CORNER] : []), ...items, ...(cornerLast ? [CORNER] : [])];
  const uppers = wall === 2 ? { above: corner?.above ?? {} } : design.uppers;
  const title = corner ? (wall === 1 ? 'First wall: ' : 'Second wall: ') : '';
  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    setItems(next);
  };
  const setWidth = (item: RunItem, entered: string | undefined) => (item.id === CORNER_ITEM ? onChange(withCornerWidth(design, entered)) : setItems(itemsWithWidth(items, item.id, entered)));
  const hasWidth = (item: RunItem) => (item.id === CORNER_ITEM ? corner?.cabinetWidth !== undefined : item.width !== undefined);

  return (
    <>
      <section>
        <h2>{title}what goes along it</h2>
        <p>Left to right, as you face the wall. Cabinets with no width set share the space that is left.</p>
        <ol className="runItems">
          {shown.map((item) => {
            const width = widthOf(item);
            const i = items.indexOf(item);
            const isCorner = item.id === CORNER_ITEM;
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
                      {hasWidth(item) ? ', set by you' : isCorner ? ', added by the app' : item.kind === 'appliance' ? ', check your appliance' : item.cabinet === 'sinkBase' ? '' : ', shared'}
                    </span>
                  </span>
                </div>
                <div className="runItemActions">
                  <button type="button" aria-label={`Move ${nameOf(item)} left`} disabled={isCorner || i === 0} onClick={() => move(i, -1)}>
                    ←
                  </button>
                  <button type="button" aria-label={`Move ${nameOf(item)} right`} disabled={isCorner || i === items.length - 1} onClick={() => move(i, 1)}>
                    →
                  </button>
                  <button type="button" onClick={() => setSizing(sizing === item.id ? undefined : item.id)}>
                    Width
                  </button>
                  <button type="button" disabled={isCorner || items.length === 1} onClick={() => setItems(items.filter((x) => x.id !== item.id))}>
                    Remove
                  </button>
                </div>
                {sizing === item.id && (
                  <div className="choiceEdit">
                    <LengthField
                      label={`Width of ${nameOf(item).toLowerCase()}`}
                      value={(isCorner ? corner?.cabinetWidth?.entered : item.width?.entered) ?? (typeof width === 'number' ? fmt(width as never).replace('"', '') : '')}
                      hint="The other cabinets adjust to fit"
                      onValid={(entered) => setWidth(item, entered)}
                    />
                    {hasWidth(item) && (
                      <button type="button" onClick={() => setWidth(item, undefined)}>
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
        <h2>{title}above</h2>
        <p>The app lines an upper cabinet up with what is underneath. Change any of them.</p>
        <ol className="runItems aboveList">
          {shown.map((item) => {
            const above = aboveFor(item, uppers);
            const upperId = row?.above.find((a) => a.itemId === item.id)?.upperId;
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
                  <button type="button" onClick={() => onChange(withAbove(design, item.id, above.choice === 'upper' ? 'none' : 'upper', wall))}>
                    {above.choice === 'upper' ? 'Leave this empty' : 'Put an upper cabinet here'}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        {wall === 1 && <p className="note">The size of the upper cabinets and their height on the wall are on the Choices screen.</p>}
      </section>

      <section>
        <h2>{title}add</h2>
        <ul className="kinds">
          {(['base', 'drawerBase', 'sinkBase'] as const).map((cabinet) => (
            <li key={cabinet}>
              <button type="button" onClick={() => setItems([...items, { id: newItemId(items), kind: 'cabinet', cabinet }])}>
                <Picture item={{ id: '', kind: 'cabinet', cabinet }} />
                <span>{cabinetKind(cabinet).name}</span>
              </button>
            </li>
          ))}
          {applianceKinds.map((kind) => (
            <li key={kind.type}>
              <button type="button" onClick={() => setItems([...items, { id: newItemId(items), kind: 'appliance', appliance: kind.type }])}>
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

export function RunTab({ design, plan, onChange }: Props) {
  const corner = design.corner;
  const end = (side: 'left' | 'right'): EndCondition => design.overrides.ends?.[side]?.value ?? 'exposed';
  const far = corner?.side === 'right' ? 'left' : 'right';

  return (
    <>
      <section>
        <h2>{corner ? 'Your first wall' : 'Your wall'}</h2>
        <p>{corner ? 'Give the length of each wall, from the corner to its far end. The app sizes every cabinet to fit.' : 'Give the length of the run. The app sizes every cabinet to fit.'}</p>
        <LengthField label={corner ? 'Length of the first wall' : 'Length of the run'} value={design.length.entered} hint={design.length.checkAt ? (design.length.note ?? '') : corner ? 'From the corner to the far end' : 'End to end, along the wall'} onValid={(v) => onChange(withRunSize(design, 'length', v))} />
        <LengthField label="Depth" value={design.depth.entered} hint="Wall to the front of the face frames" onValid={(v) => onChange(withRunSize(design, 'depth', v))} />
        <LengthField label="Height" value={design.height.entered} hint="The boxes only: no platform, no top" onValid={(v) => onChange(withRunSize(design, 'height', v))} />
        {(!corner || corner.side === 'right') && <EndPicker side="Left" value={end('left')} onPick={(v) => onChange(withEnd(design, 'left', v))} />}
        {(!corner || corner.side === 'left') && <EndPicker side="Right" value={end('right')} onPick={(v) => onChange(withEnd(design, 'right', v))} />}
      </section>

      {corner && (
        <section>
          <h2>Your second wall</h2>
          <LengthField label="Length of the second wall" value={corner.length.entered} hint={corner.length.checkAt ? (corner.length.note ?? '') : 'From the corner to the far end'} onValid={(v) => onChange(withCorner(design, { length: userEntered(v) }))} />
          <fieldset className="ends">
            <legend>The second wall is on your</legend>
            {(['left', 'right'] as const).map((side) => (
              <button key={side} type="button" aria-pressed={corner.side === side} onClick={() => onChange(withCorner(design, { side }))}>
                {side === 'left' ? 'Left' : 'Right'}
              </button>
            ))}
          </fieldset>
          <EndPicker side={far === 'left' ? 'Right' : 'Left'} value={corner.end ?? 'exposed'} onPick={(v) => onChange(withCorner(design, { end: v }))} />
          <p className="hint">The first wall&apos;s cabinets run into the corner. The second wall&apos;s start in front of them.</p>
          <button type="button" onClick={() => onChange(withWallsSwapped(design))}>
            Swap the two walls
          </button>
        </section>
      )}

      <IssueList issues={plan.issues} />

      {plan.run && plan.overall && (
        <section>
          <h2>What you get</h2>
          <FloorView plan={plan} />
          <FrontView plan={plan} />
          {plan.run.second && <FrontView plan={plan} wall={2} />}
        </section>
      )}

      <Wall design={design} plan={plan} onChange={onChange} wall={1} />
      {corner && <Wall design={design} plan={plan} onChange={onChange} wall={2} />}
    </>
  );
}
