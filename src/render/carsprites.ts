import blueFrontUrl from '../assets/bot-blue-front.png';
import blueRearUrl from '../assets/bot-blue-rear.png';
import purpleFrontUrl from '../assets/bot-purple-front.png';
import purpleRearUrl from '../assets/bot-purple-rear.png';
import rx7BotFrontUrl from '../assets/rx7-bot-front.png';
import rx7BotRearUrl from '../assets/rx7-bot-rear.png';
import rx7FrontUrl from '../assets/rx7-front.png';
import rx7RearUrl from '../assets/rx7-rear.png';
import silverFrontUrl from '../assets/bot-silver-front.png';
import silverRearUrl from '../assets/bot-silver-rear.png';
import type { CarStyle } from '../entities/carspecs';
import type { CarDrawOptions, CarPaint } from './sprites';

/** Vistas disponíveis dos carros: traseira (padrão) e frontal. */
export type CarView = 'rear' | 'front';

interface SpritePair {
  front: string;
  rear: string;
}

const PLAYER_RX7: SpritePair = { front: rx7FrontUrl, rear: rx7RearUrl };
const BOT_RX7: SpritePair = { front: rx7BotFrontUrl, rear: rx7BotRearUrl };
const BLUE_HATCH: SpritePair = { front: blueFrontUrl, rear: blueRearUrl };
const PURPLE_MUSCLE: SpritePair = { front: purpleFrontUrl, rear: purpleRearUrl };
const SILVER_GT: SpritePair = { front: silverFrontUrl, rear: silverRearUrl };

/**
 * Sprite associado a cada estilo. O RX-7 do jogador usa a arte amarela CEPK;
 * os RX-7 das IAs usam a vermelha. Estilos sem sprite caem no desenho procedural.
 */
function pairFor(style: CarStyle, isPlayer: boolean): SpritePair | null {
  switch (style) {
    case 'rx7':
      return isPlayer ? PLAYER_RX7 : BOT_RX7;
    case 'light':
      return BLUE_HATCH;
    case 'muscle':
      return PURPLE_MUSCLE;
    case 'turbo':
      return SILVER_GT;
    default:
      return null;
  }
}

const cache = new Map<string, HTMLImageElement>();

function imageFor(key: string, url: string): HTMLImageElement {
  let image = cache.get(key);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.src = url;
    cache.set(key, image);
  }
  return image;
}

// Pré-carrega todas as vistas assim que o módulo é importado.
[
  PLAYER_RX7.front, PLAYER_RX7.rear,
  BOT_RX7.front, BOT_RX7.rear,
  BLUE_HATCH.front, BLUE_HATCH.rear,
  PURPLE_MUSCLE.front, PURPLE_MUSCLE.rear,
  SILVER_GT.front, SILVER_GT.rear,
].forEach((url, index) => imageFor(`preload-${index}`, url));

/**
 * Desenha o carro com o sprite correspondente ao estilo.
 * (cx, baseY) = centro inferior em pixels. Retorna false se o estilo
 * não tem sprite (o chamador usa o desenho procedural).
 */
export function drawSpriteCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  paint: CarPaint,
  opts: CarDrawOptions = {},
): boolean {
  if (w < 2 || h < 2) return true;

  const pair = pairFor(paint.style ?? 'gt', opts.player === true);
  if (!pair || !opts.view) return false;

  const view: CarView = opts.view;
  const image = imageFor(`${paint.style}-${opts.player ? 'p' : 'b'}-${view}`, pair[view]);
  if (!image.complete || image.naturalWidth === 0) return true;

  // Escala única por vista: o carro não muda de tamanho ao olhar para trás.
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const dw = Math.max(1, Math.round(image.naturalWidth * scale));
  const dh = Math.max(1, Math.round(image.naturalHeight * scale));

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(baseY));
  if (opts.lean) ctx.rotate(opts.lean);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(-dw / 2), -dh, dw, dh);
  ctx.restore();
  return true;
}
