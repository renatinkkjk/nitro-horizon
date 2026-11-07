import { Rng } from '../core/rng';
import {
  easeIn,
  easeInOut,
  makeSegment,
  RUMBLE_LENGTH,
  SEGMENT_LENGTH,
  type ColorSet,
  type Segment,
  type SpriteKind,
} from '../render/pseudo3d';

export interface Theme {
  colors: ColorSet;
  skyTop: string;
  skyBottom: string;
  horizon: string;
  parallaxFar: string;
  parallaxNear: string;
  spriteKinds: SpriteKind[];
}

export interface PitZone {
  /** Distância de entrada/saída da via de boxes (unidades de mundo). */
  entry: number;
  exit: number;
  /** Trecho onde o reabastecimento acontece. */
  boxStart: number;
  boxEnd: number;
}

export interface Track {
  id: string;
  name: string;
  difficulty: string;
  blurb: string;
  laps: number;
  theme: Theme;
  segments: Segment[];
  length: number;
  map: Array<[number, number]>;
  pit: PitZone | null;
}

export interface PitDef {
  /** Índices de segmento da entrada, saída e da área de boxes. */
  entry: number;
  exit: number;
  boxStart: number;
  boxEnd: number;
}

export interface TrackDef extends Omit<Track, 'segments' | 'length' | 'map' | 'pit'> {
  seed: number;
  pit?: PitDef;
  build: (builder: TrackBuilder) => void;
}

export class TrackBuilder {
  readonly segments: Segment[] = [];
  private lastY = 0;

  private addSegment(curve: number, y: number): void {
    const index = this.segments.length;
    this.segments.push(makeSegment(index, this.lastY, y, curve));
    this.lastY = y;
  }

  addRoad(enter: number, hold: number, leave: number, curve: number, y: number): void {
    const startY = this.lastY;
    const endY = startY + y;
    const total = enter + hold + leave;

    for (let n = 0; n < enter; n++) {
      this.addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    }
    for (let n = 0; n < hold; n++) {
      this.addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    }
    for (let n = 0; n < leave; n++) {
      this.addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }
    this.lastY = endY;
  }

  straight(n = 40): void {
    this.addRoad(n, n, n, 0, 0);
  }

  curve(n = 40, curve = 2, y = 0): void {
    this.addRoad(n, n, n, curve, y);
  }

  hill(n = 40, y = 40): void {
    this.addRoad(n, n, n, 0, y);
  }

  sCurves(): void {
    this.curve(25, 3, 0);
    this.curve(25, -3, 0);
    this.curve(25, 3, 0);
  }
}

function decorate(segments: Segment[], kinds: SpriteKind[], rng: Rng, pit?: PitDef): void {
  // A área do pit lane precisa ficar limpa de árvores/pedras no lado direito.
  const pitClean = (index: number): boolean =>
    !!pit && index >= pit.entry - 48 && index <= pit.exit + 10;
  const pickSide = (index: number): number =>
    pitClean(index) ? -1 : rng.next() < 0.5 ? -1 : 1;

  for (let i = 6; i < segments.length; i++) {
    const segment = segments[i];

    if (i % 9 === 0) {
      const side = pickSide(i);
      segment.sprites.push({
        kind: rng.pick(kinds),
        offset: side * rng.range(1.45, 3.6),
        size: rng.range(0.75, 1.5),
      });
    }

    if (i % 17 === 0) {
      const side = pickSide(i);
      segment.sprites.push({
        kind: rng.pick(kinds),
        offset: side * rng.range(2.8, 5.2),
        size: rng.range(0.6, 1.2),
      });
    }

    if (i > 10 && i % 61 === 0) {
      segment.sprites.push({
        kind: 'sign',
        offset: pitClean(i) ? -1.32 : rng.next() < 0.5 ? -1.32 : 1.32,
        size: 1,
      });
    }
  }
}

/** Adiciona placas de aviso e as garagens do pit lane. */
function buildPitArea(segments: Segment[], pit: PitDef): void {
  // Placas antecipando a entrada, do lado direito.
  for (let k = 0; k < 4; k += 1) {
    const index = Math.max(2, pit.entry - 20 + k * 5);
    const segment = segments[index];
    if (segment) {
      segment.sprites.push({
        kind: 'pitsign',
        offset: k % 2 === 0 ? 1.44 : 1.66,
        size: 1,
      });
    }
  }

  // Placa grande bem na entrada.
  const entrySign = segments[Math.max(2, pit.entry - 2)];
  if (entrySign) entrySign.sprites.push({ kind: 'pitsign', offset: 1.7, size: 1.2 });

  // Garagens de boxes ao longo de toda a área de reabastecimento.
  for (let i = pit.boxStart; i <= pit.boxEnd; i += 11) {
    const segment = segments[i];
    if (segment) segment.sprites.push({ kind: 'pitbox', offset: 2.35, size: 1 });
  }

  // Placa de saída do pit lane.
  const exitSign = segments[Math.min(segments.length - 2, pit.exit + 6)];
  if (exitSign) exitSign.sprites.push({ kind: 'pitsign', offset: 1.55, size: 1.1 });
}

/** Marca a largura da via de boxes, com afunilamento nas pontas. */
function markPitLane(segments: Segment[], pit: PitDef): void {
  const entryTaper = 14;
  const exitTaper = 8;
  for (let i = pit.entry; i <= pit.exit; i += 1) {
    const segment = segments[i];
    if (!segment) continue;

    let lane = 1;
    if (i < pit.entry + entryTaper) lane = (i - pit.entry + 1) / entryTaper;
    if (i > pit.exit - exitTaper) lane = Math.min(lane, (pit.exit - i + 1) / exitTaper);
    segment.pitLane = Math.max(0, Math.min(1, lane));
  }
}

/**
 * Corrige a elevação para a volta fechar no mesmo nível da largada, sem
 * degrau na emenda entre o fim e o começo do circuito.
 */
function levelTrack(segments: Segment[]): void {
  const count = segments.length;
  if (count < 2) return;

  const last = segments[count - 1].p2.world.y;
  if (Math.abs(last) < 0.5) return;

  for (let i = 0; i < count; i += 1) {
    const p1Factor = i / (count - 1);
    const p2Factor = (i + 1) / (count - 1);
    segments[i].p1.world.y -= last * p1Factor;
    segments[i].p2.world.y -= last * p2Factor;
  }
}

function buildMap(segments: Segment[]): Array<[number, number]> {
  const points: Array<[number, number]> = [[0, 0]];
  let heading = 0;
  let x = 0;
  let y = 0;
  const sampleEvery = Math.max(1, Math.floor(segments.length / 220));

  // Normaliza a curvatura para o traçado dar exatamente uma volta (360°),
  // garantindo que o minimapa seja um circuito fechado e não um "sprint".
  const totalCurve = segments.reduce((sum, segment) => sum + segment.curve, 0);
  const headingStep = Math.abs(totalCurve) > 1 ? (Math.PI * 2) / totalCurve : 0;

  for (let i = 0; i < segments.length; i++) {
    heading += segments[i].curve * headingStep;
    x += Math.sin(heading);
    y += Math.cos(heading);
    if (i % sampleEvery === 0) points.push([x, y]);
  }

  // Fecha o traçado distribuindo o erro residual ao longo de toda a volta.
  const [endX, endY] = points[points.length - 1];
  const last = points.length - 1;
  const closed = points.map(([px, py], i): [number, number] => [
    px - (endX * i) / last,
    py - (endY * i) / last,
  ]);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [px, py] of closed) {
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }

  // Normaliza cada eixo separadamente: as pistas são muito mais longas que
  // largas, e uma escala uniforme achataria o traçado numa linha reta.
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  return closed.map(([px, py]) => [
    ((px - minX) / spanX) * 2 - 1,
    ((py - minY) / spanY) * 2 - 1,
  ]);
}

export function buildTrack(def: TrackDef): Track {
  const builder = new TrackBuilder();
  def.build(builder);

  const segments = builder.segments;
  levelTrack(segments);

  if (def.pit) {
    markPitLane(segments, def.pit);
    buildPitArea(segments, def.pit);
  }
  decorate(segments, def.theme.spriteKinds, new Rng(def.seed), def.pit);

  const pit: PitZone | null = def.pit
    ? {
        entry: def.pit.entry * SEGMENT_LENGTH,
        exit: def.pit.exit * SEGMENT_LENGTH,
        boxStart: def.pit.boxStart * SEGMENT_LENGTH,
        boxEnd: def.pit.boxEnd * SEGMENT_LENGTH,
      }
    : null;

  return {
    id: def.id,
    name: def.name,
    difficulty: def.difficulty,
    blurb: def.blurb,
    laps: def.laps,
    theme: def.theme,
    segments,
    length: segments.length * SEGMENT_LENGTH,
    map: buildMap(segments),
    pit,
  };
}

export { SEGMENT_LENGTH, RUMBLE_LENGTH };
