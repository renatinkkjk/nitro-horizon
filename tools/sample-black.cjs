/** Amostra os tons de preto do mascote.png para calibrar o threshold. */
const Jimp = require('jimp');

async function main() {
  const image = await Jimp.read(process.argv[2]);
  const { width, height, data } = image.bitmap;
  const counts = new Map();
  for (let i = 0; i < width * height; i += 1) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const max = Math.max(r, g, b);
    const key = max < 8 ? '0-7' : max < 16 ? '8-15' : max < 32 ? '16-31' : max < 64 ? '32-63' : max < 128 ? '64-127' : '128+';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  console.log([...counts.entries()].sort().map(([k, v]) => `${k}: ${v}`).join('\n'));
  // Amostra de uma linha vertical no meio da vista frontal (x = 30% da largura)
  const x = Math.round(width * 0.3);
  let line = '';
  for (let y = 0; y < height; y += Math.round(height / 32)) {
    const i = (y * width + x) * 4;
    line += `${y}:(${data[i]},${data[i + 1]},${data[i + 2]}) `;
  }
  console.log(line);
}
main().catch((e) => { console.error(e); process.exit(1); });
