# Build by Piece

A web app that turns three measurements into a complete, validated woodworking plan: shopping list, cut list, per-sheet cutting diagrams, and illustrated assembly steps. The first user is a visual beginner who wants professional results without jargon or maths. The first project is a bathroom vanity; the same engine must later handle other cabinets and a full kitchen.

Full background: `PHASE-0-BRIEF.md`.

## Core rules

### 1. Every dimension comes from code, never from AI-generated text or images.

This outranks everything else.

- No dimension is hand-typed into a drawing, a step, a template or a component. Drawings are SVG generated from the part list.
- The only hand-written numbers are the user's inputs (in a design), material and hardware data (`src/engine/defaults/catalog.ts`), and defaults (`src/engine/defaults/vanity.ts`). Worked examples in `docs/` are for human review and are never read by the app.
- If a number is needed and no rule produces it, add a rule to `docs/RULES.md` first, then code it.

### 2. Never ask for a measurement the app can decide itself.

From Ashley, the first user.

- The user enters **overall width, depth and height**. The app builds the whole plan from those three.
- Every other value is a **visible default she can change**: shown with its value and a one-line reason, never required. A design file stores only the three numbers and whatever she changed (`VanityDesign.overrides`).
- Before adding any new input, ask whether a rule or a default could decide it. If so, it is a default.
- The app shows a picture of exactly what each of the three numbers includes (rule G2): width is the full cabinet end to end; depth is wall to the front of the face frame; height is the box without the platform or top.
- A default that stands in for something real (plywood thickness) is flagged `checkAt: 'cutting'`, and the app prompts her to check it at that step, not up front.
- Choices such as "which ends touch a wall" are choices with defaults, not required questions.

## Current status

**Version 1 is feature-complete and waiting for Max's review. Nothing further is planned until Max says what is next.**

The engine builds a full plan from three numbers: openings, cut list, cutting diagrams, shopping list, hardware, validation, a 3D position for every piece, and assembly steps. The app has six screens: Size, Choices, Parts, Cutting, Shop, Build. She can change the door and drawer layout on the Size screen, tap a part to see its trade term, and print the whole plan.

Test case: vanity 01, 60" wide × 21" deep × 30" high, left end on a wall, right end exposed. The earlier AI mock-up survives only as a fixture of known errors.

Known limits: front styles (flat or framed) cannot be changed in the app; amounts of screws, glue and other supplies are not worked out; only the vanity exists. Everything under "Later" needs its rules agreed with Max first, as in Phase 0.

| Phase | What | Status |
|---|---|---|
| 0 | Scaffold, rules, data model, fixture, test list | Done |
| 1 | Engine and vanity: questionnaire, validation, cut list, shopping list | Done |
| 2 | Cutting diagrams: kerf, grain, cut order, offcuts | Done |
| 3 | Assembly steps, checklists, print to PDF | Done |
| 4 | Finish v1: layout editor, glossary, supplies list | Done, in review |
| Later | Tool inventory, other cabinets, kitchen | Not started |

Update this section at the end of every phase.

## Architecture

```
src/engine/      Pure TypeScript. Design + defaults + catalog in; parts, diagrams, materials, hardware, positions, issues, steps out.
  types.ts         The data model.
  units.ts         Parsing typed lengths to ticks and printing tape-measure text. The only unit conversion.
  derive.ts        Values that remember their source; builds each part's "how this was worked out".
  resolve.ts       Lays the user's changes over the defaults and reads every value, with its label and status.
  layout.ts        Sizes and places every opening; the "does not add up" checks (rules L1-L5).
  vanity.ts        The construction rules: one block per rule in docs/RULES.md. Also places every piece in 3D (rule A0).
  assembly.ts      The assembly steps: parts, joints, hardware and the numbers each step quotes (rules A1-A12).
  cutting.ts       Cutting diagrams (rules C1-C6); the shopping list is the diagrams, counted.
  generatePlan.ts  The engine's single entry point.
  colorRoles.ts    The fixed instructional colours (data).
  defaults/        Every value the app decides: vanity.ts (options, proposed layout), catalog.ts (materials, hardware).
  fixtures/        vanity-01.ts is the test case (three numbers). mockup-errors.ts holds the old mock-up's mistakes.
  __tests__/       Vitest tests. The expected sizes are the worked example in docs/RULES.md.
src/app/         React UI: Size, Choices, Parts, Cutting, Shop and Build screens. Imports from the engine; never the reverse.
  steps/           Step pictures (drawn from the engine's positions) and the written step templates.
  PrintPlan.tsx    The whole plan on paper; built only when Print is pressed.
  LayoutEditor.tsx Doors and drawers by space; sizes stay with the rules (rule L0a).
  glossary.ts      Plain words and their trade terms.
                 The UI does no arithmetic on dimensions and prints lengths only through `fmt` (src/app/format.ts).
docs/RULES.md    Construction rules with formulas. The engine implements exactly these.
docs/OPEN-QUESTIONS.md   Decisions waiting on Max, and the record of what he decided.
public/          Web app manifest and icons.
```

Engine rules:

- `src/engine/` has no UI, DOM or network imports. `architecture.test.ts` enforces this.
- **No floating-point lengths.** Lengths are whole `Ticks`: 4,064 per inch, 127 per 1/32", 160 per mm (rule U1). Rounding happens once, when printing, to a tape mark (1/16", optionally 1/32", or 1 mm).
- Inputs are kept as typed (`Measurement.entered`) and parsed by the engine. Fractional inches, decimal inches and millimetres are accepted.
- Every value has a status (`confirmed` or `assumed`) and an origin (`user` or `appDefault`). Plans show three labels: You entered, App's choice, Check before you cut (rule G3).
- Every part has a stable ID (P01, P02, ...), plain-English name, colour role, material, thickness, length, width, grain, quantity, and a derivation (rule number, formula, inputs).
- Material and hardware sizes are data: nominal versus actual lumber, sheet sizes, slide clearances and lengths. Plywood thickness defaults to the standard sheet and is checked at the cutting step.
- Tools on hand: a router, no table saw. Solid-wood parts default to boards as sold, with no lengthwise cuts (rule M5).
- Validation returns structured issues: severity, parts, explanation, suggested fix. Any error blocks plan generation.
- Every rule in the engine cites its number in `docs/RULES.md`. Change the document and the code together.
- No AI calls, no accounts, no backend in v1. Explanations are written templates filled with the user's numbers. Projects save on the device, with export and import of a project file.
- Colour roles are fixed everywhere: blue left side, green right side, yellow bottom, purple back, orange platform and toe kick, red dividers, brown face frame, teal doors, pink drawer fronts, grey support pieces, white (dark outline) drawer boxes. Never rely on colour alone; always show the part ID.

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
