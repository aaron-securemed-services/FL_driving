// All lessons. Each builds a small scene with the Session API (k) and scripts its teaching moments.
import { THREE, LW, MPH, N, S, E, W, wrap } from './world.js';

const P = (x, z, o) => ({ x, z, ...o });
const mph = k => Math.abs(k.player.v) * MPH;

export const LESSONS = [
  // =====================================================================================
  //  TOP VIEW — RULES OF THE ROAD
  // =====================================================================================
  {
    id: 't1', mode: 'top', title: 'First Drive: Lanes, Speed & Stop Signs', blurb: 'Stay in your lane, hold 30 mph, make a full stop, turn right.',
    rules: ['Drive on the RIGHT side of the road, centered in your lane.', 'Residential and business districts: 30 mph unless a sign says otherwise.', 'STOP sign: come to a COMPLETE stop at the stop line, yield, then go.', 'Signal at least 100 feet before every turn.'],
    build(k) {
      const w = k.world; k.cross(0, 0, { stop: 'SN', len: 130, xwalk: true });
      w.sign('speed', 5.6, 100, N, '30'); k.start(1.8, 120, N);
      k.traffic([P(-128, 1.8), P(128, 1.8)], { speed: 12, loop: true, priority: true });
      k.traffic([P(-128, 1.8), P(128, 1.8)], { speed: 12, loop: true, priority: true, s0: 100 });
      k.traffic([P(128, -1.8), P(-128, -1.8)], { speed: 12, loop: true, priority: true, s0: 40 });
      k.route([P(1.8, 115), P(1.8, 1.8), P(92, 1.8)]); k.goal(98, 1.8, 4);
      k.say('Welcome! Hold W / ↑ (or {RT} on a controller) to accelerate. Steer with A / D. Stay in the right lane at or below 30 mph.');
      k.tip(1.8, 62, 10, 'STOP sign ahead. Turn on your RIGHT signal now (E key / {RB}). Florida law: signal at least 100 ft before turning.');
      k.tip(1.8, 28, 8, 'Brake smoothly (S / ↓ / {LT}) and come to a COMPLETE stop before the white stop line.');
      k.tip(1.8, 12, 4, 'Cross traffic does not stop. Wait for a safe gap, then turn right into the nearest lane.');
      w.scenery(-150, -150, 150, 150, { houses: 26, trees: 45, palms: 30, seed: 11 });
    },
  },
  {
    id: 't2', mode: 'top', title: 'Traffic Signals & Right on Red', blurb: 'Green, yellow, red — and Florida’s right-turn-on-red rule.',
    rules: ['GREEN: go, if the intersection is clear.', 'YELLOW: the light is about to turn red. Stop if you can do so safely.', 'RED: stop behind the stop line and stay stopped.', 'Right on red is allowed in Florida after a COMPLETE stop and yielding — unless a sign says NO TURN ON RED.'],
    build(k) {
      const w = k.world, A = k.cross(0, 0, { control: 'signal', lenN: 152.8, len: 90, xwalk: true }), B = k.cross(0, -160, { control: 'signal', arms: 'NEW', len: 90, xwalk: true });
      const set = (X, ns, ew) => { X.sigs.N?.set(ns); X.sigs.S?.set(ns); X.sigs.E.set(ew); X.sigs.W.set(ew); };
      set(A, 'green', 'red'); set(B, 'red', 'green'); B.sigs.S = w.signal(5.2, -171.1, N, { arm: 3.4 }); B.sigs.S.set('red');
      B.lines.S = k.stopLine(1.8, -151.4, N, 3.6, 'signal', { signal: B.sigs.S, rtor: true }); w.stopGlow(B.sigs.S, 1.8, -151.4, N, 3.6); k.crosswalk(0, -154, N, 7.2);
      k.start(1.8, 85, N);
      k.traffic([P(-88, 1.8), P(-11.2, 1.8, { sig: A.sigs.W }), P(88, 1.8)], { speed: 11, loop: true });
      k.traffic([P(88, -1.8), P(11.2, -1.8, { sig: A.sigs.E }), P(-88, -1.8)], { speed: 11, loop: true, s0: 30 });
      k.traffic([P(-88, -158.2), P(88, -158.2)], { speed: 12, loop: true, priority: true });
      k.traffic([P(-88, -158.2), P(88, -158.2)], { speed: 12, loop: true, priority: true, s0: 70 });
      k.traffic([P(88, -161.8), P(-88, -161.8)], { speed: 12, loop: true, priority: true, s0: 20 });
      k.route([P(1.8, 80), P(1.8, -158.2), P(78, -158.2)]); k.goal(82, -158.2, 4);
      let ph = 0, T = 0;
      k.onUpdate(() => {
        const p = k.player, d = k.t - T;
        if (ph === 0 && p.z < 52) { ph = 1; T = k.t; set(A, 'yellow', 'red'); k.say('YELLOW: the light is about to turn red. You have room — stop behind the line.'); }
        else if (ph === 1 && d > 3.5) { ph = 2; set(A, 'red', 'red'); }
        else if (ph === 2 && d > 5) { ph = 3; set(A, 'red', 'green'); }
        else if (ph === 3 && d > 12) { ph = 4; set(A, 'red', 'yellow'); }
        else if (ph === 4 && d > 15.5) { ph = 5; set(A, 'red', 'red'); }
        else if (ph === 5 && d > 17) { ph = 6; set(A, 'green', 'red'); k.say('GREEN: check that cross traffic has cleared, then go.'); }
      });
      k.say('Traffic signals. The colored bar on the pavement shows the light for your lane. Drive north toward the first light.');
      k.tip(1.8, -95, 14, 'This light stays RED. You are turning right: signal RIGHT (E / {RB}), make a COMPLETE stop, yield to traffic and pedestrians, then turn right on red.');
      w.scenery(-110, -260, 110, 110, { buildings: 16, trees: 25, palms: 25, seed: 5 });
    },
  },
  {
    id: 't3', mode: 'top', title: 'Four-Way Stops & Right-of-Way', blurb: 'Who goes first? Learn the order at all-way stops.',
    rules: ['Everyone must stop at a four-way (all-way) stop.', 'The first vehicle to stop is the first to go.', 'If two vehicles stop at the same time, the driver on the LEFT yields to the driver on the RIGHT.', 'Nobody “has” the right-of-way — the law only says who must yield.'],
    build(k) {
      const w = k.world, X1 = k.cross(0, 0, { control: 'all', lenN: 162.8, len: 100 }), X2 = k.cross(0, -170, { control: 'all', arms: 'NEW', len: 100 });
      X2.lines.S = k.stopLine(1.8, -165.2, N, 3.6, 'stop', { allway: X2.mgr }); w.sign('stop', 5.3, -165.2, N, 'STOP');
      k.start(1.8, 95, N);
      const a = k.traffic([P(-32, 1.8), P(-7.3, 1.8, { allway: X1.mgr }), P(98, 1.8)], { speed: 10, frozen: true });
      const b = k.traffic([P(-1.8, -40), P(-1.8, -7.3, { allway: X1.mgr }), P(-1.8, 98)], { speed: 10, frozen: true });
      const c = k.traffic([P(75, -1.8), P(7.3, -1.8, { allway: X1.mgr }), P(-98, -1.8)], { speed: 10, frozen: true });
      const d = k.traffic([P(90, -171.8), P(7.3, -171.8, { allway: X2.mgr }), P(-98, -171.8)], { speed: 10, frozen: true });
      k.route([P(1.8, 90), P(1.8, -235)]); k.goal(1.8, -240, 4);
      let rel = false, s1 = false;
      k.onUpdate(() => {
        const p = k.player;
        if (p.z < 58) a.frozen = b.frozen = false; if (p.z < 22) c.frozen = false;
        if (X1.lines.S.stopped && !s1) { s1 = true; k.say('Two cars stopped before you, so they go first. The car that arrived after you must wait for YOU. Go when it is your turn.'); }
        if (!rel) {
          const hold = d.path.holds[0], pd = (p.z - 2.2) - X2.lines.S.z;
          if (pd < 75) { d.s = Math.max(0, hold.s - Math.max(pd, 0)); d.v = p.v; d.place(); }
          if (X2.lines.S.stopped || pd < -.5) { rel = true; d.frozen = false; d.s = hold.s - .2; d.v = 0; X2.mgr.queue = [d, ...X2.mgr.queue.filter(q => q !== d)];
            k.say('You and the car on your RIGHT stopped at the same time. The driver on the left (you) yields to the driver on the right.'); }
        }
      });
      k.say('All-way stop ahead. Watch which cars stop before you do.');
      k.tip(1.8, -60, 12, 'Another four-way stop. A car is coming from your right at the same time as you…');
      w.scenery(-120, -270, 120, 120, { houses: 30, trees: 40, palms: 20, seed: 23 });
    },
  },
  {
    id: 't4', mode: 'top', title: 'Left Turns: Yield to Oncoming Traffic', blurb: 'A green light does not mean a clear path.',
    rules: ['On a plain green light, left-turning drivers must YIELD to oncoming traffic and pedestrians.', 'A green ARROW means your turn is protected.', 'Signal left 100 ft ahead, wait with wheels straight, and turn into the nearest lane going your way.'],
    build(k) {
      const w = k.world, X = k.cross(0, 0, { control: 'signal', len: 125 });
      for (const a of 'NS') X.sigs[a].set('green'); for (const a of 'EW') X.sigs[a].set('red');
      k.start(1.8, 105, N);
      for (const s0 of [0, 26, 52, 80]) k.traffic([P(-1.8, -122), P(-1.8, 122)], { speed: 12, loop: true, priority: true, s0 });
      k.route([P(1.8, 100), P(1.8, -1.8), P(-92, -1.8)]); k.goal(-98, -1.8, 4);
      k.say('You will turn LEFT at the light. Your light is green — but oncoming cars have a green too.');
      k.tip(1.8, 55, 10, 'Signal LEFT (Q / {LB}) at least 100 ft before the turn.');
      k.tip(1.8, 14, 6, 'Yield! Stop at the line or ease forward with your wheels straight. Turn only when there is a safe gap in oncoming traffic.');
      w.scenery(-130, -130, 130, 130, { buildings: 10, houses: 12, trees: 30, palms: 25, seed: 31 });
    },
  },
  {
    id: 't5', mode: 'top', title: 'Roundabouts', blurb: 'Yield on entry, travel counter-clockwise, signal your exit.',
    rules: ['Slow down and YIELD to vehicles already in the circle and to pedestrians.', 'Enter to the RIGHT and travel counter-clockwise. Never stop inside the circle.', 'Signal RIGHT as you approach your exit.'],
    build(k) {
      const w = k.world, R0 = 8.5, R1 = 15; w.ring(0, 0, R0, R1); w.palm(0, 0, 1.2); w.palm(3, 2, .9); w.palm(-2.5, -2, 1);
      w.road(0, -115, 0, -R1 + .6); w.road(0, R1 - .6, 0, 115); w.road(-115, 0, -R1 + .6, 0); w.road(R1 - .6, 0, 115, 0);
      for (const q of [1, -1]) for (const e of [1, -1]) { w.pad(e * 3.6, q * 11.5, e * 7.6, q * 23); w.pad(q * 11.5, e * 3.6, q * 23, e * 7.6); } // flared entries and exits
      w.sign('warn', 5.6, 60, N, 'ROUND\nABOUT'); w.sign('yield', 5.6, 20, N); w.sign('yield', -5.6, -20, S); w.sign('yield', -20, 5.6, E); w.sign('yield', 20, -5.6, W);
      k.holdLine(1.8, 16.5, N, 3.6, { active: () => false }); w.line(.3, 16.5, 3.4, 16.5, .35);
      const circ = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2; circ.push(P(11.75 * Math.cos(a), -11.75 * Math.sin(a))); }
      for (const s0 of [5, 30, 50]) k.traffic(circ, { speed: 6.2, loop: true, priority: true, s0, r: 3 });
      k.start(1.8, 100, N);
      const rt = [P(1.8, 96), P(1.8, 19)]; for (let a = -75; a <= 168; a += 9) { const q = a * Math.PI / 180; rt.push(P(11.75 * Math.cos(q), -11.75 * Math.sin(q))); } rt.push(P(-19, -1.8), P(-95, -1.8));
      k.route(rt, 3); k.goal(-100, -1.8, 4);
      k.say('Roundabout ahead. Slow to about 15–20 mph. You will take the THIRD exit (a left turn).');
      k.tip(1.8, 34, 8, 'YIELD to cars already circulating. Enter only when there is a gap — turn right into the circle.');
      k.tip(8, -8.5, 5, 'Keep going counter-clockwise. Signal RIGHT (E / {RB}) just before your exit so others know you are leaving.');
      w.scenery(-130, -130, 130, 130, { houses: 22, trees: 35, palms: 40, seed: 41 });
    },
  },
  {
    id: 't6', mode: 'top', title: 'School Zones & School Buses', blurb: 'Slow to 20, watch for children, and STOP for the bus.',
    rules: ['School zone: obey the posted limit (usually 15–20 mph) when lights flash or during posted hours. Fines are doubled.', 'A school bus with red lights flashing and STOP arm out: traffic in BOTH directions must stop.', 'Exception: on a highway divided by a raised barrier or an unpaved median at least 5 ft wide, drivers going the opposite way may proceed with caution.', 'Stay stopped until the arm is withdrawn and children are clear.'],
    build(k) {
      const w = k.world; w.road(0, -270, 0, 225, { limit: 30 }); w.zone(-12, -60, 12, 60, 20);
      w.sign('school', 5.6, 82, N, 'SCHOOL\nZONE'); w.sign('speed', 5.6, 62, N, '20'); w.sign('ped', 5.6, 14, N); w.sign('reg', 5.6, -62, N, 'END\nSCHOOL\nZONE'); w.sign('speed', 5.6, -75, N, '30');
      w.building(-32, 0, 34, 20, 2); k.crosswalk(0, 0, N, 7.2); k.start(1.8, 200, N);
      for (let i = 0; i < 3; i++) k.ped([P(7 + i * .5, -.6 + i * .6, { wait: () => k.player.z < 40, stop: i * .9 }), P(-9, -.6 + i * .6)], { scale: .68, speed: 1.25 });
      k.ped([P(6.6, 2.4), P(6.61, 2.4)], { vest: true, speed: 0 });
      let busGo = false, armed = false, kidsOut = 0;
      const bus = k.npc('bus', [P(-1.8, -215), P(-1.8, -140, { wait: () => busGo }), P(-1.8, 220)], { speed: 11, frozen: true });
      const kids = [0, 1, 2].map(i => { const d = k.ped([P(-3.6, -133.4, { stop: 1 + i * 1.1 }), P(-1.8, -131.6), P(9, -131.6, { call: () => kidsOut++ })], { scale: .68, speed: 1.2, despawn: false }); d.gone = true; d.place(); return d; });
      k.holdLine(1.8, -122, N, 3.6, { active: () => bus.armOut || bus.armA > .1, key: 'bus', msg: 'You passed a stopped school bus with its STOP arm out! On a two-lane road, traffic in BOTH directions must stop.' });
      k.onUpdate(() => {
        const p = k.player; if (p.z < 10) bus.frozen = false;
        if (!armed && !bus.frozen && bus.v < .05 && bus.z > -142) { armed = true; bus.armOut = true; kids.forEach(d => { d.gone = false; }); k.say('The bus has its red lights flashing and STOP arm out. STOP — even though you are on the other side of the road — and wait.'); }
        if (armed && bus.armOut && kidsOut >= 3) { bus.armOut = false; k.after(2, () => { busGo = true; k.say('Arm withdrawn and children are clear. You may go.'); }); }
      });
      k.route([P(1.8, 195), P(1.8, -245)], 5); k.goal(1.8, -250, 4);
      k.say('School zone ahead with children crossing. Slow to 20 mph before the sign.');
      k.tip(1.8, 45, 8, 'Children in the crosswalk! Stop before the crosswalk and wait until they are completely across.');
      k.tip(1.8, -70, 8, 'A school bus is coming toward you. Yellow flashing lights mean it is about to stop — get ready.');
      w.scenery(-120, -280, 120, 230, { houses: 34, trees: 50, palms: 25, seed: 51, avoid: [[-52, -14, -12, 14]] });
    },
  },
  {
    id: 't7', mode: 'top', title: 'Railroad Crossings', blurb: 'Flashing lights mean stop — 15 to 50 feet from the rails.',
    rules: ['When lights flash, gates lower or a train is approaching: STOP between 15 and 50 feet from the nearest rail.', 'Never drive around lowered gates and never stop ON the tracks.', 'Wait until the gates are fully up and the lights stop flashing — a second train may be coming.'],
    build(k) {
      const w = k.world; w.road(0, -130, 0, 130, { limit: 35, sidewalk: false });
      const grav = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1 }), rail = new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: .8, roughness: .4 });
      for (const sx of [1, -1]) w.box(300, .12, 5, grav, sx * 153.7, .06, 0, 0, false);
      for (const z of [-.75, .75]) w.box(620, .14, .12, rail, 0, .09, z, 0, false);
      w.sign('rr', 5.6, 75, N); w.sign('crossbuck', 5.4, 8.5, N); w.sign('crossbuck', -5.4, -8.5, S);
      const lampM = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff0000, emissiveIntensity: 0 });
      const gates = [[4.4, 7, -1], [-4.4, -7, 1]].map(([x, z, dir]) => {
        w.box(.2, 3.4, .2, w.mat.pole, x, 1.7, z); for (const dx of [-.4, .4]) { const l = w.box(.34, .34, .2, lampM, x + dx, 3, z, 0, false); if (w.top) { l.scale.setScalar(2.4); l.position.y = 3.6; } }
        const g = new THREE.Group(); g.position.set(x, 1.1, z); const arm = new THREE.Mesh(new THREE.BoxGeometry(4.6, .14, .14), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaa0000, emissiveIntensity: .3 })); arm.position.x = dir * 2.3; arm.castShadow = true; g.add(arm); w.add(g); return { g, dir };
      });
      const train = new THREE.Group(), tm = new THREE.MeshStandardMaterial({ color: 0x2f5fa8, metalness: .4, roughness: .5 }), cm = new THREE.MeshStandardMaterial({ color: 0x8c3b2a, roughness: .8 });
      for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(17, i ? 3.6 : 4.2, 3), i ? cm : tm); c.position.set(-i * 18.5 - 8.5, 2.3, 0); c.castShadow = true; train.add(c); }
      train.position.x = -600; w.add(train);
      let flashing = false, T = 0, gateA = 0, judged = false;
      k.stopLine(1.8, 6.6, N, 3.6, 'hold', { active: () => flashing, key: 'rail', msg: 'You crossed the tracks while the warning lights were flashing!' });
      k.onUpdate((dt) => {
        const p = k.player, front = train.position.x;
        if (!T && p.z < 78) { T = k.t; flashing = true; k.ui.sfx('bell'); k.say('Lights are flashing — a train is coming. Stop between 15 and 50 feet from the rails, behind the stop line.'); }
        if (T) { const e = k.t - T; if (e > 4.5) train.position.x = -230 + (e - 4.5) * 24; if (flashing && front - 150 > 14) { flashing = false; k.say('The train has passed, the gates are up and the lights are off. Look both ways, then cross without stopping on the tracks.'); } }
        gateA += Math.sign((flashing ? 1 : 0) - gateA) * Math.min(dt * .5, Math.abs((flashing ? 1 : 0) - gateA));
        gates.forEach(({ g, dir }) => g.rotation.z = dir * 1.35 * (1 - gateA)); lampM.emissiveIntensity = flashing && (k.t * 2) % 1 < .5 ? 6 : 0;
        if (Math.abs(p.z) < 3.9 && p.x < front + 1 && p.x > front - 150) k.crash('You were hit by a train. Never try to beat a train or stop on the tracks.');
        if (flashing && !judged && Math.abs(p.v) < .1 && p.z < 30 && p.z > 0) { judged = true; const d = p.z - 2.2 - .75; if (d < 4.4) k.violate('railclose', 'Too close! Stop at least 15 feet from the nearest rail.', 10); else if (d < 15.5) k.praise('Stopped between 15 and 50 ft from the rails.'); }
      });
      k.start(1.8, 115, N); k.route([P(1.8, 110), P(1.8, -105)], 5); k.goal(1.8, -110, 4);
      k.say('Railroad crossing ahead. The round yellow sign is your advance warning: slow down, look and listen.');
      w.scenery(-130, -140, 130, 140, { houses: 10, trees: 60, palms: 20, seed: 61, avoid: [[-400, -8, 400, 8]] });
    },
  },
  {
    id: 't8', mode: 'top', title: 'Emergency Vehicles & the Move Over Law', blurb: 'Pull over for sirens. Move over for stopped vehicles.',
    rules: ['Emergency vehicle approaching with lights or siren: pull over to the closest edge of the road (clear of intersections) and STOP until it passes.', 'Move Over law: for stopped emergency, law-enforcement, tow, utility, sanitation or disabled vehicles showing warning lights — move over one lane.', 'If you cannot move over safely, slow to 20 mph below the speed limit (or to 5 mph if the limit is 20 or less).'],
    build(k) {
      const w = k.world; w.road(0, 170, 0, -400, { f: 2, b: 2, limit: 45, shoulder: 2.6, sidewalk: false });
      k.start(5.4, 150, N); w.sign('speed', 11.5, 130, N, '45'); w.sign('reg', 11.5, -110, N, 'MOVE\nOVER\nOR\nSLOW\nDOWN');
      const amb = k.npc('ambulance', [P(1.8, 168), P(1.8, -398)], { speed: 27, frozen: true, flash: true }); amb.gone = true; amb.place();
      for (const s0 of [0, 180, 330]) k.traffic([P(-1.8 - (s0 % 2 ? 3.6 : 0), -398), P(-1.8 - (s0 % 2 ? 3.6 : 0), 168)], { speed: 19, loop: true, s0 });
      k.parked(8.6, -210, N, 'police', { flash: true }); k.parked(8.6, -219, N, 'sedan', { hazard: true });
      let ph = 0, judged = false;
      k.onUpdate(() => {
        const p = k.player;
        if (ph === 0 && p.z < 75) { ph = 1; amb.gone = false; amb.frozen = false; amb.s = 168 - Math.min(p.z + 80, 167); amb.v = 27; k.ui.sfx('siren'); k.say('SIREN behind you! Signal, pull over to the RIGHT edge of the road and STOP until the ambulance passes.'); }
        if (ph === 1) {
          if (amb.blockedBy === p) k.violate('emerg-block', 'You are blocking the ambulance! Move right and stop.', 10);
          if (amb.z < p.z - 4) { ph = 2; k.ui.sfx('sirenOff'); if (Math.abs(p.v) > 1 || p.x < 4.2) k.violate('emerg', 'You must pull over to the right edge and STOP for emergency vehicles using lights or sirens.', 20); else k.praise('Pulled over and stopped for the ambulance.'); k.say('Clear. Signal left, check for traffic and continue in the right lane.'); }
        }
        if (p.z < -190 && p.z > -232 && !judged && p.x > 3.6 && mph(k) > 27) { judged = true; k.violate('moveover', 'Move Over law: change lanes away from stopped emergency vehicles, or slow to 20 mph under the limit.', 15); }
      });
      k.goal(3.6, -380, 6);
      k.say('Four-lane road, 45 mph. Stay in the right lane and listen for sirens.');
      k.tip(5.4, -95, 12, 'A police car is stopped on the right shoulder with lights flashing. MOVE OVER: signal left (Q / {LB}) and change to the left lane — or slow to 25 mph if you cannot.');
      k.tip(1.8, -250, 9, 'Past the stopped vehicles. Signal right and return to the right lane.');
      w.scenery(-130, -410, 130, 180, { buildings: 14, trees: 45, palms: 45, seed: 71 });
    },
  },
  {
    id: 't9', mode: 'top', title: 'Passing & No-Passing Zones', blurb: 'Read the yellow lines before you pass that slow truck.',
    rules: ['Solid yellow line on your side (or double solid): NO passing.', 'Broken yellow line: you may pass when the oncoming lane is clear far ahead.', 'Signal, pass on the left, and return before you are within 200 ft of oncoming traffic. Never exceed the speed limit to pass.', 'Default limit outside towns: 55 mph.'],
    build(k) {
      const w = k.world; w.road(0, 320, 0, 0, { limit: 55, sidewalk: false }); w.road(0, 0, 0, -450, { limit: 55, sidewalk: false, center: 'by', passing: true }); w.road(0, -450, 0, -760, { limit: 55, sidewalk: false });
      w.sign('speed', 5.6, 300, N, '55'); w.sign('reg', 5.6, 270, N, 'DO\nNOT\nPASS'); w.sign('reg', 5.6, -8, N, 'PASS\nWITH\nCARE'); w.sign('warn', 5.6, -400, N, 'NO\nPASSING\nZONE');
      const truck = k.npc('truck', [P(1.8, 250), P(1.8, -755)], { speed: 15.6, despawn: false, color: 0x2f6fd6 });
      const on = k.traffic([P(-1.8, -190), P(-1.8, 315)], { speed: 23, frozen: true, priority: true });
      k.start(1.8, 305, N); k.goal(1.8, -720, 5, { cond: () => k.player.z < truck.z });
      let told = false;
      k.onUpdate(() => {
        const p = k.player; if (p.z < 215) on.frozen = false;
        if (!told && p.z < -10 && on.z > p.z) { told = true; k.say('Broken yellow line and the oncoming lane is clear. Signal LEFT, pass the truck, signal RIGHT, and return to your lane before the solid lines begin.'); }
        if (truck.z < -700 && p.z > truck.z) k.fail('You stayed behind the truck. Pass where the yellow line is BROKEN and the oncoming lane is clear.');
      });
      k.say('Rural two-lane road, 55 mph. A slow truck is ahead. Double solid yellow lines here: do NOT pass yet — and keep a safe following distance.');
      w.scenery(-140, -770, 140, 330, { houses: 6, trees: 150, palms: 60, seed: 81 });
    },
  },
  {
    id: 't10', mode: 'top', title: 'Highway: Merge, Lanes & Exit', blurb: 'Get up to speed, merge, keep right, and exit at 70 mph limits.',
    rules: ['Use the acceleration lane to match highway speed, signal, and merge into a gap. Highway traffic has the right-of-way.', 'Interstate limit: 70 mph (minimum 50 mph where the limit is 70).', 'Keep right except to pass. Florida law prohibits cruising in the far-left lane when faster traffic approaches.', 'Move to the exit lane early and slow down ON the ramp, not on the highway.'],
    build(k) {
      const w = k.world, g = 'hwy', o = { b: 0, limit: 70, group: g, sidewalk: false };
      w.road(0, 560, 0, 150, { ...o, f: 4 }); w.road(0, 150, 0, -640, { ...o, f: 3 }); w.road(0, -640, 0, -900, { ...o, f: 4 }); w.zone(10.8, -900, 15, -720, 45);
      w.sign('speed', 16.5, 520, N, '70'); w.sign('warn', 16.5, 330, N, 'LANE\nENDS\nMERGE\nLEFT'); w.sign('guide', 13, -420, N, 'EXIT\n1/4 MILE'); w.sign('guide', 16.5, -636, N, 'EXIT ↗'); w.sign('warn', 16.5, -715, N, 'RAMP\n45 MPH');
      for (let z = 160; z > 100; z -= 8) w.B.white.quad(11.2 + (160 - z) * .02, z, 5, .2, N);
      const lane = (x, speed, list, type) => list.forEach(s0 => k.traffic([P(x, 555), P(x, -895)], { speed, loop: true, s0, type: s0 === 320 ? 'truck' : type }));
      lane(9, 27, [150, 320, 560, 800, 1050, 1300]); lane(5.4, 30, [60, 400, 720, 1100]); lane(1.8, 33, [230, 640, 980]);
      k.start(12.6, 545, N); k.goal(12.6, -870, 4.5);
      let leftT = 0, slowT = 0;
      k.onUpdate((dt) => {
        const p = k.player, l = k.loc;
        leftT = l?.kind === 'road' && l.idx === 0 ? leftT + dt : 0; if (leftT > 11) { leftT = 0; k.violate('leftlane', 'Keep right! The left lane is for passing — move back to the right when you are done.', 5); }
        slowT = (mph(k) < 50 && p.z < 100 && p.z > -640 && (k.gap === null || k.gap > 45)) ? slowT + dt : 0; if (slowT > 6) { slowT = 0; k.violate('slow', 'Too slow for the highway: where the limit is 70 the minimum is 50 mph.', 5); }
      });
      k.say('You are in the ACCELERATION lane. Speed up to match highway traffic (about 60–70 mph), signal LEFT (Q / {LB}), and merge into a gap before the lane ends.');
      k.tip(9, 60, 9, 'Merged! Stay in the right lane unless passing. Slower truck ahead? Signal, pass in the middle lane, then move back right.');
      k.tip(9, -330, 14, 'Your exit is coming up on the right. Be in the RIGHT lane now.'); k.tip(5.4, -330, 3, 'Your exit is coming up. Signal and move to the RIGHT lane now.');
      k.tip(9, -630, 8, 'Signal RIGHT and move into the exit lane. Slow down once you are on the ramp (45 mph).');
      w.scenery(-150, -910, 170, 570, { trees: 170, palms: 90, buildings: 10, seed: 91 });
    },
  },
  {
    id: 't11', mode: 'top', title: 'Storm: Rain, Dark Signals & Flashing Lights', blurb: 'Wipers on, lights on — and what to do when signals fail.',
    rules: ['Rain, smoke or fog: headlights ON (low beam). “Wipers on, lights on.”', 'Slow down — wet roads can double your stopping distance and cause hydroplaning.', 'Hazard flashers while moving are only allowed on roads 55 mph+ in extremely low visibility.', 'Signal dark (power out): treat it as a FOUR-WAY STOP. Flashing red = stop sign. Flashing yellow = proceed with caution.'],
    build(k) {
      const w = k.world; k.env({ rain: true });
      const X1 = k.cross(0, 0, { control: 'dark', lenN: 162.8, len: 100, limit: 40 }), X2 = k.cross(0, -170, { control: 'signal', arms: 'NEW', len: 100, limit: 40 });
      X2.sigs.S = w.signal(5.2, -179.9, N, { arm: 3.4 }); X2.lines.S = k.stopLine(1.8, -165.2, N, 3.6, 'signal', { signal: X2.sigs.S }); w.stopGlow(X2.sigs.S, 1.8, -165.2, N, 3.6);
      X2.sigs.N.set('flash-yellow'); X2.sigs.S.set('flash-yellow'); X2.sigs.E.set('flash-red'); X2.sigs.W.set('flash-red');
      k.start(1.8, 95, N);
      const a = k.traffic([P(40, -1.8), P(7.3, -1.8, { allway: X1.mgr }), P(-98, -1.8)], { speed: 9, frozen: true });
      const b = k.traffic([P(-1.8, -60), P(-1.8, -7.3, { allway: X1.mgr }), P(-1.8, 98)], { speed: 9, frozen: true });
      k.traffic([P(-70, -168.2), P(-7.3, -168.2, { sig: X2.sigs.W, wait: () => k.player.z < -182 }), P(98, -168.2)], { speed: 9 });
      let wipeT = 0;
      k.onUpdate((dt) => {
        const p = k.player; if (p.z < 60) a.frozen = false; if (p.z < 30) b.frozen = false;
        wipeT = !p.wipers && Math.abs(p.v) > 2 ? wipeT + dt : 0; if (wipeT > 5) { wipeT = 0; k.violate('wipers', 'Turn on your wipers (K) — and remember: wipers on, headlights on.', 5, false, 10); }
      });
      k.route([P(1.8, 90), P(1.8, -240)], 5); k.goal(1.8, -245, 4);
      k.say('Heavy rain! Turn on WIPERS (K / D-pad ↑) and HEADLIGHTS (L / {Y}). Slow down and brake earlier — the road is slippery.');
      k.tip(1.8, 50, 10, 'The traffic signal ahead is DARK — the power is out. Treat it exactly like a four-way stop.');
      k.tip(1.8, -110, 12, 'FLASHING YELLOW for you: slow down and proceed with caution. Cross traffic has flashing RED and must stop.');
      w.scenery(-120, -260, 120, 110, { buildings: 14, houses: 10, trees: 30, palms: 30, seed: 101 });
    },
  },
  {
    id: 't12', mode: 'top', title: 'Work Zones & Bicyclists', blurb: 'Obey the flagger, then pass a cyclist with 3 feet of room.',
    rules: ['Work zones: obey reduced limits, cones and flaggers. Fines are DOUBLED when workers are present.', 'A flagger’s STOP/SLOW paddle has the same authority as a traffic sign.', 'Bicyclists may use the full lane. Pass only when safe, leaving at least 3 FEET between your vehicle and the bicycle.'],
    build(k) {
      const w = k.world; w.road(0, 280, 0, -150, { limit: 45, sidewalk: false }); w.road(0, -150, 0, -440, { limit: 45, sidewalk: false, center: 'by', passing: true }); w.zone(-10, -62, 10, 130, 35);
      w.sign('work', 5.6, 215, N); w.sign('reg', 5.6, 165, N, 'FINES\nDOUBLED\nWHEN\nWORKERS\nPRESENT'); w.sign('speed', 5.6, 132, N, '35'); w.sign('work', 5.6, 60, N, 'FLAGGER\nAHEAD'); w.sign('reg', 5.6, -66, N, 'END\nROAD\nWORK'); w.sign('speed', 5.6, -80, N, '45');
      for (let z = 120; z > -55; z -= 7) k.cone(3.9, z); k.parked(7, 70, N, 'truck', { color: 0xff8a00 });
      for (const [x, z] of [[5.6, 50], [6.4, 44], [5.4, 20], [6.8, 5]]) k.ped([P(x, z), P(x + .01, z)], { vest: true, hat: 0xffd400, speed: 0 });
      k.ped([P(4.9, -14), P(4.91, -14)], { vest: true, hat: 0xffd400, speed: 0 });
      const sStop = w.sign('stop', 4.4, -13.4, N, 'STOP', { size: .6, y: 2 }), sSlow = w.sign('work', 4.4, -13.4, N, 'SLOW', { size: .6, y: 2 }); sSlow.group.visible = false;
      let flagStop = true, T = 0; const ln = k.stopLine(1.8, -6, N, 3.6, 'hold', { active: () => flagStop, key: 'flag', crit: false, pts: 20, msg: 'You drove past a flagger showing STOP. Flaggers have the same authority as a traffic sign.' });
      const onc = k.traffic([P(-1.8, -140), P(-1.8, 275)], { speed: 14, frozen: true });
      const bike = k.npc('bike', [P(2.9, -175), P(2.9, -436)], { speed: 5, frozen: true, despawn: false });
      const c2 = k.traffic([P(-1.8, -345), P(-1.8, 275)], { speed: 19, frozen: true, priority: true });
      let judged = false;
      k.onUpdate(() => {
        const p = k.player;
        if (flagStop && ln.stopped && !T) { T = k.t; onc.frozen = false; k.say('Good. The flagger is holding you while oncoming traffic uses the open lane. Wait for the paddle to turn to SLOW.'); }
        if (flagStop && T && k.t - T > 6) { flagStop = false; sStop.group.visible = false; sSlow.group.visible = true; k.say('The flagger now shows SLOW. Proceed carefully at or below 35 mph.'); }
        if (p.z < -85) bike.frozen = c2.frozen = false;
        if (!judged && Math.abs(p.z - bike.z) < 3 && p.v > bike.v) { if (Math.abs(p.x - bike.x) < 2.1) { judged = true; k.violate('bike', 'Too close! Leave at least 3 FEET when passing a bicyclist — move left, crossing the center line if it is clear.', 10); } }
        if (!judged && p.z < bike.z - 8) { judged = true; k.praise('Safe pass: at least 3 feet of clearance.'); }
      });
      k.start(1.8, 260, N); k.goal(1.8, -420, 4.5);
      k.say('Road work ahead. Slow to the posted work-zone limit and watch for workers, cones and a flagger.');
      k.tip(1.8, 30, 8, 'Flagger ahead showing STOP. Stop before reaching the flagger.');
      k.tip(1.8, -120, 10, 'Bicyclist ahead. Stay behind until the oncoming car has passed, then pass with at least 3 feet of space. The broken yellow line means passing is allowed.');
      w.scenery(-130, -450, 130, 290, { houses: 8, trees: 110, palms: 50, seed: 111 });
    },
  },

  // =====================================================================================
  //  FIRST PERSON — BEHIND THE WHEEL
  // =====================================================================================
  {
    id: 'f1', mode: 'fp', title: 'Before You Drive: The Cockpit Check', blurb: 'Seat belt, mirrors, blind spots, gear — then pull out safely.',
    rules: ['Buckle up before the car moves. Florida law: driver, front passenger and everyone under 18.', 'Adjust and check all three mirrors, then look over your shoulders — mirrors have blind spots.', 'Hold the brake to shift out of Park. Signal and yield before pulling away from the curb.'],
    build(k) {
      const w = k.world; w.road(0, -210, 0, 130, { limit: 30, shoulder: 2.5 });
      k.start(4.85, 80, N, { parked: true, belt: false }); k.parked(4.85, 91, N); k.parked(4.85, 66, N, 'suv'); k.parked(4.85, 40, N); k.parked(-4.85, 55, S, 'suv'); k.parked(-4.85, 20, S);
      const sp = k.spot(4.85, -150, N, 9, 2.5); let step = 0, t0 = 0, car = null, judged = false; const p = k.player;
      k.say('Step 1 — Fasten your seat belt: press B (controller: D-pad ↓).');
      k.onUpdate(() => {
        if (step === 0 && p.belt) { step = 1; t0 = k.t; k.say('Step 2 — Mirrors and blind spots. Look at the three mirrors at the top of the screen, then look LEFT (hold Z), RIGHT (hold C) and BEHIND (hold V). Controller: right stick.'); }
        else if (step === 1 && p.lookT.L > t0 && p.lookT.R > t0 && p.lookT.B > t0) { step = 2; k.say(`Step 3 — Hold the BRAKE (S / {LT}), release the parking brake (Space), and shift into ${k.txt.drive}.`); }
        else if (step === 2 && !p.handbrake && p.gear === (k.manual ? '1' : 'D')) { step = 3; t0 = k.t; car = k.traffic([P(1.8, 128), P(1.8, -205)], { speed: 11, priority: true }); k.say('Step 4 — Signal LEFT (Q / {LB}). Check your left mirror and look over your LEFT shoulder (Z). A car is coming: wait for it to pass, then pull out.'); }
        else if (step === 3 && p.x < 3.3 && !judged) {
          judged = true; step = 4;
          if (p.blinker !== 'L') k.violate('signal', 'Signal before pulling away from the curb.', 5);
          if (k.t - p.lookT.L > 5) k.violate('blind', 'Look over your left shoulder (Z) before pulling out.', 5);
          if (car && !car.gone && car.z > p.z - 2 && car.z < p.z + 22) k.violate('yield', 'You pulled out in front of a car. Vehicles already in the lane have the right-of-way.', 15);
          k.say('Nice. Drive down the street at or below 30 mph. At the green zone, signal right, pull to the curb and stop.');
        } else if (step === 4 && k.inSpot(sp, .3, .25) && Math.abs(p.v) < .05) { step = 5; k.say(`Stopped. Now secure the car: shift to ${k.txt.park}.`); }
        else if (step === 5 && k.secured()) k.win();
      });
      w.scenery(-110, -220, 110, 140, { houses: 30, trees: 40, palms: 25, seed: 201 });
    },
  },
  {
    id: 'f2', mode: 'fp', title: 'Speed Control & Stopping', blurb: 'Hold a steady speed, stop smoothly, and practice the quick stop.',
    rules: ['Check your speedometer often — speed creeps up.', 'Smooth stop: ease off the gas early, brake gently, and stop at the line without a jolt.', 'Road-test “Stop Quickly”: at 20 mph, stop fast and under control when the examiner says STOP.', 'At 30 mph you need roughly 75+ feet to stop — double that on wet roads.'],
    build(k) {
      const w = k.world; w.road(0, 130, 0, -640, { limit: 30 }); w.sign('speed', 5.6, 95, N, '30'); w.sign('stop', 5.4, -150, N); const ln = k.stopLine(1.8, -150, N, 3.6, 'stop');
      k.start(1.8, 115, N); const p = k.player; let st = 0, hold = 0, peak = 0, cue = 0, cueT = 0, ready = 0;
      k.say('Task 1 — Accelerate smoothly to between 25 and 30 mph and HOLD it steady for 5 seconds. Watch the speedometer.');
      k.onUpdate((dt) => {
        const m = mph(k);
        if (st === 0) { hold = m >= 24 && m <= 31 ? hold + dt : 0; if (hold > 5) { st = 1; k.praise('Steady speed control!'); k.say('Task 2 — STOP sign ahead. Ease off early and brake gently so you stop right at the line without a jolt.'); } if (p.z < -60) { st = 1; k.say('Task 2 — STOP sign ahead. Brake gently and stop right at the line.'); } }
        if (st === 1) { if (p.z < -95 && p.z > -150) peak = Math.max(peak, -p.acc); if (ln.stopped) { st = 2; if (peak > 7) k.say('You stopped, but that was a hard brake. Start slowing earlier next time. Task 3 — Quick-stop drill: speed up to 20 mph and hold it.'); else { k.praise('Smooth stop at the line.'); k.say('Task 3 — Quick-stop drill from the road test: speed up to 20 mph and hold it. When you see STOP!, brake hard and stop as fast as you safely can.'); } } }
        if (st === 2 && p.z < -160) { ready = m >= 17 && m <= 25 ? ready + dt : 0; if (ready > 1.5) { st = 3; cue = k.t + 1 + Math.random() * 2.5; } if (p.z < -560) k.fail('Out of road. Hold 20 mph and wait for the STOP! signal.'); }
        if (st === 3 && k.t > cue) { st = 4; cueT = k.t; k.ui.flash('STOP!'); k.ui.sfx('horn'); }
        if (st === 4 && Math.abs(p.v) < .1) { const e = k.t - cueT; k.ui.flash(''); if (e < 2.3) { st = 5; k.praise(`Stopped in ${e.toFixed(1)} s — quick and under control.`); k.say('Excellent. Drive on to the finish.'); k.goal(1.8, p.z - 45, 4); } else { st = 2; ready = 0; k.say(`That took ${e.toFixed(1)} s. React faster and brake firmly. Speed up to 20 mph and try again.`); } }
      });
      w.scenery(-110, -650, 110, 140, { houses: 40, trees: 70, palms: 40, seed: 211 });
    },
  },
  {
    id: 'f3', mode: 'fp', title: 'Mirrors & Blind Spots', blurb: 'The car you cannot see in the mirror — find it before you change lanes.',
    rules: ['Before every lane change: mirror, SIGNAL, then look over your shoulder into the blind spot.', 'A vehicle beside your rear door can be invisible in all three mirrors.', 'Change lanes only when there is a safe gap, one lane at a time, without slowing down.', 'Do not linger in other drivers’ blind spots either.'],
    build(k) {
      const w = k.world; w.road(0, 1000, 0, -1500, { f: 3, b: 0, limit: 40, group: 'a' }); w.sign('speed', 13, 960, N, '40');
      k.start(5.4, 980, N); const p = k.player;
      const sh = k.npc('suv', [P(1.8, 998), P(1.8, -1498)], { speed: 22, frozen: true, accel: 4 }), sh2 = k.npc('sedan', [P(5.4, 998), P(5.4, -1498)], { speed: 8, frozen: true }); sh2.gone = true; sh2.place();
      let ph = 0, t0 = 0;
      const lock = (n, back) => { n.s = Math.max(0, 998 - (p.z + back)); n.v = p.v; n.place(); };
      k.say('Three lanes, all going your way. Task: move to the LEFT lane. First look at your LEFT MIRROR (top-left of the screen) — does the lane look empty? Now check over your left shoulder: hold Z (right stick ←).');
      k.onUpdate(() => {
        if (ph < 2) lock(sh, 5.3);
        if (ph === 0 && p.lookT.L > .5) { ph = 1; t0 = k.t; k.say('There IS a car beside you — hidden in the blind spot. The mirror did not show it! Wait for it to pull ahead.'); }
        if (ph === 1 && k.t - t0 > 3.5) { ph = 2; sh.frozen = false; sh.cruise = Math.max(p.v + 8, 16); sh.v = p.v; }
        if (ph === 2 && sh.z < p.z - 14) { ph = 3; k.say('Now it is clear. Signal LEFT (Q / {LB}), glance over your shoulder again (Z), and move one lane left.'); }
        if (ph >= 2 && ph < 5 && k.loc?.idx === 0) { ph = 5; t0 = k.t; k.praise('Clean lane change to the left.'); sh2.gone = false; k.say('Task 2: return to the MIDDLE lane. Check the right mirror, then look over your RIGHT shoulder: hold C (right stick →).'); }
        if (ph === 5 || ph === 6) lock(sh2, 5.0);
        if (ph === 5 && p.lookT.R > t0) { ph = 6; t0 = k.t; k.say('Another car hiding in your right blind spot. Let it drop back before you move over.'); }
        if (ph === 6 && k.t - t0 > 3) { ph = 7; sh2.frozen = false; sh2.cruise = Math.max(p.v - 7, 2); sh2.v = p.v; }
        if (ph === 7 && sh2.z > p.z + 15) { ph = 8; k.say('Clear on the right. Signal RIGHT (E / {RB}), shoulder check (C), and change lanes.'); }
        if (ph >= 5 && ph < 9 && k.loc?.idx === 1 && k.t - t0 > 1) { ph = 9; k.praise('Mirror, signal, shoulder check — every time.'); k.after(2.5, () => k.win()); }
        if (p.z < -1450) k.fail('Out of road before finishing both lane changes.');
      });
      w.scenery(-120, -1510, 140, 1010, { buildings: 40, trees: 120, palms: 120, seed: 221 });
    },
  },
  {
    id: 'f4', mode: 'fp', title: 'Pedestrians & Crosswalks', blurb: 'Scan the sidewalks. A ball in the road means a child is next.',
    rules: ['Stop for pedestrians in a crosswalk, marked or unmarked, and stay stopped until they are clear.', 'Never pass a vehicle that has stopped for a pedestrian.', 'A person with a white cane or guide dog: come to a COMPLETE stop.', 'When turning, yield to pedestrians crossing the street you are entering. Expect children anywhere near parked cars.'],
    build(k) {
      const w = k.world, X = k.cross(0, -80, { stop: 'S', arms: 'SEW', lenS: 300, len: 90, limit: 25, shoulder: 2.5, xwalk: true });
      w.sign('speed', 8, 150, N, '25'); w.sign('ped', 8, 74, N); k.crosswalk(0, 60, N, 7.2);
      for (const z of [150, 138, 126, 112, 98, 84, 46, 34, 22, 13, -3, -15, -27, -40]) k.parked(4.85, z, N, z % 3 ? 'sedan' : 'suv');
      for (const z of [140, 120, 90, 30, 0, -30]) k.parked(-4.85, z, S, z % 4 ? 'sedan' : 'suv');
      k.start(1.8, 165, N); const p = k.player;
      k.ped([P(7, 60, { wait: () => p.z < 100 }), P(-7, 60), P(-7, 20)], {});
      let ballT = 0; const ball = w.add(new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 10), new THREE.MeshStandardMaterial({ color: 0xff3355, roughness: .4 }))); ball.position.set(6.6, .22, 5); ball.castShadow = true;
      k.ped([P(6.9, 5, { wait: () => ballT && k.t - ballT > .9 }), P(-4.6, 5, { stop: 1.5 }), P(-7, 5)], { scale: .62, speed: 3.3, shirt: 0xffd400 });
      k.ped([P(-7, -74, { wait: () => p.z < -30 }), P(7.2, -74), P(7.2, -60)], { cane: true, speed: 1.0, shirt: 0x444a55 });
      k.ped([P(6, -88, { wait: () => X.lines.S.stopped }), P(6, -72), P(12, -71)], { speed: 1.25 });
      k.onUpdate((dt) => {
        if (!ballT && p.z < 33) { ballT = k.t; k.say('A ball! Brake NOW — a child usually follows a ball into the street.'); }
        if (ballT && ball.position.x > -6.5) { ball.position.x -= 4.2 * dt; ball.rotation.z += 12 * dt; }
      });
      k.route([P(1.8, 160), P(1.8, -78.2), P(70, -78.2)]); k.goal(76, -78.2, 4);
      k.say('Downtown, 25 mph, parked cars on both sides. Keep your eyes moving: sidewalks, crosswalks, gaps between parked cars.');
      k.tip(1.8, 108, 6, 'Marked crosswalk ahead and someone is stepping off the curb. Stop before the crosswalk and wait.');
      k.tip(1.8, -36, 6, 'STOP sign ahead, and a pedestrian with a WHITE CANE is crossing. Stop completely and wait until they reach the sidewalk. Then signal right.');
      k.tip(1.8, -66, 3, 'You are turning RIGHT. Check the crosswalk on the street you are turning into — yield to anyone crossing there.');
      w.scenery(-110, -180, 110, 180, { buildings: 34, trees: 20, palms: 30, seed: 231 });
    },
  },
  {
    id: 'f5', mode: 'fp', title: 'Following Distance', blurb: 'Count three to four seconds — and be ready for a sudden stop.',
    rules: ['Keep a following distance of at least 3–4 seconds in good conditions; more in rain, at night or behind trucks.', 'Pick a fixed object. When the car ahead passes it, count “one-thousand-one…”. You should not reach it before “three”.', 'Watch brake lights far ahead and cover the brake early.'],
    build(k) {
      const w = k.world; w.road(0, 320, 0, -960, { limit: 45, sidewalk: false }); w.sign('speed', 5.6, 290, N, '45');
      const lead = k.npc('suv', [P(1.8, 268), P(1.8, -955)], { speed: 0, accel: 2.2, despawn: false, color: 0xe9e9ec }); lead.decel = 3;
      k.start(1.8, 300, N); k.showGap = true; k.gapMin = 1.8; const p = k.player; let good = 0, tot = 0, st = 0, T = 0;
      k.say('Follow the white SUV. Keep the GAP readout between 3 and 4 seconds. It will change speed — and at some point brake hard.');
      k.onUpdate((dt) => {
        let c = 17.9; const z = lead.z;
        if (z < -80 && z > -230) c = 11; if (st === 0 && z < -470) { st = 1; T = k.t; }
        if (st === 1) { c = 0; lead.decel = 8.5; if (lead.v < .1 && k.t - T > 5) { st = 2; lead.decel = 3; k.say('That is why you leave space. If you had been tailgating you would have hit it. Keep following to the finish.'); } }
        if (k.gap !== null && k.gap > 75) c = Math.min(c, 5); lead.cruise = p.z < 299 || p.v > .5 ? c : 0;
        if (k.gapS !== null && p.v > 8) { tot += dt; if (k.gapS >= 2.7 && k.gapS <= 5.5) good += dt; }
      });
      k.goal(1.8, -900, 5, { cond: () => { if (tot > 5) k.ui.toast(`You kept a safe 3–4 s gap ${Math.round(good / tot * 100)}% of the time.`, 'good'); return true; } });
      w.scenery(-130, -970, 130, 330, { houses: 10, trees: 170, palms: 80, seed: 241 });
    },
  },
  {
    id: 'f6', mode: 'fp', title: 'Straight-In Parking', blurb: 'Pull into a space, centered — then back out safely.',
    rules: ['Road-test maneuver: park straight in, centered between the lines, without crossing them.', 'Signal, go slowly, and start turning when your mirror passes the first line of the space.', 'Backing out: look behind you, go at walking speed, and yield to everyone.', 'Shift to Park and set the parking brake before leaving the car.'],
    build(k) {
      const w = k.world; w.pad(-21, -18, 21, 18, { limit: 10 }); w.road(21, 2, 60, 2, { limit: 15, sidewalk: false, marks: false });
      const xs = []; for (let i = -7; i <= 7; i++) xs.push(i * 2.7);
      for (const zz of [[-18, -12.5], [12.5, 18]]) for (let i = -7.5; i <= 7.5; i++) w.line(i * 2.7, zz[0], i * 2.7, zz[1], .12);
      xs.forEach((x, i) => { if (![9, 3, 12].includes(i)) k.parked(x, -15.2, i % 2 ? N : S, i % 3 ? 'sedan' : 'suv'); if (![2, 6, 7, 11].includes(i)) k.parked(x, 15.2, i % 2 ? S : N, i % 3 ? 'suv' : 'sedan'); });
      w.building(0, -34, 44, 14, 2); w.sign('blue', 5.4, -19.2, S, 'P', { size: .7 });
      const sp = k.spot(5.4, -15.25, N, 5.5, 2.7); k.start(-17, 3, E); const p = k.player; let st = 0;
      k.say('Parking lot — keep it under 10 mph. Pull straight into the GREEN space on your left side of the aisle ahead. Signal, turn in slowly, and stop centered between the lines.');
      k.onUpdate(() => {
        if (st === 0 && k.inSpot(sp, .05, .12) && Math.abs(p.v) < .05) { st = 1; k.say(`In the space! Secure the car: shift to ${k.txt.park}.`); }
        if (st === 1 && k.secured()) { st = 2; k.praise('Parked and secured, centered in the space.'); sp.mesh.visible = false; k.say('Now back out. Hold the brake, shift to REVERSE, look behind you (hold V) and back out slowly, turning into the aisle. Then drive to the exit.'); k.goal(40, 3.8, 3.5); }
      });
      w.scenery(-80, -70, 90, 70, { trees: 40, palms: 40, seed: 251, avoid: [[-25, -45, 25, -18]] });
    },
  },
  {
    id: 'f7', mode: 'fp', title: 'Backing Up Straight', blurb: 'Back 50 feet in a straight line, looking over your shoulder.',
    rules: ['Road-test maneuver: back up 50 feet at slow speed, in a straight line.', 'Turn and look through the rear window — do not use only mirrors or a backup camera on the test.', 'Go at walking speed and steer in small corrections.'],
    build(k) {
      const w = k.world; w.road(0, 70, 0, -70, { limit: 15 });
      for (let z = -14; z <= 14; z += 4) { k.cone(.1, z); k.cone(3.5, z); }
      const sp = k.spot(1.8, 9.5, N, 6, 3); k.start(1.8, -9, N); const p = k.player; let st = 0;
      k.say('Back up 50 feet into the green box behind you. Hold the BRAKE, shift to REVERSE (R key / {B} button), HOLD V to look behind, and ease backwards between the cones.');
      k.onUpdate(() => {
        if (p.v < -2.9) k.violate('backfast', 'Too fast! Back up at walking speed.', 5);
        if (st === 0 && k.inSpot(sp, .15, .12) && Math.abs(p.v) < .05) { st = 1; k.say(`Straight and in the box. Shift to ${k.txt.park}.`); }
        if (st === 1 && k.secured()) k.win();
      });
      w.scenery(-90, -90, 90, 90, { houses: 18, trees: 30, palms: 20, seed: 261 });
    },
  },
  {
    id: 'f8', mode: 'fp', title: 'Three-Point Turn', blurb: 'Turn the car around on a narrow street.',
    rules: ['Road-test maneuver: turn around in a 20–40 ft space.', '1) Signal, stop at the right edge. 2) Signal left, check traffic both ways, turn sharply left toward the far curb. 3) Reverse, steering right, looking behind. 4) Drive forward into the correct lane.', 'Do not touch the curb, and check for traffic before every movement.'],
    build(k) {
      const w = k.world; w.road(0, -90, 0, 130, { limit: 25 }); k.start(1.8, 62, N); const p = k.player; let st = 0;
      k.say('Turn the car around. Step 1: signal LEFT (Q), check both ways (Z and C), then steer fully LEFT and creep toward the far curb. Stop before you touch it.');
      k.onUpdate(() => {
        const d = Math.abs(wrap(p.h - N));
        if (st === 0 && d > .9 && Math.abs(p.v) < .1) { st = 1; k.say('Step 2: hold the brake, shift to REVERSE, look behind (hold V), steer fully RIGHT and back up slowly. Stop before the curb behind you.'); }
        if (st === 1 && d > 1.9 && p.v <= 0 && Math.abs(p.v) < .1 && p.gear === 'R') { st = 2; k.say(`Step 3: shift to ${k.txt.drive}, steer LEFT and drive forward into the right-hand lane. Continue to the finish.`); }
        if (p.z < -80) k.fail('You drove away instead of turning around.');
      });
      k.goal(-1.8, 112, 4, { cond: () => Math.abs(wrap(p.h - S)) < .5 });
      w.scenery(-100, -100, 100, 140, { houses: 26, trees: 35, palms: 20, seed: 271 });
    },
  },
  {
    id: 'f9', mode: 'fp', title: 'Parallel Parking', blurb: 'Back into the gap and finish within 12 inches of the curb.',
    rules: ['Signal and stop beside the car in FRONT of the space, about 2–3 feet away, rear bumpers even.', 'Reverse slowly. Steer right until you are at about 45°, straighten, then steer left to swing the front in.', 'Finish centered, parallel, and within 12 inches of the curb.', 'Never park within 15 ft of a fire hydrant, 20 ft of a crosswalk, 30 ft of a stop sign or signal, or 50 ft of a railroad crossing.'],
    build(k) {
      const w = k.world; w.road(0, -120, 0, 120, { limit: 25, shoulder: 2.6 });
      for (const z of [-21.5, -9.2, 3.2, 15, 27]) k.parked(4.95, z, N, z === 15 ? 'suv' : 'sedan'); for (const z of [-30, -5, 20, 45]) k.parked(-4.95, z, S);
      const sp = k.spot(4.9, -3, N, 7.4, 2.6); k.start(1.8, 45, N); const p = k.player; let st = 0, last = 0;
      k.say('Parallel park in the GREEN gap on the right. Signal right, pull up beside the car in FRONT of the gap (rear bumpers even), and stop.');
      k.onUpdate(() => {
        if (st === 0 && p.z < -7 && Math.abs(p.v) < .1) { st = 1; k.say('Shift to REVERSE and hold V to look back. Back slowly: steer RIGHT until the car is at 45°, straighten the wheel, then steer LEFT as your front clears the car ahead.'); }
        const inside = k.inSpot(sp, .08, .14), curb = 6.2 - (p.x + .92);
        if (st >= 1 && inside && Math.abs(p.v) < .05 && k.t - last > 2.5) {
          last = k.t; const inch = Math.round(curb / .0254);
          if (curb > .5) k.say(`You are ${inch} inches from the curb — Florida requires 12 inches or less. Pull forward and back in closer.`);
          else { st = 2; k.say(`${inch <= 12 ? 'Excellent' : 'Good'}: ${inch} inches from the curb. Shift to ${k.txt.park}.`); }
        }
        if (st === 2 && inside && curb <= .5 && k.secured()) k.win();
      });
      w.scenery(-100, -130, 100, 130, { buildings: 12, houses: 14, trees: 25, palms: 25, seed: 281 });
    },
  },
  {
    id: 'f10', mode: 'fp', title: 'Parking on a Hill', blurb: 'Which way do the wheels go? Uphill, downhill, curb or no curb.',
    rules: ['UPHILL with a curb: turn the wheels AWAY from the curb (left).', 'DOWNHILL with a curb: turn the wheels TOWARD the curb (right).', 'No curb (uphill or downhill): turn the wheels toward the edge of the road (right), so the car rolls away from traffic.', 'Always set the parking brake and leave the car in Park (manual: 1st gear uphill, reverse downhill).'],
    build(k) {
      const w = k.world; w.slope = .11; w.root.rotation.x = .11; w.road(0, -160, 0, 160, { limit: 25, shoulder: 2.6 });
      w.sign('warn', 8.6, 70, N, 'HILL'); k.parked(4.9, 40, N).frozen = true; k.parked(-4.9, -40, S);
      let sp = k.spot(4.9, 18, N, 9, 2.6); k.start(1.8, 70, N); const p = k.player; let st = 0;
      k.say('You are driving UPHILL. Pull into the green space at the right curb and stop. Keep your foot on the brake — the car will roll back!');
      k.onUpdate(() => {
        const ok = k.inSpot(sp, .2, .2) && Math.abs(p.v) < .05;
        if (st === 0 && ok) { st = 1; k.say('Uphill WITH a curb: turn the steering wheel fully LEFT (away from the curb). Then set the parking brake (Space) and shift to Park. If the car rolls, the front tire catches the curb.'); }
        if (st === 1 && ok && p.handbrake && (k.manual || p.gear === 'P')) {
          if (p.steer > .6) { st = 2; k.praise('Uphill + curb: wheels AWAY from the curb.'); k.after(2.2, () => { sp.mesh.visible = false; sp = k.spot(-4.9, -18, S, 9, 2.6); k.teleport(-1.8, -70, S); p.handbrake = false; p.setGear(k.manual ? '1' : 'D'); st = 3; k.say('Now you are heading DOWNHILL. Pull into the green space at the right curb and stop.'); }); }
          else if (k.t % 4 < .02) k.say('Not yet — uphill with a curb, wheels turn AWAY from the curb: hold A / ← until the wheel is fully LEFT.');
        }
        if (st === 3 && ok) { st = 4; k.say('Downhill with a curb: turn the wheel fully RIGHT (toward the curb), set the parking brake (Space) and shift to Park.'); }
        if (st === 4 && ok && p.handbrake && (k.manual || p.gear === 'P')) {
          if (p.steer < -.6) { st = 5; k.praise('Downhill: wheels TOWARD the curb. No curb at all? Always turn toward the edge of the road.'); k.after(2.5, () => k.win()); }
          else if (k.t % 4 < .02) k.say('Not yet — downhill, wheels turn TOWARD the curb: hold D / → until the wheel is fully RIGHT.');
        }
      });
      w.scenery(-100, -170, 100, 170, { houses: 26, trees: 40, palms: 20, seed: 291 });
    },
  },
  {
    id: 'f11', mode: 'fp', title: 'Night Driving', blurb: 'Headlights, high beams, and when to dim them.',
    rules: ['Headlights ON from sunset to sunrise, and in rain, smoke or fog.', 'Use HIGH beams on dark open roads. Dim to LOW within 500 feet of an oncoming vehicle and within 300 feet when following one.', 'Slow down so you can stop within the distance your headlights show.', 'Move Over also applies to disabled vehicles showing hazard lights.'],
    build(k) {
      const w = k.world; k.env({ time: 'night' }); w.road(0, 420, 0, -760, { limit: 45, sidewalk: false }); w.sign('speed', 5.6, 380, N, '45');
      k.start(1.8, 400, N); const p = k.player; let st = 0, hiT = 0, mo = false;
      const onc = k.traffic([P(-1.8, -160), P(-1.8, 415)], { speed: 18, frozen: true, head: true }); onc.gone = true; onc.place();
      const lead = k.traffic([P(1.8, -330), P(1.8, -755)], { speed: 13, frozen: true, head: true });
      k.parked(5.3, -560, N, 'sedan', { hazard: true }); k.ped([P(5.2, -120), P(5.2, -300)], { shirt: 0x222222, pants: 0x111111, speed: 1.2 });
      k.say('It is night. Turn on your headlights: press L (controller: {Y}).');
      k.onUpdate((dt) => {
        if (st === 0 && p.lights) { st = 1; k.say('Low beams are on. This road is dark and empty — press L again for HIGH beams so you can see farther.'); }
        if (st === 1 && p.z < 210) { st = 2; onc.gone = false; onc.frozen = false; k.say('Oncoming headlights! Dim to LOW beams (press L until low) when the other car is within 500 feet.'); }
        const near = !onc.gone && onc.z < p.z && p.z - onc.z < 150, foll = !lead.gone && !lead.frozen && lead.z < p.z && p.z - lead.z < 90;
        hiT = p.lights === 2 && (near || foll) ? hiT + dt : 0;
        if (hiT > 1.6) { hiT = 0; k.violate('dim', near ? 'Dim your high beams within 500 feet of an oncoming vehicle — you are blinding the other driver.' : 'Use low beams within 300 feet of a vehicle you are following.', 10); }
        if (st === 2 && onc.z > p.z + 10) { st = 3; k.say('Clear again — high beams back on. Watch the right edge: pedestrians are very hard to see at night.'); }
        if (p.z < -150 && lead.frozen) { lead.frozen = false; k.say('You are catching up to a slower car. Dim to LOW beams within 300 feet, and keep a 4-second gap at night.'); }
        if (lead.z < -600) lead.cruise = 24;
        if (!mo && p.z < -545 && p.z > -580 && mph(k) > 27.5) { mo = true; k.violate('moveover', 'Move Over: with no lane to move into, slow to 20 mph below the limit when passing a disabled vehicle with hazard lights.', 10); }
      });
      k.tip(1.8, -440, 10, 'A disabled car with hazard lights is stopped on the right. On a two-lane road you cannot move over, so slow to 25 mph (20 under the limit) as you pass.');
      k.goal(1.8, -720, 5);
      w.scenery(-120, -770, 120, 430, { houses: 6, trees: 150, palms: 50, seed: 301 });
    },
  },
];
