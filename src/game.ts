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
  PAUSE_OPTION_COUNT,
  drawCarSelectScreen,
  drawCountdown,
  drawPauseScreen,
  drawResultsScreen,
  drawTitleScreen,
  drawTrackSelectScreen,
  pauseOptions,
} from './ui/screens';
import {
  isFullscreen,
  showFullscreenUnsupported,
  toggleFullscreen,
} from './ui/fullscreen';
import type { Track } from './world/track';
import { TRACKS } from './world/tracks';

type GameState = 'title' | 'car' | 'track' | 'race' | 'results';

const WIDTH = 320;
const HEIGHT = 224;
const CAR_WORLD_WIDTH = 820;
const CAR_WORLD_HEIGHT = 620;

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input = new Input();
  private readonly audio = new AudioEngine();

  private state: GameState = 'title';
  private carIndex = 0;
  private trackIndex = 0;
  private race: Race | null = null;

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
        if (input.confirmPressed) {
          this.audio.init();
          this.audio.beep(660, 0.08);
          this.state = 'car';
        }
        break;
      }

      case 'car': {
        this.menuZ += dt * 2800;
        if (input.leftPressed) this.changeCar(-1);
        if (input.rightPressed) this.changeCar(1);
        if (input.confirmPressed) {
          this.audio.beep(660, 0.08);
          this.state = 'track';
        }
        if (input.backPressed) this.state = 'title';
        break;
      }

      case 'track': {
        this.menuZ += dt * 2800;
        if (input.leftPressed) this.changeTrack(-1);
        if (input.rightPressed) this.changeTrack(1);
        if (input.confirmPressed) this.startRace();
        if (input.backPressed) this.state = 'car';
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
          this.race = null;
          this.state = 'title';
        }
        break;
      }
    }
  }

  private changeCar(direction: number): void {
    this.carIndex = (this.carIndex + direction + CAR_SPECS.length) % CAR_SPECS.length;
    this.audio.beep(520, 0.05, 'square', 0.08);
  }

  private changeTrack(direction: number): void {
    this.trackIndex = (this.trackIndex + direction + TRACKS.length) % TRACKS.length;
    this.audio.beep(520, 0.05, 'square', 0.08);
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
      if (x < 58 || x > 262 || y < 80 || y > 164) return;
      const index = Math.round((y - 92) / 20);
      if (index < 0 || index >= PAUSE_OPTION_COUNT) return;
      if (Math.abs(y - (92 + index * 20)) > 10) return;
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
        this.startRace();
        break;

      case 2:
        this.paused = false;
        this.race = null;
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
    this.race = new Race(TRACKS[this.trackIndex], CAR_SPECS[this.carIndex], this.audio);
    this.paused = false;
    this.bannerTimer = 0;
    this.lastLaps = 0;
    this.fuelWarned = false;
    this.wasRefueling = false;
    this.wasNitroPit = false;
    this.state = 'race';
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;

    switch (this.state) {
      case 'title':
        this.renderMenuBackground();
        drawTitleScreen(ctx, this.blink);
        break;

      case 'car':
        this.renderMenuBackground();
        drawCarSelectScreen(ctx, CAR_SPECS, this.carIndex, this.blink);
        break;

      case 'track':
        this.renderMenuBackground();
        drawTrackSelectScreen(ctx, TRACKS, this.trackIndex, this.blink);
        break;

      case 'race':
        this.renderRace();
        break;

      case 'results':
        this.renderRace();
        if (this.race) drawResultsScreen(ctx, this.race, this.blink);
        break;
    }
  }

  private renderMenuBackground(): void {
    const track = TRACKS[0];
    const camZ = this.menuZ;
    const camX = Math.sin(this.menuZ / 11000) * 900;
    const camY = this.groundAt(track, camZ) + CAMERA_HEIGHT;
    this.renderWorld(track, camZ, camX, camY, null);
  }

  private renderRace(): void {
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
    this.renderWorld(track, camZ, camX, camY, race.racers);
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    this.drawPlayerCar(race, lookBack);
    this.drawSpeedFx(race);
    ctx.restore();

    drawHud(ctx, this.buildHud(race));

    if (this.bannerTimer > 0 && !this.paused) {
      drawBanner(ctx, this.bannerText, this.bannerSub, '#ffd23f');
    }

    if (race.phase === 'countdown') drawCountdown(ctx, race.countdown);
    if (this.paused) drawPauseScreen(ctx, this.pauseIndex, pauseOptions(isFullscreen()));
  }

  private groundAt(track: Track, distance: number): number {
    const index = Math.floor(mod(distance, track.length) / SEGMENT_LENGTH) % track.segments.length;
    const segment = track.segments[index];
    const pct = mod(distance, SEGMENT_LENGTH) / SEGMENT_LENGTH;
    return lerp(segment.p1.world.y, segment.p2.world.y, pct);
  }

  private renderWorld(
    track: Track,
    cameraZ: number,
    cameraX: number,
    cameraY: number,
    racers: Racer[] | null,
  ): void {
    const ctx = this.ctx;
    const theme = track.theme;
    const night = track.id === 'cidade';

    // Inclinação do horizonte conforme o aclive/declive da pista.
    const ahead = this.groundAt(track, cameraZ + 1400);
    const behind = this.groundAt(track, cameraZ - 1400);
    const slope = (ahead - behind) / 2800;
    this.pitch = clamp(slope * 900, -17, 17);

    // céu, sol/lua, estrelas e nuvens
    this.drawSky(theme, night, cameraZ, cameraX, this.pitch);

    // parallax
    const offset = cameraZ * 0.00035 + cameraX * 0.02;
    this.drawMountains(112 + this.pitch, 42, theme.parallaxFar, offset, 150);
    this.drawMountains(116 + this.pitch * 0.8, 26, theme.parallaxNear, offset * 1.8, 92);

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
    );

    this.drawSceneryLayer(visible, night);
    if (racers) this.drawRacersLayer(track, visible, racers, cameraZ);
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

    const cx = WIDTH * 0.72;
    const cy = (night ? 54 : 58) + pitch;

    // halo do sol / lua
    const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, night ? 46 : 56);
    halo.addColorStop(0, night ? 'rgba(200,212,255,0.4)' : 'rgba(255,226,150,0.55)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - 64, cy - 64, 128, 128);

    if (night) {
      // estrelas com cintilância e leve parallax
      for (let i = 0; i < 54; i += 1) {
        const px = mod(i * 73 + cameraX * 0.004, WIDTH);
        const py = clamp(4 + ((i * 37) % 96) + pitch * 0.6, 2, 104);
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + this.time * 1.4));
        ctx.globalAlpha = twinkle * 0.85;
        ctx.fillStyle = i % 9 === 0 ? '#ffd8a8' : '#dfe8ff';
        ctx.fillRect(Math.round(px), Math.round(py), i % 7 === 0 ? 2 : 1, 1);
      }
      ctx.globalAlpha = 1;

      // lua com crateras
      ctx.fillStyle = '#eef0ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(158,168,210,0.35)';
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 4, 3, 0, Math.PI * 2);
      ctx.arc(cx + 4, cy + 3, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // sol
      ctx.fillStyle = theme.horizon;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();

      // nuvens suaves
      const drift = mod(cameraZ * 0.0008 + this.time * 1.4, 420);
      for (let i = 0; i < 3; i += 1) {
        const cloudX = mod(i * 140 + 340 - drift, 480) - 80;
        const cloudY = 34 + i * 17 + pitch * 0.5;
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cloudX, cloudY, 34, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(cloudX + 22, cloudY + 2, 22, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(cloudX - 20, cloudY + 3, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
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

  private drawSceneryLayer(visible: Segment[], night: boolean): void {
    const ctx = this.ctx;
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      const segment = visible[i];
      if (segment.sprites.length === 0) continue;

      const p = segment.p1.screen;
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

  private drawRacersLayer(track: Track, visible: Segment[], racers: Racer[], cameraZ: number): void {
    const ctx = this.ctx;
    const player = this.race?.player;

    const visibleIndex = new Map<number, number>();
    visible.forEach((segment, index) => visibleIndex.set(segment.index, index));

    const list: Array<{ visible: number; racer: Racer; pct: number }> = [];

    for (const racer of racers) {
      if (racer === player) continue;

      const z = mod(racer.distance, track.length);
      // Só descarta quem está atrás da câmera ou além da distância de desenho.
      // (Antes, carros próximos sumiam e ainda colidiam com o jogador.)
      const gap = mod(racer.distance - cameraZ, track.length);
      if (gap < 30 || gap > DRAW_DISTANCE * SEGMENT_LENGTH) continue;

      const index = Math.floor(z / SEGMENT_LENGTH) % track.segments.length;
      const visiblePosition = visibleIndex.get(index);
      if (visiblePosition === undefined) continue;
      list.push({ visible: visiblePosition, racer, pct: (z % SEGMENT_LENGTH) / SEGMENT_LENGTH });
    }

    list.sort((a, b) => b.visible - a.visible);

    for (const item of list) {
      const segment = visible[item.visible];
      const s1 = segment.p1.screen;
      const s2 = segment.p2.screen;
      if (s1.scale <= 0) continue;

      const pct = item.pct;
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
      });
    }
  }

  private drawPlayerCar(race: Race, lookBack: boolean): void {
    const ctx = this.ctx;
    const player = race.player;
    const nitro = player.nitroTimer > 0;

    drawCar(
      ctx,
      160,
      216 - 2,
      72,
      52,
      { body: player.body, accent: player.accent, style: player.spec.style },
      {
        brake: this.braking,
        nitro,
        player: true,
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
