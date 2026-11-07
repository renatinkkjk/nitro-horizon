import type { Race, Racer } from '../race/race';
import type { CarSpec } from '../entities/carspecs';
import type { Track } from '../world/track';
import { drawCar } from '../render/sprites';
import { formatTime, panel, text, traceTrack } from '../render/hud';

function title(ctx: CanvasRenderingContext2D, value: string, y: number, size: number, color: string): void {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText(value, 162, y + 3);
  ctx.fillStyle = color;
  ctx.fillText(value, 160, y);
}

function pips(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, max = 4): void {
  for (let i = 0; i < max; i += 1) {
    ctx.fillStyle = i < value ? '#22e0ff' : '#1c2340';
    ctx.fillRect(x + i * 9, y - 6, 7, 6);
  }
}

export function drawTitleScreen(ctx: CanvasRenderingContext2D, blink: boolean): void {
  ctx.fillStyle = 'rgba(5,6,12,0.55)';
  ctx.fillRect(0, 0, 320, 224);

  title(ctx, 'NITRO', 78, 38, '#ff3d7f');
  title(ctx, 'HORIZON', 118, 38, '#22e0ff');

  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b93bd';
  ctx.fillText('CORRIDA ARCADE PIXEL ART', 160, 140);

  if (blink) title(ctx, 'PRESSIONE ENTER', 178, 11, '#ffd23f');

  ctx.font = '6px monospace';
  ctx.fillStyle = '#4a5480';
  ctx.fillText('SETAS = DIRIGIR   ESPAÇO = NITRO', 160, 196);
  ctx.fillText('SHIFT / CTRL = MARCHA   P = PAUSA', 160, 206);
  ctx.fillStyle = '#3dff8b';
  ctx.fillText('PIT STOP: ENTRE À DIREITA NA RETA PRINCIPAL', 160, 218);
}

export function drawCarSelectScreen(
  ctx: CanvasRenderingContext2D,
  cars: CarSpec[],
  index: number,
  blink: boolean,
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.68)';
  ctx.fillRect(0, 0, 320, 224);

  title(ctx, 'ESCOLHA SEU CARRO', 30, 11, '#ffd23f');

  const cardW = 70;
  const gap = 6;
  const startX = 10;
  const y = 46;
  const h = 72;

  cars.forEach((car, i) => {
    const x = startX + i * (cardW + gap);
    const selected = i === index;
    panel(ctx, x, y, cardW, h, selected ? 0.95 : 0.55);
    if (selected) {
      ctx.strokeStyle = '#22e0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cardW - 2, h - 2);
    }

    drawCar(ctx, x + cardW / 2, y + h - 12, 44, 26, {
      body: car.body,
      accent: car.accent,
      style: car.style,
    });

    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = selected ? '#ffffff' : '#8b93bd';
    ctx.fillText(car.name, x + cardW / 2, y + h - 2);
  });

  const car = cars[index];

  title(ctx, car.name, 138, 11, '#ffffff');
  text(ctx, car.tagline, 160, 150, 7, '#8b93bd', 'center', false);

  const stats: Array<[string, number]> = [
    ['VELOCIDADE', car.stats.velocidade],
    ['ACELERAÇÃO', car.stats.aceleracao],
    ['GRIP', car.stats.grip],
    ['TANQUE', car.stats.tanque],
    ['CONSUMO', car.stats.consumo],
  ];

  stats.forEach(([label, value], i) => {
    const sy = 166 + i * 10;
    text(ctx, label, 60, sy, 7, '#8b93bd');
    pips(ctx, 140, sy, value);
  });

  text(ctx, `NITROS: ${car.nitros}`, 220, 166, 7, '#22e0ff');
  text(ctx, `MÁX: ${Math.round((car.maxSpeed / 11800) * 300)} km/h`, 220, 176, 7, '#22e0ff');

  if (blink) text(ctx, '◀  ▶    ENTER PARA CONFIRMAR', 160, 216, 7, '#ffd23f', 'center');
}

export function drawTrackSelectScreen(
  ctx: CanvasRenderingContext2D,
  tracks: Track[],
  index: number,
  blink: boolean,
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.68)';
  ctx.fillRect(0, 0, 320, 224);

  title(ctx, 'ESCOLHA A PISTA', 30, 11, '#ffd23f');

  const cardW = 88;
  const gap = 12;
  const startX = 16;
  const y = 44;
  const h = 100;

  tracks.forEach((track, i) => {
    const x = startX + i * (cardW + gap);
    const selected = i === index;
    panel(ctx, x, y, cardW, h, selected ? 0.95 : 0.5);
    if (selected) {
      ctx.strokeStyle = '#22e0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cardW - 2, h - 2);
    }

    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = selected ? '#ffffff' : '#8b93bd';
    ctx.fillText(track.name, x + cardW / 2, y + 14);

    text(ctx, track.difficulty, x + cardW / 2, y + 25, 6, '#ffd23f', 'center', false);

    // prévia do traçado
    const mx = x + 12;
    const my = y + 32;
    const mw = cardW - 24;
    const mh = 46;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [px, py] of track.map) {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    const scale = Math.min(mw / Math.max(0.0001, maxX - minX), mh / Math.max(0.0001, maxY - minY));
    const ox = mx + mw / 2 - ((minX + maxX) / 2) * scale;
    const oy = my + mh / 2 - ((minY + maxY) / 2) * scale;
    ctx.strokeStyle = selected ? '#22e0ff' : '#3d4a80';
    ctx.lineWidth = 1;
    traceTrack(ctx, track.map, ox, oy, scale);

    text(ctx, `${track.laps} VOLTAS`, x + cardW / 2, y + h - 8, 6, '#8b93bd', 'center', false);
  });

  const track = tracks[index];
  text(ctx, track.blurb, 160, 162, 7, '#e8ecff', 'center', false);
  text(ctx, 'PIT STOP NA RETA PRINCIPAL', 160, 172, 6, '#3dff8b', 'center', false);
  text(ctx, `15 CARROS · PSEUDO-3D · ${track.laps} VOLTAS`, 160, 181, 6, '#4a5480', 'center', false);

  if (blink) text(ctx, '◀  ▶    ENTER PARA LARGAR', 160, 210, 7, '#ffd23f', 'center');
}

export function drawCountdown(ctx: CanvasRenderingContext2D, value: number): void {
  const label = value <= 0 ? 'GO!' : String(Math.ceil(value));
  ctx.font = 'bold 46px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(label, 163, 122);
  ctx.fillStyle = value <= 0 ? '#3dff8b' : '#ffd23f';
  ctx.fillText(label, 160, 119);
}

export function drawResultsScreen(ctx: CanvasRenderingContext2D, race: Race, blink: boolean): void {
  ctx.fillStyle = 'rgba(5,6,12,0.84)';
  ctx.fillRect(0, 0, 320, 224);

  title(ctx, 'RESULTADO FINAL', 28, 12, '#ffd23f');

  const standings = race.standings.slice(0, 9);
  const startY = 44;

  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a5480';
  ctx.fillText('POS', 10, startY);
  ctx.fillText('PILOTO', 34, startY);
  ctx.textAlign = 'right';
  ctx.fillText('TEMPO', 310, startY);

  standings.forEach((racer: Racer, i) => {
    const y = startY + 13 + i * 13;
    const isPlayer = racer.isPlayer;
    if (isPlayer) {
      ctx.fillStyle = 'rgba(34,224,255,0.14)';
      ctx.fillRect(6, y - 10, 308, 12);
    }
    const medal = i === 0 ? '#ffd23f' : i === 1 ? '#c8d4e8' : i === 2 ? '#e0955a' : null;
    const color = isPlayer ? '#22e0ff' : medal ?? '#c8d0e0';
    text(ctx, `${i + 1}`, 10, y, 8, medal ?? color);
    text(ctx, racer.name, 34, y, 8, color);
    text(ctx, racer.spec.name, 96, y, 6, isPlayer ? '#7f9bd6' : '#5a6388', 'left', false);
    if (racer.isPlayer) text(ctx, '◀ VOCÊ', 158, y, 6, '#22e0ff');
    const value = racer.finished ? formatTime(racer.finishTime) : `volta ${racer.lapsDone + 1}`;
    text(ctx, value, 310, y, 8, color, 'right');
  });

  text(ctx, `MELHOR VOLTA: ${formatTime(race.player.bestLap)}`, 10, 196, 8, '#ffd23f');
  text(ctx, `PISTA: ${race.track.name}`, 310, 196, 7, '#8b93bd', 'right');

  if (blink) text(ctx, 'ENTER PARA VOLTAR AO MENU', 160, 214, 7, '#e8ecff', 'center');
}

export function drawPauseScreen(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(5,6,12,0.72)';
  ctx.fillRect(0, 0, 320, 224);
  title(ctx, 'PAUSA', 100, 24, '#22e0ff');
  text(ctx, 'P PARA CONTINUAR · ESC PARA O MENU', 160, 126, 7, '#8b93bd', 'center', false);
}
