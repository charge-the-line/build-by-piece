import { choicesOf, layoutFrom, MAX_BAYS, MAX_DRAWERS_PER_COLUMN, proposedVanityLayout, type BayChoice } from '../engine/defaults/vanity';
import type { VanityDesign } from '../engine/types';

interface Props {
  readonly design: VanityDesign;
  readonly onChange: (design: VanityDesign) => void;
}

/**
 * Doors and drawers, left to right. She picks what goes where; every size is
 * still worked out by the rules, so the layout always adds up.
 */
export function LayoutEditor({ design, onChange }: Props) {
  const chosen = design.overrides.layout;
  const custom = Array.isArray(chosen);
  const choices = choicesOf(custom ? chosen : proposedVanityLayout);

  const set = (next: readonly BayChoice[] | undefined) => {
    const { layout: _dropped, ...rest } = design.overrides;
    onChange({ ...design, overrides: next ? { ...rest, layout: layoutFrom(next) } : rest });
  };
  const replace = (index: number, value: BayChoice) => set(choices.map((c, i) => (i === index ? value : c)));

  return (
    <section>
      <h2>Doors and drawers</h2>
      <p>Left to right, as you face the cabinet. Change what goes where and the app works out every size again.</p>
      <ol className="bays">
        {choices.map((choice, i) => (
          <li key={i}>
            <span className="bayNumber" aria-hidden="true">
              {i + 1}
            </span>
            <div className="bayControls">
              <div className="pair" role="group" aria-label={`Space ${i + 1}`}>
                <button type="button" aria-pressed={choice === 'door'} onClick={() => replace(i, 'door')}>
                  Door
                </button>
                <button type="button" aria-pressed={choice !== 'door'} onClick={() => replace(i, choice === 'door' ? 3 : choice)}>
                  Drawers
                </button>
              </div>
              {choice !== 'door' && (
                <div className="stepper" role="group" aria-label={`Number of drawers in space ${i + 1}`}>
                  <button type="button" aria-label="One drawer fewer" disabled={choice <= 1} onClick={() => replace(i, choice - 1)}>
                    −
                  </button>
                  <span>
                    {choice} {choice === 1 ? 'drawer' : 'drawers'}
                  </span>
                  <button type="button" aria-label="One drawer more" disabled={choice >= MAX_DRAWERS_PER_COLUMN} onClick={() => replace(i, choice + 1)}>
                    +
                  </button>
                </div>
              )}
              {choices.length > 1 && (
                <button type="button" className="quiet" onClick={() => set(choices.filter((_, j) => j !== i))}>
                  Remove space {i + 1}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="projectActions">
        <button type="button" disabled={choices.length >= MAX_BAYS} onClick={() => set([...choices, 'door'])}>
          Add a door
        </button>
        <button type="button" disabled={choices.length >= MAX_BAYS} onClick={() => set([...choices, 3])}>
          Add drawers
        </button>
        {custom && (
          <button type="button" onClick={() => set(undefined)}>
            Use the app's layout
          </button>
        )}
      </div>
      <p className="hint">
        In a drawer column the small drawers are on top and the bottom drawer takes the rest of the height.
      </p>
    </section>
  );
}
