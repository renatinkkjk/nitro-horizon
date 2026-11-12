const Jimp = require('jimp');
const path = require('path');

/** Componentes conectados de pixels pretos opacos, com bounding box. */
function blackComponents(img) {
  const { width, height, data } = img.bitmap;
  const seen = new Uint8Array(width * height);
  const comps = [];
  const isBlack = (i) => {
    if (data[i * 4 + 3] <= 8) return false;
    return Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < 12;
  };
  for (let i = 0; i < width * height; i += 1) {
    if (seen[i] || !isBlack(i)) continue;
    const stack = [i];
    seen[i] = 1;
    let n = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    while (stack.length) {
      const idx = stack.pop();
      const x = idx % width;
      const y = Math.floor(idx / width);
      n += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const neigh = [idx - 1, idx + 1, idx - width, idx + width];
      for (const nb of neigh) {
        if (nb < 0 || nb >= width * height) continue;
        if (seen[nb] || !isBlack(nb)) continue;
        seen[nb] = 1;
        stack.push(nb);
      }
    }
    comps.push({ n, minX, maxX, minY, maxY });
  }
  comps.sort((a, b) => b.n - a.n);
  return comps;
}

async function show(label, file) {
  const img = await Jimp.read(file);
  const comps = blackComponents(img);
  console.log('--- ' + label + ' (' + img.bitmap.width + 'x' + img.bitmap.height + ') comps pretos=' + comps.length);
  comps.slice(0, 6).forEach((c) => {
    console.log('    px=' + c.n + ' box=(' + c.minX + ',' + c.minY + ')-(' + c.maxX + ',' + c.maxY + ') ' + (c.maxX - c.minX + 1) + 'x' + (c.maxY - c.minY + 1));
  });
}

async function main() {
  const dir = path.join(__dirname, '..', 'src', 'assets');
  await show('ATUAL (sem flood-fill) rx7-bot-front', path.join(dir, 'rx7-bot-front.png'));
  await show('ATUAL (sem flood-fill) rx7-bot-side', path.join(dir, 'rx7-bot-side.png'));
}
main().catch((e) => { console.error(e); process.exit(1); });
