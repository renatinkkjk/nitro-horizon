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

// Hook de depuração: expõe o estado do jogo no console do navegador.
(window as unknown as { __nitro?: Game }).__nitro = game;

function fitCanvas(): void {
  // Escala inteira para manter os pixels nítidos.
  const availableW = window.innerWidth;
  const availableH = window.innerHeight - 30;
  const raw = Math.min(availableW / 320, availableH / 224);
  const scale = raw >= 1 ? Math.max(1, Math.floor(raw)) : raw;
  canvas.style.width = `${Math.round(320 * scale)}px`;
  canvas.style.height = `${Math.round(224 * scale)}px`;
}

window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);
fitCanvas();
