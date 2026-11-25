# Build by Piece

A web app that turns a few measurements and choices into a complete, validated woodworking plan: shopping list, cut list, per-sheet cutting diagrams, and illustrated assembly steps. The first user is a visual beginner who wants professional results without jargon or maths. The first project is a bathroom vanity; the same engine must later handle other cabinets and a full kitchen.

Full background: `PHASE-0-BRIEF.md`.

## The rule that outranks everything

**Every dimension comes from code, never from AI-generated text or images.**

- No dimension is hand-typed into a drawing, a step, a template or a component. Drawings are SVG generated from the part list.
- The only hand-written numbers are user inputs (in a design), material data (in a catalog), and rule defaults. Worked examples in `docs/` are for human review and are never read by the app.
- If a number is needed and no rule produces it, add a rule to `docs/RULES.md` first, then code it.

## Current status

**Phase 0 complete, waiting for Max's review. Do not start Phase 1 until Max approves `docs/RULES.md` and answers `docs/OPEN-QUESTIONS.md`.**

| Phase | What | Status |
|---|---|---|
| 0 | Scaffold, rules, data model, fixture, test list | Done, in review |
| 1 | Engine and vanity: questionnaire, validation, cut list, shopping list | Not started |
| 2 | Cutting diagrams: kerf, grain, cut order, offcuts | Not started |
| 3 | Assembly steps, checklists, print to PDF | Not started |
| Later | Tool inventory, other cabinets, kitchen | Not started |

Update this section at the end of every phase.

## Architecture

```
src/engine/      Pure TypeScript. Design + catalog in; parts, materials, issues, steps out.
  types.ts         The data model.
  colorRoles.ts    The fixed instructional colours (data).
  fixtures/        Test designs. vanity-01.ts is the first test case.
  __tests__/       Vitest tests. Pending tests (it.todo) are the Phase 1 to-do list.
src/app/         React UI. May import from the engine; the engine never imports from here.
docs/RULES.md    Construction rules with formulas. The engine implements exactly these.
docs/OPEN-QUESTIONS.md   Decisions waiting on Max.
public/          Web app manifest and icons.
```

Engine rules:

- `src/engine/` has no UI, DOM or network imports. `architecture.test.ts` enforces this.
- **No floating-point lengths.** Lengths are whole `Ticks`: 4,064 per inch, 127 per 1/32", 160 per mm (rule U1). Rounding happens once, when printing, to a tape mark (1/16", optionally 1/32", or 1 mm).
- Inputs are kept as typed (`Measurement.entered`) and parsed by the engine. Fractional inches, decimal inches and millimetres are accepted.
- Every input has a status, `confirmed` or `assumed`, and plans show which is which.
- Every part has a stable ID (P01, P02, ...), plain-English name, colour role, material, thickness, length, width, grain, quantity, and a derivation (rule number, formula, inputs).
- Material sizes are data: nominal versus actual lumber, sheet sizes, plywood thickness as an input.
- Validation returns structured issues: severity, parts, explanation, suggested fix. Any error blocks plan generation.
- Every rule in the engine cites its number in `docs/RULES.md`. Change the document and the code together.
- No AI calls, no accounts, no backend in v1. Explanations are written templates filled with the user's numbers. Projects save on the device, with export and import of a project file.
- Colour roles are fixed everywhere: blue left side, green right side, yellow bottom, purple back, orange platform, red dividers, brown face frame, teal doors, pink drawer fronts. Never rely on colour alone; always show the part ID.

## Working rules

- Max is new to the command line and git and often works from his phone. Anything he must do himself gets numbered, copy-and-paste steps.
- The app is used in a garage on a phone or tablet: large tap targets, large type, high contrast, one-handed.
- Beginner mode is the default. Plain words first ("vertical frame piece"), trade term in a tap-to-explain glossary ("stile").
- Consistent formatting: proper fractions for inches, commas in numbers of 1,000 or more, dollars as $1,234.56.
- Synthetic or placeholder data only. Never connect to an outside account or service.
- Small commits with clear messages. Run the tests before every commit.
- Each phase ends with a stop for Max's review.

## Commands

```bash
npm install        # once
npm run dev        # local preview
npm test           # run the tests
npm run build      # type-check and build into dist/
```

Pushing to `main` runs the tests, builds, and deploys to GitHub Pages (`.github/workflows/deploy.yml`). Other branches run tests and build only.
