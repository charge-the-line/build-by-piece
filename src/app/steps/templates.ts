/**
 * The words for each assembly step. Written templates, filled in with the
 * plan's numbers: nothing here is generated and no size is typed in.
 *
 * Pictures first: `say` is the one or two short sentences shown under the
 * picture. `more` is the fuller explanation, tucked behind "More detail".
 */
import type { PlanMethods, Step, StepChapter, Ticks } from '../../engine/types';
import { fmt } from '../format';

type Values = Step['values'];

export interface StepTemplate {
  readonly title: (v: Values) => string;
  readonly say: (v: Values, m: PlanMethods) => string;
  readonly more: (v: Values, m: PlanMethods) => readonly string[];
}

const size = (v: Values, key: string) => fmt((v[key] ?? 0) as Ticks);
const count = (v: Values, key: string) => Number(v[key] ?? 0);
const is = (v: Values, key: string) => count(v, key) > 0;

const nailIt = (m: PlanMethods) => (m.nailing === 'bradNailer' ? 'with the brad nailer' : 'with a hammer and small nails');
const sandIt = (m: PlanMethods) => (m.sanding === 'sander' ? 'with the sander' : 'with a sanding block');
const fixed = (title: string) => () => title;

const SQUARE = 'Measure corner to corner both ways. The two numbers should match.';
const pipes = [
  'Do this before the cabinet goes against the wall.',
  'Measure from the floor and from the side wall to each pipe. The cabinet sits on the platform, so measure up from the floor, not from the bottom of the box.',
  'Mark from inside the cabinet, and measure twice.',
  'Keep the opening clear of the mounting strips.',
];

export const chapterNames: Readonly<Record<StepChapter, string>> = {
  platform: 'Platform',
  box: 'Box',
  faceFrame: 'Face frame',
  drawerBoxes: 'Drawer boxes',
  fronts: 'Doors and drawer fronts',
  finish: 'Sanding and finish',
  install: 'Putting it in place',
  drawers: 'Drawers',
  doors: 'Doors and handles',
};

export const stepTemplates: Readonly<Record<string, StepTemplate>> = {
  platformEnds: {
    title: fixed('Start the platform'),
    say: () => 'Stand the two long boards on edge. Screw a short support between them at each end.',
    more: () => ['Keep the tops flush.', SQUARE],
  },
  platformMiddle: {
    title: fixed('Add the middle supports'),
    say: (v) => `Screw in ${count(v, 'supports')} more, one every ${size(v, 'spacing')} from the left end.`,
    more: () => ['Mark the centres on both long boards before you start.', 'Keep the tops flush.'],
  },
  runPlatform: {
    title: (v) => (count(v, 'sections') > 1 ? `Build platform ${count(v, 'section')} of ${count(v, 'sections')}` : 'Build the platform'),
    say: (v) => `Stand the two long boards on edge. Screw ${count(v, 'supports')} short supports between them: one at each end, the rest every ${size(v, 'spacing')} from the left.`,
    more: () => ['Keep the tops flush.', SQUARE, 'Each platform sits under one unbroken stretch of cabinets.'],
  },
  runSetCabinet: {
    title: (v) => `Set cabinet C${String(count(v, 'cabinet')).padStart(2, '0')} in place`,
    say: (v) =>
      is(v, 'joins')
        ? 'Lift it onto the platform, tight against the last cabinet. Clamp the two frames flush and screw them together.'
        : 'Lift it onto the platform with its back against the wall.',
    more: (v) => [
      'This is a two-person lift.',
      ...(is(v, 'joins') ? ['Line up the front faces and the tops of the two frames before you clamp.', 'Drill through one vertical frame piece into the next, then drive the screws.'] : ['The box overhangs the platform at the front.']),
    ],
  },
  runToeKick: {
    title: fixed('Cover the platforms'),
    say: (_v, m) => `Glue the toe kick pieces to the platforms and nail them ${nailIt(m)}. Where an end can be seen, fix the short piece first.`,
    more: (v) => [`The face of the toe kick sits ${size(v, 'toeSpace')} back from the front of the cabinets.`, 'The long front piece covers the end of the short one.'],
  },
  boxLeft: {
    title: fixed('Attach the left side'),
    say: () => 'Glue the end of the bottom panel. Screw through its pocket holes into the left side.',
    more: (v) => [
      is(v, 'hangs')
        ? 'First drill pocket holes along both short edges of the top face of the bottom panel. Under a wall cabinet the bottom is seen, so the holes go inside.'
        : 'First drill pocket holes along both short edges of the underside of the bottom panel.',
      'The bottom is flush with the front and bottom edges of the side. At the back it stops short, leaving room for the back panel.',
      'If this end will be seen, put the good face out.',
    ],
  },
  boxRight: {
    title: fixed('Attach the right side'),
    say: () => 'Do the same at the other end with the right side.',
    more: () => ['Flush with the front and bottom edges, as before.', 'If this end will be seen, put the good face out.'],
  },
  topPanel: {
    title: fixed('Add the top panel'),
    say: () => 'Glue both ends of the top panel. Fit it between the sides, flush with the top, and screw.',
    more: () => ['Pocket holes go on the top face, where nobody will see them.', 'Flush with the front edges of the sides. At the back it stops short, like the bottom panel.', SQUARE],
  },
  shelves: {
    title: (v) => (count(v, 'shelves') === 1 ? 'Fit the shelf' : 'Fit the shelves'),
    say: (v) => (count(v, 'shelves') === 1 ? 'Glue and screw the shelf between the panels, at the height shown.' : `Glue and screw the ${count(v, 'shelves')} shelves between the panels, at the heights shown.`),
    more: () => [
      'Pocket holes go on the underside of each shelf.',
      'Cut two scraps to the height of the gap below a shelf and stand the shelf on them while you screw it. That keeps it level without measuring twice.',
      'Push each shelf back until it touches where the back panel will be.',
    ],
  },
  fixedPanels: {
    title: (v) => (count(v, 'panels') === 1 ? 'Fix the sink panel' : 'Fix the sink panels'),
    say: (v) => `Hold each panel so it laps its opening by ${size(v, 'overlay')} all round. Screw it on from behind, through the frame.`,
    more: () => ['These look like drawer fronts but do not open. The sink sits behind them.', 'Clamp or tape each one in place first.', 'Use screws short enough not to come through the front.'],
  },
  ledger: {
    title: fixed('Screw a ledge to the wall'),
    say: () => 'Mark where the bottom of the cabinet will be. Screw a straight board to the wall along that line, into studs.',
    more: () => ['Use a level. The cabinet will sit on this board while you fix it, so the board must be level.', 'Find the studs and mark them above the line too, where the cabinet will not hide them.', 'The board comes off again afterwards.'],
  },
  hangCabinet: {
    title: fixed('Lift the cabinet onto the ledge'),
    say: () => 'With a helper, rest the cabinet on the ledge and hold it flat against the wall.',
    more: () => ['This is a two-person job. Do not try it alone.', 'Take the doors off first if they are on; the cabinet is much lighter without them.'],
  },
  dividers: {
    title: fixed('Stand the dividers'),
    say: (v) => `Glue and screw the ${count(v, 'dividers')} dividers to the bottom panel.`,
    more: () => [
      'Pocket holes go on the side that faces the drawers, where they will be hidden.',
      'Do not measure where they go. The top front supports in the next step are cut to the exact gap, so use them as spacers.',
      'Flush with the front edge of the bottom panel.',
    ],
  },
  topSupports: {
    title: fixed('Add the top front supports'),
    say: () => 'Lay one board flat across the top front of each section. Glue and screw.',
    more: () => ['Flush with the front edge and the top.', 'Each board is cut for its own section. A snug fit means the panels are in the right place.', 'Pocket holes face up, where the top will hide them.'],
  },
  mountingStrips: {
    title: fixed('Add the mounting strips'),
    say: () => 'Stand one board on edge across the top back of each section. Glue and screw.',
    more: () => ['Flush with the top.', 'Line its back up with the back edge of the bottom panel, so the back panel can sit against both.'],
  },
  back: {
    title: fixed('Close the back'),
    say: (_v, m) => `Glue the back edges. Drop the back panel between the sides and nail it ${nailIt(m)}.`,
    more: () => ['Glue goes on the back edges of the bottom, the dividers and the mounting strips.', `Before the glue sets: ${SQUARE} Nudge the box until they do.`],
  },
  frameOuter: {
    title: fixed('Start the face frame'),
    say: () => 'Lay the pieces face down. Glue and screw the long pieces between the two end pieces.',
    more: () => ['Pocket holes go in the back of the long pieces.', 'Clamp each joint flat while you drive the screw, so the front faces stay flush.', SQUARE],
  },
  frameInner: {
    title: fixed('Add the inner uprights'),
    say: () => 'Glue and screw each inner upright between the top and bottom pieces.',
    more: () => ['Pocket holes go in the back of each upright, at both ends.', 'The gap between uprights is the width of each opening. Cut a scrap to that width and use it as a spacer.'],
  },
  frameDrawerRails: {
    title: fixed('Add the short cross pieces'),
    say: () => 'Glue and screw the short pieces between the uprights, where shown.',
    more: () => ['Pocket holes go in the back of each short piece, at both ends.', 'They separate one opening from the next. Set the same heights on both sides so the fronts line up.'],
  },
  frameOn: {
    title: fixed('Fix the frame to the box'),
    say: () => 'Glue the front edges of the box. Lay the frame on and screw through the side panels.',
    more: (v) => [
      'Lay the box on its back first.',
      is(v, 'wallEnds')
        ? `On a wall end the frame runs ${size(v, 'overhang')} past the side panel, so it can be trimmed to fit the wall. On an end that will be seen, keep it flush.`
        : 'Keep the frame flush with the outside of both side panels.',
      'Top and bottom of the frame are flush with the top and bottom of the box.',
    ],
  },
  spacers: {
    title: fixed('Add the slide spacers'),
    say: () => 'Glue and screw a spacer strip to the side panel behind each drawer opening.',
    more: () => [
      'The frame stands proud of the side panel, so the slide needs a spacer behind it.',
      'Bottom edge level with the bottom of its drawer opening. Front end against the back of the face frame.',
      'Where two thin layers are shown, stack them.',
      'The face of the spacer should end up level with the edge of the opening. Check with a straight edge.',
    ],
  },
  drawerBoxSides: {
    title: fixed('Build a drawer box'),
    say: () => 'Glue and screw the front and back pieces between the two sides.',
    more: () => ['Pocket holes go on the outside faces of the front and back pieces.', 'Flush top and bottom.', 'Write the drawer name inside each box.'],
  },
  drawerBoxBottom: {
    title: fixed('Add the drawer bottom'),
    say: (_v, m) => `Check the box is square. Glue the bottom on underneath and nail it ${nailIt(m)}.`,
    more: () => [SQUARE, 'Flush all round.'],
  },
  frontFrame: {
    title: (v) => (is(v, 'isDoor') ? 'Build a door frame' : 'Build a drawer front frame'),
    say: () => 'Glue and screw the two cross pieces between the uprights.',
    more: () => ['Pocket holes go in the back of each cross piece.', 'Clamp each joint flat so the front faces stay flush.', SQUARE],
  },
  frontRecess: {
    title: fixed('Rout the recess'),
    say: (v) => `Lay the frame face down. Rout a recess ${size(v, 'recess')} wide and ${size(v, 'panelThickness')} deep round the inside edge.`,
    more: () => [
      'Use the bearing-guided bit. The bearing rides along the inside edge of the frame.',
      'The depth is the thickness of your panel, so the panel ends up flush with the back.',
      'Go round in two shallow passes, not one deep one.',
      'Try it on an offcut first.',
    ],
  },
  frontPanelRecess: {
    title: fixed('Glue in the panel'),
    say: () => 'Round the corners of the panel to match the recess. Glue it in.',
    more: () => ['The bit leaves the corners of the recess rounded. Lay the panel over it and mark the corners.', 'Leave it flat until the glue sets.'],
  },
  frontPanelOnBack: {
    title: fixed('Fix the panel on the back'),
    say: (v, m) =>
      is(v, 'isDoor')
        ? `Keep the panel ${size(v, 'hingeSpace')} from the hinge edge and ${size(v, 'panelGap')} from the others. Glue and nail it ${nailIt(m)}.`
        : `Keep the panel ${size(v, 'panelGap')} in from every edge. Glue and nail it ${nailIt(m)}.`,
    more: (v) => [
      ...(is(v, 'isDoor') ? ['Mark the hinge edge before you start. The hinges need solid wood there.'] : []),
      'Lay the frame face down first.',
      'Use nails short enough not to come through the front.',
    ],
  },
  frontGrooveRouter: {
    title: fixed('Rout the grooves'),
    say: (v) => `Rout a groove ${size(v, 'groove')} deep and ${size(v, 'panelThickness')} wide along the inside edge of each piece.`,
    more: () => [
      'The width is the thickness of your panel.',
      'On the cross pieces the groove runs the full length.',
      'On the uprights, stop it before each end so it does not show on the top and bottom of the front. Mark the stopping points first.',
      'Try it on an offcut and check the panel slides in.',
    ],
  },
  frontGrooveSaw: {
    title: fixed('Cut the grooves'),
    say: (v) => `On the table saw, cut a groove ${size(v, 'groove')} deep and ${size(v, 'panelThickness')} wide along the inside edge of each piece.`,
    more: () => ['The width is the thickness of your panel.', 'The groove runs the full length, so it shows as a small notch on the top and bottom edges.', 'Try it on an offcut and check the panel slides in.'],
  },
  frontFrameWithPanel: {
    title: (v) => (is(v, 'isDoor') ? 'Assemble a door' : 'Assemble a drawer front'),
    say: () => 'Slide the panel into the grooves, with no glue. Glue and screw the cross pieces between the uprights.',
    more: () => ['Pocket holes go in the back of each cross piece.', 'The panel is left loose so the wood can move.', SQUARE],
  },
  sand: {
    title: fixed('Sand what will be seen'),
    say: (_v, m) => `Sand the frame, the doors, the drawer fronts and any side that shows, ${sandIt(m)}.`,
    more: () => ['Start with medium paper and finish with fine.', 'Sand along the grain.', 'Wipe off the dust.'],
  },
  finish: {
    title: fixed('Stain or paint'),
    say: () => 'Put your stain or paint on everything you sanded.',
    more: () => ['Try it on an offcut first.', 'Do the doors and drawer fronts flat, before they are hung.', 'Follow the drying time on the tin.'],
  },
  topcoat: {
    title: fixed('Add a clear coat'),
    say: () => 'Brush on a clear protective coat. Let it dry, sand lightly, and coat again.',
    more: () => ['A bathroom needs a finish that stands up to water.', 'Follow the drying time on the tin.'],
  },
  plumbingJigsaw: {
    title: fixed('Cut the opening for the pipes'),
    say: () => 'Mark one rectangle on the back panel that covers all the pipes. Cut it out with the jigsaw.',
    more: () => [...pipes, 'Drill a starter hole inside one corner for the jigsaw blade.'],
  },
  plumbingHoleSaw: {
    title: fixed('Cut the holes for the pipes'),
    say: () => 'Mark the centre of each pipe on the back panel. Drill each with the hole saw.',
    more: () => [...pipes, 'Use a hole saw a little larger than the pipe.', 'Drill from inside until the centre bit just comes through, then finish from the back.'],
  },
  setPlatform: {
    title: fixed('Place the platform'),
    say: () => 'Put the platform against the wall. Level it with shims and screw it down.',
    more: (v) => ['Check level side to side and front to back.', `Its top should be ${size(v, 'height')} off the floor all the way along.`],
  },
  setBox: {
    title: fixed('Lift the box on'),
    say: () => 'Set the box on the platform with its back against the wall.',
    more: () => ['This is a two-person lift.', 'The box overhangs the platform at the front.'],
  },
  wallScrews: {
    title: fixed('Screw it to the wall'),
    say: () => 'Find the wall studs. Screw through the mounting strips into them.',
    more: () => ['Screw into at least two studs.', 'Check the cabinet is still level before the last screw.'],
  },
  toeKickReturn: {
    title: fixed('Cover the end of the platform'),
    say: (_v, m) => `Glue the short toe kick piece to the end of the platform and nail it ${nailIt(m)}.`,
    more: () => ['This goes on first, so the long front piece can cover its end.'],
  },
  toeKick: {
    title: fixed('Cover the front of the platform'),
    say: (_v, m) => `Glue the long toe kick piece to the front of the platform and nail it ${nailIt(m)}.`,
    more: (v) => [`Its face sits ${size(v, 'toeSpace')} back from the front of the cabinet.`],
  },
  slidesCabinet: {
    title: fixed('Fit the slides in the cabinet'),
    say: (v) => `Screw a ${size(v, 'slideLength')} slide to each side of every drawer opening. Keep each one level.`,
    more: (v) => [
      'Slides come in pairs: one half fixes to the cabinet, the other to the drawer box.',
      is(v, 'setback')
        ? `Set the front end of each slide ${size(v, 'setback')} back from the front of the face frame.`
        : 'The front end of each slide is flush with the front of the face frame.',
      'Use a scrap as a rest so both slides of a pair sit at the same height.',
    ],
  },
  slidesDrawers: {
    title: fixed('Fit the drawer boxes'),
    say: (v) => `Screw the other half of each slide to its box. The box sits ${size(v, 'lift')} above the bottom of its opening. Slide it in.`,
    more: (v) => [`There are ${count(v, 'drawers')} drawers.`, 'Each should slide in and out freely.'],
  },
  drawerFronts: {
    title: fixed('Fix the drawer fronts'),
    say: (v) => `Hold each front so it laps its opening by ${size(v, 'overlay')} all round. Screw it on from inside the box.`,
    more: () => ['Clamp or tape the front in place before you drive the screws.', 'Keep the gaps between fronts even.'],
  },
  hinges: {
    title: fixed('Fit the hinges to the doors'),
    say: (v) => `Bore two cup holes in the back of each door, ${size(v, 'hingeInset')} from the top and bottom. Screw in the hinges.`,
    more: () => [
      'The cup holes go along the hinge edge. Neighbouring doors have their hinges on opposite edges.',
      'Use the hinge-boring bit. The sheet that comes with the hinges says how far in from the edge and how deep.',
      'Try it on an offcut first.',
    ],
  },
  hangDoors: {
    title: fixed('Hang the doors'),
    say: (v) => `Screw the hinges to the edge of the face frame. Adjust until each door laps its opening by ${size(v, 'overlay')} all round.`,
    more: () => ['The small screws on each hinge move the door up, down, in and out.', 'Aim for even gaps all round.'],
  },
  handles: {
    title: fixed('Fit your handles'),
    say: () => 'Mark, drill and fit a handle on each door and drawer front.',
    more: () => ['Make a card template so every handle lands in the same place.', 'Put a scrap behind the front as you drill, so the back does not splinter.'],
  },
};
