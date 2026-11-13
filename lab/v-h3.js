/* H3. 코옵 태양계: 흐릿한 큰 원 하나가 코옵 하나의 터다. 원마다 가운데에 작은 궤도계가 있고 구성원 점이 그 위를 돈다.
   궤도계는 이웃끼리만 가는 점선으로 이어지고, 작은 꾸러미가 그 선을 타고 한쪽에서 다른 쪽으로 건너간다. 가운데로 모이는 선은 없다.
   층은 셋이다. (1) 한 색 계열의 흐린 원, (2) 기울어진 동심 타원과 구성원 점, (3) 이웃을 잇는 그물과 꾸러미.
   문구가 놓이는 조용한 타원(P.quiet) 안에는 궤도계를 두지 않고, 원의 색도 배경색으로 걷어 낸다.
   색은 잉크 무채색에 강조색 하나(P.c(0.5))만 쓴다. 번짐, 꼬리, 무지개는 쓰지 않는다. */
(function () {
  var TAU = Math.PI * 2;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ss(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function rgbOf(str) { var m = String(str).match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
  function hexRgb(hex) { var h = String(hex).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  var P_OUT = 6200;   // 바깥 궤도 한 바퀴에 걸리는 시간(ms). 안쪽 궤도일수록 빨리 돈다
  var DWELL = 240;    // 꾸러미를 받은 궤도계가 다음 이웃에게 넘기기 전에 머무는 시간(ms)
  var PULSE = 460;    // 도착 때 궤도가 밝아졌다 가라앉는 시간 상수(ms)

  /* 궤도계의 생김새. 찍어 낸 것처럼 보이지 않게 크기, 납작한 정도, 기울기, 궤도 수, 점 수, 도는 방향을 저마다 다르게 둔다.
     R: 바깥 궤도 반지름(기준 길이 대비), k: 납작한 정도, rot: 기울기(rad), rings: 궤도 반지름 비율, n: 궤도별 점 수 */
  var SHAPE = [
    { R: 0.078, k: 0.44, rot: -0.32, rings: [0.42, 0.72, 1], n: [1, 2, 3], dir: 1 },
    { R: 0.058, k: 0.58, rot: 0.26, rings: [0.56, 1], n: [1, 3], dir: -1 },
    { R: 0.070, k: 0.38, rot: 0.10, rings: [0.40, 0.70, 1], n: [1, 1, 3], dir: 1 },
    { R: 0.088, k: 0.50, rot: -0.14, rings: [0.36, 0.64, 1], n: [1, 2, 4], dir: -1 },
    { R: 0.062, k: 0.46, rot: 0.40, rings: [0.50, 1], n: [1, 2], dir: 1 },
    { R: 0.074, k: 0.54, rot: -0.22, rings: [0.44, 0.74, 1], n: [1, 2, 2], dir: -1 },
    { R: 0.066, k: 0.42, rot: 0.18, rings: [0.58, 1], n: [2, 3], dir: 1 }
  ];

  /* 자리표(화면 비율 좌표)와 이음표. 손으로 잡은 구도라 화면 크기가 바뀌어도 그림이 달라지지 않는다.
     center: 문구를 둘러싼 고리에 맞은편 두 모서리(왼쪽 위, 오른쪽 아래)의 삼각형. left: 오른쪽에 오각형 무리, 그 위아래로 가장자리의 옅은 궤도계까지 삼각형 하나씩.
     tall: 세로 화면용. 글이 화면 폭을 거의 다 쓰므로 위아래 띠에만 세 개씩 두고, 띠 안에서만 잇는다. */
  var SETS = {
    center: {
      seed: 7411,
      pos: [[0.08, 0.66], [0.105, 0.175], [0.30, 0.14], [0.70, 0.16], [0.93, 0.52], [0.84, 0.86], [0.60, 0.90]],
      shape: [2, 1, 4, 6, 0, 3, 5],
      /* 고리 하나로만 읽히지 않게 맞은편 모서리에 대각선을 하나씩 둔다(왼쪽 위 0-2, 오른쪽 아래 4-6). 어느 궤도계도 이음선이 셋을 넘지 않는다 */
      links: [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 6], [6, 0]]
    },
    left: {
      seed: 2903,
      pos: [[0.47, 0.13], [0.66, 0.295], [0.875, 0.15], [0.925, 0.50], [0.775, 0.78], [0.615, 0.635], [0.50, 0.90]],
      shape: [4, 0, 1, 2, 3, 6, 5],
      /* 오각형 안을 가로지르는 대각선(1-3)은 뺐다. 궤도계 하나에 이음선이 넷 모여 중심처럼 보였다. 대신 위쪽을 0-2로 닫아 어느 것도 셋을 넘지 않는다 */
      links: [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4], [4, 5], [5, 1], [5, 6], [6, 4]]
    },
    tall: {
      seed: 5519,
      pos: [[0.17, 0.15], [0.50, 0.135], [0.83, 0.165], [0.20, 0.905], [0.52, 0.945], [0.82, 0.90]],
      shape: [1, 4, 6, 2, 5, 0],
      links: [[0, 1], [1, 2], [3, 4], [4, 5]]
    }
  };
  var TONES = [0.44, 0.5, 0.56]; // 흐린 원의 색. 한 색 계열 안에서만 조금씩 다르다(폭을 넓히면 브랜드, 차가운 팔레트에서 두 색으로 갈려 보인다)

  /* 흐린 원 하나를 미리 그려 둔 그림. 매 장면마다 그라데이션을 새로 만들지 않고 이 그림을 늘려서 찍는다 */
  function blob(P, tone) {
    var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2), i;
    /* 채도를 조금 덜어 낸다. 어두운 배경에서는 빛 번짐처럼 보이기 쉬워 더 많이 덜어 낸다 */
    var k = rgbOf(P.c(tone, 1)), lum = 0.3 * k[0] + 0.55 * k[1] + 0.15 * k[2], ds = P.dark ? 0.34 : 0.26;
    var col = 'rgba(' + Math.round(k[0] + (lum - k[0]) * ds) + ',' + Math.round(k[1] + (lum - k[1]) * ds) + ',' + Math.round(k[2] + (lum - k[2]) * ds) + ',';
    /* 가운데가 평평하고 가장자리만 흐린 원반. 안개가 아니라 원 하나로 읽히게 한다 */
    var e = Math.exp(-Math.pow(1 / 0.58, 4));
    for (i = 0; i <= 20; i++) { var r = i / 20, a = (Math.exp(-Math.pow(r / 0.58, 4)) - e) / (1 - e); gr.addColorStop(r, col + a.toFixed(4) + ')'); }
    g.fillStyle = gr; g.fillRect(0, 0, S, S); return c;
  }
  /* 색 띠가 생기지 않게 덮는 아주 옅은 입자 */
  function grain(P) {
    var S = 160, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d'), im = g.createImageData(S, S), ink = rgbOf(P.ink(1)), rnd = rng(99173), i;
    for (i = 0; i < S * S; i++) { var q = i * 4; im.data[q] = ink[0]; im.data[q + 1] = ink[1]; im.data[q + 2] = ink[2]; im.data[q + 3] = rnd() * 255; }
    g.putImageData(im, 0, 0); return c;
  }
  /* 문구 자리의 색을 걷어 내는 배경색 그림 */
  function washSprite(P) {
    var S = 256, c = document.createElement('canvas'), b = hexRgb(P.bg), bs = 'rgba(' + b[0] + ',' + b[1] + ',' + b[2] + ','; c.width = c.height = S;
    var g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    [[0, 1], [0.30, 0.96], [0.46, 0.82], [0.60, 0.58], [0.74, 0.32], [0.86, 0.12], [0.94, 0.03], [1, 0]].forEach(function (q) { gr.addColorStop(q[0], bs + q[1] + ')'); });
    g.fillStyle = gr; g.fillRect(0, 0, S, S); return c;
  }

  /* 조용한 타원까지의 거리. 1이면 타원 테두리, 그보다 작으면 안쪽 */
  function qd(s, x, y) { var dx = (x - s.qx) / s.qrx, dy = (y - s.qy) / s.qry; return Math.sqrt(dx * dx + dy * dy); }
  /* 궤도계의 바깥 궤도가 조용한 타원에 가장 가까이 가는 거리 */
  function ringMinD(s, sy, x, y) {
    var m = 1e9, i;
    for (i = 0; i < 16; i++) {
      var a = i / 16 * TAU, lx = sy.R * Math.cos(a), ly = sy.R * sy.k * Math.sin(a);
      var d = qd(s, x + lx * sy.cr - ly * sy.sr, y + lx * sy.sr + ly * sy.cr); if (d < m) m = d;
    }
    return m;
  }
  /* 바깥 궤도 테두리에서 (tx, ty) 쪽으로 gap만큼 더 나간 점. 이음선은 궤도계 안으로 들어가지 않고 테두리 앞에서 멈춘다 */
  function edgePoint(sy, tx, ty, gap) {
    var th = Math.atan2(ty - sy.y, tx - sy.x), l = th - sy.rot, a = sy.R, b = sy.R * sy.k;
    var r = a * b / Math.sqrt(b * b * Math.cos(l) * Math.cos(l) + a * a * Math.sin(l) * Math.sin(l));
    return [sy.x + Math.cos(th) * (r + gap), sy.y + Math.sin(th) * (r + gap)];
  }

  /* 꾸러미 보내기: from에서 나가는 한가한 이음선 가운데 오래 쉰 선, 지난번과 반대 방향인 선을 먼저 고른다. 방금 온 길로는 되돌아가지 않는다.
     hops는 지금까지 건너온 횟수, max는 이 꾸러미가 건너갈 횟수다 */
  function launch(s, from, avoid, hops, max) {
    var L = s.adj[from], best = -1, bs = -1e9, i, j;
    for (i = 0; i < L.length; i++) {
      var lk = s.links[L[i]]; if (lk.busy) continue;
      var dir = lk.a === from ? 1 : -1, to = dir > 0 ? lk.b : lk.a, inb = 0;
      for (j = 0; j < s.pk.length; j++) if (s.pk[j].to === to) inb = 1;
      var sc = Math.min(6000, s.clock - lk.last) / 6000 + (lk.ldir === -dir ? 0.8 : 0) + s.rnd() * 0.4 - (to === avoid ? 2 : 0) - inb;
      if (sc > bs) { bs = sc; best = L[i]; }
    }
    if (best < 0) return false;
    var k = s.links[best], d = k.a === from ? 1 : -1;
    k.busy = true; k.ldir = d; s.sys[from].act = s.clock;
    s.pk.push({ l: best, dir: d, t0: s.clock, dur: k.dur, from: from, to: d > 0 ? k.b : k.a, hops: hops, max: max });
    return true;
  }

  /* 시간 진행. 날아가는 꾸러미는 언제나 둘 아니면 셋이다 */
  function step(s, dt) {
    s.clock += dt;
    var c = s.clock, S = s.sys, i, guard = 0;
    if (!s.links.length) return;
    for (i = s.pk.length - 1; i >= 0; i--) {
      var p = s.pk[i];
      if (c - p.t0 < p.dur) continue;
      var lk = s.links[p.l]; lk.busy = false; lk.last = c;
      S[p.to].hit = S[p.to].act = c;                          // 받은 궤도계의 궤도가 잠깐 밝아진다
      /* 받은 쪽이 곧 다음 이웃에게 넘긴다. 몇 번 건너가면 거기서 끝나고, 다른 곳에서 새 꾸러미가 떠난다. 한 방향으로만 도는 흐름이 굳지 않게 하려는 것이다 */
      if (p.hops + 1 < p.max) s.queue.push({ at: c, sys: p.to, from: p.from, hops: p.hops + 1, max: p.max });
      if (s.pk.length === 3) s.nextThird = c + 240 + s.rnd() * 460;
      s.pk.splice(i, 1);
    }
    while (s.queue.length && c - s.queue[0].at > 2600) s.queue.shift();
    while (guard++ < 6 && (s.pk.length < 2 || (s.pk.length < 3 && c >= s.nextThird))) {
      var forced = s.pk.length < 2, from = -1, avoid = -1, hops = 0, max = 2 + Math.floor(s.rnd() * 3), qi;
      for (qi = 0; qi < s.queue.length; qi++) if (c - s.queue[qi].at >= DWELL) { var it = s.queue[qi]; from = it.sys; avoid = it.from; hops = it.hops; max = it.max; s.queue.splice(qi, 1); break; }
      if (from < 0) {
        if (!forced && s.queue.length) break;                 // 곧 넘길 차례가 오므로 기다린다
        /* 넘길 차례가 없으면 새 꾸러미가 떠난다. 아무 궤도계 둘을 뽑아 더 오래 쉰 쪽이 보낸다 */
        var a1 = Math.floor(s.rnd() * S.length), a2 = Math.floor(s.rnd() * S.length);
        from = S[a1].act <= S[a2].act ? a1 : a2;
      }
      if (from < 0 || !launch(s, from, avoid, hops, max)) { if (!forced) break; }
    }
    var kh = 1 - Math.exp(-dt / 220);
    for (i = 0; i < s.links.length; i++) { var q = s.links[i]; q.heat += ((q.busy ? 1 : 0) - q.heat) * kh; }
  }

  LAB.register({
    id: 'h3-coop-systems', name: '코옵 태양계 · 흐린 원 위의 궤도', short: '코옵 태양계', en: 'Coop systems',
    hero: true, designed: true, textDefault: true, defaultPal: 'dawn', heroPal: { light: 'dawn', dark: 'indigo' },
    idea: '흐릿한 원 하나가 코옵 하나이고, 그 안에서 구성원들이 작은 궤도를 그리며 돈다. 이웃한 코옵끼리만 가는 선으로 이어져 작은 꾸러미를 주고받고, 받은 쪽 궤도가 잠깐 밝아진다.',

    init: function (w, h, P) {
      var Q = P.quiet || { x: 0.5, y: 0.5, rx: 0.31, ry: 0.26 };
      var tall = w / h < 0.9, left = !tall && P.layout === 'left', set = tall ? SETS.tall : (left ? SETS.left : SETS.center);
      var u = clamp(w / 900, 0.75, 1.6), base = tall ? w * 0.86 : Math.min(h, w * 0.62), rnd = rng(set.seed), LT = P.dark ? 1 : 1.5, i, j, k;
      var s = { u: u, qx: Q.x * w, qy: Q.y * h, qrx: Q.rx * w, qry: Q.ry * h, sys: [], links: [], adj: [], pk: [], queue: [], clock: 0, lastT: null, nextThird: 500, rnd: rnd, ready: false };

      var imgs = TONES.map(function (tn) { return blob(P, tn); });
      var map = [];
      for (i = 0; i < set.pos.length; i++) {
        var sh = SHAPE[set.shape[i] % SHAPE.length], R = base * sh.R, cr = Math.cos(sh.rot), sr = Math.sin(sh.rot);
        var sy = { R: R, k: sh.k, rot: sh.rot, cr: cr, sr: sr, hit: -1e9, act: -1e9, p: 0 };
        /* 화면 밖으로 나가지 않는 범위. 위쪽은 머리줄 높이만큼 더 비운다 */
        var ex = Math.sqrt(R * cr * R * cr + R * sh.k * sr * R * sh.k * sr), ey = Math.sqrt(R * sr * R * sr + R * sh.k * cr * R * sh.k * cr);
        var x0 = ex + 0.014 * w, x1 = w - ex - 0.014 * w, y0 = 0.105 * h + ey, y1 = h - ey - 0.03 * h;
        var x = set.pos[i][0] * w, y = set.pos[i][1] * h, it, dm = 0;
        /* 왼쪽 큰 글 배치에서 화면이 좁으면 글 폭(최대 520px)이 조용한 타원보다 오른쪽까지 나온다. 글 옆에 서는 궤도계는 그만큼 물린다 */
        if (left && y > 0.24 * h && y < 0.8 * h) x0 = Math.max(x0, Math.min(0.07 * w + 560 + ex, 0.7 * w));
        /* 조용한 타원에 걸치면 바깥으로 밀어낸다 */
        for (it = 0; it < 90; it++) {
          x = clamp(x, x0, x1); y = clamp(y, y0, y1);
          dm = ringMinD(s, sy, x, y); if (dm >= 1.08) break;
          var gx = (x - s.qx) / (s.qrx * s.qrx), gy = (y - s.qy) / (s.qry * s.qry), gl = Math.sqrt(gx * gx + gy * gy) || 1;
          x += gx / gl * 4; y += gy / gl * 4;
        }
        x = clamp(x, x0, x1); y = clamp(y, y0, y1); dm = ringMinD(s, sy, x, y);
        if (dm < 1.0) { map.push(-1); continue; }             // 끝내 타원 밖에 둘 자리가 없으면 그 궤도계는 그리지 않는다
        sy.x = x; sy.y = y;
        /* 타원에 가까울수록, 왼쪽 큰 글 배치에서는 왼쪽일수록 옅게 */
        sy.fade = 0.35 + 0.65 * ss((dm - 1.0) / 0.3);
        if (left) sy.fade *= 0.42 + 0.58 * ss((x / w - 0.30) / 0.26);
        /* 궤도와 구성원 점. 안쪽 궤도가 더 빨리 돈다 */
        sy.rings = [];
        var per = P_OUT * Math.sqrt(sh.R / 0.07) * (0.92 + rnd() * 0.16);
        for (j = 0; j < sh.rings.length; j++) {
          var f = sh.rings[j], d = [], ph = rnd() * TAU, n = sh.n[j];
          for (k = 0; k < n; k++) d.push(ph + (k + (rnd() - 0.5) * 0.55) * TAU / n);
          sy.rings.push({ f: f, w: sh.dir * TAU / (per * Math.pow(f, 0.9)), d: d });
        }
        /* 뒤에 깔리는 흐린 원 */
        sy.blob = {
          img: imgs[i % imgs.length], r: base * (0.26 + rnd() * 0.06) * (0.80 + sh.R * 3), a: 0.84 + rnd() * 0.16,
          ax: base * (0.018 + rnd() * 0.014), ay: base * (0.016 + rnd() * 0.012),
          fx: TAU / (11000 + rnd() * 7000), fy: TAU / (13000 + rnd() * 8000), fr: TAU / (8000 + rnd() * 5000),
          px: rnd() * TAU, py: rnd() * TAU, pr: rnd() * TAU
        };
        map.push(s.sys.length); s.sys.push(sy); s.adj.push([]);
      }

      /* 이음선: 곧은 선이 기본이다. 조용한 타원을 지나게 되면 바깥으로 휘어 보고, 그래도 지나면 잇지 않는다 */
      var gap = 5 * u, BOW = [0, 0.05, 0.1, 0.16, 0.22], aLink = (P.dark ? 0.27 : 0.22) * LT;
      for (i = 0; i < set.links.length; i++) {
        var ia = map[set.links[i][0]], ib = map[set.links[i][1]]; if (ia < 0 || ib < 0) continue;
        var A = s.sys[ia], B = s.sys[ib], p0 = edgePoint(A, B.x, B.y, gap), p1 = edgePoint(B, A.x, A.y, gap);
        var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, vx = p1[0] - p0[0], vy = p1[1] - p0[1], len = Math.sqrt(vx * vx + vy * vy) || 1;
        var nx = -vy / len, ny = vx / len; if (nx * (mx - s.qx) + ny * (my - s.qy) < 0) { nx = -nx; ny = -ny; }
        var ok = false, cx = 0, cy = 0, bi, q, e, v;
        for (bi = 0; bi < BOW.length && !ok; bi++) {
          cx = mx + nx * BOW[bi] * len; cy = my + ny * BOW[bi] * len; ok = true;
          for (q = 0; q <= 12; q++) { e = q / 12; v = 1 - e; if (qd(s, v * v * p0[0] + 2 * v * e * cx + e * e * p1[0], v * v * p0[1] + 2 * v * e * cy + e * e * p1[1]) < 1.04) { ok = false; break; } }
        }
        if (!ok) continue;
        /* 선의 농도는 양 끝 궤도계의 농도를 잇고, 조용한 타원에 가까운 구간에서 더 옅어진다 */
        var stops = [];
        for (q = 0; q <= 6; q++) {
          e = q / 6; v = 1 - e;
          var px = v * v * p0[0] + 2 * v * e * cx + e * e * p1[0], py = v * v * p0[1] + 2 * v * e * cy + e * e * p1[1];
          /* 타원 바로 앞(거리 1.04)에서는 0.1 안팎까지 내려가고, 조금만 벗어나면 제 농도로 돌아온다. 범위를 넓게 잡으면 가운데 배치의 선이 전부 흐려져 그물이 안 읽힌다 */
          stops.push(Math.min(1, aLink * (A.fade + (B.fade - A.fade) * e) * (0.42 + 0.58 * ss((qd(s, px, py) - 1.0) / 0.28))));
        }
        s.adj[ia].push(s.links.length); s.adj[ib].push(s.links.length);
        s.links.push({ a: ia, b: ib, x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1], cx: cx, cy: cy, stops: stops, grad: null,
          dur: clamp(1050 + len / base * 850, 1200, 1800), busy: false, last: -rnd() * 6000, ldir: 0, heat: 0 });
      }

      s.wash = washSprite(P); s.wrx = s.qrx * 1.62; s.wry = s.qry * 1.62;
      var gc = grain(P); s.pat = gc.getContext('2d').createPattern(gc, 'repeat');
      s.blobA = P.dark ? 0.29 : 0.29;                 // d2의 70%보다 조금 더 조용하게. 원반 가운데가 평평해서 같은 값이면 더 진해 보인다
      if (P.pal === 'mono') s.blobA *= P.dark ? 0.8 : 0.55; // 무채색 팔레트는 색 자체가 진한 회색이라 더 낮춘다
      s.blobA *= 0.8 + 0.2 * ss((w - 600) / 700);      // 작은 카드에서는 원이 화면을 더 많이 차지해 보이므로 조금 더 옅게
      s.lw = Math.max(0.8, 0.72 * u);                 // 선 굵기
      s.dotR = Math.max(1.25, 1.45 * u);              // 구성원 점
      s.pkR = Math.max(1.9, 2.15 * u);                // 꾸러미
      s.dash = [2.2 * u, 4.6 * u];
      s.ringA = 0.2 * LT; s.dotA = P.dark ? 0.86 : 0.92; s.coreA = 0.3 * LT;
      /* 강조색. 어두운 배경에서는 남색이 묻히므로 잉크 쪽으로 조금 밝힌다 */
      var ac = rgbOf(P.c(0.5, 1)), ik = rgbOf(P.ink(1)), am = P.dark ? 0.34 : 0;
      s.accRgb = Math.round(ac[0] + (ik[0] - ac[0]) * am) + ',' + Math.round(ac[1] + (ik[1] - ac[1]) * am) + ',' + Math.round(ac[2] + (ik[2] - ac[2]) * am);
      s.acc = 'rgb(' + s.accRgb + ')';
      for (i = 0; i < 170; i++) step(s, 16);          // 첫 장면부터 꾸러미가 오가는 중이도록 미리 돌려 둔다
      return s;
    },

    draw: function (ctx, w, h, t, P, s) {
      var dt = s.lastT == null ? 16 : clamp(t - s.lastT, 0, 50); s.lastT = t;
      step(s, dt);
      var c = s.clock, u = s.u, S = s.sys, L = s.links, i, j, k, sy, age;

      for (i = 0; i < S.length; i++) { age = c - S[i].hit; S[i].p = age < 2600 ? Math.min(1, age / 70) * Math.exp(-age / PULSE) : 0; }

      /* 1) 흐린 원: 밝은 배경에서는 물감처럼 겹쳐 진해지고(multiply), 어두운 배경에서는 빛처럼 겹쳐 밝아진다(screen) */
      ctx.globalCompositeOperation = P.dark ? 'screen' : 'multiply';
      for (i = 0; i < S.length; i++) {
        sy = S[i]; var b = sy.blob;
        var bx = sy.x + Math.sin(c * b.fx + b.px) * b.ax, by = sy.y + Math.sin(c * b.fy + b.py) * b.ay;
        var br = b.r * (1 + 0.06 * Math.sin(c * b.fr + b.pr));
        ctx.globalAlpha = Math.min(1, s.blobA * b.a * (1 + 0.1 * sy.p)); // 도착 반응은 궤도가 맡는다. 큰 원까지 번쩍이면 화면 여기저기가 깜박여 보인다
        ctx.drawImage(b.img, bx - br, by - br, br * 2, br * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      /* 문구 자리는 배경색으로 부드럽게 걷어 낸다 */
      ctx.globalAlpha = 0.9; ctx.drawImage(s.wash, s.qx - s.wrx, s.qy - s.wry, s.wrx * 2, s.wry * 2);
      ctx.globalAlpha = 1;

      /* 3) 그물: 이웃한 궤도계를 잇는 가는 점선. 꾸러미가 지나는 동안만 조금 또렷해진다 */
      if (!s.ready) {
        for (i = 0; i < L.length; i++) {
          var g = ctx.createLinearGradient(L[i].x0, L[i].y0, L[i].x1, L[i].y1), st = L[i].stops;
          for (j = 0; j < st.length; j++) g.addColorStop(j / (st.length - 1), P.ink(+st[j].toFixed(3)));
          L[i].grad = g;
        }
        s.ready = true;
      }
      ctx.lineCap = 'butt'; ctx.lineWidth = s.lw; ctx.setLineDash(s.dash);
      for (i = 0; i < L.length; i++) {
        var lk = L[i];
        ctx.globalAlpha = 0.72 + 0.28 * lk.heat; ctx.strokeStyle = lk.grad;
        ctx.beginPath(); ctx.moveTo(lk.x0, lk.y0); ctx.quadraticCurveTo(lk.cx, lk.cy, lk.x1, lk.y1); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;

      /* 2) 궤도계: 기울어진 동심 타원과 그 위를 도는 구성원 점. 가운데에는 해를 두지 않고 아주 작은 빈 고리만 둔다 */
      for (i = 0; i < S.length; i++) {
        sy = S[i]; var f = sy.fade, pz = sy.p, R = sy.R, nr = sy.rings.length;
        ctx.lineWidth = s.lw;
        for (j = 0; j < nr; j++) {
          var rr = R * sy.rings[j].f;
          ctx.strokeStyle = P.ink(Math.min(1, s.ringA * f * (j === nr - 1 ? 1 : 0.78) * (1 + 1.1 * pz)));
          ctx.beginPath(); ctx.ellipse(sy.x, sy.y, rr, rr * sy.k, sy.rot, 0, TAU); ctx.stroke();
        }
        if (pz > 0.03) { // 꾸러미가 닿으면 궤도가 강조색으로 잠깐 밝아진다
          ctx.strokeStyle = 'rgba(' + s.accRgb + ',' + Math.min(1, (P.dark ? 0.7 : 0.58) * pz * f).toFixed(3) + ')'; ctx.lineWidth = s.lw * 1.25;
          ctx.beginPath();
          for (j = 0; j < nr; j++) { rr = R * sy.rings[j].f; ctx.moveTo(sy.x + rr * sy.cr, sy.y + rr * sy.sr); ctx.ellipse(sy.x, sy.y, rr, rr * sy.k, sy.rot, 0, TAU); }
          ctx.stroke();
        }
        ctx.lineWidth = s.lw; ctx.strokeStyle = P.ink(Math.min(1, s.coreA * f));
        ctx.beginPath(); ctx.arc(sy.x, sy.y, 1.9 * u, 0, TAU); ctx.stroke();

        ctx.fillStyle = P.ink(Math.min(1, s.dotA * f));
        ctx.beginPath();
        for (j = 0; j < nr; j++) {
          var rg = sy.rings[j], ro = c * rg.w, r2 = R * rg.f;
          for (k = 0; k < rg.d.length; k++) {
            var a = rg.d[k] + ro, sa = Math.sin(a), lx = r2 * Math.cos(a), ly = r2 * sy.k * sa;
            var x = sy.x + lx * sy.cr - ly * sy.sr, y = sy.y + lx * sy.sr + ly * sy.cr, dr = s.dotR * (0.84 + 0.16 * (sa + 1)); // 앞쪽을 지나는 점이 조금 크다
            ctx.moveTo(x + dr, y); ctx.arc(x, y, dr, 0, TAU);
          }
        }
        ctx.fill();
      }

      /* 꾸러미: 강조색의 작은 점. 번짐도 꼬리도 없이 선을 따라 건너간다 */
      ctx.fillStyle = s.acc;
      for (i = 0; i < s.pk.length; i++) {
        var p = s.pk[i], q = clamp((c - p.t0) / p.dur, 0, 1), e = 0.45 * q + 0.55 * ss(q), lk2 = L[p.l];
        var fa = S[p.from].fade + (S[p.to].fade - S[p.from].fade) * e;
        if (p.dir < 0) e = 1 - e;
        var v = 1 - e, px = v * v * lk2.x0 + 2 * v * e * lk2.cx + e * e * lk2.x1, py = v * v * lk2.y0 + 2 * v * e * lk2.cy + e * e * lk2.y1;
        var pr = s.pkR * ss(q / 0.1) * ss((1 - q) / 0.07);
        if (pr < 0.2) continue;
        ctx.globalAlpha = Math.min(1, 0.25 + 0.75 * fa);
        ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
      }

      /* 아주 옅은 입자 */
      ctx.globalAlpha = P.dark ? 0.02 : 0.02; ctx.fillStyle = s.pat; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  });
})();
