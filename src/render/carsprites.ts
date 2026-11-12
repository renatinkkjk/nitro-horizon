import rx7BotFrontUrl from '../assets/rx7-bot-front.png';
import rx7BotRearUrl from '../assets/rx7-bot-rear.png';
import rx7BotSideUrl from '../assets/rx7-bot-side.png';
import rx7FrontUrl from '../assets/rx7-front.png';
import rx7PlayerSideUrl from '../assets/rx7-player-side.png';
import rx7RearUrl from '../assets/rx7-rear.png';
import titaFrontUrl from '../assets/bot-tita-front.png';
import titaRearUrl from '../assets/bot-tita-rear.png';
import titaSideUrl from '../assets/bot-tita-side.png';
import trovaoFrontUrl from '../assets/bot-trovao-front.png';
import trovaoRearUrl from '../assets/bot-trovao-rear.png';
import trovaoSideUrl from '../assets/bot-trovao-side.png';
import vespaFrontUrl from '../assets/bot-vespa-front.png';
import vespaRearUrl from '../assets/bot-vespa-rear.png';
import vespaSideUrl from '../assets/bot-vespa-side.png';
import type { CarStyle } from '../entities/carspecs';
import type { CarDrawOptions, CarPaint } from './sprites';

/** Vistas disponíveis dos carros: traseira, frontal e lateral. */
export type CarView = 'rear' | 'front' | 'side';

interface SpritePair {
  front: string;
  rear: string;
  /** Vista lateral (usada na tela de seleção de carros). */
  side: string;
}

const PLAYER_RX7: SpritePair = { front: rx7FrontUrl, rear: rx7RearUrl, side: rx7PlayerSideUrl };
const BOT_RX7: SpritePair = { front: rx7BotFrontUrl, rear: rx7BotRearUrl, side: rx7BotSideUrl };
const VESPA: SpritePair = { front: vespaFrontUrl, rear: vespaRearUrl, side: vespaSideUrl };
const TROVAO: SpritePair = { front: trovaoFrontUrl, rear: trovaoRearUrl, side: trovaoSideUrl };
const TITA: SpritePair = { front: titaFrontUrl, rear: titaRearUrl, side: titaSideUrl };

/**
 * Sprite associado a cada estilo. Cada carro tem arte propria (frente,
 * lateral e traseira) extraida dos sprites novos. Estilos sem sprite caem
 * no desenho procedural.
 */
function pairFor(style: CarStyle, isPlayer: boolean): SpritePair | null {
  switch (style) {
    case 'rx7':
      return isPlayer ? PLAYER_RX7 : BOT_RX7;
    case 'light':
      return VESPA;
    case 'muscle':
      return TROVAO;
    case 'turbo':
      return TITA;
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
  PLAYER_RX7.front, PLAYER_RX7.rear, PLAYER_RX7.side,
  BOT_RX7.front, BOT_RX7.rear, BOT_RX7.side,
  VESPA.front, VESPA.rear, VESPA.side,
  TROVAO.front, TROVAO.rear, TROVAO.side,
  TITA.front, TITA.rear, TITA.side,
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
  const imageUrl = view === 'side' ? pair.side : pair[view];
  const image = imageFor(`${paint.style}-${opts.player ? 'p' : 'b'}-${view}`, imageUrl);
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
