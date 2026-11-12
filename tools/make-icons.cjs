/**
 * Gera os ícones do PWA a partir do mascote CEPK (public/sprites/mascote.png).
 *
 *  - icon-192.png / icon-512.png  -> ícones "any" (Android/Windows)
 *  - icon-maskable-512.png       -> "maskable" (Android adaptativo, com folga)
 *  - apple-touch-icon.png         -> iOS (180x180, fundo opaco)
 */
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const SPRITES = path.join(__dirname, '..', 'public', 'sprites');
const OUT = path.join(__dirname, '..', 'public');

const BG = 0x0b0d17ff;
const CYAN = 0x22e0ffff;
const PINK = 0xff3d7fff;

async function makeIcon(size, mascotScale, frame, file) {
  const src = await Jimp.read(path.join(SPRITES, 'mascote.png'));
  const img = new Jimp(size, size, BG);

  // moldura retrô
  if (frame > 0) {
    for (let i = 0; i < frame; i += 1) {
      img.scan(0, 0, size, 1, (x, y, idx) => {
        img.bitmap.data[idx] = (CYAN >> 24) & 0xff;
        img.bitmap.data[idx + 1] = (CYAN >> 16) & 0xff;
        img.bitmap.data[idx + 2] = (CYAN >> 8) & 0xff;
        img.bitmap.data[idx + 3] = 255;
      });
      img.scan(0, size - 1, size, 1, (x, y, idx) => {
        img.bitmap.data[idx] = (CYAN >> 24) & 0xff;
        img.bitmap.data[idx + 1] = (CYAN >> 16) & 0xff;
        img.bitmap.data[idx + 2] = (CYAN >> 8) & 0xff;
        img.bitmap.data[idx + 3] = 255;
      });
      img.scan(0, 0, 1, size, (x, y, idx) => {
        img.bitmap.data[idx] = (CYAN >> 24) & 0xff;
        img.bitmap.data[idx + 1] = (CYAN >> 16) & 0xff;
        img.bitmap.data[idx + 2] = (CYAN >> 8) & 0xff;
        img.bitmap.data[idx + 3] = 255;
      });
      img.scan(size - 1, 0, 1, size, (x, y, idx) => {
        img.bitmap.data[idx] = (CYAN >> 24) & 0xff;
        img.bitmap.data[idx + 1] = (CYAN >> 16) & 0xff;
        img.bitmap.data[idx + 2] = (CYAN >> 8) & 0xff;
        img.bitmap.data[idx + 3] = 255;
      });
    }
  }

  // mascote centralizado
  const target = Math.floor(size * mascotScale);
  const scale = target / Math.max(src.bitmap.width, src.bitmap.height);
  const w = Math.floor(src.bitmap.width * scale);
  const h = Math.floor(src.bitmap.height * scale);
  const resized = src.clone().resize(w, h);
  img.composite(resized, Math.floor((size - w) / 2), Math.floor((size - h) / 2));

  await img.quality(92).writeAsync(path.join(OUT, file));
  console.log(file, size + 'x' + size);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await makeIcon(192, 0.86, 3, 'icon-192.png');
  await makeIcon(512, 0.86, 6, 'icon-512.png');
  await makeIcon(512, 0.6, 0, 'icon-maskable-512.png');
  await makeIcon(180, 0.9, 0, 'apple-touch-icon.png');
  console.log('ícones do PWA gerados');
}

main().catch((e) => { console.error(e); process.exit(1); });
