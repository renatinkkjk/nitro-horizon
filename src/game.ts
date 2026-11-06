import { AudioEngine } from './core/audio';
import { Input, type InputState } from './core/input';
import { CAR_SPECS } from './entities/carspecs';
import { Race, type Racer } from './race/race';
import { drawHud, type HudData, type MinimapDot } from './render/hud';
import {
  CAMERA_HEIGHT,
  DRAW_DISTANCE,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
  lerp,
  mod,
  renderRoad,
  type Segment,
} from './render/pseudo3d';
import { drawCar, drawScenery, spriteWorldSize } from './render/sprites';
import {
  drawCarSelectScreen,
  drawCountdown,
  drawPauseScreen,
  drawResultsScreen,
  drawTitleScreen,
  drawTrackSelectScreen,
} from './ui/screens';
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
  private blink = true;
  private blinkTimer = 0;
  private paused = false;
  private braking = false;

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
      this.blinkTimer += dt;
      if (this.blinkTimer > 0.45) {
        this.blinkTimer = 0;
        this.blink = !this.blink;
      }

      const input = this.input.poll();
      this.update(dt, input);
      this.render();

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

        if (input.pausePressed) {
          this.paused = !this.paused;
          if (this.paused) this.audio.silenceEngine();
        }

        if (this.paused) {
          if (input.backPressed) {
            this.paused = false;
            this.race = null;
            this.audio.silenceEngine();
            this.state = 'title';
          }
          break;
        }

        this.braking = input.brake;
        race.update(dt, input);

        if (race.phase === 'finished' && race.finishedAll) {
          this.state = 'results';
        }
        break;
      }

      case 'results': {
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

  private startRace(): void {
    this.audio.init();
    this.audio.beep(880, 0.16, 'square', 0.16);
    this.race = new Race(TRACKS[this.trackIndex], CAR_SPECS[this.carIndex], this.audio);
    this.paused = false;
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

    ctx.save();
    ctx.translate(sx, sy);
    this.renderWorld(track, camZ, camX, camY, race.racers);
    this.drawPlayerCar(race);
    this.drawSpeedFx(race);
    ctx.restore();

    drawHud(ctx, this.buildHud(race));

    if (race.phase === 'countdown') drawCountdown(ctx, race.countdown);
    if (this.paused) drawPauseScreen(ctx);
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

    // céu
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.62);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // sol / lua
    ctx.fillStyle = theme.horizon;
    ctx.beginPath();
    ctx.arc(WIDTH * 0.72, 58, 20, 0, Math.PI * 2);
    ctx.fill();

    // parallax
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
    );

    this.drawSceneryLayer(visible, night);
    if (racers) this.drawRacersLayer(track, visible, racers, cameraZ);
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
    ctx.lineTo(WIDTH, baseY + 6);
    ctx.lineTo(0, baseY + 6);
    ctx.closePath();
    ctx.fill();
  }

  private drawSceneryLayer(visible: Segment[], night: boolean): void {
    const ctx = this.ctx;
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      const segment = visible[i];
      if (segment.sprites.length === 0) continue;

      const p = segment.p1.screen;
      if (p.scale <= 0 || p.y < segment.clip) continue;

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
      // Distância relativa ao jogador na pista (circuito). Mantemos carros
      // que estejam dentro do alcance de desenho. Não descartamos carros
      // muito próximos (gap < 500) — isso fazia o oponente sumir ao encostar.
      const gap = mod(racer.distance - cameraZ, track.length);
      if (gap > DRAW_DISTANCE * SEGMENT_LENGTH) continue;

      const index = Math.floor(z / SEGMENT_LENGTH) % track.segments.length;
      const visiblePosition = visibleIndex.get(index);
      if (visiblePosition === undefined) continue;
      list.push({ visible: visiblePosition, racer, pct: (z % SEGMENT_LENGTH) / SEGMENT_LENGTH });
    }

    // Desenha do mais distante para o mais próximo (painter's algorithm).
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

      if (cy < segment.clip) continue;

      const w = (scale * CAR_WORLD_WIDTH * WIDTH) / 2;
      const h = (scale * CAR_WORLD_HEIGHT * HEIGHT) / 2;
      if (w < 1.5 || h < 1.5) continue;
      // Limite máximo para não cobrir a tela inteira, mas permite carro próximo.
      if (w > WIDTH * 0.85) continue;
      if (cx < -w || cx > WIDTH + w) continue;

      drawCar(ctx, cx, cy, w, h, { body: item.racer.body, accent: item.racer.accent });
    }
  }

  private drawPlayerCar(race: Race): void {
    const ctx = this.ctx;
    const player = race.player;
    const nitro = player.nitroTimer > 0;

    drawCar(
      ctx,
      160 + player.steer * 8,
      216,
      64,
      46,
      { body: player.body, accent: player.accent },
      {
        brake: this.braking,
        nitro,
        player: true,
        tilt: player.steer,
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
    const mapLength = race.track.map.length;
    const last = Math.max(0, mapLength - 1);

    const dots: MinimapDot[] = race.racers.map((racer) => {
      // Como a pista é um circuito, usamos a distância normalizada [0,1]
      // para indexar o mapa (que agora é um loop fechado).
      const t = mod(racer.distance, race.track.length) / race.track.length;
      const index = Math.min(last, Math.max(0, Math.floor(t * last)));
      const [x, y] = race.track.map[index];
      return { x, y, color: racer.body, isPlayer: racer.isPlayer };
    });

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
      map: race.track.map,
      dots,
      lastLap: player.lapsDone === race.track.laps - 1,
      message: '',
      messageTimer: 0,
    };
  }
}
