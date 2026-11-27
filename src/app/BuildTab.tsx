import { useState } from 'react';
import type { PlanResult, Step, StepChapter } from '../engine/types';
import { StepView } from './steps/StepView';
import { chapterNames } from './steps/templates';

interface Props {
  readonly plan: PlanResult;
  readonly checked: Readonly<Record<string, boolean>>;
  readonly onCheck: (key: string, value: boolean) => void;
  readonly onPrint: () => void;
}

export const doneKey = (step: Step) => `${step.id}:done`;

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
  const chapters = [...new Set(plan.steps.map((s) => s.chapter))];
  const go = (to: number) => {
    setIndex(Math.max(0, Math.min(last, to)));
    window.scrollTo({ top: 0 });
  };
  const finishStep = () => {
    onCheck(doneKey(step), true);
    go(at + 1);
  };
  const chapterState = (chapter: StepChapter) => {
    const mine = plan.steps.filter((s) => s.chapter === chapter);
    return { first: plan.steps.indexOf(mine[0]!), done: mine.filter(isDone).length, total: mine.length };
  };

  return (
    <>
      <section className="progress" aria-label="Progress">
        <progress value={done} max={plan.steps.length} aria-label={`${done} of ${plan.steps.length} steps done`} />
        <p>
          {done} of {plan.steps.length} steps done
        </p>
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
          {chapters.map((chapter) => {
            const state = chapterState(chapter);
            return (
              <li key={chapter}>
                <button type="button" aria-current={step.chapter === chapter ? 'step' : undefined} onClick={() => go(state.first)}>
                  <span>{chapterNames[chapter]}</span>
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
