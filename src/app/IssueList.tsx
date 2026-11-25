import type { SumDiagram, ValidationIssue } from '../engine/types';
import { colorOf, fmt } from './format';

/** A "does not add up" picture: every piece end to end against the total it should fill. */
function SumPicture({ diagram }: { diagram: SumDiagram }) {
  const used = diagram.segments.reduce((total, s) => total + s.length, 0);
  const span = Math.max(diagram.total, used);
  const pct = (ticks: number) => `${(ticks / span) * 100}%`;
  const short = diagram.difference > 0;
  return (
    <div className="sum">
      <div className="sumBar" aria-hidden="true">
        {diagram.segments.map((s, i) => (
          <span key={i} style={{ width: pct(s.length), background: colorOf(s.colorRole ?? 'support').hex }} />
        ))}
        {short && <span className="gap" style={{ width: pct(diagram.difference) }} />}
      </div>
      <div className="sumTotal" aria-hidden="true" style={{ width: pct(diagram.total) }}>
        {diagram.totalLabel}: {fmt(diagram.total)}
      </div>
      <ul>
        {diagram.segments.map((s, i) => (
          <li key={i}>
            <span className="dot" style={{ background: colorOf(s.colorRole ?? 'support').hex }} />
            {s.label}: {fmt(s.length)}
          </li>
        ))}
        <li className="gapLine">
          <span className="dot gap" />
          {short ? `Unexplained: ${fmt(diagram.difference)}` : `Too much by: ${fmt(diagram.difference).replace('-', '')}`}
        </li>
      </ul>
    </div>
  );
}

export function IssueList({ issues }: { issues: readonly ValidationIssue[] }) {
  if (issues.length === 0) return null;
  const errors = issues.filter((i) => i.severity === 'error').length;
  return (
    <section className="issues" aria-live="polite">
      <h2>{errors > 0 ? `${errors === 1 ? 'One thing' : `${errors} things`} to fix before the plan can be made` : 'Worth a look'}</h2>
      {issues.map((issue, i) => (
        <article key={i} className={`issue ${issue.severity}`}>
          <p className="what">
            <strong>{issue.severity === 'error' ? 'Problem' : 'Heads up'}:</strong> {issue.explanation}
          </p>
          {issue.diagram && <SumPicture diagram={issue.diagram} />}
          <p className="fix">
            <strong>Fix:</strong> {issue.suggestedFix}
          </p>
        </article>
      ))}
    </section>
  );
}
