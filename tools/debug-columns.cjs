/**
 * Diagnóstico completo por coluna (coords do PEDACO, antes do cropToContent):
 *  - colunas comidas (currentBottom < traceBottom - 1) -> candidatos a refill
 *  - colunas com traceBottom > cap (p75+4) -> fragmentos soltos abaixo do chao
 * Imprime faixas de x para cada caso.
 */
const Jimp = require('jimp');
const path = require('path');

const SRC = process.env.NITRO_ASSETS || 'C:\\Users\\Máquina de resenha\\AppData\\Local\\Temp\\nitro-assets';

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
    const { width: w, height: h, data } = piece.bitmap;

    // Flood-fill identico ao extract (max < 10), sem aplicar (so visita).
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

    // traceBottom (tom >= 8, ignora alfa) e currentBottom (alfa > 127)
    const trace = new Array(w).fill(-1);
    const cur = new Array(w).fill(-1);
    for (let x = 0; x < w; x += 1) {
      for (let y = h - 1; y >= 0; y -= 1) {
        const i = (y * w + x) * 4;
        if (Math.max(data[i], data[i + 1], data[i + 2]) >= 8) { trace[x] = y; break; }
      }
      for (let y = h - 1; y >= 0; y -= 1) {
        if (data[(y * w + x) * 4 + 3] > 127 && !visited[y * w + x]) { cur[x] = y; break; }
      }
    }

    const valid = trace.filter((b) => b >= 0).sort((a, b) => a - b);
    const cap = valid[Math.floor(valid.length * 0.75)] + 4;
    console.log(`\n== ${name} == cap=${cap} (p75=${cap - 4})`);

    // faixas de colunas por categoria
    const ranges = (pred) => {
      const out = [];
      let s = -1;
      for (let x = 0; x <= w; x += 1) {
        const on = x < w && pred(x);
        if (on && s < 0) s = x;
        if (!on && s >= 0) { out.push(`${s}-${x - 1}`); s = -1; }
      }
      return out.join(', ') || '(nenhuma)';
    };

    console.log('comidas (cur < trace-1, refill atua):', ranges((x) => trace[x] >= 0 && cur[x] >= 0 && cur[x] < trace[x] - 1));
    console.log('abaixo do cap (trace > cap):', ranges((x) => trace[x] > cap));
    console.log('sem conteudo (cur=-1):', ranges((x) => cur[x] < 0));
    // bbox opaco atual
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (data[(y * w + x) * 4 + 3] > 8 && !visited[y * w + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    console.log(`bbox opaco: x ${minX}..${maxX} (largura ${maxX - minX + 1}) y ${minY}..${maxY} (altura ${maxY - minY + 1})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
