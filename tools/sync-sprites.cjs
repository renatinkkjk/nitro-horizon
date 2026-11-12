/**
 * Publica o mascote em public/sprites/ (nome estável, servido pelo Pages).
 *
 * Os sprites dos carros são gerados por tools/cut-new-cars.cjs; aqui só
 * copiamos o mascote, que vem pronto do repo de assets.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'sources', 'mascote.png');
const OUT = path.join(__dirname, '..', 'public', 'sprites');

fs.mkdirSync(OUT, { recursive: true });
if (fs.existsSync(SRC)) {
  fs.copyFileSync(SRC, path.join(OUT, 'mascote.png'));
  console.log('mascote publicado em public/sprites/mascote.png');
} else {
  console.log('AVISO: tools/sources/mascote.png nao encontrado');
}
