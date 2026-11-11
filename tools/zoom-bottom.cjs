/** Zoom 2x da base dos sprites (ultimas 70 linhas) para inspecao. */
const Jimp = require('jimp');
const path = require('path');

const ASSETS = 'C:\\Users\\Máquina de resenha\\Documents\\Projeto Padrão\\src\\assets';
const OUT = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';

async function main() {
  for (const name of ['rx7-front', 'rx7-rear']) {
    const image = await Jimp.read(path.join(ASSETS, `${name}.png`));
    const { width, height } = image.bitmap;
    const top = Math.max(0, height - 70);
    const piece = image.clone().crop(0, top, width, height - top);
    // fundo magenta
    piece.scan(0, 0, piece.bitmap.width, piece.bitmap.height, function (x, y, idx) {
      if (this.bitmap.data[idx + 3] < 200) {
        this.bitmap.data[idx] = 255; this.bitmap.data[idx + 1] = 0; this.bitmap.data[idx + 2] = 255; this.bitmap.data[idx + 3] = 255;
      }
    });
    const zoomed = piece.resize(piece.bitmap.width * 2, piece.bitmap.height * 2, Jimp.RESIZE_NEAREST_NEIGHBOR);
    await zoomed.writeAsync(path.join(OUT, `zoom4-${name}.png`));
    console.log(`zoom4-${name}.png`, zoomed.bitmap.width, 'x', zoomed.bitmap.height);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
