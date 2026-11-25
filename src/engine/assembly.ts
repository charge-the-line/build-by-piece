/**
 * Assembly steps (docs/RULES.md, rules A1-A12, J1-J3).
 *
 * Each step names a written template, the parts it works with, the joints it
 * makes and the hardware it uses. The words live in the app's templates; the
 * numbers they quote come from here.
 */
import type { Resolved } from './resolve';
import type { Joint, Part, PartId, PlanMethods, Step, StepHardware, Ticks } from './types';
import type { VanityBuild } from './vanity';

type StepDraft = Omit<Step, 'number' | 'earlierPartIds'>;

export function assemblySteps(r: Resolved, built: VanityBuild, methods: PlanMethods): Step[] {
  const { parts, facts } = built;
  const where = (test: (p: Part) => boolean): PartId[] => parts.filter(test).map((p) => p.id);
  const named = (prefix: string) => where((p) => p.name.startsWith(prefix));
  const role = (...roles: Part['colorRole'][]) => where((p) => roles.includes(p.colorRole));
  const endsWith = (suffix: string) => where((p) => p.name.endsWith(suffix));

  const platformRails = named('Platform rail');
  const crossSupports = named('Platform cross support');
  const toeKick = named('Toe kick');
  const sides = role('leftSide', 'rightSide');
  const leftSide = role('leftSide');
  const rightSide = role('rightSide');
  const bottom = role('bottom');
  const back = role('back');
  const dividers = role('divider');
  const topSupports = named('Top front support');
  const mountingStrips = named('Mounting strip');
  const spacers = named('Slide spacer');
  const frame = role('faceFrame');
  const frameEnds = named('Vertical frame piece (end)');
  const frameRails = [...named('Top frame piece'), ...named('Bottom frame piece')];
  const frameInner = named('Vertical frame piece (inner)');
  const drawerRails = named('Piece between drawers');
  const boxSides = endsWith(': box side');
  const boxEnds = endsWith(': box front and back');
  const boxBottoms = endsWith(': box bottom');
  const drawerBoxes = role('drawerBox');
  const doors = role('door');
  const drawerFronts = role('drawerFront');
  const crossPieces = endsWith(' cross piece');
  const uprights = endsWith(' upright');
  const panels = endsWith(' centre panel');

  const count = (ids: readonly PartId[]) => parts.filter((p) => ids.includes(p.id)).reduce((n, p) => n + p.quantity, 0);
  const hardwareOf = (hardwareId: string): StepHardware[] =>
    built.hardware.filter((h) => h.hardwareId === hardwareId).map((h) => ({ hardwareId: h.hardwareId, quantity: h.quantity, unit: h.unit }));
  const each = (through: readonly PartId[], joint: Omit<Joint, 'through'>): Joint[] => through.map((id) => ({ ...joint, through: id }));

  const drafts: StepDraft[] = [];

  // A1: the platform.
  drafts.push({
    id: 'platform',
    templateId: 'platform',
    values: { supports: count(crossSupports), spacing: facts.supportSpacing, height: facts.platformHeight },
    partIds: [...platformRails, ...crossSupports],
    joints: each(platformRails, { method: 'screws', into: crossSupports }),
    hardware: [],
  });

  // A2: sides onto the bottom. Pocket holes go in the underside of the bottom (J2).
  drafts.push({
    id: 'box',
    templateId: 'box',
    values: {},
    partIds: [...sides, ...bottom],
    joints: each(bottom, { method: 'pocketScrews', face: 'underside', into: sides }),
    hardware: [],
  });

  // A3: dividers. Pocket holes on the drawer side, where drawers hide them (J3).
  if (dividers.length > 0) {
    drafts.push({
      id: 'dividers',
      templateId: 'dividers',
      values: { dividers: count(dividers) },
      partIds: dividers,
      joints: each(dividers, { method: 'pocketScrews', face: 'drawer side', into: bottom }),
      hardware: [],
    });
  }

  // A4: top front supports and mounting strips tie the top together.
  drafts.push({
    id: 'supports',
    templateId: 'supports',
    values: { sections: topSupports.length },
    partIds: [...topSupports, ...mountingStrips],
    joints: [
      ...each(topSupports, { method: 'pocketScrews', face: 'top face', into: [...sides, ...dividers] }),
      ...each(mountingStrips, { method: 'pocketScrews', face: 'back face', into: [...sides, ...dividers] }),
    ],
    hardware: [],
  });

  // A5: the back squares the box.
  drafts.push({
    id: 'back',
    templateId: 'back',
    values: {},
    partIds: back,
    joints: each(back, { method: 'glueAndNails', into: [...bottom, ...dividers, ...mountingStrips] }),
    hardware: [],
  });

  // A6: build the face frame flat, then fix it to the box.
  // J2: on an exposed end the pocket holes go on the inside face of the side panel.
  const sideFace = (end: 'wall' | 'exposed') => (end === 'exposed' ? 'inside face' : 'outside face');
  drafts.push({
    id: 'faceFrame',
    templateId: 'faceFrame',
    values: { overhang: r.ends.left === 'wall' || r.ends.right === 'wall' ? facts.wallOverhang : (0 as Ticks), wallEnds: [r.ends.left, r.ends.right].filter((e) => e === 'wall').length },
    partIds: frame,
    joints: [
      ...each(frameRails, { method: 'pocketScrews', face: 'back face', into: frameEnds }),
      ...each(frameInner, { method: 'pocketScrews', face: 'back face', into: frameRails }),
      ...each(drawerRails, { method: 'pocketScrews', face: 'back face', into: [...frameEnds, ...frameInner] }),
      ...each(leftSide, { method: 'pocketScrews', face: sideFace(r.ends.left), into: frameEnds }),
      ...each(rightSide, { method: 'pocketScrews', face: sideFace(r.ends.right), into: frameEnds }),
    ],
    hardware: [],
  });

  // A7: slide spacers.
  if (spacers.length > 0) {
    drafts.push({
      id: 'spacers',
      templateId: 'spacers',
      values: { spacers: count(spacers) },
      partIds: spacers,
      joints: each(spacers, { method: 'screws', into: sides }),
      hardware: [],
    });
  }

  // A8: drawer boxes. Pocket holes on the outside of the front and back pieces:
  // the drawer front covers one and the other faces the wall.
  if (drawerBoxes.length > 0) {
    drafts.push({
      id: 'drawerBoxes',
      templateId: 'drawerBoxes',
      values: { boxes: boxBottoms.length },
      partIds: drawerBoxes,
      joints: [
        ...each(boxEnds, { method: 'pocketScrews', face: 'outside face', into: boxSides }),
        ...each(boxBottoms, { method: 'glueAndNails', into: [...boxSides, ...boxEnds] }),
      ],
      hardware: [],
    });
  }

  // A9: doors and drawer fronts. The template follows the panel method (rule T5).
  if (doors.length + drawerFronts.length > 0) {
    const flat = doors.length + drawerFronts.length - uprights.length - crossPieces.length - panels.length;
    const grooved = methods.panel === 'stoppedGroove' || methods.panel === 'sawnGroove';
    drafts.push({
      id: 'fronts',
      templateId: panels.length === 0 ? 'frontsFlat' : `fronts-${methods.panel}`,
      values: {
        framed: panels.length,
        flat,
        groove: facts.grooveDepth,
        recess: facts.recessWidth,
        panelThickness: facts.panelThickness,
        panelGap: facts.panelGap,
        hingeSpace: facts.hingeMountingWidth,
      },
      partIds: [...doors, ...drawerFronts],
      joints: [
        ...each(crossPieces, { method: 'pocketScrews', face: 'back face', into: uprights }),
        // A grooved panel floats; a recessed or back-mounted panel is glued (and nailed, on the back).
        ...(grooved ? [] : each(panels, { method: methods.panel === 'panelOnBack' ? 'glueAndNails' : 'glue', into: [...uprights, ...crossPieces] })),
      ],
      hardware: [],
    });
  }

  // A10: openings for the pipes, before the cabinet goes against the wall.
  drafts.push({
    id: 'plumbing',
    templateId: methods.cutouts === 'holeSaw' ? 'plumbingHoleSaw' : 'plumbingJigsaw',
    values: {},
    partIds: back,
    joints: [],
    hardware: [],
  });

  // A11: set the cabinet in place.
  drafts.push({
    id: 'install',
    templateId: 'install',
    values: { toeSpace: facts.toeSpace, height: facts.platformHeight },
    partIds: toeKick,
    joints: [
      ...each(mountingStrips, { method: 'screws', into: [] }),
      ...each(toeKick, { method: 'glueAndNails', into: [...platformRails, ...crossSupports] }),
    ],
    hardware: [],
  });

  // A12: slides, drawer boxes and drawer fronts.
  if (drawerBoxes.length > 0 && facts.slideLength !== undefined) {
    drafts.push({
      id: 'drawers',
      templateId: 'drawers',
      values: { slideLength: facts.slideLength, lift: facts.drawerLift, overlay: facts.overlay, drawers: boxBottoms.length, setback: facts.boxSetback },
      partIds: [...drawerBoxes, ...drawerFronts],
      joints: each(boxEnds, { method: 'screws', into: drawerFronts }),
      hardware: hardwareOf(r.slide.id),
    });
  }

  // A13: doors.
  if (doors.length > 0) {
    drafts.push({
      id: 'doors',
      templateId: 'doors',
      values: { overlay: facts.overlay, doors: built.openings.filter((o) => o.kind === 'door').length, hingeInset: facts.hingeInset },
      partIds: doors,
      joints: [],
      hardware: hardwareOf(r.hinge.id),
    });
  }

  const seen = new Set<PartId>();
  return drafts.map((draft, i) => {
    const earlierPartIds = [...seen].filter((id) => !draft.partIds.includes(id));
    draft.partIds.forEach((id) => seen.add(id));
    return { ...draft, number: i + 1, earlierPartIds };
  });
}
