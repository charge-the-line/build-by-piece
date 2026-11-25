import { useState } from 'react';
import type { PlanResult, Step } from '../engine/types';
import { checkKey, StepView } from './steps/StepView';
import { stepTemplates } from './steps/templates';

interface Props {
  readonly plan: PlanResult;
  readonly checked: Readonly<Record<string, boolean>>;
  readonly onCheck: (key: string, value: boolean) => void;
  readonly onPrint: () => void;
}

export function BuildTab({ plan, checked, onCheck, onPrint }: Props) {
  const keysOf = (s: Step) => stepTemplates[s.templateId]!.checklist(s.values).map((_, i) => checkKey(s, i));
  const stepDone = (s: Step) => keysOf(s).every((k) => checked[k]);
  // Open at the first step that still has something to check.
  const [index, setIndex] = useState(() => Math.max(0, plan.steps.findIndex((s) => !stepDone(s))));
  if (!plan.canGeneratePlan || plan.steps.length === 0) {
    return (
      <section>
        <h2>Build</h2>
        <p>There is a problem with the sizes. Fix it on the Size screen and the building steps will appear here.</p>
      </section>
    );
  }
  const step = plan.steps[Math.min(index, plan.steps.length - 1)]!;
  const allKeys = plan.steps.flatMap(keysOf);
  const done = allKeys.filter((k) => checked[k]).length;
  const go = (to: number) => {
    setIndex(to);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <section className="progress" aria-label="Progress">
        <p>
          <strong>
            Step {step.number} of {plan.steps.length}
          </strong>{' '}
          · {done} of {allKeys.length} checks done
        </p>
        <progress value={done} max={allKeys.length} />
        <ol className="stepDots">
          {plan.steps.map((s, i) => (
            <li key={s.id}>
              <button type="button" aria-current={s.id === step.id ? 'step' : undefined} aria-label={`Step ${s.number}: ${stepTemplates[s.templateId]!.title}${stepDone(s) ? ', done' : ''}`} className={stepDone(s) ? 'done' : ''} onClick={() => go(i)}>
                {s.number}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <StepView plan={plan} step={step} checked={checked} onCheck={onCheck} />

      <div className="stepNav">
        <button type="button" disabled={step.number === 1} onClick={() => go(step.number - 2)}>
          Back
        </button>
        <button type="button" className="primary" disabled={step.number === plan.steps.length} onClick={() => go(step.number)}>
          Next step
        </button>
      </div>

      <section>
        <h2>Print the whole plan</h2>
        <p>Shopping list, cut list, cutting diagrams and every step, ready to print or save as a PDF.</p>
        <button type="button" onClick={onPrint}>
          Print or save as PDF
        </button>
      </section>
    </>
  );
}
