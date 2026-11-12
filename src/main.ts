import { Game, setViewport } from './game';
import { registerServiceWorker, setupInstallButton } from './ui/pwa';
import {
  isFullscreen,
  showFullscreenUnsupported,
  subscribeFullscreen,
  toggleFullscreen,
} from './ui/fullscreen';

const element = document.querySelector<HTMLCanvasElement>('#game');

if (!element) {
  throw new Error('Elemento canvas não encontrado.');
}

const context = element.getContext('2d', { alpha: false });

if (!context) {
  throw new Error('Canvas 2D não disponível neste navegador.');
}

const canvas: HTMLCanvasElement = element;
const ctx: CanvasRenderingContext2D = context;

ctx.imageSmoothingEnabled = false;

const game = new Game(ctx);
game.start();
game.attachTouchControls();

// Port mobile: botões de toque aparecem em telas com ponteiro grosso
// (ou com ?touch=1, útil para testar no desktop).
const params = new URLSearchParams(window.location.search);
const isTouch =
  params.has('touch') ||
  window.matchMedia('(pointer: coarse)').matches ||
  'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

// Hook de depuração: expõe o estado do jogo no console do navegador.
(window as unknown as { __nitro?: Game }).__nitro = game;
// Ajuste de resolução (testes): muda o canvas e a resolução interna do jogo.
(window as unknown as { __nitroResize?: (w: number, h: number) => void }).__nitroResize = (
  width: number,
  height: number,
) => applyInternalSize(width, height);

// --- PWA: service worker (offline/instalável) + botão "BAIXE NOSSO JOGO" ---
registerServiceWorker();
setupInstallButton();

// --- Tela cheia (PC: F ou menu de pausa / mobile: botão ⛶) ---

const fullscreenButton = document.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');

async function requestFullscreenToggle(): Promise<void> {
  const result = await toggleFullscreen();
  if (result === 'unsupported') showFullscreenUnsupported();
  fitCanvas();
}

fullscreenButton?.addEventListener('click', (event) => {
  event.preventDefault();
  void requestFullscreenToggle();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyF' && !event.repeat) {
    event.preventDefault();
    void requestFullscreenToggle();
  }
});

/** Mantém o ícone do botão e o layout sincronizados com o estado real da tela cheia. */
function syncFullscreenUi(): void {
  const active = isFullscreen();
  document.body.classList.toggle('is-fullscreen', active);
  if (fullscreenButton) {
    fullscreenButton.textContent = active ? '⤡' : '⛶';
    fullscreenButton.setAttribute('aria-label', active ? 'Sair da tela cheia' : 'Tela cheia');
  }
  fitCanvas();
}

subscribeFullscreen(syncFullscreenUi);

function fitCanvas(): void {
  // Escala inteira para manter os pixels nítidos (no mobile, aproveita a tela).
  // Em tela cheia, o jogo ganha a resolução interna da tela (mais pixels na
  // horizontal em telas largas) e ocupa o viewport inteiro.
  const full = isFullscreen();
  // Em tela cheia os controles de toque flutuam por cima do jogo, então o
  // canvas usa a altura toda da janela.
  const controls = isTouch && !full ? 112 : 0;
  const availableW = window.innerWidth;
  const availableH = full
    ? window.innerHeight
    : window.innerHeight - controls - (isTouch ? 12 : 30);

  if (full) {
    // Tela cheia de verdade: a resolução interna acompanha o formato da tela
    // e o canvas preenche 100% do viewport (sem barras pretas).
    const aspect = availableW / Math.max(1, availableH);
    const internalW = Math.round(280 * aspect);
    applyInternalSize(Math.max(400, Math.min(720, internalW)), 280);
    const scale = Math.max(availableW / canvas.width, availableH / canvas.height);
    canvas.style.width = `${Math.round(canvas.width * scale)}px`;
    canvas.style.height = `${Math.round(canvas.height * scale)}px`;
    return;
  }

  applyInternalSize(400, 280);
  const raw = Math.min(availableW / 320, availableH / 224);
  const scale = raw >= 1 ? (isTouch ? raw : Math.floor(raw)) : raw;
  canvas.style.width = `${Math.round(320 * scale)}px`;
  canvas.style.height = `${Math.round(224 * scale)}px`;
}

/** Define a resolução interna (backing store) do canvas e avisa o jogo. */
function applyInternalSize(width: number, height: number): void {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  ctx.imageSmoothingEnabled = false;
  setViewport(width, height);
}

window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);
fitCanvas();
syncFullscreenUi();
