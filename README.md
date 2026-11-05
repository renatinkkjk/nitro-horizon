# 🏁 NITRO HORIZON

**Planejamento de um jogo de corrida 2D pixel art inspirado em Top Gear (SNES).**

Jogo web em pseudo-3D com câmera atrás do carro, **15 carros simultâneos** (1 jogador + 14 oponentes controlados por IA), 4 modelos de carro e HUD completo com marcha, nitro, minimapa, velocidade, tempo de volta, posição e gasolina.

> ⚠️ Projeto **inspirado** no estilo de Top Gear. Nomes, sprites, músicas e pistas são 100% originais — nenhum asset da Nintendo/Kemco é utilizado.

---

## 📌 Visão geral

| Item | Definição |
|---|---|
| Gênero | Corrida arcade |
| Perspectiva | Atrás do carro, estrada em perspectiva (pseudo-3D / outrun-style) |
| Estilo visual | Pixel art, resolução interna **320×224** (proporção SNES) |
| Plataforma | Navegador (HTML5 Canvas) |
| Stack | Vite + TypeScript + Canvas 2D (sem dependências de runtime) |
| Corrida | 15 carros simultâneos: 1 jogador + 14 IAs |
| Carros | 4 modelos, com variações de cor para as IAs |
| Pistas | 3 (deserto, litoral, cidade à noite) |

---

## 🧱 Stack e estrutura

```
nitro-horizon/
├── index.html
├── package.json / tsconfig.json / vite.config.ts
├── src/
│   ├── main.ts
│   ├── core/        Game.ts, Loop.ts, Input.ts, Audio.ts, Rng.ts, StateMachine.ts
│   ├── render/      Renderer.ts, Pseudo3D.ts, Sprites.ts, Hud.ts, Palette.ts, Parallax.ts
│   ├── world/       Segment.ts, Track.ts, tracks/ (3 pistas), Scenery.ts
│   ├── entities/    Car.ts, PlayerCar.ts, AiCar.ts, CarSpecs.ts
│   ├── race/        RaceManager.ts, Standings.ts, LapTimer.ts, Gearbox.ts,
│   │                FuelSystem.ts, NitroSystem.ts, Collision.ts
│   ├── ai/          AiDriver.ts, RubberBand.ts
│   └── ui/          Menu.ts, PixelFont.ts, Results.ts
├── assets/          sprites .png + sfx .wav (ou gerados por código)
└── tests/           lógica pura (gearbox, standings, fuel)
```

**Arquitetura:** loop de passo fixo a 60 Hz com acumulador (física determinística). Estados: `MENU → CAR_SELECT → COUNTDOWN → RACING → FINISHED → RESULTS`.

---

## 🛣️ Motor pseudo-3D (o coração do projeto)

Técnica *outrun-style* baseada em segmentos:

- A pista é um **array de segmentos** (~1.500 por volta), cada um com `curve` e `hill` (y).
- Projeção 3D→2D por segmento: posição da câmera, altura, `roadWidth` e perspectiva. Renderiza do fundo para a frente com clipping (`maxy`) para esconder colinas.
- Render por segmento: asfalto, zebrado (rumble), faixas centrais, acostamento, grama/terra.
- **Cenário parallax**: céu em gradiente pixelado, montanhas/nuvens, árvores/placas/arquibancadas posicionadas por segmento (escala conforme distância).
- **Curvas e colinas** afetam a física: força centrífuga empurra o carro para fora, subida reduz velocidade.

**Culling:** renderizar só ~300 segmentos à frente; carros fora do alcance não são desenhados.

---

## 🚗 Os 4 carros

| Modelo | Perfil | Vel. máx. | Acel. | Grip | Tanque | Consumo | Nitros |
|---|---|---|---|---|---|---|---|
| **Falcão GT** | Equilibrado | ★★★☆ | ★★★ | ★★★ | ★★★ | ★★★ | 3 |
| **Trovão V8** | Velocista | ★★★★ | ★★☆ | ★★☆ | ★★★★ | ★★☆ | 2 |
| **Vespa RS** | Ágil/leve | ★★☆ | ★★★★ | ★★★★ | ★★☆ | ★★★★ | 3 |
| **Titã Turbo** | Nitro/agressivo | ★★★☆ | ★★★☆ | ★★☆ | ★★☆ | ★★☆ | 4 |

- As 14 IAs usam os mesmos 4 modelos com **variações de cor** (3–4 cores por modelo = 14 combinações únicas).
- Cada IA tem um multiplicador leve de skill (0,92–1,03) para dar variedade natural ao grid.

---

## ⚙️ Física, marchas, nitro e gasolina

- **Câmbio de 6 marchas** (manual: Shift/Ctrl; opção automática). RPM calculado por velocidade/marcha; aceleração cai fora da faixa ideal. HUD mostra marcha + barra de RPM.
- **Nitro:** limitado (2–4 cargas). Ao ativar (Espaço): boost de aceleração e teto de velocidade por ~2,5 s, com tremor de tela + linhas de velocidade. Sem recarga durante a corrida (ou pickup — decisão em aberto).
- **Gasolina:** consumo proporcional a RPM/nitro. Ao esgotar, o carro entra em modo "reserva" (velocidade limitada). **Pit stop opcional** repõe tanque e pneus (perde ~8 s).
- **Fora da pista:** perda de velocidade e vibração; bater em árvore/placa = forte redução (sem destruir o carro).
- **Colisões carro×carro:** empurrão lateral + perda de velocidade, resolvido por AABB em (z, x).

---

## 🤖 IA dos 14 oponentes

- Cada IA mantém `z` (distância na pista), `x` (faixa) e velocidade.
- **Alvo de velocidade** = f(reta/curva à frente, grip do carro, skill).
- **Desvio:** procura faixa livre à frente; muda de faixa suavemente (evita zigue-zague).
- **Rubber-band suave:** IAs atrás do jogador ganham ~4% de velocidade; muito à frente, perdem ~3%. Limites para não parecer trapaça.
- Grid inicial em 3 fileiras escalonadas (ou largada lançada — decisão em aberto). Ranking calculado por `volta × comprimento + z`.

---

## 🖥️ HUD (estilo Top Gear SNES)

```
┌──────────────────────────────────────────────────────────────┐
│ POS 3/15   VOLTA 2/5          [ MINIMAPA ]      VOLTA 0:48.21│
│                                               MELHOR 0:46.90│
│                                               TOTAL 3:12.44 │
│                                                              │
│                     (área de jogo)                           │
│                                                              │
│ ┌──────────────┐                              ┌────────────┐ │
│ │ 187 km/h  ▲▲ │                              │ GASOLINA   │ │
│ │ [███████░░]  │                              │ [██████░]  │ │
│ │ MARCHA  4    │                              │ NITRO ●●●○ │ │
│ └──────────────┘                              └────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Elementos obrigatórios, em painéis pixel com borda dupla e fonte bitmap:

1. **Marcha** + barra de RPM
2. **Nitros** disponíveis (ícones ●●○○)
3. **Minimapa** da pista com 15 pontos coloridos (jogador destacado)
4. **Velocidade** (km/h, dígitos grandes)
5. **Tempo de volta** + melhor volta + total
6. **Posição** (3/15)
7. **Gasolina** (barra com cor que muda: verde → amarelo → vermelho)

Extras: contagem regressiva, "ÚLTIMA VOLTA", flash de posição e tela de resultados com tempos.

---

## 🗺️ Conteúdo

- **3 pistas** (fácil / média / difícil): deserto ao entardecer, litoral, cidade à noite. Definidas em dados (curva, colina, cenário, largura) — fáceis de editar e expandir.
- **5 voltas** por corrida (configurável), 14 oponentes.
- **Menu:** título, seleção de carro (com stats), seleção de pista, opções (som, câmbio auto/manual).
- **Áudio:** motor sintetizado via WebAudio (pitch por RPM), nitro, colisão, contagem, música chiptune simples.

**Arte:** paleta limitada (~32 cores), sprites dos carros em 3–4 escalas (traseira/lateral traseira), cenário em camadas. Sprites podem ser gerados por código para não depender de assets externos.

---

## 🗓️ Fases de implementação

| Fase | Entrega | Tempo |
|---|---|---|
| **M0** | Setup Vite/TS, canvas 320×224 escalado, loop fixo, input | 0,5 dia |
| **M1** | Motor de pista pseudo-3D: segmentos, curvas, colinas, skyline, cenário | 2 dias |
| **M2** | Carro do jogador: direção, aceleração, câmbio, RPM, off-road | 1 dia |
| **M3** | Corrida: voltas, checkpoints, ranking de 15 carros, IA | 2 dias |
| **M4** | HUD completo (7 elementos) | 1 dia |
| **M5** | 4 carros + 14 cores de IA, 3 pistas, seleção | 2 dias |
| **M6** | Nitro, gasolina/pit, colisões carro×carro, áudio, menus, resultados | 2 dias |
| **M7** | Balanceamento, performance, testes, README | 1 dia |

**Total ≈ 11–12 dias de trabalho focado.** MVP jogável (1 pista + HUD básico) em ~4 dias.

---

## ⚠️ Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Ajuste fino de curvas/colinas é trabalhoso | Sistema de dados + hot-reload + debug overlay da pista |
| IA injusta ou "trenzinho" | Telemetria, rubber-band limitado, variação de skill |
| Sensação de velocidade fraca | FOV, linhas de velocidade no nitro, parallax em 3 camadas, tremor |
| Performance | 320×224 + sprites pré-escalados + culling → 60 fps folgado |
| Direitos autorais | Nomes/arte/música 100% originais, apenas inspiração mecânica |

---

## 🎮 Extensões futuras

Tela dividida para 2 jogadores (marca do Top Gear), modo campeonato com 3 pistas, pit stop animado, clima/noite, editor de pista e fantasmas de melhor volta.

---

## ❓ Decisões em aberto

1. **Largada:** grid parado com contagem ou largada lançada?
2. **Nitro:** número fixo por corrida ou pickups na pista?
3. **Gasolina:** reabastecimento via pit stop ou apenas "acaba e limita a velocidade"?
4. **2 jogadores em tela dividida:** já no MVP ou extensão?

---

<p align="center">Feito com 🕹️ e pixel art.</p>
