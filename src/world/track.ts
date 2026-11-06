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
}

export interface TrackDef extends Omit<Track, 'segments' | 'length' | 'map'> {
  seed: number;
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

function decorate(segments: Segment[], kinds: SpriteKind[], rng: Rng): void {
  for (let i = 6; i < segments.length; i++) {
    const segment = segments[i];

    if (i % 9 === 0) {
      const side = rng.next() < 0.5 ? -1 : 1;
      segment.sprites.push({
        kind: rng.pick(kinds),
        offset: side * rng.range(1.45, 3.6),
        size: rng.range(0.75, 1.5),
      });
    }

    if (i % 17 === 0) {
      const side = rng.next() < 0.5 ? -1 : 1;
      segment.sprites.push({
        kind: rng.pick(kinds),
        offset: side * rng.range(2.8, 5.2),
        size: rng.range(0.6, 1.2),
      });
    }

    if (i > 10 && i % 61 === 0) {
      segment.sprites.push({
        kind: 'sign',
        offset: rng.next() < 0.5 ? -1.32 : 1.32,
        size: 1,
      });
    }
  }
}

/**
 * Constrói o mapa top-down (minimapa) da pista.
 * A pista é um CIRCUITO fechado, então o mapa deve ser um loop:
 * o último ponto volta a se conectar ao primeiro.
 */
function buildMap(segments: Segment[]): Array<[number, number]> {
  const points: Array<[number, number]> = [[0, 0]];
  let heading = 0;
  let x = 0;
  let y = 0;
  // Amostra mais densa para o traçado ficar suave no minimapa.
  const sampleEvery = Math.max(1, Math.floor(segments.length / 360));

  for (let i = 0; i < segments.length; i++) {
    heading += segments[i].curve * 0.0034;
    x += Math.sin(heading);
    y += Math.cos(heading);
    if (i % sampleEvery === 0) points.push([x, y]);
  }

  // O circuito pode não voltar exatamente ao ponto de partida (x,y != 0,0)
  // mesmo que a direção volte. Ajustamos todos os pontos com uma correção
  // linear para forçar o fechamento perfeito em (0,0).
  const endX = x;
  const endY = y;
  const corrected: Array<[number, number]> = [];
  for (let i = 0; i < points.length; i += 1) {
    const t = i / Math.max(1, points.length - 1);
    corrected.push([
      points[i][0] - endX * t,
      points[i][1] - endY * t,
    ]);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [px, py] of corrected) {
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const span = Math.max(spanX, spanY);

  return corrected.map(([px, py]) => [
    ((px - minX) / span) * 2 - 1,
    ((py - minY) / span) * 2 - 1,
  ]);
}

export function buildTrack(def: TrackDef): Track {
  const builder = new TrackBuilder();
  def.build(builder);
  decorate(builder.segments, def.theme.spriteKinds, new Rng(def.seed));

  const segments = builder.segments;
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
  };
}

export { SEGMENT_LENGTH, RUMBLE_LENGTH };
