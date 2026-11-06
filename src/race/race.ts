import type { AudioEngine } from '../core/audio';
import type { InputState } from '../core/input';
import { Rng } from '../core/rng';
import { AI_COLORS, CAR_SPECS, type CarSpec } from '../entities/carspecs';
import { clamp, lerp, mod, SEGMENT_LENGTH, type Segment } from '../render/pseudo3d';
import type { Track } from '../world/track';
import { Gearbox } from './gearbox';

export const CAR_Z_SIZE = 240;
export const CAR_X_SIZE = 0.26;

export interface Racer {
  id: number;
  name: string;
  spec: CarSpec;
  body: string;
  accent: string;
  isPlayer: boolean;

  distance: number;
  prevZ: number;
  offset: number;
  speed: number;

  started: boolean;
  lapsDone: number;
  finished: boolean;
  finishTime: number;

  lapStart: number;
  lapTimes: number[];
  bestLap: number;

  skill: number;
  targetOffset: number;
  laneTimer: number;

  gearbox: Gearbox;
  nitroLeft: number;
  nitroTimer: number;
  fuel: number;

  offRoad: boolean;
  steer: number;
  bump: number;
}

export type RacePhase = 'countdown' | 'racing' | 'finished';

export class Race {
  readonly track: Track;
  readonly racers: Racer[] = [];
  readonly player: Racer;

  phase: RacePhase = 'countdown';
  countdown = 3.8;
  time = 0;
  shake = 0;
  nitroFx = 0;
  standings: Racer[] = [];

  private readonly audio: AudioEngine;
  private rng = new Rng(0x6e697472);
  private lastTick = 5;
  private crashCooldown = 0;
  private finishTimer = 0;

  constructor(track: Track, playerSpec: CarSpec, audio: AudioEngine) {
    this.track = track;
    this.audio = audio;

    const lanes = [-0.55, 0, 0.55];
    const playerGrid = 12;

    for (let i = 0; i < 15; i += 1) {
      const isPlayer = i === playerGrid;
      const spec = isPlayer ? playerSpec : CAR_SPECS[i % CAR_SPECS.length];
      const palette = isPlayer
        ? { body: playerSpec.body, accent: playerSpec.accent }
        : AI_COLORS[(i + 3) % AI_COLORS.length];

      const row = Math.floor(i / 3);
      const distance = -row * 430;

      const racer: Racer = {
        id: i,
        name: isPlayer ? 'VOCÊ' : `CPU ${String(i + 1).padStart(2, '0')}`,
        spec,
        body: palette.body,
        accent: palette.accent,
        isPlayer,

        distance,
        prevZ: mod(distance, track.length),
        offset: lanes[i % 3],
        speed: 0,

        started: distance >= 0,
        lapsDone: 0,
        finished: false,
        finishTime: 0,

        lapStart: 0,
        lapTimes: [],
        bestLap: 0,

        skill: isPlayer ? 1 : 0.84 + this.rng.next() * 0.18,
        targetOffset: lanes[i % 3],
        laneTimer: this.rng.range(0.4, 2),

        gearbox: new Gearbox(),
        nitroLeft: spec.nitros,
        nitroTimer: 0,
        fuel: spec.fuelCapacity,

        offRoad: false,
        steer: 0,
        bump: 0,
      };

      this.racers.push(racer);
    }

    this.player = this.racers[playerGrid];
    this.standings = [...this.racers];
  }

  get lapDisplay(): number {
    return Math.min(this.track.laps, this.player.lapsDone + 1);
  }

  get positionDisplay(): number {
    const index = this.standings.indexOf(this.player);
    return (index < 0 ? this.racers.length - 1 : index) + 1;
  }

  get finishedAll(): boolean {
    return this.finishTimer > 2.6;
  }

  segmentAt(distance: number): Segment {
    const len = this.track.length;
    const index = Math.floor(mod(distance, len) / SEGMENT_LENGTH) % this.track.segments.length;
    return this.track.segments[index];
  }

  update(dt: number, input: InputState): void {
    this.crashCooldown = Math.max(0, this.crashCooldown - dt);
    this.shake = Math.max(0, this.shake - dt * 2.6);
    this.nitroFx = Math.max(0, this.nitroFx - dt * 1.8);

    if (this.phase === 'finished') {
      this.finishTimer += dt;
      this.audio.setEngine(0.15, 0.1);
      return;
    }

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const tick = Math.ceil(this.countdown);
      if (tick < this.lastTick) {
        this.lastTick = tick;
        if (tick > 0) this.audio.countdownBeep(false);
        else {
          this.audio.countdownBeep(true);
          this.phase = 'racing';
          this.time = 0;
        }
      }
      this.audio.setEngine(0.08, 0.15);
      return;
    }

    this.time += dt;
    this.updatePlayer(dt, input);
    this.updateAi(dt);
    this.resolveCollisions();
    this.refreshStandings();

    const frac = this.player.speed / this.player.spec.maxSpeed;
    const load = this.player.speed > 0 ? 0.4 + frac * 0.6 : 0.15;
    this.audio.setEngine(clamp(this.player.gearbox.rpmNorm, 0, 1), load);
  }

  private updatePlayer(dt: number, input: InputState): void {
    const p = this.player;
    const spec = p.spec;
    const gb = p.gearbox;
    const segment = this.segmentAt(p.distance);
    const speedFrac = p.speed / spec.maxSpeed;

    gb.update(clamp(speedFrac, 0, 1), dt, input.throttle, input.shiftUp, input.shiftDown);
    if (input.shiftUp || input.shiftDown) this.audio.beep(260, 0.04, 'square', 0.05);

    let steer = 0;
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    p.steer = lerp(p.steer, steer, Math.min(1, dt * 14));
    p.offset += steer * 2.6 * Math.max(0.12, speedFrac) * dt;

    p.offset -= segment.curve * speedFrac * (0.3 + (1 - spec.grip) * 0.24) * dt;
    p.offset = clamp(p.offset, -1.75, 1.75);

    const nitroActive = p.nitroTimer > 0;
    if (input.nitro && p.nitroLeft > 0 && !nitroActive) {
      p.nitroLeft -= 1;
      p.nitroTimer = 2.4;
      this.nitroFx = 1;
      this.audio.nitro();
    }
    if (nitroActive) p.nitroTimer = Math.max(0, p.nitroTimer - dt);

    const accelBase = spec.maxSpeed / spec.accelFactor;
    let accel = 0;
    if (input.throttle) accel += accelBase * gb.power * (nitroActive ? 2 : 1);
    if (input.brake) accel -= spec.maxSpeed * 1.5;
    if (!input.throttle && !input.brake) accel -= spec.maxSpeed * 0.22;

    p.speed += accel * dt;

    const fuelFactor = p.fuel <= 0 ? 0.55 : 1;
    const top = spec.maxSpeed * (nitroActive ? 1.2 : 1) * fuelFactor;
    if (p.speed > top) p.speed = Math.max(top, p.speed - spec.maxSpeed * 1.25 * dt);
    if (p.speed < 0) p.speed = 0;

    p.offRoad = Math.abs(p.offset) > 1.02;
    if (p.offRoad) {
      const limit = spec.maxSpeed * 0.34;
      if (p.speed > limit) p.speed = Math.max(limit, p.speed - spec.maxSpeed * 1.15 * dt);
      this.shake = Math.max(this.shake, 0.6 + speedFrac * 0.7);
      if (Math.abs(p.offset) > 1.52) {
        p.offset = Math.sign(p.offset) * 1.52;
        p.speed *= 0.965;
      }
    }

    const burn = spec.fuelBurn * (0.18 + speedFrac * 0.78 + (nitroActive ? 0.85 : 0));
    p.fuel = Math.max(0, p.fuel - burn * dt);

    p.distance += p.speed * dt;
    this.wrapCheck(p);
  }

  private updateAi(dt: number): void {
    const len = this.track.length;
    const count = this.track.segments.length;

    for (const r of this.racers) {
      if (r.isPlayer || r.finished) continue;

      const z = mod(r.distance, len);
      const idx = Math.floor(z / SEGMENT_LENGTH) % count;
      const here = this.track.segments[idx];
      const ahead = this.track.segments[(idx + 10) % count];
      const curveMag = Math.abs(here.curve) * 0.55 + Math.abs(ahead.curve) * 0.45;

      let target = r.spec.maxSpeed * (0.8 + r.skill * 0.17);
      target *= 1 - Math.min(0.3, curveMag * 0.042);

      const gap = this.player.distance - r.distance;
      if (gap > 1600) target *= 1.045;
      else if (gap < -5200) target *= 0.965;

      const accel = r.spec.maxSpeed / (r.spec.accelFactor * 1.2);
      if (r.speed < target) r.speed = Math.min(target, r.speed + accel * dt);
      else r.speed = Math.max(target, r.speed - r.spec.maxSpeed * 0.9 * dt);

      r.distance += r.speed * dt;
      this.wrapCheck(r);

      r.laneTimer -= dt;
      if (r.laneTimer <= 0) {
        r.laneTimer = 1.1 + this.rng.next() * 2.4;

        let bestLane = r.offset;
        let bestScore = -Infinity;
        for (const lane of [-0.62, -0.21, 0.21, 0.62]) {
          let score = 1 - Math.abs(lane) * 0.12;
          for (const other of this.racers) {
            if (other === r) continue;
            let dz = mod(other.distance - r.distance + len / 2, len) - len / 2;
            if (dz > 0 && dz < 1100 && Math.abs(other.offset - lane) < 0.3) {
              score -= 0.9;
              break;
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestLane = lane;
          }
        }
        r.targetOffset = bestLane;
      }

      const step = clamp(r.targetOffset - r.offset, -0.6 * dt, 0.6 * dt);
      r.offset += step;
      r.offset -= here.curve * (r.speed / r.spec.maxSpeed) * 0.24 * dt;
      r.offset = clamp(r.offset, -0.95, 0.95);
    }
  }

  private resolveCollisions(): void {
    const len = this.track.length;
    const list = this.racers;

    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];

        const dz = Math.abs(mod(a.distance - b.distance + len / 2, len) - len / 2);
        if (dz > CAR_Z_SIZE) continue;

        const dx = a.offset - b.offset;
        if (Math.abs(dx) > CAR_X_SIZE) continue;

        const dir = dx === 0 ? 1 : Math.sign(dx);
        const overlap = CAR_X_SIZE - Math.abs(dx);
        a.offset = clamp(a.offset + dir * overlap * 0.5, -1.6, 1.6);
        b.offset = clamp(b.offset - dir * overlap * 0.5, -1.6, 1.6);

        const slow = 0.975;
        a.speed *= slow;
        b.speed *= slow;

        if ((a.isPlayer || b.isPlayer) && this.crashCooldown <= 0) {
          this.crashCooldown = 0.35;
          this.shake = Math.max(this.shake, 1.1);
          this.audio.crash();
        }
      }
    }
  }

  private wrapCheck(r: Racer): void {
    const len = this.track.length;
    const z = mod(r.distance, len);

    if (r.prevZ > len * 0.7 && z < len * 0.3) this.onLap(r);
    r.prevZ = z;
  }

  private onLap(r: Racer): void {
    if (!r.started) {
      r.started = true;
      r.lapStart = this.time;
      return;
    }

    const lapTime = this.time - r.lapStart;
    r.lapTimes.push(lapTime);
    if (r.bestLap === 0 || lapTime < r.bestLap) r.bestLap = lapTime;
    r.lapStart = this.time;
    r.lapsDone += 1;

    const isLastLap = r.lapsDone === this.track.laps - 1;

    if (r.lapsDone >= this.track.laps && !r.finished) {
      r.finished = true;
      r.finishTime = this.time;
      if (r.isPlayer) {
        this.phase = 'finished';
        this.finishTimer = 0;
        this.player.fuel = Math.max(this.player.fuel, 0);
        this.audio.silenceEngine();
        this.audio.beep(1046, 0.5, 'square', 0.2);
      }
    } else if (r.isPlayer) {
      this.audio.lapBeep();
      if (isLastLap) this.audio.beep(880, 0.3, 'square', 0.18);
    }
  }

  private refreshStandings(): void {
    this.standings = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.distance - a.distance;
    });
  }
}
