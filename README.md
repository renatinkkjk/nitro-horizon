# 🏁 NITRO HORIZON

**Corrida arcade pseudo-3D em pixel art**, inspirada nos clássicos de 16 bits (Top Gear / OutRun) — câmera atrás do carro, 15 carros na pista e HUD retrô completo.

> 🎮 **Jogar:** https://renatinkkjk.github.io/nitro-horizon/
> 📋 **Planejamento / game design:** https://renatinkkjk.github.io/nitro-horizon/planejamento/

> ⚠️ Projeto **inspirado** no estilo de Top Gear. Nomes, músicas e pistas são originais; o Mazda RX-7 usa sprites em pixel art fornecidos pelo autor. Nenhum asset da Nintendo/Kemco é utilizado.

---

## 📌 O que é

| Item | Definição |
|---|---|
| Gênero | Corrida arcade |
| Perspectiva | Atrás do carro, estrada em perspectiva (pseudo-3D / outrun-style) |
| Estilo visual | Pixel art, resolução interna **320×224** (proporção SNES) |
| Plataforma | Navegador (HTML5 Canvas) |
| Stack | Vite + TypeScript + Canvas 2D, **zero dependências de runtime** |
| Corrida | 15 carros simultâneos: 1 jogador + 14 IAs |
| Carros | 4 modelos, com variações de cor para as IAs |
| Pistas | 3 (deserto, litoral, cidade à noite) |

---

## ✅ Estado atual (v0.8 — sprites do RX-7, olhar para trás, inclinação e fumaça)

Já funciona de ponta a ponta: **menu → seleção de carro → seleção de pista → contagem → corrida → pit stop → resultado**.

- [x] Motor pseudo-3D por segmentos com curvas e colinas
- [x] Render 320×224 escalado com pixels nítidos (`image-rendering: pixelated`)
- [x] Céu com gradiente, sol com halo, nuvens, estrelas e lua com crateras
- [x] Cenário procedural por segmento (cactos, palmeiras, árvores, rochas, placas, postes, prédios, outdoors)
- [x] **Circuitos fechados**: o traçado dá 360° por volta e o minimapa fecha o loop com linha de largada
- [x] **Carros redesenhados** com pintura em dois tons, vidro com reflexo, aerofólio, lanternas, escapamentos e **contornos pretos** no estilo pixel art
- [x] **Mazda RX-7 (FD)** com sprites em pixel art fornecidos no repositório de assets: vistas traseira e frontal em `src/assets/rx7-*.png`
- [x] **Showroom na seleção de carro**: prévia grande com o sprite frontal do RX-7, perfil, atributos e faixa com os quatro modelos
- [x] **Olhar para trás (R)**: segurar `R` muda a câmera para a visão traseira; a pista e os oponentes são mostrados invertidos (curvas invertidas, direção do tráfego), para que o jogador veja o que está atrás dele — inclui sprites dos carros atrás. O sprite do jogador muda para frontal (RX-7) ou mantém a vista traseira.
- [x] **Inclinação lateral**: jogador e IAs tombam suavemente ao esterçar, girando o sprite ao redor da base sem trocá-lo
- [x] **Fumaça dos pneus**: partículas discretas ao andar, que ficam maiores e mais frequentes nas curvas fortes e escorrem para fora da curva
- [x] **Sem carros piscando**: a visibilidade dos carros agora usa o segmento realmente desenhado no frame, em vez da emenda do segmento
- [x] Carro do jogador: aceleração, freio, direção, força centrífuga, off-road e colisão com cenário
- [x] Câmbio de 6 marchas (automático e manual) com RPM e curva de torque
- [x] Nitro limitado, com boost, tremor de tela e linhas de velocidade
- [x] Gasolina com consumo por RPM/nitro e modo reserva
- [x] **Pit stop em todas as pistas**: via de boxes na reta principal, placas PIT, muro, garagens, reabastecimento com limite de velocidade e **nitro cheio por passagem**
- [x] **Sem subidas/descidas**: a pista é sempre plana para evitar problemas de colisão e visibilidade
- [x] **Menu de pausa (ESC/P)**: continuar, reiniciar corrida, sair para o menu e **tela cheia**
- [x] **Tela cheia no PC e no celular**: tecla `F`, opção no menu de pausa e botão de toque `⛶` no mobile; aviso amigável quando o navegador não suporta
- [x] **Port mobile**: botões de toque para acelerar, frear, esterçar, nitro, olhar para trás (RÉ), pausa e tela cheia
- [x] 14 IAs competitivas, com alvo de velocidade por curva, troca de faixa e rubber-band
- [x] Colisões carro×carro (empurrão lateral + perda de velocidade)
- [x] Voltas, melhor volta, posição e classificação em tempo real, com banner de "última volta"
- [x] HUD completo: posição, volta, tempos, minimapa, velocidade, marcha, RPM, gasolina, nitro e status do pit
- [x] Contagem regressiva, pausa, tela de resultado e "última volta"
- [x] Áudio sintetizado via WebAudio (motor por RPM, nitro, colisão, bipes)
- [x] Deploy automático no GitHub Pages via GitHub Actions

### Próximos passos (roadmap)

- [ ] Equipe de pit animada (mecânicos e macaco)
- [ ] Tela dividida para 2 jogadores
- [ ] Modo campeonato (3 pistas em sequência)
- [ ] Pickups de nitro na pista
- [ ] Clima / variação de horário
- [ ] Editor de pista e fantasmas de melhor volta
- [ ] Opções de volume, dificuldade e assistências
- [ ] Aplicar os sprites fornecidos aos demais modelos (Trovão V8, Vespa RS e Titã Turbo)

---

## 🎮 Controles

| Ação | Teclas |
|---|---|
| Acelerar | `↑` / `W` |
| Frear | `↓` / `S` |
| Virar | `←` `→` / `A` `D` |
| Nitro | `Espaço` |
| Olhar para trás | `R` (segurar) | Muda a câmera para visão traseira. A pista curva ao contrário e os oponentes atrás aparecem. Redução de velocidade ao virar. Nitro com escape do RX-7.
| Subir marcha | `Shift` / `E` |
| Descer marcha | `Ctrl` / `Q` |
| Confirmar | `Enter` |
| Tela cheia | `F` (ou menu de pausa) |
| Pausar / menu | `P` / `Esc` |
| Menu de pausa | `↑` `↓` navegar · `Enter` confirmar · `Esc` voltar |

O câmbio começa **automático**. Trocar de marcha manualmente funciona em paralelo (o jogo aceita os dois estilos).

### 🖥️ Tela cheia

- **PC:** tecla `F` ou menu de pausa → **TELA CHEIA**.
- **Mobile:** botão **⛶** no canto superior direito; o menu de pausa também oferece a opção.
- O jogo usa a Fullscreen API e reescala o canvas ao entrar/sair. Se o navegador não suportar (caso do Safari no iPhone), aparece um aviso com a alternativa de adicionar à Tela de Início.

### 📱 Mobile

Em celulares e tablets os controles de toque aparecem automaticamente abaixo do canvas (também dá para forçar com `?touch=1`):

- **◀ ▶** — esterçar
- **GÁS** / **FREIO** — acelerar e frear (câmbio automático)
- **N₂O** — nitro
- **RÉ** — olhar para trás (mostra a frente do carro na vista do jogador, mas na visão traseira real a pista e os oponentes são mostrados atrás com curvatura invertida).
- **II** — pausa / voltar
- **⛶** — tela cheia (no iPhone, use Compartilhar → Adicionar à Tela de Início)
- **OK** — confirmar no menu

O layout se adapta a retrato e paisagem, e as opções do menu de pausa também podem ser tocadas diretamente na tela.

### ⛽ Pit stop

Em todas as pistas o pit lane fica **na reta principal, à direita**:

1. As placas amarelas **PIT** avisam a entrada com antecedência.
2. Encoste para a direita e reduza: a via de boxes tem limite de ~100 km/h.
3. Na área de boxes (garagens), o tanque enche em cerca de 2,2 s.
4. Cada passagem pelos boxes também **enche todos os nitros** (até o máximo do carro).
5. O HUD mostra `PIT LANE` / `PIT STOP` e a porcentagem; o minimapa marca a entrada com um **P**.

O aviso `COMBUSTÍVEL BAIXO` aparece quando o tanque cai abaixo de 20%. Se o combustível zerar, o carro entra em modo reserva — ainda dá para chegar ao pit.

---

## 🚗 Os 4 carros

| Modelo | Perfil | Estilo | Nitros | Tanque | Grip |
|---|---|---|---|---|---|
| **Mazda RX-7** | Equilibrado | Sprite fornecido (frente/traseira) | 3 | 96 | Alto |
| **Trovão V8** | Velocista | Muscle (faixas duplas) | 2 | 112 | Baixo |
| **Vespa RS** | Ágil / leve | Light (barra de luz) | 3 | 74 | Máximo |
| **Titã Turbo** | Nitro agressivo | Turbo (asa grande) | 4 | 80 | Baixo |

As 14 IAs usam os mesmos 4 modelos com variações de cor e multiplicadores leves de skill (0,84–1,02), o que gera um grid variado sem parecer trapaça. As IAs de RX-7 continuam com a arte procedural colorida até receberem sprites próprios.

---

## 🗺️ As 3 pistas

| Pista | Dificuldade | Característica | Voltas |
|---|---|---|---|
| **Deserto** | Fácil | Retas longas, subida do canyon e descida para a chegada | 5 |
| **Litoral** | Médio | S-curvas e colinas com vista para o mar | 5 |
| **Cidade** | Difícil | Curvas fechadas e elevados entre prédios à noite | 4 |

Cada pista é definida em dados (curva, colina, cenário, paleta) em `src/world/tracks.ts` — fácil de editar e expandir. O minimapa é gerado a partir das próprias curvas: a soma de curvatura de cada volta é normalizada para 360° e o traçado é fechado, garantindo um circuito de verdade. As três pistas têm pit lane na reta principal e trechos de subida/descida; a elevação é nivelada para o fim da volta encontrar o início sem degrau.

---

## 🛠️ Como rodar

Pré-requisitos: **Node.js 20+** e npm.

```bash
npm install
npm run dev      # servidor de desenvolvimento (hot reload)
npm run build    # type-check + build de produção em dist/
npm run preview  # serve o build de produção localmente
```

O build usa `base: '/nitro-horizon/'` (ver `vite.config.ts`), necessário para o GitHub Pages de projeto.

---

## 🚀 Deploy

O deploy é automático: todo push na `main` dispara `.github/workflows/deploy.yml`, que roda o build e publica a pasta `dist/` no GitHub Pages.

Para publicar manualmente:

```bash
npm run build
git add .
git commit -m "feat: ..."
git push
```

Acompanhe em **Actions** no repositório. A URL publicada é
`https://renatinkkjk.github.io/nitro-horizon/`.

> A página de planejamento fica em `public/planejamento/index.html` e é copiada para `dist/planejamento/`, ficando disponível em `/planejamento/`.

---

## 🧱 Estrutura do projeto

```
nitro-horizon/
├── index.html                # entrada do jogo (canvas 320×224)
├── vite.config.ts / tsconfig.json / package.json
├── public/
│   └── planejamento/index.html   # página de game design (estática)
├── src/
│   ├── main.ts               # bootstrap, escala inteira do canvas
│   ├── game.ts               # máquina de estados, input, loop, render do mundo
│   ├── core/
│   │   ├── input.ts          # teclado + estado por frame
│   │   ├── audio.ts          # WebAudio: motor, nitro, colisão, bipes
│   │   └── rng.ts            # PRNG determinístico (mulberry32)
│   ├── render/
│   │   ├── pseudo3d.ts       # projeção, segmentos, curvas, colinas, estrada
│   │   ├── sprites.ts        # carros genéricos e cenário desenhados por código
│   │   ├── rx7.ts            # RX-7 com sprites fornecidos (frente/traseira)
│   │   ├── color.ts          # utilitário de clarear/escurecer cores
│   │   └── hud.ts            # HUD, minimapa, barras e formatação de tempo
│   ├── world/
│   │   ├── track.ts          # TrackBuilder + decoração + mapa top-down
│   │   └── tracks.ts         # as 3 pistas e suas paletas
│   ├── entities/
│   │   └── carspecs.ts       # especificações dos 4 carros + cores das IAs
│   ├── race/
│   │   ├── gearbox.ts        # câmbio de 6 marchas, RPM e torque
│   │   └── race.ts           # física, IA, colisões, voltas e classificação
│   └── ui/
│       ├── screens.ts        # título, showroom, seleção de pista, pausa, resultado
│       └── fullscreen.ts     # tela cheia no PC/mobile + fallback com aviso
└── .github/workflows/deploy.yml
```

---

## 🛣️ Como o motor pseudo-3D funciona

Baseado na técnica *outrun-style* de segmentos:

1. A pista é um **array de ~1.200–1.500 segmentos**, cada um com `curve` e `hill` (y).
2. A cada frame a câmera projeta os segmentos à frente (3D → 2D) e desenha do mais distante ao mais próximo, com **clipping por `maxy`** para esconder o que está atrás das colinas.
3. Curvas são aplicadas acumulando deslocamento horizontal (`dx`) a cada segmento; colinas vêm da interpolação de `world.y`.
4. Cenário e carros são desenhados numa segunda passada, de trás para frente, usando a escala projetada do segmento. Carros muito próximos têm o tamanho limitado em vez de sumir, para nunca "piscar" antes da colisão.
5. A física usa a curvatura do segmento atual para gerar **força centrífuga** — quanto maior a velocidade e menor o grip, mais o carro é jogado para fora.
6. O minimapa reaproveita o mapa top-down da pista (curvas integradas e fechadas em 360°) e usa a mesma transformação para o traçado, a linha de largada, o marcador do pit e os pontos dos carros.
7. O pit lane é desenhado por segmento, com afunilamento na entrada/saída, separador tracejado e muro. Na física, a faixa direita da reta principal vira área de boxes: limite de velocidade e reabastecimento.
8. As subidas/descidas vêm de `world.y` e a câmera acompanha o solo. Para reforçar a leitura, o horizonte (sol, montanhas e parallax) inclina conforme a inclinação da pista.
9. O loop principal é protegido contra exceções: um erro em um frame não mata o `requestAnimationFrame` e, se persistir, o jogo volta ao título em vez de travar. As janelas dos prédios usam grade limitada para manter o custo de desenho baixo quando um prédio passa colado na câmera.
10. A visibilidade dos carros usa a flag `segment.drawn`: o segmento só é considerado visível se a estrada dele foi realmente pintada no frame. Antes, o teste usava a borda próxima do segmento (`clip`), então o carro desaparecia no meio de cada segmento e reaparecia na emenda — a "piscada".
11. A inclinação lateral é só uma rotação (`ctx.rotate`) ao redor da base do sprite: o ângulo vem do esterço (jogador) ou da troca de faixa (IA), sem cisalhamento e sem trocar de vista.
12. A fumaça é um conjunto de partículas emitidas atrás das rodas. A taxa cresce com a velocidade, com a curvatura do segmento e com o esterço; cada partícula nasce pequena, cresce e some, sendo empurrada para fora da curva.

Detalhes de projeção e constantes em `src/render/pseudo3d.ts`.

---

## ⚖️ Licença

Distribuído sob a licença do arquivo [LICENSE](./LICENSE).

<p align="center">Feito com 🕹️ e pixel art.</p>
