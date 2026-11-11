/** Zoom 2x da regiao do arco da roda esquerda da traseira: original cru vs
 *  sprite atual, lado a lado, para decidir se o vao do arco e see-through. */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';
const ASSETS = 'C:\\Users\\Máquina de resenha\\Documents\\Projeto Padrão\\src\\assets';

async function main() {
  const sheet = await Jimp.read(path.join(SRC, 'mascote.png'));
  const sw = sheet.bitmap.width;
  const sh = sheet.bitmap.height;

  const boxes = {
    front: { x: Math.round(sw * 0.06), y: 0, w: Math.round(sw * 0.42), h: Math.round(sh * 0.36) },
    rear: { x: Math.round(sw * 0.54), y: 0, w: Math.round(sw * 0.45), h: Math.round(sh * 0.36) },
  };

  for (const [name, box] of Object.entries(boxes)) {
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
    const crop = piece.clone().crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
    // rodape: x 0..190, y (base - 88) .. base
    const base = crop.bitmap.height;
    const region = { x: 0, y: Math.max(0, base - 88), w: 190, h: base - Math.max(0, base - 88) };
  const rawCut = crop.clone().crop(region.x, region.y, region.w, region.h);

  const current = await Jimp.read(path.join(ASSETS, `rx7-${name}.png`));
  const curCut = current.clone().crop(region.x, region.y, Math.min(region.w, current.bitmap.width), Math.min(region.h, current.bitmap.height - region.y));

  const w = rawCut.bitmap.width + curCut.bitmap.width + 8;
  const h = Math.max(rawCut.bitmap.height, curCut.bitmap.height);
  const canvas = new Jimp(w, h, 0xff00ffff);
  canvas.composite(rawCut, 0, 0);
  canvas.composite(curCut, rawCut.bitmap.width + 8, 0);
  const zoomed = canvas.resize(w * 2, h * 2, Jimp.RESIZE_NEAREST_NEIGHBOR);
  await zoomed.writeAsync(path.join(SRC, `arch7-${name}.png`));
  console.log(`arch7-${name}.png`, zoomed.bitmap.width, 'x', zoomed.bitmap.height, '(esq=original, dir=atual, magenta=transparente)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
