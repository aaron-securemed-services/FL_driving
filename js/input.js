// Keyboard + gamepad input, merged into one state object.
const KEYS = {
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  lookL: ['KeyZ'], lookR: ['KeyC'], lookB: ['KeyV'], horn: ['KeyH'],
};
const PRESS = { KeyQ: 'blinkL', KeyE: 'blinkR', KeyX: 'hazard', KeyF: 'gearUp', KeyR: 'gearDown', KeyL: 'lights', KeyB: 'belt', Space: 'handbrake', KeyK: 'wipers', Escape: 'pause', KeyP: 'pause', Enter: 'confirm' };
// Standard gamepad mapping
const PAD_PRESS = { 4: 'blinkL', 5: 'blinkR', 0: 'gearUp', 1: 'gearDown', 3: 'lights', 12: 'wipers', 13: 'belt', 14: 'hazard', 15: 'handbrake', 9: 'pause' };

export class Input {
  constructor() {
    this.down = new Set(); this.queue = []; this.padPrev = []; this.usingPad = false; this.navT = 0;
    this.state = { steer: 0, throttle: 0, brake: 0, look: '', horn: false, pressed: {} };
    addEventListener('keydown', e => {
      if (e.repeat) { if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); return; }
      this.down.add(e.code); this.usingPad = false; if (PRESS[e.code]) this.queue.push(PRESS[e.code]);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
  }
  any(list) { return list.some(k => this.down.has(k)); }
  poll(inMenu) {
    const s = this.state, pr = s.pressed = {}; for (const q of this.queue) pr[q] = true; this.queue.length = 0;
    s.throttle = this.any(KEYS.throttle) ? 1 : 0; s.brake = this.any(KEYS.brake) ? 1 : 0;
    s.steer = (this.any(KEYS.right) ? 1 : 0) - (this.any(KEYS.left) ? 1 : 0);
    const L = this.any(KEYS.lookL), R = this.any(KEYS.lookR);
    s.look = this.any(KEYS.lookB) || (L && R) ? 'B' : L ? 'L' : R ? 'R' : ''; s.horn = this.any(KEYS.horn);
    s.nav = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const g of pads) if (g && g.connected && g.buttons.length >= 10) { gp = g; break; }
    this.pad = gp;
    if (gp) {
      const b = i => gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0, dz = v => Math.abs(v) < .14 ? 0 : (v - Math.sign(v) * .14) / .86;
      const edge = i => b(i) > .5 && !(this.padPrev[i] > .5);
      const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
      if (Math.abs(ax) > .05 || b(7) > .05 || b(6) > .05 || gp.buttons.some(x => x.pressed)) this.usingPad = true;
      if (inMenu) {
        const now = performance.now(), dir = (edge(12) || (ay < -.6 && now > this.navT)) ? -1 : (edge(13) || (ay > .6 && now > this.navT)) ? 1 : (edge(14) || (ax < -.6 && now > this.navT)) ? -1 : (edge(15) || (ax > .6 && now > this.navT)) ? 1 : 0;
        if (dir) { s.nav = dir; this.navT = now + 260; }
        if (edge(0)) pr.confirm = true; if (edge(1)) pr.back = true; if (edge(9)) pr.pause = true;
      } else {
        if (Math.abs(ax) > Math.abs(s.steer)) s.steer = Math.sign(ax) * Math.pow(Math.abs(ax), 1.5);
        s.throttle = Math.max(s.throttle, b(7)); s.brake = Math.max(s.brake, b(6));
        if (!s.look) s.look = ry > .6 || b(11) > .5 ? 'B' : rx < -.5 ? 'L' : rx > .5 ? 'R' : '';
        s.horn = s.horn || b(2) > .5;
        for (const i in PAD_PRESS) if (edge(+i)) pr[PAD_PRESS[i]] = true;
      }
      this.padPrev = gp.buttons.map(x => x.value || (x.pressed ? 1 : 0));
    }
    return s;
  }
}
