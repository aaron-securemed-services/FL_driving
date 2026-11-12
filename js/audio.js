// Tiny WebAudio synth: engine hum, blinker tick, horn, siren, chimes.
export class Sound {
  constructor() { this.on = true; this.ctx = null; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC(); this.master = c.createGain(); this.master.gain.value = this.on ? .5 : 0; this.master.connect(c.destination);
    this.eg = c.createGain(); this.eg.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; this.lp = lp;
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = c.createOscillator(); this.o2.type = 'square';
    this.o1.connect(lp); this.o2.connect(lp); lp.connect(this.eg); this.eg.connect(this.master); this.o1.start(); this.o2.start();
    this.hg = c.createGain(); this.hg.gain.value = 0; this.hg.connect(this.master);
    for (const f of [415, 520]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(this.hg); o.start(); }
    this.sg = c.createGain(); this.sg.gain.value = 0; this.sg.connect(this.master); this.so = c.createOscillator(); this.so.type = 'sawtooth'; this.so.connect(this.sg); this.so.start();
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? .5 : 0; }
  engine(rpm, load, active) {
    if (!this.ctx) return; const t = this.ctx.currentTime, f = 28 + rpm / 60;
    this.o1.frequency.setTargetAtTime(f, t, .05); this.o2.frequency.setTargetAtTime(f * .5, t, .05);
    this.lp.frequency.setTargetAtTime(300 + rpm * .25, t, .1); this.eg.gain.setTargetAtTime(active ? .05 + load * .06 : 0, t, .1);
  }
  horn(on) { if (this.ctx) this.hg.gain.setTargetAtTime(on ? .12 : 0, this.ctx.currentTime, .01); }
  siren(on) { if (!this.ctx) return; this.sirenOn = on; this.sg.gain.setTargetAtTime(on ? .07 : 0, this.ctx.currentTime, .1); }
  tick(t) { if (this.ctx && this.sirenOn) this.so.frequency.value = 650 + 350 * Math.sin(t * 4); }
  beep(freq, dur = .12, type = 'sine', vol = .2, when = 0) {
    if (!this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  }
  sfx(name) {
    switch (name) {
      case 'click': this.beep(900, .03, 'square', .08); break;
      case 'blink': this.beep(1400, .02, 'square', .05); break;
      case 'good': this.beep(660, .12); this.beep(990, .18, 'sine', .2, .1); break;
      case 'bad': this.beep(200, .25, 'sawtooth', .18); break;
      case 'info': this.beep(520, .06, 'sine', .1); break;
      case 'crash': this.beep(90, .6, 'sawtooth', .4); this.beep(60, .7, 'square', .3); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.beep(f, .25, 'triangle', .22, i * .13)); break;
      case 'bell': for (let i = 0; i < 16; i++) this.beep(1250, .15, 'triangle', .1, i * .45); break;
      case 'siren': this.siren(true); break; case 'sirenOff': this.siren(false); break;
      case 'horn': this.beep(440, .4, 'square', .15); break;
    }
  }
}
