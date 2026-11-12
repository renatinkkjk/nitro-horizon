const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

function stripChunk(buf, type) {
  const out = [buf.slice(0, 8)];
  let off = 8;
  while (off < buf.length - 8) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const end = off + 12 + len;
    if (t !== type) out.push(buf.slice(off, end));
    off = end;
    if (t === 'IEND') break;
  }
  return Buffer.concat(out);
}

/** Conta buracos internos (transparentes cercados por pixels opacos). */
function internalHoles(data, width, height) {
  const seen = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const idx = y * width + x;
    if (seen[idx]) return;
    if (data[idx * 4 + 3] > 8) return; // opaco = parede
    seen[idx] = 1;
    stack.push(x, y);
  };
  for (let x = 0; x < width; x += 1) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y += 1) { push(0, y); push(width - 1, y); }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  let holes = 0;
  let holePx = 0;
  for (let i = 0; i < width * height; i += 1) {
    if (!seen[i] && data[i * 4 + 3] <= 8) { holes += 1; holePx += 1; }
  }
  return holePx;
}

async function report(label, img) {
  const { width, height, data } = img.bitmap;
  let opaque = 0;
  let blackOpaque = 0;
  for (let i = 0; i < width * height; i += 1) {
    if (data[i * 4 + 3] > 8) {
      opaque += 1;
      const mx = Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (mx < 10) blackOpaque += 1;
    }
  }
  const holes = internalHoles(data, width, height);
  console.log(label, width + 'x' + height, 'opaco=' + opaque, 'buracosInternos=' + holes, 'pretoOpaco=' + blackOpaque);
}

async function main() {
  const dir = path.join(__dirname, '..', 'src', 'assets');
  const files = fs.readdirSync(dir).filter((f) => /^(bot-(vespa|trovao|tita)|rx7-bot|rx7-player|rx7)-(front|side|rear)\.png$/.test(f));
  console.log('--- SPRITES ATUAIS (src/assets) ---');
  for (const f of files.sort()) {
    const img = await Jimp.read(path.join(dir, f));
    await report(f, img);
  }
  console.log('--- ORIGINAIS (tools/sources) ---');
  const srcs = ['carro-laranja.png', 'carro-azul.png', 'carro-vermelho.png', 'carro-verde.png'];
  for (const f of srcs) {
    const buf = fs.readFileSync(path.join(__dirname, 'sources', f));
    const img = await Jimp.read(stripChunk(buf, 'eXIf'));
    await report(f, img);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
