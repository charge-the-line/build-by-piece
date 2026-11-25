/**
 * The construction rules for a face-frame vanity on a 2x4 platform.
 * Each block cites its rule number in docs/RULES.md; change the document and
 * this file together.
 */
import { derive, deriveByRule, Expr, named, needsCheck, statusOf, sum, type Addend, type Val } from './derive';
import type { LaidBay, LaidOpening } from './layout';
import type { BoardValues, Resolved, SheetValues } from './resolve';
import type {
  ColorRole,
  Derivation,
  GrainDirection,
  HardwareLine,
  MaterialId,
  Measurement,
  Opening,
  OverallSizes,
  Part,
  PartId,
  SheetStock,
  Ticks,
  ValidationIssue,
} from './types';
import { asTicks, formatLength, parseLength, TICKS_PER_INCH } from './units';

/** Fixed limits stated in the rules. */
const LIMITS = {
  /** D6: a framed front must show at least this much panel. */
  minimumVisiblePanel: asTicks(TICKS_PER_INCH),
  /** P4: toe space outside this range gets a warning. */
  toeSpaceMin: asTicks(2 * TICKS_PER_INCH),
  toeSpaceMax: asTicks(4 * TICKS_PER_INCH),
  /** D7: hinges for each door. */
  hingesPerDoor: 2,
} as const;

export interface VanityBuild {
  readonly parts: readonly Part[];
  readonly openings: readonly Opening[];
  readonly hardware: readonly HardwareLine[];
  readonly issues: readonly ValidationIssue[];
  readonly overall: OverallSizes;
}

interface PartSpec {
  readonly name: string;
  readonly tradeTerm?: string;
  readonly role: ColorRole;
  readonly assembly: string;
  readonly material: SheetValues | BoardValues;
  readonly length: Derivation;
  readonly width: Derivation;
  readonly grain?: GrainDirection;
  readonly quantity?: number;
}

export function buildVanity(r: Resolved, bays: readonly LaidBay[]): VanityBuild {
  const parts: Part[] = [];
  const issues: ValidationIssue[] = [];
  const hardware: HardwareLine[] = [];
  const text = (ticks: Ticks) => formatLength(ticks, r.options.tapeIncrement).text;

  const add = (spec: PartSpec): PartId => {
    const id: PartId = `P${String(parts.length + 1).padStart(2, '0')}`;
    const thickness = derive('M1', `actual thickness of the ${spec.material.stock.name}`, spec.material.thickness);
    const derivations = [thickness, spec.length, spec.width];
    parts.push({
      id,
      name: spec.name,
      ...(spec.tradeTerm ? { tradeTerm: spec.tradeTerm } : {}),
      colorRole: spec.role,
      assembly: spec.assembly,
      materialId: spec.material.stock.id,
      thickness: thickness.result,
      length: spec.length.result,
      width: spec.width.result,
      grain: spec.grain ?? 'alongLength',
      quantity: spec.quantity ?? 1,
      derivation: { thickness, length: spec.length, width: spec.width },
      status: statusOf(derivations),
      needsCheck: needsCheck(derivations),
    });
    return id;
  };

  const error = (code: string, ruleId: string, explanation: string, suggestedFix: string, inputPaths: readonly string[], partIds: readonly PartId[] = []) =>
    issues.push({ code, ruleId, severity: 'error', partIds, inputPaths, explanation, suggestedFix });
  const warning = (code: string, ruleId: string, explanation: string, suggestedFix: string, inputPaths: readonly string[], partIds: readonly PartId[] = []) =>
    issues.push({ code, ruleId, severity: 'warning', partIds, inputPaths, explanation, suggestedFix });

  const { W, D, H, S, RT, RB, RD, V, FW } = r;
  const t = r.caseSheet.thickness;
  const tb = r.backSheet.thickness;
  const tf = r.frameBoard.thickness;
  const ts = r.supportBoard.thickness;
  const leftOverhang: Val | undefined = r.ends.left === 'wall' ? r.wallOverhang : undefined;
  const rightOverhang: Val | undefined = r.ends.right === 'wall' ? r.wallOverhang : undefined;
  const exposedEnds = [r.ends.left, r.ends.right].filter((end) => end === 'exposed').length;
  const less = (val: Val | undefined): Addend[] => (val ? [[-1, val]] : []);

  // --- B1: box size --------------------------------------------------------
  const boxWidth = derive('B1', 'cabinet width minus the frame overhang on each wall end', sum(W, ...less(leftOverhang), ...less(rightOverhang)));
  const WB = named('box width', boxWidth);
  const boxDepth = derive('B1', 'cabinet depth minus face frame thickness', sum(D, [-1, tf]));
  const DB = named('box depth', boxDepth);

  // --- B2: sides -----------------------------------------------------------
  const sideLength = derive('B2', 'box height', H);
  const sideWidth = derive('B2', 'box depth', DB);
  const leftSide = add({ name: 'Left side', role: 'leftSide', assembly: 'Box', material: r.caseSheet, length: sideLength, width: sideWidth });
  const rightSide = add({ name: 'Right side', role: 'rightSide', assembly: 'Box', material: r.caseSheet, length: sideLength, width: sideWidth });

  if (t.value > S.value - (leftOverhang?.value ?? 0) || t.value > S.value - (rightOverhang?.value ?? 0)) {
    error(
      'SIDE_SHOWS_IN_OPENING',
      'B5',
      `The box plywood (${text(t.value)}) is thicker than the frame piece that covers its edge (${text(S.value)}), so it would show in the opening.`,
      'Use a wider vertical frame piece or thinner plywood.',
      ['faceFrame.stileWidth', `measuredThickness.${r.caseSheet.stock.id}`],
      [leftSide, rightSide],
    );
  }

  // --- B3: bottom, B4: back -----------------------------------------------
  const betweenSides = sum(WB, [-2, t]);
  const innerDepth = sum(DB, [-1, tb]);
  add({
    name: 'Bottom',
    role: 'bottom',
    assembly: 'Box',
    material: r.caseSheet,
    length: derive('B3', 'box width minus 2 x side panel thickness', betweenSides),
    width: derive('B3', 'box depth minus back panel thickness', innerDepth),
  });
  add({
    name: 'Back',
    role: 'back',
    assembly: 'Box',
    material: r.backSheet,
    length: derive('B4', 'box width minus 2 x side panel thickness', betweenSides),
    width: derive('B4', 'box height', H),
  });

  // --- B5: dividers --------------------------------------------------------
  // One at each bay boundary that touches a drawer column, flush with the
  // opening edge on the drawer side (the left drawer column wins a tie).
  interface Divider {
    readonly left: Expr;
    readonly flushToLeftBay: boolean;
  }
  const dividers = new Map<number, Divider>();
  bays.forEach((laid, i) => {
    const next = bays[i + 1];
    if (!next) return;
    if (laid.bay.kind !== 'drawerColumn' && next.bay.kind !== 'drawerColumn') return;
    const frameLeft = sum(laid.left, laid.width);
    const flushToLeftBay = laid.bay.kind === 'drawerColumn';
    dividers.set(i, { left: flushToLeftBay ? frameLeft : sum(frameLeft, S, [-1, t]), flushToLeftBay });
  });
  if (dividers.size > 0) {
    add({
      name: 'Interior divider',
      role: 'divider',
      assembly: 'Box',
      material: r.caseSheet,
      length: derive('B5', 'box height minus bottom panel thickness', sum(H, [-1, t])),
      width: derive('B5', 'box depth minus back panel thickness', innerDepth),
      quantity: dividers.size,
    });
  }

  // --- B6, B7: one top front support and one mounting strip per section ---
  const panelEdges: { right: Expr; nextLeft: Expr }[] = [];
  let previousRight = sum(...(leftOverhang ? [leftOverhang] : []), t);
  for (const divider of [...dividers.values()]) {
    panelEdges.push({ right: previousRight, nextLeft: divider.left });
    previousRight = sum(divider.left, t);
  }
  panelEdges.push({ right: previousRight, nextLeft: sum(W, ...less(rightOverhang), [-1, t]) });

  const asSold = derive('M5', 'width of the board as sold', r.supportBoard.width);
  panelEdges.forEach((edge, i) => {
    const which = panelEdges.length === 1 ? '' : ` (section ${i + 1} of ${panelEdges.length})`;
    const clear = sum(edge.nextLeft, [-1, edge.right]);
    add({ name: `Top front support${which}`, role: 'support', assembly: 'Box', material: r.supportBoard, length: derive('B6', 'clear width of this section of the box', clear), width: asSold });
  });
  panelEdges.forEach((edge, i) => {
    const which = panelEdges.length === 1 ? '' : ` (section ${i + 1} of ${panelEdges.length})`;
    const clear = sum(edge.nextLeft, [-1, edge.right]);
    add({ name: `Mounting strip${which}`, role: 'support', assembly: 'Box', material: r.supportBoard, length: derive('B7', 'clear width of this section of the box', clear), width: asSold });
  });

  // --- F: face frame -------------------------------------------------------
  add({
    name: 'Vertical frame piece (end)',
    tradeTerm: 'stile',
    role: 'faceFrame',
    assembly: 'Face frame',
    material: r.frameBoard,
    length: derive('F2', 'box height', H),
    width: derive('F2', 'vertical frame piece width', S),
    quantity: 2,
  });
  const railLength = derive('F3', 'cabinet width minus 2 x vertical frame piece width', sum(W, [-2, S]));
  add({ name: 'Top frame piece', tradeTerm: 'top rail', role: 'faceFrame', assembly: 'Face frame', material: r.frameBoard, length: railLength, width: derive('F3', 'top frame piece width', RT) });
  add({ name: 'Bottom frame piece', tradeTerm: 'bottom rail', role: 'faceFrame', assembly: 'Face frame', material: r.frameBoard, length: railLength, width: derive('F3', 'bottom frame piece width', RB) });
  if (bays.length > 1) {
    add({
      name: 'Vertical frame piece (inner)',
      tradeTerm: 'stile',
      role: 'faceFrame',
      assembly: 'Face frame',
      material: r.frameBoard,
      length: derive('F4', 'box height minus top and bottom frame piece widths', sum(H, [-1, RT], [-1, RB])),
      width: derive('F4', 'vertical frame piece width', S),
      quantity: bays.length - 1,
    });
  }
  for (const laid of bays) {
    if (laid.bay.kind !== 'drawerColumn' || laid.openings.length < 2) continue;
    add({
      name: `Piece between drawers (${laid.bay.label.toLowerCase()})`,
      tradeTerm: 'drawer rail',
      role: 'faceFrame',
      assembly: 'Face frame',
      material: r.frameBoard,
      length: derive('F5', "this column's opening width", laid.width),
      width: derive('F5', 'width of the piece between drawers', RD),
      quantity: laid.openings.length - 1,
    });
  }

  // --- D3: fronts must not touch or run past the cabinet -------------------
  const gapCheck = (member: Val, path: string, between: string) => {
    const gap = member.value - 2 * V.value;
    if (gap < r.minimumGap.value) {
      error(
        'FRONTS_TOO_CLOSE',
        'D3',
        `Two fronts share the ${between} (${text(member.value)} wide). With a ${text(V.value)} overlay on each, the gap between them would be ${text(asTicks(gap))}; it must be at least ${text(r.minimumGap.value)}.`,
        'Use a smaller overlay or a wider frame piece.',
        ['fronts.overlay', path],
      );
    }
  };
  if (bays.length > 1) gapCheck(S, 'faceFrame.stileWidth', 'vertical frame piece');
  if (bays.some((b) => b.openings.length > 1)) gapCheck(RD, 'faceFrame.drawerRailWidth', 'piece between drawers');
  for (const [edge, path] of [[S, 'faceFrame.stileWidth'], [RT, 'faceFrame.topRailWidth'], [RB, 'faceFrame.bottomRailWidth']] as const) {
    if (V.value > edge.value) {
      error('FRONT_PAST_FRAME', 'D1', `The overlay (${text(V.value)}) is more than the ${edge.label} (${text(edge.value)}), so fronts would stick out past the cabinet.`, 'Use a smaller overlay.', ['fronts.overlay', path]);
    }
  }

  // --- X1: slide length ----------------------------------------------------
  const allOpenings = bays.flatMap((b) => b.openings);
  const drawerOpenings = allOpenings.filter((o) => o.kind === 'drawer');
  let slideLength: Val | undefined;
  if (drawerOpenings.length > 0) {
    const room = sum(D, [-1, tb], [-1, ts], [-1, r.rearClearance]);
    const fits = r.slideLengths.filter((l) => l.value <= room.value);
    const chosen = fits.reduce<Val | undefined>((best, l) => (!best || l.value > best.value ? l : best), undefined);
    if (!chosen) {
      error(
        'NO_SLIDE_FITS',
        'X1',
        `There is ${text(room.value)} of room for a drawer slide, and the shortest slide sold is ${text(Math.min(...r.slideLengths.map((l) => l.value)) as Ticks)}.`,
        'Make the cabinet deeper, or use doors instead of drawers.',
        ['depth'],
      );
    } else {
      const derivation = deriveByRule(
        'X1',
        `the longest slide sold that fits in ${text(room.value)}: cabinet depth minus the back, the mounting strip and the room behind the slide`,
        [D, tb, ts, r.rearClearance, chosen],
        chosen.value,
      );
      slideLength = named('slide length', derivation);
      hardware.push({
        hardwareId: r.slide.id,
        name: r.slide.name,
        quantity: drawerOpenings.length,
        unit: 'pair',
        length: derivation,
        status: 'assumed',
      });
    }
  }

  // --- B8: slide spacers ---------------------------------------------------
  /** Spacer shortfall on each side of each drawer column, for rule X3. */
  const shortfalls = new Map<string, { left?: Val; right?: Val }>();
  const spacerFor = (laid: LaidBay, side: 'left' | 'right', where: string, needed: Expr) => {
    const bayLabel = laid.bay.label;
    if (needed.value < 0) return; // already reported as SIDE_SHOWS_IN_OPENING
    let remaining: number = needed.value;
    const layers = r.spacerSheets.map((sheet) => {
      const count = Math.floor(remaining / sheet.thickness.value);
      remaining -= count * sheet.thickness.value;
      return { sheet, count };
    });
    if (remaining > r.spacerTolerance.value) {
      error(
        'SPACER_TOO_THIN',
        'B8',
        `${bayLabel}, ${where}: the slide needs a spacer ${text(needed.value)} thick, but the plywood on hand can only build it ${text(asTicks(remaining))} short. The most allowed is ${text(r.spacerTolerance.value)}.`,
        'Change the frame overhang or the vertical frame piece width so the spacer matches the plywood.',
        ['ends.wallOverhang', 'faceFrame.stileWidth'],
      );
      return;
    }
    if (remaining > 0) {
      const used = layers.filter((l) => l.count > 0).map((l) => l.sheet.thickness);
      const val = named(
        `${where} spacer shortfall`,
        deriveByRule('B8', 'spacer thickness needed minus the plywood layers that fit', [...needed.terms.map(([, v]) => v), ...used], asTicks(remaining)),
      );
      shortfalls.set(laid.bay.id, { ...shortfalls.get(laid.bay.id), [side]: val });
    }
    if (!slideLength) return;
    for (const { sheet, count } of layers) {
      if (count === 0) continue;
      add({
        name: `Slide spacer (${bayLabel.toLowerCase()}, ${where})`,
        role: 'support',
        assembly: bayLabel,
        material: sheet,
        length: derive('B8', 'slide length', slideLength),
        width: derive('B8', 'slide spacer width', r.spacerWidth),
        quantity: count * laid.openings.length,
      });
    }
  };
  bays.forEach((laid, i) => {
    if (laid.bay.kind !== 'drawerColumn') return;
    // Left side of this column.
    if (i === 0) {
      spacerFor(laid, 'left', r.ends.left === 'wall' ? 'wall side' : 'left side', sum(S, [-1, t], ...less(leftOverhang)));
    } else if (dividers.get(i - 1)?.flushToLeftBay) {
      spacerFor(laid, 'left', 'divider side', sum(S, [-1, t]));
    }
    // Right side: a divider is always flush to the drawer column on its left.
    if (i === bays.length - 1) {
      spacerFor(laid, 'right', r.ends.right === 'wall' ? 'wall side' : 'right side', sum(S, [-1, t], ...less(rightOverhang)));
    }
  });

  // --- D: doors and drawer fronts, X: drawer boxes -------------------------
  const openings: Opening[] = [];
  let doorCount = 0;

  const front = (o: LaidOpening): PartId[] => {
    const isDoor = o.kind === 'door';
    const role: ColorRole = isDoor ? 'door' : 'drawerFront';
    const what = isDoor ? 'door' : 'drawer front';
    const frontWidth = sum(o.width, [2, V]);
    const frontHeight = sum(o.height, [2, V]);
    const widthD = derive('D1', 'opening width plus 2 x overlay', frontWidth);
    const heightD = derive('D1', 'opening height plus 2 x overlay', frontHeight);

    if (o.style === 'slab') {
      return [add({ name: `${o.label}: ${what}`, role, assembly: o.label, material: r.slabBoard, length: widthD, width: heightD })];
    }

    const least = 2 * FW.value + LIMITS.minimumVisiblePanel;
    if (frontWidth.value <= least || frontHeight.value <= least) {
      error(
        'FRAMED_FRONT_TOO_SMALL',
        'D6',
        `${o.label}: a framed front ${text(frontWidth.value)} by ${text(frontHeight.value)} is too small for ${text(FW.value)} frame pieces; there would be no panel to see.`,
        'Make this a flat (slab) front, or use narrower frame pieces.',
        ['fronts.shakerFrameWidth'],
      );
    }
    const frameWidthD = derive('D4', `${what} frame width`, FW);
    const panelWidth = derive('D5', 'front width minus 2 x frame width, plus 2 x groove depth, minus panel clearance', sum(frontWidth, [-2, FW], [2, r.grooveDepth], [-1, r.panelClearance]));
    const panelHeight = derive('D5', 'front height minus 2 x frame width, plus 2 x groove depth, minus panel clearance', sum(frontHeight, [-2, FW], [2, r.grooveDepth], [-1, r.panelClearance]));
    return [
      add({ name: `${o.label}: ${what} upright`, tradeTerm: 'stile', role, assembly: o.label, material: r.shakerBoard, length: derive('D4', 'front height: opening height plus 2 x overlay', frontHeight), width: frameWidthD, quantity: 2 }),
      add({ name: `${o.label}: ${what} cross piece`, tradeTerm: 'rail', role, assembly: o.label, material: r.shakerBoard, length: derive('D4', 'front width minus 2 x frame width', sum(frontWidth, [-2, FW])), width: frameWidthD, quantity: 2 }),
      // Grain runs up and down on a door, side to side on a drawer front.
      isDoor
        ? add({ name: `${o.label}: ${what} centre panel`, role, assembly: o.label, material: r.panelSheet, length: panelHeight, width: panelWidth })
        : add({ name: `${o.label}: ${what} centre panel`, role, assembly: o.label, material: r.panelSheet, length: panelWidth, width: panelHeight }),
    ];
  };

  const drawerBox = (o: LaidOpening): PartId[] => {
    if (!slideLength) return [];
    const short = shortfalls.get(o.bayId) ?? {};
    const td = r.drawerSheet.thickness;
    const tbottom = r.drawerBottomSheet.thickness;
    const boxWidth = sum(o.width, ...(short.left ? [short.left] : []), ...(short.right ? [short.right] : []), [-2, r.slideClearance]);
    const wallHeight = sum(o.height, [-1, r.heightClearance], [-1, tbottom]);
    const endLength = sum(boxWidth, [-2, td]);
    if (wallHeight.value <= 0 || endLength.value <= 0) {
      error(
        'DRAWER_TOO_SMALL',
        'X2',
        `${o.label}: the opening (${text(o.width.value)} by ${text(o.height.value)}) is too small to fit a drawer box.`,
        'Make the opening larger, or use fewer drawers in this column.',
        [`layout.${o.bayId}.${o.id}.height`, `layout.${o.bayId}.width`],
      );
      return [];
    }
    const wall = derive('X5', 'opening height minus drawer height clearance, minus drawer bottom thickness', wallHeight);
    const depth = derive('X4', 'slide length', slideLength);
    return [
      add({ name: `${o.label}: box side`, role: 'drawerBox', assembly: o.label, material: r.drawerSheet, length: depth, width: wall, quantity: 2 }),
      add({ name: `${o.label}: box front and back`, role: 'drawerBox', assembly: o.label, material: r.drawerSheet, length: derive('X5', 'opening width minus 2 x slide clearance, minus 2 x drawer side thickness', endLength), width: wall, quantity: 2 }),
      add({ name: `${o.label}: box bottom`, role: 'drawerBox', assembly: o.label, material: r.drawerBottomSheet, length: depth, width: derive('X3', 'opening width minus 2 x slide clearance', boxWidth) }),
    ];
  };

  for (const o of allOpenings) {
    const partIds = [...front(o), ...(o.kind === 'drawer' ? drawerBox(o) : [])];
    if (o.kind === 'door') doorCount += 1;
    openings.push({
      id: o.id,
      bayId: o.bayId,
      kind: o.kind,
      label: o.label,
      style: o.style,
      width: o.widthDerivation,
      height: o.heightDerivation,
      left: o.left.value,
      top: o.top.value,
      frontWidth: asTicks(o.width.value + 2 * V.value),
      frontHeight: asTicks(o.height.value + 2 * V.value),
      partIds,
    });
  }

  // --- D7: hinges ----------------------------------------------------------
  if (doorCount > 0) {
    if (r.hingeOverlay.value !== V.value) {
      error('HINGE_OVERLAY_MISMATCH', 'D7', `The hinges are made for a ${text(r.hingeOverlay.value)} overlay, but the doors overlay the frame by ${text(V.value)}.`, 'Change the overlay to match the hinges.', ['fronts.overlay']);
    }
    hardware.push({ hardwareId: r.hinge.id, name: r.hinge.name, quantity: doorCount * LIMITS.hingesPerDoor, unit: 'each', status: 'assumed' });
  }

  // --- P: platform and toe kick -------------------------------------------
  const Lt = r.lumber.thickness;
  const Lw = r.lumber.width;
  const tk = r.toeKickBoard.thickness;
  const TS = r.toeSpace;
  const platformHeight = derive('P1', 'width of a 2x4 standing on edge', Lw);
  const PD = named('platform depth', derive('P1', 'cabinet depth minus toe space minus toe kick thickness', sum(D, [-1, TS], [-1, tk])));
  const PW = named('platform width', derive('P1', 'box width minus toe space and toe kick thickness on each exposed end', sum(WB, [-exposedEnds, TS], [-exposedEnds, tk])));
  const crossLength = sum(PD, [-2, Lt]);

  if (crossLength.value <= 0 || PW.value <= 2 * Lt.value) {
    error('PLATFORM_TOO_SMALL', 'P1', `The platform would be ${text(PW.value)} wide and ${text(PD.value)} deep, which is too small to build from 2x4s.`, 'Make the cabinet larger or the toe space smaller.', ['width', 'depth', 'platform.toeSpace']);
  }
  if (TS.value < LIMITS.toeSpaceMin || TS.value > LIMITS.toeSpaceMax) {
    warning('TOE_SPACE_UNUSUAL', 'P4', `The toe space is ${text(TS.value)}. Between ${text(LIMITS.toeSpaceMin)} and ${text(LIMITS.toeSpaceMax)} is comfortable.`, 'Use the default toe space.', ['platform.toeSpace']);
  }

  const platformParts: PartId[] = [
    add({ name: 'Platform rail (front and back)', role: 'platform', assembly: 'Platform', material: r.lumber, length: derive('P2', 'platform width', PW), width: platformHeight, quantity: 2 }),
  ];
  // P3: one at each end, plus one every `spacing` from the left end until the last gap is no more than the spacing.
  // The last support's centre is half a 2x4 thickness in from the end; whole-number maths only.
  const innerSupports = Math.max(0, Math.ceil((2 * PW.value - Lt.value) / (2 * r.supportSpacing.value)) - 1);
  platformParts.push(
    add({
      name: 'Platform cross support',
      role: 'platform',
      assembly: 'Platform',
      material: r.lumber,
      length: derive('P3', 'platform depth minus 2 x the thickness of a 2x4', crossLength),
      width: platformHeight,
      quantity: 2 + innerSupports,
    }),
  );

  // P5: toe kick height is the platform height. An entered height is checked, never used.
  const toeKickHeight = derive('P5', 'platform height: the width of a 2x4 standing on edge', Lw);
  const toeKickParts: PartId[] = [
    add({ name: 'Toe kick (front)', role: 'platform', assembly: 'Platform', material: r.toeKickBoard, length: derive('P5', 'platform width plus toe kick thickness on each exposed end', sum(PW, [exposedEnds, tk])), width: toeKickHeight }),
  ];
  if (exposedEnds > 0) {
    toeKickParts.push(add({ name: 'Toe kick (end return)', role: 'platform', assembly: 'Platform', material: r.toeKickBoard, length: derive('P5', 'platform depth', PD), width: toeKickHeight, quantity: exposedEnds }));
  }
  const toeKick = toeKickIssue(r, [...toeKickParts, ...platformParts]);
  if (toeKick) issues.push(toeKick);

  // --- M3, M5: every part must come out of its material --------------------
  const stockById = new Map<MaterialId, SheetValues | BoardValues>();
  for (const m of [r.caseSheet, r.backSheet, r.panelSheet, r.drawerSheet, r.drawerBottomSheet, ...r.spacerSheets, r.supportBoard, r.frameBoard, r.slabBoard, r.shakerBoard, r.lumber, r.toeKickBoard]) {
    stockById.set(m.stock.id, m);
  }
  for (const part of parts) {
    if (part.length <= 0 || part.width <= 0) {
      error('PART_HAS_NO_SIZE', 'M3', `${part.id} ${part.name} works out to ${text(part.length)} by ${text(part.width)}, which cannot be cut.`, 'Make the cabinet larger.', ['width', 'depth', 'height'], [part.id]);
      continue;
    }
    const stock = stockById.get(part.materialId)!.stock;
    if (stock.kind === 'sheet') {
      const sheet = sheetSize(stock);
      const alongGrain = part.grain === 'alongWidth' ? part.width : part.length;
      const acrossGrain = part.grain === 'alongWidth' ? part.length : part.width;
      const fits = (a: number, b: number) => a <= sheet.length && b <= sheet.width;
      if (!(fits(alongGrain, acrossGrain) || (!stock.hasGrain && fits(acrossGrain, alongGrain)))) {
        error('PART_LARGER_THAN_SHEET', 'M3', `${part.id} ${part.name} is ${text(part.length)} by ${text(part.width)}, which is larger than one sheet of ${stock.name} (${text(sheet.length)} by ${text(sheet.width)}) with the grain running the right way.`, 'Make the cabinet smaller in that direction.', ['width', 'depth', 'height'], [part.id]);
      }
    } else {
      const board = stockById.get(part.materialId) as BoardValues;
      const longest = Math.max(...stock.stockLengths.map((m) => lengthOf(m)));
      if (part.width > board.width.value) {
        error('PART_WIDER_THAN_BOARD', 'M5', `${part.id} ${part.name} is ${text(part.width)} wide, but a ${stock.name} is only ${text(board.width.value)} wide.`, 'Use a narrower size, or it will need to be glued up from two boards.', [], [part.id]);
      } else if (part.width < board.width.value) {
        warning('NEEDS_LENGTHWISE_CUT', 'M5', `${part.id} ${part.name} is ${text(part.width)} wide, but a ${stock.name} is ${text(board.width.value)} wide, so it needs a lengthwise cut.`, `Use ${text(board.width.value)}, the width of the board as sold, to avoid the cut.`, [], [part.id]);
      }
      if (part.length > longest) {
        error('PART_LONGER_THAN_BOARD', 'M3', `${part.id} ${part.name} is ${text(part.length)} long, but the longest ${stock.name} sold is ${text(asTicks(longest))}.`, 'Make the cabinet smaller in that direction.', ['width', 'depth', 'height'], [part.id]);
      }
    }
  }

  const overall: OverallSizes = {
    frameWidth: W.value,
    frameHeight: H.value,
    boxWidth,
    boxDepth,
    platformHeight,
    finishedHeight: derive('H1', 'platform height plus box height plus countertop thickness', sum(Lw, H, r.countertopThickness)),
  };

  return { parts, openings, hardware, issues, overall };
}


/** P5: an entered toe kick height must equal the platform height. */
export function toeKickIssue(r: Resolved, partIds: readonly PartId[]): ValidationIssue | undefined {
  const platformHeight = r.lumber.width.value;
  if (!r.toeKickHeight || r.toeKickHeight.value === platformHeight) return undefined;
  const text = (ticks: Ticks) => formatLength(ticks, r.options.tapeIncrement).text;
  return {
    code: 'TOE_KICK_HEIGHT_MISMATCH',
    ruleId: 'P5',
    severity: 'error',
    partIds,
    inputPaths: ['platform.toeKickHeight'],
    explanation: `The toe kick is entered as ${text(r.toeKickHeight.value)} high, but the platform it covers is ${text(platformHeight)} high.`,
    suggestedFix: `Remove the entered height. The toe kick will be ${text(platformHeight)}, the same as the platform.`,
  };
}

/** Reads a catalog size. Catalog data is checked by tests, so a bad entry is a programming error. */
export function lengthOf(m: Measurement): Ticks {
  const parsed = parseLength(m.entered, m.unit);
  if (!parsed.ok) throw new Error(`Catalog size is not a length: ${m.entered}`);
  return parsed.ticks;
}

export function sheetSize(stock: SheetStock): { length: Ticks; width: Ticks } {
  return { length: lengthOf(stock.sheetLength), width: lengthOf(stock.sheetWidth) };
}
