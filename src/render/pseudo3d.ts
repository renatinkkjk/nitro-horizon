/** Motor pseudo-3D estilo outrun: projeção de segmentos com curvas e colinas. */

export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2000;
export const DRAW_DISTANCE = 210;
export const CAMERA_HEIGHT = 1000;
export const FIELD_OF_VIEW = 100;
export const CAMERA_DEPTH = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180);
export const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH;

const FOG_DENSITY = 3.2;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  w: number;
  scale: number;
}

export interface Point {
  world: Vec3;
  camera: Vec3;
  screen: ScreenPoint;
}

export type SpriteKind =
  | 'tree'
  | 'cactus'
  | 'palm'
  | 'rock'
  | 'sign'
  | 'billboard'
  | 'lamp'
  | 'building'
  | 'stand'
  | 'bush'
  | 'pitsign'
  | 'pitbox';

export interface RoadSprite {
  kind: SpriteKind;
  offset: number;
  size: number;
}

export interface Segment {
  index: number;
  p1: Point;
  p2: Point;
  curve: number;
  sprites: RoadSprite[];
  dark: boolean;
  startLine: boolean;
  looped: boolean;
  fog: number;
  clip: number;
  /** O segmento foi realmente desenhado neste frame (não ficou atrás de um morro). */
  drawn: boolean;
  /** 0 = sem pit lane; 0..1 = largura da via de boxes (com afunilamento). */
  pitLane: number;
}

export interface ColorSet {
  road: string;
  roadAlt: string;
  grass: string;
  grassAlt: string;
  rumble: string;
  rumbleAlt: string;
  lane: string;
  fog: string;
  pit: string;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

export function easeIn(a: number, b: number, p: number): number {
  return a + (b - a) * p * p;
}

export function easeInOut(a: number, b: number, p: number): number {
  return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
}

function makePoint(z: number, y: number): Point {
  return {
    world: { x: 0, y, z },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0, scale: 0 },
  };
}

export function makeSegment(index: number, y1: number, y2: number, curve: number): Segment {
  return {
    index,
    p1: makePoint(index * SEGMENT_LENGTH, y1),
    p2: makePoint((index + 1) * SEGMENT_LENGTH, y2),
    curve,
    sprites: [],
    dark: Math.floor(index / RUMBLE_LENGTH) % 2 === 0,
    startLine: index < 2,
    looped: false,
    fog: 1,
    clip: 0,
    drawn: false,
    pitLane: 0,
  };
}

export function project(
  point: Point,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  width: number,
  height: number,
  roadWidth = ROAD_WIDTH,
): void {
  const cam = point.camera;
  cam.x = point.world.x - cameraX;
  cam.y = point.world.y - cameraY;
  cam.z = point.world.z - cameraZ;

  const scale = CAMERA_DEPTH / Math.max(cam.z, 0.0001);
  const screen = point.screen;
  screen.scale = scale;
  screen.x = Math.round(width / 2 + (scale * cam.x * width) / 2);
  screen.y = Math.round(height / 2 - (scale * cam.y * height) / 2);
  screen.w = Math.round((scale * roadWidth * width) / 2);
}

function polygon(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

function quadPoint(
  p1x: number,
  p1y: number,
  p1w: number,
  p2x: number,
  p2y: number,
  p2w: number,
  u: number,
  v: number,
): [number, number] {
  const topX = p1x - p1w + 2 * p1w * u;
  const botX = p2x - p2w + 2 * p2w * u;
  return [lerp(topX, botX, v), lerp(p1y, p2y, v)];
}

function paintStartLine(
  ctx: CanvasRenderingContext2D,
  p1x: number,
  p1y: number,
  p1w: number,
  p2x: number,
  p2y: number,
  p2w: number,
): void {
  const cols = 8;
  const rows = 2;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const dark = (i + j) % 2 === 0;
      const u0 = i / cols;
      const u1 = (i + 1) / cols;
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      const [ax, ay] = quadPoint(p1x, p1y, p1w, p2x, p2y, p2w, u0, v0);
      const [bx, by] = quadPoint(p1x, p1y, p1w, p2x, p2y, p2w, u1, v0);
      const [cx, cy] = quadPoint(p1x, p1y, p1w, p2x, p2y, p2w, u1, v1);
      const [dx, dy] = quadPoint(p1x, p1y, p1w, p2x, p2y, p2w, u0, v1);
      polygon(ctx, ax, ay, bx, by, cx, cy, dx, dy, dark ? '#161626' : '#f2f2f7');
    }
  }
}

function renderSegment(
  ctx: CanvasRenderingContext2D,
  width: number,
  near: ScreenPoint,
  far: ScreenPoint,
  segment: Segment,
  colors: ColorSet,
): void {
  const p1 = near;
  const p2 = far;
  if (p1.y <= p2.y) return;

  const dark = segment.dark;
  const road = dark ? colors.road : colors.roadAlt;
  const grass = dark ? colors.grass : colors.grassAlt;
  const rumble = dark ? colors.rumble : colors.rumbleAlt;

  ctx.fillStyle = grass;
  ctx.fillRect(0, p2.y, width, p1.y - p2.y);

  // pit lane: faixa de boxes à direita, com afunilamento na entrada e na saída
  if (segment.pitLane > 0.001) {
    const taper = segment.pitLane;
    const inner = 1.03;
    const outer = inner + 0.52 * taper;
    const p1i = p1.x + p1.w * inner;
    const p1o = p1.x + p1.w * outer;
    const p2i = p2.x + p2.w * inner;
    const p2o = p2.x + p2.w * outer;

    polygon(ctx, p1i, p1.y, p1o, p1.y, p2o, p2.y, p2i, p2.y, colors.pit);

    // separador tracejado entre a pista e a via de boxes
    if (segment.dark) {
      const dashIn = inner + 0.012;
      const dashOut = inner + 0.055;
      polygon(
        ctx,
        p1.x + p1.w * dashIn,
        p1.y,
        p1.x + p1.w * dashOut,
        p1.y,
        p2.x + p2.w * dashOut,
        p2.y,
        p2.x + p2.w * dashIn,
        p2.y,
        '#eef3f7',
      );
    }

    // muro de proteção na borda externa (sem fechar a entrada/saída)
    if (taper > 0.99) {
      const wallIn = outer + 0.005;
      const wallOut = outer + 0.055;
      polygon(
        ctx,
        p1.x + p1.w * wallIn,
        p1.y,
        p1.x + p1.w * wallOut,
        p1.y,
        p2.x + p2.w * wallOut,
        p2.y,
        p2.x + p2.w * wallIn,
        p2.y,
        '#1c1c2c',
      );
      const topIn = wallIn + 0.008;
      const topOut = wallOut - 0.008;
      polygon(
        ctx,
        p1.x + p1.w * topIn,
        p1.y,
        p1.x + p1.w * topOut,
        p1.y,
        p2.x + p2.w * topOut,
        p2.y,
        p2.x + p2.w * topIn,
        p2.y,
        '#4a5480',
      );
    }
  }

  const r1 = Math.max(1, p1.w * 0.12);
  const r2 = Math.max(1, p2.w * 0.12);
  const l1 = Math.max(1, p1.w * 0.02);
  const l2 = Math.max(1, p2.w * 0.02);

  polygon(
    ctx,
    p1.x - p1.w - r1,
    p1.y,
    p1.x - p1.w,
    p1.y,
    p2.x - p2.w,
    p2.y,
    p2.x - p2.w - r2,
    p2.y,
    rumble,
  );
  polygon(
    ctx,
    p1.x + p1.w + r1,
    p1.y,
    p1.x + p1.w,
    p1.y,
    p2.x + p2.w,
    p2.y,
    p2.x + p2.w + r2,
    p2.y,
    rumble,
  );
  polygon(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, road);

  if (segment.startLine) {
    paintStartLine(ctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);
  } else if (!dark) {
    for (const side of [-0.5, 0.5]) {
      const lx1 = p1.x + p1.w * side;
      const lx2 = p2.x + p2.w * side;
      polygon(ctx, lx1 - l1, p1.y, lx1 + l1, p1.y, lx2 + l2, p2.y, lx2 - l2, p2.y, colors.lane);
    }
  }

  if (segment.fog < 1) {
    ctx.globalAlpha = 1 - segment.fog;
    ctx.fillStyle = colors.fog;
    ctx.fillRect(0, p2.y, width, p1.y - p2.y);
    ctx.globalAlpha = 1;
  }
}

/** Desenha a estrada e devolve os segmentos visíveis (para a camada de sprites). */
export function renderRoad(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  trackLength: number,
  cameraZ: number,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number,
  colors: ColorSet,
  lookBack = false,
): Segment[] {
  const count = segments.length;
  // A câmera é normalizada dentro da volta: no começo da corrida a posição
  // pode ser negativa (grid atrás da linha), e Z negativo quebra a projeção.
  const camZ = mod(cameraZ, trackLength);
  const baseIndex = Math.floor(camZ / SEGMENT_LENGTH) % count;
  const basePercent = mod(camZ, SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const baseSegment = segments[baseIndex];

  const visible: Segment[] = [];
  let maxy = height;

  if (!lookBack) {
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segment = segments[(baseIndex + n) % count];
      segment.looped = segment.index < baseSegment.index;
      segment.fog = Math.exp(-FOG_DENSITY * Math.pow(n / DRAW_DISTANCE, 2) * 4);
      segment.clip = maxy;
      segment.drawn = false;

      const segmentCamZ = camZ - (segment.looped ? trackLength : 0);
      project(segment.p1, cameraX - x, cameraY, segmentCamZ, width, height);
      project(segment.p2, cameraX - x - dx, cameraY, segmentCamZ, width, height);

      x += dx;
      dx += segment.curve;

      visible.push(segment);

      if (segment.p1.camera.z <= CAMERA_DEPTH) continue;
      if (segment.p2.screen.y >= segment.p1.screen.y) continue;
      if (segment.p2.screen.y >= maxy) continue;

      renderSegment(ctx, width, segment.p1.screen, segment.p2.screen, segment, colors);
      segment.drawn = true;
      maxy = segment.p2.screen.y;
    }

    return visible;
  }

  // Olhar para trás: percorre os segmentos no sentido inverso (o que está
  // atrás da câmera), com a curvatura negada. O espelhamento horizontal do
  // canvas (feito no game) completa a rotação de 180° do ponto de vista.
  // O primeiro trecho parcial (até a borda do segmento base) não é desenhado,
  // mas entra no acumulador de deslocamento.
  let x = 0;
  let dx = baseSegment.curve * (1 - basePercent);
  x += dx;
  dx -= baseSegment.curve;

  for (let n = 1; n < DRAW_DISTANCE; n++) {
    const segment = segments[(baseIndex - n + count) % count];
    const wrapped = segment.p1.world.z > camZ;
    const camZadj = camZ + (wrapped ? trackLength : 0);

    // Em ordem inversa, p2 é a borda mais próxima e p1 a mais distante.
    const nearCamZ = 2 * segment.p2.world.z - camZadj;
    const farCamZ = 2 * segment.p1.world.z - camZadj;
    project(segment.p2, cameraX - x, cameraY, nearCamZ, width, height);
    project(segment.p1, cameraX - x - dx, cameraY, farCamZ, width, height);

    const near = segment.p2.screen;
    const far = segment.p1.screen;

    segment.looped = wrapped;
    segment.fog = Math.exp(-FOG_DENSITY * Math.pow((n - 1) / DRAW_DISTANCE, 2) * 4);
    segment.clip = maxy;
    segment.drawn = false;

    x += dx;
    dx -= segment.curve;

    visible.push(segment);

    if (near.scale <= 0) continue;
    if (segment.p2.camera.z <= CAMERA_DEPTH) continue;
    if (far.y >= near.y) continue;
    if (far.y >= maxy) continue;

    renderSegment(ctx, width, near, far, segment, colors);
    segment.drawn = true;
    maxy = far.y;
  }

  return visible;
}

export function fogColor(colors: ColorSet, alpha: number): string {
  return colors.fog + Math.round(alpha * 255).toString(16).padStart(2, '0');
}
