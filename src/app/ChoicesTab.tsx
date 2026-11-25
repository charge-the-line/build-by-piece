import { useState } from 'react';
import type { PlanResult, ResolvedInput, VanityDesign } from '../engine/types';
import { formatLength } from '../engine/units';
import { choiceWords, fmt } from './format';
import { glossary } from './glossary';
import { LengthField } from './LengthField';
import { type Checked, fromProjectText, isChangeable, startingDesign, toProjectFile, withChange } from './project';

interface Props {
  readonly design: VanityDesign;
  readonly plan: PlanResult;
  readonly onChange: (design: VanityDesign) => void;
  readonly checked: Checked;
  readonly onReplace: (project: { design: VanityDesign; checked: Checked }) => void;
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
  const yours = plan.inputs.filter((i) => i.origin === 'user');
  const toCheck = plan.inputs.filter((i) => i.origin !== 'user' && i.checkAt === 'cutting');
  const apps = plan.inputs.filter((i) => i.origin !== 'user' && i.checkAt !== 'cutting');

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
          <button type="button" onClick={() => onReplace({ design: startingDesign, checked: {} })}>
            Start over
          </button>
        </div>
        {importError && <p className="hint bad">{importError}</p>}
      </section>
    </>
  );
}
