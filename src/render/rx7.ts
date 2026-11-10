import { shade } from './color';
import type { CarDrawOptions, CarPaint } from './sprites';

/** Vistas disponíveis do Mazda RX-7 (FD). */
export type Rx7View = 'rear' | 'rearQuarter' | 'front' | 'frontQuarter' | 'side';

type Point = [number, number];

const OUTLINE = '#000';
const GLASS = '#0e1828';
const GLASS_HI = 'rgba(170,210,255,0.22)';
const TIRE = '#0a0a10';
const RIM = '#d4d9e6';
const RIM_DARK = '#7c8498';
const RED = '#d8202e';
const RED_HI = '#ff5a5a';
const AMBER = '#ff9f2e';
const PLATE = '#f2d24a';

function lineWidth(w: number): number {
  return Math.max(1, w * 0.018);
}

function shape(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  fill: string,
  outline: string | null = OUTLINE,
  lw = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline: string | null = OUTLINE,
  lw = 1,
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.strokeRect(x, y, w, h);
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill: string,
  outline: string | null = OUTLINE,
  lw = 1,
): void {
  const r = Math.max(0, Math.min(Math.abs(radius), Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function disc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  outline: string | null = OUTLINE,
  lw = 1,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.2, radius), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Roda vista de lado: pneu, aro e 5 raios. */
function sideWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  lw: number,
): void {
  disc(ctx, cx, cy, radius, TIRE, OUTLINE, lw);
  disc(ctx, cx, cy, radius * 0.62, RIM_DARK, OUTLINE, lw * 0.6);
  disc(ctx, cx, cy, radius * 0.5, RIM, null);
  ctx.strokeStyle = RIM_DARK;
  ctx.lineWidth = Math.max(0.7, radius * 0.1);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * radius * 0.16, cy + Math.sin(angle) * radius * 0.16);
    ctx.lineTo(cx + Math.cos(angle) * radius * 0.46, cy + Math.sin(angle) * radius * 0.46);
    ctx.stroke();
  }
  disc(ctx, cx, cy, radius * 0.15, RIM_DARK, OUTLINE, lw * 0.5);
}

/** Roda vista de trás: pneu retangular e aro estreito. */
function rearWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottom: number,
  width: number,
  height: number,
  detail: boolean,
  lw: number,
): void {
  roundedRect(ctx, cx - width / 2, bottom - height, width, height, width * 0.22, TIRE, OUTLINE, lw * 0.8);
  if (!detail) return;
  roundedRect(
    ctx,
    cx - width * 0.28,
    bottom - height * 0.86,
    width * 0.56,
    height * 0.56,
    width * 0.12,
    RIM_DARK,
    OUTLINE,
    Math.max(0.6, lw * 0.5),
  );
  box(
    ctx,
    cx - width * 0.06,
    bottom - height * 0.82,
    Math.max(0.8, width * 0.12),
    height * 0.48,
    RIM,
    null,
  );
}

/** Traseira do RX-7. Desenhada na origem local (centro inferior). */
function rearBody(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  paint: CarPaint,
  opts: CarDrawOptions,
  mirrorMode: 'both' | 'far' | 'none',
): void {
  const hw = w / 2;
  const body = paint.body;
  const dark = shade(body, -0.34);
  const deeper = shade(body, -0.64);
  const light = shade(body, 0.34);
  const accent = paint.accent;
  const lw = lineWidth(w);
  const detail = w >= 28 && h >= 20;

  // pneus traseiros
  rearWheel(ctx, -hw * 0.92, 0, hw * 0.19, h * 0.25, detail, lw);
  rearWheel(ctx, hw * 0.92, 0, hw * 0.19, h * 0.25, detail, lw);

  // silhueta principal (ombros largos, traseira arredondada)
  shape(
    ctx,
    [
      [-hw * 0.88, -h * 0.14],
      [-hw * 1.0, -h * 0.28],
      [-hw * 0.99, -h * 0.44],
      [-hw * 0.92, -h * 0.55],
      [-hw * 0.76, -h * 0.6],
      [-hw * 0.54, -h * 0.64],
      [-hw * 0.44, -h * 0.9],
      [hw * 0.44, -h * 0.9],
      [hw * 0.54, -h * 0.64],
      [hw * 0.76, -h * 0.6],
      [hw * 0.92, -h * 0.55],
      [hw * 0.99, -h * 0.44],
      [hw * 1.0, -h * 0.28],
      [hw * 0.88, -h * 0.14],
    ],
    body,
    OUTLINE,
    lw,
  );

  // para-choque inferior
  shape(
    ctx,
    [
      [-hw * 0.88, -h * 0.14],
      [-hw * 0.96, -h * 0.24],
      [hw * 0.96, -h * 0.24],
      [hw * 0.88, -h * 0.14],
    ],
    dark,
    null,
  );
  box(ctx, -hw * 0.8, -h * 0.2, hw * 1.6, Math.max(1, h * 0.012), deeper, null);
  box(ctx, -hw * 0.72, -h * 0.145, hw * 1.44, Math.max(1.2, h * 0.05), '#11111a', OUTLINE, lw * 0.6);
  for (let i = -2; i <= 2; i += 1) {
    box(ctx, i * hw * 0.11 - hw * 0.012, -h * 0.135, Math.max(0.8, hw * 0.024), h * 0.035, deeper, null);
  }

  // brilho no ombro
  if (detail) {
    shape(
      ctx,
      [
        [-hw * 0.97, -h * 0.43],
        [-hw * 0.9, -h * 0.54],
        [-hw * 0.77, -h * 0.59],
        [-hw * 0.74, -h * 0.57],
        [-hw * 0.86, -h * 0.5],
      ],
      light,
      null,
    );
    shape(
      ctx,
      [
        [hw * 0.97, -h * 0.43],
        [hw * 0.9, -h * 0.54],
        [hw * 0.77, -h * 0.59],
        [hw * 0.74, -h * 0.57],
        [hw * 0.86, -h * 0.5],
      ],
      light,
      null,
    );
  }

  // vidro traseiro
  shape(
    ctx,
    [
      [-hw * 0.5, -h * 0.63],
      [-hw * 0.4, -h * 0.88],
      [hw * 0.4, -h * 0.88],
      [hw * 0.5, -h * 0.63],
    ],
    GLASS,
    OUTLINE,
    lw * 0.9,
  );
  if (detail) {
    shape(
      ctx,
      [
        [-hw * 0.34, -h * 0.86],
        [-hw * 0.14, -h * 0.86],
        [-hw * 0.28, -h * 0.66],
        [-hw * 0.44, -h * 0.66],
      ],
      GLASS_HI,
      null,
    );
    ctx.strokeStyle = 'rgba(200,225,255,0.1)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 3; i += 1) {
      const y = -h * (0.7 + i * 0.055);
      ctx.beginPath();
      ctx.moveTo(-hw * 0.42, y);
      ctx.lineTo(hw * 0.42, y);
      ctx.stroke();
    }
  }

  // teto
  shape(
    ctx,
    [
      [-hw * 0.46, -h * 0.93],
      [-hw * 0.4, -h * 0.88],
      [hw * 0.4, -h * 0.88],
      [hw * 0.46, -h * 0.93],
    ],
    body,
    OUTLINE,
    lw * 0.8,
  );
  if (detail) {
    box(ctx, -hw * 0.4, -h * 0.925, hw * 0.8, Math.max(1, h * 0.018), light, null);
  }

  // aerofólio traseiro
  const wingY = -h * 0.985;
  const wingH = Math.max(1.5, h * 0.058);
  box(ctx, -hw * 0.54, -h * 0.94, Math.max(1, hw * 0.05), h * 0.08, deeper, OUTLINE, lw * 0.55);
  box(ctx, hw * 0.49, -h * 0.94, Math.max(1, hw * 0.05), h * 0.08, deeper, OUTLINE, lw * 0.55);
  shape(
    ctx,
    [
      [-hw * 1.01, wingY + wingH],
      [-hw * 0.99, wingY],
      [hw * 0.99, wingY],
      [hw * 1.01, wingY + wingH],
    ],
    body,
    OUTLINE,
    lw,
  );
  box(ctx, -hw * 0.98, wingY - h * 0.004, hw * 1.96, Math.max(1, h * 0.014), deeper, null);
  box(ctx, -hw * 0.99, wingY + wingH * 0.55, hw * 1.98, Math.max(1, h * 0.008), light, null);
  for (const s of [-1, 1]) {
    roundedRect(
      ctx,
      s < 0 ? -hw * 1.05 : hw * 0.97,
      wingY - h * 0.012,
      Math.max(1, hw * 0.08),
      wingH + h * 0.03,
      h * 0.01,
      accent,
      OUTLINE,
      lw * 0.55,
    );
  }

  // faixa escura traseira + lanternas
  shape(
    ctx,
    [
      [-hw * 0.9, -h * 0.53],
      [-hw * 0.88, -h * 0.37],
      [hw * 0.88, -h * 0.37],
      [hw * 0.9, -h * 0.53],
    ],
    '#0a0a10',
    OUTLINE,
    lw * 0.75,
  );

  const lampH = h * 0.13;
  const lampY = -h * 0.512;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -hw * 0.84 : hw * 0.32;
    const x1 = s < 0 ? -hw * 0.32 : hw * 0.84;
    const lampW = x1 - x0;
    roundedRect(ctx, x0, lampY, lampW, lampH, h * 0.035, opts.brake ? RED_HI : RED, OUTLINE, lw * 0.7);
    // setor âmbar na lateral interna
    const amberW = lampW * 0.3;
    const amberX = s < 0 ? x1 - amberW : x0;
    roundedRect(
      ctx,
      amberX,
      lampY + lampH * 0.16,
      amberW,
      lampH * 0.68,
      h * 0.02,
      opts.brake ? '#ffd08a' : AMBER,
      null,
    );
    if (detail) {
      box(ctx, x0 + lampW * 0.08, lampY + lampH * 0.12, lampW * 0.2, Math.max(0.8, lampH * 0.14), 'rgba(255,255,255,0.45)', null);
      const revW = lampW * 0.14;
      box(
        ctx,
        s < 0 ? x0 + lampW * 0.12 : x1 - lampW * 0.26,
        lampY + lampH * 0.58,
        revW,
        lampH * 0.28,
        '#e8ecf6',
        null,
      );
    }
  }

  // emblema e identificação
  disc(ctx, 0, -h * 0.45, Math.max(1, h * 0.026), '#cdd5e6', OUTLINE, lw * 0.5);
  if (detail) {
    ctx.fillStyle = '#c8d0e0';
    ctx.font = `bold ${Math.max(2, Math.round(h * 0.052))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RX-7', hw * 0.16, -h * 0.45);
  }

  // placa
  if (detail) {
    roundedRect(ctx, -hw * 0.17, -h * 0.345, hw * 0.34, h * 0.1, h * 0.012, PLATE, OUTLINE, lw * 0.55);
    box(ctx, -hw * 0.11, -h * 0.306, hw * 0.22, Math.max(0.9, h * 0.018), '#3b3b2b', null);
    box(ctx, -hw * 0.06, -h * 0.306, Math.max(0.7, hw * 0.012), Math.max(0.9, h * 0.018), PLATE, null);
  }

  // escapamentos duplos (lado direito)
  const exhaustY = -h * 0.095;
  const exhaustR = Math.max(1, h * 0.034);
  for (const ex of [hw * 0.4, hw * 0.53]) {
    disc(ctx, ex, exhaustY, exhaustR, '#1b1b24', OUTLINE, lw * 0.5);
    disc(ctx, ex, exhaustY, exhaustR * 0.55, '#4d4d5e', null);
    if (opts.nitro) {
      shape(
        ctx,
        [
          [ex - exhaustR * 0.8, exhaustY + exhaustR * 1.3],
          [ex, h * 0.03],
          [ex + exhaustR * 0.8, exhaustY + exhaustR * 1.3],
        ],
        '#ffb52e',
        null,
      );
      shape(
        ctx,
        [
          [ex - exhaustR * 0.4, exhaustY + exhaustR * 1.3],
          [ex, -h * 0.015],
          [ex + exhaustR * 0.4, exhaustY + exhaustR * 1.3],
        ],
        '#fff4c2',
        null,
      );
    }
  }

  // setas laterais
  box(ctx, -hw * 0.95, -h * 0.32, Math.max(1, hw * 0.05), Math.max(1, h * 0.035), AMBER, OUTLINE, lw * 0.45);
  box(ctx, hw * 0.9, -h * 0.32, Math.max(1, hw * 0.05), Math.max(1, h * 0.035), AMBER, OUTLINE, lw * 0.45);

  // retrovisores
  if (mirrorMode === 'both' || mirrorMode === 'far') {
    roundedRect(
      ctx,
      -hw * 1.08,
      -h * 0.65,
      Math.max(1, hw * 0.14),
      Math.max(1, h * 0.055),
      h * 0.012,
      body,
      OUTLINE,
      lw * 0.55,
    );
  }
  if (mirrorMode === 'both') {
    roundedRect(
      ctx,
      hw * 0.94,
      -h * 0.65,
      Math.max(1, hw * 0.14),
      Math.max(1, h * 0.055),
      h * 0.012,
      body,
      OUTLINE,
      lw * 0.55,
    );
  }

  // brilho dos freios
  if (opts.brake) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(-hw * 0.9, -h * 0.55, hw * 1.8, h * 0.22);
    ctx.globalAlpha = 1;
  }
}

/** Traseira reta (usada no jogo quando o carro está alinhado). */
function drawRear(ctx: CanvasRenderingContext2D, w: number, h: number, paint: CarPaint, opts: CarDrawOptions): void {
  const hw = w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.008, hw * 0.9, h * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();
  rearBody(ctx, w, h, paint, opts, 'both');
}

/** Traseira 3/4: mostra a lateral direita; espelha para a esquerda. */
function drawRearQuarter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  paint: CarPaint,
  opts: CarDrawOptions,
  turn: number,
): void {
  const hw = w / 2;
  const body = paint.body;
  const dark = shade(body, -0.4);
  const deeper = shade(body, -0.68);
  const light = shade(body, 0.32);
  const accent = paint.accent;
  const lw = lineWidth(w);
  const detail = w >= 28 && h >= 20;

  const rearScale = 1 - 0.16 * turn;
  const shift = -hw * 0.12 * turn;

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.beginPath();
  ctx.ellipse(shift * 0.35, -h * 0.008, hw * (0.9 + 0.12 * turn), h * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // geometria da lateral
  const innerBottomX = shift + hw * 0.5 * rearScale;
  const innerTopX = shift + hw * 0.38 * rearScale;
  const rearBeltX = shift + hw * 0.96 * rearScale;
  const rearRoofX = shift + hw * 0.46 * rearScale;
  const rearBottomX = shift + hw * 1.0 * rearScale;
  const frontOut = hw * (0.22 + 0.42 * turn);
  const frontBottomX = rearBottomX + frontOut * 0.92;
  const frontTopX = rearBeltX + frontOut;
  const frontRoofX = rearRoofX + frontOut * 0.95;

  // lateral (por trás da traseira, que cobre a emenda)
  shape(
    ctx,
    [
      [innerBottomX, -h * 0.15],
      [innerTopX, -h * 0.9],
      [frontRoofX, -h * 0.82],
      [frontTopX, -h * 0.6],
      [frontBottomX, -h * 0.23],
    ],
    shade(body, -0.07),
    OUTLINE,
    lw,
  );

  // vidro lateral
  shape(
    ctx,
    [
      [rearBeltX - hw * 0.03, -h * 0.55],
      [frontTopX - hw * 0.05, -h * 0.63],
      [frontRoofX - hw * 0.06, -h * 0.78],
      [rearRoofX + hw * 0.02, -h * 0.86],
    ],
    GLASS,
    OUTLINE,
    lw * 0.85,
  );
  if (detail) {
    shape(
      ctx,
      [
        [rearBeltX + hw * 0.01, -h * 0.57],
        [rearBeltX + hw * 0.14, -h * 0.57],
        [rearRoofX + hw * 0.14, -h * 0.84],
        [rearRoofX + hw * 0.04, -h * 0.84],
      ],
      GLASS_HI,
      null,
    );
  }

  // coluna B e linha da porta
  const pillarX = rearBeltX + (frontTopX - rearBeltX) * 0.34;
  box(ctx, pillarX, -h * 0.86, Math.max(1, hw * 0.055), h * 0.3, deeper, OUTLINE, lw * 0.45);
  const seamX = rearBeltX + (frontTopX - rearBeltX) * 0.62;
  ctx.strokeStyle = deeper;
  ctx.lineWidth = Math.max(0.8, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(seamX, -h * 0.6);
  ctx.lineTo(seamX + hw * 0.02, -h * 0.22);
  ctx.stroke();

  // soleira e faixa de destaque
  shape(
    ctx,
    [
      [innerBottomX, -h * 0.15],
      [frontBottomX, -h * 0.23],
      [frontBottomX, -h * 0.19],
      [innerBottomX, -h * 0.11],
    ],
    dark,
    null,
  );
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1, h * 0.013);
  ctx.beginPath();
  ctx.moveTo(innerBottomX + hw * 0.04, -h * 0.145);
  ctx.lineTo(frontBottomX - hw * 0.03, -h * 0.225);
  ctx.stroke();

  // maçaneta
  if (detail) {
    box(ctx, seamX - hw * 0.07, -h * 0.55, hw * 0.06, Math.max(1, h * 0.025), deeper, null);
  }

  // roda dianteira do lado visível
  const wheelX = frontBottomX - hw * 0.06;
  const wheelY = -h * 0.135;
  const wheelR = h * 0.135;
  sideWheel(ctx, wheelX, wheelY, wheelR, lw);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, wheelR * 1.1, Math.PI * 1.02, Math.PI * 1.98);
  ctx.stroke();
  if (detail) {
    ctx.strokeStyle = light;
    ctx.lineWidth = Math.max(0.8, lw * 0.7);
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelR * 1.16, Math.PI * 1.12, Math.PI * 1.6);
    ctx.stroke();
  }

  // traseira, comprimida e deslocada para o lado oposto ao da curva
  ctx.save();
  ctx.translate(shift, 0);
  ctx.scale(rearScale, 1);
  rearBody(ctx, w, h, paint, opts, 'far');
  ctx.restore();

  // retrovisor dianteiro do lado visível
  const mirrorX = frontTopX - hw * 0.02;
  const mirrorY = -h * 0.665;
  ctx.strokeStyle = deeper;
  ctx.lineWidth = Math.max(0.8, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(mirrorX - hw * 0.04, mirrorY + h * 0.01);
  ctx.lineTo(mirrorX + hw * 0.04, mirrorY);
  ctx.stroke();
  roundedRect(
    ctx,
    mirrorX,
    mirrorY - h * 0.025,
    Math.max(1, hw * 0.14),
    Math.max(1, h * 0.055),
    h * 0.012,
    body,
    OUTLINE,
    lw * 0.55,
  );
}

/** Lateral do RX-7, sempre olhando para a direita. */
function sideBody(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  paint: CarPaint,
  opts: CarDrawOptions,
  includeFront: boolean,
): void {
  const hw = w / 2;
  const body = paint.body;
  const dark = shade(body, -0.36);
  const deeper = shade(body, -0.66);
  const light = shade(body, 0.34);
  const accent = paint.accent;
  const lw = lineWidth(w);
  const detail = w >= 32 && h >= 18;

  const wheelR = h * 0.17;
  const wheelY = -h * 0.17;
  const rearX = -hw * 0.58;
  const frontX = hw * 0.56;

  // rodas (o corpo cobre a metade superior)
  sideWheel(ctx, rearX, wheelY, wheelR, lw);
  sideWheel(ctx, frontX, wheelY, wheelR, lw);

  // silhueta lateral
  shape(
    ctx,
    [
      [-hw * 0.96, -h * 0.19],
      [-hw * 0.99, -h * 0.3],
      [-hw * 0.94, -h * 0.48],
      [-hw * 0.82, -h * 0.58],
      [-hw * 0.6, -h * 0.6],
      [-hw * 0.52, -h * 0.88],
      [-hw * 0.28, -h * 0.96],
      [hw * 0.02, -h * 0.97],
      [hw * 0.16, -h * 0.86],
      [hw * 0.42, -h * 0.66],
      [hw * 0.7, -h * 0.54],
      [hw * 0.9, -h * 0.44],
      [hw * 0.98, -h * 0.34],
      [hw * 0.97, -h * 0.25],
      [hw * 0.92, -h * 0.19],
    ],
    body,
    OUTLINE,
    lw,
  );

  // sombra inferior / saia lateral
  shape(
    ctx,
    [
      [-hw * 0.94, -h * 0.19],
      [-hw * 0.9, -h * 0.26],
      [hw * 0.9, -h * 0.26],
      [hw * 0.92, -h * 0.19],
    ],
    dark,
    null,
  );
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1, h * 0.014);
  ctx.beginPath();
  ctx.moveTo(-hw * 0.72, -h * 0.245);
  ctx.lineTo(hw * 0.74, -h * 0.245);
  ctx.stroke();

  // vidros laterais
  shape(
    ctx,
    [
      [-hw * 0.5, -h * 0.62],
      [-hw * 0.44, -h * 0.86],
      [hw * 0.02, -h * 0.89],
      [hw * 0.14, -h * 0.81],
      [hw * 0.34, -h * 0.66],
      [hw * 0.02, -h * 0.63],
    ],
    GLASS,
    OUTLINE,
    lw * 0.85,
  );
  if (detail) {
    shape(
      ctx,
      [
        [-hw * 0.39, -h * 0.8],
        [-hw * 0.31, -h * 0.84],
        [-hw * 0.02, -h * 0.855],
        [-hw * 0.02, -h * 0.8],
      ],
      GLASS_HI,
      null,
    );
  }
  // coluna B
  box(ctx, -hw * 0.16, -h * 0.86, Math.max(1, hw * 0.05), h * 0.25, deeper, OUTLINE, lw * 0.45);

  // linha da porta e maçaneta
  ctx.strokeStyle = deeper;
  ctx.lineWidth = Math.max(0.8, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(-hw * 0.05, -h * 0.62);
  ctx.lineTo(-hw * 0.03, -h * 0.22);
  ctx.stroke();
  if (detail) {
    box(ctx, -hw * 0.14, -h * 0.57, hw * 0.07, Math.max(1, h * 0.024), deeper, null);
  }

  // entrada de ar / detalhe da porta
  if (detail) {
    shape(
      ctx,
      [
        [hw * 0.1, -h * 0.48],
        [hw * 0.24, -h * 0.45],
        [hw * 0.24, -h * 0.4],
        [hw * 0.1, -h * 0.42],
      ],
      darker(body),
      null,
    );
  }

  // retrovisor
  const mx = hw * 0.3;
  ctx.strokeStyle = deeper;
  ctx.lineWidth = Math.max(0.8, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(mx, -h * 0.66);
  ctx.lineTo(mx + hw * 0.05, -h * 0.69);
  ctx.stroke();
  roundedRect(
    ctx,
    mx + hw * 0.03,
    -h * 0.71,
    Math.max(1, hw * 0.1),
    Math.max(1, h * 0.05),
    h * 0.012,
    body,
    OUTLINE,
    lw * 0.55,
  );

  // aerofólio traseiro
  if (detail) {
    box(ctx, -hw * 0.74, -h * 0.62, Math.max(1, hw * 0.05), h * 0.13, deeper, OUTLINE, lw * 0.5);
    shape(
      ctx,
      [
        [-hw * 0.96, -h * 0.75],
        [-hw * 0.94, -h * 0.7],
        [-hw * 0.54, -h * 0.7],
        [-hw * 0.52, -h * 0.75],
      ],
      body,
      OUTLINE,
      lw,
    );
    box(ctx, -hw * 0.93, -h * 0.748, hw * 0.4, Math.max(1, h * 0.014), deeper, null);
    roundedRect(
      ctx,
      -hw * 0.98,
      -h * 0.77,
      Math.max(1, hw * 0.07),
      h * 0.075,
      h * 0.01,
      accent,
      OUTLINE,
      lw * 0.5,
    );
  }

  // capô e faróis escamoteáveis (fechados)
  shape(
    ctx,
    [
      [hw * 0.56, -h * 0.53],
      [hw * 0.8, -h * 0.48],
      [hw * 0.8, -h * 0.44],
      [hw * 0.56, -h * 0.48],
    ],
    light,
    OUTLINE,
    lw * 0.6,
  );

  if (includeFront) {
    // para-choque e grade dianteira
    shape(
      ctx,
      [
        [hw * 0.78, -h * 0.4],
        [hw * 0.98, -h * 0.34],
        [hw * 0.97, -h * 0.25],
        [hw * 0.92, -h * 0.19],
        [hw * 0.76, -h * 0.19],
      ],
      body,
      OUTLINE,
      lw,
    );
    roundedRect(ctx, hw * 0.78, -h * 0.31, hw * 0.18, h * 0.08, h * 0.015, '#14141f', OUTLINE, lw * 0.55);
    for (let i = 0; i < 3; i += 1) {
      box(
        ctx,
        hw * (0.81 + i * 0.045),
        -h * 0.295,
        Math.max(0.8, hw * 0.018),
        h * 0.05,
        deeper,
        null,
      );
    }
    box(ctx, hw * 0.75, -h * 0.37, Math.max(1, hw * 0.06), Math.max(1, h * 0.03), AMBER, OUTLINE, lw * 0.45);
    disc(ctx, hw * 0.86, -h * 0.385, Math.max(1, h * 0.022), '#cdd5e6', OUTLINE, lw * 0.45);
    box(ctx, hw * 0.74, -h * 0.205, hw * 0.24, Math.max(1, h * 0.025), '#11111a', null);
  }

  // arcos das caixas de roda
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  for (const wx of [rearX, frontX]) {
    ctx.beginPath();
    ctx.arc(wx, wheelY, wheelR * 1.06, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
  }
  if (detail) {
    ctx.strokeStyle = light;
    ctx.lineWidth = Math.max(0.8, lw * 0.7);
    for (const wx of [rearX, frontX]) {
      ctx.beginPath();
      ctx.arc(wx, wheelY, wheelR * 1.13, Math.PI * 1.14, Math.PI * 1.62);
      ctx.stroke();
    }
  }
}

function darker(hex: string): string {
  return shade(hex, -0.5);
}

/** Frente do RX-7, vista de frente. */
function drawFront(ctx: CanvasRenderingContext2D, w: number, h: number, paint: CarPaint, opts: CarDrawOptions): void {
  const hw = w / 2;
  const body = paint.body;
  const dark = shade(body, -0.36);
  const deeper = shade(body, -0.66);
  const light = shade(body, 0.34);
  const accent = paint.accent;
  const lw = lineWidth(w);
  const detail = w >= 28 && h >= 20;

  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.008, hw * 0.9, h * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  rearWheel(ctx, -hw * 0.92, 0, hw * 0.19, h * 0.25, detail, lw);
  rearWheel(ctx, hw * 0.92, 0, hw * 0.19, h * 0.25, detail, lw);

  // silhueta frontal
  shape(
    ctx,
    [
      [-hw * 0.86, -h * 0.14],
      [-hw * 1.0, -h * 0.28],
      [-hw * 0.98, -h * 0.43],
      [-hw * 0.9, -h * 0.53],
      [-hw * 0.72, -h * 0.6],
      [-hw * 0.52, -h * 0.65],
      [-hw * 0.4, -h * 0.86],
      [hw * 0.4, -h * 0.86],
      [hw * 0.52, -h * 0.65],
      [hw * 0.72, -h * 0.6],
      [hw * 0.9, -h * 0.53],
      [hw * 0.98, -h * 0.43],
      [hw * 1.0, -h * 0.28],
      [hw * 0.86, -h * 0.14],
    ],
    body,
    OUTLINE,
    lw,
  );

  // para-choque inferior
  shape(
    ctx,
    [
      [-hw * 0.86, -h * 0.14],
      [-hw * 0.95, -h * 0.24],
      [hw * 0.95, -h * 0.24],
      [hw * 0.86, -h * 0.14],
    ],
    dark,
    null,
  );

  // para-brisa
  shape(
    ctx,
    [
      [-hw * 0.48, -h * 0.64],
      [-hw * 0.36, -h * 0.84],
      [hw * 0.36, -h * 0.84],
      [hw * 0.48, -h * 0.64],
    ],
    GLASS,
    OUTLINE,
    lw * 0.9,
  );
  if (detail) {
    shape(
      ctx,
      [
        [-hw * 0.3, -h * 0.82],
        [-hw * 0.1, -h * 0.82],
        [-hw * 0.24, -h * 0.66],
        [-hw * 0.42, -h * 0.66],
      ],
      GLASS_HI,
      null,
    );
  }

  // teto
  shape(
    ctx,
    [
      [-hw * 0.4, -h * 0.89],
      [-hw * 0.34, -h * 0.84],
      [hw * 0.34, -h * 0.84],
      [hw * 0.4, -h * 0.89],
    ],
    body,
    OUTLINE,
    lw * 0.8,
  );

  // capô baixo e faróis escamoteáveis fechados
  for (const s of [-1, 1]) {
    shape(
      ctx,
      [
        [s * hw * 0.52, -h * 0.55],
        [s * hw * 0.78, -h * 0.49],
        [s * hw * 0.78, -h * 0.455],
        [s * hw * 0.52, -h * 0.5],
      ],
      light,
      OUTLINE,
      lw * 0.6,
    );
  }

  // grade larga
  roundedRect(ctx, -hw * 0.56, -h * 0.31, hw * 1.12, h * 0.105, h * 0.02, '#14141f', OUTLINE, lw * 0.7);
  box(ctx, -hw * 0.5, -h * 0.285, hw * 1.0, Math.max(1, h * 0.022), deeper, null);
  for (let i = -4; i <= 4; i += 1) {
    box(ctx, i * hw * 0.11 - hw * 0.009, -h * 0.3, Math.max(0.7, hw * 0.018), h * 0.068, deeper, null);
  }
  // setas âmbar
  for (const s of [-1, 1]) {
    roundedRect(
      ctx,
      s < 0 ? -hw * 0.78 : hw * 0.66,
      -h * 0.38,
      Math.max(1, hw * 0.12),
      Math.max(1, h * 0.038),
      h * 0.01,
      AMBER,
      OUTLINE,
      lw * 0.45,
    );
  }
  // emblema
  disc(ctx, 0, -h * 0.42, Math.max(1, h * 0.028), '#cdd5e6', OUTLINE, lw * 0.5);
  // placa
  if (detail) {
    roundedRect(ctx, -hw * 0.16, -h * 0.245, hw * 0.32, h * 0.09, h * 0.012, PLATE, OUTLINE, lw * 0.55);
    box(ctx, -hw * 0.1, -h * 0.21, hw * 0.2, Math.max(0.9, h * 0.018), '#3b3b2b', null);
  }
  // lip frontal
  box(ctx, -hw * 0.8, -h * 0.16, hw * 1.6, Math.max(1, h * 0.025), '#11111a', null);
  // faixa de destaque
  box(ctx, -hw * 0.7, -h * 0.185, hw * 1.4, Math.max(0.8, h * 0.01), accent, null);

  // retrovisores
  for (const s of [-1, 1]) {
    roundedRect(
      ctx,
      s < 0 ? -hw * 1.08 : hw * 0.94,
      -h * 0.69,
      Math.max(1, hw * 0.14),
      Math.max(1, h * 0.055),
      h * 0.012,
      body,
      OUTLINE,
      lw * 0.55,
    );
  }

  if (opts.brake) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(-hw * 0.8, -h * 0.34, hw * 1.6, h * 0.1);
    ctx.globalAlpha = 1;
  }
}

/** Frente 3/4: lateral comprimida + frente aplicada sobre o bico. */
function drawFrontQuarter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  paint: CarPaint,
  opts: CarDrawOptions,
): void {
  const hw = w / 2;
  const body = paint.body;
  const dark = shade(body, -0.36);
  const deeper = shade(body, -0.66);
  const light = shade(body, 0.34);
  const accent = paint.accent;
  const lw = lineWidth(w);
  const detail = w >= 32 && h >= 18;

  // sombra na largura total
  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.beginPath();
  ctx.ellipse(-hw * 0.05, -h * 0.008, hw * 0.92, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // lateral comprimida (deixa espaço para a frente)
  ctx.save();
  ctx.translate(-hw * 0.02, 0);
  ctx.scale(0.92, 1);
  sideBody(ctx, w, h, paint, opts, false);
  ctx.restore();

  // frente aplicada sobre o bico
  const noseX = hw * 0.72;
  const noseTop = -h * 0.5;
  const noseRight = hw * 0.99;
  const noseBottom = -h * 0.19;
  shape(
    ctx,
    [
      [noseX, noseTop],
      [noseRight, -h * 0.44],
      [noseRight, -h * 0.27],
      [noseRight - hw * 0.02, noseBottom],
      [noseX, noseBottom],
    ],
    body,
    OUTLINE,
    lw,
  );

  // capô / farol escamoteável
  shape(
    ctx,
    [
      [noseX + hw * 0.02, -h * 0.47],
      [noseRight - hw * 0.16, -h * 0.41],
      [noseRight - hw * 0.16, -h * 0.375],
      [noseX + hw * 0.02, -h * 0.43],
    ],
    light,
    OUTLINE,
    lw * 0.6,
  );

  // grade frontal
  roundedRect(
    ctx,
    noseX + hw * 0.03,
    -h * 0.31,
    hw * 0.24,
    h * 0.095,
    h * 0.018,
    '#14141f',
    OUTLINE,
    lw * 0.6,
  );
  for (let i = 0; i < 3; i += 1) {
    box(
      ctx,
      noseX + hw * (0.06 + i * 0.065),
      -h * 0.295,
      Math.max(0.8, hw * 0.02),
      h * 0.065,
      deeper,
      null,
    );
  }

  // seta, emblema e placa
  box(ctx, noseX - hw * 0.005, -h * 0.37, Math.max(1, hw * 0.06), Math.max(1, h * 0.03), AMBER, OUTLINE, lw * 0.45);
  disc(ctx, noseX + hw * 0.16, -h * 0.385, Math.max(1, h * 0.022), '#cdd5e6', OUTLINE, lw * 0.45);
  if (detail) {
    roundedRect(
      ctx,
      noseX + hw * 0.1,
      -h * 0.245,
      hw * 0.16,
      h * 0.08,
      h * 0.012,
      PLATE,
      OUTLINE,
      lw * 0.5,
    );
  }

  // lip e faixa de destaque
  box(ctx, noseX, -h * 0.16, hw * 0.27, Math.max(1, h * 0.025), '#11111a', null);
  box(ctx, noseX + hw * 0.02, -h * 0.19, hw * 0.23, Math.max(0.8, h * 0.01), accent, null);

  // retrovisor próximo
  roundedRect(
    ctx,
    hw * 0.34,
    -h * 0.71,
    Math.max(1, hw * 0.1),
    Math.max(1, h * 0.05),
    h * 0.012,
    body,
    OUTLINE,
    lw * 0.55,
  );

  // arco da roda dianteira, por cima da frente
  const wheelR = h * 0.17;
  const wheelY = -h * 0.17;
  const frontX = hw * 0.49;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(frontX, wheelY, wheelR * 1.06, Math.PI * 1.02, Math.PI * 1.98);
  ctx.stroke();
  if (detail) {
    ctx.strokeStyle = light;
    ctx.lineWidth = Math.max(0.8, lw * 0.7);
    ctx.beginPath();
    ctx.arc(frontX, wheelY, wheelR * 1.13, Math.PI * 1.14, Math.PI * 1.62);
    ctx.stroke();
  }
}

/**
 * Desenha o Mazda RX-7 (FD) em qualquer vista.
 * (cx, baseY) = centro inferior em pixels.
 */
export function drawRx7(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  paint: CarPaint,
  opts: CarDrawOptions = {},
): void {
  if (w < 2 || h < 2) return;

  const view: Rx7View = opts.view ?? (Math.abs(opts.steer ?? 0) > 0.02 ? 'rearQuarter' : 'rear');

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(baseY));
  if (opts.tilt) ctx.rotate(opts.tilt * 0.055);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (view) {
    case 'rear':
      drawRear(ctx, w, h, paint, opts);
      break;

    case 'rearQuarter': {
      const steer = opts.steer ?? 1;
      const turn = Math.max(0.15, Math.min(1, Math.abs(steer)));
      if (steer < 0) ctx.scale(-1, 1);
      drawRearQuarter(ctx, w, h, paint, opts, turn);
      break;
    }

    case 'side':
      drawSideShadow(ctx, w, h);
      sideBody(ctx, w, h, paint, opts, true);
      break;

    case 'frontQuarter':
      drawFrontQuarter(ctx, w, h, paint, opts);
      break;

    case 'front':
      drawFront(ctx, w, h, paint, opts);
      break;
  }

  ctx.restore();
}

function drawSideShadow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.008, (w / 2) * 0.92, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
}
