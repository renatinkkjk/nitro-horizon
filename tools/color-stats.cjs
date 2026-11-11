/** Reporta a cor média/tons dominantes de um sprite (para entender o que o
 *  usuario subiu como 31673-removebg-preview.png). */
const Jimp = require('jimp');
const path = require('path');

async function main() {
  const p = process.argv[2];
  const image = await Jimp.read(p);
  const { width, height, data } = image.bitmap;
  let rSum = 0, gSum = 0, bSum = 0, n = 0;
  const tones = new Map();
  for (let i = 0; i < width * height; i += 1) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    rSum += r; gSum += g; bSum += b; n += 1;
    const key = Math.round((Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 32) * 32;
    tones.set(key, (tones.get(key) || 0) + 1);
  }
  console.log(`${path.basename(p)} ${width}x${height} avg=(${rSum / n | 0},${gSum / n | 0},${bSum / n | 0}) tones=${[...tones.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
