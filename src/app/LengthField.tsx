import { useEffect, useId, useState } from 'react';
import { parseLength } from '../engine/units';

interface Props {
  readonly label: string;
  /** The text currently saved in the design. */
  readonly value: string;
  readonly hint?: string;
  /** Called only with text that is a usable length. */
  readonly onValid: (entered: string) => void;
}

/** A big text box for one length. Explains a bad entry instead of accepting it. */
export function LengthField({ label, value, hint, onValid }: Props) {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const parsed = parseLength(text, 'in');
  const change = (next: string) => {
    setText(next);
    if (parseLength(next, 'in').ok) onValid(next.trim());
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="fieldRow">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          aria-invalid={!parsed.ok}
          aria-describedby={`${id}-help`}
          onChange={(e) => change(e.target.value)}
        />
        <span className="unit" aria-hidden="true">
          inches
        </span>
      </div>
      <p id={`${id}-help`} className={parsed.ok ? 'hint' : 'hint bad'}>
        {parsed.ok ? (hint ?? 'Like 60 or 60 1/2') : `${parsed.reason} Still using ${value}.`}
      </p>
    </div>
  );
}
