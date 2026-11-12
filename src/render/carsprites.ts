import type { CarStyle } from '../entities/carspecs';
import type { CarDrawOptions, CarPaint } from './sprites';

/**
 * URLs dos sprites com NOME ESTÁVEL (public/sprites), sem hash do Vite.
 *
 * Com nomes com hash, um index.html em cache aponta para um JS antigo e os
 * PNGs com hash antigo somem no deploy seguinte (404) — aí os carros
 * simplesmente APARECEM. Com nome fixo, qualquer JS em cache ainda acha
 * os arquivos. O ?v= invalida o cache do arquivo quando a arte muda.
 */
const SPRITE_BASE = '/nitro-horizon/sprites';
const SPRITE_V = 6;

function sprite(name: string): string {
  return `${SPRITE_BASE}/${name}?v=${SPRITE_V}`;
}

const rx7BotFrontUrl = sprite('rx7-bot-front.png');
const rx7BotRearUrl = sprite('rx7-bot-rear.png');
const rx7BotSideUrl = sprite('rx7-bot-side.png');
const rx7FrontUrl = sprite('rx7-front.png');
const rx7PlayerSideUrl = sprite('rx7-player-side.png');
const rx7RearUrl = sprite('rx7-rear.png');
const hemicudaFrontUrl = sprite('bot-hemicuda-front.png');
const hemicudaRearUrl = sprite('bot-hemicuda-rear.png');
const hemicudaSideUrl = sprite('bot-hemicuda-side.png');
// CIVIC EG é o azul e SALEEN S7 é o laranja.
const civicFrontUrl = sprite('bot-civic-front.png');
const civicRearUrl = sprite('bot-civic-rear.png');
const civicSideUrl = sprite('bot-civic-side.png');
const saleenFrontUrl = sprite('bot-saleen-front.png');
const saleenRearUrl = sprite('bot-saleen-rear.png');
const saleenSideUrl = sprite('bot-saleen-side.png');

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
const HEMICUDA: SpritePair = { front: hemicudaFrontUrl, rear: hemicudaRearUrl, side: hemicudaSideUrl };
const CIVIC: SpritePair = { front: civicFrontUrl, rear: civicRearUrl, side: civicSideUrl };
const SALEEN: SpritePair = { front: saleenFrontUrl, rear: saleenRearUrl, side: saleenSideUrl };

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
      return SALEEN;
    case 'muscle':
      return HEMICUDA;
    case 'turbo':
      return CIVIC;
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
// IMPORTANTE: usa as MESMAS chaves do desenho (estilo-jogador-vista) para
// reaproveitar exatamente os mesmos objetos Image. Antes o preload usava
// chaves diferentes, então na largada o jogo criava 16 imagens novas e
// decodificava tudo de uma vez — um travamento de centenas de ms.
const PRELOADS: Array<[string, SpritePair]> = [
  ['rx7-p', PLAYER_RX7],
  ['rx7-b', BOT_RX7],
  ['light-b', CIVIC],
  ['muscle-b', HEMICUDA],
  ['turbo-b', SALEEN],
];

PRELOADS.forEach(([prefix, pair]) => {
  (['front', 'rear', 'side'] as const).forEach((view) => {
    const image = imageFor(`${prefix}-${view}`, pair[view]);
    // Dispara o decode agora (fora do caminho crítico do primeiro frame).
    if (typeof image.decode === 'function') void image.decode().catch(() => {});
  });
});

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
