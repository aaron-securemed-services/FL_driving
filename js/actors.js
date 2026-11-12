// Vehicles, pedestrians and path following.
import { THREE, fwd, rgt, wrap, clamp } from './world.js';

const M = (o) => new THREE.MeshStandardMaterial(o);
const glass = new THREE.MeshPhysicalMaterial({ color: 0x0d151c, metalness: .9, roughness: .06, clearcoat: 1 });
const tire = M({ color: 0x15171a, roughness: .9 }), hub = M({ color: 0xc9ced3, metalness: .9, roughness: .25 }), black = M({ color: 0x17191c, roughness: .6 }), chrome = M({ color: 0xdfe3e6, metalness: 1, roughness: .2 });
const wheelG = new THREE.CylinderGeometry(.33, .33, .24, 20).rotateZ(Math.PI / 2), hubG = new THREE.CylinderGeometry(.19, .19, .26, 12).rotateZ(Math.PI / 2);
const paint = c => new THREE.MeshPhysicalMaterial({ color: c, metalness: .55, roughness: .32, clearcoat: 1, clearcoatRoughness: .06 });
const lampMat = (c) => M({ color: 0x222222, emissive: c, emissiveIntensity: 0, roughness: .3 });
export const CAR_COLORS = [0x2f6fd6, 0xe9e9ec, 0x1c1e22, 0x8a8f96, 0x1f8f5a, 0xe2a400, 0x7a1f8a, 0xc0392b, 0x3ab0c9];

function profile(pts, width, bevel = .06) {
  const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.rotateY(-Math.PI / 2); return g;
}
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; }
const bx = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);

export function makeCar(type = 'sedan', color = 0xc0392b) {
  const g = new THREE.Group(), u = g.userData = { type, wheels: [], pivots: [], L: 4.4, W: 1.84, bar: [] };
  const body = new THREE.Group(); g.add(body); u.body = body;
  u.brake = lampMat(0xff0000); u.bl = lampMat(0xffa200); u.br = lampMat(0xffa200); u.head = lampMat(0xfff4d6);
  u.brake.color.set(0x5a0a0a); u.head.color.set(0xdddddd);
  let wx = .84, wz = 1.36, hw = .92, hl = 2.2, hy = .64;
  const lightbar = (y, z, w = 1.1) => { for (const s of [1, -1]) { const m = lampMat(s > 0 ? 0xff1010 : 0x1040ff); m.color.set(s > 0 ? 0x661111 : 0x111a66); body.add(bx(w / 2, .14, .28, m, s * w / 4, y, z)); u.bar.push(m); } };
  if (type === 'sedan' || type === 'police' || type === 'suv') {
    const suv = type === 'suv', pm = paint(type === 'police' ? 0x101214 : color);
    const k = suv ? 1.18 : 1;
    body.add(mesh(profile([[-2.15, .32], [2.1, .32], [2.2, .5], [2.17, .72 * k], [1.05, .9 * k], [suv ? -2.1 : -1.55, .92 * k], [-2.15, .86 * k], [-2.2, .55]], 1.84), pm));
    body.add(mesh(profile(suv ? [[-2.05, 1.05], [.95, 1.05], [.3, 1.68], [-1.95, 1.68]] : [[-1.75, .9], [.95, .9], [.22, 1.38], [-1.05, 1.38]], 1.58, .05), glass));
    const roof = bx(1.42, .05, suv ? 2.1 : 1.15, type === 'police' ? paint(0xf2f2f2) : pm, 0, suv ? 1.725 : 1.425, suv ? -.85 : -.42); body.add(roof);
    if (type === 'police') { body.add(bx(1.86, .5, 1.5, paint(0xf2f2f2), 0, .62, -.35)); lightbar(1.52, -.4); }
    if (suv) { u.H = 1.75; hy = .74; }
  } else if (type === 'truck' || type === 'ambulance') {
    const amb = type === 'ambulance', pm = paint(amb ? 0xf4f4f4 : color), boxm = amb ? pm : M({ color: 0xe8e8e8, roughness: .7 });
    u.L = amb ? 6 : 7.6; u.W = 2.3; wx = 1.02; hw = 1.05;
    const half = u.L / 2; wz = half - 1.2; hl = half; hy = .8;
    body.add(bx(2.2, 1.5, 1.9, pm, 0, 1.15, half - .95)); body.add(bx(2.0, .7, .1, glass, 0, 1.55, half + .01)); body.add(bx(2.22, .55, .9, glass, 0, 1.55, half - 1.0));
    body.add(bx(2.3, amb ? 2.1 : 2.6, u.L - 2.0, boxm, 0, amb ? 1.5 : 1.75, -1.0)); body.add(bx(2.2, .3, u.L - .2, black, 0, .45, 0));
    if (amb) { body.add(bx(2.32, .3, u.L - 2.0, M({ color: 0xd4141e, roughness: .5 }), 0, 1.3, -1.0)); lightbar(2.62, half - 1.4, 1.6); lightbar(2.62, -half + .3, 1.6); }
  } else if (type === 'bus') {
    u.L = 10.5; u.W = 2.5; wx = 1.1; wz = 3.6; hw = 1.1; hl = 5.25; hy = .9;
    const ym = M({ color: 0xffb800, roughness: .5 });
    body.add(bx(2.5, 2.4, 8.8, ym, 0, 1.65, -.85)); body.add(bx(2.3, 1.2, 1.7, ym, 0, 1.05, 4.4)); body.add(bx(2.52, .7, 8.2, glass, 0, 2.15, -.85)); body.add(bx(2.2, .8, .1, glass, 0, 2.1, 3.56));
    for (const y of [1.0, 1.45]) body.add(bx(2.53, .08, 8.8, black, 0, y, -.85)); body.add(bx(2.4, .3, 10.3, black, 0, .5, 0));
    const arm = new THREE.Group(); arm.position.set(1.27, 1.7, 2.4); body.add(arm); u.arm = arm;
    const oct = mesh(new THREE.CylinderGeometry(.42, .42, .05, 8).rotateX(Math.PI / 2).rotateZ(Math.PI / 8), M({ color: 0xd4141e, roughness: .5, emissive: 0xff0000, emissiveIntensity: 0 }), .5, 0, 0); arm.add(oct); arm.add(bx(.5, .06, .06, black, .2, 0, 0));
    arm.rotation.y = Math.PI / 2; u.armMat = oct.material;
    for (const z of [5.2, -5.2]) for (const s of [1, -1]) { const m = lampMat(0xff0000); m.color.set(0x661111); body.add(bx(.3, .3, .1, m, s * .85, 2.7, z > 0 ? 3.56 : z)); u.bar.push(m); }
  }
  u.H = u.H || (type === 'bus' ? 2.9 : type === 'truck' ? 3.1 : type === 'ambulance' ? 2.6 : 1.45);
  for (const s of [1, -1]) {
    body.add(bx(.36, .12, .06, u.head, s * (hw - .28), hy, hl + .01)); body.add(bx(.4, .12, .06, u.brake, s * (hw - .28), hy + .1, -hl - .01));
    for (const zz of [hl - .02, -hl + .02]) body.add(bx(.16, .1, .12, s > 0 ? u.bl : u.br, s * (hw - .02), hy, zz)); // +x is the car's LEFT
    for (const zz of [wz, -wz]) {
      const p = new THREE.Group(); p.position.set(s * wx, .33, zz); const w = new THREE.Group(); p.add(w);
      const sc = u.L > 5 ? 1.35 : 1; w.add(mesh(wheelG, tire), mesh(hubG, hub)); w.scale.set(1, sc, sc); p.position.y = .33 * sc;
      g.add(p); u.wheels.push(w); if (zz > 0) u.pivots.push(p);
    }
  }
  body.add(bx(hw * 1.6, .12, .08, chrome, 0, hy - .2, hl + .02));
  return g;
}
export function setCarLights(g, o, t) {
  const u = g.userData, blink = (t * 1.5) % 1 < .5; if (!u.brake) return;
  u.brake.emissiveIntensity = o.brake ? 5 : (o.head ? 1.2 : 0);
  u.head.emissiveIntensity = o.head ? 5 : 0;
  u.bl.emissiveIntensity = (o.blinker === 'L' || o.hazard) && blink ? 6 : 0;
  u.br.emissiveIntensity = (o.blinker === 'R' || o.hazard) && blink ? 6 : 0;
  if (u.bar.length) { const ph = Math.floor(t * 5) % 2; u.bar.forEach((m, i) => m.emissiveIntensity = o.flash && (i % 2 === ph) ? 8 : 0); }
}

export function makeCockpit(color) {
  const g = new THREE.Group(), pm = paint(color), dash = M({ color: 0x1a1c20, roughness: .85 }), trim = M({ color: 0x24272c, roughness: .7 });
  const add = (o) => { o.castShadow = false; g.add(o); return o; };
  const hood = add(bx(1.8, .1, 1.35, pm, 0, .9, 1.62)); hood.rotation.x = .06;
  add(bx(1.8, .28, .5, dash, 0, .93, .82));                    // dashboard
  add(bx(.5, .12, .25, dash, .37, 1.07, .86));                 // instrument hood
  for (const s of [1, -1]) {
    const p = add(bx(.04, .8, .05, trim, s * .93, 1.3, .8)); p.rotation.x = -.62; p.rotation.z = s * .08;  // A pillar
    add(bx(.1, .78, 3.2, trim, s * .93, .62, -.5));              // doors below the window line
    add(bx(.09, .55, .16, trim, s * .9, 1.27, -.42));            // B pillar
    add(bx(.09, .6, .3, trim, s * .88, 1.27, -1.62));            // C pillar
    add(bx(.22, .14, .1, trim, s * 1.02, 1.03, .7));             // door mirror housing
  }
  add(bx(1.85, .06, 2.4, trim, 0, 1.56, -.6));                 // roof
  add(bx(1.8, .1, .9, pm, 0, .96, -1.95));                     // trunk lid
  add(bx(1.7, .5, .2, dash, 0, .8, -1.15));                    // rear seat back
  add(bx(.5, .7, .16, dash, -.37, .95, -.28));                 // passenger seat back
  const wheel = new THREE.Group(); wheel.position.set(.37, .98, .5); wheel.rotation.x = -.45; g.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(.17, .022, 8, 28), M({ color: 0x0d0e10, roughness: .5 })));
  wheel.add(bx(.3, .04, .02, trim, 0, 0, 0)); wheel.add(bx(.04, .16, .02, trim, 0, -.08, 0));
  g.userData.wheel = wheel;
  g.userData.wipers = [-.25, .45].map(x => { const p = new THREE.Group(); p.position.set(x, 1.0, 1.02); p.rotation.x = -.62; const b = bx(.55, .015, .02, black, -.27, 0, 0); b.castShadow = false; p.add(b); g.add(p); return p; });
  return g;
}

const SKIN = [0xf1c9a5, 0xd9a577, 0x8d5a3b, 0x5e3b28], SHIRT = [0x2f6fd6, 0xd43c3c, 0xf2c200, 0x2d9d5a, 0xf2f2f2, 0x8a4fd6, 0xff7a1a];
export function makePed(o = {}) {
  const g = new THREE.Group(), R = Math.random, body = new THREE.Group(); g.add(body);
  const skin = M({ color: o.skin ?? SKIN[Math.floor(R() * 4)], roughness: .8 }), shirt = M({ color: o.shirt ?? SHIRT[Math.floor(R() * SHIRT.length)], roughness: .8 }), pants = M({ color: o.pants ?? 0x2b3350, roughness: .9 });
  body.add(mesh(new THREE.CapsuleGeometry(.19, .42, 4, 10), shirt, 0, 1.15, 0)); body.add(mesh(new THREE.SphereGeometry(.13, 12, 10), skin, 0, 1.63, 0));
  const limb = (w, h, m, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); p.add(mesh(new THREE.BoxGeometry(w, h, w * 1.1), m, 0, -h / 2, 0)); body.add(p); return p; };
  const u = g.userData = { legL: limb(.13, .8, pants, .1, .82), legR: limb(.13, .8, pants, -.1, .82), armL: limb(.09, .6, skin, .27, 1.42), armR: limb(.09, .6, skin, -.27, 1.42), ph: R() * 6 };
  if (o.cane) { const c = mesh(new THREE.CylinderGeometry(.012, .012, 1.3, 5), M({ color: 0xffffff, roughness: .4 }), 0, -.75, .35); c.rotation.x = -.7; u.armR.add(c); const tip = mesh(new THREE.CylinderGeometry(.014, .014, .18, 5), M({ color: 0xd4141e }), 0, -.6, 0); c.add(tip); u.armR.rotation.x = -.35; u.cane = true; }
  if (o.vest) body.add(mesh(new THREE.CapsuleGeometry(.2, .3, 4, 10), M({ color: 0xc9ff1f, emissive: 0x556600, roughness: .6 }), 0, 1.2, 0));
  if (o.hat) body.add(mesh(new THREE.SphereGeometry(.15, 10, 6, 0, 7, 0, 1.5), M({ color: o.hat }), 0, 1.68, 0));
  g.scale.setScalar(o.scale || 1); return g;
}
export function makeBike() {
  const g = new THREE.Group(), fm = M({ color: 0x1565c0, metalness: .6, roughness: .4 });
  const wg = new THREE.TorusGeometry(.33, .03, 6, 18).rotateY(Math.PI / 2);
  g.add(mesh(wg, tire, 0, .36, .52), mesh(wg, tire, 0, .36, -.52), bx(.05, .05, 1.0, fm, 0, .62, 0), bx(.05, .5, .05, fm, 0, .75, -.2), bx(.4, .04, .04, fm, 0, .98, .45), bx(.05, .45, .05, fm, 0, .78, .45));
  const p = makePed({ shirt: 0xff5a1f, hat: 0xffffff }); p.position.set(0, .22, -.2); p.userData.armL.rotation.x = p.userData.armR.rotation.x = -1.1; p.rotation.x = .25; g.add(p);
  g.userData = { L: 1.8, W: .6, type: 'bike', rider: p, wheels: [], pivots: [], bar: [] }; return g;
}

// ---------- paths ----------
// spec: [{x,z, stop?, sig?, wait?, allway?, speed?, blink?, call?}, ...]; corners are rounded automatically.
export function buildPath(spec, r = 6, loop = false) {
  const pts = [], holds = [], push = (x, z) => { const l = pts[pts.length - 1]; if (!l || Math.hypot(l.x - x, l.z - z) > 1e-4) pts.push({ x, z }); };
  const mark = [];
  for (let i = 0; i < spec.length; i++) {
    const p = spec[i], a = spec[i - 1], b = spec[i + 1], ev = Object.keys(p).some(k => k !== 'x' && k !== 'z');
    if (!a || !b || ev) { push(p.x, p.z); if (ev) mark.push([pts.length - 1, p]); continue; }
    let d1x = p.x - a.x, d1z = p.z - a.z, d2x = b.x - p.x, d2z = b.z - p.z; const l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
    d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2; const dot = clamp(d1x * d2x + d1z * d2z, -1, 1), ang = Math.acos(dot);
    if (ang < .09) { push(p.x, p.z); continue; }
    const c = Math.min(r * Math.tan(ang / 2), l1 * .48, l2 * .48), s0 = [p.x - d1x * c, p.z - d1z * c], s1 = [p.x + d2x * c, p.z + d2z * c];
    for (let k = 0; k <= 8; k++) { const t = k / 8, u = 1 - t; push(u * u * s0[0] + 2 * u * t * p.x + t * t * s1[0], u * u * s0[1] + 2 * u * t * p.z + t * t * s1[1]); }
  }
  let s = 0; pts.forEach((p, i) => { if (i) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.s = s; });
  pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)]; p.h = Math.atan2((i < pts.length - 1 ? q.x - p.x : p.x - o.x), (i < pts.length - 1 ? q.z - p.z : p.z - o.z)); });
  for (const [i, p] of mark) holds.push({ ...p, s: pts[i].s, done: false });
  return { pts, len: s, holds, loop };
}
export function pathAt(path, s, hint = 0) {
  const P = path.pts; let i = clamp(hint, 0, P.length - 2);
  while (i < P.length - 2 && P[i + 1].s < s) i++; while (i > 0 && P[i].s > s) i--;
  const a = P[i], b = P[i + 1], t = clamp((s - a.s) / Math.max(b.s - a.s, 1e-6), 0, 1);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, h: a.h, i };
}
export function circlesOf(e) { // collision circles
  if (e.r) return [[e.x, e.z, e.r]];
  const n = Math.max(2, Math.ceil(e.L / 1.7)), [fx, fz] = fwd(e.h), r = e.W / 2, out = [], span = e.L - 2 * r;
  for (let i = 0; i < n; i++) { const d = -span / 2 + span * i / (n - 1); out.push([e.x + fx * d, e.z + fz * d, r]); }
  return out;
}

export class Npc {
  constructor(type, color, spec, o = {}) {
    this.model = type === 'bike' ? makeBike() : makeCar(type, color); const u = this.model.userData;
    this.type = type; this.L = u.L; this.W = u.W; this.isCar = true; this.o = o;
    this.static = !spec || spec.length < 2;
    this.x = spec?.[0]?.x ?? o.x ?? 0; this.z = spec?.[0]?.z ?? o.z ?? 0; this.h = o.h ?? 0; this.v = 0; this.s = o.s0 || 0;
    if (!this.static) { this.path = buildPath(spec, o.r ?? 6, o.loop); this.cruise = o.speed ?? 12; this.v = o.v0 ?? this.cruise; }
    this.accel = o.accel ?? 2.5; this.priority = !!o.priority; this.blinker = o.blinker || ''; this.hazard = !!o.hazard; this.flash = !!o.flash; this.head = !!o.head;
    this.braking = false; this.holdT = 0; this.armOut = false; this.armA = 0; this.hi = 0; this.frozen = !!o.frozen; this.blockedBy = null; this.gone = false; this.ghost = false;
    this.place();
  }
  place() {
    if (!this.static) { const p = pathAt(this.path, this.s, this.hi); this.hi = p.i; this.x = p.x; this.z = p.z; const dh = wrap(p.h - this.h); this.h = Math.abs(dh) > 2 ? p.h : this.h + dh * .25; }
    this.model.position.set(this.x, 0, this.z); this.model.rotation.y = this.h; this.model.visible = !this.gone;
  }
  snapHeading() { if (!this.static) this.h = pathAt(this.path, this.s, this.hi).h; this.place(); }
  update(dt, sess) {
    const u = this.model.userData, t = sess.t;
    if (u.arm) { this.armA += clamp((this.armOut ? 1 : 0) - this.armA, -dt * 1.5, dt * 1.5); u.arm.rotation.y = Math.PI / 2 * (1 - this.armA); u.armMat.emissiveIntensity = this.armOut && (t * 2) % 1 < .5 ? 2 : 0; }
    setCarLights(this.model, { brake: this.braking || (!this.static && this.v < .2), blinker: this.blinker, hazard: this.hazard, head: this.head || sess.world.env.time === 'night' || sess.world.env.rain, flash: this.flash || this.armOut }, t);
    if (this.static || this.gone || this.frozen) { this.braking = false; this.place(); return; }
    let target = this.cruise, decel = this.decel ?? 3;
    // holds (stop signs, signals, scripted waits)
    for (const hd of this.path.holds) {
      if (hd.done) continue; const ds = hd.s - this.s;
      const instant = hd.stop === undefined && !hd.sig && !hd.wait && !hd.allway;
      if (instant) { if (ds <= 0) { hd.done = true; if (hd.speed !== undefined) this.cruise = hd.speed; if (hd.blink !== undefined) this.blinker = hd.blink; hd.call?.(this); } continue; }
      if (ds > 80) break;
      let active = true;
      if (hd.sig) {
        const st = hd.sig.state;
        if (st === 'green' || st === 'flash-yellow' || (st === 'yellow' && ds < this.v * 1.5)) { active = false; if (ds < .5) hd.done = true; }
        else if ((st === 'flash-red' || st === 'off') && this.v < .1 && ds < 1.5 && (this.holdT += dt) > 2 && (!hd.wait || hd.wait(this))) { hd.done = true; this.holdT = 0; }
      }
      else if (hd.allway) { if (this.v < .1 && ds < 1.5) { hd.allway.arrive(this); this.holdT += dt; if (this.holdT > 1.2 && hd.allway.canGo(this)) { hd.done = true; this.holdT = 0; } } }
      else if (hd.wait) { if (hd.wait(this)) { hd.done = true; hd.call?.(this); } }
      else if (hd.stop !== undefined) { if (this.v < .1 && ds < 1.5) { this.holdT += dt; if (this.holdT > hd.stop) { hd.done = true; this.holdT = 0; hd.call?.(this); } } }
      if (hd.done || !active) continue;
      target = Math.min(target, ds < .4 ? 0 : Math.sqrt(2 * 2.6 * Math.max(ds - .3, 0))); break;
    }
    // obstacle sensing
    this.blockedBy = null;
    if (!this.ghost) {
      const [fx, fz] = fwd(this.h), [rx, rz] = rgt(this.h), look = this.v * this.v / 9 + this.v * .7 + 3.5;
      for (const e of sess.entities) {
        if (e === this || e.gone) continue;
        for (const c of circlesOf(e)) {
          const dx = c[0] - this.x, dz = c[1] - this.z, f = dx * fx + dz * fz - this.L / 2 - c[2], lat = Math.abs(dx * rx + dz * rz);
          if (f > -this.L * .4 && f < look && lat < this.W / 2 + c[2] + .25) {
            const along = e.isCar || e === sess.player ? Math.max(0, (e.v || 0) * Math.cos(wrap((e.h || 0) - this.h))) : 0;
            const vt = f > 4 ? along : 0; if (vt < target) { target = vt; decel = f < look * .6 ? 7.5 : 4; this.blockedBy = e; this.blockF = f; }
          }
        }
      }
    }
    const dv = target - this.v; this.braking = dv < -.3;
    this.v += clamp(dv, -decel * dt, this.accel * dt); if (this.v < 0) this.v = 0;
    this.s += this.v * dt;
    if (this.s >= this.path.len) { if (this.path.loop) { this.s -= this.path.len; this.hi = 0; for (const h of this.path.holds) h.done = false; this.place(); this.snapHeading(); } else { this.s = this.path.len; this.v = 0; if (this.o.despawn !== false) this.gone = true; } }
    this.place();
    for (const w of u.wheels) w.rotation.x += this.v * dt / .33;
    if (u.rider) { const a = sess.t * this.v * 1.2; u.rider.userData.legL.rotation.x = -1 + Math.sin(a) * .5; u.rider.userData.legR.rotation.x = -1 - Math.sin(a) * .5; }
  }
}

export class Ped {
  constructor(spec, o = {}) {
    this.model = makePed(o); this.r = .35 * (o.scale || 1); this.isPed = true; this.o = o;
    this.path = buildPath(spec, .5, o.loop); this.speed = o.speed ?? 1.35; this.s = 0; this.v = 0; this.hi = 0; this.h = this.path.pts[0].h; this.gone = false; this.frozen = false;
    this.x = spec[0].x; this.z = spec[0].z; this.place();
  }
  place() { const p = pathAt(this.path, this.s, this.hi); this.hi = p.i; this.x = p.x; this.z = p.z; if (this.v > .05) this.h += wrap(p.h - this.h) * .3; this.model.position.set(this.x, this.o.y || 0, this.z); this.model.rotation.y = this.h; this.model.visible = !this.gone; }
  update(dt, sess) {
    if (this.gone) return; let target = this.frozen ? 0 : this.speed;
    for (const hd of this.path.holds) {
      if (hd.done) continue; const ds = hd.s - this.s;
      if (hd.wait || hd.stop !== undefined) {
        if (ds < .15) { if (hd.wait ? hd.wait(this) : (this.holdT = (this.holdT || 0) + dt) > hd.stop) { hd.done = true; this.holdT = 0; hd.call?.(this); } else target = 0; }
      } else if (ds <= 0) { hd.done = true; if (hd.speed !== undefined) this.speed = hd.speed; hd.call?.(this); }
      if (!hd.done) break;
    }
    this.v = target; this.s += this.v * dt;
    if (this.s >= this.path.len) { if (this.path.loop) { this.s = 0; this.hi = 0; for (const h of this.path.holds) h.done = false; } else { this.s = this.path.len; this.v = 0; if (this.o.despawn) this.gone = true; } }
    this.place();
    const u = this.model.userData, a = sess.t * 6 * (this.speed / 1.35) + u.ph, sw = this.v > .05 ? .6 : 0;
    u.legL.rotation.x = Math.sin(a) * sw; u.legR.rotation.x = -Math.sin(a) * sw; u.armL.rotation.x = -Math.sin(a) * sw * .7; if (!u.cane) u.armR.rotation.x = Math.sin(a) * sw * .7; else u.armR.rotation.y = Math.sin(a * .5) * .35;
  }
}

// ---------- player ----------
export class Player {
  constructor(o = {}) {
    this.color = o.color || 0xd42a2a; this.model = makeCar('sedan', this.color); this.cockpit = makeCockpit(this.color); this.cockpit.visible = false; this.model.add(this.cockpit);
    this.L = 4.4; this.W = 1.84; this.isCar = true; this.x = 0; this.z = 0; this.h = 0; this.v = 0; this.acc = 0; this.steer = 0; this.delta = 0;
    this.manual = !!o.manual; this.gears = this.manual ? ['R', 'N', '1', '2', '3', '4', '5'] : ['P', 'R', 'N', 'D']; this.gi = this.manual ? 2 : 3;
    this.lights = 0; this.blinker = ''; this.hazard = false; this.belt = true; this.handbrake = false; this.wipers = false; this.horn = false; this.rpm = 800;
    this.lookAng = 0; this.look = ''; this.lookT = { L: -99, R: -99, B: -99 }; this.blinkH = 0; this.blinkArmed = false; this.wipeA = 0; this.grip = 1; this.slopeAcc = 0;
    this.spot = new THREE.SpotLight(0xfff1d0, 0, 90, .5, .7, 1.2); this.spot.position.set(0, .8, 1.9); this.spot.target.position.set(0, -.2, 30); this.model.add(this.spot, this.spot.target);
  }
  get gear() { return this.gears[this.gi]; }
  setGear(g) { const i = this.gears.indexOf(g); if (i >= 0) this.gi = i; }
  shift(d, brake) {
    const ni = this.gi + d; if (ni < 0 || ni >= this.gears.length) return null;
    const cur = this.gear, nxt = this.gears[ni], sp = Math.abs(this.v);
    if (!this.manual) {
      if (cur === 'P' && brake < .3) return 'Hold the BRAKE to shift out of Park.';
      if (nxt === 'P' && sp > .5) return 'Come to a complete stop before shifting to Park.';
      if (nxt === 'R' && this.v > 1) return 'Stop before shifting into Reverse.';
      if (nxt === 'D' && this.v < -1) return 'Stop before shifting into Drive.';
    } else if (nxt === 'R' && sp > 1) return 'Stop before shifting into Reverse.';
    this.gi = ni; return null;
  }
  setBlinker(b) { this.blinker = this.blinker === b ? '' : b; this.blinkH = this.h; this.blinkArmed = false; }
  place(x, z, h) { this.x = x; this.z = z; this.h = h; this.v = 0; this.steer = 0; this.sync(0); }
  update(dt, inp, t) {
    const thr = inp.throttle, brk = inp.brake, g = this.gear, sp = Math.abs(this.v); let a = 0;
    if (!this.manual) {
      if (g === 'D') { a = thr * 3.7 * Math.max(0, 1 - this.v / 46); if (thr < .05 && this.v < 1.6) a += .9; this.rpm = 800 + Math.min(1, sp / 46) * 3000 + thr * 1800; }
      else if (g === 'R') { a = -thr * 2.6 * Math.max(0, 1 + this.v / 9); if (thr < .05 && this.v > -1.2) a -= .8; this.rpm = 800 + thr * 1500 + sp * 150; }
      else this.rpm = 800 + thr * 3500;
    } else if (g === 'R') { a = -thr * 2.6 * Math.max(0, 1 + this.v / 8); this.rpm = 900 + sp / 8 * 4000; }
    else if (g !== 'N') {
      const n = +g, top = [0, 7.5, 14, 22, 31, 44][n], base = [0, 4.3, 3.1, 2.3, 1.7, 1.2][n], r = Math.max(0, this.v) / top;
      const tq = r < .15 ? .4 + r / .15 * .45 : r < .8 ? .85 + (r - .15) / .65 * .15 : Math.max(0, 1 - (r - .8) / .2);
      a = thr * base * tq; if (n === 1 && thr < .05 && this.v < 1.2) a += .5; if (thr < .05) a -= .35 * r; this.rpm = 900 + Math.min(r, 1.05) * 5600;
    } else this.rpm = 900 + thr * 4000;
    a += this.slopeAcc;
    const locked = g === 'P';
    const resist = brk * 9.2 * this.grip + (this.handbrake ? 6 : 0) + (locked ? 30 : 0) + .12 + .012 * sp + .0004 * sp * sp;
    let v1 = this.v + a * dt;
    if (v1 > 0) v1 = Math.max(0, v1 - resist * dt); else if (v1 < 0) v1 = Math.min(0, v1 + resist * dt);
    if (Math.abs(a) <= resist && Math.abs(v1) < .02) v1 = 0;
    this.acc = (v1 - this.v) / Math.max(dt, 1e-4); this.v = v1;
    // steering
    const target = -inp.steer, rate = (target === 0 ? (sp < .3 ? 0 : 2.2 + sp * .12) : 2.4) * dt;
    this.steer += clamp(target - this.steer, -rate, rate);
    this.delta = this.steer * .6 / (1 + (sp / 8) * (sp / 8));
    let [fx, fz] = fwd(this.h); const rx = this.x - fx * 1.35 + fx * this.v * dt, rz = this.z - fz * 1.35 + fz * this.v * dt;
    this.h = wrap(this.h + this.v * Math.tan(this.delta) / 2.7 * dt); [fx, fz] = fwd(this.h); this.x = rx + fx * 1.35; this.z = rz + fz * 1.35;
    // signals and looking
    if (this.blinker) { if (Math.abs(wrap(this.h - this.blinkH)) > .9) this.blinkArmed = true; if (this.blinkArmed && Math.abs(this.steer) < .12) this.blinker = ''; }
    this.look = inp.look; const la = { L: 1.75, R: -1.75, B: -2.75 }[inp.look] || 0;
    this.lookAng += (la - this.lookAng) * Math.min(1, dt * 9); if (inp.look && Math.abs(la - this.lookAng) < .5) this.lookT[inp.look] = t;
    this.horn = inp.horn; this.braking = brk > .05;
    this.sync(dt, t);
  }
  sync(dt, t = 0) {
    const u = this.model.userData; this.model.position.set(this.x, 0, this.z); this.model.rotation.y = this.h;
    for (const w of u.wheels) w.rotation.x += this.v * dt / .33; for (const p of u.pivots) p.rotation.y = this.delta;
    setCarLights(this.model, { brake: this.braking, blinker: this.blinker, hazard: this.hazard, head: this.lights > 0 }, t);
    this.spot.intensity = this.lights ? (this.lights === 2 ? 2600 : 1100) : 0; this.spot.distance = this.lights === 2 ? 170 : 75; this.spot.target.position.y = this.lights === 2 ? .6 : -.6;
    this.cockpit.userData.wheel.rotation.z = -this.steer * 7.5;
    this.wipeA = this.wipers ? (Math.sin(t * 5) * .5 + .5) : this.wipeA * .9; for (const w of this.cockpit.userData.wipers) w.rotation.z = -this.wipeA * 1.7;
  }
}
