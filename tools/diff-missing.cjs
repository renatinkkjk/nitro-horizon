/** Diff: pixels opacos no original (bbox do conteudo) vs transparentes no
 *  sprite atual. Reporta contagem e faixas de x/y dos que faltam. */
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

    // diff em coords do bbox original (o sprite atual deve alinhar, pois
    // o crop usa o mesmo minX/minY depois das correções de alfa)
    let missing = 0;
    const colCount = new Array(rw).fill(0);
    const rowCount = new Array(rh).fill(0);
    for (let y = 0; y < rh; y += 1) {
      for (let x = 0; x < rw; x += 1) {
        const tone = Math.max(data[((y + minY) * width + (x + minX)) * 4], data[((y + minY) * width + (x + minX)) * 4 + 1], data[((y + minY) * width + (x + minX)) * 4 + 2]);
        if (tone < 8) continue; // fundo verdadeiro: ok estar transparente
        const alpha = (y < ch && x < cw) ? cdata[(y * cw + x) * 4 + 3] : 0;
        if (alpha < 200) {
          missing += 1;
          colCount[x] += 1;
          rowCount[y] += 1;
        }
      }
    }
    const ranges = (counts, minOn) => {
      const out = [];
      let s = -1;
      for (let i = 0; i <= counts.length; i += 1) {
        const on = i < counts.length && counts[i] >= minOn;
        if (on && s < 0) s = i;
        if (!on && s >= 0) { out.push(`${s}..${i - 1}(${i - s})`); s = -1; }
      }
      return out.join(', ') || '(nenhuma)';
    };
    console.log(`\n== ${name} == faltam ${missing} px`);
    console.log('colunas com falta:', ranges(colCount, 3));
    console.log('linhas com falta:', ranges(rowCount, 3));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
