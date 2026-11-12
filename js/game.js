// Session: one running lesson — actors, the Florida rules engine, scoring and the lesson-building API.
import { THREE, World, LW, MPH, N, S, E, W, fwd, rgt, wrap, clamp } from './world.js';
import { Player, Npc, Ped, buildPath, pathAt, circlesOf, CAR_COLORS } from './actors.js';

class AllWay {
  constructor(pad) { this.pad = pad; this.queue = []; this.entered = false; this.pIn = false; }
  arrive(e) { if (!this.queue.includes(e)) this.queue.push(e); }
  inPad(e) { const p = this.pad; return e.x > p.x0 && e.x < p.x1 && e.z > p.z0 && e.z < p.z1; }
  canGo(e) { return this.queue[0] === e; }
  update() { const q = this.queue[0]; if (!q) return; if (this.inPad(q)) this.entered = true; else if (this.entered || q.gone) { this.queue.shift(); this.entered = false; } }
}

export class Session {
  constructor(renderer, lesson, opts, ui) {
    this.lesson = lesson; this.mode = lesson.mode; this.fp = lesson.mode === 'fp'; this.ui = ui; this.opts = opts;
    this.world = new World(renderer, this.mode);
    this.player = new Player({ manual: opts.manual }); this.world.add(this.player.model);
    this.npcs = []; this.peds = []; this.obstacles = []; this.entities = [this.player];
    this.lines = []; this.xwalks = []; this.allways = []; this.tips = []; this.updaters = []; this.timers = [];
    this.t = 0; this.score = 100; this.violations = []; this.cool = {}; this.state = 'run'; this.goalObj = null; this.praises = 0;
    this.gapMin = 1.2; this.showGap = false; this.gapS = null; this.limit = 30; this.offT = 0; this.lostT = 0; this.spdT = 0; this.wrongT = 0; this.tailT = 0; this.lightT = 0; this.revT = 0;
    this.R = Math.random; this.ci = 0; this.manual = !!opts.manual;
    this.txt = { drive: this.manual ? '1st gear (F)' : 'Drive (F until D)', park: this.manual ? 'Neutral and set the parking brake (Space)' : 'Park (R until P)' };
    lesson.build(this);
    this.world.finish();
    if (this.goalObj) this.world.add(this.goalObj.mesh);
    this.px = this.player.x; this.pz = this.player.z; this.ph = this.player.h;
  }

  // ---------- lesson-building API ----------
  env(e) { this.world.setEnv(e); }
  start(x, z, h, o = {}) {
    const p = this.player; p.place(x, z, h);
    if (o.parked) { p.setGear(this.manual ? 'N' : 'P'); p.handbrake = true; } else p.setGear(this.manual ? '1' : 'D');
    if (o.belt === false) p.belt = false;
  }
  color() { return CAR_COLORS[(this.ci++ * 4 + 1) % CAR_COLORS.length]; }
  npc(type, spec, o = {}) { const n = new Npc(type, o.color ?? this.color(), spec, o); if (!n.static) n.snapHeading(); this.world.add(n.model); this.npcs.push(n); this.entities.push(n); return n; }
  traffic(spec, o = {}) { const types = ['sedan', 'sedan', 'suv']; return this.npc(o.type || types[this.ci % 3], spec, o); }
  parked(x, z, h, type = 'sedan', o = {}) { return this.npc(o.type || type, null, { x, z, h, ...o }); }
  ped(spec, o = {}) { const p = new Ped(spec, o); this.world.add(p.model); this.peds.push(p); this.entities.push(p); return p; }
  cone(x, z) {
    const m = new THREE.Mesh(Session.coneG, this.world.mat.cone); m.position.set(x, .35, z); m.castShadow = true; this.world.add(m);
    const o = { x, z, r: .22, cone: true, mesh: m }; this.obstacles.push(o); return o;
  }
  allway(pad) { const m = new AllWay(pad); this.allways.push(m); return m; }
  stopLine(x, z, h, w, type, o = {}) {
    if (o.draw !== false) this.world.stopBar(x, z, h, w);
    const ln = { x, z, h, w, type, ...o, ap: false, minV: Infinity, stopped: false }; this.lines.push(ln); return ln;
  }
  holdLine(x, z, h, w, o) { return this.stopLine(x, z, h, w, 'hold', { draw: false, ...o }); }
  crosswalk(x, z, h, w, depth = 2.6) { this.world.zebra(x, z, h, w, depth); const c = { x, z, h, hw: w / 2, hd: depth / 2 }; this.xwalks.push(c); return c; }
  cross(cx, cz, o = {}) {
    const w = this.world, n1 = o.ns || 1, n2 = o.ew || 1, hx = n1 * LW, hz = n2 * LW, len = o.len || 100, arms = o.arms || 'NSEW', lim = o.limit || 30;
    const pad = w.pad(cx - hx, cz - hz, cx + hx, cz + hz, { junction: true });
    const ro = { f: n1, b: n1, limit: lim, sidewalk: o.sidewalk, shoulder: o.shoulder }, re = { f: n2, b: n2, limit: o.limitEW || lim, sidewalk: o.sidewalk }, L = a => o['len' + a] ?? len;
    if (arms.includes('N')) w.road(cx, cz - hz - L('N'), cx, cz - hz, ro);
    if (arms.includes('S')) w.road(cx, cz + hz, cx, cz + hz + L('S'), ro);
    if (arms.includes('W')) w.road(cx - hx - L('W'), cz, cx - hx, cz, re);
    if (arms.includes('E')) w.road(cx + hx, cz, cx + hx + L('E'), cz, re);
    if ((o.sidewalk ?? lim <= 35) && !o.shoulder) for (const sx of [1, -1]) for (const sz of [1, -1]) w.box(2, .16, 2, w.mat.walk, cx + sx * (hx + 1), .08, cz + sz * (hz + 1), 0, false);
    const xw = o.xwalk, off = xw ? 5 : 1.2, ctl = o.control || 'none';
    const ap = { S: { h: N, x: cx + hx / 2, z: cz + hz + off, w: hx, cw: [cx, cz + hz + 2.4, 2 * hx], far: 2 * hz }, N: { h: S, x: cx - hx / 2, z: cz - hz - off, w: hx, cw: [cx, cz - hz - 2.4, 2 * hx], far: 2 * hz },
      W: { h: E, x: cx - hx - off, z: cz + hz / 2, w: hz, cw: [cx - hx - 2.4, cz, 2 * hz], far: 2 * hx }, E: { h: W, x: cx + hx + off, z: cz - hz / 2, w: hz, cw: [cx + hx + 2.4, cz, 2 * hz], far: 2 * hx } };
    const out = { pad, lines: {}, sigs: {}, ap, cx, cz, hx, hz, xw: {} };
    if (ctl === 'all' || ctl === 'dark') out.mgr = this.allway(pad);
    for (const a of arms) {
      const A = ap[a], [fx, fz] = fwd(A.h), [rx, rz] = rgt(A.h), sx = A.x + rx * (A.w / 2 + 1.7), sz = A.z + rz * (A.w / 2 + 1.7);
      if (xw) out.xw[a] = this.crosswalk(A.cw[0], A.cw[1], A.h, A.cw[2]);
      if (ctl === 'signal' || ctl === 'dark') {
        const far = off + A.far + 2.5, sig = w.signal(A.x + fx * far + rx * (A.w / 2 + 1.6), A.z + fz * far + rz * (A.w / 2 + 1.6), A.h, { arm: A.w / 2 + 1.6 });
        if (ctl === 'dark') sig.set('off'); out.sigs[a] = sig;
        out.lines[a] = this.stopLine(A.x, A.z, A.h, A.w, 'signal', { signal: sig, allway: out.mgr, rtor: o.rtor !== false });
        if (w.top && ctl === 'signal') w.stopGlow(sig, A.x, A.z, A.h, A.w);
      } else if (ctl === 'all' || (o.stop || '').includes(a)) {
        w.sign('stop', sx, sz, A.h, ctl === 'all' ? 'STOP' : '');
        out.lines[a] = this.stopLine(A.x, A.z, A.h, A.w, 'stop', { allway: out.mgr });
      }
    }
    if (out.sigs.N && ctl === 'signal') w.cycle([[out.sigs.N, out.sigs.S].filter(Boolean), [out.sigs.E, out.sigs.W].filter(Boolean)], o.green || [11, 9], o.t0 || 0);
    return out;
  }
  route(spec, r = 7) { const p = buildPath(spec, r), out = []; let hi = 0; for (let s = 8; s < p.len - 4; s += 13) { const q = pathAt(p, s, hi); hi = q.i; out.push(q); } this.world.chevrons(out); }
  tip(x, z, r, text) { this.tips.push({ x, z, r, text }); }
  say(text) { this.ui.coach(text); }
  praise(text) { this.praises++; this.ui.toast(text, 'good'); }
  goal(x, z, r = 4, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 60, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x3cff9a, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false, fog: false })); beam.position.y = 30; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - .35, r, 40), new THREE.MeshBasicMaterial({ color: 0x3cff9a, transparent: true, opacity: .9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .06; g.add(ring);
    if (this.goalObj) this.world.root.remove(this.goalObj.mesh);
    this.goalObj = { x, z, r, mesh: g, ...o }; if (this.built) this.world.add(g); return this.goalObj;
  }
  spot(x, z, h, len, wid) { // highlighted parking target
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), new THREE.MeshBasicMaterial({ color: 0x3cff9a, transparent: true, opacity: .35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = -h; m.position.set(x, .05, z); this.world.add(m);
    return { x, z, h, len, wid, mesh: m };
  }
  inSpot(sp, margin = .12, angTol = .15) {
    const p = this.player, [fx, fz] = fwd(p.h), [rx, rz] = rgt(p.h), [sfx, sfz] = fwd(sp.h), [srx, srz] = rgt(sp.h);
    for (const [a, b] of [[2.2, .92], [2.2, -.92], [-2.2, .92], [-2.2, -.92]]) {
      const dx = p.x + fx * a + rx * b - sp.x, dz = p.z + fz * a + rz * b - sp.z;
      if (Math.abs(dx * sfx + dz * sfz) > sp.len / 2 + margin || Math.abs(dx * srx + dz * srz) > sp.wid / 2 + margin) return false;
    }
    return Math.abs(Math.sin(p.h - sp.h)) < angTol;
  }
  secured() { const p = this.player; return Math.abs(p.v) < .05 && (this.manual ? p.handbrake : p.gear === 'P'); }
  onUpdate(fn) { this.updaters.push(fn); }
  after(sec, fn) { this.timers.push({ t: this.t + sec, fn }); }
  teleport(x, z, h) { const p = this.player; p.place(x, z, h); this.px = x; this.pz = z; this.ph = h; this.prevLoc = null; this.jn = null; this.ui.flash(''); }

  violate(key, text, pts, crit = false, cd = 6) {
    if (this.state !== 'run' || (this.cool[key] || 0) > this.t) return false;
    this.cool[key] = this.t + cd; this.score = Math.max(0, this.score - pts); this.violations.push({ key, text, pts });
    this.ui.toast(text, 'bad', pts); if (crit) this.fail(text); return true;
  }
  win() { if (this.state !== 'run') return; this.state = 'win'; this.ui.result(this); }
  fail(text) { if (this.state !== 'run') return; this.state = 'fail'; this.failText = text; this.ui.result(this); }
  get stars() { return this.state !== 'win' ? 0 : this.score >= 95 ? 3 : this.score >= 85 ? 2 : this.score >= 70 ? 1 : 0; }

  // ---------- frame update ----------
  update(dt, inp) {
    if (this.state !== 'run') return;
    this.built = true; this.t += dt; const p = this.player, w = this.world, t = this.t, pr = inp.pressed;
    if (pr.blinkL) p.setBlinker('L'); if (pr.blinkR) p.setBlinker('R'); if (pr.hazard) p.hazard = !p.hazard;
    if (pr.gearUp || pr.gearDown) { const msg = p.shift(pr.gearUp ? 1 : -1, inp.brake); if (msg) this.ui.toast(msg, 'info'); else this.ui.sfx('click'); }
    if (pr.lights) { p.lights = (p.lights + 1) % 3; this.ui.toast(['Headlights OFF', 'Headlights ON (low beam)', 'HIGH beams ON'][p.lights], 'info'); }
    if (pr.belt) { p.belt = !p.belt; this.ui.toast(p.belt ? 'Seat belt fastened' : 'Seat belt unfastened', 'info'); }
    if (pr.handbrake) { p.handbrake = !p.handbrake; this.ui.toast(p.handbrake ? 'Parking brake SET' : 'Parking brake released', 'info'); }
    if (pr.wipers) { p.wipers = !p.wipers; this.ui.toast(p.wipers ? 'Wipers ON' : 'Wipers OFF', 'info'); }
    p.grip = w.env.rain ? .6 : 1; p.slopeAcc = 9.81 * Math.sin(w.slope) * Math.cos(p.h);
    this.px = p.x; this.pz = p.z; this.ph = p.h;
    p.update(dt, inp, t);
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].t <= t) { const tm = this.timers.splice(i, 1)[0]; tm.fn(); }
    for (const n of this.npcs) n.update(dt, this);
    for (const d of this.peds) d.update(dt, this);
    for (const m of this.allways) m.update();
    for (const fn of this.updaters) fn(dt, this);
    if (this.state === 'run') this.rules(dt);
  }

  rules(dt) {
    const p = this.player, w = this.world, t = this.t, sp = Math.abs(p.v), mph = sp * MPH, [fx, fz] = fwd(p.h), [rx, rz] = rgt(p.h);
    const loc = this.loc = w.locate(p.x, p.z);
    // --- staying on the road
    let off = false; for (const [a, b] of [[1.9, .72], [1.9, -.72], [-1.9, .72], [-1.9, -.72]]) if (!w.locate(p.x + fx * a + rx * b, p.z + fz * a + rz * b)) off = true;
    this.offT = off ? this.offT + dt : Math.min(this.offT, 0) + (this.offT < 0 ? dt : 0);
    if (this.offT > .45) { this.violate('offroad', 'You hit the curb or left the pavement. Keep all four wheels on the road.', 5, false, 3); this.offT = -2; }
    this.lostT = loc ? 0 : this.lostT + dt; if (this.lostT > 5) return this.fail('You drove off the road.');
    // --- speed limit
    const lim = this.limit = w.zoneLimit(p.x, p.z) ?? loc?.limit ?? this.limit;
    if (mph > lim + 4.5) { this.spdT += dt; if (this.spdT > 1.5) { this.violate('speed', `Speeding: ${Math.round(mph)} mph in a ${lim} mph zone.`, mph > lim + 15 ? 10 : 5, false, 5); } } else this.spdT = 0;
    // --- wrong side / wrong way
    if (loc && loc.h !== undefined && p.v > 2 && Math.cos(p.h - loc.h) < -.5 && !loc.road?.passing) {
      this.wrongT += dt; if (this.wrongT > 1) this.violate('wrongway', loc.kind === 'ring' ? 'Wrong way! Travel COUNTER-CLOCKWISE in a roundabout.' : loc.road.b === 0 ? 'WRONG WAY on a one-way road!' : 'You are on the wrong side of the road. Solid yellow lines mean do not cross to pass.', 10, false, 4);
    } else this.wrongT = 0;
    // --- lane changes
    const pl = this.prevLoc;
    if (loc?.kind === 'road' && pl?.kind === 'road' && pl.road.group === loc.road.group && pl.dir === loc.dir && pl.idx !== loc.idx && !loc.shoulder && !pl.shoulder && t - (this.lcT || -9) > 1.2) this.laneChange(loc.idx > pl.idx ? 'R' : 'L', loc);
    if (loc) this.prevLoc = loc;
    // --- turn signals at junctions
    const inJ = loc?.kind === 'pad' && loc.pad.junction;
    if (inJ && !this.jn) this.jn = { h: p.h, bl: p.blinker };
    if (!inJ && this.jn) { const d = wrap(p.h - this.jn.h), need = d > .8 ? 'L' : d < -.8 ? 'R' : ''; if (need && this.jn.bl !== need) this.violate('signal', 'No turn signal. Florida law: signal at least 100 feet before you turn.', 5); this.jn = null; }
    // --- stop lines, signals
    const bxp = p.x + fx * 2.2, bzp = p.z + fz * 2.2; this.sigAhead = null;
    for (const ln of this.lines) {
      const [lx, lz] = fwd(ln.h), [qx, qz] = rgt(ln.h), dx = bxp - ln.x, dz = bzp - ln.z, s = dx * lx + dz * lz, lat = dx * qx + dz * qz;
      const inl = Math.abs(lat) < ln.w / 2 + .5 && Math.cos(p.h - ln.h) > .6;
      if (inl && s > -45 && s <= .7) {
        ln.ap = true; if (ln.signal && ln.type === 'signal') this.sigAhead = ln.signal.state;
        if (s > -11) { ln.minV = Math.min(ln.minV, sp); if (sp < .25) { ln.stopped = true; ln.stopS = s; if (ln.allway) ln.allway.arrive(p); } }
      } else if (ln.ap && inl && s > .7 && s < 9) { this.crossLine(ln); ln.ap = false; ln.minV = Infinity; ln.stopped = false; }
      else if (ln.ap && (!inl || s < -45)) { ln.ap = false; ln.minV = Infinity; ln.stopped = false; }
    }
    for (const m of this.allways) {
      if (m.inPad(p)) {
        if (!m.pIn) { m.pIn = true; if (m.queue.some(q => q !== p) && m.queue[0] !== p) this.violate('row', 'Four-way stop: the first vehicle to stop goes first. If two arrive together, yield to the driver on your RIGHT.', 15);
          m.queue = m.queue.filter(q => q !== p); m.queue.unshift(p); m.entered = true; }
      } else m.pIn = false;
    }
    // --- crosswalks
    const pc = circlesOf(p);
    for (const c of this.xwalks) {
      const [ux, uz] = fwd(c.h), [ax, az] = rgt(c.h);
      if (!pc.some(([x, z, r]) => { const dx = x - c.x, dz = z - c.z; return Math.abs(dx * ux + dz * uz) < c.hd + r * .5 && Math.abs(dx * ax + dz * az) < c.hw; })) continue;
      for (const d of this.peds) {
        if (d.gone) continue; const dx = d.x - c.x, dz = d.z - c.z, da = dx * ax + dz * az;
        if (Math.abs(dx * ux + dz * uz) < c.hd + .8 && Math.abs(da) < c.hw && Math.abs((p.x - c.x) * ax + (p.z - c.z) * az - da) < 5.2 && sp > .4)
          this.violate('ped', d.model.userData.cane ? 'A pedestrian with a white cane or guide dog always has the right-of-way. Come to a complete stop.' : 'You must STOP for pedestrians in a crosswalk and stay stopped until they are clear.', 15);
      }
    }
    // --- collisions
    const hit = e => circlesOf(e).some(c => pc.some(q => Math.hypot(c[0] - q[0], c[1] - q[1]) < c[2] + q[2] - .05));
    const bump = (msg) => { this.violate('bump', msg, 10, false, 1.5); p.x = this.px; p.z = this.pz; p.h = this.ph; p.v = 0; p.sync(0, t); };
    for (const n of this.npcs) if (!n.gone && !n.ghost && hit(n)) {
      if (n.static && sp < 2.4) bump('You bumped a parked vehicle. Go slower and check your distance.');
      else return this.crash(n.type === 'bike' ? 'You hit a bicyclist.' : 'Crash! You collided with another vehicle.');
    }
    for (const d of this.peds) if (!d.gone && !d.ghost && hit(d)) return this.crash('You hit a pedestrian. Always scan ahead and be ready to stop.');
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]; if (!hit(o)) continue;
      if (o.cone) { o.mesh.rotation.z = 1.4; o.mesh.position.y = .15; this.obstacles.splice(i, 1); this.violate('cone', 'You knocked over a cone.', 5, false, .3); }
      else if (sp < 2.4) bump('You bumped into an obstacle.'); else return this.crash('Crash!');
    }
    // --- following distance
    let gap = null;
    for (const n of this.npcs) {
      if (n.gone || n.ghost) continue; const dx = n.x - p.x, dz = n.z - p.z, f = dx * fx + dz * fz;
      if (f > 0 && Math.abs(dx * rx + dz * rz) < 1.4 && Math.cos(n.h - p.h) > .7) { const g = f - p.L / 2 - n.L / 2; if (gap === null || g < gap) gap = g; }
    }
    this.gap = gap; this.gapS = gap !== null && p.v > 4 ? gap / p.v : null;
    if (this.gapS !== null && p.v > 8 && this.gapS < this.gapMin) { this.tailT += dt; if (this.tailT > 2) this.violate('tailgate', 'Following too closely! Keep at least 3–4 seconds behind the vehicle ahead.', 5); } else this.tailT = 0;
    // --- equipment
    const dark = w.env.time !== 'day' || w.env.rain;
    if (dark && sp > 2 && !p.lights) { this.lightT += dt; if (this.lightT > 5) { this.violate('lights', w.env.rain ? 'Headlights ON in rain, smoke or fog — it is Florida law (wipers on, lights on).' : 'Turn on your headlights (L). Required from sunset to sunrise.', 5, false, 10); this.lightT = 0; } } else this.lightT = 0;
    if (!p.belt && sp > 1.5) this.violate('belt', 'Buckle up! Florida law requires seat belts for the driver, front passenger and everyone under 18.', 10, false, 10);
    if (p.hazard && sp > 4 && !(lim >= 55 && w.env.rain)) this.violate('hazard', 'Do not drive with hazard lights on. In Florida they are only allowed while moving on 55+ mph roads in extremely low visibility.', 5, false, 10);
    if (p.handbrake && sp > 2) this.violate('pbrake', 'Release the parking brake (Space) before driving.', 0, false, 6);
    if (this.fp && p.v < -.6 && t - p.lookT.B > 3) { this.revT += dt; if (this.revT > 1.3) this.violate('lookback', 'Look behind you (hold V) while backing up — do not rely only on mirrors.', 5); } else this.revT = 0;
    // --- right-of-way: making a driver with priority brake hard
    for (const n of this.npcs) if (n.priority && n.blockedBy === p && n.braking && n.v > 2.5 && Math.abs(wrap(p.h - n.h)) > .5) this.violate('yield', 'You failed to yield the right-of-way — another driver had to brake for you.', 15);
    // --- sign ahead (for the HUD)
    let best = null, bd = 60;
    for (const s of w.signs) { if (!s.group.visible) continue; const dx = s.x - p.x, dz = s.z - p.z, f = dx * fx + dz * fz; if (f > 1 && f < bd && Math.abs(dx * rx + dz * rz) < 14 && Math.cos(p.h - s.h) > .75) { best = s; bd = f; } }
    this.signAhead = best;
    // --- coaching tips and goal
    for (const tp of this.tips) if (!tp.done && Math.hypot(p.x - tp.x, p.z - tp.z) < tp.r) { tp.done = true; this.ui.coach(tp.text); }
    const g = this.goalObj;
    if (g) { g.mesh.children[1].rotation.z = t; if (Math.hypot(p.x - g.x, p.z - g.z) < g.r && (!g.stop || sp < .3) && (!g.cond || g.cond())) this.win(); }
  }
  crash(text) { this.score = Math.max(0, this.score - 40); this.violations.push({ key: 'crash', text, pts: 40 }); this.ui.sfx('crash'); this.player.v = 0; this.fail(text); }
  crossLine(ln) {
    const p = this.player; let type = ln.type; const st = ln.signal?.state;
    if (type === 'signal') {
      if (st === 'flash-red' || st === 'off') type = 'stop';
      else if (st === 'red') {
        if (ln.rtor && ln.minV < .25 && p.blinker === 'R') this.praise('Right turn on red after a full stop — legal in Florida unless a sign says NO TURN ON RED.');
        else this.violate('red', ln.minV < .25 ? 'RED means stop and stay stopped (a right turn on red needs your right signal on).' : 'You ran a RED light.', 30, true);
      }
    }
    if (type === 'stop' && ln.minV > .25) this.violate('stop', ln.minV > 4 ? (st ? 'A dark or flashing-red signal works like a STOP sign — you must stop.' : 'You ran a STOP sign!') : 'Rolling stop! Come to a COMPLETE stop before the stop line.', ln.minV > 4 ? 20 : 10);
    if (type === 'hold' && ln.active()) this.violate(ln.key || 'hold', ln.msg, ln.pts || 30, ln.crit !== false);
    ln.onCross?.(ln);
  }
  laneChange(side, loc) {
    const p = this.player, t = this.t; this.lcT = t; this.lastLane = { side, t, idx: loc.idx };
    if (this.noLaneRules) return;
    if (p.blinker !== side) this.violate('signal-lane', 'Signal before you change lanes.', 5);
    if (this.fp && t - p.lookT[side] > 4) this.violate('blind', `Check your blind spot! Glance over your ${side === 'L' ? 'left' : 'right'} shoulder (${side === 'L' ? 'Z' : 'C'}) before changing lanes.`, 5);
    const [lx, lz] = fwd(loc.h);
    for (const n of this.npcs) {
      if (n.gone || n.static) continue; const nl = this.world.locate(n.x, n.z); if (nl?.key !== loc.key) continue;
      const al = (n.x - p.x) * lx + (n.z - p.z) * lz; if (al > -(7 + p.v * .25) && al < 7) this.violate('unsafe-lane', 'Unsafe lane change — that lane was not clear. Check mirrors AND your blind spot.', 10);
    }
    this.after(1.2, () => { if (p.blinker === side) p.blinker = ''; });
  }
}
Session.coneG = new THREE.ConeGeometry(.22, .7, 10); Session.coneG.userData.shared = true;
