import { clamp } from '../render/pseudo3d';

const GEAR_BOTTOM = [0, 0.1, 0.2, 0.3, 0.42, 0.56];
const GEAR_TOP = [0.2, 0.34, 0.5, 0.66, 0.84, 1.0];

const MAX_RPM = 8000;
const MIN_RPM = 900;

export class Gearbox {
  gear = 1;
  rpmNorm = 0;
  rpm = MIN_RPM;
  /** 0..1 — multiplicador de torque da marcha atual. */
  power = 0.6;
  auto = true;

  private cooldown = 0;

  update(speedFrac: number, dt: number, throttle: boolean, manualUp: boolean, manualDown: boolean): void {
    this.cooldown = Math.max(0, this.cooldown - dt);

    const bottom = GEAR_BOTTOM[this.gear - 1];
    const top = GEAR_TOP[this.gear - 1];
    this.rpmNorm = clamp((speedFrac - bottom) / Math.max(0.0001, top - bottom), 0, 1);
    this.rpm = MIN_RPM + this.rpmNorm * (MAX_RPM - MIN_RPM);

    if (this.auto) {
      if (this.cooldown <= 0 && this.rpmNorm > 0.94 && this.gear < 6) this.shift(1);
      else if (this.cooldown <= 0 && this.rpmNorm < 0.22 && this.gear > 1) this.shift(-1);
    } else {
      if (manualUp && this.cooldown <= 0) this.shift(1);
      else if (manualDown && this.cooldown <= 0) this.shift(-1);
    }

    // Torque: sobe até ~70% do RPM e cai perto do corte.
    const torque = this.rpmNorm < 0.7 ? 0.55 + (this.rpmNorm / 0.7) * 0.45 : 1 - (this.rpmNorm - 0.7) * 0.6;
    this.power = clamp(torque, 0.35, 1) * (throttle ? 1 : 0.85);
  }

  shift(direction: number): void {
    this.gear = clamp(this.gear + direction, 1, 6);
    this.cooldown = 0.32;
    this.rpmNorm = 0;
  }

  gearLabel(): string {
    return String(this.gear);
  }
}
