/** Zoom 2x do canto superior da roda dianteira esquerda: original cru vs
 *  sprite atual. Regiao bbox x 0..80, y (base-140)..(base-40). */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';
const ASSETS = 'C:\\Users\\Máquina de resenha\\Documents\\Projeto Padrão\\src\\assets';

async function main() {
  const sheet = await Jimp.read(path.join(SRC, 'mascote.png'));
  const sw = sheet.bitmap.width;
  const sh = sheet.bitmap.height;
  const box = { x: Math.round(sw * 0.06), y: 0, w: Math.round(sw * 0.42), h: Math.round(sh * 0.36) };
  const piece = sheet.clone().crop(box.x, box.y, box.w, box.h);
  const { width, height, data } = piece.bitmap;
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.max(data[(y * width + x) * 4], data[(y * width + x) * 4 + 1], data[(y * width + x) * 4 + 2]) >= 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // bbox ORIGINAL completo (com o fragmento): recorte y relativo ao bbox
  const rawFull = piece.clone().crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
  const base = rawFull.bitmap.height; // 332 (com fragmento)
  const region = { x: 0, y: base - 150, w: 90, h: 110 };
  const rawCut = rawFull.clone().crop(region.x, region.y, region.w, region.h);

  const current = await Jimp.read(path.join(ASSETS, 'rx7-front.png'));
  // sprite atual: altura 285 = bbox sem as linhas do fragmento; alinhar pelo
  // topo (minY igual) -> mesma coordenada y
  const curCut = current.clone().crop(region.x, region.y, region.w, Math.min(region.h, current.bitmap.height - region.y));

  const w = rawCut.bitmap.width + curCut.bitmap.width + 8;
  const h = Math.max(rawCut.bitmap.height, curCut.bitmap.height);
  const canvas = new Jimp(w, h, 0xff00ffff);
  canvas.composite(rawCut, 0, 0);
  canvas.composite(curCut, rawCut.bitmap.width + 8, 0);
  const zoomed = canvas.resize(w * 2, h * 2, Jimp.RESIZE_NEAREST_NEIGHBOR);
  await zoomed.writeAsync(path.join(SRC, 'arch8-front.png'));
  console.log('arch8-front.png', zoomed.bitmap.width, 'x', zoomed.bitmap.height, 'regiao y', region.y, '..', region.y + region.h, '(esq=original, dir=atual)');
}

main().catch((e) => { console.error(e); process.exit(1); });
