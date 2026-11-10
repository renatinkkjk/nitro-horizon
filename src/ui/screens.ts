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

/** Quebra um texto em linhas que cabem na largura informada (fonte já configurada). */
function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const words = value.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

/** Opções do menu principal. */
export const MAIN_MENU_OPTIONS = [
  'CORRIDA RÁPIDA',
  'MODO HISTÓRIA · 3 CORRIDAS',
  'COMO JOGAR',
] as const;

export const MAIN_MENU_COUNT = MAIN_MENU_OPTIONS.length;

export function drawTitleScreen(
  ctx: CanvasRenderingContext2D,
  menuIndex: number,
  blink: boolean,
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.55)';
  ctx.fillRect(0, 0, 320, 224);

  title(ctx, 'NITRO', 56, 34, '#ff3d7f');
  title(ctx, 'HORIZON', 92, 34, '#22e0ff');

  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b93bd';
  ctx.fillText('CORRIDA ARCADE PIXEL ART', 160, 110);

  panel(ctx, 64, 118, 192, 78, 0.74);

  MAIN_MENU_OPTIONS.forEach((label, i) => {
    const y = 136 + i * 22;
    const selected = i === menuIndex;
    if (selected) {
      ctx.fillStyle = 'rgba(34,224,255,0.16)';
      ctx.fillRect(70, y - 11, 180, 16);
      if (blink) text(ctx, '▶', 76, y, 8, '#22e0ff');
    }
    text(ctx, label, 160, y, 8, selected ? '#ffffff' : '#b8c2e8', 'center');
  });

  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a5480';
  ctx.fillText('↑ ↓ NAVEGAR · ENTER CONFIRMAR · F TELA CHEIA', 160, 212);
}

export function drawHelpScreen(ctx: CanvasRenderingContext2D, blink: boolean): void {
  ctx.fillStyle = 'rgba(5,6,12,0.86)';
  ctx.fillRect(0, 0, 320, 224);

  panel(ctx, 12, 18, 296, 184, 0.92);
  title(ctx, 'COMO JOGAR', 38, 12, '#22e0ff');

  const lines: Array<[string, string]> = [
    ['DIRIGIR', 'SETAS / WASD'],
    ['ACELERAR · FREAR', '↑ / ↓  OU  W / S'],
    ['NITRO', 'ESPAÇO (TURBO DE 2,4 S)'],
    ['OLHAR PARA TRÁS', 'R'],
    ['MARCHAS', 'SHIFT / E SOBE · CTRL / Q DESCE'],
    ['PAUSA · TELA CHEIA', 'ESC / P  ·  F'],
    ['PIT STOP', 'ENTRE À DIREITA NA RETA PRINCIPAL'],
    ['', 'REABASTECE E RECARREGA O NITRO.'],
    ['DRAFTING', 'COLE ATRÁS DE UM RIVAL PARA'],
    ['', 'GANHAR VELOCIDADE EXTRA.'],
    ['MODO HISTÓRIA', 'VENCE AS 3 CORRIDAS E SE TORNA'],
    ['', 'CAMPEÃO DO HORIZONTE.'],
  ];

  lines.forEach(([label, value], i) => {
    const y = 58 + i * 11;
    if (label) text(ctx, label, 24, y, 6, '#ffd23f');
    text(ctx, value, 148, y, 6, '#c8d0e0', 'left', false);
  });

  if (blink) text(ctx, 'ENTER / ESC PARA VOLTAR', 160, 212, 7, '#ffd23f', 'center');
}

export function drawCarSelectScreen(
  ctx: CanvasRenderingContext2D,
  cars: CarSpec[],
  index: number,
  blink: boolean,
  story = false,
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.68)';
  ctx.fillRect(0, 0, 320, 224);

  title(ctx, story ? 'MODO HISTÓRIA · ESCOLHA O CARRO' : 'ESCOLHA SEU CARRO', 24, story ? 9 : 11, '#ffd23f');

  const car = cars[index];

  // Painel-esquerdo: showroom com o carro grande.
  panel(ctx, 8, 32, 174, 102, 0.94);
  ctx.save();
  ctx.beginPath();
  ctx.rect(9, 33, 172, 100);
  ctx.clip();

  const spot = ctx.createRadialGradient(95, 90, 4, 95, 90, 78);
  spot.addColorStop(0, 'rgba(34,224,255,0.16)');
  spot.addColorStop(1, 'rgba(34,224,255,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(9, 33, 172, 100);

  // Linhas de velocidade discretas ao fundo.
  ctx.strokeStyle = 'rgba(34,224,255,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = 62 + i * 13;
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(38 + i * 5, y);
    ctx.moveTo(152 - i * 5, y);
    ctx.lineTo(176, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(34,224,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(95, 123, 64, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  const preview =
    car.style === 'rx7'
      ? { view: 'front' as const }
      : {};
  drawCar(ctx, 95, 121, 124, 70, { body: car.body, accent: car.accent, style: car.style }, preview);
  ctx.restore();

  // Painel-direito: nome, perfil e atributos.
  panel(ctx, 188, 32, 124, 102, 0.88);

  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(car.name, 250, 47);

  ctx.font = '6px monospace';
  ctx.fillStyle = '#8b93bd';
  const tagline = wrapText(ctx, car.tagline, 110);
  tagline.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, 250, 57 + i * 7);
  });

  const stats: Array<[string, number]> = [
    ['VELOCIDADE', car.stats.velocidade],
    ['ACELERAÇÃO', car.stats.aceleracao],
    ['GRIP', car.stats.grip],
    ['TANQUE', car.stats.tanque],
    ['CONSUMO', car.stats.consumo],
  ];

  stats.forEach(([label, value], i) => {
    const sy = 79 + i * 9;
    text(ctx, label, 194, sy, 6, '#8b93bd');
    pips(ctx, 258, sy, value);
  });

  text(ctx, `NITROS: ${car.nitros}`, 194, 126, 6, '#22e0ff');
  text(ctx, `MÁX: ${Math.round((car.maxSpeed / 11800) * 300)} KM/H`, 306, 126, 6, '#22e0ff', 'right');

  // Faixa inferior: os quatro carros em cartões compactos.
  const cardW = 72;
  const gap = 6;
  const startX = 7;
  const y = 142;
  const h = 48;

  cars.forEach((item, i) => {
    const x = startX + i * (cardW + gap);
    const selected = i === index;
    panel(ctx, x, y, cardW, h, selected ? 0.96 : 0.55);
    if (selected) {
      ctx.strokeStyle = '#22e0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cardW - 2, h - 2);
    }

    drawCar(ctx, x + cardW / 2, y + 31, 42, 24, {
      body: item.body,
      accent: item.accent,
      style: item.style,
      ...(item.style === 'rx7' ? { view: 'rear' as const } : {}),
    });

    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = selected ? '#ffffff' : '#8b93bd';
    ctx.fillText(item.name, x + cardW / 2, y + h - 5);
  });

  if (story) {
    text(ctx, 'DESERTO → LITORAL → CIDADE', 160, 202, 6, '#8b93bd', 'center', false);
  }

  if (blink) {
    text(ctx, '◀ ▶ TROCAR · ENTER CONFIRMAR · F TELA CHEIA', 160, 214, 6, '#ffd23f', 'center');
  }
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

export interface ResultsScreenOptions {
  story?: boolean;
  round?: number;
  totalRounds?: number;
  pointsGained?: number;
}

export function drawResultsScreen(
  ctx: CanvasRenderingContext2D,
  race: Race,
  blink: boolean,
  options: ResultsScreenOptions = {},
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.84)';
  ctx.fillRect(0, 0, 320, 224);

  const heading = options.story
    ? `RODADA ${options.round ?? 1}/${options.totalRounds ?? 3} · ${race.track.name}`
    : 'RESULTADO FINAL';
  title(ctx, heading, 28, options.story ? 10 : 12, '#ffd23f');

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
  if (options.story) {
    if (options.pointsGained !== undefined) {
      text(ctx, `+${options.pointsGained} PONTOS`, 160, 196, 8, '#3dff8b', 'center');
    }
    text(ctx, `PISTA: ${race.track.name}`, 310, 196, 7, '#8b93bd', 'right');
  } else {
    text(ctx, `PISTA: ${race.track.name}`, 310, 196, 7, '#8b93bd', 'right');
  }

  if (blink) {
    text(
      ctx,
      options.story ? 'ENTER PARA CONTINUAR' : 'ENTER PARA VOLTAR AO MENU',
      160,
      214,
      7,
      '#e8ecff',
      'center',
    );
  }
}

export interface StoryRow {
  name: string;
  points: number;
  isPlayer: boolean;
}

export interface StoryScreenData {
  complete: boolean;
  round: number;
  totalRounds: number;
  nextTrack: string;
  rows: StoryRow[];
  playerPosition: number;
  totalRacers: number;
  champion: boolean;
  results: Array<{ track: string; position: number }>;
}

/**
 * Tela intermediária do modo história: classificação do campeonato entre as
 * corridas e, no final, o resultado da temporada.
 */
export function drawStoryScreen(
  ctx: CanvasRenderingContext2D,
  data: StoryScreenData,
  blink: boolean,
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.8)';
  ctx.fillRect(0, 0, 320, 224);

  if (data.complete) {
    title(
      ctx,
      data.champion ? 'CAMPEÃO DO HORIZONTE' : 'HISTÓRIA CONCLUÍDA',
      24,
      data.champion ? 12 : 11,
      data.champion ? '#3dff8b' : '#ffd23f',
    );
    text(
      ctx,
      `VOCÊ TERMINOU EM ${data.playerPosition}º DE ${data.totalRacers}`,
      160,
      40,
      8,
      '#ffffff',
      'center',
    );
    const summary = data.results
      .map((result) => `${result.track.slice(0, 3)} ${result.position}º`)
      .join(' · ');
    if (summary) text(ctx, summary, 160, 52, 6, '#8b93bd', 'center', false);
  } else {
    title(ctx, 'MODO HISTÓRIA', 24, 12, '#ffd23f');
    text(ctx, `RODADA ${data.round}/${data.totalRounds}`, 160, 40, 9, '#ffffff', 'center');
    text(ctx, data.nextTrack, 160, 52, 7, '#22e0ff', 'center');
  }

  const headerY = 68;
  panel(ctx, 18, 58, 284, 142, 0.62);
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4a5480';
  ctx.fillText('POS', 28, headerY);
  ctx.fillText('PILOTO', 58, headerY);
  ctx.textAlign = 'right';
  ctx.fillText('PONTOS', 292, headerY);

  const maxRows = 10;
  const display = data.rows.slice(0, maxRows).map((row, i) => ({ row, pos: i + 1 }));
  const playerIndex = data.rows.findIndex((row) => row.isPlayer);
  if (playerIndex >= maxRows) {
    display[display.length - 1] = { row: data.rows[playerIndex], pos: playerIndex + 1 };
  }

  display.forEach(({ row, pos }, i) => {
    const y = headerY + 13 + i * 12;
    if (row.isPlayer) {
      ctx.fillStyle = 'rgba(34,224,255,0.14)';
      ctx.fillRect(16, y - 9, 288, 12);
    }
    const medal = pos === 1 ? '#ffd23f' : pos === 2 ? '#c8d4e8' : pos === 3 ? '#e0955a' : null;
    const color = row.isPlayer ? '#22e0ff' : medal ?? '#c8d0e0';
    text(ctx, `${pos}`, 28, y, 8, medal ?? color);
    text(ctx, row.name, 58, y, 8, color);
    if (row.isPlayer) text(ctx, '◀ VOCÊ', 108, y, 6, '#22e0ff');
    text(ctx, `${row.points}`, 292, y, 8, color, 'right');
  });

  if (blink) {
    text(
      ctx,
      data.complete ? 'ENTER PARA VOLTAR AO MENU' : 'ENTER PARA LARGAR · ESC PARA SAIR',
      160,
      212,
      7,
      '#ffd23f',
      'center',
    );
  }
}

export interface PauseOption {
  label: string;
  enabled: boolean;
}

/** Quantidade de opções do menu de pausa. */
export const PAUSE_OPTION_COUNT = 4;

/** Opções do menu de pausa (ESC/P). O rótulo de tela cheia acompanha o estado atual. */
export function pauseOptions(fullscreenActive: boolean): PauseOption[] {
  return [
    { label: 'CONTINUAR', enabled: true },
    { label: 'REINICIAR CORRIDA', enabled: true },
    { label: 'SAIR PARA O MENU', enabled: true },
    { label: fullscreenActive ? 'SAIR DA TELA CHEIA' : 'TELA CHEIA  [F]', enabled: true },
  ];
}

export function drawPauseScreen(
  ctx: CanvasRenderingContext2D,
  index: number,
  options: PauseOption[] = pauseOptions(false),
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.74)';
  ctx.fillRect(0, 0, 320, 224);

  panel(ctx, 58, 40, 204, 146, 0.9);
  title(ctx, 'PAUSA', 68, 20, '#22e0ff');

  options.forEach((option, i) => {
    const y = 92 + i * 20;
    const selected = i === index;
    if (selected) {
      ctx.fillStyle = option.enabled ? 'rgba(34,224,255,0.16)' : 'rgba(74,84,128,0.18)';
      ctx.fillRect(66, y - 11, 188, 16);
      text(ctx, '▶', 74, y, 8, option.enabled ? '#22e0ff' : '#4a5480');
    }
    text(
      ctx,
      option.label,
      160,
      y,
      8,
      !option.enabled ? '#4a5480' : selected ? '#ffffff' : '#b8c2e8',
      'center',
    );
  });

  text(ctx, '↑ ↓ NAVEGAR · ENTER OK · ESC VOLTAR', 160, 180, 6, '#4a5480', 'center', false);
}
