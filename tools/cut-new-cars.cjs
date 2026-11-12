/**
 * Separa os sprites novos (adicionados pelo usuário no repo de assets) em
 * 3 vistas por carro: frente, lateral e traseira.
 *
 * Cada arquivo novo é uma faixa horizontal com 3 sprites lado a lado:
 * [frente] [lateral] [traseira]. O script detecta os clusters por coluna,
 * remove o fundo (flood-fill preto + refill da base) e recorta cada sprite.
 *
 * Mapeamento (definido pelo usuário):
 *   VERDE   -> TROVÃO V8   (bot-trovao-*)
 *   LARANJA -> VESPA RS    (bot-vespa-*)
 *   AZUL    -> TITÃ TURBO  (bot-tita-*)
 *   VERMELHO-> RX-7 novo   (rx7-bot-*)
 */
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:\\nhtmp\\assets-new';
const OUT = path.join(__dirname, '..', 'src', 'assets');

/** Remove o chunk eXIf (o pngjs do jimp engasga com ele). */
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

function removeBackground(image, isBackground) {
  const { width, height, data } = image.bitmap;
  const visited = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (!isBackground(data[i], data[i + 1], data[i + 2])) return;
    visited[idx] = 1;
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
  for (let idx = 0; idx < width * height; idx += 1) {
    if (visited[idx]) {
      const i = idx * 4;
      data[i + 3] = 0;
    }
  }
}

function cropToContent(image) {
  const { width, height, data } = image.bitmap;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return image;
  return image.clone().crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
}

/** Recorte com restauração da base (mesma técnica do extract-sprites.cjs). */
function cutWithGroundRefill(image, box, isBackground) {
  const { width, height } = image.bitmap;
  const x = Math.max(0, Math.min(box.x, width - 1));
  const y = Math.max(0, Math.min(box.y, height - 1));
  const w = Math.max(1, Math.min(box.w, width - x));
  const h = Math.max(1, Math.min(box.h, height - y));
  const piece = image.clone().crop(x, y, w, h);
  removeBackground(piece, isBackground);
  const { data } = piece.bitmap;
  const alphaAt = (cx, cy) => data[(cy * w + cx) * 4 + 3];
  const toneAt = (cx, cy) => {
    const i = (cy * w + cx) * 4;
    return Math.max(data[i], data[i + 1], data[i + 2]);
  };
  const valid = [];
  for (let cx = 0; cx < w; cx += 1) {
    let bottom = -1;
    for (let cy = h - 1; cy >= 0; cy -= 1) {
      if (toneAt(cx, cy) >= 8) { bottom = cy; break; }
    }
    valid.push(bottom);
  }
  const sorted = valid.filter((b) => b >= 0).sort((a, b) => a - b);
  if (sorted.length > 10) {
    const cap = sorted[Math.floor(sorted.length * 0.75)] + 4;
    for (let cy = cap + 1; cy < h; cy += 1) {
      for (let cx = 0; cx < w; cx += 1) data[(cy * w + cx) * 4 + 3] = 0;
    }
    const withCap = valid.map((b) => (b >= 0 && b <= cap ? b : -1));
    const cappedSorted = withCap.filter((b) => b >= 0).sort((a, b) => a - b);
    const median = cappedSorted.length > 0 ? cappedSorted[Math.floor(cappedSorted.length / 2)] : cap;
    const ground = new Array(w).fill(-1);
    for (let cx = 0; cx < w; cx += 1) {
      const b = withCap[cx];
      ground[cx] = b >= 0 && b >= median - 25 ? b : Math.min(median, cap);
    }
    for (let cx = 0; cx < w; cx += 1) {
      const g = ground[cx];
      if (g < 0) continue;
      let hasOpaque = false;
      for (let cy = g - 1; cy >= Math.max(0, g - 90); cy -= 1) {
        if (alphaAt(cx, cy) > 127) { hasOpaque = true; break; }
      }
      if (!hasOpaque) continue;
      for (let cy = g; cy >= 0; cy -= 1) {
        if (alphaAt(cx, cy) > 127) break;
        data[(cy * w + cx) * 4 + 3] = 255;
      }
    }
    const zoneTop = Math.max(0, cap - 150);
    for (let cx = 0; cx < w; cx += 1) {
      let cy = cap;
      while (cy >= zoneTop) {
        if (alphaAt(cx, cy) > 127) { cy -= 1; continue; }
        let top = cy;
        while (top >= zoneTop && alphaAt(cx, top) <= 127) top -= 1;
        const bottom = cy;
        const boundedBelow = bottom + 1 <= cap && alphaAt(cx, bottom + 1) > 127;
        const boundedAbove = top >= zoneTop && alphaAt(cx, top) > 127;
        if (boundedBelow && boundedAbove && bottom - top <= 60) {
          for (let fy = top + 1; fy <= bottom; fy += 1) data[(fy * w + cx) * 4 + 3] = 255;
        }
        cy = top - 1;
      }
    }
  }
  return cropToContent(piece);
}

function columnClusters(image, maxGap = 25) {
  const { width, height, data } = image.bitmap;
  const colHas = new Array(width).fill(false);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) { colHas[x] = true; break; }
    }
  }
  const clusters = [];
  let start = -1;
  let gap = 0;
  for (let x = 0; x < width; x += 1) {
    if (colHas[x]) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0) {
      gap += 1;
      if (gap > maxGap) { clusters.push([start, x - gap]); start = -1; gap = 0; }
    }
  }
  if (start >= 0) clusters.push([start, width - 1]);
  return clusters;
}

const JOBS = [
  {
    file: 'file_000000007608820e8f66c71e4b5e88d6(3).png',
    label: 'VERDE -> TROVAO',
    names: ['bot-trovao-front.png', 'bot-trovao-side.png', 'bot-trovao-rear.png'],
  },
  {
    file: 'file_000000007608820e8f66c71e4b5e88d6.png',
    label: 'LARANJA -> VESPA',
    names: ['bot-vespa-front.png', 'bot-vespa-side.png', 'bot-vespa-rear.png'],
  },
  {
    file: 'file_000000007608820e8f66c71e4b5e88d6(1).png',
    label: 'AZUL -> TITA',
    names: ['bot-tita-front.png', 'bot-tita-side.png', 'bot-tita-rear.png'],
  },
  {
    file: 'file_000000007608820e8f66c71e4b5e88d6(2).png',
    label: 'VERMELHO -> RX7',
    names: ['rx7-bot-front.png', 'rx7-bot-side.png', 'rx7-bot-rear.png'],
  },
];

/**
 * Remove as sobras: as artes novas têm uma faixa solta acima/abaixo do carro
 * (um resto do arquivo original). Fica só a banda principal — a que tem mais
 * pixels — e o sprite é recortado novamente no conteúdo.
 */
function keepMainBand(image) {
  const { width, height, data } = image.bitmap;
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y += 1) {
    let n = 0;
    for (let x = 0; x < width; x += 1) if (data[(y * width + x) * 4 + 3] > 8) n += 1;
    rows[y] = n;
  }
  const bands = [];
  let start = -1;
  for (let y = 0; y < height; y += 1) {
    const on = rows[y] > 2;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      bands.push({ y0: start, y1: y - 1, px: rows.slice(start, y).reduce((a, b) => a + b, 0) });
      start = -1;
    }
  }
  if (start >= 0) bands.push({ y0: start, y1: height - 1, px: rows.slice(start).reduce((a, b) => a + b, 0) });
  if (bands.length < 2) return image;
  const main = bands.reduce((a, b) => (b.px > a.px ? b : a));
  const trimmed = image.clone().crop(0, main.y0, width, main.y1 - main.y0 + 1);
  return cropToContent(trimmed);
}

async function main() {
  const blackBg = (r, g, b) => Math.max(r, g, b) < 10;
  for (const job of JOBS) {
    const buf = fs.readFileSync(path.join(SRC_DIR, job.file));
    const image = await Jimp.read(stripChunk(buf, 'eXIf'));
    const clusters = columnClusters(image);
    if (clusters.length < 3) {
      console.log('AVISO', job.label, 'clusters=', clusters.length, '(esperado 3)');
      continue;
    }
    const [front, side, rear] = clusters;
    const boxes = [
      { x: front[0] - 2, y: 0, w: front[1] - front[0] + 5, h: image.bitmap.height },
      { x: side[0] - 2, y: 0, w: side[1] - side[0] + 5, h: image.bitmap.height },
      { x: rear[0] - 2, y: 0, w: rear[1] - rear[0] + 5, h: image.bitmap.height },
    ];
    for (let i = 0; i < 3; i += 1) {
      const sprite = keepMainBand(cutWithGroundRefill(image, boxes[i], blackBg));
      await sprite.quality(90).writeAsync(path.join(OUT, job.names[i]));
      console.log(job.label, job.names[i], sprite.bitmap.width + 'x' + sprite.bitmap.height);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
