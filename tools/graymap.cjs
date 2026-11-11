/** Visualiza onde estão os tons quase-pretos (8..63) — bordas/textura dos
 *  pneus e splitter — marcando em verde sobre o recorte, para mapear
 *  as regiões que o flood-fill não deve remover. */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';
const OUT = SRC;

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
    for (let i = 0; i < width * height; i += 1) {
      const max = Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (max >= 8 && max < 64) {
        // Quase-preto relevante: pinta de verde para visualizar.
        data[i * 4] = 0; data[i * 4 + 1] = 255; data[i * 4 + 2] = 0;
      } else if (max < 8) {
        data[i * 4] = 0; data[i * 4 + 1] = 0; data[i * 4 + 2] = 0;
      }
    }
    piece.bitmap.data = data;
    await piece.writeAsync(path.join(OUT, `graymap-${name}.png`));
    console.log(`graymap-${name}.png`, width, 'x', height);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
