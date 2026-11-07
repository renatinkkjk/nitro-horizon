# 🏁 NITRO HORIZON

**Corrida arcade pseudo-3D em pixel art**, inspirada nos clássicos de 16 bits (Top Gear / OutRun) — câmera atrás do carro, 15 carros na pista e HUD retrô completo.

> 🎮 **Jogar:** https://renatinkkjk.github.io/nitro-horizon/
> 📋 **Planejamento / game design:** https://renatinkkjk.github.io/nitro-horizon/planejamento/

> ⚠️ Projeto **inspirado** no estilo de Top Gear. Nomes, sprites, músicas e pistas são 100% originais — nenhum asset da Nintendo/Kemco é utilizado.

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

## ✅ Estado atual (v0.2 — circuitos fechados e visual refinado)

Já funciona de ponta a ponta: **menu → seleção de carro → seleção de pista → contagem → corrida → resultado**.

- [x] Motor pseudo-3D por segmentos com curvas e colinas
- [x] Render 320×224 escalado com pixels nítidos (`image-rendering: pixelated`)
- [x] Céu com gradiente, sol com halo, nuvens, estrelas e lua com crateras
- [x] Cenário procedural por segmento (cactos, palmeiras, árvores, rochas, placas, postes, prédios, outdoors)
- [x] **Circuitos fechados**: o traçado dá 360° por volta e o minimapa fecha o loop com linha de largada
- [x] **Carros redesenhados** em 4 estilos (GT, muscle, light e turbo), com pintura em dois tons, vidro com reflexo, aerofólio, lanternas e escapamentos
- [x] Carro do jogador: aceleração, freio, direção, força centrífuga, off-road e colisão com cenário
- [x] Câmbio de 6 marchas (automático e manual) com RPM e curva de torque
- [x] Nitro limitado, com boost, tremor de tela e linhas de velocidade
- [x] Gasolina com consumo por RPM/nitro e modo reserva
- [x] 14 IAs competitivas, com alvo de velocidade por curva, troca de faixa e rubber-band
- [x] Colisões carro×carro (empurrão lateral + perda de velocidade)
- [x] Voltas, melhor volta, posição e classificação em tempo real, com banner de "última volta"
- [x] HUD completo: posição, volta, tempos, minimapa, velocidade, marcha, RPM, gasolina e nitro
- [x] Contagem regressiva, pausa, tela de resultado e "última volta"
- [x] Áudio sintetizado via WebAudio (motor por RPM, nitro, colisão, bipes)
- [x] Deploy automático no GitHub Pages via GitHub Actions

### Próximos passos (roadmap)

- [ ] Pit stop animado e reabastecimento
- [ ] Tela dividida para 2 jogadores
- [ ] Modo campeonato (3 pistas em sequência)
- [ ] Pickups de nitro na pista
- [ ] Clima / variação de horário
- [ ] Editor de pista e fantasmas de melhor volta
- [ ] Controles por toque (mobile)

---

## 🎮 Controles

| Ação | Teclas |
|---|---|
| Acelerar | `↑` / `W` |
| Frear | `↓` / `S` |
| Virar | `←` `→` / `A` `D` |
| Nitro | `Espaço` |
| Subir marcha | `Shift` / `E` |
| Descer marcha | `Ctrl` / `Q` |
| Confirmar | `Enter` |
| Pausar | `P` |
| Voltar ao menu | `Esc` |

O câmbio começa **automático**. Trocar de marcha manualmente funciona em paralelo (o jogo aceita os dois estilos).

---

## 🚗 Os 4 carros

| Modelo | Perfil | Estilo | Nitros | Tanque | Grip |
|---|---|---|---|---|---|
| **Falcão GT** | Equilibrado | GT (asa discreta) | 3 | 96 | Alto |
| **Trovão V8** | Velocista | Muscle (faixas duplas) | 2 | 112 | Baixo |
| **Vespa RS** | Ágil / leve | Light (barra de luz) | 3 | 74 | Máximo |
| **Titã Turbo** | Nitro agressivo | Turbo (asa grande) | 4 | 80 | Baixo |

As 14 IAs usam os mesmos 4 modelos com variações de cor e multiplicadores leves de skill (0,84–1,02), o que gera um grid variado sem parecer trapaça.

---

## 🗺️ As 3 pistas

| Pista | Dificuldade | Característica | Voltas |
|---|---|---|---|
| **Deserto** | Fácil | Circuito rápido de retas longas ao entardecer | 5 |
| **Litoral** | Médio | Circuito de S-curvas e colinas com vista para o mar | 5 |
| **Cidade** | Difícil | Circuito noturno de curvas fechadas entre prédios | 4 |

Cada pista é definida em dados (curva, colina, cenário, paleta) em `src/world/tracks.ts` — fácil de editar e expandir. O minimapa é gerado a partir das próprias curvas: a soma de curvatura de cada volta é normalizada para 360° e o traçado é fechado, garantindo um circuito de verdade.

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
│   │   ├── sprites.ts        # carros e cenário desenhados por código
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
│       └── screens.ts        # título, seleção, contagem, resultado, pausa
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
6. O minimapa reaproveita o mapa top-down da pista (curvas integradas e fechadas em 360°) e usa a mesma transformação para o traçado, a linha de largada e os pontos dos carros.

Detalhes de projeção e constantes em `src/render/pseudo3d.ts`.

---

## ⚖️ Licença

Distribuído sob a licença do arquivo [LICENSE](./LICENSE).

<p align="center">Feito com 🕹️ e pixel art.</p>
