export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--.--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export interface MinimapDot {
  x: number;
  y: number;
  color: string;
  isPlayer: boolean;
}

export interface HudData {
  speedKmh: number;
  gear: string;
  rpmNorm: number;
  nitroLeft: number;
  nitroMax: number;
  fuelFrac: number;
  lap: number;
  laps: number;
  position: number;
  total: number;
  lapTime: number;
  bestLap: number;
  totalTime: number;
  map: Array<[number, number]>;
  dots: MinimapDot[];
  pit: { x: number; y: number } | null;
  inPit: boolean;
  refueling: boolean;
  lastLap: boolean;
  message: string;
  messageTimer: number;
}

import { WIDTH, HEIGHT } from '../game';

/**
 * Desenha o traçado como uma curva fechada e suave, passando pelos pontos
 * do mapa. Evita o aspecto "poligonal" do minimapa.
 */
export function traceTrack(
  ctx: CanvasRenderingContext2D,
  map: Array<[number, number]>,
  ox: number,
  oy: number,
  scale: number,
): void {
  if (map.length < 3) return;

  const points = map.slice();
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6) {
    points.pop();
  }

  const n = points.length;
  const at = (i: number): [number, number] => {
    const [px, py] = points[((i % n) + n) % n];
    return [ox + px * scale, oy + py * scale];
  };
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];

  const start = mid(at(0), at(1));
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  for (let i = 1; i <= n; i += 1) {
    const current = at(i);
    const next = mid(current, at(i + 1));
    ctx.quadraticCurveTo(current[0], current[1], next[0], next[1]);
  }
  ctx.closePath();
  ctx.stroke();
}

export function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.82,
): void {
  ctx.fillStyle = `rgba(7,9,20,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2a3560';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'left',
  bold = true,
  outline = true,
): void {
  ctx.font = `${bold ? 'bold ' : ''}${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (outline) {
    // Contorno preto ao redor do texto para melhor legibilidade.
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = size * 0.28;
    ctx.lineJoin = 'round';
    ctx.strokeText(value, Math.round(x), Math.round(y));
  }
  ctx.fillStyle = color;
  ctx.fillText(value, Math.round(x), Math.round(y));
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
): void {
  ctx.fillStyle = '#0d1124';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2a3560';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, frac))), h - 2);
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  map: Array<[number, number]>,
  dots: MinimapDot[],
  pit: { x: number; y: number } | null,
): void {
  panel(ctx, x, y, w, h);

  // Mesma transformação usada no traçado e nos pontos, para os carros
  // aparecerem exatamente sobre o circuito.
  let ox = x + w / 2;
  let oy = y + h / 2;
  let scale = 1;

  if (map.length > 1) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [mx, my] of map) {
      minX = Math.min(minX, mx);
      maxX = Math.max(maxX, mx);
      minY = Math.min(minY, my);
      maxY = Math.max(maxY, my);
    }
    const pad = 4;
    const scaleX = (w - pad * 2) / Math.max(0.0001, maxX - minX);
    const scaleY = (h - pad * 2) / Math.max(0.0001, maxY - minY);
    scale = Math.min(scaleX, scaleY);
    ox = x + w / 2 - ((minX + maxX) / 2) * scale;
    oy = y + h / 2 - ((minY + maxY) / 2) * scale;

    ctx.strokeStyle = '#3d4a80';
    ctx.lineWidth = 1;
    traceTrack(ctx, map, ox, oy, scale);

    // marca da linha de largada/chegada
    const [startX, startY] = map[0];
    const sx = Math.round(ox + startX * scale);
    const sy = Math.round(oy + startY * scale);
    ctx.fillStyle = '#0a0c16';
    ctx.fillRect(sx - 2, sy - 2, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
    ctx.fillRect(sx + 1, sy + 1, 1, 1);

    // marca do pit lane
    if (pit) {
      const px = Math.round(ox + pit.x * scale);
      const py = Math.round(oy + pit.y * scale);
      ctx.fillStyle = '#0a0c16';
      ctx.fillRect(px - 3, py - 3, 7, 7);
      ctx.strokeStyle = '#22e0ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 2.5, py - 2.5, 6, 6);
      text(ctx, 'P', px + 0.5, py + 2, 6, '#22e0ff', 'center');
    }
  }

  for (const dot of dots) {
    const px = ox + dot.x * scale;
    const py = oy + dot.y * scale;
    if (dot.isPlayer) {
      ctx.fillStyle = 'rgba(34,224,255,0.35)';
      ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
    } else {
      ctx.fillStyle = dot.color;
      ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
  }
}

export function drawHud(ctx: CanvasRenderingContext2D, data: HudData): void {
  const cx = WIDTH / 2; // 200

  // barra superior
  ctx.fillStyle = 'rgba(7,9,20,0.72)';
  ctx.fillRect(0, 0, WIDTH, 22);
  ctx.strokeStyle = '#2a3560';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, WIDTH - 1, 21);

  text(ctx, 'POS', 8, 15, 7, '#8b93bd');
  text(ctx, `${data.position}/${data.total}`, 30, 15, 10, '#ffffff');

  text(ctx, 'VOLTA', 108, 15, 7, '#8b93bd');
  text(ctx, `${data.lap}/${data.laps}`, 140, 15, 10, '#ffffff');

  text(ctx, 'ATUAL', 188, 15, 7, '#8b93bd');
  text(ctx, formatTime(data.lapTime), 218, 15, 10, '#22e0ff');

  text(ctx, `TOTAL ${formatTime(data.totalTime)}`, 8, 34, 7, '#8b93bd');

  // indicador visual de rubber band (topo direito)
  if (data.position <= 3 && data.total > 3) {
    const rpct = (1 - data.position / data.total) * 100;
    ctx.fillStyle = `rgba(34,224,255,${rpct / 100 * 0.4})`;
    ctx.fillRect(350, 12, 45, 8);
    ctx.fillStyle = '#22e0ff';
    ctx.fillRect(350 + (100 - rpct) / 100 * 45, 12, (rpct / 100) * 45, 8);
  }

  // minimapa (topo direito)
  drawMinimap(ctx, 313, 6, 82, 60, data.map, data.dots, data.pit);
  text(ctx, `MELHOR ${formatTime(data.bestLap)}`, WIDTH - 6, 76, 7, '#ffd23f', 'right');

  // status do pit lane (centro superior)
  if (data.inPit) {
    const refueling = data.refueling;
    const color = refueling ? '#3dff8b' : '#ffd23f';
    panel(ctx, 188, 30, 112, 18, 0.78);
    text(ctx, refueling ? 'PIT STOP' : 'PIT LANE', 194, 38, 7, color);
    text(
      ctx,
      refueling ? `${Math.round(data.fuelFrac * 100)}%` : '100',
      293,
      38,
      8,
      '#ffffff',
      'right',
    );
    if (refueling) {
      ctx.fillStyle = '#3dff8b';
      const w = 108 * Math.max(0, Math.min(1, data.fuelFrac));
      ctx.fillRect(192, 40, w, 1);
    }
  } else if (data.fuelFrac < 0.18) {
    const blink = Math.floor(performance.now() / 320) % 2 === 0;
    if (blink) text(ctx, 'PIT', WIDTH - 6, 246, 7, '#ff4040', 'right');
  }

  // painel de velocidade (esquerda inferior)
  panel(ctx, 6, 234, 130, 44);
  const kmh = Math.round(data.speedKmh);
  text(ctx, String(kmh).padStart(3, ' '), 12, 258, 22, '#ffffff');
  text(ctx, 'km/h', 62, 258, 8, '#8b93bd');
  text(ctx, 'M', 106, 248, 8, '#8b93bd');
  text(ctx, data.gear, 114, 262, 18, '#ffd23f');

  const rpmColor = data.rpmNorm > 0.85 ? '#ff4040' : data.rpmNorm > 0.65 ? '#ffd23f' : '#3dff8b';
  bar(ctx, 12, 270, 104, 6, data.rpmNorm, rpmColor);

  // painel de combustível / nitro (direita inferior)
  panel(ctx, WIDTH - 134, 234, 130, 42);
  text(ctx, 'GASOLINA', WIDTH - 126, 246, 8, '#8b93bd');
  const fuelColor = data.fuelFrac > 0.5 ? '#3dff8b' : data.fuelFrac > 0.2 ? '#ffd23f' : '#ff4040';
  bar(ctx, WIDTH - 126, 252, 120, 8, data.fuelFrac, fuelColor);

  text(ctx, 'NITRO', WIDTH - 126, 272, 8, '#8b93bd');
  for (let i = 0; i < data.nitroMax; i += 1) {
    const ccx = WIDTH - 78 + i * 14;
    ctx.beginPath();
    ctx.arc(ccx, 269, 4, 0, Math.PI * 2);
    ctx.fillStyle = i < data.nitroLeft ? '#22e0ff' : '#1c2340';
    ctx.fill();
    ctx.strokeStyle = '#2a3560';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // mensagem central (drafting / última volta)
  const centerY = 108;
  if (data.message && data.messageTimer > 0) {
    const blink = Math.floor(performance.now() / 200) % 2 === 0;
    if (blink) text(ctx, data.message, cx, centerY, 15, '#ffd23f', 'center');
  }

  if (data.position <= 3 && data.total > 3) {
    const rpct = (1 - data.position / data.total) * 100;
    ctx.fillStyle = `rgba(255, 165, 0, ${rpct / 100 * 0.3})`;
    ctx.fillRect(350, 12, 45, 8);
    ctx.fillStyle = '#ffa500';
    ctx.fillRect(350 + (100 - rpct) / 100 * 45, 12, (rpct / 100) * 45, 8);
  }

  if (data.lastLap && data.messageTimer <= 0) {
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    if (blink) text(ctx, 'ÚLTIMA VOLTA', cx, centerY, 15, '#ffd23f', 'center');
  }
}

export function drawBanner(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  color = '#ffd23f',
): void {
  ctx.fillStyle = 'rgba(7,9,20,0.78)';
  ctx.fillRect(0, 115, WIDTH, 50);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 115.5, WIDTH - 1, 49);
  text(ctx, title, WIDTH / 2, 138, 16, color, 'center');
  text(ctx, subtitle, WIDTH / 2, 158, 9, '#e8ecff', 'center', false);
}
