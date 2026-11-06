export class AudioEngine {
  enabled = true;

  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private oscs: OscillatorNode[] = [];
  private noise: AudioBuffer | null = null;

  /** Precisa ser chamado a partir de um gesto do usuário (clique/tecla). */
  init(): void {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume();
      return;
    }
    try {
      const ac = new AudioContext();
      const master = ac.createGain();
      master.gain.value = 0.55;
      master.connect(ac.destination);

      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      filter.Q.value = 4;

      const gain = ac.createGain();
      gain.gain.value = 0;
      filter.connect(gain);
      gain.connect(master);

      const oscA = ac.createOscillator();
      oscA.type = 'sawtooth';
      oscA.frequency.value = 55;
      const oscB = ac.createOscillator();
      oscB.type = 'square';
      oscB.frequency.value = 55;
      oscB.detune.value = 9;

      oscA.connect(filter);
      oscB.connect(filter);
      oscA.start();
      oscB.start();

      const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 1.2), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      this.ac = ac;
      this.master = master;
      this.engineGain = gain;
      this.engineFilter = filter;
      this.oscs = [oscA, oscB];
      this.noise = buffer;
    } catch {
      this.enabled = false;
    }
  }

  setEngine(rpmNorm: number, load: number): void {
    if (!this.enabled || !this.ac || !this.engineFilter || !this.engineGain) return;
    const now = this.ac.currentTime;
    const freq = 44 + rpmNorm * 158;
    this.oscs[0]?.frequency.setTargetAtTime(freq, now, 0.04);
    this.oscs[1]?.frequency.setTargetAtTime(freq * 1.011, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(300 + rpmNorm * 2100, now, 0.06);
    this.engineGain.gain.setTargetAtTime(0.03 + load * 0.055, now, 0.09);
  }

  silenceEngine(): void {
    if (!this.ac || !this.engineGain) return;
    this.engineGain.gain.setTargetAtTime(0, this.ac.currentTime, 0.05);
  }

  beep(freq: number, dur = 0.09, type: OscillatorType = 'square', vol = 0.16): void {
    if (!this.enabled || !this.ac || !this.master) return;
    const ac = this.ac;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  sweep(from: number, to: number, dur: number, vol = 0.18): void {
    if (!this.enabled || !this.ac || !this.master) return;
    const ac = this.ac;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), ac.currentTime + dur);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  noiseBurst(dur = 0.28, vol = 0.35, freq = 900): void {
    if (!this.enabled || !this.ac || !this.master || !this.noise) return;
    const ac = this.ac;
    const src = ac.createBufferSource();
    src.buffer = this.noise;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.9;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    src.stop(ac.currentTime + dur + 0.02);
  }

  crash(): void {
    this.noiseBurst(0.35, 0.4, 500);
  }

  nitro(): void {
    this.noiseBurst(0.6, 0.22, 2400);
    this.sweep(180, 900, 0.45, 0.1);
  }

  countdownBeep(final = false): void {
    this.beep(final ? 880 : 440, final ? 0.35 : 0.12, 'square', final ? 0.22 : 0.14);
  }

  lapBeep(): void {
    this.beep(740, 0.1, 'square', 0.12);
    setTimeout(() => this.beep(990, 0.14, 'square', 0.12), 110);
  }
}
