import type { EndCondition, PlanResult, VanityDesign } from '../engine/types';
import { fmt } from './format';
import { FrontView } from './FrontView';
import { IssueList } from './IssueList';
import { LayoutEditor } from './LayoutEditor';
import { LengthField } from './LengthField';
import { MeasureGuide } from './MeasureGuide';
import { withEnd, withSize } from './project';

interface Props {
  readonly design: VanityDesign;
  readonly plan: PlanResult;
  readonly onChange: (design: VanityDesign) => void;
}

function EndPicker({ side, value, onPick }: { side: 'Left' | 'Right'; value: EndCondition; onPick: (v: EndCondition) => void }) {
  const options: readonly [EndCondition, string][] = [
    ['wall', 'Against a wall'],
    ['exposed', 'Open to view'],
  ];
  return (
    <fieldset className="ends">
      <legend>{side} end</legend>
      {options.map(([option, words]) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onPick(option)}>
          {words}
        </button>
      ))}
    </fieldset>
  );
}

export function SizeTab({ design, plan, onChange }: Props) {
  const end = (side: 'left' | 'right'): EndCondition => design.overrides.ends?.[side]?.value ?? 'exposed';
  return (
    <>
      <section>
        <h2>Three numbers are all you enter</h2>
        <p>The app decides everything else, shows you each choice, and lets you change it.</p>
        <LengthField label="Width" value={design.width.entered} hint="The whole cabinet, end to end" onValid={(v) => onChange(withSize(design, 'width', v))} />
        <LengthField label="Depth" value={design.depth.entered} hint="Wall to the front of the face frame" onValid={(v) => onChange(withSize(design, 'depth', v))} />
        <LengthField label="Height" value={design.height.entered} hint="The box only: no platform, no top" onValid={(v) => onChange(withSize(design, 'height', v))} />
        <EndPicker side="Left" value={end('left')} onPick={(v) => onChange(withEnd(design, 'left', v))} />
        <EndPicker side="Right" value={end('right')} onPick={(v) => onChange(withEnd(design, 'right', v))} />
      </section>

      <IssueList issues={plan.issues} />

      {plan.overall && (
        <section>
          <h2>What you get</h2>
          <FrontView plan={plan} />
          <dl className="facts">
            <dt>Finished height with a typical stone top</dt>
            <dd>{fmt(plan.overall.finishedHeight.result)}</dd>
            <dt>Plywood box</dt>
            <dd>
              {fmt(plan.overall.boxWidth.result)} wide, {fmt(plan.overall.boxDepth.result)} deep
            </dd>
          </dl>
        </section>
      )}

      <LayoutEditor design={design} onChange={onChange} />

      <section>
        <h2>What each number includes</h2>
        <MeasureGuide design={design} />
      </section>
    </>
  );
}
