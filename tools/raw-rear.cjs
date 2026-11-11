/** Recorte cru da traseira (sem flood) com zoom 2x da base, para comparar
 *  com o sprite atual e decidir o que deve ser opaco. */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';

async function main() {
  const sheet = await Jimp.read(path.join(SRC, 'mascote.png'));
  const sw = sheet.bitmap.width;
  const sh = sheet.bitmap.height;
  const box = { x: Math.round(sw * 0.54), y: 0, w: Math.round(sw * 0.45), h: Math.round(sh * 0.36) };
  const piece = sheet.clone().crop(box.x, box.y, box.w, box.h);
  // bbox do conteudo (tom >= 8)
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
  const bottom = crop.clone().crop(0, Math.max(0, crop.bitmap.height - 70), crop.bitmap.width, 70);
  const zoomed = bottom.resize(bottom.bitmap.width * 2, bottom.bitmap.height * 2, Jimp.RESIZE_NEAREST_NEIGHBOR);
  await zoomed.writeAsync(path.join(SRC, 'rawrear-bottom.png'));
  console.log('rawrear-bottom.png', zoomed.bitmap.width, 'x', zoomed.bitmap.height, 'bbox y', minY, '..', maxY);
}

main().catch((e) => { console.error(e); process.exit(1); });
