import frontUrl from '../assets/rx7-front.png';
import rearUrl from '../assets/rx7-rear.png';
import type { CarDrawOptions, CarPaint } from './sprites';

/** Vistas disponíveis do Mazda RX-7 (FD): traseira e frontal. */
export type Rx7View = 'rear' | 'front';

/** Tamanho de referência das artes fornecidas (o desenho preserva a proporção). */
const REF_WIDTH = 67;
const REF_HEIGHT = 50;

const SOURCES: Record<Rx7View, string> = {
  front: frontUrl,
  rear: rearUrl,
};

const images: Partial<Record<Rx7View, HTMLImageElement>> = {};

function imageFor(view: Rx7View): HTMLImageElement {
  let image = images[view];
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.src = SOURCES[view];
    images[view] = image;
  }
  return image;
}

// Pré-carrega as duas vistas assim que o módulo é importado.
imageFor('front');
imageFor('rear');

/**
 * Desenha o Mazda RX-7 (FD) com os sprites em pixel art fornecidos.
 * (cx, baseY) = centro inferior em pixels.
 */
export function drawRx7(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  _paint: CarPaint,
  opts: CarDrawOptions = {},
): void {
  if (w < 2 || h < 2) return;

  const view = opts.view ?? 'rear';
  const image = imageFor(view);
  if (!image.complete || image.naturalWidth === 0) return;

  // Escala única para as duas vistas: o carro não muda de tamanho ao olhar para trás.
  const scale = Math.min(w / REF_WIDTH, h / REF_HEIGHT);
  const dw = Math.max(1, Math.round(image.naturalWidth * scale));
  const dh = Math.max(1, Math.round(image.naturalHeight * scale));
  const dx = Math.round(cx - dw / 2);
  const dy = Math.round(baseY - dh);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();
}
