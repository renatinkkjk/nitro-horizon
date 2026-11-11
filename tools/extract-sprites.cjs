/**
 * Extrai sprites dos assets enviados pelo usuário:
 *  - mascote.png  -> RX-7 amarelo CEPK (frente/traseira) + retrato do mascote
 *  - screenshot.jpg -> 4 carros rivais (azul/vermelho/roxo/prata) frente/traseira
 * Remove o fundo (preto ou xadrez) por flood-fill a partir das bordas e
 * recorta pelo bounding-box dos pixels opacos.
 */
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const SRC = process.argv[2] || process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';
const OUT = path.join(__dirname, '..', 'src', 'assets');

const isNear = (c, t, tol) =>
  Math.abs(c.r - t.r) <= tol && Math.abs(c.g - t.g) <= tol && Math.abs(c.b - t.b) <= tol;

/** Flood-fill de transparência a partir de todos os pixels de borda. */
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
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
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

/** Recorta pelo bounding-box dos pixels com alfa > 0. */
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

/** Corta uma região e limpa o fundo; devolve o sprite recortado. */
function cut(image, box, isBackground) {
  const { width, height } = image.bitmap;
  const x = Math.max(0, Math.min(box.x, width - 1));
  const y = Math.max(0, Math.min(box.y, height - 1));
  const w = Math.max(1, Math.min(box.w, width - x));
  const h = Math.max(1, Math.min(box.h, height - y));
  const piece = image.clone().crop(x, y, w, h);
  removeBackground(piece, isBackground);
  return cropToContent(piece);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // ---- mascote.png: fundo preto ----
  const sheet = await Jimp.read(path.join(SRC, 'mascote.png'));
  const { width: sw, height: sh } = sheet.bitmap;
  console.log('mascote.png', sw, 'x', sh);
  const blackBg = (r, g, b) => r < 56 && g < 56 && b < 56;

  const jobs = [
    // [nome, caixa] — ajustadas às proporções do sheet
    ['rx7-player-front', { x: Math.round(sw * 0.11), y: 0, w: Math.round(sw * 0.33), h: Math.round(sh * 0.34) }],
    ['rx7-player-rear', { x: Math.round(sw * 0.61), y: 0, w: Math.round(sw * 0.28), h: Math.round(sh * 0.34) }],
    ['mascote', { x: Math.round(sw * 0.04), y: Math.round(sh * 0.65), w: Math.round(sw * 0.25), h: Math.round(sh * 0.35) }],
  ];
  for (const [name, box] of jobs) {
    const sprite = cut(sheet, box, blackBg);
    await sprite.quality(90).writeAsync(path.join(OUT, `${name}.png`));
    console.log(name, sprite.bitmap.width, 'x', sprite.bitmap.height);
  }

  // ---- screenshot.jpg: fundo xadrez claro, detecção automática de células ----
  const rivals = await Jimp.read(path.join(SRC, 'screenshot.jpg'));
  const { width: rw, height: rh, data: rd } = rivals.bitmap;
  console.log('screenshot.jpg', rw, 'x', rh);
  // Pixel "interessante" = colorido ou escuro (carros). Fundo xadrez é claro e sem cor.
  const interesting = (r, g, b) => {
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mx - mn > 34 || mn < 120;
  };
  // Projeção por linha: quantos pixels interessantes por y.
  const rowCounts = new Array(rh).fill(0);
  for (let y = 0; y < rh; y += 1) {
    for (let x = 0; x < rw; x += 1) {
      const i = (y * rw + x) * 4;
      if (interesting(rd[i], rd[i + 1], rd[i + 2])) rowCounts[y] += 1;
    }
  }
  // Bandas de linhas com conteúdo (mínimo de pixels para considerar).
  const bands = [];
  let start = -1;
  for (let y = 0; y < rh; y += 1) {
    const on = rowCounts[y] > 12;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      if (y - start > 30) bands.push({ y0: start, y1: y });
      start = -1;
    }
  }
  if (start >= 0 && rh - start > 30) bands.push({ y0: start, y1: rh });
  console.log('bandas:', bands.map((b) => `${b.y0}-${b.y1}`).join(', '));
  // Fundo xadrez: dois tons de cinza claro, sem saturação.
  const checkerBg = (r, g, b) => {
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mx - mn < 34 && mn > 128;
  };
  const pending = [];

  const rivalNames = ['blue', 'red', 'purple', 'silver'];
  const colNames = ['front', 'side', 'rear'];
  bands.slice(0, 4).forEach((band, row) => {
    // Projeção por coluna dentro da banda.
    const counts = new Array(rw).fill(0);
    for (let y = band.y0; y < band.y1; y += 1) {
      for (let x = 0; x < rw; x += 1) {
        const i = (y * rw + x) * 4;
        if (interesting(rd[i], rd[i + 1], rd[i + 2])) counts[x] += 1;
      }
    }
    const clusters = [];
    let cs = -1;
    for (let x = 0; x < rw; x += 1) {
      const on = counts[x] > 3;
      if (on && cs < 0) cs = x;
      if (!on && cs >= 0) {
        if (x - cs > 30) clusters.push({ x0: cs, x1: x });
        cs = -1;
      }
    }
    if (cs >= 0 && rw - cs > 30) clusters.push({ x0: cs, x1: rw });
    console.log(rivalNames[row], 'colunas:', clusters.map((c) => `${c.x0}-${c.x1}`).join(', '));
    clusters.slice(0, 3).forEach((cluster, col) => {
      const name = `${rivalNames[row]}-${colNames[col]}`;
      const box = {
        x: Math.max(0, cluster.x0 - 3),
        y: Math.max(0, band.y0 - 3),
        w: cluster.x1 - cluster.x0 + 6,
        h: band.y1 - band.y0 + 6,
      };
      const sprite = cut(rivals, box, checkerBg);
      pending.push(sprite.writeAsync(path.join(OUT, `bot-${name}.png`)));
      console.log(name, sprite.bitmap.width, 'x', sprite.bitmap.height);
    });
  });
  await Promise.all(pending);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
