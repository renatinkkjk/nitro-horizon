const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

async function main() {
  const dir = path.join(__dirname, '..', 'src', 'assets');
  const files = fs.readdirSync(dir).filter((f) => /^(bot-(vespa|trovao|tita)|rx7-bot|rx7-player|rx7)-(front|side|rear)\.png$/.test(f));
  for (const f of files.sort()) {
    const img = await Jimp.read(path.join(dir, f));
    const { width, height, data } = img.bitmap;
    const rows = [];
    for (let y = 0; y < height; y += 1) {
      let n = 0;
      for (let x = 0; x < width; x += 1) if (data[(y * width + x) * 4 + 3] > 8) n += 1;
      rows.push(n);
    }
    // bandas de linhas com conteudo
    const bands = [];
    let start = -1;
    for (let y = 0; y < height; y += 1) {
      const on = rows[y] > 2;
      if (on && start < 0) start = y;
      if (!on && start >= 0) { bands.push([start, y - 1, rows.slice(start, y).reduce((a, b) => a + b, 0)]); start = -1; }
    }
    if (start >= 0) bands.push([start, height - 1, rows.slice(start).reduce((a, b) => a + b, 0)]);
    console.log(f, width + 'x' + height, 'bandas=' + bands.length);
    bands.forEach((b) => console.log('   y=' + b[0] + '..' + b[1] + ' (h=' + (b[1] - b[0] + 1) + ') pixels=' + b[2]));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
