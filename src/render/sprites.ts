import type { CarStyle } from '../entities/carspecs';
import { shade } from './color';
import type { SpriteKind } from './pseudo3d';
import { drawRx7, type Rx7View } from './rx7';

export interface CarPaint {
  body: string;
  accent: string;
  style?: CarStyle;
}

export interface CarDrawOptions {
  brake?: boolean;
  nitro?: boolean;
  tilt?: number;
  /** -1 (esquerda) a 1 (direita): mostra o carro em 3/4, com a lateral do lado da curva. */
  steer?: number;
  /** Vista específica para carros com sprites dedicados (RX-7). */
  view?: Rx7View;
  player?: boolean;
}

function poly(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: string, outlineColor?: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
  if (outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
/** Carro visto de trás. (cx, baseY) = centro inferior em pixels. */
export function drawCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  paint: CarPaint,
  opts: CarDrawOptions = {},
): void {
  if (w < 2 || h < 2) return;

  // Carros com sprite dedicado (RX-7) usam o renderizador por vistas.
  if (paint.style === 'rx7') {
    drawRx7(ctx, cx, baseY, w, h, paint, opts);
    return;
  }

  const half = w / 2;
  const style = paint.style ?? 'gt';
  const tilt = opts.tilt ?? 0;
  const steer = Math.max(-1, Math.min(1, opts.steer ?? 0));
  const turn = Math.abs(steer);
  const side = steer >= 0 ? 1 : -1;
  const detail = w >= 16 && h >= 13;

  const body = paint.body;
  const dark = shade(body, -0.42);
  const deeper = shade(body, -0.68);
  const light = shade(body, 0.34);
  const accent = paint.accent;
  const roofHalf = half * (style === 'light' ? 0.54 : style === 'muscle' ? 0.64 : 0.6);

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(baseY));
  if (tilt !== 0) ctx.rotate(tilt * 0.055);
  // Cisalhamento horizontal: o topo (frente) acompanha a direção da curva,
  // dando a leitura de carro em 3/4 em vez de apenas inclinado.
  if (steer !== 0) {
    ctx.scale(1 + 0.06 * turn, 1);
    ctx.transform(1, 0, -steer * 0.24, 1, 0, 0);
  }

  // sombra no asfalto
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.015, half * 0.78, Math.max(1, h * 0.085), 0, 0, Math.PI * 2);
  ctx.fill();

  // pneus traseiros
  const wheelW = Math.max(1, half * 0.2);
  const wheelH = h * 0.25;
  ctx.fillStyle = '#0c0c13';
  ctx.fillRect(-half * 0.98, -wheelH, wheelW, wheelH);
  ctx.fillRect(half * 0.98 - wheelW, -wheelH, wheelW, wheelH);
  if (detail) {
    ctx.fillStyle = '#39405a';
    ctx.fillRect(-half * 0.95, -wheelH * 0.72, Math.max(1, wheelW * 0.5), Math.max(1, wheelH * 0.38));
    ctx.fillRect(half * 0.95 - wheelW * 0.5, -wheelH * 0.72, Math.max(1, wheelW * 0.5), Math.max(1, wheelH * 0.38));
  }

  // silhueta da carroceria (ombros largos, cabine estreita)
  poly(
    ctx,
    [
      [-half * 0.9, -h * 0.11],
      [-half * 1.0, -h * 0.3],
      [-half * 0.9, -h * 0.56],
      [-half * 0.72, -h * 0.64],
      [-roofHalf, -h * 0.95],
      [roofHalf, -h * 0.95],
      [half * 0.72, -h * 0.64],
      [half * 0.9, -h * 0.56],
      [half * 1.0, -h * 0.3],
      [half * 0.9, -h * 0.11],
    ],
    body,
    '#000',
  );

  // vão escuro entre as rodas
  ctx.fillStyle = '#07070c';
  ctx.fillRect(-half * 0.72, -h * 0.11, half * 1.44, h * 0.09);

  // parte baixa mais escura
  poly(
    ctx,
    [
      [-half * 0.9, -h * 0.11],
      [-half * 1.0, -h * 0.22],
      [half * 1.0, -h * 0.22],
      [half * 0.9, -h * 0.11],
    ],
    dark,
  );

  // lateral visível na curva (visão 3/4)
  if (turn > 0.02) {
    const yTop = -h * 0.64;
    const yBottom = -h * 0.13;
    const innerTop = half * 0.6;
    const innerBottom = half * 0.8;
    const outerTop = half * (0.94 + 0.14 * turn);
    const outerBottom = half * (1.08 + 0.42 * turn);
    const mirror = (points: Array<[number, number]>): Array<[number, number]> =>
      side > 0 ? points : points.map(([x, y]) => [-x, y] as [number, number]);

    poly(
      ctx,
      mirror([
        [innerBottom, yBottom],
        [innerTop, yTop],
        [outerTop, yTop],
        [outerBottom, yBottom],
      ]),
      dark,
      '#000',
    );

    // brilho na aresta superior da lateral
    poly(
      ctx,
      mirror([
        [innerTop, yTop],
        [outerTop, yTop],
        [outerTop - half * 0.02, yTop + Math.max(1, h * 0.025)],
        [innerTop, yTop + Math.max(1, h * 0.025)],
      ]),
      light,
    );

    if (detail) {
      // soleira / saia lateral com a cor de destaque
      poly(
        ctx,
        mirror([
          [innerBottom, yBottom],
          [outerBottom, yBottom],
          [outerBottom - half * 0.03, yBottom + h * 0.035],
          [innerBottom + half * 0.02, yBottom + h * 0.035],
        ]),
        accent,
      );

      // vidro lateral
      if (turn > 0.22) {
        poly(
          ctx,
          mirror([
            [innerTop + half * 0.06, yTop + h * 0.04],
            [outerTop - half * 0.06, yTop + h * 0.02],
            [outerTop - half * 0.03, yTop + h * 0.17],
            [innerTop + half * 0.05, yTop + h * 0.2],
          ]),
          '#0d1524',
          '#000',
        );
      }

      // linha da porta
      ctx.strokeStyle = deeper;
      ctx.lineWidth = Math.max(1, w * 0.014);
      ctx.beginPath();
      ctx.moveTo(side * half * 0.74, -h * 0.52);
      ctx.lineTo(side * half * 0.96, -h * 0.18);
      ctx.stroke();

      // roda traseira do lado de fora, encaixada na lateral
      const outerWheelW = Math.max(1, half * 0.19);
      const outerWheelH = h * 0.25;
      const outerWheelX = half * (1.02 + 0.34 * turn);
      ctx.fillStyle = '#0c0c13';
      ctx.fillRect(
        side > 0 ? outerWheelX - outerWheelW * 0.5 : -outerWheelX - outerWheelW * 0.5,
        -outerWheelH,
        outerWheelW,
        outerWheelH,
      );
      ctx.fillStyle = '#39405a';
      ctx.fillRect(
        side > 0 ? outerWheelX - outerWheelW * 0.22 : -outerWheelX - outerWheelW * 0.22,
        -outerWheelH * 0.7,
        Math.max(1, outerWheelW * 0.44),
        Math.max(1, outerWheelH * 0.34),
      );
    }
  }

  // brilho no ombro e no teto
  if (detail) {
    ctx.fillStyle = light;
    ctx.fillRect(-half * 0.86, -h * 0.565, half * 1.72, Math.max(1, h * 0.025));
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-roofHalf * 0.9, -h * 0.935, roofHalf * 1.8, Math.max(1, h * 0.02));
  }

  // faixa de corrida no porta-malas
  if (detail && style !== 'light') {
    ctx.globalAlpha = 0.92;
    if (style === 'muscle') {
      poly(ctx, [[-half * 0.16, -h * 0.61], [-half * 0.06, -h * 0.61], [-half * 0.06, -h * 0.2], [-half * 0.16, -h * 0.2]], accent, '#000');
      poly(ctx, [[half * 0.06, -h * 0.61], [half * 0.16, -h * 0.61], [half * 0.16, -h * 0.2], [half * 0.06, -h * 0.2]], accent, '#000');
    } else {
      poly(ctx, [[-half * 0.08, -h * 0.61], [half * 0.08, -h * 0.61], [half * 0.08, -h * 0.2], [-half * 0.08, -h * 0.2]], accent, '#000');
    }
    ctx.globalAlpha = 1;
  }

  // vidro traseiro
  poly(
    ctx,
    [
      [-half * 0.5, -h * 0.62],
      [-half * 0.42, -h * 0.9],
      [half * 0.42, -h * 0.9],
      [half * 0.5, -h * 0.62],
    ],
    '#0d1524', '#000'
  );
  if (detail) {
    ctx.globalAlpha = 0.16;
    poly(
      ctx,
      [
        [-half * 0.34, -h * 0.62],
        [-half * 0.27, -h * 0.9],
        [-half * 0.1, -h * 0.9],
        [-half * 0.22, -h * 0.62],
      ],
      '#cfe8ff',
    );
    ctx.globalAlpha = 1;
  }

  // aerofólio / lip
  if (detail) {
    if (style === 'gt' || style === 'turbo') {
      const wingW = style === 'turbo' ? 1.04 : 0.94;
      const wingY = -h * 1.02;
      const wingH = Math.max(1, h * 0.06);
      ctx.fillStyle = deeper;
      ctx.fillRect(-half * 0.48, -h * 1.0, Math.max(1, half * 0.06), h * 0.07);
      ctx.fillRect(half * 0.42, -h * 1.0, Math.max(1, half * 0.06), h * 0.07);
      ctx.fillStyle = style === 'turbo' ? accent : dark;
      ctx.fillRect(-half * wingW, wingY, half * wingW * 2, wingH);
      // placas laterais do aerofólio
      ctx.fillStyle = deeper;
      ctx.fillRect(-half * wingW, wingY - h * 0.02, Math.max(1, half * 0.05), wingH + h * 0.04);
      ctx.fillRect(half * wingW - Math.max(1, half * 0.05), wingY - h * 0.02, Math.max(1, half * 0.05), wingH + h * 0.04);
      ctx.fillStyle = light;
      ctx.fillRect(-half * wingW, wingY, half * wingW * 2, Math.max(1, wingH * 0.3));
    } else if (style === 'light') {
      ctx.fillStyle = accent;
      ctx.fillRect(-half * 0.58, -h * 0.665, half * 1.16, Math.max(1, h * 0.035));
    }
  }

  // lanternas
  const lampY = -h * 0.42;
  const lampH = Math.max(1, h * 0.09);
  const lampColor = opts.brake ? '#ff5a5a' : '#e01f34';
  if (detail) {
    if (style === 'light') {
      ctx.fillStyle = '#12121c';
      ctx.fillRect(-half * 0.64, lampY - 1, half * 1.28, lampH + 2);
      ctx.fillStyle = lampColor;
      ctx.fillRect(-half * 0.62, lampY, half * 1.24, lampH);
    } else if (style === 'muscle') {
      for (const side of [-1, 1]) {
        for (const extra of [0, 0.17]) {
          const lx = side * (half * 0.52 + half * extra);
          ctx.fillStyle = lampColor;
          ctx.fillRect(lx - half * 0.075, lampY, half * 0.15, lampH);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-half * 0.78, lampY - 1, half * 0.34, lampH + 2);
      ctx.fillRect(half * 0.44, lampY - 1, half * 0.34, lampH + 2);
      ctx.fillStyle = lampColor;
      ctx.fillRect(-half * 0.76, lampY, half * 0.3, lampH);
      ctx.fillRect(half * 0.46, lampY, half * 0.3, lampH);
      ctx.fillStyle = opts.brake ? '#ffd0d0' : '#ff8a96';
      ctx.fillRect(-half * 0.72, lampY + lampH * 0.3, half * 0.18, Math.max(1, lampH * 0.35));
      ctx.fillRect(half * 0.54, lampY + lampH * 0.3, half * 0.18, Math.max(1, lampH * 0.35));
    }
    if (opts.brake) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(-half * 0.95, lampY - h * 0.04, half * 1.9, lampH + h * 0.08);
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = lampColor;
    ctx.fillRect(-half * 0.7, lampY, Math.max(1, half * 0.3), lampH);
    ctx.fillRect(half * 0.4, lampY, Math.max(1, half * 0.3), lampH);
  }

  // para-choque, difusor, placa e escapamentos
  if (detail) {
    ctx.fillStyle = '#14141f';
    ctx.fillRect(-half * 0.88, -h * 0.19, half * 1.76, h * 0.06);

    ctx.fillStyle = deeper;
    for (let i = -2; i <= 2; i += 1) {
      ctx.fillRect(half * 0.1 * i, -h * 0.15, Math.max(1, half * 0.03), h * 0.04);
    }

    ctx.fillStyle = '#d8dceb';
    ctx.fillRect(-half * 0.14, -h * 0.26, half * 0.28, h * 0.06);
    ctx.fillStyle = '#4a4f63';
    ctx.fillRect(-half * 0.1, -h * 0.245, half * 0.2, Math.max(1, h * 0.018));

    ctx.fillStyle = '#2a2e3f';
    ctx.fillRect(-half * 0.46, -h * 0.115, Math.max(2, half * 0.12), Math.max(1, h * 0.032));
    ctx.fillRect(half * 0.34, -h * 0.115, Math.max(2, half * 0.12), Math.max(1, h * 0.032));

    // retrovisores
    ctx.fillStyle = dark;
    ctx.fillRect(-half * 0.94, -h * 0.6, Math.max(1, half * 0.12), Math.max(1, h * 0.05));
    ctx.fillRect(half * 0.82, -h * 0.6, Math.max(1, half * 0.12), Math.max(1, h * 0.05));
  }

  // chamariz de nitro nos escapamentos
  if (opts.nitro) {
    const flame = h * 0.14;
    for (const fx of [-half * 0.4, half * 0.4]) {
      const fw = Math.max(1, half * 0.09);
      poly(ctx, [[fx - fw, -h * 0.02], [fx, flame], [fx + fw, -h * 0.02]], '#ffb52e');
      poly(ctx, [[fx - fw * 0.5, -h * 0.02], [fx, flame * 0.6], [fx + fw * 0.5, -h * 0.02]], '#fff4c2');
    }
  }

  ctx.strokeStyle = '#000';
  ctx.restore();
}

const SCENERY: Record<SpriteKind, [number, number]> = {
  tree: [1050, 1650],
  cactus: [620, 1150],
  palm: [1250, 1950],
  rock: [900, 620],
  sign: [700, 950],
  billboard: [1250, 1450],
  lamp: [520, 1750],
  building: [1700, 2700],
  stand: [2400, 1300],
  bush: [700, 480],
  pitsign: [560, 720],
  pitbox: [2100, 1100],
};

export function spriteWorldSize(kind: SpriteKind, size: number): [number, number] {
  const [w, h] = SCENERY[kind];
  return [w * size, h * size];
}

/** Cenário desenhado como silhueta + detalhes, sem assets externos. */
export function drawScenery(
  ctx: CanvasRenderingContext2D,
  kind: SpriteKind,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  night: boolean,
): void {
  if (w < 1 || h < 1) return;

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(baseY));

  const dark = night ? '#0d0d18' : '#1d2a20';

  switch (kind) {
    case 'tree': {
      ctx.fillStyle = night ? '#241a14' : '#5a3a22';
      ctx.fillRect(-w * 0.08, -h * 0.45, Math.max(1, w * 0.16), h * 0.45);
      ctx.fillStyle = night ? '#16301f' : '#2f7a3a';
      poly(
        ctx,
        [
          [0, -h],
          [-w * 0.5, -h * 0.38],
          [-w * 0.28, -h * 0.45],
          [-w * 0.38, -h * 0.2],
          [w * 0.38, -h * 0.2],
          [w * 0.28, -h * 0.45],
          [w * 0.5, -h * 0.38],
        ],
        night ? '#16301f' : '#2f7a3a',
      );
      ctx.fillStyle = night ? '#1d3f28' : '#3f9c4a';
      poly(
        ctx,
        [
          [0, -h],
          [-w * 0.22, -h * 0.5],
          [0, -h * 0.58],
          [w * 0.22, -h * 0.5],
        ],
        night ? '#1d3f28' : '#3f9c4a',
      );
      break;
    }
    case 'cactus': {
      ctx.fillStyle = dark;
      ctx.fillRect(-w * 0.1, -h, Math.max(1, w * 0.2), h);
      ctx.fillRect(-w * 0.34, -h * 0.72, Math.max(1, w * 0.24), Math.max(1, h * 0.1));
      ctx.fillRect(-w * 0.34, -h * 0.72, Math.max(1, w * 0.1), h * 0.32);
      ctx.fillRect(w * 0.1, -h * 0.55, Math.max(1, w * 0.24), Math.max(1, h * 0.1));
      ctx.fillRect(w * 0.24, -h * 0.55, Math.max(1, w * 0.1), h * 0.24);
      break;
    }
    case 'palm': {
      ctx.fillStyle = night ? '#2a2018' : '#6b4a2a';
      poly(
        ctx,
        [
          [-w * 0.06, 0],
          [w * 0.06, 0],
          [w * 0.02, -h * 0.72],
          [-w * 0.02, -h * 0.72],
        ],
        night ? '#2a2018' : '#6b4a2a',
      );
      ctx.fillStyle = night ? '#16301f' : '#2f9e63';
      for (let i = 0; i < 5; i += 1) {
        const angle = (-Math.PI / 2) + (i - 2) * 0.42;
        const len = w * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.72);
        ctx.lineTo(Math.cos(angle) * len, -h * 0.72 + Math.sin(angle) * len * 0.55);
        ctx.lineTo(Math.cos(angle) * len * 0.8, -h * 0.72 + Math.sin(angle) * len * 0.55 + h * 0.05);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'rock': {
      poly(
        ctx,
        [
          [-w * 0.5, 0],
          [-w * 0.34, -h * 0.8],
          [-w * 0.08, -h],
          [w * 0.2, -h * 0.86],
          [w * 0.48, 0],
        ],
        night ? '#2a2a38' : '#8a7f70',
      );
      break;
    }
    case 'bush': {
      ctx.fillStyle = night ? '#14261b' : '#2f7a3a';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.45, w * 0.5, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sign': {
      ctx.fillStyle = '#4a4a55';
      ctx.fillRect(-w * 0.04, -h * 0.55, Math.max(1, w * 0.08), h * 0.55);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-w * 0.36, -h, Math.max(1, w * 0.72), Math.max(1, h * 0.44));
      ctx.fillStyle = '#20202a';
      const rows = 3;
      for (let i = 0; i < rows; i += 1) {
        ctx.fillRect(-w * 0.26, -h * 0.92 + i * h * 0.11, w * 0.5, Math.max(1, h * 0.04));
      }
      break;
    }
    case 'billboard': {
      ctx.fillStyle = '#3a3a46';
      ctx.fillRect(-w * 0.05, -h * 0.5, Math.max(1, w * 0.1), h * 0.5);
      ctx.fillStyle = night ? '#241a38' : '#22e0ff';
      ctx.fillRect(-w * 0.5, -h, Math.max(1, w), Math.max(1, h * 0.55));
      ctx.fillStyle = night ? '#ff3d7f' : '#0b0d17';
      ctx.fillRect(-w * 0.4, -h * 0.9, w * 0.8, Math.max(1, h * 0.1));
      ctx.fillRect(-w * 0.3, -h * 0.72, w * 0.6, Math.max(1, h * 0.08));
      break;
    }
    case 'lamp': {
      ctx.fillStyle = '#3a3a4a';
      ctx.fillRect(-w * 0.05, -h, Math.max(1, w * 0.1), h);
      ctx.fillStyle = night ? '#ffe9a3' : '#d8d8e0';
      ctx.beginPath();
      ctx.arc(0, -h, Math.max(1, w * 0.16), 0, Math.PI * 2);
      ctx.fill();
      if (night) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#ffe9a3';
        ctx.beginPath();
        ctx.arc(0, -h, Math.max(2, w * 0.42), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'building': {
      ctx.fillStyle = night ? '#0f1220' : '#5a6070';
      ctx.fillRect(-w * 0.5, -h, Math.max(1, w), h);
      ctx.fillStyle = night ? '#ffd76a' : '#2a3040';
      // Limita a grade de janelas: um prédio muito próximo da câmera pode
      // ocupar milhares de pixels e travar o frame com milhares de fillRect.
      const cols = Math.min(14, Math.max(2, Math.floor(w / 12)));
      const rows = Math.min(20, Math.max(3, Math.floor(h / 16)));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if ((c + r * 3) % 4 === 0) continue;
          ctx.fillRect(
            -w * 0.42 + c * (w * 0.84 / cols),
            -h * 0.94 + r * (h * 0.9 / rows),
            Math.max(1, (w * 0.84 / cols) * 0.45),
            Math.max(1, (h * 0.9 / rows) * 0.4),
          );
        }
      }
      break;
    }
    case 'stand': {
      ctx.fillStyle = night ? '#1a1a2a' : '#c86a3a';
      ctx.fillRect(-w * 0.5, -h, Math.max(1, w), h);
      ctx.fillStyle = night ? '#2a2a40' : '#e8e8f0';
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(-w * 0.46, -h + i * h * 0.24, w * 0.92, Math.max(1, h * 0.08));
      }
      break;
    }
    case 'pitsign': {
      // poste
      ctx.fillStyle = '#2f2f3d';
      ctx.fillRect(-w * 0.04, -h * 0.45, Math.max(1, w * 0.08), h * 0.45);
      // placa amarela com borda escura
      ctx.fillStyle = '#14141f';
      ctx.fillRect(-w * 0.52, -h, Math.max(1, w * 1.04), h * 0.6);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-w * 0.49, -h * 0.96, Math.max(1, w * 0.98), h * 0.52);
      // texto PIT
      ctx.fillStyle = '#14141f';
      ctx.font = `bold ${Math.max(3, Math.round(h * 0.26))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PIT', 0, -h * 0.78);
      // setas apontando para a direita (via de boxes)
      for (let i = 0; i < 2; i += 1) {
        const cx = -w * 0.1 + i * w * 0.22;
        poly(
          ctx,
          [
            [cx, -h * 0.62],
            [cx + w * 0.14, -h * 0.56],
            [cx, -h * 0.5],
          ],
          '#14141f',
        );
      }
      break;
    }
    case 'pitbox': {
      // corpo da garagem
      ctx.fillStyle = night ? '#151524' : '#7b8496';
      ctx.fillRect(-w * 0.5, -h * 0.72, Math.max(1, w), h * 0.72);
      // baias escuras
      ctx.fillStyle = night ? '#0a0a14' : '#2a3040';
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(-w * 0.42 + i * w * 0.3, -h * 0.66, w * 0.22, h * 0.62);
      }
      // teto com beiral e faixa amarela
      ctx.fillStyle = night ? '#20203a' : '#e8ecf5';
      ctx.fillRect(-w * 0.56, -h * 0.9, Math.max(1, w * 1.12), h * 0.18);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-w * 0.56, -h * 0.9, Math.max(1, w * 1.12), Math.max(1, h * 0.035));
      // placa PIT no telhado
      ctx.fillStyle = '#14141f';
      ctx.fillRect(-w * 0.16, -h * 0.84, Math.max(1, w * 0.32), h * 0.09);
      ctx.fillStyle = '#ffd23f';
      ctx.font = `bold ${Math.max(2, Math.round(h * 0.06))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PIT', 0, -h * 0.795);
      break;
    }
  }

  ctx.restore();
}
