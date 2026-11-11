/** Reporta lacunas contiguas (faltam px onde o original tinha) em texto. */
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
    const rh = maxY - minY + 1;

    const current = await Jimp.read(path.join(ASSETS, `rx7-${name}.png`));
    const cw = current.bitmap.width;
    const ch = current.bitmap.height;
    const cdata = current.bitmap.data;

    const missingRows = new Map(); // y -> [x ranges]
    for (let y = 0; y < rh; y += 1) {
      const xs = [];
      for (let x = 0; x < rw; x += 1) {
        const tone = Math.max(data[((y + minY) * width + (x + minX)) * 4], data[((y + minY) * width + (x + minX)) * 4 + 1], data[((y + minY) * width + (x + minX)) * 4 + 2]);
        if (tone < 8) continue;
        const alpha = (y < ch && x < cw) ? cdata[(y * cw + x) * 4 + 3] : 0;
        if (alpha < 200) xs.push(x);
      }
      if (xs.length > 0) {
        const ranges = [];
        let s = xs[0];
        let prev = xs[0];
        for (let i = 1; i <= xs.length; i += 1) {
          if (i < xs.length && xs[i] === prev + 1) { prev = xs[i]; continue; }
          ranges.push([s, prev]);
          if (i < xs.length) { s = xs[i]; prev = xs[i]; }
        }
        missingRows.set(y, ranges);
      }
    }
    const rows = [...missingRows.entries()].sort((a, b) => a[0] - b[0]);
    const big = rows.filter(([y, r]) => r.length * r.reduce((a, [a2, b2]) => a + (b2 - a2 + 1), 0) > 2);
    console.log(`\n== ${name} == linhas com falta: ${rows.length}`);
    for (const [y, ranges] of rows) {
      const total = ranges.reduce((a, [a2, b2]) => a + (b2 - a2 + 1), 0);
      if (total > 1 || ranges.length > 1) {
        console.log(`  y ${y}: ${ranges.map(([a, b]) => (a === b ? String(a) : `${a}-${b}`)).join(', ')}`);
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
