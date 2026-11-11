/** Traça, por coluna, o último pixel com tom >= 8 (borda inferior do conteúdo)
 *  e marca em ciano, para descobrir a linha do chão dos sprites. */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';

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
    const bottoms = [];
    for (let x = 0; x < width; x += 1) {
      let bottom = -1;
      for (let y = height - 1; y >= 0; y -= 1) {
        const i = (y * width + x) * 4;
        if (Math.max(data[i], data[i + 1], data[i + 2]) >= 8) { bottom = y; break; }
      }
      bottoms.push(bottom);
    }
    // estatística
    const valid = bottoms.filter((b) => b >= 0);
    const sorted = [...valid].sort((a, b) => a - b);
    console.log(`${name}: colunas=${valid.length}/${width} min=${sorted[0]} p25=${sorted[Math.floor(sorted.length * 0.25)]} mediana=${sorted[Math.floor(sorted.length / 2)]} p75=${sorted[Math.floor(sorted.length * 0.75)]} max=${sorted[sorted.length - 1]}`);
    // marca em ciano o traçado sobre a imagem
    for (let x = 0; x < width; x += 1) {
      const b = bottoms[x];
      if (b >= 0) {
        for (let t = 0; t < 3; t += 1) {
          const y = Math.min(b + t, height - 1);
          const i = (y * width + x) * 4;
          data[i] = 0; data[i + 1] = 255; data[i + 2] = 255;
        }
      }
    }
    piece.bitmap.data = data;
    await piece.writeAsync(path.join(SRC, `ground-${name}.png`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
