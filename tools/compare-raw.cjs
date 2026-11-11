/** Comparacao lado a lado: recorte cru original (fundo preto) vs sprite atual
 *  (composto sobre preto). 1x, empilhados verticalmente. */
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
    const raw = piece.clone().crop(minX, minY, maxX - minX + 1, maxY - minY + 1);

    const current = await Jimp.read(path.join(ASSETS, `rx7-${name}.png`));
    // garante fundo preto opaco atrás do sprite atual
    const currentOnBlack = new Jimp(current.bitmap.width, current.bitmap.height, 0x000000ff);
    currentOnBlack.composite(current, 0, 0);

    const w = Math.max(raw.bitmap.width, currentOnBlack.bitmap.width);
    const totalH = raw.bitmap.height + currentOnBlack.bitmap.height + 6;
    const canvas = new Jimp(w, totalH, 0x000000ff);
    canvas.composite(raw, 0, 0);
    canvas.composite(currentOnBlack, 0, raw.bitmap.height + 6);
    await canvas.writeAsync(path.join(SRC, `cmp9-${name}.png`));
    console.log(`cmp9-${name}.png`, w, 'x', totalH, '(topo=original, baixo=atual) bbox y', minY, '..', maxY);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
