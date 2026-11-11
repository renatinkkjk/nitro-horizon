import { AudioEngine } from './core/audio';
import { Input, type InputState } from './core/input';
import { CAR_SPECS } from './entities/carspecs';
import { Race, type Racer } from './race/race';
import { drawHud, drawBanner, formatTime, type HudData, type MinimapDot } from './render/hud';
import {
  CAMERA_HEIGHT,
  DRAW_DISTANCE,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
  clamp,
  lerp,
  mod,
  renderRoad,
  type Segment,
} from './render/pseudo3d';
import { drawCar, drawScenery, spriteWorldSize } from './render/sprites';
import {
  MAIN_MENU_COUNT,
  PAUSE_OPTION_COUNT,
  drawCountdown,
  drawHelpScreen,
  drawPauseScreen,
  drawResultsScreen,
  drawStoryScreen,
  drawTitleScreen,
  drawTrackSelectScreen,
  pauseOptions,
  type StoryRow,
  type StoryScreenData,
} from './ui/screens';
import {
  isFullscreen,
  showFullscreenUnsupported,
  toggleFullscreen,
} from './ui/fullscreen';
import type { Track } from './world/track';
import { TRACKS } from './world/tracks';

type GameState = 'title' | 'help' | 'track' | 'race' | 'results' | 'story' | 'storyEnd';

/** Pontuação do campeonato do modo história (1º ao 10º). */
const STORY_POINTS = [15, 12, 10, 8, 6, 5, 4, 3, 2, 1];

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  strength: number;
}

const WIDTH = 400;
const HEIGHT = 280;
const CAR_WORLD_WIDTH = 820;
const CAR_WORLD_HEIGHT = 620;

export { WIDTH, HEIGHT };

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input = new Input();
  private readonly audio = new AudioEngine();

  private state: GameState = 'title';
  private menuIndex = 0;
  private trackIndex = 0;
  private race: Race | null = null;

  // --- Modo história: campeonato de 3 corridas ---
  private storyActive = false;
  private storyRound = 0;
  private storyPlayerId = 14;
  private storyBannerPending = false;
  private readonly storyPoints = new Map<number, number>();
  private readonly storyPosSum = new Map<number, number>();
  private readonly storyNames = new Map<number, string>();
  private storyResults: Array<{ track: string; position: number }> = [];

  private menuZ = 0;
  private time = 0;
  /** Prompts ficam sempre visíveis (sem piscar). */
  private blink = true;
  private paused = false;
  private braking = false;
  private lookingBack = false;

  private bannerText = '';
  private bannerSub = '';
  private bannerTimer = 0;
  private lastLaps = 0;
  private fuelWarned = false;
  private wasRefueling = false;
  private wasNitroPit = false;
  private pitch = 0;
  private pauseIndex = 0;
  private frameErrors = 0;
  private smoke: SmokePuff[] = [];
  private smokeTimer = 0;
  private exhaustTimer = 0;
  private exhaustParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = [];
  // Hill system removado: groundAt retorna 0 (pista plana), pitch sempre 0.

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    const unlock = () => this.audio.init();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
  }

  start(): void {
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
      last = now;

      this.time += dt;

      const input = this.input.poll();
      // Um erro num frame não pode matar o loop de requestAnimationFrame.
      // Se o erro persistir, volta ao título em vez de ficar travado.
      try {
        this.update(dt, input);
        this.render();
        this.frameErrors = 0;
      } catch (error) {
        this.frameErrors += 1;
        if (this.frameErrors === 1 || this.frameErrors % 120 === 0) {
          console.error('[Nitro Horizon] Falha no frame:', error);
        }
        if (this.frameErrors > 120) {
          this.frameErrors = 0;
          this.race = null;
          this.paused = false;
          this.audio.silenceEngine();
          this.state = 'title';
        }
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  private update(dt: number, input: InputState): void {
    switch (this.state) {
      case 'title': {
        this.menuZ += dt * 3400;
        if (input.upPressed || input.leftPressed) {
          this.menuIndex = (this.menuIndex + MAIN_MENU_COUNT - 1) % MAIN_MENU_COUNT;
          this.audio.beep(480, 0.04, 'square', 0.06);
        }
        if (input.downPressed || input.rightPressed) {
          this.menuIndex = (this.menuIndex + 1) % MAIN_MENU_COUNT;
          this.audio.beep(480, 0.04, 'square', 0.06);
        }
        if (input.confirmPressed) {
          this.audio.init();
          this.audio.beep(660, 0.08);
          if (this.menuIndex === 0) {
            this.storyActive = false;
            this.state = 'track';
          } else if (this.menuIndex === 1) {
            this.resetStory();
            this.startStoryRace();
          } else {
            this.state = 'help';
          }
        }
        break;
      }

      case 'help': {
        this.menuZ += dt * 2200;
        if (input.confirmPressed || input.backPressed) {
          this.audio.beep(440, 0.08);
          this.state = 'title';
        }
        break;
      }

      case 'track': {
        this.menuZ += dt * 2800;
        if (input.leftPressed) this.changeTrack(-1);
        if (input.rightPressed) this.changeTrack(1);
        if (input.confirmPressed) this.startRace();
        if (input.backPressed) this.state = 'title';
        break;
      }

      case 'race': {
        const race = this.race;
        if (!race) break;

        // Menu de pausa (ESC / P)
        if (this.paused) {
          this.lookingBack = false;
          if (input.backPressed || input.pausePressed) {
            this.paused = false;
            this.audio.beep(520, 0.05, 'square', 0.08);
            break;
          }
          if (input.upPressed) {
            this.pauseIndex =
              (this.pauseIndex + PAUSE_OPTION_COUNT - 1) % PAUSE_OPTION_COUNT;
            this.audio.beep(480, 0.04, 'square', 0.06);
          }
          if (input.downPressed) {
            this.pauseIndex = (this.pauseIndex + 1) % PAUSE_OPTION_COUNT;
            this.audio.beep(480, 0.04, 'square', 0.06);
          }
          if (input.confirmPressed) this.choosePauseOption();
          break;
        }

        if (input.pausePressed || input.backPressed) {
          this.paused = true;
          this.lookingBack = false;
          this.pauseIndex = 0;
          this.audio.silenceEngine();
          this.audio.beep(520, 0.05, 'square', 0.08);
          break;
        }

        this.braking = input.brake;
        this.lookingBack = input.lookBack;
        race.update(dt, input);

        // Banner da rodada do modo história: entra logo após o "GO!".
        if (this.storyBannerPending && race.phase === 'racing') {
          this.storyBannerPending = false;
          this.bannerText = 'MODO HISTÓRIA';
          this.bannerSub = `RODADA ${this.storyRound + 1}/${TRACKS.length} · ${TRACKS[this.storyRound].name}`;
          this.bannerTimer = 2.6;
        }

        this.updateTireSmoke(dt, race);
        this.updateExhaust(dt, race);

        this.bannerTimer = Math.max(0, this.bannerTimer - dt);

        const player = race.player;
        if (player.lapsDone !== this.lastLaps) {
          this.lastLaps = player.lapsDone;
          if (player.lapsDone > 0) {
            const next = player.lapsDone + 1;
            this.bannerText =
              next > race.track.laps
                ? 'BANDEIRADA'
                : next === race.track.laps
                  ? 'ÚLTIMA VOLTA'
                  : `VOLTA ${next}/${race.track.laps}`;
            this.bannerSub = `MELHOR ${formatTime(player.bestLap)}`;
            this.bannerTimer = 2.2;
          }
        }

        // aviso de combustível e feedback do pit stop
        const fuelFrac = player.fuel / player.spec.fuelCapacity;
        if (!this.fuelWarned && fuelFrac < 0.2 && race.track.pit) {
          this.fuelWarned = true;
          this.bannerText = 'COMBUSTÍVEL BAIXO';
          this.bannerSub = 'PIT STOP NA RETA PRINCIPAL';
          this.bannerTimer = 2.8;
          this.audio.beep(660, 0.14, 'square', 0.12);
        }
        if (fuelFrac > 0.45) this.fuelWarned = false;

        if (player.refueling && !this.wasRefueling) {
          this.bannerText = 'PIT STOP';
          this.bannerSub = 'REABASTECENDO';
          this.bannerTimer = 1.4;
        }
        if (!player.refueling && this.wasRefueling && fuelFrac > 0.9) {
          this.bannerText = 'TANQUE CHEIO';
          this.bannerSub = 'PODE ACELERAR';
          this.bannerTimer = 1.6;
        }
        this.wasRefueling = player.refueling;

        if (player.nitroPit && !this.wasNitroPit) {
          this.bannerText = 'PIT STOP';
          this.bannerSub = 'NITRO RECARREGADO';
          this.bannerTimer = 1.7;
          this.audio.beep(980, 0.12, 'square', 0.1);
        }
        this.wasNitroPit = player.nitroPit;

        if (race.phase === 'finished' && race.finishedAll) {
          this.state = 'results';
        }
        break;
      }

      case 'results': {
        this.lookingBack = false;
        if (input.confirmPressed || input.backPressed) {
          this.audio.beep(440, 0.08);
          if (this.storyActive) {
            this.advanceStory();
          } else {
            this.race = null;
            this.state = 'title';
          }
        }
        break;
      }

      case 'story': {
        this.menuZ += dt * 2200;
        if (input.confirmPressed) {
          this.audio.beep(880, 0.12, 'square', 0.12);
          this.startStoryRace();
        } else if (input.backPressed) {
          this.quitStory();
        }
        break;
      }

      case 'storyEnd': {
        this.menuZ += dt * 2200;
        if (input.confirmPressed || input.backPressed) {
          this.quitStory();
        }
        break;
      }
    }
  }

  private changeTrack(direction: number): void {
    this.trackIndex = (this.trackIndex + direction + TRACKS.length) % TRACKS.length;
    this.audio.beep(520, 0.05, 'square', 0.08);
  }

  // --- Modo história ---

  private resetStory(): void {
    this.storyActive = true;
    this.storyRound = 0;
    this.storyPoints.clear();
    this.storyPosSum.clear();
    this.storyNames.clear();
    this.storyResults = [];
  }

  private startStoryRace(): void {
    this.trackIndex = this.storyRound;
    this.startRace();
    // O banner da rodada aparece quando a contagem termina (senão fica
    // escondido atrás do "3, 2, 1, GO!").
    this.storyBannerPending = true;
  }

  private advanceStory(): void {
    const race = this.race;
    if (!race) {
      this.state = 'title';
      return;
    }

    this.awardStoryPoints(race);

    if (this.storyRound < TRACKS.length - 1) {
      this.storyRound += 1;
      this.state = 'story';
    } else {
      this.state = 'storyEnd';
    }
  }

  /** Soma os pontos da corrida e guarda o melhor resultado de cada piloto. */
  private awardStoryPoints(race: Race): void {
    this.storyPlayerId = race.player.id;
    const playerPosition = race.standings.indexOf(race.player) + 1;
    this.storyResults.push({
      track: race.track.name,
      position: playerPosition > 0 ? playerPosition : race.racers.length,
    });

    race.standings.forEach((racer, i) => {
      const points = STORY_POINTS[i] ?? 0;
      this.storyPoints.set(racer.id, (this.storyPoints.get(racer.id) ?? 0) + points);
      this.storyPosSum.set(racer.id, (this.storyPosSum.get(racer.id) ?? 0) + i + 1);
      this.storyNames.set(racer.id, racer.name);
    });
  }

  private quitStory(): void {
    this.audio.beep(440, 0.08);
    this.storyActive = false;
    this.storyRound = 0;
    this.storyBannerPending = false;
    this.race = null;
    this.paused = false;
    this.audio.silenceEngine();
    this.menuIndex = 1;
    this.state = 'title';
  }

  private buildStoryData(complete: boolean): StoryScreenData {
    const entries = [...this.storyPoints.entries()].map(([id, points]) => ({
      id,
      name: this.storyNames.get(id) ?? `CPU ${String(id + 1).padStart(2, '0')}`,
      points,
      posSum: this.storyPosSum.get(id) ?? Number.MAX_SAFE_INTEGER,
    }));
    entries.sort((a, b) => b.points - a.points || a.posSum - b.posSum || a.id - b.id);

    const rows: StoryRow[] = entries.map((entry) => ({
      name: entry.name,
      points: entry.points,
      isPlayer: entry.id === this.storyPlayerId,
    }));
    const playerPosition = Math.max(
      1,
      entries.findIndex((entry) => entry.id === this.storyPlayerId) + 1,
    );

    return {
      complete,
      round: Math.min(this.storyRound + 1, TRACKS.length),
      totalRounds: TRACKS.length,
      nextTrack: TRACKS[this.storyRound]?.name ?? TRACKS[TRACKS.length - 1].name,
      rows,
      playerPosition,
      totalRacers: entries.length || 15,
      champion: playerPosition === 1,
      results: this.storyResults,
    };
  }

  /** Liga os botões de toque do HTML ao estado de input do jogo. */
  attachTouchControls(): void {
    const buttons = document.querySelectorAll<HTMLElement>('[data-code]');
    buttons.forEach((button) => {
      const code = button.dataset.code;
      if (!code) return;

      const setPressed = (down: boolean): void => {
        this.input.setVirtual(code, down);
        button.classList.toggle('active', down);
      };
      const press = (event: PointerEvent): void => {
        event.preventDefault();
        try {
          button.setPointerCapture(event.pointerId);
        } catch {
          // Ponteiro sintético/indisponível: o release ainda vem por pointerup.
        }
        setPressed(true);
      };
      const release = (): void => setPressed(false);

      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });

    window.addEventListener('blur', () => {
      buttons.forEach((button) => button.classList.remove('active'));
    });

    // Toque/clique direto nas opções do menu de pausa.
    const canvas = this.ctx.canvas;
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.paused) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      if (x < 72 || x > 327 || y < 100 || y > 230) return;
      const index = Math.round((y - 115) / 25);
      if (index < 0 || index >= PAUSE_OPTION_COUNT) return;
      if (Math.abs(y - (115 + index * 25)) > 10) return;
      this.pauseIndex = index;
      this.choosePauseOption();
    });
  }

  private choosePauseOption(): void {
    switch (this.pauseIndex) {
      case 0:
        this.paused = false;
        this.audio.beep(620, 0.05, 'square', 0.08);
        break;

      case 1:
        if (this.storyActive) this.startStoryRace();
        else this.startRace();
        break;

      case 2:
        this.paused = false;
        this.race = null;
        this.storyActive = false;
        this.audio.silenceEngine();
        this.audio.beep(440, 0.08);
        this.state = 'title';
        break;

      case 3: {
        this.audio.beep(660, 0.05, 'square', 0.08);
        void toggleFullscreen().then((result) => {
          if (result === 'unsupported') showFullscreenUnsupported();
        });
        break;
      }

      default:
        this.audio.beep(220, 0.08, 'square', 0.06);
        break;
    }
  }

  private startRace(): void {
    this.audio.init();
    this.audio.beep(880, 0.16, 'square', 0.16);
    this.race = new Race(TRACKS[this.trackIndex], CAR_SPECS[0], this.audio);
    this.paused = false;
    this.storyBannerPending = false;
    this.bannerTimer = 0;
    this.lastLaps = 0;
    this.fuelWarned = false;
    this.wasRefueling = false;
    this.wasNitroPit = false;
    this.smoke = [];
    this.smokeTimer = 0;
    this.state = 'race';
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;

    switch (this.state) {
      case 'title':
        this.renderMenuBackground();
        drawTitleScreen(ctx, this.menuIndex, this.blink);
        break;

      case 'help':
        this.renderMenuBackground();
        drawHelpScreen(ctx, this.blink);
        break;

      case 'track':
        this.renderMenuBackground(this.trackIndex);
        drawTrackSelectScreen(ctx, TRACKS, this.trackIndex, this.blink);
        break;

      case 'race':
        this.renderRace();
        break;

      case 'results': {
        this.renderRace(false);
        if (this.race) {
          const position = this.race.positionDisplay;
          drawResultsScreen(ctx, this.race, this.blink, {
            story: this.storyActive,
            round: this.storyRound + 1,
            totalRounds: TRACKS.length,
            ...(this.storyActive
              ? { pointsGained: STORY_POINTS[position - 1] ?? 0 }
              : {}),
          });
        }
        break;
      }

      case 'story':
        this.renderMenuBackground(this.storyRound);
        drawStoryScreen(ctx, this.buildStoryData(false), this.blink);
        break;

      case 'storyEnd':
        this.renderMenuBackground(TRACKS.length - 1);
        drawStoryScreen(ctx, this.buildStoryData(true), this.blink);
        break;
    }
  }

  private renderMenuBackground(trackIndex = 0): void {
    const track = TRACKS[trackIndex] ?? TRACKS[0];
    const camZ = this.menuZ;
    const camX = Math.sin(this.menuZ / 11000) * 900;
    const camY = this.groundAt(track, camZ) + CAMERA_HEIGHT;
    this.renderWorld(track, camZ, camX, camY, null);
  }

  private renderRace(showHud = true): void {
    const race = this.race;
    if (!race) return;

    const ctx = this.ctx;
    const track = race.track;
    const player = race.player;

    const shake = race.shake;
    const sx = shake > 0.02 ? Math.round((Math.random() - 0.5) * shake * 5) : 0;
    const sy = shake > 0.02 ? Math.round((Math.random() - 0.5) * shake * 5) : 0;

    const camZ = player.distance;
    const camX = player.offset * ROAD_WIDTH;
    const camY = this.groundAt(track, camZ) + CAMERA_HEIGHT;

    // Segurar R olha para trás: espelha a pista e mostra a frente do carro.
    const lookBack = this.lookingBack && !this.paused;

    ctx.save();
    ctx.translate(sx, sy);
    if (lookBack) {
      ctx.translate(WIDTH, 0);
      ctx.scale(-1, 1);
    }
    this.renderWorld(track, camZ, camX, camY, race.racers, lookBack);
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    this.drawTireSmoke();
    this.drawPlayerCar(race, lookBack);
    this.drawSpeedFx(race);
    this.drawExhaust();
    ctx.restore();

    if (!showHud) return;

    drawHud(ctx, this.buildHud(race));

    if (this.bannerTimer > 0 && !this.paused) {
      drawBanner(ctx, this.bannerText, this.bannerSub, '#ffd23f');
    }

    if (race.phase === 'countdown') drawCountdown(ctx, race.countdown);
    if (this.paused) drawPauseScreen(ctx, this.pauseIndex, pauseOptions(isFullscreen()));
  }

  private groundAt(track: Track, distance: number): number {
    // Hill system removado: retorna 0 (pista sempre plana).
    return 0;
  }

  private renderWorld(
    track: Track,
    cameraZ: number,
    cameraX: number,
    cameraY: number,
    racers: Racer[] | null,
    lookBack = false,
  ): void {
    const ctx = this.ctx;
    const theme = track.theme;
    const night = track.id === 'cidade';

    // Hill system removado: pitch sempre 0 (pista plana).
    this.pitch = 0;

    // céu (sem pitch/aglutinação de hill).
    this.drawSky(theme, night, cameraZ, cameraX, 0);

    // parallax (sem ajuste de pitch).
    const offset = cameraZ * 0.00035 + cameraX * 0.02;
    this.drawMountains(112, 42, theme.parallaxFar, offset, 150);
    this.drawMountains(116, 26, theme.parallaxNear, offset * 1.8, 92);

    // estrada
    const visible = renderRoad(
      ctx,
      track.segments,
      track.length,
      cameraZ,
      cameraX,
      cameraY,
      WIDTH,
      HEIGHT,
      theme.colors,
      lookBack,
    );

    this.drawSceneryLayer(visible, night, lookBack);
    if (racers) this.drawRacersLayer(track, visible, racers, cameraZ, lookBack);
  }

  private drawSky(
    theme: Track['theme'],
    night: boolean,
    cameraZ: number,
    cameraX: number,
    pitch: number,
  ): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.62);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawMountains(baseY: number, height: number, color: string, offset: number, period: number): void {
    const ctx = this.ctx;
    const shift = mod(offset, period);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let i = -1; i < WIDTH / period + 2; i += 1) {
      const x = i * period - shift;
      const peak = height * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7 + period)));
      ctx.lineTo(x, baseY);
      ctx.lineTo(x + period * 0.5, baseY - peak);
      ctx.lineTo(x + period, baseY);
    }
    ctx.lineTo(WIDTH, baseY);
    ctx.lineTo(WIDTH, baseY + 46);
    ctx.lineTo(0, baseY + 46);
    ctx.closePath();
    ctx.fill();
  }

  private drawSceneryLayer(visible: Segment[], night: boolean, lookBack: boolean): void {
    const ctx = this.ctx;
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      const segment = visible[i];
      if (segment.sprites.length === 0) continue;

      // Na visão traseira p2 é a borda mais próxima do segmento.
      const p = lookBack ? segment.p2.screen : segment.p1.screen;
      if (p.scale <= 0) continue;

      for (const sprite of segment.sprites) {
        const [worldW, worldH] = spriteWorldSize(sprite.kind, sprite.size);
        const sw = (p.scale * worldW * WIDTH) / 2;
        const sh = (p.scale * worldH * HEIGHT) / 2;
        if (sw < 0.8 || sh < 0.8) continue;

        const sx = p.x + sprite.offset * p.w;
        if (sx < -sw || sx > WIDTH + sw) continue;

        drawScenery(ctx, sprite.kind, sx, p.y, sw, sh, night);
      }
    }
  }

  private drawRacersLayer(
    track: Track,
    visible: Segment[],
    racers: Racer[],
    cameraZ: number,
    lookBack: boolean,
  ): void {
    const ctx = this.ctx;
    const player = this.race?.player;

    const visibleIndex = new Map<number, number>();
    visible.forEach((segment, index) => visibleIndex.set(segment.index, index));

    const baseIndex =
      Math.floor(mod(cameraZ, track.length) / SEGMENT_LENGTH) % track.segments.length;

    const list: Array<{ visible: number; racer: Racer; pct: number }> = [];

    for (const racer of racers) {
      if (racer === player) continue;

      const z = mod(racer.distance, track.length);
      // Olhando para trás, interessa quem está atrás da câmera (e vice-versa).
      const gap = lookBack
        ? mod(cameraZ - racer.distance, track.length)
        : mod(racer.distance - cameraZ, track.length);
      // Só descarta quem está atrás da câmera ou além da distância de desenho.
      // (Antes, carros próximos sumiam e ainda colidiam com o jogador.)
      if (gap < 30 || gap > DRAW_DISTANCE * SEGMENT_LENGTH) continue;

      const index = Math.floor(z / SEGMENT_LENGTH) % track.segments.length;
      // O trecho parcial mais próximo não é desenhado na visão traseira.
      if (lookBack && index === baseIndex) continue;

      const visiblePosition = visibleIndex.get(index);
      if (visiblePosition === undefined) continue;
      list.push({ visible: visiblePosition, racer, pct: (z % SEGMENT_LENGTH) / SEGMENT_LENGTH });
    }

    list.sort((a, b) => b.visible - a.visible);

    for (const item of list) {
      const segment = visible[item.visible];
      const s1 = lookBack ? segment.p2.screen : segment.p1.screen;
      const s2 = lookBack ? segment.p1.screen : segment.p2.screen;
      if (s1.scale <= 0) continue;

      // Na visão traseira a fração do segmento corre no sentido contrário.
      const pct = lookBack ? 1 - item.pct : item.pct;
      const scale = lerp(s1.scale, s2.scale, pct);
      const cx = lerp(s1.x, s2.x, pct) + item.racer.offset * lerp(s1.w, s2.w, pct);
      const cy = lerp(s1.y, s2.y, pct);

      // Segmento desenhado = carro sempre aparece. Só aplica o corte por
      // crista quando o segmento ficou atrás de um morro (senão o carro
      // piscava a cada emenda de segmento).
      if (!segment.drawn && cy < segment.clip - 1) continue;

      const w = (scale * CAR_WORLD_WIDTH * WIDTH) / 2;
      const h = (scale * CAR_WORLD_HEIGHT * HEIGHT) / 2;
      if (w < 1.5 || h < 1.5) continue;

      // Limita o tamanho de carros muito próximos em vez de sumir com eles.
      const shrink = w > 96 ? 96 / w : 1;
      const drawW = w * shrink;
      const drawH = h * shrink;
      const drawY = Math.min(cy, HEIGHT);

      if (cx < -drawW || cx > WIDTH + drawW) continue;

      drawCar(ctx, cx, drawY, drawW, drawH, {
        body: item.racer.body,
        accent: item.racer.accent,
        style: item.racer.spec.style,
      }, {
        lean: clamp((item.racer.targetOffset - item.racer.offset) * 0.9, -0.4, 0.4) * 0.085,
        view: lookBack ? 'front' : 'rear',
      });
    }
  }

  /** Emite e atualiza a fumaça dos pneus: pequena ao andar, maior nas curvas. */
  private updateTireSmoke(dt: number, race: Race): void {
    this.updateSmokeParticles(dt);

    const player = race.player;
    const speedFrac = clamp(player.speed / player.spec.maxSpeed, 0, 1);
    if (speedFrac < 0.045) return;

    const index =
      Math.floor(mod(player.distance, race.track.length) / SEGMENT_LENGTH) %
      race.track.segments.length;
    const curve = race.track.segments[index].curve;
    const curveNorm = Math.min(1, Math.abs(curve) / 3.5);
    const drift = Math.max(curveNorm, Math.abs(player.steer) * 0.75);
    const strength = clamp(0.16 + speedFrac * 0.34 + drift * 0.85, 0, 1);
    const turnDir = curve !== 0 ? Math.sign(curve) : Math.sign(player.steer);

    // Frequência de emissão: baixa no reto, alta em curvas fortes.
    this.smokeTimer += dt * (5 + 27 * strength);
    while (this.smokeTimer >= 1) {
      this.smokeTimer -= 1;
      this.spawnSmokePuff(strength, turnDir, Math.abs(player.steer));
    }
  }

  private spawnSmokePuff(strength: number, turnDir: number, steer: number): void {
    // Fumaça saindo por trás do carro (non-drift) ou lateral (drift)
    const isDrift = steer > 0.5;
    const side = isDrift ? (Math.random() < 0.5 ? -1 : 1) : 0;
    const outward = 6 + 10 * strength;
    // A fumaça escorrega para fora da curva apenas em drift.
    const push = isDrift ? -turnDir * (10 + 24 * strength) : 0;
    // Posição: traseira do carro (centro x, y logo abaixo do escapamento) ou lateral em drift.
    const backY = 272; // baseY + pequeno offset, dentro do canvas 280
    const lateralOffset = isDrift ? (37 + Math.random() * 5) : 0;
    this.smoke.push({
      x: 200 + side * lateralOffset,
      y: backY + Math.random() * 4,
      vx: isDrift ? side * outward * (0.5 + Math.random()) + push + (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 3,
      vy: -(3 + 10 * strength) - Math.random() * 5,
      life: 0,
      maxLife: 0.45 + Math.random() * 0.35 + strength * 0.25,
      size: 1 + Math.floor(Math.random() * (strength > 0.7 ? 2 : 1)),
      grow: 0.6 + strength * 1.6,
      strength,
    });
  }

  private updateSmokeParticles(dt: number): void {
    const alive: SmokePuff[] = [];
    for (const puff of this.smoke) {
      puff.life += dt;
      if (puff.life >= puff.maxLife) continue;
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.vx *= Math.max(0, 1 - dt * 1.6);
      puff.vy *= Math.max(0, 1 - dt * 1.1);
      alive.push(puff);
    }
    this.smoke = alive;
  }

  private updateExhaust(dt: number, race: Race): void {
    const player = race.player;
    const isRx7 = player.spec.style === 'rx7';
    const nitroActive = player.nitroTimer > 0;

    // Limpa partículas antigas
    this.exhaustParticles = this.exhaustParticles.filter((p) => p.life < p.maxLife);

    if (nitroActive && isRx7) {
      // Emite partículas do escapamento do RX-7
      this.exhaustTimer += dt;
      const emitRate = 8; // partículas por frame quando nitro ativo
      while (this.exhaustTimer >= (1 / emitRate)) {
        this.exhaustTimer -= 1 / emitRate;
        const exhaustY = 260; // escapamento na traseira do RX-7 (dentro do carro, perto do chão)
        const exhaustX = 200; // centro do carro
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        this.exhaustParticles.push({
          x: exhaustX,
          y: exhaustY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
          size: 1 + Math.random() * 2,
        });
      }
    }

    // Atualiza partículas
    for (const puff of this.exhaustParticles) {
      puff.life += dt;
      if (puff.life >= puff.maxLife) continue;
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.vy += dt * 1.5; // gravidade para baixo
    }
  }

  private drawExhaust(): void {
    const ctx = this.ctx;
    if (this.exhaustParticles.length === 0) return;
    for (const puff of this.exhaustParticles) {
      const t = puff.life / puff.maxLife;
      const alpha = 1 - t;
      const size = Math.max(1, puff.size * (1 - t));
      ctx.fillStyle = `rgba(200, 200, 200, ${alpha * 0.8})`;
      ctx.fillRect(
        Math.round(puff.x - size / 2),
        Math.round(puff.y - size / 2),
        size,
        size * 3,
      );
    }
  }

  private drawTireSmoke(): void {
    const ctx = this.ctx;
    for (const puff of this.smoke) {
      const t = puff.life / puff.maxLife;
      const alpha = Math.max(0, (1 - t) * (0.18 + 0.32 * puff.strength));
      const size = Math.max(1, Math.round(puff.size + puff.grow * t));
      ctx.fillStyle = `rgba(224, 228, 236, ${alpha.toFixed(3)})`;
      ctx.fillRect(
        Math.round(puff.x - size / 2),
        Math.round(puff.y - size / 2),
        size,
        size,
      );
    }
  }

  private drawPlayerCar(race: Race, lookBack: boolean): void {
    const ctx = this.ctx;
    const player = race.player;
    const nitro = player.nitroTimer > 0;

    drawCar(
      ctx,
      200,
      266,
      90,
      65,
      { body: player.body, accent: player.accent, style: player.spec.style },
      {
        brake: this.braking,
        nitro,
        player: true,
        lean: player.steer * 0.085 * Math.min(1, player.speed / 1600),
        view: lookBack ? 'front' : 'rear',
      },
    );
  }

  private drawSpeedFx(race: Race): void {
    if (race.nitroFx <= 0.03) return;
    const ctx = this.ctx;
    const alpha = race.nitroFx * 0.55;
    ctx.strokeStyle = `rgba(220,245,255,${alpha})`;
    ctx.lineWidth = 1;
    const cx = 160;
    const cy = 120;

    for (let i = 0; i < 22; i += 1) {
      const angle = (i / 22) * Math.PI * 2 + this.time * 0.6;
      const inner = 76 + ((i * 37) % 44);
      const length = 26 + ((i * 53) % 40);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * (inner + length), cy + Math.sin(angle) * (inner + length));
      ctx.stroke();
    }
  }

  private buildHud(race: Race): HudData {
    const player = race.player;
    const map = race.track.map;

    const dots: MinimapDot[] = race.racers.map((racer) => {
      const t = mod(racer.distance, race.track.length) / race.track.length;
      const last = map.length - 1;
      const index = Math.min(last, Math.max(0, Math.floor(t * last)));
      const [x, y] = map[index];
      return { x, y, color: racer.body, isPlayer: racer.isPlayer };
    });

    let pit: { x: number; y: number } | null = null;
    if (race.track.pit) {
      const t = mod(race.track.pit.entry, race.track.length) / race.track.length;
      const last = map.length - 1;
      const index = Math.min(last, Math.max(0, Math.round(t * last)));
      pit = { x: map[index][0], y: map[index][1] };
    }

    return {
      speedKmh: player.speed * 0.025,
      gear: player.gearbox.gearLabel(),
      rpmNorm: player.gearbox.rpmNorm,
      nitroLeft: player.nitroLeft,
      nitroMax: player.spec.nitros,
      fuelFrac: player.fuel / player.spec.fuelCapacity,
      lap: race.lapDisplay,
      laps: race.track.laps,
      position: race.positionDisplay,
      total: race.racers.length,
      lapTime: race.phase === 'racing' ? race.time - player.lapStart : 0,
      bestLap: player.bestLap,
      totalTime: race.time,
      map,
      dots,
      pit,
      inPit: player.inPit,
      refueling: player.refueling,
      lastLap: player.lapsDone === race.track.laps - 1 && this.bannerTimer <= 0,
      message: '',
      messageTimer: 0,
    };
  }
}
