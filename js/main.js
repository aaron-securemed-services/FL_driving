// Boot, render loop, cameras, mirrors, HUD and menus.
import { THREE, MPH, fwd, wrap } from './world.js';
import { Session } from './game.js';
import { LESSONS } from './lessons.js';
import { Input } from './input.js';
import { Sound } from './audio.js';

const $ = id => document.getElementById(id);
const KEY = 'fl-driving-school-v1';
let store = { stars: {}, manual: false, sound: true, quality: 'high' };
try { Object.assign(store, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage unavailable */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } };

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
const input = new Input(), sound = new Sound(); sound.on = store.sound;

const topCam = new THREE.PerspectiveCamera(50, 1, 1, 5000), fpCam = new THREE.PerspectiveCamera(70, 1, .08, 5000);
const mirrors = [
  { cam: new THREE.PerspectiveCamera(20, 3.2, .3, 5000), rt: new THREE.WebGLRenderTarget(640, 200), pos: [0, 1.28, -1.2], yaw: 0, w: 400, h: 125 },
  { cam: new THREE.PerspectiveCamera(20, 1.35, .3, 5000), rt: new THREE.WebGLRenderTarget(324, 240), pos: [1.05, 1.1, .6], yaw: -.2, w: 200, h: 148 },
  { cam: new THREE.PerspectiveCamera(20, 1.35, .3, 5000), rt: new THREE.WebGLRenderTarget(324, 240), pos: [-1.05, 1.1, .6], yaw: .2, w: 200, h: 148 },
];
const hudScene = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
for (const m of mirrors) {
  m.cam.position.set(...m.pos); m.cam.rotation.y = m.yaw;
  m.frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false }));
  m.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: m.rt.texture, side: THREE.DoubleSide }));
  m.mesh.position.z = .1; hudScene.add(m.frame, m.mesh);
}

let session = null, backdrop = null, screen = 'menu', curLesson = null, curMode = 'top', last = performance.now(), clock = 0, camHd = 0, blinkPrev = false, focusI = 0;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight; renderer.setPixelRatio(store.quality === 'high' ? Math.min(devicePixelRatio || 1, 2) : 1); renderer.setSize(w, h, false);
  topCam.aspect = fpCam.aspect = w / h; topCam.updateProjectionMatrix(); fpCam.updateProjectionMatrix();
  hudCam.right = w; hudCam.top = h; hudCam.updateProjectionMatrix();
  const s = Math.min(h / 900, w / 1500), place = (m, x, y) => { m.mesh.scale.set(-m.w * s, m.h * s, 1); m.frame.scale.set(m.w * s + 10, m.h * s + 10, 1); m.mesh.position.set(x, y, .1); m.frame.position.set(x, y, 0); };
  place(mirrors[0], w / 2, h - 14 - mirrors[0].h * s / 2); place(mirrors[1], 16 + mirrors[1].w * s / 2, h * .5); place(mirrors[2], w - 16 - mirrors[2].w * s / 2, h * .5);
}
addEventListener('resize', resize);

// ---------- UI glue ----------
const ui = {
  coach(text) { $('coachText').textContent = text; const c = $('coach'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); sound.sfx('info'); },
  toast(text, type = 'info', pts) {
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = (type === 'bad' && pts ? `−${pts}  ` : type === 'good' ? '★  ' : '') + text;
    const box = $('toasts'); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), type === 'info' ? 2200 : 5200);
    sound.sfx(type === 'bad' ? 'bad' : type === 'good' ? 'good' : 'click');
  },
  flash(text) { const f = $('flash'); f.textContent = text; f.classList.toggle('hidden', !text); },
  sfx(n) { sound.sfx(n); },
  result(s) { setTimeout(() => showResult(s), s.state === 'win' ? 900 : 1300); sound.siren(false); sound.sfx(s.state === 'win' ? 'win' : 'bad'); },
};
const stub = { coach() { }, toast() { }, flash() { }, sfx() { }, result() { } };

function show(name) {
  screen = name; for (const el of document.querySelectorAll('.screen')) el.classList.toggle('hidden', el.id !== name);
  $('hud').classList.toggle('hidden', name !== 'game'); focusI = 0;
  if (name !== 'game') { sound.engine(800, 0, false); sound.horn(false); if (name !== 'pause') sound.siren(false); setTimeout(() => focusables()[0]?.focus(), 30); }
}
const focusables = () => [...document.querySelectorAll(`#${screen} button:not([disabled])`)];
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);

function showLessons(mode) {
  curMode = mode; $('lessonsTitle').textContent = mode === 'top' ? 'Top View — Rules of the Road' : 'First Person — Behind the Wheel';
  const grid = $('lessonGrid'); grid.innerHTML = '';
  LESSONS.filter(l => l.mode === mode).forEach((l, i) => {
    const b = document.createElement('button'); b.className = 'card';
    b.innerHTML = `<span class="num">${i + 1}</span><span class="ct"></span><span class="cb"></span><span class="stars">${starStr(store.stars[l.id] || 0)}</span>`;
    b.querySelector('.ct').textContent = l.title; b.querySelector('.cb').textContent = l.blurb; b.onclick = () => showBrief(l); grid.appendChild(b);
  });
  show('lessons');
}
function showBrief(l) {
  curLesson = l; $('briefTitle').textContent = l.title; $('briefMode').textContent = l.mode === 'top' ? 'TOP VIEW' : 'FIRST PERSON';
  const ul = $('briefRules'); ul.innerHTML = ''; for (const r of l.rules) { const li = document.createElement('li'); li.textContent = r; ul.appendChild(li); }
  $('briefTrans').textContent = store.manual ? 'Manual transmission' : 'Automatic transmission'; show('brief');
}
function startLesson(l) {
  sound.init(); curLesson = l; if (session) session.world.dispose(); if (backdrop) { backdrop.world.dispose(); backdrop = null; }
  $('toasts').innerHTML = ''; ui.flash('');
  session = new Session(renderer, l, { manual: store.manual }, ui);
  const p = session.player; session.world.sun.castShadow = store.quality === 'high';
  if (session.fp) { p.model.add(fpCam); fpCam.position.set(.37, 1.22, .02); for (const m of mirrors) p.model.add(m.cam); p.cockpit.visible = true; p.model.userData.body.visible = false; }
  else { session.world.root.add(topCam); camHd = p.h; }
  $('hud').className = session.fp ? 'fp' : 'top'; $('coachTitle').textContent = l.title; $('gears').innerHTML = p.gears.map(g => `<span data-g="${g}">${g}</span>`).join('');
  $('hintKeys').innerHTML = hintHtml(session.fp); lastSign = null; $('signAhead').classList.add('hidden');
  show('game'); last = performance.now();
}
function hintHtml(fp) {
  const rows = [['W / S', 'RT / LT', 'Gas / Brake'], ['A / D', 'L-stick', 'Steer'], ['Q / E', 'LB / RB', 'Turn signals'], ['F / R', 'A / B', 'Gear up / down'], ['L', 'Y', 'Headlights'], ['K', 'D-pad ↑', 'Wipers'], ['Space', 'D-pad →', 'Parking brake']];
  if (fp) rows.push(['Z / C / V', 'R-stick', 'Look left / right / back'], ['B', 'D-pad ↓', 'Seat belt']);
  rows.push(['H', 'X', 'Horn'], ['Esc', 'Start', 'Pause']);
  return rows.map(r => `<div><kbd>${r[0]}</kbd><kbd class="pad">${r[1]}</kbd><span>${r[2]}</span></div>`).join('');
}
function showResult(s) {
  if (s !== session) return; const win = s.state === 'win' && s.score >= 70, st = win ? s.stars : 0;
  $('resTitle').textContent = win ? 'Lesson Passed!' : s.state === 'win' ? 'Finished — but too many mistakes' : 'Lesson Failed';
  $('resTitle').className = win ? 'good' : 'bad'; $('resStars').textContent = starStr(st); $('resScore').textContent = `Score ${Math.round(s.score)} / 100` + (win ? '' : '  (70 needed to pass)');
  $('resWhy').textContent = s.state === 'fail' ? s.failText : win && !s.violations.length ? 'A perfect drive — no violations.' : '';
  const ul = $('resList'); ul.innerHTML = ''; const seen = {};
  for (const v of s.violations) { if (seen[v.text]) { seen[v.text].n++; continue; } seen[v.text] = { n: 1, pts: v.pts }; }
  for (const t in seen) { const li = document.createElement('li'); li.textContent = `${t}${seen[t].n > 1 ? ` (×${seen[t].n})` : ''}`; ul.appendChild(li); }
  const rl = $('resRules'); rl.innerHTML = ''; for (const r of s.lesson.rules) { const li = document.createElement('li'); li.textContent = r; rl.appendChild(li); }
  if (st > (store.stars[s.lesson.id] || 0)) { store.stars[s.lesson.id] = st; persist(); }
  const list = LESSONS.filter(l => l.mode === s.lesson.mode), nx = list[list.indexOf(s.lesson) + 1];
  $('resNext').classList.toggle('hidden', !win || !nx); $('resNext').onclick = () => showBrief(nx);
  show('result'); if (win && nx) setTimeout(() => $('resNext').focus(), 40);
}
function toMenu() { if (session) { session.world.dispose(); session = null; } makeBackdrop(); show('menu'); }
function makeBackdrop() {
  if (backdrop) return; backdrop = new Session(renderer, LESSONS.find(l => l.id === 't5'), {}, stub);
  backdrop.goalObj.mesh.visible = false; backdrop.world.root.add(topCam); backdrop.player.model.visible = false; backdrop.player.place(1.8, 300, Math.PI);
}
function syncSettings() {
  $('optTrans').textContent = 'Transmission: ' + (store.manual ? 'Manual' : 'Automatic'); $('optSound').textContent = 'Sound: ' + (store.sound ? 'On' : 'Off'); $('optQuality').textContent = 'Graphics: ' + (store.quality === 'high' ? 'High' : 'Performance');
}

// ---------- buttons ----------
const on = (id, fn) => $(id).addEventListener('click', () => { sound.init(); sound.sfx('click'); fn(); });
on('btnTop', () => showLessons('top')); on('btnFp', () => showLessons('fp')); on('btnControls', () => show('controls')); on('controlsBack', () => show('menu'));
on('lessonsBack', () => show('menu')); on('briefBack', () => showLessons(curLesson.mode)); on('briefStart', () => startLesson(curLesson));
on('pauseResume', () => { show('game'); last = performance.now(); }); on('pauseRestart', () => startLesson(curLesson)); on('pauseQuit', () => { toMenu(); showLessons(curLesson.mode); });
on('resRetry', () => startLesson(curLesson)); on('resLessons', () => { toMenu(); showLessons(curLesson.mode); });
on('optTrans', () => { store.manual = !store.manual; persist(); syncSettings(); });
on('optSound', () => { store.sound = !store.sound; sound.setOn(store.sound); persist(); syncSettings(); });
on('optQuality', () => { store.quality = store.quality === 'high' ? 'low' : 'high'; persist(); syncSettings(); resize(); });
addEventListener('keydown', e => {
  if (screen === 'game') return; const f = focusables(); if (!f.length) return; let i = f.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowRight'].includes(e.code)) { f[(i + 1) % f.length].focus(); e.preventDefault(); }
  else if (['ArrowUp', 'ArrowLeft'].includes(e.code)) { f[(i - 1 + f.length) % f.length].focus(); e.preventDefault(); }
  else if (e.code === 'Escape') document.querySelector(`#${screen} [data-back]`)?.click();
});
addEventListener('blur', () => { if (screen === 'game' && session?.state === 'run') show('pause'); });

// ---------- HUD ----------
let lastSign = null;
function updateHud(s) {
  const p = s.player, mph = Math.abs(p.v) * MPH, blink = (s.t * 1.5) % 1 < .5;
  $('speed').textContent = Math.round(mph); $('gauge').style.setProperty('--p', Math.min(mph / 90, 1)); $('gauge').classList.toggle('over', mph > s.limit + 4.5);
  $('limitN').textContent = s.limit; $('score').textContent = Math.round(s.score);
  for (const el of $('gears').children) el.classList.toggle('on', el.dataset.g === p.gear);
  $('blL').classList.toggle('on', (p.blinker === 'L' || p.hazard) && blink); $('blR').classList.toggle('on', (p.blinker === 'R' || p.hazard) && blink);
  if ((p.blinker || p.hazard) && blink !== blinkPrev) sound.sfx('blink'); blinkPrev = blink;
  $('icLights').className = 'ic' + (p.lights === 2 ? ' hi' : p.lights ? ' on' : ''); $('icLights').textContent = p.lights === 2 ? 'HIGH' : 'LIGHTS';
  $('icBelt').className = 'ic' + (p.belt ? ' on' : ' warn'); $('icBrake').className = 'ic' + (p.handbrake ? ' warn' : ''); $('icWipers').className = 'ic' + (p.wipers ? ' on' : '');
  $('rpm').style.width = Math.min(100, p.rpm / 65) + '%'; $('rpmWrap').classList.toggle('hidden', !p.manual);
  const g = $('gap'); g.classList.toggle('hidden', !(s.showGap && s.gapS !== null));
  if (s.showGap && s.gapS !== null) { g.textContent = `GAP ${s.gapS.toFixed(1)} s`; g.className = s.gapS < 2 ? 'bad' : s.gapS < 2.8 ? 'warn' : s.gapS <= 5.5 ? 'good' : 'warn'; }
  const sg = $('sig'); sg.classList.toggle('hidden', !s.sigAhead);
  if (s.sigAhead) { const st = s.sigAhead, b = (s.t * 1.6) % 1 < .5; sg.dataset.s = st === 'flash-red' ? (b ? 'red' : 'off') : st === 'flash-yellow' ? (b ? 'yellow' : 'off') : st; }
  if (s.signAhead !== lastSign) { lastSign = s.signAhead; const im = $('signAhead'); im.classList.toggle('hidden', !lastSign); if (lastSign) im.src = lastSign.canvas.toDataURL(); }
  $('hintKeys').classList.toggle('usepad', input.usingPad);
  sound.engine(p.rpm, input.state.throttle, true); sound.horn(p.horn); sound.tick(s.t);
}

function updateCams(s, dt) {
  const p = s.player;
  if (s.fp) { fpCam.rotation.set(0, Math.PI + p.lookAng, 0); return; }
  camHd += wrap(p.h - camHd) * Math.min(1, dt * 3.2); const sp = Math.abs(p.v), [fx, fz] = fwd(camHd), H = 30 + sp * 1.3, back = 9 + sp * .12, ah = 6 + sp * .95;
  topCam.position.set(p.x - fx * back, H, p.z - fz * back); topCam.up.set(0, 1, 0); topCam.lookAt(p.x + fx * ah, 0, p.z + fz * ah);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
  const inp = input.poll(screen !== 'game');
  if (screen === 'game' && session) {
    if (inp.pressed.pause && session.state === 'run') show('pause');
    else { session.update(dt, inp); updateCams(session, dt); updateHud(session); }
  } else {
    if (inp.nav) { const f = focusables(); if (f.length) { focusI = (Math.max(0, f.indexOf(document.activeElement)) + inp.nav + f.length) % f.length; f[focusI].focus(); } }
    if (inp.pressed.confirm && input.pad) (document.activeElement?.tagName === 'BUTTON' ? document.activeElement : focusables()[0])?.click();
    if (inp.pressed.back) document.querySelector(`#${screen} [data-back]`)?.click();
    if (inp.pressed.pause && screen === 'pause') $('pauseResume').click();
  }
  const s = session || backdrop; if (!s) return;
  if (!session) { backdrop.update(dt, { throttle: 0, brake: 1, steer: 0, look: '', pressed: {} }); const a = clock * .08; topCam.position.set(Math.cos(a) * 52, 24, Math.sin(a) * 52); topCam.lookAt(0, 2, 0); }
  const cam = session && s.fp ? fpCam : topCam, p = s.player;
  cam.getWorldPosition(v1); (session ? p.model.getWorldPosition(v2) : v2.set(0, 0, 0));
  s.world.update(screen === 'game' || !session ? dt : 0, s.t, v1, v2);
  renderer.shadowMap.needsUpdate = store.quality === 'high';
  if (session && s.fp) {
    p.cockpit.visible = false;
    for (const m of mirrors) { renderer.setRenderTarget(m.rt); renderer.render(s.world.scene, m.cam); }
    p.cockpit.visible = true; renderer.setRenderTarget(null);
  }
  renderer.render(s.world.scene, cam);
  if (session && s.fp) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(hudScene, hudCam); renderer.autoClear = true; }
}

syncSettings(); resize(); makeBackdrop(); show('menu'); requestAnimationFrame(frame);
window.__game = { get session() { return session; }, startLesson, LESSONS, input, store, get screen() { return screen; } };
