# Construction rules: face-frame vanity on a separate 2x4 platform

**Status: draft for Max's approval. No engine code is written until these are approved.**

These are the rules the engine will follow to turn measurements into parts. Each rule has a number, a plain-English statement and a formula. The same rule numbers appear in the tests and in every part's "how this size was worked out" note.

Where there is more than one legitimate way to build something, the rule picks the most beginner-friendly one, says why in one line, and notes the alternative. Rules marked **(Q)** depend on an answer in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).

## Words used here

| Plain words | Trade term | Meaning |
|---|---|---|
| Box | carcass, case | The plywood cabinet, without the frame, doors, platform or top |
| Face frame | face frame | The solid oak frame glued to the front of the box |
| Vertical frame piece | stile | An upright piece of the face frame or of a door |
| Horizontal frame piece | rail | A level piece of the face frame or of a door |
| Opening | opening | A clear hole in the face frame that a door or drawer closes over |
| Bay | bay | One opening-wide section of the frame, between two vertical frame pieces |
| Overlay | overlay | How far a door or drawer front laps over the frame on each edge |
| Platform | toe-kick base | The 2x4 frame on the floor that the box sits on |
| Toe kick | toe kick | The oak board that covers the front of the platform |

## Symbols

| Symbol | Meaning | Vanity 01 (assumed) |
|---|---|---|
| W | Box width, outside of left side to outside of right side | 79 1/2" |
| H | Box height, bottom edge to top edge of the sides | 30" |
| D | Box depth, back of the box to the front edge of the sides | 20 1/2" |
| t | Actual thickness of the box plywood | 3/4" |
| tb | Actual thickness of the back panel | 3/4" |
| tf | Thickness of the face frame oak | 3/4" |
| S | Width of a vertical frame piece | 1 1/2" |
| RT, RB | Width of the top rail, bottom rail | 3", 3" |
| RD | Width of a rail between drawers | 1 1/2" |
| V | Overlay on each edge | 1/2" |
| Lt, Lw | Actual thickness and width of a 2x4 | 1 1/2", 3 1/2" |
| PW, PD | Platform width, platform depth | W, 17 1/2" |

---

## U. Units and numbers

**U1. One exact unit.** Every length is stored as a whole number of *ticks*. One inch is 4,064 ticks, so 1/32" = 127 ticks, 1/16" = 254 ticks and 1 mm = 160 ticks. This is the largest unit that holds both 1/32" and 1 mm exactly. It also holds 1/10 mm exactly (16 ticks). The engine never uses decimals for a length.

**U2. What you may type.**
- Fractional inches: `79 1/2`. The bottom number must be 2, 4, 8, 16 or 32. Anything else, such as thirds or fifths, is refused with an explanation, because it is not on a tape measure.
- Decimal inches: `79.5`. If the value does not land on a tick it is rounded to the nearest tick (off by at most 1/8,128", about 0.003 mm) and the app shows you the nearest tape mark it will use.
- Millimetres: `2019` or `2019.5`. Tenths of a millimetre are exact; finer than that is rounded to the nearest tick.

**U3. What the plan prints.** Only marks that exist on a tape: the nearest 1/16" by default (1/32" optional), or the nearest 1 mm in metric. All maths is done exactly in ticks first; rounding happens once, at printing. If a printed size had to be rounded, the part says so.

**U4. Splitting a space evenly.** When a space is shared between several openings, each share is rounded down to the tape mark and the leftover goes to the last share, so the shares always add back up to the exact total.

**U5. Confirmed or assumed.** Every input is marked *confirmed* (you measured or chose it) or *assumed* (a default or placeholder). A part is assumed if any number behind it is assumed. The plan shows which is which.

---

## B. The box

**Method: plywood panels joined with pocket screws and glue.** Why: one inexpensive jig, no clamps the length of the cabinet, and joints pull tight on their own. Alternative: grooves and dados cut with a table saw or router, which are stronger but need more tools and accuracy.

**B1. Box size.** W, H and D are entered once each and drive everything else. W is measured across the outside of the two side panels. D does not include the face frame or doors **(Q1)**.

**B2. Side panels (left: blue, right: green).** The sides run the full height and full depth; everything else fits between them.
- Length (up and down) = H
- Width (front to back) = D
- Grain runs up and down. Quantity: 1 left, 1 right.

**B3. Bottom panel (yellow).** Fits between the sides, flush with their bottom edges, and butts against the front of the back panel.
- Length = W − 2 × t
- Width = D − tb
- Why flush with the bottom: the whole panel rests on the platform, so it cannot sag. Alternative: raise it level with the top of the bottom frame piece so there is no lip inside the door area **(Q4)**.

**B4. Back panel (purple).** A full back that fits between the sides and runs the full height, so its edge never shows on an exposed side.
- Length = W − 2 × t
- Width (height) = H
- Why a full back in the same plywood: it squares the box, needs no extra mounting strips, and you can screw through it into a wall stud anywhere. Alternative: a 1/4" back with two mounting strips, which is lighter and cheaper **(Q3)**.

**B5. Interior dividers (red).** One upright divider at every bay boundary that touches a drawer column, so drawer slides have something to mount on. No divider between two doors.
- Length (up and down) = H − t
- Width (front to back) = D − tb
- Position: the divider's face on the drawer side lines up with the edge of the frame opening, so a drawer slide can sit directly on it.
- The divider must be no thicker than the vertical frame piece in front of it (t ≤ S), or it would show in the opening.

**B6. Top front supports (grey, proposed) (Q9).** One strip across the top front of each section of the box, between the sides and dividers. It keeps the dividers upright and gives the top rail something to glue to.
- Length = clear width of that section of the box
- Width = top support width (entered; default 3")
- The countertop rests on the sides, back, dividers and frame; no rear strip is needed because the back is full height.

**B7. Drawer slide spacers (Q6).** At a cabinet side, the frame piece is wider than the plywood behind it, so a side-mounted slide needs a spacer strip to bring the mounting surface out level with the opening.
- Spacer thickness = S − t
- Only for side-mounted slides; skipped for other slide types.

---

## F. The face frame (brown)

**Method: solid oak pieces joined with pocket screws and glue on the back face.** Why: no visible fasteners on the front and no long clamps. Alternative: dowels or mortise and tenon.

**F1. Frame size.** The frame is exactly as wide and as tall as the box, flush on all four edges.
- Frame width = W, frame height = H
- Why flush: nothing to remember and nothing to trim. Alternative: let the frame overhang 1/4" on a wall side so it can be shaved to fit an uneven wall **(Q2)**.

**F2. End vertical pieces (end stiles).** Run the full height at each end.
- Length = H
- Width = S. Quantity: 2.

**F3. Top and bottom horizontal pieces (rails).** Fit between the two end pieces.
- Length = W − 2 × S
- Width = RT (top), RB (bottom). Quantity: 1 each.

**F4. Inner vertical pieces (inner stiles).** One at every boundary between two bays, fitted between the top and bottom rails.
- Length = H − RT − RB
- Width = S. Quantity = number of bays − 1.

**F5. Rails between drawers.** One between every two drawers in a column.
- Length = that column's opening width
- Width = RD. Quantity = (drawers in the column − 1), for each column.

---

## L. Layout: openings must add up

**L1. Across.** Vertical frame pieces plus opening widths must equal the box width exactly.
- (number of bays + 1) × S + sum of opening widths = W
- If not, it is an error. The explanation is a picture: every frame piece and opening laid end to end under the box width, with the missing or extra amount marked.

**L2. Up and down.** In every bay, rails plus opening heights must equal the box height exactly.
- Door bay: RT + opening height + RB = H
- Drawer column: RT + RB + (drawers − 1) × RD + sum of drawer opening heights = H

**L3. Shared space.** A bay or drawer marked "share what is left" takes an equal share of the space not used by fixed openings and frame pieces (see U4). At least one opening in each direction should be set to share, so the layout always closes.

**L4. Openings from reused drawer boxes (Q6).**
- Drawer opening width = drawer box outside width + total slide clearance
- Drawer opening height = drawer box outside height + clearance above and below
- Slide clearances are data that depend on the slide type.

**L5. An opening can also be given directly, or by front size.** If a front size is given, opening = front − 2 × V.

---

## D. Doors (teal) and drawer fronts (pink)

**D1. Front size.** Every door and drawer front laps over its opening by the overlay on all four edges.
- Width = opening width + 2 × V
- Height = opening height + 2 × V
- Why partial overlay: it hides small errors in the frame and forgives hinge placement. Alternative: inset fronts, which sit flush inside the frame and need near-perfect fits.

**D2. Slab front.** One solid piece. Length = front width, width = front height. Grain runs side to side.

**D3. Fronts must not touch.** Two fronts that share a frame piece must leave a gap.
- Gap = frame piece width − 2 × V, and it must be at least 1/8"

**D4. Shaker frame.** A frame of four pieces around a thin centre panel. Uprights run the full height; cross pieces fit between them and are joined with pocket screws on the back.
- Uprights: length = front height, width = shaker frame width. Quantity 2.
- Cross pieces: length = front width − 2 × shaker frame width, width = shaker frame width. Quantity 2.
- Why pocket screws: no special joint to cut. Alternative: a short tongue on each cross piece (add 2 × groove depth to its length) **(Q7)**.

**D5. Shaker centre panel.** Sits in a groove cut along the inside edge of the frame pieces.
- Width = front width − 2 × shaker frame width + 2 × groove depth − 1/8"
- Height = front height − 2 × shaker frame width + 2 × groove depth − 1/8"
- The 1/8" is room for the panel to slide in. Grain runs up and down on doors, side to side on drawer fronts.

**D6. A shaker front must be big enough.** Its width and height must each be more than 2 × shaker frame width + 1", or there is no visible panel.

---

## P. The platform (orange)

**Method: a ladder of 2x4s on edge, screwed together.** Why: cheap, strong, easy to level on its own before the heavy box goes on. Alternative: legs or a plywood base.

**P1. Platform size.**
- Height = Lw (the actual width of a 2x4, standing on edge)
- Width PW = W (tied to the box width, not typed separately)
- Depth PD = entered. The back of the platform lines up with the back of the box.

**P2. Front and back rails.** Run the full width.
- Length = PW. Quantity 2.

**P3. Cross supports.** Fit *between* the front and back rails.
- Length = PD − 2 × Lt
- One at each end, plus one every 16" measured from the left end, until the remaining gap is 16" or less.

**P4. Toe space.** How far the platform front sits back from the box front.
- Toe space = D − PD − toe kick thickness
- Warning if less than 2" or more than 4".

**P5. Toe kick.** A solid oak board on the front of the platform.
- Length = PW
- Height = platform height (P1). It is worked out, not typed. If a different height is entered, it is an error.
- An exposed end may need a second, short piece **(Q5)**.

---

## H. Overall size

**H1. Finished height** = platform height + H + countertop thickness.

**H2. Finished depth** = D + tf (to the front of the frame); doors add their own thickness.

**H3. Fit.** If wall space, finished height or finished depth are given, the cabinet is checked against them.

---

## J. Joints and fasteners

**J1.** Default joint everywhere: pocket screws and wood glue.

**J2.** No screw or pocket hole may land on a face that will be seen. On an exposed side, pocket holes go in the piece that meets it (the bottom's underside, the back's rear face) or on the side's inside face.

**J3.** Pocket holes on dividers go on the drawer side, where the drawers hide them.

---

## M. Materials

**M1.** Material sizes are data. Nominal and actual sizes are stored separately (a 2x4 is 1 1/2" × 3 1/2"), and only actual sizes are used in maths.

**M2.** Plywood thickness is an input. It starts as the shop label, marked assumed, with a warning asking you to measure the real sheet (3/4" plywood is often 23/32").

**M3.** A plywood part larger than its sheet is an error, with the suggested fix.

**M4.** Grain direction is set by the rule that creates each part and is carried to the cutting diagrams.

---

## Worked example: vanity 01 with the assumed numbers

This is here so the rules can be checked by eye. In the app, every one of these comes from the engine, and the tests will hold the engine to them.

| Part | Rule | Formula | Size |
|---|---|---|---|
| Left side, right side | B2 | H by D | 30" × 20 1/2" |
| Bottom | B3 | (W − 2t) by (D − tb) | 78" × 19 3/4" |
| Back | B4 | (W − 2t) by H | 78" × 30" |
| Interior dividers (2) | B5 | (H − t) by (D − tb) | 29 1/4" × 19 3/4" |
| End vertical frame pieces (2) | F2 | H | 30" long |
| Top rail, bottom rail | F3 | W − 2S | 76 1/2" long |
| Inner vertical frame pieces (3) | F4 | H − RT − RB | 24" long |
| Platform front and back rails (2) | P2 | PW | 79 1/2" long |
| Platform cross supports (6) | P3 | PD − 2 × Lt | 14 1/2" long |
| Toe kick | P5 | PW by Lw | 79 1/2" × 3 1/2" |
| Finished height | H1 | Lw + H + top | 34 3/4" |

### What the rules say about the mock-up

| # | Mock-up | Rule | Result |
|---|---|---|---|
| 1 | Five overall widths | B1, U2 | One width. 79 2/3", 79 1/3" and 79 3/5" cannot even be typed. |
| 2 | Side stiles 25 1/2" | F2 | 30". |
| 3 | Drawn pieces missing from the cut list | F4, F5, B5 | 3 inner vertical pieces, 4 rails between drawers and 2 dividers are created by rule, so they are always listed and drawn. |
| 4 | Columns do not fill the width | L1 | Error. 5 frame pieces (7 1/2") + 4 openings of 12" (48") = 55 1/2", leaving 24" unexplained. The brief's count of about 23" used front widths and 3 frame pieces. |
| 5 | Platform end supports 17 1/2" | P3 | 14 1/2". |
| 6 | Toe kick 4" on a 3 1/2" platform | P5 | 3 1/2"; entering 4" is an error. |
| 7 | *New:* drawer heights | L2 | Error. 3" + 3" rails + 2 rails between drawers (3") + openings of 4", 4" and 9" = 26" on a 30" box. |
| 8 | *New:* door height | L2 | Error. A 16" door covers a 15" opening; with both rails that is 21" on a 30" box. |
