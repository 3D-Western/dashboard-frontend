// The cards on "Preparing your print", ranked (Troy, 2026-11-10): what we found on THEIR part,
// then lessons that fit its shape and purpose, then general "how 3D printing works" facts, and
// the five plain checks only at the very start and as filler at the end. One card at a time.

import { shownSteps, type Dims } from '@/lib/preparing-steps';
import type { Purpose, StepProgress } from '@/types/pipeline';

export interface PreparingCard {
  id: string;
  /** 1 found on their part, 2 fits their part, 3 general fact, 4 plain check. */
  tier: 1 | 2 | 3 | 4;
  /** Small line above the title, so a student sees why this card is for them. */
  kicker?: string;
  title: string;
  body: string;
}

export interface CardPool {
  findings: PreparingCard[];
  part: PreparingCard[];
  general: PreparingCard[];
  plain: PreparingCard[];
}

// -- Tier 3: how FDM printing works (0.4 mm nozzle) -----------------------------------------------

const fact = (id: string, title: string, body: string): PreparingCard => ({
  id: `fact:${id}`,
  tier: 3,
  kicker: 'Good to know',
  title,
  body,
});

export const GENERAL_FACTS: readonly PreparingCard[] = [
  fact(
    'layers',
    'A print is a stack of layers',
    'Layers are usually 0.1 to 0.3 mm thick. The fine lines you can see on the side of a print are the edges of those layers.',
  ),
  fact(
    'filament',
    'It starts as a string of plastic',
    'The plastic is a thin string called filament, about 1.75 mm across. It is pushed into a hot nozzle, melted and laid down in a line.',
  ),
  fact(
    'nozzle',
    'The nozzle sets the finest detail',
    'The opening is 0.4 mm wide, so a printer cannot draw anything much thinner than that. A wall thinner than a line of plastic can simply disappear.',
  ),
  fact(
    'strength-direction',
    'Prints are weakest between layers',
    'A force that tries to pull layers apart breaks a part far more easily than one pushing along them. How a part lies on the plate decides which way it is strong.',
  ),
  fact(
    'supports',
    'Plastic cannot print in mid-air',
    'Steep overhangs get temporary supports underneath. They snap off afterwards and usually leave a rougher patch where they touched.',
  ),
  fact(
    'overhang',
    'About 45 degrees is the limit',
    'A surface that leans out less than about 45 degrees from straight up prints cleanly. Lean further and each layer has less below it to rest on.',
  ),
  fact(
    'walls',
    'Strength lives in the walls',
    'Most of a part’s strength comes from its outer walls, not the fill inside. Another wall usually helps more than a denser inside.',
  ),
  fact(
    'infill',
    'The inside is mostly air',
    'The inside of most parts is a sparse pattern, often 10 to 20 percent full. It holds the top up and saves hours of printing and plenty of plastic.',
  ),
  fact(
    'first-layer',
    'The first layer decides everything',
    'If it does not stick flat, nothing built on top can be right. That is why printers lay it down slowly and press it onto the plate.',
  ),
  fact(
    'bridging',
    'Printers can bridge short gaps',
    'Plastic can be stretched across a gap, but only a short way. Over a few centimetres it sags, so long flat ceilings often need supports.',
  ),
  fact(
    'cooling',
    'Every layer has to cool',
    'Each layer must harden before the next goes on top. Fans blow on the plastic, and very small parts can even be given short pauses between layers.',
  ),
  fact(
    'tolerance',
    'Leave a gap for parts that fit together',
    'Prints come out a little different from the drawing. For pieces that must slide together, leave a gap of about 0.2 to 0.4 mm in the design.',
  ),
  fact(
    'holes',
    'Holes print a little small',
    'Plastic bulges inward as it is laid down, so a hole often ends up smaller than drawn. A hole for a screw usually needs to be drawn slightly oversize.',
  ),
  fact(
    'warping',
    'Plastic shrinks as it cools',
    'On big flat parts the corners can curl up off the plate as the lower layers cool. Rounded corners and a wide base help hold them down.',
  ),
  fact(
    'brim',
    'A brim is a wider foot',
    'It is a flat ring of extra plastic printed around the base of a part. It keeps tall or narrow parts from tipping or lifting, and is trimmed off afterwards.',
  ),
  fact(
    'stringing',
    'Thin strings are normal',
    'When the nozzle travels without printing, a hair of plastic can ooze out. Printers pull the filament back a little before each move to stop it.',
  ),
  fact(
    'pla-heat',
    'PLA softens sooner than you think',
    'Common PLA plastic starts to soften around 60 degrees C, far below printing temperature. A PLA part left on a sunny car dashboard can bend.',
  ),
  fact(
    'bottom-face',
    'The side on the plate is the smoothest',
    'The face that rests on the plate comes out smooth and flat, while curves and slopes show tiny stair-steps from the layers. Orientation chooses which face looks best.',
  ),
  fact(
    'layer-height',
    'Thinner layers cost time',
    'Halving the layer height roughly doubles the number of layers. Curves come out smoother, but straight walls gain very little.',
  ),
  fact(
    'seam',
    'Every wall has a seam',
    'Each loop of the wall starts and ends somewhere, which leaves a faint line running up the part. It is normal, and the printer tries to tuck it into a corner.',
  ),
  fact(
    'top-layers',
    'Tops need several solid layers',
    'The flat top of a part is built from a few solid layers laid over the sparse inside. Too few and the fill pattern shows through.',
  ),
  fact(
    'elephant-foot',
    'The bottom edge can bulge a little',
    'The first layer is pressed down hard, so its edge can swell slightly, called elephant’s foot. It matters when the bottom of a part must fit into something.',
  ),
  fact(
    'time',
    'Print time follows plastic and layers',
    'How long a part takes depends on how much plastic goes down and how many layers there are. A tall thin part can take longer than a short wide one of the same volume.',
  ),
  fact(
    'threads',
    'Small printed threads are fragile',
    'Screw threads smaller than about M5 print poorly. A hole sized for a screw to cut its own thread, or a metal insert, usually grips better.',
  ),
  fact(
    'flat-bottom',
    'Printers love a flat face down',
    'A rounded bottom touches the plate along a tiny line, so the part can roll or break loose. Adding a flat face gives it something to hold onto.',
  ),
  fact(
    'fillets',
    'Round the inside corners',
    'Sharp inside corners concentrate stress. A small rounded fillet makes a part tougher exactly where it tends to crack.',
  ),
  fact(
    'moisture',
    'Filament drinks water from the air',
    'Damp plastic pops and bubbles in the nozzle and prints rough, which is why spools are kept dry.',
  ),
  fact(
    'sideways-holes',
    'Upright holes are rounder',
    'A hole standing up is drawn as clean circles. One lying on its side is built from stacked layers that must bridge across the top, so it comes out a little less round.',
  ),
];

// -- Tier 4: the five plain checks, used at the start and as filler -------------------------------

export function plainCards(steps: StepProgress[]): PreparingCard[] {
  const arrived = shownSteps(steps).map(
    (s): PreparingCard => ({ id: `plain:${s.step}`, tier: 4, title: s.title, body: s.teaching }),
  );
  if (arrived.length > 0) return arrived;
  // Nothing has finished yet: the first thing we always do.
  return [
    {
      id: 'plain:intake.load_mesh',
      tier: 4,
      title: 'Opening your file',
      body: 'Every model is a skin of tiny triangles. We read yours.',
    },
  ];
}

// -- Tier 1: what the checks found on this part ---------------------------------------------------

export function findingCards(steps: StepProgress[]): PreparingCard[] {
  const seen = new Set<string>();
  const cards: PreparingCard[] = [];
  for (const step of steps) {
    const lesson = step.lesson;
    if (!lesson || step.state === 'started' || seen.has(lesson.code)) continue;
    if (!lesson.title.trim() || !lesson.body.trim()) continue;
    seen.add(lesson.code);
    cards.push({
      id: `finding:${lesson.code}`,
      tier: 1,
      kicker: 'Found on your part',
      title: lesson.title,
      body: lesson.body,
    });
  }
  return cards;
}

// -- Tier 2: lessons that fit the part's shape and purpose ----------------------------------------

const card2 = (id: string, title: string, body: string): PreparingCard => ({
  id: `part:${id}`,
  tier: 2,
  kicker: 'About your part',
  title,
  body,
});

const mm = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''));

/** Lessons that suit the measured size, most telling first. Always at least one once the size is known. */
export function shapeCards(dims: Dims | null): PreparingCard[] {
  if (!dims || dims.some((d) => !Number.isFinite(d) || d <= 0)) return [];
  const [x, y, z] = dims;
  const footprint = Math.max(x, y);
  const narrow = Math.min(x, y);
  const longest = Math.max(x, y, z);
  const shortest = Math.min(x, y, z);
  const cards: PreparingCard[] = [];

  if (z >= 40 && z > 4 * narrow) {
    cards.push(
      card2(
        'tall',
        'Tall and slender parts can wobble',
        `Your part stands about ${mm(z)} mm tall on a base only ${mm(narrow)} mm wide. As it grows, the top flexes a little with the moving nozzle, and a wide base or a brim keeps it from tipping.`,
      ),
    );
  }
  if (footprint >= 100 && z < footprint / 4) {
    cards.push(
      card2(
        'flat',
        'Big flat parts like to curl up',
        `Your part covers about ${mm(x)} by ${mm(y)} mm of the plate. Plastic shrinks as it cools, and on a wide flat base the corners can lift, so we look after those edges.`,
      ),
    );
  }
  if (longest < 25) {
    cards.push(
      card2(
        'tiny',
        'Small parts have little to hold on with',
        `At about ${mm(longest)} mm across, your part touches the plate in a very small area. Tiny parts need a good first layer, and they also need time to cool between layers.`,
      ),
    );
  }
  if (longest > 180) {
    cards.push(
      card2(
        'large',
        'Big parts mean a long print',
        `At ${mm(longest)} mm your part is on the large side. Long prints give more time for something to go wrong, which is why the farm checks the size against its printers first.`,
      ),
    );
  }
  if (shortest < 3 && longest >= 30) {
    cards.push(
      card2(
        'plate',
        'A thin plate is only a few layers',
        `Part of your model is only ${mm(shortest)} mm thick, which is just a handful of layers. Thin plates can flex, so the way they lie on the plate matters.`,
      ),
    );
  }
  const sorted = [x, y, z].sort((a, b) => b - a);
  if (sorted[0] > 3 * sorted[1] && cards.length < 2) {
    cards.push(
      card2(
        'long',
        'Long parts are strongest along their length',
        'Layers hold together best side to side, not up and down. A long slim part is usually printed lying down so its length runs along the layers.',
      ),
    );
  }
  cards.push(
    card2(
      'layers',
      'Counting your layers',
      `At a typical 0.2 mm layer height, ${mm(z)} mm of height is about ${Math.max(1, Math.round(z / 0.2))} layers, each one drawn by the nozzle in turn.`,
    ),
  );
  return cards;
}

const PURPOSE_CARDS: Partial<Record<Purpose, PreparingCard>> = {
  class: card2(
    'purpose-class',
    'For a class project',
    'Print early. A test piece shows if parts fit before you commit to the final one, and notes on what you changed make a good write-up.',
  ),
  venture: card2(
    'purpose-venture',
    'For a venture',
    'Repeat parts need to match each other. Keeping the same orientation and settings from print to print is what makes the tenth one look like the first.',
  ),
  club: card2(
    'purpose-club',
    'For a club or team',
    'Parts for a team get used hard and often. Print a spare of anything that wears, and write down the settings so a teammate can reprint it exactly.',
  ),
  research: card2(
    'purpose-research',
    'For research',
    'Print what a rig needs to be the same every time. Keep the file and the settings with your notes: a part that cannot be reproduced is hard to cite.',
  ),
  personal: card2(
    'purpose-personal',
    'For your own project',
    'Printing is quick to repeat, so try a small version first. Changing a design after seeing it in your hands is part of the fun.',
  ),
};

export function purposeCards(purpose: Purpose | null | undefined): PreparingCard[] {
  const found = purpose ? PURPOSE_CARDS[purpose] : undefined;
  return found ? [found] : [];
}

// -- Putting the pool together and picking -------------------------------------------------------

export function buildPool(
  steps: StepProgress[],
  dims: Dims | null,
  purpose: Purpose | null | undefined,
  generalOrder: readonly PreparingCard[],
): CardPool {
  const shape = shapeCards(dims);
  const layerCard = shape.pop(); // the layer count goes after the purpose tip
  // (nothing about the part until it is measured: the plain checks cover the very start)
  const part = layerCard ? [...shape, ...purposeCards(purpose), layerCard] : [];
  return {
    findings: findingCards(steps),
    part,
    general: [...generalOrder],
    plain: plainCards(steps),
  };
}

/**
 * The next card, highest rank first and never one already shown: findings, the part's lessons, then
 * (before the size is known) the plain checks, then general facts, then plain filler. When everything
 * has been shown, the one seen longest ago.
 */
export function pickNext(pool: CardPool, seen: readonly string[]): PreparingCard {
  const done = new Set(seen);
  const fresh = (list: PreparingCard[]) => list.find((c) => !done.has(c.id));
  const starting = pool.part.length === 0;
  const next =
    fresh(pool.findings) ??
    fresh(pool.part) ??
    (starting ? fresh(pool.plain) : undefined) ??
    fresh(pool.general) ??
    fresh(pool.plain);
  if (next) return next;
  const all = [...pool.findings, ...pool.part, ...pool.general, ...pool.plain];
  return [...all].sort((a, b) => seen.lastIndexOf(a.id) - seen.lastIndexOf(b.id))[0];
}

// -- Remembering which facts this browser has shown ----------------------------------------------

const STORAGE_KEY = 'preparing-facts-seen';
const REMEMBER = 20;

export function loadSeenFacts(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberFact(id: string): void {
  try {
    const next = [...loadSeenFacts().filter((v) => v !== id), id].slice(-REMEMBER);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode or storage full: the facts just may repeat sooner
  }
}

/** Facts not shown lately first (shuffled), then the ones seen longest ago. */
export function orderFacts(
  recent: readonly string[],
  random: () => number = Math.random,
): PreparingCard[] {
  const fresh = GENERAL_FACTS.filter((f) => !recent.includes(f.id));
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  const stale = recent.flatMap((id) => GENERAL_FACTS.filter((f) => f.id === id));
  return [...fresh, ...stale];
}
