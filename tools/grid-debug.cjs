/** Gera recortes crus (sem remover fundo) com grade de 20px para mapear
 *  as regiões que o flood-fill comeu indevidamente. */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';
const OUT = 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';

async function main() {
  const sheet = await Jimp.read(path.join(SRC, 'mascote.png'));
  const sw = sheet.bitmap.width;
  const sh = sheet.bitmap.height;

  const boxes = {
    'front': { x: Math.round(sw * 0.06), y: 0, w: Math.round(sw * 0.42), h: Math.round(sh * 0.36) },
    'rear': { x: Math.round(sw * 0.54), y: 0, w: Math.round(sw * 0.45), h: Math.round(sh * 0.36) },
  };

  for (const [name, box] of Object.entries(boxes)) {
    const piece = sheet.clone().crop(box.x, box.y, box.w, box.h);
    const { width, height } = piece.bitmap;
    // Grade: linha vermelha a cada 20px, mais grossa a cada 100px.
    for (let x = 0; x < width; x += 20) {
      const thick = x % 100 === 0 ? 2 : 1;
      for (let t = 0; t < thick; t += 1) {
        for (let y = 0; y < height; y += 1) piece.setPixelColor(x + t >= width ? 0xff0000 : 0xff0000, Math.min(x + t, width - 1), y);
      }
    }
    for (let y = 0; y < height; y += 20) {
      const thick = y % 100 === 0 ? 2 : 1;
      for (let t = 0; t < thick; t += 1) {
        for (let x = 0; x < width; x += 1) piece.setPixelColor(0xff0000, x, Math.min(y + t, height - 1));
      }
    }
    await piece.writeAsync(path.join(OUT, `grid-${name}.png`));
    console.log(`grid-${name}.png`, width, 'x', height, 'boxOrigem', JSON.stringify(box));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
