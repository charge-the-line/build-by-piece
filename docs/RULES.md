# Construction rules: face-frame vanity on a separate 2x4 platform

**Status: approved by Max. The engine in `src/engine/` implements these rules; change this document and the code together.**

These are the rules the engine will follow to turn three numbers into a full set of parts. Each rule has a number, a plain-English statement and a formula. The same rule numbers appear in the tests and in every part's "how this size was worked out" note.

Where there is more than one legitimate way to build something, the rule picks the most beginner-friendly one, says why in one line, and notes the alternative.

## Words used here

| Plain words | Trade term | Meaning |
|---|---|---|
| Box | carcass, case | The plywood cabinet, without the frame, doors, platform or top |
| Face frame | face frame | The solid oak frame glued to the front of the box |
| Vertical frame piece | stile | An upright piece of the face frame or of a door |
| Horizontal frame piece | rail | A level piece of the face frame or of a door |
| Opening | opening | A clear hole in the face frame that a door or drawer closes over |
| Bay | bay | One opening-wide section of the frame, between two vertical frame pieces |
| Section | compartment | One space inside the box, between sides and dividers |
| Overlay | overlay | How far a door or drawer front laps over the frame on each edge |
| Platform | toe-kick base | The 2x4 frame on the floor that the box sits on |
| Toe kick | toe kick | The oak board that covers the front of the platform |
| Lengthwise cut | rip cut | A cut along the length of a board to make it narrower |

---

## G. What the user enters

**G1. Never ask for a measurement the app can decide itself.** The user enters three numbers: width, depth and height. The app builds the whole plan from those. Every other value is a default that the app chooses, shows with a one-line reason, and lets her change. Changing a default is always optional.

**G2. Exactly what the three numbers include.** The app shows this as a picture before she types anything (see the live page).

| Number | Includes | Does not include |
|---|---|---|
| **Width** W | The whole cabinet from end to end, including the frame's overhang on a wall end | Nothing else; this is the space it takes along the wall |
| **Depth** D | From the wall to the front of the face frame, including the back panel | Doors, drawer fronts and handles, which stick out further; the countertop |
| **Height** H | The box only, bottom edge to top edge | The platform underneath; the countertop on top |

**G3. Three labels on every value.** The plan shows where each number came from:
- *You entered*: she typed or changed it.
- *App's choice*: a default; nothing to check.
- *Check before you cut*: a default that stands in for something real, such as plywood thickness. The app prompts her to measure it at the cutting step, and recalculates if it differs.

**G4. Which ends touch a wall** is a choice, not a measurement. Default: both ends exposed (finished and flush), which is safe either way. Vanity 01 sets the left end to wall and the right end to exposed.

## Symbols and defaults

Only W, D and H are entered. Everything else below is a default.

| Symbol | Meaning | Default | Why |
|---|---|---|---|
| W, D, H | Cabinet width, depth, box height | entered | 60", 21", 30" for vanity 01 |
| t | Box plywood thickness | 3/4" *(check before you cut)* | Standard sheet |
| tb | Back panel thickness | 1/4" *(check before you cut)* | Standard sheet |
| tf | Face frame thickness | 3/4" | Standard oak board |
| S | Width of every face frame piece | 1 1/2" | A 1x2 oak board as sold; no lengthwise cut |
| V | Overlay on each edge | 1/2" | Hides small errors; matches common hinges |
| OL, OR | Frame overhang past the box, left and right | 1/4" on a wall end, 0 on an exposed end | Lets the frame be trimmed to an uneven wall |
| ts, ws | Support board thickness and width | 3/4", 3 1/2" | A 1x4 pine board as sold |
| FW | Shaker frame width | 2 1/2" | A 1x3 oak board as sold |
| Lt, Lw | 2x4 thickness and width | 1 1/2", 3 1/2" | Standard lumber |
| TS | Toe space | 3" | Standard room for toes |
| tk | Toe kick thickness | 3/4" | A 1x4 oak board as sold |

Two sizes are worked out first and used throughout:

- **Box width** WB = W − OL − OR
- **Box depth** DB = D − tf

---

## U. Units and numbers

**U1. One exact unit.** Every length is stored as a whole number of *ticks*. One inch is 4,064 ticks, so 1/32" = 127 ticks, 1/16" = 254 ticks and 1 mm = 160 ticks. This is the largest unit that holds both 1/32" and 1 mm exactly. The engine never uses decimals for a length.

**U2. What you may type.**
- Fractional inches: `60 1/2`. The bottom number must be 2, 4, 8, 16 or 32. Anything else, such as thirds or fifths, is refused with an explanation, because it is not on a tape measure.
- Decimal inches: `60.5`. If the value does not land on a tick it is rounded to the nearest tick (off by at most 1/8,128", about 0.003 mm) and the app shows the nearest tape mark it will use.
- Millimetres: `1524` or `1524.5`. Tenths of a millimetre are exact; finer than that is rounded to the nearest tick.

**U3. What the plan prints.** Only marks that exist on a tape: the nearest 1/16" by default (1/32" optional), or the nearest 1 mm in metric. All maths is done exactly in ticks first; rounding happens once, at printing. If a printed size had to be rounded, the part says so.

**U4. Splitting a space evenly.** When a space is shared between several openings, each share is rounded down to the tape mark and the leftover goes to the last share, so the shares always add back up to the exact total.

---

## B. The box

**Method: plywood panels joined with pocket screws and glue.** Why: one inexpensive jig, no long clamps, and joints pull tight on their own. Alternative: grooves cut with a router, which are stronger but need more accuracy.

**B1. Box size.** WB = W − OL − OR and DB = D − tf. The box is never typed in; it follows from the cabinet size.

**B2. Side panels (left: blue, right: green).** The sides run the full height and the full box depth, back to the wall; everything else fits between them.
- Length (up and down) = H
- Width (front to back) = DB
- Grain runs up and down. Quantity: 1 left, 1 right.

**B3. Bottom panel (yellow).** Fits between the sides, flush with their bottom edges, and stops short of the wall by the back thickness.
- Length = WB − 2 × t
- Width = DB − tb
- Why flush with the bottom: the whole panel rests on the platform, so it cannot sag. With a 1 1/2" bottom frame piece this leaves only a small lip inside the doors.

**B4. Back panel (purple).** A thin back that fits *between* the sides and runs the full height. It is glued and nailed to the back edges of the bottom, the dividers and the mounting strips.
- Length = WB − 2 × t
- Width (height) = H
- Why between the sides: its edge never shows on an exposed end, and there is no groove to cut. Alternative: a router-cut recess in the sides.

**B5. Interior dividers (red).** One upright divider at every bay boundary that touches a drawer column, so drawer slides have something to mount on. No divider between two doors.
- Length (up and down) = H − t
- Width (front to back) = DB − tb
- Position: the divider's face on the drawer side lines up with the edge of the frame opening, so a slide sits directly on it.
- The divider must be no thicker than the frame piece in front of it (t ≤ S).

**B6. Top front supports (grey).** One board across the top front of each section. It keeps the dividers upright and gives the top frame piece something to glue to.
- Length = clear width of that section
- Width = ws (the board as sold)

**B7. Mounting strips (grey).** One board across the top rear of each section, standing on edge against the back. Screws go through it into the wall studs.
- Length = clear width of that section
- Width = ws (the board as sold)

**B8. Drawer slide spacers (grey).** At a cabinet side, the frame piece stands proud of the plywood, so the slide needs a spacer to bring its mounting surface out level with the opening.
- Spacer thickness needed = S − overhang on that end − t
- Built from layers of plywood offcuts (thickest first) that come closest without going over. Any shortfall must be 1/16" or less, and the drawer box width (X3) allows for it exactly.
- Length = slide length. Width = 2" (a default). One behind each slide on a cabinet side; none on a divider that is flush with the opening.

---

## F. The face frame (teal)

**Method: solid oak boards joined with pocket screws and glue on the back face.** Why: no visible fasteners and no long clamps. Alternative: dowels.

**F1. Frame size.** The frame is exactly as wide as the cabinet and as tall as the box.
- Frame width = W, frame height = H
- On a wall end it runs past the box by the overhang (default 1/4"); on an exposed end it is flush with the box side.

**F2. End vertical pieces (end stiles).** Run the full height at each end.
- Length = H. Width = S. Quantity: 2.

**F3. Top and bottom horizontal pieces (rails).** Fit between the two end pieces.
- Length = W − 2 × S
- Width = S each. Quantity: 1 top, 1 bottom.

**F4. Inner vertical pieces (inner stiles).** One at every boundary between two bays, including between the two doors, fitted between the top and bottom pieces.
- Length = H − 2 × S
- Width = S. Quantity = number of bays − 1.

**F5. Pieces between drawers (drawer rails).** One between every two drawers in a column.
- Length = that column's opening width
- Width = S. Quantity = (drawers in the column − 1), for each column.

---

## L. Layout: the app proposes it, and it must add up

**L0. Proposed layout.** For a vanity the app proposes, left to right: a drawer column, two doors, a drawer column, all four openings the same width. Each drawer column has two small drawers over one large one.

**L0a. Changing the layout.** She can change what goes in each space (a door, or one to four drawers), add spaces up to six, or remove them. She never types an opening size: every space shares the width equally, the small drawers in a column sit on top with fronts one board high (L4), and the bottom drawer takes the rest of the height. A layout made this way always adds up; if it leaves a front too small to build, the app says which and why.

**L1. Across.** Frame pieces plus opening widths must equal the cabinet width exactly.
- (number of bays + 1) × S + sum of opening widths = W
- If not, it is an error. The explanation is a picture: every frame piece and opening laid end to end under the cabinet width, with the missing or extra amount marked.
- A layout left to the app can never fail this, because shared openings always take up exactly what is left.

**L2. Up and down.** In every bay, frame pieces plus opening heights must equal the box height exactly.
- Door bay: S + opening height + S = H
- Drawer column: 2 × S + (drawers − 1) × S + sum of drawer opening heights = H

**L3. Shared space.** An opening marked "share what is left" takes an equal share of the space not used by fixed openings and frame pieces (see U4). The proposed layout shares all four widths, the door heights, and the large drawer's height.

**L4. Small drawer openings from a board.** A small drawer front is one board at the width it is sold, so it needs no lengthwise cut.
- Front height = actual width of the slab board (5 1/2" for a 1x6)
- Opening height = front height − 2 × V

**L5. A changed opening** may be given directly, or by its front size (opening = front − 2 × V). L1 and L2 still have to hold.

---

## D. Doors (pink) and drawer fronts (light blue)

**D1. Front size.** Every door and drawer front laps over its opening by the overlay on all four edges.
- Width = opening width + 2 × V
- Height = opening height + 2 × V
- Why partial overlay: it hides small errors in the frame and forgives hinge placement. Alternative: inset fronts, which need near-perfect fits.

**D2. Slab front.** One solid board. Length = front width, width = front height. Grain runs side to side.

**D3. Fronts must not touch.** Two fronts that share a frame piece must leave a gap.
- Gap = S − 2 × V, and it must be at least 1/8"

**D4. Shaker frame.** Four boards around a thin centre panel. Uprights run the full height; cross pieces fit between them and are joined with pocket screws on the back.
- Uprights: length = front height, width = FW. Quantity 2.
- Cross pieces: length = front width − 2 × FW, width = FW. Quantity 2.
- Why pocket screws: no special joint to cut. Alternative: a short tongue on each cross piece.

**D5. Centre panel in a groove (advanced choice, or with a table saw).** A groove is cut along the inside edge of each frame piece before assembly. With a router it stops short of each end on the uprights so it does not show.
- Width = front width − 2 × FW + 2 × groove depth − 1/8"
- Height = front height − 2 × FW + 2 × groove depth − 1/8"
- Groove depth default 3/8". Groove width = the measured thickness of the panel. The 1/8" is room for the panel to slide in.
- Grain runs up and down on doors, side to side on drawer fronts, for every panel method.

**D6. A shaker front must be big enough.** Its width and height must each be more than 2 × FW + 1", or there is no visible panel.

**D7. Hinges.** The app picks concealed face-frame hinges made for the overlay in use, two for each door, centred 3" (a default) from the top and bottom. Neighbouring doors are hinged on opposite edges. A hinge whose overlay does not match V is an error. The cup holes need a hinge-boring bit, which is listed with the tools.

**D8. Hinges always have a clear place to mount.** A hinge needs solid wood on the back of the door, measured in from the hinge edge (1 3/4" for the default hinge; this is hardware data). The centre panel, its groove or its recess must start beyond that.
- Groove or recess: FW − groove depth (or recess width) must be at least the hinge space, or it is an error.
- Panel on the back: the panel is kept back from the hinge edge by the hinge space (D10), so this holds by construction. A test checks it for every door.

**D9. Centre panel in a recess routed after assembly (default with a router).** The frame is built first with pocket screws. A bearing-guided bit then cuts a recess all round the inside edge of the back, and the panel is glued in.
- Width = front width − 2 × FW + 2 × recess width − 1/8"
- Height = front height − 2 × FW + 2 × recess width − 1/8"
- Recess width default 3/8" (how far it reaches into the frame). Recess depth = the measured thickness of the panel, so the panel sits flush with the back.
- The bit leaves the recess corners rounded; the panel's corners are rounded to match.
- Why this is the default: the frame is assembled square before any routing, there is nothing to stop and start, and a slip only shows on the back. Alternative: the groove (D5).

**D10. Centre panel on the back (no router, no table saw).** The frame is built first. The panel is glued and nailed to its back and sits inside the opening.
- Gap = V + 1/4" (a default): how far each panel edge sits in from the edge of the front, so the panel clears the face frame.
- Hinge edge of a door: the panel sits in by the hinge space instead, when that is larger than the gap (D8).
- Door panel width = front width − hinge space − gap. Drawer front panel width = front width − 2 × gap.
- Height = front height − 2 × gap.
- The panel must still lap at least 3/8" of frame on every edge to be glued, or it is an error.
- The front is thicker by the panel thickness, so drawer boxes sit back by that much (X6).

---

## X. Drawer boxes (white with a dark outline)

New boxes on new side-mount slides. The app chooses the slides and sizes every box.

**Method: plywood box joined with pocket screws, with the bottom glued and nailed on underneath.** Why: no groove to cut and the bottom squares the box. Alternative: a bottom set in a router-cut groove.

**X1. Slide length.** The longest slide sold that fits.
- Room for the slide = D − tb − ts − rear clearance (default 1")
- Slide length = the longest stock length that is no more than that. One pair for each drawer.

**X2. Box height** = opening height − 1".

**X3. Box width** = opening width + any spacer shortfall (B8) − 2 × slide clearance. Side-mount slides need 1/2" on each side.

**X4. Box depth** = slide length.

**X5. Box parts.** Box plywood thickness is t; bottom thickness is tb.
- Sides (2): length = box depth, width = box height − tb
- Front and back (2): length = box width − 2 × t, width = box height − tb
- Bottom (1): length = box depth, width = box width

---

## P. The platform (orange)

**Method: a ladder of 2x4s on edge, screwed together.** Why: cheap, strong, and easy to level before the heavy box goes on. Alternative: adjustable legs.

**P1. Platform size.** The platform sits against the wall at the back. Its front, and any exposed end, sits back by the toe space so the toe kick board finishes exactly TS in from the cabinet.
- Height = Lw (a 2x4 on edge)
- Depth PD = D − TS − tk
- Width PW = WB − (TS + tk) for each exposed end
- On a wall end the platform is flush with the box side.

**P2. Front and back rails.** Run the full platform width.
- Length = PW. Quantity 2.

**P3. Cross supports.** Fit *between* the front and back rails.
- Length = PD − 2 × Lt
- One at each end, plus one centred every 16" measured from the left end. The last of these is left out if it would touch the end support or sit closer to it than one 2x4 thickness.

**P4. Toe space check.** Warning if the toe space is changed to less than 2" or more than 4".

**P5. Toe kick (orange).** Solid oak boards covering the platform wherever it can be seen.
- Height = platform height. It is worked out, not typed. If a different height is entered, it is an error. With a 2x4 platform this equals a 1x4 oak board as sold.
- Front piece: length = PW + tk for each exposed end, so it covers the end of the return.
- Return piece, one on each exposed end: length = PD.

---

## H. Overall size

**H1. Finished height** = platform height + H + countertop thickness. The countertop is made and installed by others; its thickness is a default used only for this note.

**H2. How far it stands out.** Face frame front = D from the wall. Doors and drawer fronts add their own thickness.

---

## J. Joints and fasteners

**J1.** Default joint everywhere: pocket screws and wood glue.

**J2.** No screw or pocket hole may land on a face that will be seen. On an exposed side, pocket holes go in the piece that meets it (the bottom's underside) or on the side's inside face.

**J3.** Pocket holes on dividers go on the drawer side, where the drawers hide them.

**J4. Where glue and screws go.** Glue goes on the faces where a step's pieces meet the others; the engine works these out from where the pieces sit. Screws run along each screwed joint:
- a joint shorter than 2": one screw in the middle;
- shorter than 4": two screws, a quarter of the way in from each end;
- otherwise one screw 2" from each end, and enough between that none are more than 8" apart.

The 2" and 8" are defaults. The screws in every step are counted by kind (coarse pocket screws for plywood and pine, fine for solid oak, construction screws for the platform, short screws for spacers and drawer fronts) and the totals go on the shopping list. Nails, glue, and screws into the wall are listed without a count.

---

## M. Materials and tools

**M1.** Material and hardware sizes are data. Nominal and actual sizes are stored separately (a 2x4 is 1 1/2" × 3 1/2"), and only actual sizes are used in maths.

**M2.** Plywood thickness defaults to the standard sheet and is labelled *check before you cut* (G3). Every part that depends on it recalculates if she enters a different thickness.

**M3.** A plywood part larger than its sheet is an error, with the suggested fix.

**M4.** Grain direction is set by the rule that creates each part and is carried to the cutting diagrams.

**M5. No lengthwise cuts in solid wood by default.** There is a router but no table saw, so every solid-wood part defaults to the width of a board as sold: frame pieces from 1x2, shaker frames from 1x3, small drawer fronts from 1x6, toe kick from 1x4, supports from 1x4. Plywood is cut with a circular saw and a straight edge. Changing a width to something no board matches gives a warning that a lengthwise cut is needed.

**M6. Counting sheets and boards.** The shopping list is the cutting diagrams, counted (rule C6).

---

## A. Assembly

**A0. Where every piece sits.** The engine works out a position for every piece in the finished cabinet: across from the cabinet's left end, up from the floor, and out from the wall. The step pictures are drawn from these positions, and a test checks that no two pieces share the same space (a centre panel in its groove is the one exception).
- The box sits on the platform; the face frame's front is at the entered depth.
- A top front support lies flat under the top at the front of the box. A mounting strip stands on edge against the back panel, at the top.
- A slide spacer has its bottom edge level with the bottom of its drawer opening and its front end at the front of the box.
- **X6.** A drawer box sits between its slides, a quarter of the height clearance (1/4" by default) above the bottom of its opening, with its front flush with the front of the face frame. When framed drawer fronts have their panel on the back (D10), every box sits back by the panel thickness, and the slide length (X1) allows for it.

**Small steps, pictures first.** The build is broken into many small steps (38 for vanity 01). Each shows:
- a picture with this step's pieces in colour, pulled back from where they go, with an arrow to their place; pieces already built are grey;
- glue marked on the faces where the pieces meet, and a dot for every screw (J4);
- a second picture of how it looks when done;
- the pieces with their part numbers and sizes, the tools as pictures, and the screws and hardware with quantities;
- one or two short sentences. Anything longer sits behind "More detail".

A sub-assembly (the platform, the face frame, a drawer box, a door) is drawn on its own while it is built, and joins the cabinet picture at the step where it is installed. Work on the back of a frame or door is drawn from the back. Identical drawer boxes and fronts are shown once, with "Make 4 of these".

| Chapter | Steps | Rule notes |
|---|---|---|
| A1 Platform | Ends, then middle supports | Rails front and back, cross supports between (P2, P3) |
| A2 Box | Left side, right side, dividers, top front supports, mounting strips, back | Pocket holes in the underside of the bottom (J2) and on the drawer side of dividers (J3); dividers are spaced with the top front supports |
| A3 Face frame | Outer pieces, inner uprights, pieces between drawers, then onto the box | Pocket holes on the back; through the side panels from the inside face on an exposed end, the outside face on a wall end (J2) |
| A4 Slide spacers | One step | Only when spacers are needed (B8) |
| A5 Drawer boxes | Sides and ends, then bottom, for each size | Pocket holes on the outside of the front and back pieces |
| A6 Doors and drawer fronts | Frame, then recess, then panel, for each size | Order follows the panel method (T5) |
| A7 Sanding and finish | Sand, stain or paint, clear coat | Before anything is hung |
| A8 Putting it in place | Pipe openings, platform, box, wall screws, toe kick end, toe kick front | Hole saw if ticked, otherwise jigsaw; pipe positions are measured on site |
| A9 Drawers, doors, handles | Slides in the cabinet, drawer boxes, drawer fronts, hinges, hang doors, handles | X1, X6, D7, D8 |

Steps that do not apply are left out.

**The words are written templates** (`src/app/steps/templates.ts`), filled in with the plan's numbers. Nothing is generated, and no size is typed into a template.

---

## K. Kitchen cabinets

Four more cabinets, built the same way as the vanity. Every rule above applies unless this section says otherwise. Each is planned one at a time.

| Cabinet | What it is | Starts at (width × depth × height) |
|---|---|---|
| Base cabinet | A drawer over a door, with a shelf | 18" × 24" × 31" |
| Drawer base | Three drawers | 18" × 24" × 31" |
| Sink base | Doors under fixed panels, room for the sink | 36" × 24" × 31" |
| Upper cabinet | Hangs on the wall; doors and shelves | 30" × 12" × 30" |

**K1. Three numbers, with a sensible start.** Width, depth and height mean what they mean for the vanity (G2), and each kind starts with the standard sizes above. A 31" box on the 3 1/2" platform is 34 1/2", which is 36" with a 1 1/2" kitchen countertop (the countertop default for kitchen base cabinets).

**K2. Base cabinets sit on the vanity's platform** (P1 to P5). Why: she has built one, it is easy to level, and the sides stay plain rectangles. Alternative: a toe kick notched out of the side panels.

**K3. A stack of openings.** Any space in the frame can hold a stack, top to bottom, of drawers, doors and fixed panels.
- A base cabinet's space is a drawer over a door. The drawer front is one board high (L4), a frame piece goes under it (F5), and the door takes the rest (L3).
- A drawer base is one space: a shallow drawer (one board high) over two equal deep ones.
- Drawer boxes, slides, spacers and dividers follow X1 to X6, B5 and B8, counted per drawer.

**K4. One door or two.** The app uses the fewest spaces for which no opening is wider than the widest door (default 18").
- Spaces needed = the smallest n where (W − (n + 1) × S) ÷ n is no more than the widest door.
- Each space gets its own stack, so a 30" base cabinet has two drawers over two doors, with a divider between for the slides.
- Neighbouring doors are hinged on opposite edges; a single door is hinged on the left.
- Alternative, left out: one wide drawer across both doors.

**K5. Shelves (red, like dividers).**
- Base cabinet: one shelf in each section, its middle at half the height of the door opening.
- Upper cabinet: the fewest shelves for which no gap is taller than 14" (a default), spaced evenly. Shelves = (inside height ÷ 14", rounded up) − 1.
- Length = the clear width of the section. Width = box depth − back thickness, less 1" (a default) on a base cabinet so the door closes.
- Fixed with pocket screws from underneath, before the back goes on. Why: no extra tool. Alternative: adjustable shelves on pins, which needs a shelf-pin jig.
- A drawer base and a sink base have none.

**K6. Sink base.** Doors by K4. Above each door, a fixed panel the size of a drawer front (D1, L4) is screwed on from behind through the frame. No drawer box, slides or shelf. The back stays, with openings cut for the pipes (A8). A sink base narrower than 30" (a default) gets a warning.

**K7. Upper cabinet.**
- No platform, toe kick or countertop; its height is the whole cabinet.
- A top panel (brown) the same size as the bottom, between the sides and flush with the top. It replaces the top front supports.
- Dividers, if any, are the box height less both panels.
- A mounting strip under the top panel and a lower one above the bottom panel, both inside against the back.
- The bottom is seen from below, so its pocket holes go on its top face, inside the cabinet (J2).
- Hung by resting it on a temporary ledge board screwed level to the wall, then screwing through both mounting strips into studs. Two people.

**K8. Part numbers** stay P01, P02 for a single cabinet. A cabinet number in front (C01-01) arrives with stage 2, when a project can hold more than one cabinet.

**Not yet:** a run of cabinets along a wall with a shared platform and shopping list (stage 2), and a room (stage 3). Changing the layout of a kitchen cabinet in the app is also not built; the Size screen's door and drawer editor is for the vanity only.

### Worked examples (test sizes, not a real kitchen)

| Cabinet | Openings | A few sizes |
|---|---|---|
| Base 18" | Drawer 15" × 4 1/2" over door 15" × 22" | Sides 31" × 23 1/4"; bottom 16 1/2" × 23"; shelf 16 1/2" × 22"; door 16" × 23"; drawer box 14" wide on 22" slides |
| Base 30" | Two spaces of 12 3/4", each drawer over door | One divider; shelves 13 1/2" and 14 1/4" |
| Drawer base 18" | 4 1/2", 10 1/4", 10 1/4" | Three pairs of 22" slides |
| Sink base 36" | Two spaces of 15 3/4": fixed panel over door | Panels 16 3/4" × 5 1/2"; no drawers |
| Upper 30" × 12" × 30" | Two doors, 12 3/4" × 27" openings | Top and bottom 28 1/2" × 11"; two shelves with 9" gaps |

---

## R. A run of cabinets along one wall

Several base cabinets side by side, with spaces for appliances, planned as one project. Each cabinet is built by the rules above; this section covers what is new when they sit together.

**R1. What she enters.** The length of the run, end to end. What goes along it, left to right: base cabinet, drawer base, sink base, or a space for an appliance. Depth and height once, shared by every cabinet (they start at 24" and 31", rule K1). Which ends of the run touch a wall. She does not type a width for each cabinet.

**R2. The app shares the run out.**
- An appliance space starts at a standard width: 30" for a range, 24" for a dishwasher, 36" for a fridge. These are marked *check before you cut*, because the real appliance decides.
- A sink base starts at 36".
- Every other cabinet shares what is left equally. Each share is rounded down to the tape mark and the leftover goes to the last one, so the widths add up to the run exactly (U4).
- She can fix any width; the others share the rest.
- If every width is fixed and they do not add up, it is an error, with a picture of the pieces against the run and the gap or overlap marked.

**R3. Each cabinet is its own box.** Every cabinet is built complete with its own face frame, then clamped and screwed to its neighbour through the vertical frame pieces where they meet (screws by rule J4).
- The frame overhang (F1) applies only at a wall end of the run. Where two cabinets meet, frame and box are flush.
- A side that meets another cabinet is not seen, so its pocket holes go on the outside face. A side next to an appliance space, or at an open end of the run, is treated as seen (J2).
- Why separate boxes: each is light enough to lift, is finished before the next is started, and a mistake costs one cabinet. Alternative: one long face frame across several boxes.

**R4. One platform for each stretch.** A stretch is an unbroken row of cabinets; it ends at an appliance space or at the end of the run.
- One platform runs under each stretch, by the single-cabinet rules (P1 to P5) applied to the stretch: flush with the box at a wall end, set back by the toe space and toe kick where the end can be seen.
- A stretch longer than a board is built in sections, each no longer than the longest 2x4 sold, breaking only where two cabinets meet.
- The toe kick runs along the front of each section, with a return on every end that can be seen.

**R5. Numbers.** Cabinets are C01, C02, C03 from the left; appliance spaces are not numbered. A cabinet's parts are C01-01, C01-02. Platform and toe kick parts belong to the run: R-01, R-02.

**R6. One shopping list, shared sheets.** Cutting diagrams place parts from different cabinets on the same sheet or board (C1 to C7), and the shopping list is those diagrams counted. Hardware, screws and tools are added up across the run.

**R7. Building it.** Each cabinet is built in turn up to and including its finish (and its pipe openings, for a sink base). Then the run is set in place: build each platform section, place the platforms, set each cabinet from the left and screw it to the one before, screw to the wall, fix the toe kicks. Then each cabinet's drawers, doors and handles are fitted.

**R8. Checks.** The widths must add up (R2). A cabinet that comes out narrower than 9" or wider than 48" is an error, with the fix (remove or add a cabinet). Every single-cabinet check applies to each cabinet.

**Not yet:** corners, upper cabinets in the same project, filler strips, and changing the doors and drawers of a cabinet inside a run.

### Worked example (a made-up wall, not a real kitchen)

A 120" run, wall at the left, open at the right: drawer base, sink base, dishwasher space, base cabinet.

| | Width | Notes |
|---|---|---|
| C01 Drawer base | 30" | Shares: (120" − 36" − 24") ÷ 2 |
| C02 Sink base | 36" | Standard start |
| Dishwasher space | 24" | Standard start; check the appliance |
| C03 Base cabinet | 30" | Shares |

- Stretch 1 (C01 and C02, 66"): platform rails 62" (66" less the 1/4" wall overhang, less 3 3/4" beside the dishwasher), five cross supports, front toe kick 62 3/4", one return.
- Stretch 2 (C03, 30"): platform rails 22 1/2", three cross supports, front toe kick 24", two returns.
- C02 is screwed to C01 with five screws along 31" of frame. C03 stands alone across the dishwasher space.

---

## T. Tools and methods

**T1. The tool list.** Each tool is ticked or not, on the Choices screen. The default ticks are Ashley's own list (mitre saw, circular saw, jigsaw, pocket-hole jig, drills, with a router being bought), so nothing is asked up front.

| Tool | Ticked by default | What it changes |
|---|---|---|
| Circular saw with a straight edge | Yes | Cuts the plywood |
| Track saw | No | Allows long cuts first on plywood (T4) |
| Table saw | No | Allows lengthwise cuts in solid wood (T3); can cut panel grooves (T5) |
| Mitre saw | Yes | Wording only: how boards are cut to length |
| Jigsaw | Yes | Cuts the opening for the pipes when there is no hole saw (A8) |
| Hole saw | No | Cuts a round hole for each pipe (A8) |
| Router | Yes | Cuts the recess or groove for the panel in framed fronts (T5) |
| Pocket-hole jig | Yes | Every joint (T6) |
| Drill and driver | Yes | Needed for every plan |
| Brad nailer | No | Wording only: nailer, or hammer and small nails |
| Sander | No | Wording only: sander, or sanding block |
| Clamps | No | Needed for every plan, so they show under "Buy or borrow" |
| Tape measure, square and level | Yes | Needed for every plan |

**T2. How a method is chosen.** For each job that can be done more than one way, the app uses the first method her tools allow. A missing tool never blocks the plan: the simplest method is used and the tool goes on a "Buy or borrow" list.

Every plan shows "Tools for this plan" on the Shop screen:
- anything to buy or borrow, with what it is for;
- the exact bits: the router bit for the chosen panel method, with the cut it must make (a recess of the recess width, as deep as the measured panel; or a groove as wide as the measured panel, of the groove depth), and the hinge-boring bit when there are doors;
- safety glasses, ear protection and a dust mask, required on every plan;
- the tools from her list that the plan uses.

The panel thickness those bit settings follow is one of the values to check before cutting (M2).

**T3. Solid wood widths.** Board-as-sold widths (M5) are always the defaults. With a table saw ticked, changing a width no longer gives the lengthwise-cut warning.

**T4. Breaking down plywood.** Sections first (C4) by default. With a track saw ticked, the app also lays the parts out with full-length strips first, and uses that only when it needs fewer sheets. On a tie it keeps sections first, because the pieces are easier to handle.

**T5. Framed doors and drawer fronts.** In order of preference:

| Method | Needs | Rule |
|---|---|---|
| Recess routed after assembly | Router | D9 |
| Groove cut on the table saw | Table saw | D5 |
| Panel on the back | Nothing extra | D10 |

She can also choose "Groove before assembly" (D5, with the router) as an advanced option, or pick any method herself. If her choice needs a tool she has not ticked, the tool goes on the "Buy or borrow" list.

**T6. Joints.** Pocket screws throughout, so a pocket-hole jig is required. If it is not ticked, the app says to buy or borrow one and does not change the joints.

**T7. Wording-only tools.** A mitre saw, brad nailer and sander change no part and no size, only the words in a step. Without them the plan names the circular saw and a square, a hammer and small nails, or a sanding block.

**T9. Three approaches.** She picks how the plan chooses its methods. Her own pick of a panel method (T5) always wins.

| Approach | Panel in framed fronts | Pipe openings | Nailing and sanding |
|---|---|---|---|
| Use what I own (default) | The first method her ticked tools allow | Hole saw if ticked, otherwise jigsaw | Powered tools if ticked, otherwise hammer and sanding block |
| Easiest method | Panel on the back (D10): no routing | Jigsaw: one opening | As above |
| Professional finish | Recess routed after assembly (D9) | Hole saw: a neat hole for each pipe | Brad nailer and sander |

Whatever an approach needs that is not ticked goes on the "Buy or borrow" list. The Shop screen also lists *optional* tools: ones the plan does not need, but which would make a job quicker or neater.

**T8. Left for later.** A router-cut recess for the back panel and grooved drawer bottoms are not offered; the simple methods (B4, X5) work with any tools.

---

## C. Cutting diagrams

**C1. One diagram for each sheet and each board.** Every piece in the cut list is placed on exactly one diagram, with its part number.

**C2. The saw blade takes wood.** The blade's width (default 1/8") is left between neighbouring pieces. Each cut is measured from the fresh edge the last cut left, so the measurement is always the size of the piece.

**C3. Grain.** On plywood, a part's length always runs along the sheet's length, which is the grain direction. Pieces are never turned sideways to save wood.

**C4. Cut order for a sheet.** Three kinds of cut, always in this order:
1. Cut across the sheet into *sections*. These are short cuts across the grain, and they turn a heavy sheet into pieces that are easy to handle.
2. Cut each section into *strips* along the grain.
3. Cut each strip to length to make the parts.

A strip only holds parts of exactly its own width, so no part needs a fourth trimming cut. Why sections first: a 4-foot cut with a circular saw and a straight edge is far easier to keep straight than an 8-foot one. Alternative: long cuts first, which can waste less but needs a track saw or table saw.

**C5. Offcuts.** A leftover at least 6" both ways (6" long, for a board) is labelled "Offcut 1", "Offcut 2", and listed with its size so it can be kept. Smaller leftovers are shown striped, without a label.

**C7. On the Cutting screen.** Each diagram names the saw to use, prints the part number and size on every piece big enough to hold them, and lists its cuts in order with a tick box each. A ticked piece is shown faded with a tick on the picture, and the screen counts pieces cut. Sheets can be enlarged.

**C6. Shopping follows the diagrams.** The number of sheets and boards to buy is the number of diagrams. Each board is bought at the shortest length sold that holds its pieces. The layout tries more than one order of placing pieces and keeps the one that needs the fewest sheets.

---

## Worked example: vanity 01 (60" × 21" × 30", left end on a wall, right end exposed)

This is here so the rules can be checked by eye. In the app every number comes from the engine, and the tests in `src/engine/__tests__/vanity-01.test.ts` hold the engine to every size in this table.

Box width WB = 59 3/4". Box depth DB = 20 1/4".

| Part | Qty | Rule | Formula | Size |
|---|---|---|---|---|
| Left side, right side | 1 + 1 | B2 | H by DB | 30" × 20 1/4" |
| Bottom | 1 | B3 | (WB − 2t) by (DB − tb) | 58 1/4" × 20" |
| Back | 1 | B4 | (WB − 2t) by H | 58 1/4" × 30" |
| Interior dividers | 2 | B5 | (H − t) by (DB − tb) | 29 1/4" × 20" |
| Top front supports | 3 | B6 | section width | 13 5/8", 29 1/4", 13 7/8" long |
| Mounting strips | 3 | B7 | section width | 13 5/8", 29 1/4", 13 7/8" long |
| Slide spacers, wall side | 3 | B8 | S − OL − t | 1/2" thick |
| Slide spacers, exposed side | 3 | B8 | S − OR − t | 3/4" thick |
| End vertical frame pieces | 2 | F2 | H | 30" long |
| Top and bottom frame pieces | 2 | F3 | W − 2S | 57" long |
| Inner vertical frame pieces | 3 | F4 | H − 2S | 27" long |
| Pieces between drawers | 4 | F5 | opening width | 13 1/8" long |
| Doors | 2 | D1 | opening + 2V | 14 1/8" × 28" |
| Small drawer fronts | 4 | D2, L4 | opening + 2V by board width | 14 1/8" × 5 1/2" |
| Large drawer fronts | 2 | D1 | opening + 2V | 14 1/8" × 16" |
| Door centre panels | 2 | D5 | see rule | 9 3/4" × 23 5/8" |
| Large drawer front panels | 2 | D5 | see rule | 9 3/4" × 11 5/8" |
| Shaker cross pieces | 8 | D4 | front width − 2FW | 9 1/8" long |
| Drawer slides | 6 pairs | X1 | longest that fits in 19" | 18" |
| Small drawer boxes | 4 | X2–X4 | see rules | 12 1/8" wide × 3 1/2" high × 18" deep |
| Large drawer boxes | 2 | X2–X4 | see rules | 12 1/8" wide × 14" high × 18" deep |
| Platform front and back rails | 2 | P2 | PW | 56" long |
| Platform cross supports | 5 | P3 | PD − 2Lt | 14 1/4" long |
| Toe kick, front | 1 | P5 | PW + tk | 56 3/4" × 3 1/2" |
| Toe kick, return | 1 | P5 | PD | 17 1/4" × 3 1/2" |

Layout checks:

- Across (L1): 5 frame pieces × 1 1/2" + 4 openings × 13 1/8" = 7 1/2" + 52 1/2" = 60".
- Drawer column (L2): 4 frame pieces × 1 1/2" + 4 1/2" + 4 1/2" + 15" = 30".
- Door bay (L2): 1 1/2" + 27" + 1 1/2" = 30".
- Gap between fronts (D3): 1 1/2" − 2 × 1/2" = 1/2".
- Height before the countertop (H1): 3 1/2" + 30" = 33 1/2".

---

## The mock-up's errors, kept as tests

The first mock-up (79 1/2" wide) is no longer the design, but its mistakes stay in the test list (`src/engine/fixtures/mockup-errors.ts`) so the engine can be shown to make each one impossible.

| # | Mock-up | Rule | Result |
|---|---|---|---|
| 1 | Five overall widths | G1, U2 | One width is entered. 79 2/3", 79 1/3" and 79 3/5" cannot even be typed. |
| 2 | Side stiles 25 1/2" on a 30" box | F2 | 30". There is no input for it. |
| 3 | Drawn pieces missing from the cut list | F4, F5, B5 | Inner frame pieces, pieces between drawers and dividers are created by rule, so they are always both listed and drawn. |
| 4 | Columns do not fill the width | L1 | Error with a picture. 5 frame pieces (7 1/2") + 4 openings of 12" (48") = 55 1/2", leaving 24" unexplained. |
| 5 | Platform end supports 17 1/2" on a 17 1/2" platform | P3 | 14 1/2". |
| 6 | Toe kick 4" on a 3 1/2" platform | P5 | Error; the height is worked out as 3 1/2". |
| 7 | Drawer heights | L2 | Error. 3" + 3" + two 1 1/2" pieces + openings of 4", 4" and 9" = 26" on a 30" box. |
| 8 | Door height | L2 | Error. A 16" door covers a 15" opening; with both 3" pieces that is 21" on a 30" box. |
