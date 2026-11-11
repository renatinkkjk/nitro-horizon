import type { Race, Racer } from '../race/race';
import type { Track } from '../world/track';
import { formatTime, panel, text, traceTrack } from '../render/hud';
import { WIDTH, HEIGHT } from '../game';
import mascotUrl from '../assets/mascote.png';

function title(ctx: CanvasRenderingContext2D, value: string, y: number, size: number, color: string): void {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText(value, WIDTH / 2 + 2, y + 3);
  ctx.fillStyle = color;
  ctx.fillText(value, WIDTH / 2, y);
}

/** Mascote CEPK (imagem carregada sob demanda). */
let mascotImage: HTMLImageElement | null = null;
function drawMascot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  height: number,
): void {
  if (!mascotImage) {
    mascotImage = new Image();
    mascotImage.decoding = 'async';
    mascotImage.src = mascotUrl;
  }
  if (!mascotImage.complete || mascotImage.naturalWidth === 0) return;
  const scale = height / mascotImage.naturalHeight;
  const w = mascotImage.naturalWidth * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mascotImage, Math.round(cx - w / 2), Math.round(baseY - height), Math.round(w), Math.round(height));
  ctx.restore();
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
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  title(ctx, 'NITRO', 70, 42, '#ff3d7f');
  title(ctx, 'HORIZON', 116, 42, '#22e0ff');

  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b93bd';
  ctx.fillText('CORRIDA ARCADE PIXEL ART', WIDTH / 2, 138);

  panel(ctx, 80, 148, 240, 98, 0.74);

  MAIN_MENU_OPTIONS.forEach((label, i) => {
    const y = 170 + i * 28;
    const selected = i === menuIndex;
    if (selected) {
      ctx.fillStyle = 'rgba(34,224,255,0.16)';
      ctx.fillRect(88, y - 14, 224, 20);
      if (blink) text(ctx, '▶', 96, y, 10, '#22e0ff');
    }
    text(ctx, label, WIDTH / 2, y, 10, selected ? '#ffffff' : '#b8c2e8', 'center');
  });

  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a5480';
  ctx.fillText('↑ ↓ NAVEGAR · ENTER CONFIRMAR · F TELA CHEIA', WIDTH / 2, 266);

  // Mascote CEPK ao lado direito do menu.
  drawMascot(ctx, 360, 252, 86);
}

export function drawHelpScreen(ctx: CanvasRenderingContext2D, blink: boolean): void {
  ctx.fillStyle = 'rgba(5,6,12,0.86)';
  ctx.fillRect(0, 0, 400, 280);

  panel(ctx, 15, 22, 370, 230, 0.92);
  title(ctx, 'COMO JOGAR', 48, 15, '#22e0ff');

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
    const y = 72 + i * 14;
    if (label) text(ctx, label, 30, y, 8, '#ffd23f');
    text(ctx, value, 185, y, 8, '#c8d0e0', 'left', false);
  });

  if (blink) text(ctx, 'ENTER / ESC PARA VOLTAR', 200, 266, 9, '#ffd23f', 'center');
}

export function drawTrackSelectScreen(
  ctx: CanvasRenderingContext2D,
  tracks: Track[],
  index: number,
  blink: boolean,
): void {
  ctx.fillStyle = 'rgba(5,6,12,0.68)';
  ctx.fillRect(0, 0, 400, 280);

  title(ctx, 'ESCOLHA A PISTA', 38, 14, '#ffd23f');

  const cardW = 110;
  const gap = 15;
  const startX = 20;
  const y = 55;
  const h = 125;

  tracks.forEach((track, i) => {
    const x = startX + i * (cardW + gap);
    const selected = i === index;
    panel(ctx, x, y, cardW, h, selected ? 0.95 : 0.5);
    if (selected) {
      ctx.strokeStyle = '#22e0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cardW - 2, h - 2);
    }

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = selected ? '#ffffff' : '#8b93bd';
    ctx.fillText(track.name, x + cardW / 2, y + 18);

    text(ctx, track.difficulty, x + cardW / 2, y + 31, 8, '#ffd23f', 'center', false);

    // prévia do traçado
    const mx = x + 15;
    const my = y + 40;
    const mw = cardW - 28;
    const mh = 58;
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

    text(ctx, `${track.laps} VOLTAS`, x + cardW / 2, y + h - 10, 8, '#8b93bd', 'center', false);
  });

  const track = tracks[index];
  text(ctx, track.blurb, 200, 203, 9, '#e8ecff', 'center', false);
  text(ctx, 'PIT STOP NA RETA PRINCIPAL', 200, 215, 8, '#3dff8b', 'center', false);
  text(ctx, `15 CARROS · PSEUDO-3D · ${track.laps} VOLTAS`, 200, 226, 8, '#4a5480', 'center', false);

  if (blink) text(ctx, '◀  ▶    ENTER PARA LARGAR', 200, 263, 9, '#ffd23f', 'center');
}

export function drawCountdown(ctx: CanvasRenderingContext2D, value: number): void {
  const label = value <= 0 ? 'GO!' : String(Math.ceil(value));
  ctx.font = 'bold 58px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(label, WIDTH / 2 + 3, 153);
  ctx.fillStyle = value <= 0 ? '#3dff8b' : '#ffd23f';
  ctx.fillText(label, WIDTH / 2, 149);
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
  ctx.fillRect(0, 0, 400, 280);

  const heading = options.story
    ? `RODADA ${options.round ?? 1}/${options.totalRounds ?? 3} · ${race.track.name}`
    : 'RESULTADO FINAL';
  title(ctx, heading, 35, options.story ? 13 : 15, '#ffd23f');

  const standings = race.standings.slice(0, 9);
  const startY = 55;

  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a5480';
  ctx.fillText('POS', 12, startY);
  ctx.fillText('PILOTO', 42, startY);
  ctx.textAlign = 'right';
  ctx.fillText('TEMPO', 388, startY);

  standings.forEach((racer: Racer, i) => {
    const y = 71 + i * 16;
    const isPlayer = racer.isPlayer;
    if (isPlayer) {
      ctx.fillStyle = 'rgba(34,224,255,0.14)';
      ctx.fillRect(8, y - 12, 384, 15);
    }
    const medal = i === 0 ? '#ffd23f' : i === 1 ? '#c8d4e8' : i === 2 ? '#e0955a' : null;
    const color = isPlayer ? '#22e0ff' : medal ?? '#c8d0e0';
    text(ctx, `${i + 1}`, 12, y, 10, medal ?? color);
    text(ctx, racer.name, 42, y, 10, color);
    text(ctx, racer.spec.name, 120, y, 8, isPlayer ? '#7f9bd6' : '#5a6388', 'left', false);
    if (racer.isPlayer) text(ctx, '◀ VOCÊ', 198, y, 8, '#22e0ff');
    const value = racer.finished ? formatTime(racer.finishTime) : `volta ${racer.lapsDone + 1}`;
    text(ctx, value, 388, y, 10, color, 'right');
  });

  text(ctx, `MELHOR VOLTA: ${formatTime(race.player.bestLap)}`, 12, 245, 10, '#ffd23f');
  if (options.story) {
    if (options.pointsGained !== undefined) {
      text(ctx, `+${options.pointsGained} PONTOS`, 200, 245, 10, '#3dff8b', 'center');
    }
    text(ctx, `PISTA: ${race.track.name}`, 388, 245, 9, '#8b93bd', 'right');
  } else {
    text(ctx, `PISTA: ${race.track.name}`, 388, 245, 9, '#8b93bd', 'right');
  }

  if (blink) {
    text(
      ctx,
      options.story ? 'ENTER PARA CONTINUAR' : 'ENTER PARA VOLTAR AO MENU',
      200,
      268,
      9,
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
  ctx.fillRect(0, 0, 400, 280);

  if (data.complete) {
    title(
      ctx,
      data.champion ? 'CAMPEÃO DO HORIZONTE' : 'HISTÓRIA CONCLUÍDA',
      30,
      data.champion ? 15 : 13,
      data.champion ? '#3dff8b' : '#ffd23f',
    );
    text(
      ctx,
      `VOCÊ TERMINOU EM ${data.playerPosition}º DE ${data.totalRacers}`,
      200,
      50,
      10,
      '#ffffff',
      'center',
    );
    const summary = data.results
      .map((result) => `${result.track.slice(0, 3)} ${result.position}º`)
      .join(' · ');
    if (summary) text(ctx, summary, 200, 65, 8, '#8b93bd', 'center', false);
  } else {
    title(ctx, 'MODO HISTÓRIA', 30, 15, '#ffd23f');
    text(ctx, `RODADA ${data.round}/${data.totalRounds}`, 200, 50, 11, '#ffffff', 'center');
    text(ctx, data.nextTrack, 200, 65, 9, '#22e0ff', 'center');
  }

  const headerY = 85;
  panel(ctx, 22, 72, 356, 178, 0.62);
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4a5480';
  ctx.fillText('POS', 35, headerY);
  ctx.fillText('PILOTO', 72, headerY);
  ctx.textAlign = 'right';
  ctx.fillText('PONTOS', 365, headerY);

  const maxRows = 10;
  const display = data.rows.slice(0, maxRows).map((row, i) => ({ row, pos: i + 1 }));
  const playerIndex = data.rows.findIndex((row) => row.isPlayer);
  if (playerIndex >= maxRows) {
    display[display.length - 1] = { row: data.rows[playerIndex], pos: playerIndex + 1 };
  }

  display.forEach(({ row, pos }, i) => {
    const y = 101 + i * 15;
    if (row.isPlayer) {
      ctx.fillStyle = 'rgba(34,224,255,0.14)';
      ctx.fillRect(20, y - 11, 360, 15);
    }
    const medal = pos === 1 ? '#ffd23f' : pos === 2 ? '#c8d4e8' : pos === 3 ? '#e0955a' : null;
    const color = row.isPlayer ? '#22e0ff' : medal ?? '#c8d0e0';
    text(ctx, `${pos}`, 35, y, 10, medal ?? color);
    text(ctx, row.name, 72, y, 10, color);
    if (row.isPlayer) text(ctx, '◀ VOCÊ', 135, y, 8, '#22e0ff');
    text(ctx, `${row.points}`, 365, y, 10, color, 'right');
  });

  if (blink) {
    text(
      ctx,
      data.complete ? 'ENTER PARA VOLTAR AO MENU' : 'ENTER PARA LARGAR · ESC PARA SAIR',
      200,
      266,
      9,
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
  ctx.fillRect(0, 0, 400, 280);

  panel(ctx, 72, 50, 255, 183, 0.9);
  title(ctx, 'PAUSA', 85, 25, '#22e0ff');
  drawMascot(ctx, 106, 100, 48);

  options.forEach((option, i) => {
    const y = 115 + i * 25;
    const selected = i === index;
    if (selected) {
      ctx.fillStyle = option.enabled ? 'rgba(34,224,255,0.16)' : 'rgba(74,84,128,0.18)';
      ctx.fillRect(82, y - 14, 235, 20);
      text(ctx, '▶', 92, y, 10, option.enabled ? '#22e0ff' : '#4a5480');
    }
    text(
      ctx,
      option.label,
      200,
      y,
      10,
      !option.enabled ? '#4a5480' : selected ? '#ffffff' : '#b8c2e8',
      'center',
    );
  });

  text(ctx, '↑ ↓ NAVEGAR · ENTER OK · ESC VOLTAR', 200, 225, 8, '#4a5480', 'center', false);
}
