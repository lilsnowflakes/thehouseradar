/* Neon Nights live scene (car mode, theme "citypop"). Loaded on its own, only when Neon Nights is on screen:
   the still album art shows first and this paints over it once its pictures arrive.
   Layers, back to front: sky and city (clouds and palms lifted out of Mo's art) > rolling water > tower lights
   > sun rays > clouds that slowly reform over a 3-minute loop > helicopter > sailboat at anchor > speedboat > four palms in the wind.
   Crossings are random: a boat every 40-120 s, a helicopter every 1-3 min, three models of each, and the two
   never pass the same spot together. Reduced motion: a calm version (clouds and lights only, 4 frames a second). Nov 19 2026.
   Every picture is decoded (and every SVG painted to a canvas) before the first frame, so no browser stalls or refuses
   mid-scene; a layer that still fails is skipped on its own and the rest keeps moving. */
(function () {
  'use strict';
  var BASE = 'car/nn/', W = 2048, H = 1143, HORIZON = 811, WTOP = 900, WATERLINE = 834, INK = '#362846';
  var IMG = {}, ready = false, cv = null, g = null, last = 0, t0 = performance.now(), prev = 0, cost = 0, slow = 0, LV = 0, QS = 1, crawl = false, still = false, BAD = {};
  /* LV: 0 full, 1 lighter, 2 lightest; QS: canvas resolution (half on phones); crawl: 4 frames a second for a device that
     can't keep up even at the lightest level (it keeps moving, slowly, instead of dropping to the still art) */
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var files = {bg: 'bg.webp', rays: 'rays.webp', pl: 'palm-l.webp', ps: 'palm-s.webp', prs: 'palm-rs.webp', prb: 'palm-rb.webp',
    anchor: 'anchor-boat.svg', boata: 'boat-a.svg', boatb: 'boat-b.svg', boatc: 'boat-c.svg', helia: 'heli-a.svg', helib: 'heli-b.svg', helic: 'heli-c.svg'};
  for (var ck = 0; ck < 12; ck++) files['c' + ck] = 'cloud-' + ck + '.webp';
  var SVG = {anchor: [400, 300], boata: [600, 140], boatb: [600, 140], boatc: [600, 140], helia: [420, 170], helib: [420, 170], helic: [420, 170]};
  function prep(k, i) {
    if (SVG[k]) {   /* paint each SVG once onto a canvas at 2x: every browser can draw a canvas, and it is quicker per frame */
      var c = document.createElement('canvas'); c.width = SVG[k][0] * 2; c.height = SVG[k][1] * 2;
      try { c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); return Promise.resolve(c); } catch (e) { return Promise.resolve(null); }
    }
    /* decode now, not on first draw (a first-draw decode is a long frame that used to trip the slow-device fallback) */
    return (i.decode ? i.decode() : Promise.resolve()).then(function () { return window.createImageBitmap ? createImageBitmap(i) : i; })
      .catch(function () { return i; });
  }
  var left = Object.keys(files).length;
  Object.keys(files).forEach(function (k) {
    var i = new Image(); i.decoding = 'async';
    var done = function (v) { IMG[k] = v; if (--left === 0 && IMG.bg) ready = true; };   /* only the backdrop is a must */
    i.onload = function () { prep(k, i).then(done); };
    i.onerror = function () { done(null); };
    i.src = BASE + files[k];
  });
  var rr = function (a, b) { return a + (b - a) * Math.random(); };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };

  /* wind: steady breeze, slow sway, and gusts that travel left to right */
  var GUSTS = [], nextGust = rr(4, 9);
  function gust(t) { var v = 0; for (var i = 0; i < GUSTS.length; i++) { var q = GUSTS[i], u = (t - q.t) / q.len; if (u > 0 && u < 1) v += q.k * Math.pow(Math.sin(Math.PI * u), 2); } return v; }
  function wind(t, ph) { return .5 + .42 * Math.sin(t * 1.1 + ph) + .16 * Math.sin(t * 2.7 + ph * 2) + .07 * Math.sin(t * 6.1 + ph) + gust(t - ph * .35); }
  /* painted palms (Nov 19 v2): same four spots as the art; x/y = where each layer sits */
  var PALMS = [{n: 'pl', x: -157, y: 641, amp: 15, ph: 0}, {n: 'ps', x: 124, y: 889, amp: 10, ph: .6},
    {n: 'prs', x: 1562, y: 898, amp: 11, ph: 3.4}, {n: 'prb', x: 1705, y: 681, amp: 15, ph: 4.1}];
  function drawPalm(p, t) {
    var im = IMG[p.n], Hh = im.height, Ww = im.width, w = RM ? .5 : wind(t, p.ph), S = LV > 1 ? 6 : QS < 1 ? 4 : 2;
    for (var sy = 0; sy < Hh; sy += S) {
      var y = p.y + sy, h = (H - y) / (H - p.y), crown = Math.max(0, h - .6) / .4;
      var dx = RM ? 0 : p.amp * w * h * h + crown * (2.2 + 1.6 * gust(t)) * Math.sin(t * 4.4 + sy * .05 + p.ph);
      g.drawImage(im, 0, sy, Ww, S, p.x + dx, y, Ww, S);
    }
  }

  /* rolling water: swells travel toward you, bigger and slower up close; reflections ride them */
  function swell(y, t) { var z = y - HORIZON, ph = (330 / z) * 6.3 - t * 1.25; return {ph: ph, dx: (1.2 + z * .021) * (Math.sin(ph) + .35 * Math.sin(ph * 2.3 + 1.3))}; }
  var GL = []; for (var i = 0; i < 80; i++) { var gy = WTOP + 15 + Math.pow(Math.random(), .8) * 225; GL.push({y: gy, x: 1460 + (Math.random() - .5) * (260 + (gy - 900) * 1.6), f: rr(1.1, 3.2), p: rr(0, 7)}); }
  function drawWater(t) {
    var R = LV > 1 ? 6 : QS < 1 ? 4 : 2;
    for (var y = WTOP; y < H; y += R) {
      var k = Math.min(1, (y - WTOP) / 60), s = swell(y, t);
      g.drawImage(IMG.bg, 0, y, W, R, k * s.dx, y, W, R);
      var sh = Math.sin(s.ph - .6);
      g.fillStyle = sh > 0 ? 'rgba(255,238,248,' + (k * .075 * sh).toFixed(3) + ')' : 'rgba(54,40,70,' + (-k * .05 * sh).toFixed(3) + ')';
      g.fillRect(0, y, W, R);
    }
    if (LV > 0) return;
    for (var j = 0; j < GL.length; j++) { var q = GL[j], tw = Math.sin(t * q.f + q.p);
      if (tw > .55) { g.fillStyle = 'rgba(255,246,236,' + ((tw - .55) * 1.4).toFixed(3) + ')'; g.fillRect(q.x - 6 - (q.y - 900) * .04, q.y, 12 + (q.y - 900) * .08, 1.6); } }
  }

  /* clouds: three copies at staggered points of one slow cycle, each growing out from the horizon, fading in and out */
  /* clouds (Nov 19 v3, Mo's pick: the ragged streaks). 12 keyframes of one slowly turning noise field, 15 s apart:
     each key is the next moment of the same clouds, so blending key to key reads as clouds slowly reforming.
     One loop = 3 minutes; each visit starts at a random point and drifts at its own slow speed. The blend is
     redone only every few frames at half size (it changes so slowly), which keeps weak GPUs relaxed. */
  var CK = 12, CSTEP = 15, cOff = Math.random() * CK * CSTEP, cDrift = rr(1.6, 2.8), cc = document.createElement('canvas'),
    ccx = cc.getContext('2d'), cN = 0;
  cc.width = 1536; cc.height = 320;
  function drawClouds(t) {
    if (cN++ % 2 === 0) {                 /* the sky is repainted every few frames already */
      var p = (t + cOff) / CSTEP, i = Math.floor(p) % CK, f = p - Math.floor(p), e = f * f * (3 - 2 * f);
      ccx.globalCompositeOperation = 'copy'; ccx.globalAlpha = 1 - e; ccx.drawImage(IMG['c' + i], 0, 0);
      ccx.globalCompositeOperation = 'lighter'; ccx.globalAlpha = e; ccx.drawImage(IMG['c' + ((i + 1) % CK)], 0, 0);
      ccx.globalCompositeOperation = 'source-over'; ccx.globalAlpha = 1;
    }
    var w = 3072, x = -(((t * cDrift) % w) + w) % w;
    g.drawImage(cc, x, 0, w, 640); if (x + w < W) g.drawImage(cc, x + w, 0, w, 640);
  }
  /* sun glow (Nov 19 v3): a soft bloom around the sun and a few broad, blurred shafts of light, painted ahead
     of time (rays.webp) so no phone has to blur anything. It breathes very slowly. */
  function drawRays(t) { if (LV > 1 || !IMG.rays) return;
    g.save(); g.globalAlpha = .75 + .25 * Math.sin(t * .21); g.drawImage(IMG.rays, 0, 0, W, 800); g.restore(); }

  /* lights */
  var SPR = {};
  function sprite(rgb) { if (SPR[rgb]) return SPR[rgb]; var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'),
    q = x.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, 'rgba(' + rgb + ',1)'); q.addColorStop(.25, 'rgba(' + rgb + ',.45)'); q.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = q; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(32, 32, 4.4, 0, 7); x.fill(); return (SPR[rgb] = c); }
  function glow(x, y, r, rgb, a) { if (a <= 0) return; var d = r * 8; g.globalAlpha = Math.min(1, a); g.drawImage(sprite(rgb), x - d / 2, y - d / 2, d, d); g.globalAlpha = 1; }
  var breathe = function (t, T, ph) { return .5 - .5 * Math.cos(2 * Math.PI * (t / T + (ph || 0))); };
  var blink = function (t, T, on, ph) { return ((((t / T + (ph || 0)) % 1) + 1) % 1) < on ? 1 : 0; };
  var ROOF = [[1545, 606, 1.25], [1590, 604, 1.25], [1481, 643, 1], [1495, 643, 1], [1663, 651, 1], [1690, 651, 1], [1262, 686, .9], [980, 712, .85], [1844, 720, .85]]
    .map(function (a) { return {x: a[0], y: a[1], s: a[2], T: rr(2.6, 3.6), p: Math.random()}; });
  function drawRoof(t) { for (var i = 0; i < ROOF.length; i++) { var L = ROOF[i], b = .12 + .88 * breathe(t, L.T, L.p);
    glow(L.x, L.y, 2.8 * L.s, '255,30,50', b); glow(L.x, L.y, 1.4 * L.s, '255,30,50', b); } }
  function drawRoofRefl(t) { for (var i = 0; i < ROOF.length; i++) { var L = ROOF[i], b = breathe(t, L.T, L.p), ry = WATERLINE + (WATERLINE - L.y) * .55;
    if (ry < WTOP) continue; var dx = swell(ry, t).dx, q = g.createLinearGradient(0, ry - 26, 0, ry + 26);
    q.addColorStop(0, 'rgba(255,60,80,0)'); q.addColorStop(.5, 'rgba(255,60,80,' + (.4 * b * L.s).toFixed(3) + ')'); q.addColorStop(1, 'rgba(255,60,80,0)');
    g.fillStyle = q; g.fillRect(L.x + dx - 2.5, ry - 26, 5, 52); } }

  /* sailboat at anchor: green (starboard) and red (port) at the bow blink out of step; blue LED at the stern breathes */
  function drawAnchor(t) { var w = 112, h = w * 300 / 400, s = w / 400, X = 1010, Y0 = 910, bob = RM ? 0 : 2.2 * Math.sin(t * 1.35) + Math.sin(t * 2.9 + 1),
    rot = RM ? 0 : .022 * Math.sin(t * 1.05 + .4) + .008 * Math.sin(t * 2.4), y = Y0 + bob;
    g.save(); g.globalAlpha = .13; g.translate(X, Y0 + 3); g.scale(1, -.5); g.drawImage(IMG.anchor, -w / 2, -h * .2, w, h); g.restore();
    g.save(); g.translate(X, y); g.rotate(rot); g.globalAlpha = .9; g.drawImage(IMG.anchor, -w / 2, -h * 240 / 300, w, h); g.globalAlpha = 1;
    var bx = (388 - 200) * s, by = (236 - 240) * s, sx = (34 - 200) * s, sy = (238 - 240) * s, gr = blink(t, 1.6, .5), rd = blink(t, 1.6, .5, .5), bl = .25 + .75 * breathe(t, 3.2);
    glow(bx, by - 2, 2.1, '70,255,150', gr); glow(bx - 5, by + 1, 2.1, '255,60,80', rd); glow(sx, sy, 2.1, '70,140,255', bl); g.restore();
    g.save(); g.globalAlpha = .35; g.fillStyle = 'rgb(70,255,150)'; if (gr) g.fillRect(X + bx - 1, Y0 + 6, 2, 10 + 3 * Math.sin(t * 3));
    g.fillStyle = 'rgb(255,60,80)'; if (rd) g.fillRect(X + bx - 6, Y0 + 6, 2, 10 + 3 * Math.sin(t * 3 + 1));
    g.globalAlpha = .3 * bl; g.fillStyle = 'rgb(70,140,255)'; g.fillRect(X + sx - 1, Y0 + 6, 2, 12 + 3 * Math.sin(t * 2.6)); g.restore(); }

  /* crossings */
  var HELI = {a: {hub: [210, 18], beacon: [236, 28], tail: [398, 40], tr: [398, 58]}, b: {hub: [216, 16], beacon: [248, 27], tail: [404, 31], tr: null},
    c: {hub: [232, 10], beacon: [272, 23], tail: [393, 31], tr: [392, 54]}};
  var EV = [], due = {boat: rr(6, 20), heli: rr(18, 45)}, lastVar = {boat: '', heli: ''};
  function pathX(e, u) { var span = W + e.w * 2 + 200; return e.dir > 0 ? -e.w - 100 + u * span : W + 100 - u * span; }
  function make(k, t) { var isB = k === 'boat', v = pick(['a', 'b', 'c'].filter(function (x) { return x !== lastVar[k]; }));
    return {k: k, v: v, t0: t, dur: isB ? rr(15, 20) : rr(17, 22), dir: Math.random() < .5 ? 1 : -1, y: isB ? rr(955, 1010) : rr(220, 360), w: isB ? rr(185, 215) : rr(118, 140)}; }
  function clash(a, b) { var s = Math.max(a.t0, b.t0), e = Math.min(a.t0 + a.dur, b.t0 + b.dur);
    for (var t = s; t <= e; t += .25) if (Math.abs(pathX(a, (t - a.t0) / a.dur) - pathX(b, (t - b.t0) / b.dur)) < 380) return true; return false; }
  function schedule(t) {
    EV = EV.filter(function (e) { return t < e.t0 + e.dur; });
    ['boat', 'heli'].forEach(function (k) {
      if (t < due[k] || EV.some(function (e) { return e.k === k; })) return;
      var e = make(k, t), other = EV.filter(function (x) { return x.k !== k; })[0];
      if (other && clash(e, other)) { due[k] = t + 6; return; }
      EV.push(e); lastVar[k] = e.v; due[k] = t + e.dur + (k === 'boat' ? rr(40, 120) : rr(60, 180));
    });
    while (nextGust < t + 30) { GUSTS.push({t: nextGust, len: rr(2.5, 4.5), k: rr(.45, .8)}); nextGust += rr(9, 17); }
    GUSTS = GUSTS.filter(function (q) { return q.t + q.len > t - 5; });
  }
  function drawBoat(e, u, t) { var im = IMG['boat' + e.v], w = e.w, h = w * 140 / 600, x = pathX(e, u), y = e.y + 1.6 * Math.sin(t * 2.1 + e.t0);
    g.save(); g.translate(x, 0); g.scale(e.dir, 1); g.lineCap = 'round';
    for (var i = 0; i < 30; i++) { var k0 = i / 30, k1 = (i + 1) / 30; g.strokeStyle = 'rgba(255,236,246,' + ((1 - k0) * .6).toFixed(3) + ')';
      for (var sd = -1; sd <= 1; sd += 2) { var f = sd < 0 ? .35 : 1; g.lineWidth = 2.3 - 1.2 * k0; g.beginPath();
        g.moveTo(-k0 * 440, y + 2 + sd * (1 + k0 * 18) * f); g.lineTo(-k1 * 440, y + 2 + sd * (1 + k1 * 18) * f); g.stroke(); } }
    var fg = g.createLinearGradient(-150, 0, 10, 0); fg.addColorStop(0, 'rgba(255,240,248,0)'); fg.addColorStop(1, 'rgba(255,240,248,.75)');
    g.fillStyle = fg; g.beginPath(); g.ellipse(-60, y + 3, 75, 3.4, 0, 0, 7); g.fill();
    g.globalAlpha = .15; g.save(); g.translate(0, y + 2); g.scale(1, -.55); g.drawImage(im, 0, -h * .2, w, h); g.restore();
    g.globalAlpha = .94; g.translate(0, y - h * 112 / 140); g.rotate(.008 * Math.sin(t * 1.7)); g.drawImage(im, 0, 0, w, h); g.restore(); }
  function drawHeli(e, u, t) { var im = IMG['heli' + e.v], L = HELI[e.v], w = e.w, h = w * 170 / 420, s = w / 420, x = pathX(e, u), y = e.y - 28 * u + 4 * Math.sin(t * .9 + e.t0);
    g.save(); g.translate(x, y); g.scale(-e.dir, 1); g.rotate(-.05); g.translate(-w / 2, 0); g.globalAlpha = .9; g.drawImage(im, 0, 0, w, h);
    var sp = Math.abs(Math.cos(t * 38)), len = 380 * (.35 + .65 * sp); g.fillStyle = INK; g.globalAlpha = .55; g.fillRect((L.hub[0] - len / 2) * s, (L.hub[1] + 2) * s, len * s, 3.2 * s);
    g.globalAlpha = .18; g.fillRect((L.hub[0] - 190) * s, (L.hub[1] + 1) * s, 380 * s, 5 * s);
    if (L.tr) { g.globalAlpha = .35; g.beginPath(); g.ellipse(L.tr[0] * s, L.tr[1] * s, 14 * s * (.3 + .7 * Math.abs(Math.sin(t * 51))), 15 * s, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1; glow(L.beacon[0] * s, (L.beacon[1] - 3) * s, 2.2, '255,50,70', .2 + .8 * breathe(t, 2.4, e.t0));
    var st = (t + e.t0) % 2.2; glow(L.tail[0] * s, L.tail[1] * s, 1.8, '255,255,255', (st < .07 || (st > .22 && st < .29)) ? 1 : 0); g.restore(); }

  var sky = document.createElement('canvas'), sx = sky.getContext('2d'), skyN = 0, skyQS = 0;
  function paintSky(t) {
    if (skyQS !== QS) { sky.width = W * QS; sky.height = H * QS; skyQS = QS; skyN = 0; }
    if (skyN++ % [8, 12, 24][LV] !== 0) return;
    var keep = g; g = sx; g.setTransform(QS, 0, 0, QS, 0, 0);
    g.drawImage(IMG.bg, 0, 0);
    [['rays', drawRays], ['clouds', drawClouds]].forEach(function (L) {   /* a failing sky layer is dropped; the backdrop stays */
      if (BAD[L[0]]) return;
      try { L[1](t); } catch (e) { BAD[L[0]] = 1; sky.width = sky.width; skyN = 0; g.setTransform(QS, 0, 0, QS, 0, 0); g.drawImage(IMG.bg, 0, 0); }
    });
    g = keep;
  }
  /* one layer: if it throws (a picture a browser won't draw), skip that layer from now on and reset the canvas state */
  function layer(n, f) { if (BAD[n]) return; try { f(); } catch (e) { BAD[n] = 1; try { console.warn('Neon Nights: skipping ' + n, e); } catch (x) {}
    var w = cv.width; cv.width = w; } }
  function frame(t) {
    layer('sky', function () { paintSky(t); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(sky, 0, 0); });
    g.setTransform(QS, 0, 0, QS, 0, 0);
    if (!RM) layer('water', function () { drawWater(t); g.setTransform(QS, 0, 0, QS, 0, 0); });
    layer('roof', function () { drawRoofRefl(t); drawRoof(t); });
    var i, e, u;
    for (i = 0; i < EV.length; i++) { e = EV[i]; u = (t - e.t0) / e.dur; if (u >= 0 && u <= 1 && e.k === 'heli') layer('heli' + e.v, drawHeli.bind(null, e, u, t)); }
    layer('anchor', function () { drawAnchor(t); });
    for (i = 0; i < EV.length; i++) { e = EV[i]; u = (t - e.t0) / e.dur; if (u >= 0 && u <= 1 && e.k === 'boat') layer('boat' + e.v, drawBoat.bind(null, e, u, t)); }
    for (i = 0; i < PALMS.length; i++) layer(PALMS[i].n, drawPalm.bind(null, PALMS[i], t));
  }

  function attach() {
    var host = document.querySelector('.cpst');
    if (!host) return false;
    if (cv && cv.isConnected && cv.parentNode === host) return true;
    if (!cv) { QS = (matchMedia('(max-width: 900px)').matches || (navigator.hardwareConcurrency || 4) <= 4) ? .5 : 1;
      cv = document.createElement('canvas'); cv.width = W * QS; cv.height = H * QS; cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; g = cv.getContext('2d'); }
    host.insertBefore(cv, host.firstChild); host.classList.add('live'); return true;
  }
  function loop(now) {
    requestAnimationFrame(loop);
    var gap = now - prev; prev = now;
    if (!ready || document.hidden || still) return;
    if (!attach()) return;
    var lite = document.documentElement.classList.contains('lite') || LV > 0;
    /* 30 frames a second; 15 in Lite mode or on a slower device; 10 at the lightest; 4 when calm or crawling */
    if (now - last < (RM || crawl ? 250 : LV > 1 ? 100 : lite ? 66 : 33)) return;
    last = now;
    var t = (now - t0) / 1000;
    var a = performance.now(); if (!RM) schedule(t); frame(t);
    var dt = performance.now() - a;
    if (gap > 250) return;   /* just back from another tab or sleep: don't count this frame */
    cost = cost ? cost * .9 + dt * .1 : dt;
    /* step down only after a sustained run of slow frames, never on one hiccup */
    var lim = LV ? 22 : 14;
    if (t > 4 && cost > lim) slow++; else slow = Math.max(0, slow - 2);
    if (slow > 45 && !crawl) {
      slow = 0; cost = lim * .8;
      if (QS > .5) { QS = .5; cv.width = W * QS; cv.height = H * QS; }
      else if (LV < 2) LV++;
      else crawl = true;
    }
  }
  requestAnimationFrame(loop);
  /* preview / recording hook: scene.html#rec drives time by hand (used to make Mo's sample videos) */
  if (location.hash.indexOf('rec') > -1) { window.NNframe = function (t) { if (!ready || !attach()) return false; still = true; schedule(t); frame(t); return true; }; }
})();
