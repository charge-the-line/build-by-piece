/**
 * Assembly steps (docs/RULES.md, section A and rules J1-J4).
 *
 * Many small steps, each with: the pieces it works with and which way they
 * arrive, where the glue goes, where each screw goes, the tools, and a
 * written template for the words. The pictures are drawn from this.
 */
import { contact, screwsAlong } from './geometry';
import type { Resolved } from './resolve';
import type {
  Direction,
  Joint,
  JointFace,
  Opening,
  Part,
  PartId,
  Patch,
  PieceRef,
  PlanMethods,
  Point3,
  Step,
  StepChapter,
  StepFastener,
  StepHardware,
  StepPiece,
  SupplyLine,
  MaterialCatalog,
  Ticks,
} from './types';
import type { VanityBuild } from './vanity';

interface JointSpec {
  readonly method: Joint['method'];
  readonly face?: JointFace;
  readonly through: readonly PieceRef[];
  /** Empty when the screws go into the wall. */
  readonly into: readonly PieceRef[];
  /** Which supply the screws are, when they can be counted. */
  readonly fastener?: string;
}

interface StepSpec {
  readonly id: string;
  readonly chapter: StepChapter;
  readonly scene: 'cabinet' | 'bench';
  /** Bench steps that build the same thing share a key, so earlier pieces of it are shown. */
  readonly bench?: string;
  /** Shown from the back when the work is on the back face. */
  readonly view?: 'back';
  readonly templateId: string;
  readonly values?: Step['values'];
  readonly pieces: readonly StepPiece[];
  /** Identical pieces built the same way, not drawn: "make 4 of these". */
  readonly also?: readonly PieceRef[];
  readonly repeat?: number;
  readonly joints?: readonly JointSpec[];
  readonly hardware?: readonly StepHardware[];
  readonly tools?: readonly string[];
}

const key = (ref: PieceRef) => `${ref.partId}#${ref.copy}`;

export interface Assembly {
  readonly steps: Step[];
  readonly supplies: SupplyLine[];
}

export function assemble(r: Resolved, built: VanityBuild, methods: PlanMethods, catalog: MaterialCatalog): Assembly {
  const { parts, facts, placements } = built;
  const placeOf = new Map(placements.map((p) => [key(p), p]));
  const partOf = new Map(parts.map((p) => [p.id, p]));
  const screwRule = { endInset: r.screwEndInset.value, spacing: r.screwSpacing.value };

  // --- Picking pieces ------------------------------------------------------
  const all = (test: (p: Part) => boolean): PieceRef[] =>
    parts.filter(test).flatMap((p) => Array.from({ length: p.quantity }, (_, i) => ({ partId: p.id, copy: i + 1 })));
  const named = (prefix: string) => all((p) => p.name.startsWith(prefix));
  const role = (...roles: Part['colorRole'][]) => all((p) => roles.includes(p.colorRole));
  const ofParts = (ids: readonly PartId[], suffix: string) => all((p) => ids.includes(p.id) && p.name.endsWith(suffix));
  const from = (refs: readonly PieceRef[], direction: Direction): StepPiece[] => refs.map((ref) => ({ ...ref, from: direction }));
  const still = (refs: readonly PieceRef[]) => from(refs, 'none');
  /** Pieces fixed to the inside of the box arrive from the middle of the cabinet. */
  const fromInside = (refs: readonly PieceRef[]): StepPiece[] =>
    refs.map((ref) => ({ ...ref, from: placeOf.get(key(ref))!.x * 2 < built.overall.frameWidth ? 'right' : 'left' }));

  const platformRails = named('Platform rail');
  const crossSupports = named('Platform cross support');
  const toeKickFront = named('Toe kick (front)');
  const toeKickReturns = named('Toe kick (end return)');
  const leftSide = role('leftSide');
  const rightSide = role('rightSide');
  const bottom = role('bottom');
  const back = role('back');
  const dividers = named('Interior divider');
  const shelves = named('Shelf');
  const topPanel = role('top');
  const topSupports = named('Top front support');
  const mountingStrips = [...named('Mounting strip'), ...named('Lower mounting strip')];
  const spacers = named('Slide spacer');
  const frameEnds = named('Vertical frame piece (end)');
  const frameRails = [...named('Top frame piece'), ...named('Bottom frame piece')];
  const frameInner = named('Vertical frame piece (inner)');
  const drawerRails = [...named('Piece between drawers'), ...named('Piece between openings')];
  const frame = role('faceFrame');
  const box = [...leftSide, ...rightSide, ...bottom, ...topPanel, ...dividers, ...shelves, ...topSupports, ...mountingStrips, ...back];
  const drawerBoxes = role('drawerBox');
  const doors = role('door');
  // K6: a fixed panel looks like a drawer front but is screwed to the frame.
  const fixedPanels = all((p) => p.colorRole === 'drawerFront' && p.name.endsWith(': panel'));
  const drawerFronts = all((p) => p.colorRole === 'drawerFront' && !p.name.endsWith(': panel'));
  const hangs = !r.kind.hasPlatform;
  // K7: under a wall cabinet the bottom is seen, so its pocket holes go on top, inside.
  const bottomFace: JointFace = hangs ? 'top face' : 'underside';

  // Fine-thread pocket screws for solid hardwood; coarse for plywood and softwood.
  const isHardwoodBoard = (ref: PieceRef) => {
    const stock = catalog.stock.find((s) => s.id === partOf.get(ref.partId)!.materialId);
    return stock?.kind === 'board' && stock.species === 'oak';
  };
  const pocketScrew = (through: readonly PieceRef[]) => (through.some(isHardwoodBoard) ? 'pocket-screws-fine' : 'pocket-screws-coarse');
  const nailer = methods.nailing === 'bradNailer' ? 'bradNailer' : 'hammer';
  const sanding = methods.sanding === 'sander' ? 'sander' : 'sandingBlock';

  // --- Turning a spec into a step ------------------------------------------
  const steps: Step[] = [];
  const inCabinet = new Map<string, PieceRef>();
  const onBench = new Map<string, Map<string, PieceRef>>();
  const supplyCounts = new Map<string, number>();

  const add = (spec: StepSpec) => {
    if (spec.pieces.length === 0) return;
    const scene = spec.scene === 'cabinet' ? inCabinet : (onBench.get(spec.bench ?? spec.id) ?? new Map<string, PieceRef>());
    if (spec.scene === 'bench') onBench.set(spec.bench ?? spec.id, scene);
    const mine = new Set(spec.pieces.map(key));
    const earlierPieces = [...scene.values()].filter((ref) => !mine.has(key(ref)));
    spec.pieces.forEach((piece) => scene.set(key(piece), { partId: piece.partId, copy: piece.copy }));

    const repeat = spec.repeat ?? 1;
    const glue: Patch[] = [];
    const screws: Point3[] = [];
    const fasteners = new Map<string, number>();
    const tools = new Set<string>(spec.tools ?? []);
    const joints: Joint[] = [];

    for (const joint of spec.joints ?? []) {
      // What the words need: which parts, joined how.
      for (const partId of [...new Set(joint.through.map((t) => t.partId))]) {
        joints.push({ method: joint.method, through: partId, ...(joint.face ? { face: joint.face } : {}), into: [...new Set(joint.into.map((i) => i.partId))] });
      }
      // What the picture needs: where the pieces meet.
      const patches: Patch[] = [];
      const done = new Set<string>();
      for (const through of joint.through) {
        for (const into of joint.into) {
          // A piece does not join itself, and each pair of pieces is one joint.
          const pair = [key(through), key(into)].sort().join('+');
          if (key(through) === key(into) || done.has(pair)) continue;
          done.add(pair);
          const [a, b] = [placeOf.get(key(through)), placeOf.get(key(into))];
          const patch = a && b ? contact(a, b) : undefined;
          if (patch) patches.push(patch);
        }
      }
      const glued = joint.method !== 'screws';
      if (glued) glue.push(...patches);
      if (joint.method === 'pocketScrews' || joint.method === 'screws') {
        const points = patches.flatMap((patch) => screwsAlong(patch, screwRule));
        screws.push(...points);
        if (joint.fastener && points.length > 0) fasteners.set(joint.fastener, (fasteners.get(joint.fastener) ?? 0) + points.length * repeat);
      }
      if (joint.method === 'pocketScrews') ['pocketHoleJig', 'drill', 'clamps', 'glue'].forEach((t) => tools.add(t));
      if (joint.method === 'glueAndNails') ['glue', nailer].forEach((t) => tools.add(t));
      if (joint.method === 'glue') ['glue', 'clamps'].forEach((t) => tools.add(t));
      if (joint.method === 'screws') tools.add('drill');
    }
    for (const [supplyId, quantity] of fasteners) supplyCounts.set(supplyId, (supplyCounts.get(supplyId) ?? 0) + quantity);

    steps.push({
      id: spec.id,
      number: steps.length + 1,
      chapter: spec.chapter,
      scene: spec.scene,
      view: spec.view ?? 'front',
      templateId: spec.templateId,
      values: { make: repeat, ...spec.values },
      pieces: spec.pieces,
      partIds: [...new Set([...spec.pieces, ...(spec.also ?? [])].map((ref) => ref.partId))],
      earlierPieces,
      repeat,
      joints,
      glue,
      screws,
      fasteners: [...fasteners].map(([supplyId, quantity]): StepFastener => ({ supplyId, quantity })),
      hardware: spec.hardware ?? [],
      tools: [...tools],
    });
  };

  // --- A1: the platform, built on its own ---------------------------------
  const lastSupport = crossSupports.length;
  const endSupports = crossSupports.filter((s) => s.copy === 1 || s.copy === lastSupport);
  const middleSupports = crossSupports.filter((s) => s.copy !== 1 && s.copy !== lastSupport);
  add({
    id: 'platformEnds',
    chapter: 'platform',
    scene: 'bench',
    bench: 'platform',
    templateId: 'platformEnds',
    pieces: [...still(platformRails), ...from(endSupports, 'above')],
    joints: [{ method: 'screws', through: platformRails, into: endSupports, fastener: 'construction-screws' }],
    tools: ['measuring'],
  });
  add({
    id: 'platformMiddle',
    chapter: 'platform',
    scene: 'bench',
    bench: 'platform',
    templateId: 'platformMiddle',
    values: { spacing: facts.supportSpacing, supports: middleSupports.length },
    pieces: from(middleSupports, 'above'),
    joints: [{ method: 'screws', through: platformRails, into: middleSupports, fastener: 'construction-screws' }],
    tools: ['measuring'],
  });

  // --- A2: the box ---------------------------------------------------------
  // Pocket holes go in the underside of the bottom, never in a side that will be seen (J2).
  add({
    id: 'boxLeft',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'boxLeft',
    pieces: [...still(bottom), ...from(leftSide, 'left')],
    values: { hangs: hangs ? 1 : 0 },
    joints: [{ method: 'pocketScrews', face: bottomFace, through: bottom, into: leftSide, fastener: pocketScrew(bottom) }],
  });
  add({
    id: 'boxRight',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'boxRight',
    pieces: from(rightSide, 'right'),
    values: { hangs: hangs ? 1 : 0 },
    joints: [{ method: 'pocketScrews', face: bottomFace, through: bottom, into: rightSide, fastener: pocketScrew(bottom) }],
  });
  add({
    id: 'topPanel',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'topPanel',
    pieces: from(topPanel, 'above'),
    joints: [{ method: 'pocketScrews', face: 'top face', through: topPanel, into: [...leftSide, ...rightSide], fastener: pocketScrew(topPanel) }],
  });
  // Pocket holes on the drawer side of each divider, where drawers hide them (J3).
  add({
    id: 'dividers',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'dividers',
    values: { dividers: dividers.length },
    pieces: from(dividers, 'above'),
    joints: [{ method: 'pocketScrews', face: 'drawer side', through: dividers, into: bottom, fastener: pocketScrew(dividers) }],
  });
  const uprightPanels = [...leftSide, ...rightSide, ...dividers];
  add({
    id: 'topSupports',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'topSupports',
    pieces: from(topSupports, 'above'),
    joints: [{ method: 'pocketScrews', face: 'top face', through: topSupports, into: uprightPanels, fastener: pocketScrew(topSupports) }],
  });
  add({
    id: 'mountingStrips',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'mountingStrips',
    pieces: from(mountingStrips, 'above'),
    joints: [{ method: 'pocketScrews', face: 'back face', through: mountingStrips, into: uprightPanels, fastener: pocketScrew(mountingStrips) }],
  });
  // K5: shelves go in from the front, before the back closes the box.
  add({
    id: 'shelves',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'shelves',
    values: { shelves: shelves.length },
    pieces: from(shelves, 'front'),
    joints: [{ method: 'pocketScrews', face: 'underside', through: shelves, into: uprightPanels, fastener: pocketScrew(shelves) }],
    tools: ['measuring'],
  });
  add({
    id: 'back',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'back',
    pieces: from(back, 'back'),
    joints: [{ method: 'glueAndNails', through: back, into: [...bottom, ...topPanel, ...dividers, ...mountingStrips] }],
    tools: ['measuring'],
  });

  // --- A3: the face frame, built flat, then fixed to the box ---------------
  add({
    id: 'frameOuter',
    chapter: 'faceFrame',
    scene: 'bench',
    bench: 'frame',
    view: 'back',
    templateId: 'frameOuter',
    pieces: [...still(frameEnds), ...from(frameRails, 'front')],
    joints: [{ method: 'pocketScrews', face: 'back face', through: frameRails, into: frameEnds, fastener: pocketScrew(frameRails) }],
  });
  add({
    id: 'frameInner',
    chapter: 'faceFrame',
    scene: 'bench',
    bench: 'frame',
    view: 'back',
    templateId: 'frameInner',
    pieces: from(frameInner, 'front'),
    joints: [{ method: 'pocketScrews', face: 'back face', through: frameInner, into: frameRails, fastener: pocketScrew(frameInner) }],
  });
  add({
    id: 'frameDrawerRails',
    chapter: 'faceFrame',
    scene: 'bench',
    bench: 'frame',
    view: 'back',
    templateId: 'frameDrawerRails',
    pieces: from(drawerRails, 'front'),
    joints: [{ method: 'pocketScrews', face: 'back face', through: drawerRails, into: [...frameEnds, ...frameInner], fastener: pocketScrew(drawerRails) }],
  });
  // J2: through the side panels from the inside face on an end that will be seen.
  const sideFace = (end: 'wall' | 'exposed'): JointFace => (end === 'exposed' ? 'inside face' : 'outside face');
  const wallEnds = [r.ends.left, r.ends.right].filter((e) => e === 'wall').length;
  add({
    id: 'frameOn',
    chapter: 'faceFrame',
    scene: 'cabinet',
    templateId: 'frameOn',
    values: { overhang: wallEnds > 0 ? facts.wallOverhang : (0 as Ticks), wallEnds },
    pieces: from(frame, 'front'),
    joints: [
      { method: 'pocketScrews', face: sideFace(r.ends.left), through: leftSide, into: frameEnds, fastener: pocketScrew(leftSide) },
      { method: 'pocketScrews', face: sideFace(r.ends.right), through: rightSide, into: frameEnds, fastener: pocketScrew(rightSide) },
      { method: 'glue', through: frame, into: [...bottom, ...topPanel, ...dividers, ...topSupports] },
    ],
  });

  // --- A4: slide spacers ---------------------------------------------------
  add({
    id: 'spacers',
    chapter: 'box',
    scene: 'cabinet',
    templateId: 'spacers',
    values: { spacers: spacers.length },
    pieces: fromInside(spacers),
    joints: [{ method: 'screws', through: spacers, into: [...leftSide, ...rightSide, ...dividers, ...spacers], fastener: 'short-screws' }],
    tools: ['glue'],
  });

  // --- A5, A6: drawer boxes and fronts, one of each size, then "make N" ----
  /** Openings whose parts are the same sizes are built the same way. */
  const sizesOf = (ids: readonly PartId[]) => ids.map((id) => partOf.get(id)!).map((p) => `${p.length}x${p.width}x${p.quantity}`).join('|');
  const group = (openings: readonly Opening[], idsOf: (o: Opening) => PartId[]): { first: PartId[]; others: PartId[][] }[] => {
    const groups = new Map<string, PartId[][]>();
    for (const opening of openings) {
      const ids = idsOf(opening);
      if (ids.length === 0) continue;
      groups.set(sizesOf(ids), [...(groups.get(sizesOf(ids)) ?? []), ids]);
    }
    return [...groups.values()].map(([first, ...others]) => ({ first: first!, others }));
  };
  const isBoxPart = (id: PartId) => partOf.get(id)!.colorRole === 'drawerBox';
  const refsOf = (ids: readonly PartId[]) => all((p) => ids.includes(p.id));

  group(built.openings, (o) => o.partIds.filter(isBoxPart)).forEach(({ first, others }, g) => {
    const sides = ofParts(first, ': box side');
    const ends = ofParts(first, ': box front and back');
    const base = ofParts(first, ': box bottom');
    const otherIds = others.flat();
    const alsoWalls = [...ofParts(otherIds, ': box side'), ...ofParts(otherIds, ': box front and back')];
    const alsoBases = ofParts(otherIds, ': box bottom');
    const height = partOf.get(sides[0]!.partId)!.width;
    add({
      id: `drawerBox${g + 1}`,
      chapter: 'drawerBoxes',
      scene: 'bench',
      bench: `drawerBox${g + 1}`,
      templateId: 'drawerBoxSides',
      values: { height },
      pieces: [...still(sides), ...from(ends, 'above')],
      also: alsoWalls,
      repeat: others.length + 1,
      // Holes on the outside of the front and back pieces: the drawer front covers one, the other faces the wall.
      joints: [{ method: 'pocketScrews', face: 'outside face', through: ends, into: sides, fastener: pocketScrew(ends) }],
    });
    add({
      id: `drawerBottom${g + 1}`,
      chapter: 'drawerBoxes',
      scene: 'bench',
      bench: `drawerBox${g + 1}`,
      templateId: 'drawerBoxBottom',
      pieces: from(base, 'below'),
      also: alsoBases,
      repeat: others.length + 1,
      joints: [{ method: 'glueAndNails', through: base, into: [...sides, ...ends] }],
      tools: ['measuring'],
    });
  });

  const isFramedFrontPart = (id: PartId) => ['door', 'drawerFront'].includes(partOf.get(id)!.colorRole);
  const framed = built.openings.filter((o) => o.style === 'shaker');
  group(framed, (o) => o.partIds.filter(isFramedFrontPart)).forEach(({ first, others }, g) => {
    const uprights = ofParts(first, ' upright');
    const cross = ofParts(first, ' cross piece');
    const panel = ofParts(first, ' centre panel');
    const frameParts = [...uprights, ...cross];
    const also = others.flatMap(refsOf);
    const repeat = others.length + 1;
    const isDoor = partOf.get(first[0]!)!.colorRole === 'door' ? 1 : 0;
    // Pocket holes, the recess and the panel are all on the back, so these are shown from behind.
    const base = { chapter: 'fronts' as const, scene: 'bench' as const, bench: `front${g + 1}`, view: 'back' as const, also, repeat };
    const values = { isDoor, groove: facts.grooveDepth, recess: facts.recessWidth, panelThickness: facts.panelThickness, panelGap: facts.panelGap, hingeSpace: facts.hingeMountingWidth };
    const pocket: JointSpec = { method: 'pocketScrews', face: 'back face', through: cross, into: uprights, fastener: pocketScrew(cross) };

    if (methods.panel === 'stoppedGroove' || methods.panel === 'sawnGroove') {
      // The groove is cut first, and the panel goes in as the frame is assembled.
      add({ ...base, id: `frontGroove${g + 1}`, templateId: methods.panel === 'stoppedGroove' ? 'frontGrooveRouter' : 'frontGrooveSaw', values, pieces: still(frameParts), tools: [methods.panel === 'stoppedGroove' ? 'router' : 'tableSaw'] });
      add({ ...base, id: `frontFrame${g + 1}`, templateId: 'frontFrameWithPanel', values, pieces: [...still(uprights), ...from(panel, 'front'), ...from(cross, 'front')], joints: [pocket] });
      return;
    }
    add({ ...base, id: `frontFrame${g + 1}`, templateId: 'frontFrame', values, pieces: [...still(uprights), ...from(cross, 'front')], joints: [pocket], tools: ['measuring'] });
    if (methods.panel === 'routedRecess') {
      add({ ...base, id: `frontRecess${g + 1}`, templateId: 'frontRecess', values, pieces: still(frameParts), tools: ['router'] });
      add({ ...base, id: `frontPanel${g + 1}`, templateId: 'frontPanelRecess', values, pieces: from(panel, 'back'), joints: [{ method: 'glue', through: panel, into: frameParts }] });
    } else {
      add({ ...base, id: `frontPanel${g + 1}`, templateId: 'frontPanelOnBack', values, pieces: from(panel, 'back'), joints: [{ method: 'glueAndNails', through: panel, into: frameParts }], tools: ['measuring'] });
    }
  });

  // --- A7: sanding and finishing ------------------------------------------
  const seen = [...frame, ...(r.ends.left === 'exposed' ? leftSide : []), ...(r.ends.right === 'exposed' ? rightSide : [])];
  add({ id: 'sand', chapter: 'finish', scene: 'cabinet', templateId: 'sand', pieces: still(seen), tools: [sanding] });
  add({ id: 'finish', chapter: 'finish', scene: 'cabinet', templateId: 'finish', pieces: still(seen), tools: ['brush'] });
  add({ id: 'topcoat', chapter: 'finish', scene: 'cabinet', templateId: 'topcoat', pieces: still(seen), tools: ['brush'] });

  // --- A8: putting it in place --------------------------------------------
  if (r.kind.hasPlumbing)
    add({
    id: 'plumbing',
    chapter: 'install',
    scene: 'cabinet',
    templateId: methods.cutouts === 'holeSaw' ? 'plumbingHoleSaw' : 'plumbingJigsaw',
    pieces: still(back),
    tools: ['measuring', 'drill', methods.cutouts],
  });
  add({
    id: 'setPlatform',
    chapter: 'install',
    scene: 'cabinet',
    templateId: 'setPlatform',
    values: { height: facts.platformHeight },
    pieces: still([...platformRails, ...crossSupports]),
    tools: ['measuring', 'drill'],
  });
  // K7: a wall cabinet rests on a temporary ledge while it is screwed to the wall.
  if (hangs) add({ id: 'ledger', chapter: 'install', scene: 'cabinet', templateId: 'ledger', pieces: still(mountingStrips), tools: ['measuring', 'drill'] });
  add({ id: 'setBox', chapter: 'install', scene: 'cabinet', templateId: hangs ? 'hangCabinet' : 'setBox', pieces: still(box), tools: ['measuring'] });
  add({
    id: 'wallScrews',
    chapter: 'install',
    scene: 'cabinet',
    templateId: 'wallScrews',
    pieces: still(mountingStrips),
    joints: [{ method: 'screws', through: mountingStrips, into: [] }],
    tools: ['measuring'],
  });
  // On an end that can be seen, the return goes on first and the front piece covers its end.
  add({
    id: 'toeKickReturn',
    chapter: 'install',
    scene: 'cabinet',
    templateId: 'toeKickReturn',
    pieces: toeKickReturns.map((ref) => ({ ...ref, from: placeOf.get(key(ref))!.x * 2 < built.overall.frameWidth ? ('left' as const) : ('right' as const) })),
    joints: [{ method: 'glueAndNails', through: toeKickReturns, into: [...platformRails, ...crossSupports] }],
  });
  add({
    id: 'toeKick',
    chapter: 'install',
    scene: 'cabinet',
    templateId: 'toeKick',
    values: { toeSpace: facts.toeSpace },
    pieces: from(toeKickFront, 'front'),
    joints: [{ method: 'glueAndNails', through: toeKickFront, into: [...platformRails, ...toeKickReturns] }],
  });

  // --- A9: drawers and doors ----------------------------------------------
  const slides = built.hardware.filter((h) => h.hardwareId === r.slide.id).map((h): StepHardware => ({ hardwareId: h.hardwareId, quantity: h.quantity, unit: h.unit }));
  const hinges = built.hardware.filter((h) => h.hardwareId === r.hinge.id).map((h): StepHardware => ({ hardwareId: h.hardwareId, quantity: h.quantity, unit: h.unit }));
  const drawerCount = built.openings.filter((o) => o.kind === 'drawer').length;
  if (drawerBoxes.length > 0 && facts.slideLength !== undefined) {
    const slideValues = { slideLength: facts.slideLength, lift: facts.drawerLift, setback: facts.boxSetback, drawers: drawerCount, overlay: facts.overlay };
    add({ id: 'slidesCabinet', chapter: 'drawers', scene: 'cabinet', templateId: 'slidesCabinet', values: slideValues, pieces: still([...dividers, ...spacers]), hardware: slides, tools: ['measuring', 'drill'] });
    add({ id: 'slidesDrawers', chapter: 'drawers', scene: 'cabinet', templateId: 'slidesDrawers', values: slideValues, pieces: from(drawerBoxes, 'front'), tools: ['measuring', 'drill'] });
    add({
      id: 'drawerFronts',
      chapter: 'drawers',
      scene: 'cabinet',
      templateId: 'drawerFronts',
      values: slideValues,
      pieces: from(drawerFronts, 'front'),
      joints: [{ method: 'screws', through: all((p) => p.name.endsWith(': box front and back')), into: drawerFronts, fastener: 'short-screws' }],
      tools: ['measuring', 'clamps'],
    });
  }
  // K6: fixed panels are screwed on from behind, through the frame.
  add({
    id: 'fixedPanels',
    chapter: 'drawers',
    scene: 'cabinet',
    templateId: 'fixedPanels',
    values: { panels: fixedPanels.length, overlay: facts.overlay },
    pieces: from(fixedPanels, 'front'),
    joints: [{ method: 'screws', through: frame, into: fixedPanels, fastener: 'short-screws' }],
    tools: ['measuring', 'clamps'],
  });
  const doorCount = built.openings.filter((o) => o.kind === 'door').length;
  if (doors.length > 0) {
    const doorValues = { overlay: facts.overlay, doors: doorCount, hingeInset: facts.hingeInset };
    add({ id: 'hinges', chapter: 'doors', scene: 'bench', bench: 'doors', view: 'back', templateId: 'hinges', values: doorValues, pieces: still(doors), hardware: hinges, tools: ['measuring', 'drill', 'hingeBit'] });
    add({ id: 'hangDoors', chapter: 'doors', scene: 'cabinet', templateId: 'hangDoors', values: doorValues, pieces: from(doors, 'front'), tools: ['drill'] });
  }
  add({ id: 'handles', chapter: 'doors', scene: 'cabinet', templateId: 'handles', pieces: still([...doors, ...drawerFronts]), tools: ['measuring', 'drill'] });

  const supplies: SupplyLine[] = catalog.supplies.map((supply) => {
    const quantity = supplyCounts.get(supply.id);
    return quantity === undefined ? supply : { ...supply, quantity };
  });

  return { steps, supplies };
}
