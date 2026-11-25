# Proposed rules: tool inventory

**Status: proposal for Max's approval. Nothing here is built yet.** Once approved, these become section T of [RULES.md](RULES.md) and the engine is changed to match.

## The idea

Today the app assumes one set of tools: a circular saw with a straight edge, a drill, a pocket-hole jig and a router, with no table saw. Every method in the plan follows from that.

With a tool inventory, she ticks the tools she has. The app then picks the method for each job that her tools allow, and tells her plainly if a job needs a tool she does not have.

This keeps to the two core rules:

- **Dimensions still come from code.** A different method can change part sizes (a door panel, for example). Each method is a rule with its own formulas.
- **Nothing is asked up front.** The tool list starts with sensible ticks already in place. She only touches it if it is wrong. It is a choice with a default, like "which ends touch a wall".

## T1. The tool list

Each tool is ticked or not. The default ticks match what the app assumes today.

| Tool | Ticked by default | What it changes |
|---|---|---|
| Circular saw with a straight edge | Yes | Cutting plywood |
| Track saw | No | Allows long cuts first on plywood (T4) |
| Table saw | No | Allows lengthwise cuts in solid wood (T3); can cut panel grooves (T5) |
| Mitre saw | No | Wording only: how boards are cut to length |
| Router | Yes | Cuts panel grooves (T5) |
| Pocket-hole jig | Yes | Every joint in the plan (T6) |
| Drill and driver | Yes | Needed for every plan |
| Brad nailer | No | Wording only: nailer or hammer for thin panels |
| Sander | No | Wording only: sander or sanding block |
| Clamps, tape measure, square, level | Yes | Needed for every plan |

## T2. How a method is chosen

For each job that can be done more than one way, the methods are listed from most to least beginner-friendly result. The app uses the first one her tools allow.

If her tools allow none of them, the app does not block the plan. It uses the simplest method and adds the missing tool to a **"Buy or borrow"** list on the Shop screen, with the step that needs it.

Every plan also shows a **"Tools for this plan"** list, so she can check before starting.

## T3. Solid wood widths

| Method | Needs | Result |
|---|---|---|
| Boards as sold | Nothing extra | Today's rule M5: every solid-wood part is a board at the width it is sold |
| Any width | Table saw | Same default widths, but changing a width no longer gives a "needs a lengthwise cut" warning |

The default widths do not change when she ticks "table saw". She can then set, say, a 3" top frame piece without a warning. **(Q5)**

## T4. Breaking down plywood

| Method | Needs | Result |
|---|---|---|
| Sections first | Circular saw with a straight edge | Today's rule C4: short cuts across the sheet first, then strips, then pieces |
| Long cuts first | Track saw | Strips the full length of the sheet first, then cut to length |

With a track saw, the app lays the parts out both ways and uses whichever needs fewer sheets. On a tie it keeps sections first, because the pieces are easier to handle. **(Q4)**

## T5. Framed doors and drawer fronts

| Method | Needs | Result |
|---|---|---|
| Groove cut with the router | Router | Today's rule D5 |
| Groove cut on the table saw | Table saw | Same parts and sizes as D5; only the step wording changes |
| Panel on the back | Nothing extra | No groove. The frame is built first, then the thin panel is glued and nailed to its back |

"Panel on the back" changes the panel's size:

- Panel width = front width − 2 × setback
- Panel height = front height − 2 × setback
- Setback default 1/2", so the panel edge is hidden from the front.

It also makes the door thicker by the panel's thickness. **(Q3)**

## T6. Joints

The plan uses pocket screws throughout. A pocket-hole jig is therefore required. If it is not ticked, it goes on the "Buy or borrow" list; the app does not switch to a different joint. **(Q2)**

Why: the alternatives (screws through the face, dowels) either leave screw heads on a side that will be seen, or need more skill than the jig. A basic jig costs less than one sheet of plywood.

## T7. Wording-only tools

A mitre saw, brad nailer and sander do not change any part or size. They only change the words in a step, for example "cut to length with the mitre saw" in place of "cut to length with the circular saw and a square".

## T8. What stays the same

These have a better method available with a router or table saw, but the simple method works with any tools, so the app keeps it:

- The back panel fits between the sides (B4). The alternative is a router-cut recess.
- Drawer bottoms are glued and nailed on underneath (X5). The alternative is a grooved bottom.

These are not offered as choices in this round. **(Q6)**

## What changes in the app

- **Choices screen:** a "Your tools" section with the tick list.
- **Shop screen:** "Tools for this plan", and "Buy or borrow" when something is missing.
- **Parts, Cutting and Build screens:** follow whichever methods were chosen.
- **Tests:** every combination of ticks still produces a plan in which the pieces fit, and each method produces the sizes its rule states.

## Questions

1. **Which tools does Ashley actually have?** The default ticks in T1 are my assumption from "router, no table saw". Please correct the list.
2. **Missing pocket-hole jig.** The app says "buy or borrow" and does not change the joints (T6). OK?
3. **No router and no table saw.** The fallback for framed fronts is "panel on the back" (T5). The other option is flat plywood fronts with iron-on edging. Which do you prefer?
4. **Track saw.** Lay out both ways and keep the one with fewer sheets (T4). OK?
5. **Table saw.** Keep today's board-as-sold widths as the defaults and only drop the warning (T3)? Or go back to the mock-up's sizes (3" top frame piece, 2 1/4" door frames) when a table saw is ticked?
6. **Optional upgrades.** Leave the router recess for the back and grooved drawer bottoms out of this round (T8)? Or offer them as choices?
7. **Safety gear.** Should "Tools for this plan" also list safety glasses, ear protection and a dust mask?
