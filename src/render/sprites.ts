import type { SpriteKind } from './pseudo3d';

export interface CarPaint {
  body: string;
  accent: string;
}

export interface CarDrawOptions {
  brake?: boolean;
  nitro?: boolean;
  tilt?: number;
  player?: boolean;
  carNumber?: number;
}

function poly(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor)));
  return `rgb(${r},${g},${b})`;
}

/** Carro visto de trás — versão com muitos detalhes visuais (sem assets externos). */
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

  const half = w / 2;
  const tilt = opts.tilt ?? 0;
  const bodyTop = -h * 0.8;
  const roofTop = -h;
  const dark = shade(paint.body, 0.72);
  const light = shade(paint.body, 1.18);
  const number = opts.carNumber ?? 0;

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(baseY));

  if (tilt !== 0) {
    ctx.rotate(tilt * 0.055);
  }

  // sombra projetada no chão
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.02, half * 0.75, Math.max(1, h * 0.1), 0, 0, Math.PI * 2);
  ctx.fill();

  // rodas (pneus + calota + parafusos)
  const wheelW = Math.max(1, half * 0.26);
  const wheelH = h * 0.32;
  ctx.fillStyle = '#101016';
  ctx.fillRect(-half * 0.95, -wheelH, wheelW, wheelH);
  ctx.fillRect(half * 0.95 - wheelW, -wheelH, wheelW, wheelH);
  if (h > 14) {
    ctx.fillStyle = '#3a3a48';
    const hubW = Math.max(1, wheelW * 0.5);
    const hubY = -wheelH + (wheelH - Math.max(1, h * 0.1)) / 2;
    ctx.fillRect(-half * 0.95 + (wheelW - hubW) / 2, hubY, hubW, Math.max(1, h * 0.1));
    ctx.fillRect(half * 0.95 - wheelW + (wheelW - hubW) / 2, hubY, hubW, Math.max(1, h * 0.1));
    // parafusos da calota
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(-half * 0.95 + hubW * 0.18, hubY + h * 0.03, 1, 1);
    ctx.fillRect(-half * 0.95 + hubW * 0.82, hubY + h * 0.03, 1, 1);
    ctx.fillRect(half * 0.95 - wheelW + hubW * 0.18, hubY + h * 0.03, 1, 1);
    ctx.fillRect(half * 0.95 - wheelW + hubW * 0.82, hubY + h * 0.03, 1, 1);
  }

  // para-lamas (saltam um pouco da carroceria)
  ctx.fillStyle = dark;
  ctx.fillRect(-half * 0.96, -h * 0.06, half * 0.14, h * 0.06);
  ctx.fillRect(half * 0.82, -h * 0.06, half * 0.14, h * 0.06);

  // carroceria principal
  poly(
    ctx,
    [
      [-half * 0.92, -h * 0.04],
      [-half * 0.8, bodyTop],
      [half * 0.8, bodyTop],
      [half * 0.92, -h * 0.04],
    ],
    paint.body,
  );

  // highlight superior (luz do céu)
  if (h > 10) {
    poly(
      ctx,
      [
        [-half * 0.8, bodyTop],
        [half * 0.8, bodyTop],
        [half * 0.62, bodyTop + h * 0.1],
        [-half * 0.62, bodyTop + h * 0.1],
      ],
      light,
    );
  }

  // reflexo lateral esquerdo (brilho de cromo)
  if (h > 14) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-half * 0.78, bodyTop + h * 0.06, Math.max(1, half * 0.04), h * 0.4);
  }

  // listra de corrida central (identidade do carro)
  if (h > 12) {
    ctx.fillStyle = paint.accent;
    ctx.fillRect(-half * 0.14, bodyTop + h * 0.06, half * 0.28, h * 0.5);
    // bordo da listra (linha fina escura)
    ctx.fillStyle = shade(paint.accent, 0.5);
    ctx.fillRect(-half * 0.145, bodyTop + h * 0.06, 1, h * 0.5);
    ctx.fillRect(half * 0.145 - 1, bodyTop + h * 0.06, 1, h * 0.5);
  }

  // teto / cabine (mais escuro)
  poly(
    ctx,
    [
      [-half * 0.62, bodyTop],
      [-half * 0.46, roofTop],
      [half * 0.46, roofTop],
      [half * 0.62, bodyTop],
    ],
    dark,
  );

  // vidro traseiro
  if (h > 10) {
    poly(
      ctx,
      [
        [-half * 0.44, bodyTop + h * 0.02],
        [-half * 0.36, roofTop + h * 0.07],
        [half * 0.36, roofTop + h * 0.07],
        [half * 0.44, bodyTop + h * 0.02],
      ],
      '#0e1424',
    );
    // reflexo no vidro
    if (h > 18) {
      ctx.fillStyle = 'rgba(170,220,255,0.4)';
      ctx.fillRect(-half * 0.32, roofTop + h * 0.08, half * 0.24, Math.max(1, h * 0.05));
    }
    // adesivo de faixa no vidro (estilo corrida)
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-half * 0.42, roofTop + h * 0.18, half * 0.84, Math.max(1, h * 0.02));
  }

  // lanternas traseiras (com brilho quando freando)
  const lampW = Math.max(1, half * 0.26);
  const lampH = Math.max(1, h * 0.11);
  ctx.fillStyle = opts.brake ? '#ff5050' : '#c01f2e';
  ctx.fillRect(-half * 0.76, bodyTop + h * 0.16, lampW, lampH);
  ctx.fillRect(half * 0.76 - lampW, bodyTop + h * 0.16, lampW, lampH);
  if (opts.brake && h > 10) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ff5050';
    ctx.fillRect(-half * 0.76 - 1, bodyTop + h * 0.16 - 1, lampW + 2, lampH + 2);
    ctx.fillRect(half * 0.76 - lampW - 1, bodyTop + h * 0.16 - 1, lampW + 2, lampH + 2);
    ctx.globalAlpha = 1;
  }
  // reflexo branco nas lanternas
  if (h > 12) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-half * 0.72, bodyTop + h * 0.18, Math.max(1, lampW * 0.35), Math.max(1, lampH * 0.4));
    ctx.fillRect(half * 0.72 - lampW * 0.35, bodyTop + h * 0.18, Math.max(1, lampW * 0.35), Math.max(1, lampH * 0.4));
  }

  if (h > 12) {
    // faixa do para-choque inferior
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(-half * 0.9, -h * 0.14, half * 1.8, Math.max(1, h * 0.09));

    // placa do carro
    ctx.fillStyle = '#2a2a36';
    ctx.fillRect(-half * 0.22, -h * 0.11, half * 0.44, Math.max(1, h * 0.06));
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-half * 0.22 + 0.5, -h * 0.11 + 0.5, half * 0.44 - 1, Math.max(1, h * 0.06) - 1);

    // escapamentos (duplo de cada lado)
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(-half * 0.32, -h * 0.1, Math.max(1, half * 0.11), Math.max(1, h * 0.06));
    ctx.fillRect(-half * 0.2, -h * 0.1, Math.max(1, half * 0.09), Math.max(1, h * 0.06));
    ctx.fillRect(half * 0.11, -h * 0.1, Math.max(1, half * 0.11), Math.max(1, h * 0.06));
    ctx.fillRect(half * 0.22, -h * 0.1, Math.max(1, half * 0.09), Math.max(1, h * 0.06));
    // brilho dentro do escapamento
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(-half * 0.3, -h * 0.095, Math.max(1, half * 0.07), Math.max(1, h * 0.04));
    ctx.fillRect(half * 0.23, -h * 0.095, Math.max(1, half * 0.07), Math.max(1, h * 0.04));

    // aerofólio (jogador)
    if (opts.player) {
      ctx.fillStyle = paint.accent;
      ctx.fillRect(-half * 0.72, roofTop + h * 0.02, half * 1.44, Math.max(1, h * 0.06));
      ctx.fillStyle = shade(paint.accent, 0.6);
      ctx.fillRect(-half * 0.72, roofTop + h * 0.08, half * 1.44, Math.max(1, h * 0.02));
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(-half * 0.52, roofTop + h * 0.08, Math.max(1, half * 0.08), h * 0.12);
      ctx.fillRect(half * 0.44, roofTop + h * 0.08, Math.max(1, half * 0.08), h * 0.12);
    }

    // número do carro nos lados (quando visível o suficiente)
    if (number > 0 && h > 20) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(6, h * 0.14)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), -half * 0.42, bodyTop + h * 0.28);
      ctx.fillText(String(number), half * 0.42, bodyTop + h * 0.28);
    }
  }

  // chama do nitro
  if (opts.nitro) {
    const flame = h * 0.36;
    poly(
      ctx,
      [
        [-half * 0.34, -h * 0.02],
        [0, flame],
        [half * 0.34, -h * 0.02],
      ],
      '#ffb52e',
    );
    poly(
      ctx,
      [
        [-half * 0.18, -h * 0.02],
        [0, flame * 0.65],
        [half * 0.18, -h * 0.02],
      ],
      '#fff4c2',
    );
    // faíscas do nitro
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(-half * 0.1, -h * 0.02 - 2, 1, 2);
    ctx.fillRect(half * 0.1 - 1, -h * 0.02 - 2, 1, 2);
  }

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
      const cols = Math.max(2, Math.floor(w / 12));
      const rows = Math.max(3, Math.floor(h / 16));
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
  }

  ctx.restore();
}
