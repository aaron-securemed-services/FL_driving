// Keyboard + gamepad input, merged into one state object.
const KEYS = {
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  lookL: ['KeyZ'], lookR: ['KeyC'], lookB: ['KeyV'], horn: ['KeyH'],
};
const PRESS = { KeyQ: 'blinkL', KeyE: 'blinkR', KeyX: 'hazard', KeyF: 'gearUp', KeyR: 'gearDown', KeyL: 'lights', KeyB: 'belt', Space: 'handbrake', KeyK: 'wipers', Escape: 'pause', KeyP: 'pause', Enter: 'confirm' };
// Standard gamepad mapping
const PAD_PRESS = { 4: 'blinkL', 5: 'blinkR', 0: 'gearUp', 1: 'gearDown', 3: 'lights', 12: 'wipers', 13: 'belt', 14: 'hazard', 15: 'handbrake', 9: 'pause' };

// Button names per controller family. Index = standard gamepad button position.
export const PADS = {
  ps: { name: 'PlayStation', A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', START: 'Options', confirm: 0, back: 1 },
  xbox: { name: 'Xbox', A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', START: 'Menu', confirm: 0, back: 1 },
  switch: { name: 'Switch', A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', START: '+', confirm: 1, back: 0 }, // Nintendo: A (right button) confirms
};
export function detectPad(id) {
  const s = (id || '').toLowerCase();
  if (/dualsense|dualshock|playstation|ps[345]|054c/.test(s)) return 'ps';
  if (/nintendo|switch|pro controller|joy-?con|057e/.test(s)) return 'switch';
  if (/xbox|xinput|microsoft|045e/.test(s)) return 'xbox';
  return null;
}

export class Input {
  constructor() {
    this.down = new Set(); this.queue = []; this.padPrev = []; this.usingPad = false; this.navT = 0; this.scheme = 'ps'; this.padId = null; this.onPad = null;
    this.usingTouch = false; this.onKey = null; this.touch = { steer: 0, throttle: 0, brake: 0, look: '', horn: false };
    this.state = { steer: 0, throttle: 0, brake: 0, look: '', horn: false, pressed: {} };
    addEventListener('keydown', e => {
      if (e.repeat) { if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); return; }
      this.down.add(e.code); this.usingPad = false; this.onKey?.(); if (PRESS[e.code]) this.queue.push(PRESS[e.code]);
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
    const T = this.touch; if (Math.abs(T.steer) > Math.abs(s.steer)) s.steer = T.steer; s.throttle = Math.max(s.throttle, T.throttle); s.brake = Math.max(s.brake, T.brake); if (!s.look) s.look = T.look; s.horn = s.horn || T.horn;
    s.nav = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const g of pads) if (g && g.connected && g.buttons.length >= 10) { gp = g; break; }
    this.pad = gp;
    if (gp && gp.id !== this.padId) { this.padId = gp.id; this.onPad?.(detectPad(gp.id)); }
    if (gp) {
      const b = i => gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0, dz = v => Math.abs(v) < .14 ? 0 : (v - Math.sign(v) * .14) / .86;
      const edge = i => b(i) > .5 && !(this.padPrev[i] > .5);
      const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
      if (Math.abs(ax) > .05 || b(7) > .05 || b(6) > .05 || gp.buttons.some(x => x.pressed)) this.usingPad = true;
      if (inMenu) {
        const now = performance.now(), dir = (edge(12) || (ay < -.6 && now > this.navT)) ? -1 : (edge(13) || (ay > .6 && now > this.navT)) ? 1 : (edge(14) || (ax < -.6 && now > this.navT)) ? -1 : (edge(15) || (ax > .6 && now > this.navT)) ? 1 : 0;
        if (dir) { s.nav = dir; this.navT = now + 260; }
        const P = PADS[this.scheme]; if (edge(P.confirm)) pr.confirm = true; if (edge(P.back)) pr.back = true; if (edge(9)) pr.pause = true;
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
