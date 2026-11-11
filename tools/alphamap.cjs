/** Composição dos sprites atuais sobre fundo magenta para revelar
 *  exatamente o que ficou transparente. */
const Jimp = require('jimp');
const path = require('path');

const ASSETS = 'C:\\Users\\Máquina de resenha\\Documents\\Projeto Padrão\\src\\assets';
const OUT = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';

async function main() {
  for (const name of ['rx7-front', 'rx7-rear']) {
    const image = await Jimp.read(path.join(ASSETS, `${name}.png`));
    const { width, height, data } = image.bitmap;
    for (let i = 0; i < width * height; i += 1) {
      if (data[i * 4 + 3] < 200) {
        data[i * 4] = 255; data[i * 4 + 1] = 0; data[i * 4 + 2] = 255; data[i * 4 + 3] = 255;
      }
    }
    image.bitmap.data = data;
    await image.writeAsync(path.join(OUT, `alpha3-${name}.png`));
    console.log(`alpha3-${name}.png`, width, 'x', height);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
