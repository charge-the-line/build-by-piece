/**
 * Plain words first; the trade term is there for when she hears it in a
 * shop or a video. Written by hand, no sizes.
 */
export interface GlossaryEntry {
  readonly plain: string;
  readonly term: string;
  readonly meaning: string;
}

export const glossary: readonly GlossaryEntry[] = [
  { plain: 'Vertical frame piece', term: 'stile', meaning: 'An upright piece of a frame. The face frame has them, and so does each framed door.' },
  { plain: 'Horizontal frame piece', term: 'rail', meaning: 'A level piece of a frame, running side to side between the uprights.' },
  { plain: 'Piece between drawers', term: 'drawer rail', meaning: 'A level piece of the face frame that separates one drawer opening from the next.' },
  { plain: 'Face frame', term: 'face frame', meaning: 'The solid wood frame glued to the front of the plywood box. Doors and drawers close against it.' },
  { plain: 'Box', term: 'carcass or case', meaning: 'The plywood cabinet itself, before the frame, doors, platform and top are added.' },
  { plain: 'Framed front', term: 'shaker', meaning: 'A door or drawer front made of a frame around a thin, flat centre panel.' },
  { plain: 'Flat front', term: 'slab', meaning: 'A door or drawer front made from a single flat board.' },
  { plain: 'Overlay', term: 'overlay', meaning: 'How far a door or drawer front laps over the frame around its opening.' },
  { plain: 'Pocket hole', term: 'pocket hole', meaning: 'An angled hole drilled with a jig, so a screw can pull two pieces together from a face nobody will see.' },
  { plain: 'Grain', term: 'grain', meaning: 'The direction the lines in the wood run. On plywood it runs along the length of the sheet.' },
  { plain: 'Saw blade width', term: 'kerf', meaning: 'The sliver of wood the blade turns to dust with every cut. The cutting diagrams allow for it.' },
  { plain: 'Lengthwise cut', term: 'rip cut', meaning: 'A cut along the length of a board to make it narrower. This plan avoids them in solid wood.' },
  { plain: 'Platform', term: 'toe-kick base', meaning: 'The frame on the floor that the box sits on, set back so your toes fit under the cabinet.' },
  { plain: 'Toe kick', term: 'toe kick', meaning: 'The board that covers the front of the platform.' },
  { plain: 'Leftover', term: 'offcut', meaning: 'A piece left after cutting that is big enough to keep and use again.' },
  { plain: 'Mounting strip', term: 'nailer', meaning: 'A board across the top back of the box. Screws go through it into the wall.' },
  { plain: 'Wall framing', term: 'stud', meaning: 'An upright timber inside the wall. Screws must go into studs to hold the cabinet.' },
  { plain: 'Thin wedge', term: 'shim', meaning: 'A thin wedge pushed under something to raise one side until it is level.' },
];

/** The part list uses a few more specific terms; they share the general explanation. */
const SAME_AS: Readonly<Record<string, string>> = { 'top rail': 'rail', 'bottom rail': 'rail' };

export const lookUp = (term: string): GlossaryEntry | undefined => glossary.find((e) => e.term === (SAME_AS[term] ?? term));
