/** Debug do refill: mostra por coluna currentBottom/traceBottom/contagem. */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';

async function main() {
  const sheet = await Jimp.read(path.join(SRC, 'mascote.png'));
  const sw = sheet.bitmap.width;
  const sh = sheet.bitmap.height;
  const box = { x: Math.round(sw * 0.06), y: 0, w: Math.round(sw * 0.42), h: Math.round(sh * 0.36) };
  const piece = sheet.clone().crop(box.x, box.y, box.w, box.h);
  const { width: w, height: h, data } = piece.bitmap;

  // flood fill igual ao extract (max < 10)
  const visited = new Uint8Array(w * h);
  const stack = [];
  const isBg = (i) => Math.max(data[i], data[i + 1], data[i + 2]) < 10;
  const push = (x, y) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    if (!isBg(idx * 4)) return;
    visited[idx] = 1;
    stack.push(x, y);
  };
  for (let x = 0; x < w; x += 1) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y += 1) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  for (const idx of visited.keys()) if (visited[idx]) data[idx * 4 + 3] = 0;

  // trace e currentBottom
  const cols = [200, 260, 300, 340, 420, 480];
  for (const cx of cols) {
    let trace = -1;
    for (let cy = h - 1; cy >= 0; cy -= 1) {
      const i = (cy * w + cx) * 4;
      if (Math.max(data[i], data[i + 1], data[i + 2]) >= 8) { trace = cy; break; }
    }
    let cur = -1;
    for (let cy = h - 1; cy >= 0; cy -= 1) {
      if (data[(cy * w + cx) * 4 + 3] > 127) { cur = cy; break; }
    }
    console.log(`col ${cx}: currentBottom=${cur} traceBottom=${trace} refillCount=${Math.max(0, Math.min(trace, 324) - Math.max(cur, -1))}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
