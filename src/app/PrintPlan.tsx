import type { PlanResult, Design } from '../engine/types';
import { CutListTab } from './CutListTab';
import { CuttingTab } from './CuttingTab';
import { FloorView, FrontView } from './FrontView';
import { ShoppingTab } from './ShoppingTab';
import { StepView } from './steps/StepView';

/** Everything on paper: sizes, shopping, cut list, cutting diagrams and every step. */
export function PrintPlan({ design, plan }: { design: Design; plan: PlanResult }) {
  return (
    <div className="printPlan">
      <h1>Build by Piece: {design.name}</h1>
      <p>
        {design.projectType === 'run' ? `A run ${design.length.entered}" long` : `${design.width.entered}" wide`} × {design.depth.entered}" deep × {design.height.entered}" high. Depth is wall to
        the front of the face frame; height is the box without the platform or top.
      </p>
      <FloorView plan={plan} />
      <FrontView plan={plan} />
      {plan.run?.second && <FrontView plan={plan} wall={2} />}
      <ShoppingTab plan={plan} checked={{}} onCheck={() => undefined} forPrint />
      <CutListTab plan={plan} forPrint />
      <CuttingTab design={design} plan={plan} onChange={() => undefined} checked={{}} onCheck={() => undefined} forPrint />
      {plan.steps.map((step) => (
        <StepView key={step.id} plan={plan} step={step} />
      ))}
    </div>
  );
}
