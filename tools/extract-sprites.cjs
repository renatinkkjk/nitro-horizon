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

/**
 * Recorte com restauração da base. O flood-fill remove o fundo preto puro
 * (0..7), mas também come partes pretas do carro ligadas a ele (pneus,
 * difusor/splitter, poço da roda) — todas maciças na arte original, sem
 * see-through na região inferior. A restauração é geométrica:
 *
 *  1. cap = p75 da borda inferior por tom + 4. Tudo abaixo do cap vira
 *     transparente (remove fragmentos soltos, ex.: respingo na frente).
 *  2. chão por coluna = pixel mais baixo com tom >= 8 dentro do cap; se a
 *     coluna é "cega" (conteúdo 100% preto puro, ex.: pneu sem franja),
 *     usa a mediana global do chão.
 *  3. fill ascendente: do chão para cima, restaura tudo até o primeiro pixel
 *     opaco (guarda: só se houver opaco a <= 90px, evita colunas de espelho).
 *  4. fill de buracos delimitados na zona inferior (cap-150..cap): vãos
 *     transparentes com opaco acima E abaixo, altura <= 60 (as janelas do
 *     aerofólio, mais altas, ficam de fora).
 */
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

  // Borda inferior por tom em cada coluna, limitada ao cap.
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

    // 1) fragmentos abaixo do cap -> transparente
    for (let cy = cap + 1; cy < h; cy += 1) {
      for (let cx = 0; cx < w; cx += 1) data[(cy * w + cx) * 4 + 3] = 0;
    }

    // 2) chão por coluna (tom >= 8 dentro do cap; fallback = mediana)
    const withCap = valid.map((b) => (b >= 0 && b <= cap ? b : -1));
    const cappedSorted = withCap.filter((b) => b >= 0).sort((a, b) => a - b);
    const median = cappedSorted.length > 0
      ? cappedSorted[Math.floor(cappedSorted.length / 2)]
      : cap;
    const ground = new Array(w).fill(-1);
    for (let cx = 0; cx < w; cx += 1) {
      const b = withCap[cx];
      ground[cx] = b >= 0 && b >= median - 25 ? b : Math.min(median, cap);
    }

    // 3) fill ascendente do chão até o primeiro pixel opaco
    for (let cx = 0; cx < w; cx += 1) {
      const g = ground[cx];
      if (g < 0) continue;
      // guarda: precisa de conteúdo opaco a <= 90px acima do chão
      let hasOpaque = false;
      for (let cy = g - 1; cy >= Math.max(0, g - 90); cy -= 1) {
        if (alphaAt(cx, cy) > 127) { hasOpaque = true; break; }
      }
      if (!hasOpaque) continue;
      for (let cy = g; cy >= 0; cy -= 1) {
        if (alphaAt(cx, cy) > 127) break;
        data[(cy * w + cx) * 4 + 3] = 255; // mantém o tom original
      }
    }

    // 4) buracos delimitados na zona inferior (opaco acima e abaixo)
    const zoneTop = Math.max(0, cap - 150);
    for (let cx = 0; cx < w; cx += 1) {
      let cy = cap;
      while (cy >= zoneTop) {
        if (alphaAt(cx, cy) > 127) { cy -= 1; continue; }
        // início de run transparente: acha o topo
        let top = cy;
        while (top >= zoneTop && alphaAt(cx, top) <= 127) top -= 1;
        const bottom = cy; // linha mais baixa do run
        const boundedBelow = bottom + 1 <= cap && alphaAt(cx, bottom + 1) > 127;
        const boundedAbove = top >= zoneTop && alphaAt(cx, top) > 127;
        if (boundedBelow && boundedAbove && bottom - top <= 60) {
          for (let fy = top + 1; fy <= bottom; fy += 1) {
            data[(fy * w + cx) * 4 + 3] = 255; // mantém o tom original
          }
        }
        cy = top - 1;
      }
    }
  }
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
    // [nome, caixa generosa] — o recorte por conteúdo encontra os limites
    ['rx7-player-front', { x: Math.round(sw * 0.06), y: 0, w: Math.round(sw * 0.42), h: Math.round(sh * 0.36) }],
    ['rx7-player-rear', { x: Math.round(sw * 0.54), y: 0, w: Math.round(sw * 0.45), h: Math.round(sh * 0.36) }],
    ['mascote', { x: Math.round(sw * 0.02), y: Math.round(sh * 0.6), w: Math.round(sw * 0.29), h: Math.round(sh * 0.4) }],
  ];
  for (const [name, box] of jobs) {
    // Threshold ESTRITO: só o preto puro do fundo é removido; os pretos
    // internos do carro (contornos, janelas, para-choques) ficam intactos.
    // O refill por coluna recupera pneus e splitter ligados ao fundo.
    const sprite = cutWithGroundRefill(sheet, box, (r, g, b) => Math.max(r, g, b) < 10);
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
