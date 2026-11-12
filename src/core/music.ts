/**
 * Trilha sonora de corrida — tema original em estilo synthwave/8-bit.
 *
 * Nota sobre o Top Gear: a trilha original do programa é obra protected por
 * copyright (Wil Johnson / McVicar), então aqui vai umaテーマ ORIGINAL no
 * mesmo espírito (baixo pulsante, arpejo e bateria de corrida), gerada em
 * tempo real com a Web Audio API — sem nenhum arquivo de áudio no repo.
 *
 * Tudo é sintetizado: kick, caixa, chimbal, baixo, arpejo e melodia.
 */

const BPM = 142;
const STEP = 60 / BPM / 4; // duração de uma semicolcheia

/** Semitons acima do Lá (MIDI): 0 = C, 9 = A. */
const ROOT = 45; // A2

const NOTE = (semis: number) => 440 * Math.pow(2, (semis - 69) / 12);

/** Progressão de 4 compassos: Am | F | G | Am (índices de acorde). */
const CHORDS: number[][] = [
  [0, 3, 7], // Am
  [-4, 0, 3], // F
  [-2, 2, 5], // G
  [0, 3, 7], // Am
];

/** Melodia (semicolcheias). -1 = pausa. 4 compassos. */
const MELODY: number[] = [
  // compasso 1 (Am)
  12, -1, -1, 15, 19, -1, 17, -1, 15, -1, -1, 12, -1, -1, -1, -1,
  // compasso 2 (F)
  20, -1, 19, -1, 17, -1, 15, -1, 12, -1, 15, -1, 17, -1, -1, -1,
  // compasso 3 (G)
  14, -1, -1, 17, 19, -1, 22, -1, 19, -1, 17, -1, 14, -1, -1, -1,
  // compasso 4 (Am)
  12, -1, 15, -1, 19, -1, 24, -1, 19, -1, 17, -1, 15, -1, 12, -1,
];

const KICK = new Set([0, 6, 8, 14]);
const SNARE = new Set([4, 12]);
const BASS = new Set([0, 3, 6, 8, 11, 14]);

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private playing = false;
  private volume = 0.45;

  /** 0..1 */
  getVolume(): number {
    return this.volume;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.out && this.ctx) {
      this.out.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /** Liga a música (precisa de um AudioContext já desbloqueado). */
  start(ctx: AudioContext, destination: AudioNode): void {
    if (this.playing && this.ctx === ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.volume;
    this.out.connect(destination);

    if (!this.noise) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }

    this.playing = true;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    this.playing = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.out && this.ctx) {
      this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  /** Agenda as notas um pouco à frente do momento em que soam. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    while (this.nextTime < ctx.currentTime + 0.2) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % (MELODY.length);
    }
  }

  private playStep(step: number, time: number): void {
    const bar = Math.floor(step / 16) % CHORDS.length;
    const inBar = step % 16;
    const chord = CHORDS[bar];

    if (KICK.has(inBar)) this.kick(time);
    if (SNARE.has(inBar)) this.snare(time);
    // chimbal: colcheias nas contratempos + uma nota quieta nas demais
    this.hat(time, inBar % 2 === 1 ? 0.05 : 0.022);
    if (BASS.has(inBar)) this.bass(time, ROOT + chord[0] - 12, inBar === 0 ? 0.16 : 0.11);
    this.arp(time, ROOT + chord[step % chord.length] + 12, 0.05);
    const melody = MELODY[step];
    if (melody >= 0) this.lead(time, ROOT + melody + 12, 0.1);
  }

  private env(gain: GainNode, time: number, dur: number, peak: number): void {
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  }

  private kick(time: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    this.env(gain, time, 0.16, 0.9);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private snare(time: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1900;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    this.env(gain, time, 0.14, 0.34);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    src.start(time);
    src.stop(time + 0.18);
  }

  private hat(time: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7200;
    const gain = ctx.createGain();
    this.env(gain, time, 0.045, peak);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    src.start(time);
    src.stop(time + 0.07);
  }

  private bass(time: number, midi: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = NOTE(midi);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(320, time + 0.16);
    filter.Q.value = 6;
    this.env(gain, time, 0.17, peak);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  private arp(time: number, midi: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = NOTE(midi);
    this.env(gain, time, 0.06, peak);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.09);
  }

  private lead(time: number, midi: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = NOTE(midi);
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    filter.Q.value = 2;
    this.env(gain, time, 0.22, peak);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.26);
  }
}
