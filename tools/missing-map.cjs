/** Marca em VERMELHO os pixels que faltam (opacos no original, transparentes
 *  no sprite atual) sobre o sprite atual, para localizacao visual. */
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
    const rw = maxX - minX + 1;
    const rh = Math.min(maxY - minY + 1, 330);

    const current = await Jimp.read(path.join(ASSETS, `rx7-${name}.png`));
    const cw = current.bitmap.width;
    const ch = current.bitmap.height;
    const cdata = current.bitmap.data;

    // constroi direto no buffer: magenta = transparente, vermelho = falta
    const out = new Jimp(cw, ch);
    const nd = out.bitmap.data;
    const cdata2 = current.bitmap.data;
    nd.set(cdata2.subarray(0, Math.min(cdata2.length, nd.length)));
    for (let i = 0; i < cw * ch; i += 1) {
      if (nd[i * 4 + 3] < 200) {
        nd[i * 4] = 255; nd[i * 4 + 1] = 0; nd[i * 4 + 2] = 255; nd[i * 4 + 3] = 255;
      }
    }
    let marked = 0;
    for (let y = 0; y < Math.min(rh, ch); y += 1) {
      for (let x = 0; x < rw; x += 1) {
        const tone = Math.max(data[((y + minY) * width + (x + minX)) * 4], data[((y + minY) * width + (x + minX)) * 4 + 1], data[((y + minY) * width + (x + minX)) * 4 + 2]);
        if (tone < 8) continue;
        if (y < ch && x < cw && cdata2[(y * cw + x) * 4 + 3] < 200) {
          nd[(y * cw + x) * 4] = 255; nd[(y * cw + x) * 4 + 1] = 0; nd[(y * cw + x) * 4 + 2] = 0; nd[(y * cw + x) * 4 + 3] = 255;
          marked += 1;
        }
      }
    }
    await out.writeAsync(path.join(SRC, `miss6-${name}.png`));
    console.log(`miss6-${name}.png marcados=${marked}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
