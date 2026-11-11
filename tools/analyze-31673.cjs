/** Analisa o sprite 31673: bbox do conteudo, alfa, percepcao de "sheet". */
const Jimp = require('jimp');
const path = require('path');

async function main() {
  const image = await Jimp.read('src/assets/31673-removebg-preview.png');
  const { width, height, data } = image.bitmap;
  let minX = width, minY = height, maxX = -1, maxY = -1, opaque = 0, total = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      total += 1;
      if (a > 128) {
        opaque += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`size=${width}x${height} opacos=${opaque} (${(100 * opaque / total).toFixed(1)}%) bbox=${minX},${minY} -> ${maxX},${maxY}`);
  // perfil de colunas: quantos pixels opacos por faixa (para detectar varios carros lado a lado)
  const colCounts = [];
  for (let x = 0; x < width; x += 1) {
    let c = 0;
    for (let y = 0; y < height; y += 1) if (data[(y * width + x) * 4 + 3] > 128) c += 1;
    colCounts.push(c);
  }
  // acha blocos contiguos com conteudo
  const blocks = [];
  let start = -1;
  for (let x = 0; x <= width; x += 1) {
    const on = x < width && colCounts[x] > 5;
    if (on && start < 0) start = x;
    if (!on && start >= 0) { blocks.push({ x0: start, x1: x - 1 }); start = -1; }
  }
  if (start >= 0) blocks.push({ x0: start, x1: width - 1 });
  console.log('blocos horizontais:', blocks.map(b => ({ x0: b.x0, x1: b.x1, w: b.x1 - b.x0 + 1 })).join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
