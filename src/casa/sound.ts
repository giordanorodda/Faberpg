/**
 * The sounds of the house, all synthesised (no recordings to license or
 * load): the fire crackling, footsteps that change with what is underfoot,
 * the ninth stair that creaks, the cat purring, birds by day and crickets
 * at night outside, the small thud of a thing set down.
 *
 * Browsers only allow sound after a click, so nothing starts until start().
 */

export type Surface = 'wood' | 'rug' | 'stone' | 'stair';

export class HouseSound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private fireGain!: GainNode;
  private purrGain!: GainNode;
  private outGain!: GainNode;
  private nextCrackle = 0;
  private nextChirp = 0;
  private night = false;
  private fireLevel = 0;

  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);
    // one second of white noise, the raw material of most sounds here
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // the fire: a low roar of filtered noise; the crackles are scheduled one by one
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    this.fireGain.connect(this.master);
    const roar = this.loop();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.35;
    roar.connect(lp).connect(roarGain).connect(this.fireGain);

    // the purr: low noise pulsing about 25 times a second
    this.purrGain = ctx.createGain();
    this.purrGain.gain.value = 0;
    this.purrGain.connect(this.master);
    const purr = this.loop();
    const plp = ctx.createBiquadFilter();
    plp.type = 'lowpass';
    plp.frequency.value = 260;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 25;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(am.gain);
    lfo.start();
    purr.connect(plp).connect(am).connect(this.purrGain);

    // outside: a faint wind, birds and crickets come and go
    this.outGain = ctx.createGain();
    this.outGain.gain.value = 0.5;
    this.outGain.connect(this.master);
    const wind = this.loop();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.4;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.025;
    wind.connect(bp).connect(windGain).connect(this.outGain);
  }

  private loop(): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random() * 0.5;
    s.start();
    return s;
  }

  /** A short burst of filtered noise: the building block of steps, crackles and thuds. */
  private burst(at: number, dur: number, freq: number, type: BiquadFilterType, gain: number, q = 1, dest: AudioNode = this.master): void {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(at, Math.random() * 0.8, dur + 0.02);
  }

  /** How loud the fire is where you stand (0 far or upstairs … 1 beside it), and day or night outside. */
  setScene(fire: number, night: boolean, purr: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.fireLevel = fire;
    this.night = night;
    this.fireGain.gain.setTargetAtTime(fire * 0.5, t, 0.3);
    this.purrGain.gain.setTargetAtTime(purr * 0.35, t, 0.4);
  }

  /** Called every frame: schedules the crackles of the fire and the voices outside. */
  update(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (t > this.nextCrackle) {
      // crackles come in little clusters, then a pause
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const at = t + i * (0.02 + Math.random() * 0.06);
        this.burst(at, 0.01 + Math.random() * 0.03, 1800 + Math.random() * 3000, 'highpass', (0.15 + Math.random() * 0.5) * this.fireLevel, 0.7, this.master);
      }
      if (Math.random() < 0.06) this.burst(t, 0.12, 300, 'lowpass', 0.4 * this.fireLevel); // a log settling
      this.nextCrackle = t + 0.06 + Math.random() * Math.random() * 0.7;
    }
    if (t > this.nextChirp) {
      if (this.night) this.cricket(t);
      else if (Math.random() < 0.6) this.bird(t);
      this.nextChirp = t + (this.night ? 0.6 + Math.random() * 1.5 : 1.5 + Math.random() * 5);
    }
  }

  private bird(t: number): void {
    const ctx = this.ctx!;
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 2200 + Math.random() * 1800;
    for (let i = 0; i < notes; i++) {
      const at = t + i * (0.09 + Math.random() * 0.05);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), at);
      o.frequency.exponentialRampToValueAtTime(base * (1.1 + Math.random() * 0.4), at + 0.06);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.02, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      o.connect(g).connect(this.outGain);
      o.start(at);
      o.stop(at + 0.1);
    }
  }

  private cricket(t: number): void {
    const ctx = this.ctx!;
    const f = 4300 + Math.random() * 500;
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.045;
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.008, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
      o.connect(g).connect(this.outGain);
      o.start(at);
      o.stop(at + 0.04);
    }
  }

  /** A footstep: hollow on the boards, soft on the rug, a knock on the stair. */
  step(surface: Surface): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = 0.8 + Math.random() * 0.4;
    if (surface === 'rug') this.burst(t, 0.06, 500, 'lowpass', 0.12 * v);
    else if (surface === 'stone') this.burst(t, 0.05, 1400, 'bandpass', 0.18 * v, 0.8);
    else {
      this.burst(t, 0.07, surface === 'stair' ? 260 : 380, 'bandpass', (surface === 'stair' ? 0.5 : 0.32) * v, 1.4);
      this.burst(t + 0.005, 0.03, 2500, 'highpass', 0.04 * v);
    }
  }

  /** The ninth stair: a slow creak, wood rubbing on wood. */
  creak(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(95 + Math.random() * 30, t + 0.45);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 6;
    const trem = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 32;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(trem.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f).connect(trem).connect(g).connect(this.master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.55);
    lfo.stop(t + 0.55);
  }

  /** Something set down: a cup on wood, a chair on the floor. */
  thud(heavy: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, heavy ? 0.12 : 0.05, heavy ? 180 : 900, heavy ? 'lowpass' : 'bandpass', heavy ? 0.6 : 0.25, 2);
  }

  /** A candle lit (a scratch and a soft whoosh) or put out (a puff). */
  candle(lit: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (lit) {
      this.burst(t, 0.08, 3000, 'highpass', 0.12);
      this.burst(t + 0.08, 0.3, 700, 'bandpass', 0.08, 0.6);
    } else this.burst(t, 0.15, 900, 'lowpass', 0.15);
  }

  private whistleNodes: { o: OscillatorNode; g: GainNode } | null = null;
  /** The kettle singing on the fire, until it is taken off. */
  whistle(on: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (on && !this.whistleNodes) {
      const o = ctx.createOscillator();
      o.frequency.value = 1650;
      const vib = ctx.createOscillator();
      vib.frequency.value = 6;
      const vd = ctx.createGain();
      vd.gain.value = 25;
      vib.connect(vd).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04, t + 2.5);
      o.connect(g).connect(this.master);
      o.start(t);
      vib.start(t);
      this.whistleNodes = { o, g };
    } else if (!on && this.whistleNodes) {
      const { o, g } = this.whistleNodes;
      g.gain.setTargetAtTime(0.0001, t, 0.15);
      o.stop(t + 1);
      this.whistleNodes = null;
    }
  }

  private rainGain: GainNode | null = null;
  /** Rain on the roof and the windows: 0 dry … 1 a steady shower. */
  rain(level: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.rainGain) {
      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainGain.connect(this.master);
      const n = this.loop();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = 0.18;
      n.connect(bp).connect(g).connect(this.rainGain);
      const n2 = this.loop();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 200;
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      n2.connect(lp).connect(g2).connect(this.rainGain);
    }
    this.rainGain.gain.setTargetAtTime(level, ctx.currentTime, 1.2);
    // now and then a drop falls from the eaves
    if (level > 0.3 && Math.random() < 0.04) this.burst(ctx.currentTime, 0.03, 2200 + Math.random() * 1500, 'bandpass', 0.06 * level, 4);
  }

  /** A page turned. */
  page(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.18, 2500, 'bandpass', 0.1, 0.5);
  }
}
