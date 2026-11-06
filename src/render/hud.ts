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
  lastLap: boolean;
  message: string;
  messageTimer: number;
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
): void {
  ctx.font = `${bold ? 'bold ' : ''}${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
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
): void {
  panel(ctx, x, y, w, h);

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
    const scale = Math.min(scaleX, scaleY);
    const ox = x + w / 2 - ((minX + maxX) / 2) * scale;
    const oy = y + h / 2 - ((minY + maxY) / 2) * scale;

    ctx.strokeStyle = '#3d4a80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    map.forEach(([mx, my], index) => {
      const px = ox + mx * scale;
      const py = oy + my * scale;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  const padding = 4;
  for (const dot of dots) {
    const px = x + padding + ((dot.x + 1) / 2) * (w - padding * 2);
    const py = y + padding + ((dot.y + 1) / 2) * (h - padding * 2);
    if (dot.isPlayer) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
    } else {
      ctx.fillStyle = dot.color;
      ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
  }
}

export function drawHud(ctx: CanvasRenderingContext2D, data: HudData): void {
  // barra superior
  ctx.fillStyle = 'rgba(7,9,20,0.72)';
  ctx.fillRect(0, 0, 320, 18);
  ctx.strokeStyle = '#2a3560';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, 319, 17);

  text(ctx, 'POS', 6, 12, 6, '#8b93bd');
  text(ctx, `${data.position}/${data.total}`, 24, 12, 8, '#ffffff');

  text(ctx, 'VOLTA', 86, 12, 6, '#8b93bd');
  text(ctx, `${data.lap}/${data.laps}`, 112, 12, 8, '#ffffff');

  text(ctx, 'ATUAL', 150, 12, 6, '#8b93bd');
  text(ctx, formatTime(data.lapTime), 174, 12, 8, '#22e0ff');

  text(ctx, `TOTAL ${formatTime(data.totalTime)}`, 6, 27, 7, '#8b93bd');

  // minimapa
  drawMinimap(ctx, 250, 4, 66, 48, data.map, data.dots);
  text(ctx, `MELHOR ${formatTime(data.bestLap)}`, 316, 61, 7, '#ffd23f', 'right');

  // painel de velocidade
  panel(ctx, 4, 187, 104, 33);
  const kmh = Math.round(data.speedKmh);
  text(ctx, String(kmh).padStart(3, ' '), 8, 207, 17, '#ffffff');
  text(ctx, 'km/h', 46, 207, 7, '#8b93bd');
  text(ctx, 'M', 84, 200, 7, '#8b93bd');
  text(ctx, data.gear, 92, 208, 14, '#ffd23f');

  const rpmColor = data.rpmNorm > 0.85 ? '#ff4040' : data.rpmNorm > 0.65 ? '#ffd23f' : '#3dff8b';
  bar(ctx, 8, 212, 84, 5, data.rpmNorm, rpmColor);

  // painel de combustível / nitro
  panel(ctx, 212, 187, 104, 33);
  text(ctx, 'GASOLINA', 216, 197, 7, '#8b93bd');
  const fuelColor = data.fuelFrac > 0.5 ? '#3dff8b' : data.fuelFrac > 0.2 ? '#ffd23f' : '#ff4040';
  bar(ctx, 216, 200, 96, 6, data.fuelFrac, fuelColor);

  text(ctx, 'NITRO', 216, 216, 7, '#8b93bd');
  for (let i = 0; i < data.nitroMax; i += 1) {
    const cx = 248 + i * 11;
    ctx.beginPath();
    ctx.arc(cx, 213.5, 3, 0, Math.PI * 2);
    ctx.fillStyle = i < data.nitroLeft ? '#22e0ff' : '#1c2340';
    ctx.fill();
    ctx.strokeStyle = '#2a3560';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (data.lastLap && data.messageTimer <= 0) {
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    if (blink) text(ctx, 'ÚLTIMA VOLTA', 160, 84, 12, '#ffd23f', 'center');
  }
}

export function drawBanner(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  color = '#ffd23f',
): void {
  ctx.fillStyle = 'rgba(7,9,20,0.78)';
  ctx.fillRect(0, 92, 320, 40);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 92.5, 319, 39);
  text(ctx, title, 160, 110, 12, color, 'center');
  text(ctx, subtitle, 160, 125, 7, '#e8ecff', 'center', false);
}
