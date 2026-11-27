import { useState } from 'react';
import type { PlanResult, Step } from '../engine/types';
import { doneKey, progressOf } from './progress';
import { StepView } from './steps/StepView';
import { chapterNames } from './steps/templates';

interface Props {
  readonly plan: PlanResult;
  readonly checked: Readonly<Record<string, boolean>>;
  readonly onCheck: (key: string, value: boolean) => void;
  readonly onPrint: () => void;
}

export function BuildTab({ plan, checked, onCheck, onPrint }: Props) {
  const isDone = (s: Step) => checked[doneKey(s)] === true;
  // Open at the first step not yet done.
  const [index, setIndex] = useState(() => Math.max(0, plan.steps.findIndex((s) => !isDone(s))));
  if (!plan.canGeneratePlan || plan.steps.length === 0) {
    return (
      <section>
        <h2>Build</h2>
        <p>There is a problem with the sizes. Fix it on the Size screen and the building steps will appear here.</p>
      </section>
    );
  }
  const last = plan.steps.length - 1;
  const at = Math.min(index, last);
  const step = plan.steps[at]!;
  const done = plan.steps.filter(isDone).length;
  const tally = progressOf(plan, checked);
  // In a run she jumps between cabinets; in a single cabinet, between chapters.
  const groupOf = (s: Step) => (plan.run ? (s.cabinet ? `${s.cabinet.id} ${s.cabinet.name}` : 'Putting the run in place') : chapterNames[s.chapter]);
  const groups = [...new Set(plan.steps.map(groupOf))];
  const go = (to: number) => {
    setIndex(Math.max(0, Math.min(last, to)));
    window.scrollTo({ top: 0 });
  };
  const finishStep = () => {
    onCheck(doneKey(step), true);
    go(at + 1);
  };
  const groupState = (group: string) => {
    const mine = plan.steps.filter((s) => groupOf(s) === group);
    // Open a group at its first step still to do.
    const next = mine.find((s) => !isDone(s)) ?? mine[0]!;
    return { first: plan.steps.indexOf(next), done: mine.filter(isDone).length, total: mine.length };
  };

  return (
    <>
      <section className="progress" aria-label="Progress">
        <progress value={done} max={plan.steps.length} aria-label={`${done} of ${plan.steps.length} steps done`} />
        <p>
          {done} of {plan.steps.length} steps done
        </p>
        <ul className="tallies">
          <li>
            <strong>
              {tally.bought.done}/{tally.bought.total}
            </strong>{' '}
            bought
          </li>
          <li>
            <strong>
              {tally.cut.done}/{tally.cut.total}
            </strong>{' '}
            pieces cut
          </li>
          <li>
            <strong>
              {tally.built.done}/{tally.built.total}
            </strong>{' '}
            steps built
          </li>
        </ul>
      </section>

      <StepView plan={plan} step={step} />

      <div className="stepNav">
        <button type="button" disabled={at === 0} onClick={() => go(at - 1)}>
          Back
        </button>
        <button type="button" className="primary" onClick={finishStep}>
          {isDone(step) ? 'Next' : at === last ? 'Done' : 'Done, next'}
        </button>
      </div>
      {isDone(step) && (
        <button type="button" className="quiet" onClick={() => onCheck(doneKey(step), false)}>
          Mark this step as not done
        </button>
      )}

      <section>
        <h2>Jump to</h2>
        <ul className="chapters">
          {groups.map((group) => {
            const state = groupState(group);
            return (
              <li key={group}>
                <button type="button" aria-current={groupOf(step) === group ? 'step' : undefined} onClick={() => go(state.first)}>
                  <span>{group}</span>
                  <span className="chapterCount">
                    {state.done} of {state.total}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>Print the whole plan</h2>
        <button type="button" onClick={onPrint}>
          Print or save as PDF
        </button>
      </section>
    </>
  );
}
