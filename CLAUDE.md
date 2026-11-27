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

**Phase 9 is live. Next is a row of upper cabinets over a run: its rules are proposed in `docs/UPPERS-PROPOSAL.md` and waiting for Max's approval. Do not write that code until Max approves the document and answers its questions. Corners and a room follow, each with its own proposal.**

A project is now either one cabinet or a run: several base cabinets and appliance spaces along one wall, sized by the app from the run's length, with one platform per stretch, shared cutting diagrams and one shopping list (section R of the rules). The run is tested against a made-up 120" wall.

As single cabinets the app plans five: the bathroom vanity, and a kitchen base cabinet, drawer base, sink base and upper cabinet (section K of the rules). All are tested against made-up standard sizes; there are no real kitchen measurements yet.

Ashley asked for a much larger, picture-first product; her feedback and Max's decisions are recorded in `docs/OPEN-QUESTIONS.md`, with what is still to do. Her rule for every screen: **more pictures, fewer words.** On construction screens aim for one or two short sentences per step, with anything longer behind "More detail".

She ticks her tools on the Choices screen (defaults are her own list). The plan picks the method for each job from those ticks, lists "Tools for this plan" with the exact bits and safety gear, and never blocks on a missing tool: it says what to buy or borrow.

The engine builds a full plan from three numbers: openings, cut list, cutting diagrams, shopping list, hardware, validation, a 3D position for every piece, and assembly steps. The app has six screens: Size, Choices, Parts, Cutting, Shop, Build, plus a projects panel opened from the header. She can change the door and drawer layout on the Size screen, tap a part to see its trade term, and print the whole plan.

Test cases: vanity 01, 60" wide × 21" deep × 30" high, left end on a wall, right end exposed; and the five kitchen fixtures in `fixtures/kitchen.ts`. The earlier AI mock-up survives only as a fixture of known errors.

Known limits: front styles (flat or framed) cannot be changed in the app; screws are counted but glue, nails and finish are not; the door and drawer layout can only be changed for the vanity; a run is one straight wall of base cabinets (no corners, no uppers in the same project); a whole room and other project types show as "Not yet". Everything under "Later" needs its rules agreed with Max first, as in Phase 0.

| Phase | What | Status |
|---|---|---|
| 0 | Scaffold, rules, data model, fixture, test list | Done |
| 1 | Engine and vanity: questionnaire, validation, cut list, shopping list | Done |
| 2 | Cutting diagrams: kerf, grain, cut order, offcuts | Done |
| 3 | Assembly steps, checklists, print to PDF | Done |
| 4 | Finish v1: layout editor, glossary, supplies list | Done |
| 5 | Tool inventory driving the method | Done |
| 6 | Picture-first Build screen: small steps, arrows, glue, screws, tool pictures | Done |
| 7 | Cutting tick-off and sizes; picture shopping lists; three approaches; multiple projects | Done |
| 8 | Kitchen cabinets: base, drawer base, sink base, upper (one at a time) | Done |
| 9 | A run of cabinets along one wall: shared widths, platform, shopping and cutting | Done |
| 10 | Upper cabinets over a run | Rules proposed, in review |
| Later | Corners, then a room (rules first); prices, 3D and AI undecided | Not started |

Update this section at the end of every phase.

## Architecture

```
src/engine/      Pure TypeScript. Design + defaults + catalog in; parts, diagrams, materials, hardware, positions, issues, steps out.
  types.ts         The data model.
  units.ts         Parsing typed lengths to ticks and printing tape-measure text. The only unit conversion.
  derive.ts        Values that remember their source; builds each part's "how this was worked out".
  resolve.ts       Lays the user's changes over the defaults and reads every value, with its label and status.
  layout.ts        Sizes and places every opening; the "does not add up" checks (rules L1-L5).
  vanity.ts        The construction rules for every cabinet kind: one block per rule in docs/RULES.md. Also places every piece in 3D (rule A0).
  methods.ts       Chooses a method for each job from the tools ticked, and lists the tools a plan needs (rules T1-T8).
  geometry.ts      Where pieces meet (glue faces) and where screws go along a joint (rule J4).
  assembly.ts      The small assembly steps: pieces and the way each arrives, glue, screws, tools, hardware (section A).
  cutting.ts       Cutting diagrams (rules C1-C6); the shopping list is the diagrams, counted.
  generatePlan.ts  The engine's entry point for one cabinet.
  run.ts           The entry point for a run: shares the length out, plans each cabinet, adds the run's platform, cutting and steps (section R).
  colorRoles.ts    The fixed instructional colours (data).
  defaults/        Every value the app decides: vanity.ts (options, layouts), cabinets.ts (cabinet kinds, starting sizes, proposed layouts), run.ts (appliance spaces, width limits, the test wall), catalog.ts (materials, hardware, supplies), tools.ts (tool list, default ticks, safety gear).
  fixtures/        vanity-01.ts and kitchen.ts are the test cases (a kind and three numbers each). mockup-errors.ts holds the old mock-up's mistakes.
  __tests__/       Vitest tests. The expected sizes are the worked example in docs/RULES.md.
src/app/         React UI: Size (or Run, for a run), Choices, Parts, Cutting, Shop and Build screens. Imports from the engine; never the reverse.
  steps/           Step pictures (drawn from the engine's positions), tool icons, and the written step templates.
  PrintPlan.tsx    The whole plan on paper; built only when Print is pressed.
  LayoutEditor.tsx Doors and drawers by space; sizes stay with the rules (rule L0a).
  project.ts       Every project on this device and which is open; ticks for bought, cut and built are saved with each.
  progress.ts      The keys for those ticks, and the counts.
  glossary.ts      Plain words and their trade terms.
                 The UI does no arithmetic on dimensions and prints lengths only through `fmt` (src/app/format.ts).
docs/RULES.md    Construction rules with formulas. The engine implements exactly these.
docs/OPEN-QUESTIONS.md   Decisions waiting on Max, and the record of what he decided.
docs/TOOLS-PROPOSAL.md   The approved tool-inventory proposal: what changed on approval, and Max's answers.
docs/CABINETS-PROPOSAL.md   The approved kitchen cabinets proposal (stage 1 built).
docs/RUN-PROPOSAL.md   The approved proposal for a run of cabinets along a wall (built).
docs/UPPERS-PROPOSAL.md   Proposed rules for upper cabinets over a run (not yet approved or built).
public/          Web app manifest and icons.
```

Engine rules:

- `src/engine/` has no UI, DOM or network imports. `architecture.test.ts` enforces this.
- **No floating-point lengths.** Lengths are whole `Ticks`: 4,064 per inch, 127 per 1/32", 160 per mm (rule U1). Rounding happens once, when printing, to a tape mark (1/16", optionally 1/32", or 1 mm).
- Inputs are kept as typed (`Measurement.entered`) and parsed by the engine. Fractional inches, decimal inches and millimetres are accepted.
- Every value has a status (`confirmed` or `assumed`) and an origin (`user` or `appDefault`). Plans show three labels: You entered, App's choice, Check before you cut (rule G3).
- Every part has a stable ID (P01, P02, ... for one cabinet; C01-01 in a run; R-01 for a run's platform and toe kick), plain-English name, colour role, material, thickness, length, width, grain, quantity, and a derivation (rule number, formula, inputs).
- Material and hardware sizes are data: nominal versus actual lumber, sheet sizes, slide clearances and lengths. Plywood thickness defaults to the standard sheet and is checked at the cutting step.
- Tools are data (`src/engine/defaults/tools.ts`) and ticks are choices with defaults. A method that changes a size is a rule with its own formulas (D5, D9, D10). Solid-wood parts default to boards as sold whatever the tools (rules M5, T3).
- A missing tool never blocks a plan; it becomes a "buy or borrow" line (rule T2).
- Validation returns structured issues: severity, parts, explanation, suggested fix. Any error blocks plan generation.
- Every rule in the engine cites its number in `docs/RULES.md`. Change the document and the code together.
- No AI calls, no accounts, no backend (reconfirmed 27 Nov; revisit with the room planner). Explanations are written templates filled with the user's numbers. Projects save on the device, with export and import of a project file.
- Colour roles are fixed everywhere: blue left side, green right side, yellow bottom, purple back, orange platform and toe kick, red dividers, teal face frame, pink doors, light blue drawer fronts (and fixed sink panels), grey support pieces, white (dark outline) drawer boxes, brown top panel on wall cabinets; shelves are red like dividers. In step pictures, lime marks glue and black dots mark screws; no part uses those. Never rely on colour alone; always show the part ID.

## Working rules

- Max is new to the command line and git and often works from his phone. Anything he must do himself gets numbered, copy-and-paste steps.
- The app is used in a garage on a phone or tablet: large tap targets, large type, high contrast, one-handed.
- More pictures, fewer words. A picture, part numbers and sizes first; one or two short sentences; detail on request.
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
