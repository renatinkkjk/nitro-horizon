import { Game } from './game';

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

function fitCanvas(): void {
  // Escala inteira para manter os pixels nítidos (no mobile, aproveita a tela).
  const controls = isTouch ? 112 : 0;
  const availableW = window.innerWidth;
  const availableH = window.innerHeight - controls - (isTouch ? 12 : 30);
  const raw = Math.min(availableW / 320, availableH / 224);
  const scale = raw >= 1 ? (isTouch ? raw : Math.floor(raw)) : raw;
  canvas.style.width = `${Math.round(320 * scale)}px`;
  canvas.style.height = `${Math.round(224 * scale)}px`;
}

window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);
fitCanvas();
