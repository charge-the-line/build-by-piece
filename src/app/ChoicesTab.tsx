import { useState } from 'react';
import type { PlanResult, ResolvedInput, Design } from '../engine/types';
import { formatLength } from '../engine/units';
import { choiceWords, fmt } from './format';
import { toolList } from '../engine/defaults/tools';
import type { Approach, PanelMethod, ToolId } from '../engine/types';
import { glossary } from './glossary';
import { LengthField } from './LengthField';
import { startingRun } from '../engine/defaults/run';
import { type Checked, fromProjectText, isChangeable, startingDesign, toProjectFile, withApproach, withChange, withPanelMethod, withTool } from './project';
import { Icon } from './steps/icons';

interface Props {
  readonly design: Design;
  readonly plan: PlanResult;
  readonly onChange: (design: Design) => void;
  readonly checked: Checked;
  readonly onReplace: (project: { design: Design; checked: Checked }) => void;
}

const shown = (input: ResolvedInput) => (typeof input.value === 'number' ? fmt(input.value as never) : choiceWords(input.value));

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Row({ input, design, onChange }: { input: ResolvedInput } & Pick<Props, 'design' | 'onChange'>) {
  const [open, setOpen] = useState(false);
  const isLength = typeof input.value === 'number';
  const canChange = isLength && isChangeable(input.path);
  const changed = input.origin === 'user' && isChangeable(input.path) && isLength;
  return (
    <li className="choice">
      <div className="choiceHead">
        <span className="choiceLabel">{capital(input.label)}</span>
        <span className="choiceValue">{shown(input)}</span>
      </div>
      {input.note && !changed && <p className="hint">{input.note}</p>}
      {canChange && !open && (
        <div className="choiceActions">
          <button type="button" onClick={() => setOpen(true)}>
            Change
          </button>
          {changed && (
            <button type="button" onClick={() => onChange(withChange(design, input.path, undefined))}>
              Use the app's choice
            </button>
          )}
        </div>
      )}
      {canChange && open && (
        <div className="choiceEdit">
          <LengthField
            label={`New ${input.label}`}
            value={formatLength(input.value as never, '1/32in').text.replace('"', '')}
            hint="The whole plan updates as you type"
            onValid={(entered) => onChange(withChange(design, input.path, entered))}
          />
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </li>
  );
}

export function ChoicesTab({ design, plan, onChange, checked, onReplace }: Props) {
  const [importError, setImportError] = useState('');
  // Tools and the panel method have their own controls below.
  const listed = plan.inputs.filter((i) => !i.path.startsWith('tools.') && i.path !== 'fronts.panelMethod' && i.path !== 'approach');
  const approach = (plan.inputs.find((i) => i.path === 'approach')?.value ?? 'useWhatIOwn') as Approach;
  const approaches: readonly [Approach, string, string, string][] = [
    ['useWhatIOwn', 'Use what I own', 'Buys as little as possible.', 'measuring'],
    ['easiest', 'Easiest method', 'The most forgiving way to do each job.', 'glue'],
    ['professional', 'Professional finish', 'The neatest result, even if it means buying a tool.', 'router'],
  ];
  const buying = plan.tools.filter((t) => t.status === 'buyOrBorrow').map((t) => t.name);
  const has = (id: ToolId) => plan.inputs.find((i) => i.path === `tools.${id}`)?.value === true;
  const chosenPanel = (plan.inputs.find((i) => i.path === 'fronts.panelMethod')?.value ?? 'auto') as 'auto' | PanelMethod;
  const panelOptions: readonly ['auto' | PanelMethod, string, string][] = [
    ['auto', "The app's choice", 'The easiest method your tools allow.'],
    ['routedRecess', 'Recess routed after assembly', 'Build the frame, then rout a recess round the back and glue the panel in. Needs a router.'],
    ['stoppedGroove', 'Groove before assembly (advanced)', 'A groove in each frame piece, stopped short of the ends. Needs a router and some care.'],
    ['panelOnBack', 'Panel on the back', 'No router needed. The panel is glued and nailed to the back of the frame.'],
  ];
  const yours = listed.filter((i) => i.origin === 'user');
  const toCheck = listed.filter((i) => i.origin !== 'user' && i.checkAt === 'cutting');
  const apps = listed.filter((i) => i.origin !== 'user' && i.checkAt !== 'cutting');

  const group = (title: string, blurb: string, inputs: readonly ResolvedInput[]) =>
    inputs.length > 0 && (
      <section>
        <h2>{title}</h2>
        <p>{blurb}</p>
        <ul className="choices">
          {inputs.map((input) => (
            <Row key={input.path} input={input} design={design} onChange={onChange} />
          ))}
        </ul>
      </section>
    );

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(toProjectFile(design, checked), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'build-by-piece-project.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const loaded = fromProjectText(await file.text());
    setImportError(loaded ? '' : 'That file is not a Build by Piece project.');
    if (loaded) onReplace(loaded);
  };

  return (
    <>
      <section>
        <h2>How should the plan choose?</h2>
        <ul className="approaches">
          {approaches.map(([value, name, note, icon]) => (
            <li key={value}>
              <button type="button" aria-pressed={approach === value} onClick={() => onChange(withApproach(design, value))}>
                <Icon id={icon} />
                <span>
                  <strong>{name}</strong>
                  <span className="hint">{note}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p>
          <strong>To buy or borrow now:</strong> {buying.length > 0 ? buying.join(', ') : 'nothing'}.
        </p>
      </section>

      <section>
        <h2>Your tools</h2>
        <p>Tick what you have. The plan picks its methods to suit, and tells you if it needs something you do not have.</p>
        <ul className="toolTicks">
          {toolList.map((tool) => (
            <li key={tool.id}>
              <label>
                <input type="checkbox" checked={has(tool.id)} onChange={(e) => onChange(withTool(design, tool.id, e.target.checked))} />
                <Icon id={tool.id} />
                <span>
                  <strong>{tool.name}</strong>
                  <span className="hint">{tool.changes}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Framed doors and drawer fronts</h2>
        <p>How the thin centre panel is held in its frame.</p>
        <ul className="methodPick">
          {panelOptions.map(([value, name, note]) => (
            <li key={value}>
              <button type="button" aria-pressed={chosenPanel === value} onClick={() => onChange(withPanelMethod(design, value))}>
                {name}
              </button>
              <p className="hint">{note}</p>
            </li>
          ))}
        </ul>
        {plan.methods && chosenPanel === 'auto' && (
          <p>
            <strong>Using now:</strong> {panelOptions.find(([value]) => value === plan.methods!.panel)?.[1] ?? 'Groove cut on the table saw'}.
          </p>
        )}
      </section>

      {group('You entered', 'Your numbers and anything you changed.', yours)}
      {group('Check before you cut', 'Standard sizes the app is using for now. Measure the real sheet before cutting and change the number if it differs.', toCheck)}
      {group("The app's choices", 'Nothing here needs your attention. Change any of them if you want to.', apps)}

      <section>
        <h2>Words you might hear</h2>
        <p>The app uses plain words. Here is what woodworkers call the same things.</p>
        <ul className="words">
          {glossary.map((entry) => (
            <li key={entry.term}>
              <details>
                <summary>
                  {entry.plain}
                  {entry.term.toLowerCase() !== entry.plain.toLowerCase() && <span className="tradeWord"> “{entry.term}”</span>}
                </summary>
                <p>{entry.meaning}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Your project</h2>
        <p>It is saved on this device as you go. Keep a backup file if you like.</p>
        <div className="projectActions">
          <button type="button" onClick={exportFile}>
            Save a backup file
          </button>
          <label className="fileButton">
            Open a backup file
            <input type="file" accept="application/json,.json" onChange={(e) => void importFile(e.target.files?.[0])} />
          </label>
          <button type="button" onClick={() => onReplace({ design: design.projectType === 'run' ? startingRun : startingDesign, checked: {} })}>
            Start over
          </button>
        </div>
        {importError && <p className="hint bad">{importError}</p>}
      </section>
    </>
  );
}
