/**
 * The words for each assembly step. Written templates, filled in with the
 * plan's numbers: no text here is generated, and no size is typed in.
 */
import type { PlanMethods, Step, Ticks } from '../../engine/types';
import { fmt } from '../format';

type Values = Step['values'];

export interface StepTemplate {
  readonly title: string;
  /** `m` is the method chosen for each job, so the words match her tools (rule T7). */
  readonly instructions: (v: Values, m: PlanMethods) => readonly string[];
  readonly checklist: (v: Values, m: PlanMethods) => readonly string[];
}

const size = (v: Values, key: string) => fmt((v[key] ?? 0) as Ticks);
const count = (v: Values, key: string) => Number(v[key] ?? 0);

const nailIt = (m: PlanMethods) => (m.nailing === 'bradNailer' ? 'with the brad nailer' : 'with a hammer and small nails');
const sandIt = (m: PlanMethods) => (m.sanding === 'sander' ? 'with the sander' : 'with a sanding block');

/** Shared by every way of making the fronts. */
const flatFronts = (v: Values, m: PlanMethods): string[] =>
  count(v, 'flat') > 0 ? [`${count(v, 'flat')} of the fronts are flat boards, already the right size. Smooth their edges ${sandIt(m)}.`] : [];

const buildFrame = 'Drill pocket holes in the back of each cross piece, then glue and screw the cross pieces between the uprights. Check each frame is flat and square.';

export const stepTemplates: Readonly<Record<string, StepTemplate>> = {
  platform: {
    title: 'Build the platform',
    instructions: (v) => [
      'Stand the 2x4s on edge. The two long rails go at the front and back, and the short cross supports fit between them.',
      `Put a cross support at each end, then one every ${size(v, 'spacing')} measured from the left end. There are ${count(v, 'supports')} in all.`,
    ],
    checklist: (v) => [
      'Rails and cross supports are flush along the top',
      'Corner to corner measures the same both ways, so it is square',
      `The platform is ${size(v, 'height')} high all the way round`,
    ],
  },
  box: {
    title: 'Join the sides to the bottom',
    instructions: () => [
      'Lay the bottom panel upside down and drill pocket holes along both short edges of its underside.',
      'Stand the side panels up with the bottom between them, flush with their bottom edges. Glue, clamp and screw.',
      'Keep the bottom flush with the front edges of the sides. At the back it stops short, leaving room for the back panel.',
    ],
    checklist: () => [
      'The good face points out on any end that will be seen',
      'Bottom is flush with the front and bottom edges of both sides',
      'Both corners are square',
    ],
  },
  dividers: {
    title: 'Stand the dividers on the bottom',
    instructions: (v) => [
      `The ${count(v, 'dividers')} dividers stand on the bottom panel, flush with its front and back edges. Drill their pocket holes on the side that faces the drawers, where they will be hidden.`,
      'The top front supports from the next step are cut to the exact gap between panels. Use them as spacers to set each divider before you screw it down.',
    ],
    checklist: () => ['Each divider is spaced with its top front support', 'Dividers are flush with the front edge of the bottom', 'Dividers stand straight up'],
  },
  supports: {
    title: 'Tie the top together',
    instructions: () => [
      'Each section of the box gets two boards across the top: a top front support lying flat at the front, and a mounting strip standing on edge at the back.',
      'Fit them between the sides and dividers, flush with the top edges. Each board is cut to the exact width of its section, so a snug fit means the panels are in the right place.',
      'Line up the back of each mounting strip with the back edge of the bottom panel, so the back panel can sit against both.',
    ],
    checklist: (v) => [
      `${count(v, 'sections')} top front supports are flush with the front and top`,
      `${count(v, 'sections')} mounting strips are flush with the top`,
      'Dividers are still straight up',
    ],
  },
  back: {
    title: 'Close the back',
    instructions: (_v, m) => [
      `Run glue along the back edges of the bottom, the dividers and the mounting strips. Drop the back panel in between the two sides and nail it on ${nailIt(m)}.`,
      'Before the glue sets, measure corner to corner both ways and nudge the box until the two numbers match.',
    ],
    checklist: () => ['Back sits between the sides, not over them', 'Corner to corner measures the same both ways', 'Squeezed-out glue is wiped off'],
  },
  faceFrame: {
    title: 'Build the face frame and glue it on',
    instructions: (v) => [
      'Lay the frame pieces face down on a flat surface in the positions shown. Drill pocket holes in the back of every piece that butts into another, then glue and screw them together.',
      'Lay the box on its back. Glue its front edges, set the frame on top, and screw through the pocket holes in the side panels.',
      count(v, 'wallEnds') > 0
        ? `On a wall end the frame runs ${size(v, 'overhang')} past the side panel, so it can be trimmed to fit the wall. On an end that will be seen, keep it flush.`
        : 'Keep the frame flush with the outside of both side panels.',
      'The top and bottom of the frame are flush with the top and bottom of the box.',
    ],
    checklist: (v) => [
      'Frame joints are flush on the front face',
      'Frame is flush with the top and bottom of the box',
      count(v, 'wallEnds') > 0 ? `Frame overhangs the wall end by ${size(v, 'overhang')}` : 'Frame is flush with both ends',
      'Each opening measures the same corner to corner both ways',
    ],
  },
  spacers: {
    title: 'Add the drawer slide spacers',
    instructions: () => [
      'The frame stands proud of the side panels, so each drawer slide on a side panel needs a spacer behind it.',
      'Glue and screw each spacer to the inside of the side panel, with its bottom edge level with the bottom of its drawer opening and its front end against the back of the face frame. Where two thin layers are shown, stack them.',
      'The face of the spacer should end up level with the edge of the opening. Hold a straight edge across to check.',
    ],
    checklist: (v) => [`${count(v, 'spacers')} spacer strips are fixed`, 'Each spacer face is level with the edge of its opening'],
  },
  drawerBoxes: {
    title: 'Build the drawer boxes',
    instructions: (v, m) => [
      `There are ${count(v, 'boxes')} boxes. In each one, the front and back pieces fit between the two sides. Drill pocket holes on the outside faces of the front and back pieces, then glue and screw.`,
      `Check the box is square, then glue the bottom on underneath, flush all round, and nail it ${nailIt(m)}.`,
    ],
    checklist: () => [
      'Front and back pieces sit between the sides, flush top and bottom',
      'Each box measures the same corner to corner both ways',
      'Bottoms are flush all round',
      'Each box has its drawer name written inside',
    ],
  },
  // T5, default with a router: build the frame, then rout a recess round the back for the panel.
  'fronts-routedRecess': {
    title: 'Build the doors and drawer fronts',
    instructions: (v, m) => [
      `${count(v, 'framed')} of the fronts are framed: two uprights, two cross pieces and a thin centre panel. Build each frame first. ${buildFrame}`,
      `Lay the frame face down. With the bearing-guided bit in the router, cut a recess ${size(v, 'recess')} wide all round the inside edge of the back. Set the depth of cut to ${size(v, 'panelThickness')}, the thickness of your panel, so the panel ends up flush with the back.`,
      'The bit leaves the four corners of the recess rounded. Lay the panel over the recess, mark the corners, and round them to match so the panel drops in.',
      'Run a thin line of glue in the recess, press the panel in and leave it flat until the glue sets.',
      ...flatFronts(v, m),
    ],
    checklist: (v) => [
      'Frames are flat and square before routing',
      `Recess is ${size(v, 'panelThickness')} deep all the way round`,
      'Panels sit flush with the back of their frames',
      'Front faces are sanded',
    ],
  },
  // T5, advanced: a groove in each frame piece before assembly.
  'fronts-stoppedGroove': {
    title: 'Build the doors and drawer fronts',
    instructions: (v, m) => [
      `${count(v, 'framed')} of the fronts are framed: two uprights, two cross pieces and a thin centre panel. Before assembly, rout a groove ${size(v, 'groove')} deep and ${size(v, 'panelThickness')} wide, the thickness of your panel, along the inside edge of every frame piece.`,
      'On the cross pieces the groove runs the full length. On the uprights, stop it before each end so it does not show on the top and bottom of the door. Mark the stopping points first.',
      'Drill pocket holes in the back of each cross piece. Slide the panel into the grooves without glue, then glue and screw the cross pieces between the uprights.',
      ...flatFronts(v, m),
    ],
    checklist: () => ['Grooves on the uprights stop short of both ends', 'Panels slide in without forcing', 'Frames are flat and square', 'Front faces are sanded'],
  },
  // T5, with a table saw and no router.
  'fronts-sawnGroove': {
    title: 'Build the doors and drawer fronts',
    instructions: (v, m) => [
      `${count(v, 'framed')} of the fronts are framed: two uprights, two cross pieces and a thin centre panel. Before assembly, cut a groove ${size(v, 'groove')} deep and ${size(v, 'panelThickness')} wide, the thickness of your panel, along the inside edge of every frame piece on the table saw. Make a test cut in an offcut first and check the panel fits.`,
      'The groove runs the full length of every piece, so it shows as a small notch on the top and bottom edges of each front.',
      'Drill pocket holes in the back of each cross piece. Slide the panel into the grooves without glue, then glue and screw the cross pieces between the uprights.',
      ...flatFronts(v, m),
    ],
    checklist: () => ['A test groove fits the panel', 'Panels slide in without forcing', 'Frames are flat and square', 'Front faces are sanded'],
  },
  // T5, with neither: the panel is fixed to the back of the finished frame.
  'fronts-panelOnBack': {
    title: 'Build the doors and drawer fronts',
    instructions: (v, m) => [
      `${count(v, 'framed')} of the fronts are framed: two uprights, two cross pieces and a thin centre panel fixed to the back. Build each frame first. ${buildFrame}`,
      `Lay the frame face down and set the panel on its back, ${size(v, 'panelGap')} in from the edges. On a door, the edge where the hinges go is different: keep the panel ${size(v, 'hingeSpace')} in from that edge, so the hinges have solid wood to mount on. Mark the hinge edge before you start.`,
      `Glue the panel down and nail it ${nailIt(m)}. Keep the nails short enough not to come through the front.`,
      ...flatFronts(v, m),
    ],
    checklist: (v) => [
      `Each door panel is ${size(v, 'hingeSpace')} in from the hinge edge`,
      `Every other panel edge is ${size(v, 'panelGap')} in from the edge of its front`,
      'No nail has come through a front face',
      'Front faces are sanded',
    ],
  },
  frontsFlat: {
    title: 'Prepare the doors and drawer fronts',
    instructions: (v, m) => flatFronts(v, m),
    checklist: () => ['Edges are smooth', 'Front faces are sanded'],
  },
  // A10: openings for the pipes. Positions are measured on site, so nothing here quotes a size.
  plumbingHoleSaw: {
    title: 'Cut the openings for the pipes',
    instructions: () => [
      'Before the cabinet goes against the wall, find where each pipe comes out of the wall. Measure from the floor and from the side wall (or from where the end of the cabinet will be) to the centre of each pipe.',
      'Mark the same points on the back panel from inside the cabinet. Remember the cabinet sits on the platform, so measure up from the floor, not from the bottom of the box.',
      'With a hole saw a little larger than the pipe, drill a hole at each mark. Drill from the inside until the centre bit just comes through, then finish from the back for a clean edge.',
    ],
    checklist: () => ['Every pipe has a mark', 'Each mark was measured twice', 'Holes are clear of the mounting strips'],
  },
  plumbingJigsaw: {
    title: 'Cut the opening for the pipes',
    instructions: () => [
      'Before the cabinet goes against the wall, find where the pipes come out of the wall. Measure from the floor and from the side wall (or from where the end of the cabinet will be) to the pipes.',
      'Mark one rectangle on the back panel, from inside the cabinet, big enough to take all the pipes with a little room to spare. Remember the cabinet sits on the platform, so measure up from the floor, not from the bottom of the box.',
      'Drill a starter hole inside one corner of the rectangle, put the jigsaw blade through it, and cut along the lines.',
    ],
    checklist: () => ['The rectangle covers every pipe', 'It was measured twice', 'The opening is clear of the mounting strips'],
  },
  install: {
    title: 'Set the cabinet in place',
    instructions: (v) => [
      'Put the platform against the wall and level it with shims. Screw it to the floor or the wall.',
      'Lift the box onto the platform with its back against the wall. It overhangs the platform at the front.',
      'Find the wall studs and screw through the mounting strips into them.',
      `Glue and nail the toe kick to the platform. Its face sits ${size(v, 'toeSpace')} back from the front of the cabinet. On an end that can be seen, fix the short return piece first, then cover its end with the front piece.`,
    ],
    checklist: () => ['Platform is level side to side and front to back', 'Cabinet is screwed to at least two studs', 'Toe kick is fixed'],
  },
  drawers: {
    title: 'Fit the slides, drawers and drawer fronts',
    instructions: (v) => [
      `Each drawer runs on a pair of ${size(v, 'slideLength')} slides. Screw the cabinet half of each slide to the divider or spacer, level, with its front end flush with the front of the face frame.`,
      `Screw the other half to the drawer box so the bottom of the box sits ${size(v, 'lift')} above the bottom of its opening.`,
      ...(count(v, 'setback') > 0 ? [`Set the front of each drawer box ${size(v, 'setback')} back from the front of the face frame. That leaves room for the panel on the back of the framed drawer fronts.`] : []),
      `Slide the boxes in. Hold each drawer front so it laps over its opening by ${size(v, 'overlay')} on every side, then screw it on from inside the box.`,
    ],
    checklist: (v) => [`${count(v, 'drawers')} drawers slide in and out freely`, 'Gaps between the fronts are even', 'Fronts are screwed on from inside the boxes'],
  },
  doors: {
    title: 'Hang the doors',
    instructions: (v) => [
      `Each door hangs on two hinges made for a ${size(v, 'overlay')} overlay. Mark the centre of each hinge ${size(v, 'hingeInset')} from the top and bottom of the door, on the back, along the hinge edge.`,
      'Bore the cup hole for each hinge with the hinge-boring bit, following the sheet that comes with the hinges for how far in from the edge and how deep. Try it on an offcut first.',
      'Screw the hinges into their cup holes, then to the edge of the face frame.',
      `Turn the hinge screws until the door laps over its opening by ${size(v, 'overlay')} on every side and the gaps are even.`,
    ],
    checklist: (v) => [`${count(v, 'doors')} doors open and close freely`, 'Gaps are even all round'],
  },
};
