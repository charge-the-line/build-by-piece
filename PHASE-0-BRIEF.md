# Build by Piece: Phase 0 Brief

## What this is

Build by Piece is a web app that turns a few measurements and choices into a complete, validated woodworking plan: shopping list, cut list, per-sheet cutting diagrams, and LEGO-style illustrated assembly steps. The first user is Ashley, a visual beginner who wants professional results without woodworking jargon or math. The first project type is a bathroom vanity. The same engine must later grow to other cabinets and a full kitchen.

The one rule that outranks everything else: **every dimension comes from code, never from AI-generated text or images.** This is a parametric design engine. Change the width and the bottom panel, back panel, face frame, openings, platform, and material counts all recalculate. A wrong number costs a $100 sheet of oak plywood.

## Phase 0 goal

Lay the foundation and get the construction rules approved **before** writing the engine. Phase 0 ends with a stop for review. Do not start Phase 1 until Max approves.

## Phase 0 deliverables

1. **Repo scaffold that deploys.** TypeScript, Vite, React, Vitest. Static site deployed to GitHub Pages by a GitHub Actions workflow. Include a web app manifest and icons so it can be added to an iPhone home screen from Safari. The deployed page can be a placeholder; the point is a working link on day one.
2. **CLAUDE.md** at the repo root: project purpose, the "dimensions come from code" rule, architecture, working rules below, and current phase status. Keep it updated at the end of every phase.
3. **docs/RULES.md**: the construction rules for a face-frame vanity on a separate 2x4 platform, in plain English, each with its formula. Example: "Bottom panel length = overall box width minus 2 x side panel thickness." Where several legitimate methods exist, pick the most beginner-friendly one (pocket holes and glue by default), say why in one line, and note the alternative.
4. **Data model** in `src/engine/types.ts` (types only, no logic yet), covering the design below.
5. **Test fixture and test list**: `src/engine/fixtures/vanity-01.ts` plus a list of test names (written as pending tests) covering the known errors in the section "First test case."
6. **Open questions for Max**: anything ambiguous, as a short numbered list.

Then stop and summarize.

## Architecture rules

- `src/engine/` is pure TypeScript with **no** UI, DOM, or network imports. It takes a design in and returns parts, materials, validation issues, and steps out. It must be runnable and testable on its own.
- **No floating-point dimensions.** Store every length as an exact integer in one small base unit (propose the unit in Phase 0; it must represent 1/32" and 1 mm inputs exactly or with a documented rounding rule). Output only values that exist on a tape measure: nearest 1/16" (1/32" optional) or 1 mm.
- Accept fractional inches, decimal inches, and metric as input.
- **Every input carries a status: confirmed or assumed.** Plans must show which is which.
- **Every part carries:** a stable part ID (P01, P02, ...), plain-English name, color role, material, thickness, length, width, grain direction, quantity, and a derivation (the plain-English formula and inputs that produced its size).
- **Material sizes are data, not constants in code:** nominal versus actual lumber (a 2x4 is 1 1/2" x 3 1/2"), sheet sizes, and plywood thickness as an input (3/4" plywood is often 23/32"; prompt the user to measure).
- **Validation returns structured issues:** severity, parts involved, plain-English explanation, and a suggested fix. Any error-level issue blocks plan generation.
- **All drawings are SVG generated from the part list.** No drawing may contain a hand-typed dimension.
- **No AI calls, no accounts, no backend in v1.** Beginner explanations are written templates filled in with the user's numbers. Projects save on the device, with export and import of a project file as backup.
- **Color roles are fixed everywhere** (shopping list, cut diagrams, exploded view, steps): blue left side, green right side, yellow bottom, purple back, orange platform, red interior dividers, brown face frame, teal doors, pink drawer fronts. Colors are instructional, not the wood color. Never rely on color alone; always show the part ID too.

## First test case: the bathroom vanity

These numbers come from an AI-generated mock-up and are **assumed** until Max supplies tape-measure values. Build the fixture so they are easy to replace.

- Box: about 79 1/2" wide, 30" tall, 20 1/2" deep, 3/4" plywood, full back panel, right side exposed oak
- Face frame: 3/4" solid oak, 1 1/2" stiles, 3" top and bottom rails
- Layout, left to right: drawer column, two doors, drawer column
- Each drawer column: two small fronts (5" x 13", slab) over one large front (10" x 13", shaker)
- Doors: two at 16" x 13", shaker, 2 1/4" frames, 1/4" oak plywood center panels
- Existing drawer boxes are reused; only the fronts are new
- Platform: 2x4s, 3 1/2" high, 17 1/2" deep, same width as the box, with a solid oak toe kick
- Top: 1 1/4" (3 cm) granite

The mock-up contains errors the engine must make impossible. Turn each into a test:

1. It shows five different overall widths (79 2/3", 79 1/3", 79 1/2", 79 3/5", 79 5/8"). One confirmed width must drive every part, and no output may use thirds or fifths of an inch.
2. Side stiles are listed at 25 1/2" on a 30" box. Stile length must follow from box height and the frame rule.
3. The drawing shows four vertical dividers and rails between drawers; the cut list has one center stile and no drawer rails. Every piece that is drawn must be in the cut list, and the reverse.
4. Four 13" columns plus the listed stiles total 56 1/2" on a 79 1/2" box, leaving about 23" unexplained. The layout check must catch openings that do not add up to the width and explain it visually.
5. Platform end supports are 17 1/2", the full platform depth, so they cannot fit between the front and back rails. Lengths must account for the pieces they sit between.
6. The toe kick is 4" high on a 3 1/2" platform.

Measurements still needed from Max: the wall space available, finished height and depth wanted, actual plywood thickness, and the outside width, height, and depth of each drawer box being reused (these set the openings), plus the slide type.

## Roadmap after Phase 0

1. **Engine and vanity:** questionnaire with pictures, validation, cut list, shopping list
2. **Cutting diagrams:** one diagram per sheet and board, with blade kerf, grain direction, cut order, and labeled offcuts
3. **Assembly steps:** illustrated steps with current parts highlighted and earlier parts muted, checklists, progress, print to PDF
4. **Later:** tool inventory driving the method, other cabinet types, kitchen layout

Not in v1: retailer pricing, a rotating 3D model (use an exploded SVG view), photo uploads, AI features.

## Working rules

- Max is new to the command line and git. Anything he must do himself gets numbered, copy-and-paste steps. He often works from his phone.
- The app is used in a garage on a phone or tablet: large tap targets, large type, high contrast, works one-handed.
- Beginner mode is the default. Use plain words first ("vertical frame piece") with the trade term in a tap-to-explain glossary ("stile").
- Formatting is consistent everywhere: proper fractions for inches, commas in numbers of 1,000 or more, dollars as $1,234.56.
- Use synthetic or placeholder data only; never connect to any outside account or service.
- Small commits with clear messages. Run the tests before every commit.
