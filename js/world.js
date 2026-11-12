// World: scene graph, sky/lighting, road-building kit and spatial queries.
import * as THREE from './lib/three.module.min.js';
export { THREE };

export const LW = 3.6;            // lane width (m) = 12 ft
export const MPH = 2.23694;       // m/s -> mph
export const N = Math.PI, S = 0, E = Math.PI / 2, W = -Math.PI / 2; // headings
export const fwd = h => [Math.sin(h), Math.cos(h)];
export const rgt = h => [-Math.cos(h), Math.sin(h)];
export const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

// ---------- procedural textures ----------
const texCache = {};
function noiseTex(key, r, g, b, v, blobs = 0) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), id = x.createImageData(256, 256), R = rng(key.length * 7919 + 13);
  for (let i = 0; i < 65536; i++) {
    const n = (R() - .5) * v;
    id.data[i * 4] = r + n; id.data[i * 4 + 1] = g + n; id.data[i * 4 + 2] = b + n; id.data[i * 4 + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  for (let i = 0; i < blobs; i++) {
    x.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,200'},${.012 + R() * .02})`;
    x.beginPath(); x.arc(R() * 256, R() * 256, 8 + R() * 30, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return texCache[key] = t;
}
function windowTex(wall, lit) {
  const key = 'win' + wall + lit; if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
  const R = rng(wall.length * 31 + 5);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = lit && R() < .45 ? '#ffe9a8' : (R() < .5 ? '#22384d' : '#2d4a63');
    g.fillRect(6 + i * 32, 14 + j * 64, 20, 36);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(6 + i * 32, 14 + j * 64, 20, 6);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return texCache[key] = t;
}

// ---------- road sign art ----------
const signCache = {};
export function signCanvas(type, text = '') {
  const key = type + '|' + text; if (signCache[key]) return signCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const poly = (pts, fill, stroke, lw = 10) => {
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
  };
  const txt = (s, color, cy = 128, maxW = 190, maxH = 150) => {
    const lines = String(s).split('\n'); let fs = Math.min(maxH / lines.length, 96);
    const F = () => g.font = `900 ${fs}px Arial, Helvetica, sans-serif`; F();
    const wm = Math.max(...lines.map(l => g.measureText(l).width)); if (wm > maxW) { fs *= maxW / wm; F(); }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, 128, cy + (i - (lines.length - 1) / 2) * fs * 1.05));
  };
  const rect = (x, y, w, h, fill, stroke, lw) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, stroke, lw);
  const diamond = col => poly([[128, 10], [246, 128], [128, 246], [10, 128]], col, '#111', 8);
  switch (type) {
    case 'stop': {
      const p = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; p.push([128 + 118 * Math.cos(a), 128 + 118 * Math.sin(a)]); }
      poly(p, '#c8102e', '#fff', 10); txt(text || 'STOP', '#fff', 132, 180, 80); break;
    }
    case 'yield': poly([[14, 28], [242, 28], [128, 236]], '#fff', '#c8102e', 26); txt('YIELD', '#c8102e', 84, 110, 40); break;
    case 'speed': rect(42, 8, 172, 240, '#fff', '#111', 8); txt('SPEED\nLIMIT', '#111', 62, 130, 80); txt(text, '#111', 172, 140, 120); break;
    case 'school': poly([[128, 8], [244, 96], [244, 246], [12, 246], [12, 96]], '#c9e52f', '#111', 8); txt(text || 'SCHOOL\nZONE', '#111', 160, 190, 110); break;
    case 'rr': g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fillStyle = '#f7d117'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#111'; g.stroke();
      g.lineWidth = 18; g.beginPath(); g.moveTo(48, 48); g.lineTo(208, 208); g.moveTo(208, 48); g.lineTo(48, 208); g.stroke();
      g.font = '900 60px Arial'; g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R', 52, 130); g.fillText('R', 204, 130); break;
    case 'crossbuck': g.save(); g.translate(128, 128);
      for (const a of [.5, -.5]) { g.save(); g.rotate(a); g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 4; g.fillRect(-124, -22, 248, 44); g.strokeRect(-124, -22, 248, 44);
        g.fillStyle = '#111'; g.font = '900 26px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a > 0 ? 'RAILROAD' : 'CROSSING', 0, 2); g.restore(); }
      g.restore(); break;
    case 'dne': rect(8, 8, 240, 240, '#fff', '#111', 6); g.beginPath(); g.arc(128, 128, 104, 0, 7); g.fillStyle = '#c8102e'; g.fill(); rect(52, 108, 152, 40, '#fff'); break;
    case 'warn': diamond('#f7d117'); txt(text, '#111', 128, 150, 120); break;
    case 'work': diamond('#ff8a00'); txt(text || 'ROAD\nWORK\nAHEAD', '#111', 128, 150, 120); break;
    case 'ped': diamond('#c9e52f'); g.fillStyle = '#111'; g.beginPath(); g.arc(128, 74, 16, 0, 7); g.fill();
      g.lineWidth = 16; g.lineCap = 'round'; g.strokeStyle = '#111'; g.beginPath(); g.moveTo(128, 96); g.lineTo(124, 150); g.lineTo(100, 196); g.moveTo(124, 150); g.lineTo(152, 196);
      g.moveTo(128, 108); g.lineTo(98, 134); g.moveTo(128, 108); g.lineTo(158, 130); g.stroke(); break;
    case 'guide': rect(8, 48, 240, 160, '#00703c', '#fff', 8); txt(text, '#fff', 128, 210, 130); break;
    case 'blue': rect(8, 48, 240, 160, '#0b4ea2', '#fff', 8); txt(text, '#fff', 128, 210, 130); break;
    default: rect(30, 30, 196, 196, '#fff', '#111', 8); txt(text, '#111', 128, 170, 170);
  }
  return signCache[key] = c;
}

// ---------- geometry batching ----------
class Batch {
  constructor(mat, y) { this.mat = mat; this.y = y; this.p = []; this.u = []; }
  quad(cx, cz, len, wid, h, y = this.y) {
    const fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx, l = len / 2, w = wid / 2;
    const A = [cx - fx * l - rx * w, cz - fz * l - rz * w], B = [cx - fx * l + rx * w, cz - fz * l + rz * w],
      C = [cx + fx * l - rx * w, cz + fz * l - rz * w], D = [cx + fx * l + rx * w, cz + fz * l + rz * w];
    this.tri(A, B, C, y); this.tri(B, D, C, y);
  }
  tri(a, b, c, y = this.y) { for (const q of [a, b, c]) { this.p.push(q[0], y, q[1]); this.u.push(q[0] * .25, q[1] * .25); } }
  mesh() {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry(), n = new Float32Array(this.p.length);
    for (let i = 1; i < n.length; i += 3) n[i] = 1;
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    const m = new THREE.Mesh(g, this.mat); m.receiveShadow = true; return m;
  }
}

const ENV = {
  day: { top: 0x1f6fe0, hor: 0xbfe6ff, sun: [.45, .8, .35], sunCol: 0xfff3dc, sunI: 3.2, hemi: .9, fog: [260, 1500], envI: .7, exp: 1 },
  dusk: { top: 0x27357a, hor: 0xff9e6b, sun: [.8, .2, .3], sunCol: 0xffa25e, sunI: 2.0, hemi: .5, fog: [200, 1200], envI: .5, exp: 1 },
  night: { top: 0x02040c, hor: 0x0a1228, sun: [-.3, .8, .4], sunCol: 0x8fa8ff, sunI: .22, hemi: .1, fog: [50, 420], envI: .12, exp: 1 },
  rain: { top: 0x55616d, hor: 0x9aa4ab, sun: [.3, .9, .2], sunCol: 0xdfe6ee, sunI: .9, hemi: 1.0, fog: [40, 380], envI: .6, exp: .95 },
};

export class World {
  constructor(renderer, mode) {
    this.renderer = renderer; this.mode = mode; this.top = mode === 'top';
    this.scene = new THREE.Scene(); this.root = new THREE.Group(); this.scene.add(this.root);
    this.roads = []; this.pads = []; this.rings = []; this.zones = []; this.signs = []; this.signals = []; this.cycles = [];
    this.slope = 0; this.env = { time: 'day', rain: false }; this.R = rng(1234);
    const S2 = (o) => new THREE.MeshStandardMaterial(o), po = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    this.mat = {
      asphalt: S2({ map: noiseTex('asph', 60, 60, 64, 20, 30), roughness: .93 }),
      white: S2({ color: 0xf4f4f4, roughness: .6, ...po }), yellow: S2({ color: 0xf5c400, roughness: .6, ...po }),
      guide: new THREE.MeshBasicMaterial({ color: 0x35d0ff, transparent: true, opacity: .5, depthWrite: false, ...po }),
      walk: S2({ map: noiseTex('conc', 182, 180, 172, 12, 10), roughness: .95 }),
      grass: S2({ map: noiseTex('grass', 78, 132, 60, 26, 60), roughness: 1 }),
      pole: S2({ color: 0x777c80, metalness: .7, roughness: .4 }), dark: S2({ color: 0x1b1d20, roughness: .6 }),
      trunk: S2({ color: 0x6b4a2f, roughness: 1 }), leaf: S2({ color: 0x2e7d32, roughness: .9 }), palm: S2({ color: 0x3f9b3a, roughness: .8, side: THREE.DoubleSide }),
      cone: S2({ color: 0xff6a00, roughness: .6 }), roof: S2({ color: 0xa5512f, roughness: .8 }), roof2: S2({ color: 0x5b6168, roughness: .8 }),
    };
    this.mat.grass.map = this.mat.grass.map.clone(); this.mat.grass.map.repeat.set(500, 500); this.mat.grass.map.needsUpdate = true;
    this.B = { asphalt: new Batch(this.mat.asphalt, .02), white: new Batch(this.mat.white, .04), yellow: new Batch(this.mat.yellow, .04), guide: new Batch(this.mat.guide, .06) };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), this.mat.grass); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.root.add(ground);
    // sky
    this.skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vD; uniform vec3 top,hor,sunDir,sunCol;
        void main(){ vec3 d=normalize(vD); float h=max(d.y,0.); vec3 c=mix(hor,top,pow(h,.5)); float s=max(dot(d,sunDir),0.);
        c+=sunCol*(pow(s,900.)*4.+pow(s,10.)*.18); gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    }));
    this.scene.add(this.sky);
    this.clouds = new THREE.Group(); this.scene.add(this.clouds);
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: .85 }), cg = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 22; i++) {
      const a = this.R() * 6.28, r = 350 + this.R() * 900, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 190 + this.R() * 120;
      for (let j = 0; j < 5; j++) { const m = new THREE.Mesh(cg, cm); const s = 30 + this.R() * 45; m.scale.set(s * 1.6, s * .45, s); m.position.set(cx + (this.R() - .5) * 120, cy + this.R() * 12, cz + (this.R() - .5) * 60); this.clouds.add(m); }
    }
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6f8f55, 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -75; sc.right = sc.top = 75; sc.near = 10; sc.far = 400;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -.0005; this.sun.shadow.normalBias = .06;
    this.scene.add(this.sun, this.sun.target);
    this.setEnv({});
  }

  setEnv(e) {
    Object.assign(this.env, e);
    const p = ENV[this.env.rain ? 'rain' : this.env.time], U = this.skyU;
    U.top.value.set(p.top); U.hor.value.set(p.hor); U.sunDir.value.set(...p.sun).normalize(); U.sunCol.value.set(p.sunCol);
    if (this.env.time === 'night' || this.env.rain) U.sunCol.value.multiplyScalar(.15);
    this.sunDir = U.sunDir.value.clone();
    this.sun.color.set(p.sunCol); this.sun.intensity = p.sunI; this.hemi.intensity = p.hemi;
    this.hemi.color.set(p.hor); this.scene.fog = new THREE.Fog(p.hor, p.fog[0], p.fog[1]);
    this.clouds.visible = this.env.time !== 'night'; this.clouds.children[0].material.color.set(this.env.rain ? 0x8a9198 : this.env.time === 'dusk' ? 0xffc9a8 : 0xffffff);
    this.renderer.toneMappingExposure = p.exp; this.scene.environmentIntensity = p.envI;
    this.mat.asphalt.roughness = this.env.rain ? .28 : .93; this.mat.asphalt.metalness = this.env.rain ? .25 : 0;
    const es = new THREE.Scene(); const sk = this.sky.clone(); es.add(sk);
    const pm = new THREE.PMREMGenerator(this.renderer); this.envRT?.dispose(); this.envRT = pm.fromScene(es, 0, 1, 4000); pm.dispose();
    this.scene.environment = this.envRT.texture;
    if (this.env.rain && !this.rain) {
      const n = 5000, pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) { const x = (this.R() - .5) * 70, y = this.R() * 30, z = (this.R() - .5) * 70; pos.set([x, y, z, x + .05, y - .7, z], i * 6); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.LineBasicMaterial({ color: 0xcfd8e3, transparent: true, opacity: .45, fog: false });
      this.rain = new THREE.Group(); const a = new THREE.LineSegments(g, m), b = new THREE.LineSegments(g, m); b.position.y = 30; this.rain.add(a, b);
      a.frustumCulled = b.frustumCulled = false; this.scene.add(this.rain);
    }
  }

  // ----- primitives -----
  add(o) { this.root.add(o); return o; }
  box(w, h, d, mat, x, y, z, ry = 0, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = true; return this.add(m);
  }
  line(x1, z1, x2, z2, wid = .14, col = 'white') {
    const dx = x2 - x1, dz = z2 - z1; this.B[col].quad((x1 + x2) / 2, (z1 + z2) / 2, Math.hypot(dx, dz), wid, Math.atan2(dx, dz));
  }
  road(ax, az, bx, bz, o = {}) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), h = Math.atan2(dx, dz), [fx, fz] = fwd(h), [rx, rz] = rgt(h);
    const f = o.f ?? 1, b = o.b ?? 1, m = b ? (o.median || 0) : 0, sh = o.shoulder || 0, shL = o.shoulderL ?? (b ? sh : 0);
    const R = m / 2 + f * LW + sh, L = b ? m / 2 + b * LW + shL : shL;
    const r = { ax, az, h, len, f, b, m, R, L, sh, limit: o.limit ?? 30, group: o.group ?? ('r' + this.roads.length), passing: !!o.passing, fx, fz, rx, rz, o };
    this.roads.push(r);
    const P = (t, d) => [ax + fx * t + rx * d, az + fz * t + rz * d], B = this.B;
    const q = (bt, t0, t1, d, w) => { const c = P((t0 + t1) / 2, d); bt.quad(c[0], c[1], t1 - t0, w, h); };
    const dash = (bt, d, on = 3, gap = 6) => { for (let t = 0; t < len; t += on + gap) q(bt, t, Math.min(len, t + on), d, .14); };
    q(B.asphalt, 0, len, (R - L) / 2, R + L);
    if (o.marks !== false) {
      q(B.white, 0, len, m / 2 + f * LW - (sh ? 0 : .15), .14);
      if (b) q(B.white, 0, len, -(m / 2 + b * LW - (shL ? 0 : .15)), .14); else q(B.yellow, 0, len, shL ? 0 : .15, .14);
      for (let i = 1; i < f; i++) dash(B.white, m / 2 + i * LW);
      for (let i = 1; i < b; i++) dash(B.white, -(m / 2 + i * LW));
      if (b) {
        if (m > 0) { q(B.yellow, 0, len, m / 2 + .12, .14); q(B.yellow, 0, len, -m / 2 - .12, .14); }
        else { const c = o.center || 'dy'; if (c === 'dy') { q(B.yellow, 0, len, .15, .12); q(B.yellow, 0, len, -.15, .12); } else if (c === 'by') dash(B.yellow, 0, 3, 9); }
      }
    }
    if (m > .8) { const c = P(len / 2, 0); this.box(m - .6, .2, len, this.mat.grass, c[0], .1, c[1], h, false); }
    if (o.sidewalk ?? (r.limit <= 35)) {
      let c = P(len / 2, R + 1); this.box(2, .16, len, this.mat.walk, c[0], .08, c[1], h, false);
      c = P(len / 2, -L - 1); this.box(2, .16, len, this.mat.walk, c[0], .08, c[1], h, false);
    }
    return r;
  }
  pad(x0, z0, x1, z1, o = {}) {
    const p = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), limit: o.limit, junction: !!o.junction };
    this.pads.push(p); this.B.asphalt.quad((x0 + x1) / 2, (z0 + z1) / 2, p.z1 - p.z0, p.x1 - p.x0, 0, .022); return p;
  }
  ring(cx, cz, rin, rout, o = {}) {
    const r = { cx, cz, rin, rout, limit: o.limit ?? 20 }; this.rings.push(r);
    const m = new THREE.Mesh(new THREE.RingGeometry(rin, rout, 64), this.mat.asphalt); m.rotation.x = -Math.PI / 2; m.position.set(cx, .024, cz); m.receiveShadow = true; this.add(m);
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(rin, rin, .3, 48), this.mat.grass); isl.position.set(cx, .15, cz); isl.receiveShadow = true; this.add(isl);
    for (const [rr, mat] of [[rin + .25, this.mat.yellow], [rout - .25, this.mat.white]]) {
      const l = new THREE.Mesh(new THREE.RingGeometry(rr - .07, rr + .07, 64), mat); l.rotation.x = -Math.PI / 2; l.position.set(cx, .045, cz); this.add(l);
    }
    return r;
  }
  zone(x0, z0, x1, z1, limit) { this.zones.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), limit }); }
  stopBar(x, z, h, w) { this.B.white.quad(x, z, .5, w, h); }
  zebra(x, z, h, w, depth = 2.6) { const [rx, rz] = rgt(h); for (let d = -w / 2 + .4; d < w / 2; d += 1.1) this.B.white.quad(x + rx * d, z + rz * d, depth, .55, h); }
  chevrons(pts) { // route guidance arrows at sampled path points [{x,z,h}]
    for (const p of pts) {
      const [fx, fz] = fwd(p.h), [rx, rz] = rgt(p.h);
      for (const sgn of [1, -1]) this.B.guide.tri([p.x + fx * 1.1, p.z + fz * 1.1], [p.x + fx * .3, p.z + fz * .3], [p.x - fx * .9 + rx * .9 * sgn, p.z - fz * .9 + rz * .9 * sgn]);
      // make both windings so each half is visible from above
      for (const sgn of [1, -1]) this.B.guide.tri([p.x + fx * 1.1, p.z + fz * 1.1], [p.x - fx * .9 + rx * .9 * sgn, p.z - fz * .9 + rz * .9 * sgn], [p.x + fx * .3, p.z + fz * .3]);
    }
  }
  finish() { for (const k in this.B) { const m = this.B[k].mesh(); if (m) { if (k === 'guide') m.renderOrder = 2; this.root.add(m); } } }

  // ----- props -----
  sign(type, x, z, h, text = '', o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = h + Math.PI;
    const s = (o.size || 1) * (this.top ? 2.2 : 1), y = o.y ?? (this.top ? 2.6 : 2.3);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, y, 6), this.mat.pole); pole.position.y = y / 2; pole.castShadow = true; g.add(pole);
    const cv = signCanvas(type, text), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.95 * s, .95 * s), new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, roughness: .5, side: THREE.DoubleSide }));
    p.position.set(0, y + (this.top ? .1 : 0), .06); if (this.top) p.rotation.x = -.95; g.add(p);
    this.add(g); const rec = { x, z, h, canvas: cv, type, text, group: g, panel: p }; if (!o.quiet) this.signs.push(rec); return rec;
  }
  signal(x, z, h, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = h; const arm = o.arm ?? 4.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, 6.2, 8), this.mat.pole); pole.position.y = 3.1; pole.castShadow = true; g.add(pole);
    const a = new THREE.Mesh(new THREE.BoxGeometry(arm, .14, .14), this.mat.pole); a.position.set(arm / 2, 6, 0); g.add(a);
    const head = new THREE.Group(); head.position.set(arm, 5.45, 0); g.add(head);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(.46, 1.3, .36), new THREE.MeshStandardMaterial({ color: 0xe0b000, roughness: .5 })); hb.castShadow = true; head.add(hb);
    const lamps = {}, cols = { red: 0xff1a1a, yellow: 0xffc400, green: 0x1dff6a }, lg = new THREE.SphereGeometry(.16, 12, 8);
    Object.keys(cols).forEach((k, i) => {
      const m = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: cols[k], emissiveIntensity: 0, roughness: .3 }));
      m.position.set(0, .4 - i * .4, -.17); head.add(m); lamps[k] = m.material;
    });
    if (this.top) { head.rotation.x = 1.0; head.scale.setScalar(2.2); head.position.y = 6.4; }
    this.add(g);
    const sig = { x, z, h, state: o.state || 'red', lamps, manual: false, set(s) { this.state = s; this.manual = true; }, glow: null };
    this.signals.push(sig); return sig;
  }
  stopGlow(sig, x, z, h, w) { // colored bar on the pavement so signal state is readable from above
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, .9), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: .85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = -h; const [fx, fz] = fwd(h); m.position.set(x - fx * .9, .05, z - fz * .9); this.add(m); sig.glows = (sig.glows || []).concat(m);
  }
  cycle(groups, green = [10, 10], t0 = 0) { this.cycles.push({ groups, green, t: t0 }); }
  tree(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const t = new THREE.Mesh(World.G.trunk, this.mat.trunk); t.position.y = 1.5; t.castShadow = true; g.add(t);
    for (const [dx, dy, dz, r] of [[0, 4.2, 0, 2.2], [1.1, 3.4, .4, 1.6], [-1, 3.6, -.5, 1.7], [.2, 3.3, -1.1, 1.4]]) {
      const b = new THREE.Mesh(World.G.blob, this.mat.leaf); b.position.set(dx, dy, dz); b.scale.setScalar(r); b.castShadow = true; g.add(b);
    }
    return this.add(g);
  }
  palm(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = this.R() * 6.28;
    let px = 0; for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(World.G.palmSeg, this.mat.trunk); t.position.set(px, .65 + i * 1.25, 0); t.rotation.z = -.05 * i; t.castShadow = true; g.add(t); px += .1 * i * .5; }
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Group(); f.position.set(px, 7.9, 0); f.rotation.y = i * .7; const leaf = new THREE.Mesh(World.G.frond, this.mat.palm);
      leaf.position.set(1.7, -.35, 0); leaf.rotation.z = -.4 - (i % 3) * .12; leaf.castShadow = true; f.add(leaf); g.add(f);
    }
    return this.add(g);
  }
  house(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const cols = [0xf6e3c5, 0xffd5c2, 0xcfe8ef, 0xf9f1d0, 0xd9ead3, 0xfbe0e6], c = cols[Math.floor(this.R() * cols.length)];
    const w = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 8), new THREE.MeshStandardMaterial({ color: c, roughness: .9 })); w.position.y = 1.6; w.castShadow = w.receiveShadow = true; g.add(w);
    const r = new THREE.Mesh(World.G.roof, this.R() < .6 ? this.mat.roof : this.mat.roof2); r.position.y = 4.3; r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 1); r.castShadow = true; g.add(r);
    const d = new THREE.Mesh(new THREE.BoxGeometry(1, 2.1, .1), this.mat.trunk); d.position.set(0, 1.05, 4.02); g.add(d);
    for (const wx of [-3, 3]) { const wn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, .1), new THREE.MeshStandardMaterial({ color: 0x2a4257, roughness: .2, metalness: .6 })); wn.position.set(wx, 1.8, 4.02); g.add(wn); }
    return this.add(g);
  }
  building(x, z, w = 14, d = 12, floors = 3, ry = 0) {
    const walls = ['#c9b79c', '#b8c4cc', '#d8cfc0', '#a9b7a0', '#d2b8a8'], wc = walls[Math.floor(this.R() * walls.length)];
    const t = windowTex(wc, this.env.time === 'night').clone(); t.repeat.set(Math.round(w / 4), floors / 2); t.needsUpdate = true;
    const t2 = t.clone(); t2.repeat.set(Math.round(d / 4), floors / 2); t2.needsUpdate = true;
    const m1 = new THREE.MeshStandardMaterial({ map: t, roughness: .85 }), m2 = new THREE.MeshStandardMaterial({ map: t2, roughness: .85 }), cap = new THREE.MeshStandardMaterial({ color: 0x6d7075, roughness: .9 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, floors * 3.3, d), [m2, m2, cap, cap, m1, m1]); b.position.set(x, floors * 1.65, z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; return this.add(b);
  }
  lamp(x, z, h) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = h;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 7, 6), this.mat.pole); p.position.y = 3.5; p.castShadow = true; g.add(p);
    const a = new THREE.Mesh(new THREE.BoxGeometry(2.2, .1, .1), this.mat.pole); a.position.set(1.1, 7, 0); g.add(a);
    const l = new THREE.Mesh(new THREE.BoxGeometry(.7, .12, .3), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2a0, emissiveIntensity: this.env.time === 'day' ? 0 : 4 })); l.position.set(2.1, 6.95, 0); g.add(l);
    return this.add(g);
  }
  // Fill empty land with scenery, keeping clear of anything driveable.
  scenery(x0, z0, x1, z1, o = {}) {
    const placed = [], R = rng(o.seed || 7);
    const tryPlace = (n, clear, fn) => {
      for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) {
        const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
        if (this.nearDrive(x, z, clear) || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + clear * .8)) continue;
        if (o.avoid && o.avoid.some(a => x > a[0] && x < a[2] && z > a[1] && z < a[3])) continue;
        placed.push([x, z, clear * .8]); fn(x, z, R); i++;
      }
    };
    tryPlace(o.buildings || 0, 13, (x, z, R) => this.building(x, z, 12 + R() * 6, 11 + R() * 5, 2 + Math.floor(R() * 4), Math.floor(R() * 2) * Math.PI / 2));
    tryPlace(o.houses || 0, 10, (x, z, R) => this.house(x, z, Math.floor(R() * 4) * Math.PI / 2));
    tryPlace(o.palms || 0, 3.2, (x, z, R) => this.palm(x, z, .8 + R() * .5));
    tryPlace(o.trees || 0, 4.2, (x, z, R) => this.tree(x, z, .8 + R() * .7));
  }

  // ----- queries -----
  locate(x, z) {
    for (const r of this.roads) {
      const dx = x - r.ax, dz = z - r.az, t = dx * r.fx + dz * r.fz; if (t < -.15 || t > r.len + .15) continue;
      const d = dx * r.rx + dz * r.rz; if (d > r.R + .12 || d < -r.L - .12) continue;
      if (r.b && r.m > .8 && Math.abs(d) < r.m / 2 - .3) continue;
      const dir = (!r.b || d >= 0) ? 1 : -1, off = Math.abs(d) - (r.b ? r.m / 2 : 0), n = dir > 0 ? r.f : r.b;
      const idx = clamp(Math.floor(off / LW), 0, n - 1);
      return { kind: 'road', road: r, dir, idx, h: dir > 0 ? r.h : r.h + Math.PI, limit: r.limit, key: `${r.group}:${dir}:${idx}`, t, d, shoulder: off > n * LW };
    }
    for (const p of this.pads) if (x > p.x0 - .12 && x < p.x1 + .12 && z > p.z0 - .12 && z < p.z1 + .12) return { kind: 'pad', pad: p, limit: p.limit };
    for (const r of this.rings) { const dx = x - r.cx, dz = z - r.cz, d = Math.hypot(dx, dz); if (d > r.rin - .1 && d < r.rout + .12) return { kind: 'ring', ring: r, h: Math.atan2(dz, -dx), limit: r.limit }; }
    return null;
  }
  zoneLimit(x, z) { for (const q of this.zones) if (x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1) return q.limit; return null; }
  nearDrive(x, z, r) { if (this.locate(x, z)) return true; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; if (this.locate(x + Math.cos(a) * r, z + Math.sin(a) * r)) return true; } return false; }

  update(dt, t, camPos, focus) {
    for (const c of this.cycles) {
      c.t += dt; const Y = 3.5, AR = 1.5; let tt = c.t % c.green.reduce((a, g) => a + g + Y + AR, 0);
      c.groups.forEach((grp, i) => { const g = c.green[i]; let st = 'red'; if (tt >= 0 && tt < g) st = 'green'; else if (tt >= g && tt < g + Y) st = 'yellow'; tt -= g + Y + AR; for (const s of grp) if (!s.manual) s.state = st; });
    }
    const blink = (t * 1.6) % 1 < .5;
    for (const s of this.signals) {
      const on = { red: s.state === 'red' || (s.state === 'flash-red' && blink), yellow: s.state === 'yellow' || (s.state === 'flash-yellow' && blink), green: s.state === 'green' };
      for (const k in on) s.lamps[k].emissiveIntensity = on[k] ? 4 : 0;
      if (s.glows) for (const g of s.glows) { g.visible = on.red || on.yellow || on.green; g.material.color.set(on.red ? 0xff2020 : on.yellow ? 0xffc400 : 0x20ff70); }
    }
    this.sky.position.copy(camPos); this.clouds.position.set(camPos.x, 0, camPos.z);
    this.sun.target.position.copy(focus); this.sun.position.copy(focus).addScaledVector(this.sunDir, 180);
    if (this.rain) { this.rain.position.set(camPos.x, camPos.y - 12 - (t * 28) % 30, camPos.z); }
  }
  dispose() {
    this.scene.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    this.envRT?.dispose();
  }
}
const sh = g => { g.userData.shared = true; return g; };
World.G = {
  trunk: sh(new THREE.CylinderGeometry(.25, .35, 3, 7)), blob: sh(new THREE.IcosahedronGeometry(1, 1)),
  palmSeg: sh(new THREE.CylinderGeometry(.2, .26, 1.35, 7)), frond: sh(new THREE.ConeGeometry(.55, 3.6, 4).rotateZ(-Math.PI / 2).scale(1, .12, 1)),
  roof: sh(new THREE.ConeGeometry(7.6, 2.3, 4)),
};
