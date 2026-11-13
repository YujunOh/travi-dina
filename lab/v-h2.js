/* H2. 동심원 궤도 v2: 가운데를 비운 기울어진 동심원 궤도 다섯 겹이 번갈아 반대 방향으로 돈다.
   이전 판(v-d5)에서 회의가 지적한 것을 고쳤다. 가운데 코어를 없애 중앙 서버처럼 읽히지 않게 했고,
   궤도마다 색을 달리하던 것과 빛나는 혜성을 빼고 잉크 선 + 강조색 하나만 쓴다.
   움직임은 두 겹이다. (1) 궤도 위 기관(노드)이 눈에 보이는 속도로 돈다. (2) 이웃한 궤도의 기관끼리 작은 점을 주고받는다.
   점은 떠난 기관이 가던 방향으로 살짝 밀려 나갔다가 건너편 기관이 오는 자리에 정확히 닿는다. 닿으면 고리가 한 번 퍼지고 그 기관이 몇 초 채워진다.
   글 자리(P.quiet)는 가운데 배치면 궤도가 그 바깥을 감싸고, 왼쪽 큰 글 배치면 그림 중심을 오른쪽으로 옮기고 왼쪽은 옅게 누른다. */
(function () {
  var TAU = Math.PI * 2, NR = 5;
  var PERIOD = [30, 36, 44, 53, 64];          // 궤도 한 바퀴에 걸리는 시간(초, 속도 100% 기준). 안쪽이 빠르다
  var GAIN = [1, 0.96, 0.9, 0.8, 0.7];        // 바깥 궤도일수록 선을 조금씩 옅게
  var NB = 12, NL = 720;                       // 선 알파 단계 수, 궤도 각도별 알파 표 칸 수
  var FLY0 = 640, FLY1 = 240;                  // 점이 건너가는 시간 640~880ms
  var TRACE = 950, PING = 540, HOLD = 1900, FADE = 1300, REST = 1600; // 길이 남는 시간, 고리, 채워진 채 머무는 시간과 비워지는 시간, 같은 기관이 다시 보내기까지 쉬는 시간
  var FLOOR = 0.26;                            // 글 자리 안에서 선이 남는 비율(가장 진한 선도 0.12 알파를 넘지 않게)
  var T = { x: 0, y: 0 };

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sstep(a, b, x) { var k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  function ease(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function eOut(u) { var k = 1 - clamp(u, 0, 1); return 1 - k * k * k; }
  function qz(a) { return a <= 0 ? 0 : a >= 1 ? 40 : (a * 40 + 0.5) | 0; }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* 궤도 i 위 각도 a인 점의 화면 좌표를 o에 써넣는다. 기울어진 원(타원)을 화면 안에서 phi만큼 더 돌린 모양 */
  function pos(s, i, a, o) {
    var X = s.R[i] * Math.cos(a), Y = s.R[i] * s.K * Math.sin(a);
    o.x = s.cx + X * s.cp - Y * s.sp; o.y = s.cy + X * s.sp + Y * s.cp;
  }
  function inView(s, x, y, m) { return x > -m && x < s.w + m && y > -m && y < s.h + m; }
  /* 글 자리(P.quiet) 타원 안이면 0, 띠를 지나 바깥으로 나가면 1 */
  function quiet(s, x, y) {
    var dx = (x - s.qx) / s.qa, dy = (y - s.qy) / s.qb;
    return sstep(1, 1 + s.band, Math.sqrt(dx * dx + dy * dy));
  }
  /* 왼쪽 큰 글 배치에서는 화면 왼쪽 전체를 옅게 눌러 무게를 오른쪽에 둔다 */
  function side(s, x) { return s.left ? 0.2 + 0.8 * sstep(s.w * 0.36, s.w * 0.6, x) : 1; }
  function nodeK(s, x, y) { return quiet(s, x, y) * side(s, x); }

  function mergeBands(B) {
    B.sort(function (a, b) { return a[0] - b[0]; });
    var out = [B[0]];
    for (var k = 1; k < B.length; k++) { var l = out[out.length - 1]; if (B[k][0] <= l[1]) l[1] = Math.max(l[1], B[k][1]); else out.push(B[k]); }
    return out;
  }
  /* 궤도 반지름 정하기. 화면 가장자리에 스치듯 닿는 궤도는 실수처럼 보여서, 닿는 반지름 근처(금지 띠)는 비운다.
     띠 앞까지는 같은 간격으로 채워 마지막 궤도가 띠 바로 앞(가장자리에서 넉넉히 안쪽)에 오게 하고, 그다음 궤도는 띠를 건너뛰어 화면 밖으로 시원하게 잘리게 한다 */
  function ringRadii(r0, gmin, bands) {
    var k, j, r = r0, R = [], g = gmin * 1.25;
    for (k = 0; k < bands.length; k++) if (r > bands[k][0] && r < bands[k][1]) r = bands[k][1];
    R.push(r);
    while (R.length < NR) {
      var nb = null;
      for (k = 0; k < bands.length; k++) if (bands[k][0] >= r - 0.5) { nb = bands[k]; break; }
      if (!nb) { r += g; R.push(r); g *= 1.1; continue; }
      var room = nb[0] - r, m = Math.floor(room / gmin);
      if (m < 1) { r = nb[1]; R.push(r); continue; }
      if (m > NR - R.length) { r += g; R.push(r); g *= 1.1; continue; }
      var gg = room / m;
      for (j = 1; j <= m; j++) R.push(r + gg * j);
      r = nb[0]; g = gg * 1.12;
    }
    return R;
  }

  /* 교환 하나를 띄운다. 출발은 지금 자리, 도착은 건너편 기관이 도착 시각에 있을 자리라서 길이 화면에 고정된다 */
  function launch(s) {
    var now = s.clock, dur = FLY0 + FLY1 * s.rnd(), N = s.nodes, n = N.length, F = s.fl, i, j, o, a;
    for (i = 0; i < n; i++) {
      o = N[i]; a = o.a + s.W[o.ring] * now;
      pos(s, o.ring, a, T); o.x0 = T.x; o.y0 = T.y; o.c0 = Math.cos(a); o.s0 = Math.sin(a);
      o.ok0 = !o.inb && now - o.out > REST && T.y > s.top && inView(s, T.x, T.y, -10) && nodeK(s, T.x, T.y) > 0.8;
      pos(s, o.ring, a + s.W[o.ring] * dur, T); o.x1 = T.x; o.y1 = T.y;
      o.ok1 = !o.inb && now - o.out > 500 && T.y > s.top && inView(s, T.x, T.y, -10) && nodeK(s, T.x, T.y) > 0.8;
    }
    var best = -1e9, A = null, B = null, d, dx, dy;
    for (i = 0; i < n; i++) {
      var p = N[i]; if (!p.ok0) continue;
      /* 지금 날고 있는 교환과 가까우면 감점해서 한곳에 몰리지 않게 한다 */
      var pen = 0;
      for (j = 0; j < F.length; j++) if (!F[j].done) { dx = p.x0 - F[j].x0; dy = p.y0 - F[j].y0; d = Math.sqrt(dx * dx + dy * dy); if (d < s.spread) pen += 1 - d / s.spread; }
      var g0 = Math.sqrt(p.c0 * p.c0 + s.K * s.K * p.s0 * p.s0), idle = Math.min(1, (now - p.act) / 5000);
      for (var dr = -1; dr <= 1; dr += 2) {
        var rj = p.ring + dr; if (rj < 0 || rj >= NR) continue;
        var L = s.byRing[rj], gl = Math.abs(s.R[rj] - s.R[p.ring]) * g0; // 이 자리에서 두 궤도 사이 거리
        for (j = 0; j < L.length; j++) {
          var q = L[j]; if (!q.ok1) continue;
          dx = q.x1 - p.x0; dy = q.y1 - p.y0; d = Math.sqrt(dx * dx + dy * dy); if (d > gl * 1.35 || d > s.hop) continue;
          /* 짧은 길, 오래 쉰 기관, 안쪽·바깥쪽 번갈아 순으로 고른다. 간격이 넓은 바깥 궤도로 가는 긴 길은 한 번 더 감점해 드물게 나오게 한다 */
          var sc = -0.8 * d / s.hop - 1.1 * d / gl + 0.9 * (idle + Math.min(1, (now - q.act) / 5000)) + ((dr < 0) === s.wantIn ? 0.8 : 0) - 1.3 * pen + 0.45 * s.rnd();
          if (sc > best) { best = sc; A = p; B = q; }
        }
      }
    }
    if (!A) return false;
    dx = B.x1 - A.x0; dy = B.y1 - A.y0; d = Math.sqrt(dx * dx + dy * dy);
    /* 떠나는 기관이 가던 방향(접선)으로 길을 휜다 */
    var sg = s.W[A.ring] > 0 ? 1 : -1, tx = -A.s0 * sg, ty = s.K * A.c0 * sg;
    var ux = tx * s.cp - ty * s.sp, uy = tx * s.sp + ty * s.cp, ul = Math.sqrt(ux * ux + uy * uy) || 1, bend = d * 0.22;
    F.push({ x0: A.x0, y0: A.y0, x1: B.x1, y1: B.y1, mx: (A.x0 + B.x1) / 2 + ux / ul * bend, my: (A.y0 + B.y1) / 2 + uy / ul * bend, t0: now, t1: now + dur, dur: dur, b: B, done: false });
    A.out = now; A.act = now; B.inb = true; s.wantIn = !s.wantIn;
    return true;
  }

  function step(s, dt) {
    s.clock += dt;
    var now = s.clock, F = s.fl, k, f;
    for (k = F.length - 1; k >= 0; k--) {
      f = F[k];
      if (!f.done && now >= f.t1) { f.done = true; f.b.hit = f.t1; f.b.act = f.t1; f.b.inb = false; }
      if (f.done && now - f.t1 > TRACE) F.splice(k, 1);
    }
    /* 일정한 박자로 띄운다. 후보가 없으면 조금 뒤에 다시 본다 */
    if (now >= s.next) {
      if (launch(s)) s.next = Math.max(s.next, now - s.iv) + s.iv * (0.86 + 0.28 * s.rnd());
      else s.next = now + 48;
    }
  }

  LAB.register({
    id: 'h2-orbits', name: '동심원 궤도 · 궤도 사이를 오가는 점', short: '동심원', en: 'Orbits',
    hero: true, designed: true, textDefault: true, defaultPal: 'indigo', heroPal: { light: 'indigo', dark: 'indigo' },
    idea: '가운데가 빈 동심원 궤도 위에서 참여 기관들이 돌고 이웃한 궤도는 서로 반대 방향으로 돈다. 이웃 궤도의 기관끼리 작은 점을 주고받고 점을 받은 기관은 잠시 색이 채워진다.',
    init: function (w, h, P) {
      var rnd = rng(7214093), q = P.quiet || { x: 0.5, y: 0.5, rx: 0.31, ry: 0.26 };
      /* 좁은 화면: 세로로 길거나, 가운데 배치인데 폭이 700px 아래이고 정사각형에 가까운 창. 제목 글자가 34px 아래로는 줄지 않아 글 자리 타원보다 넓어지기 때문이다 */
      var narrow = w < h * 0.8 || (P.layout !== 'left' && w < 700 && w < h * 1.25), left = P.layout === 'left' && !narrow;
      var s = { w: w, h: h, left: left, rnd: rnd, clock: 0, lastT: null, fl: [], wantIn: false, next: 0 };
      var u = s.u = clamp(w / 900, 0.75, 1.6), lw = s.lw = clamp(w / 1100, 0.8, 1.3), i, j, k, a;
      s.qx = q.x * w; s.qy = q.y * h; s.qa = Math.max(8, q.rx * w); s.qb = Math.max(8, q.ry * h);
      /* 세로로 긴 화면은 글이 폭을 거의 다 쓰므로 배치와 상관없이 글 자리를 화면 폭만큼 넓게 잡고 위아래로만 궤도를 보인다 */
      if (narrow) { s.qx = w / 2; s.qa = Math.max(s.qa, w * 0.46); }
      s.band = left ? 0.3 : 0.1;
      s.top = Math.min(84, h * 0.1);                // 위쪽 띠(첫 화면에서는 헤더 자리)에서는 교환을 시작하거나 끝내지 않는다. 헤더에 가려 선만 매달려 보이기 때문이다

      /* 구도: 가운데 배치는 글 자리 타원을 바깥에서 감싸고, 왼쪽 배치는 중심을 오른쪽(0.67w)에 둔다 */
      var phi, K, r0, gmin;
      if (left) {
        s.cx = w * 0.67; s.cy = h * 0.53; K = 0.55; phi = -0.26;
      } else {
        s.cx = s.qx; s.cy = s.qy; K = clamp(s.qb / s.qa, 0.42, 0.92); phi = K > 0.7 ? -0.06 : -0.14;
      }
      s.K = K; s.cp = Math.cos(phi); s.sp = Math.sin(phi);
      if (!left) {
        /* 가장 안쪽 궤도가 글 자리 타원에서 1.1배 이상 떨어지는 가장 작은 반지름 */
        var mn = 1e9;
        for (k = 0; k < 360; k++) {
          a = k / 360 * TAU; var ux = Math.cos(a) * s.cp - K * Math.sin(a) * s.sp, uy = Math.cos(a) * s.sp + K * Math.sin(a) * s.cp;
          mn = Math.min(mn, Math.sqrt(ux * ux / (s.qa * s.qa) + uy * uy / (s.qb * s.qb)));
        }
        r0 = 1.1 / mn; gmin = r0 * 0.105;
      }
      var hf = Math.sqrt(s.cp * s.cp + K * K * s.sp * s.sp), vf = Math.sqrt(s.sp * s.sp + K * K * s.cp * s.cp);
      var rs = (left ? w - s.cx : Math.min(s.cx, w - s.cx)) / hf, rb = (h - s.cy) / vf; // 옆 가장자리, 아래 가장자리에 닿는 반지름
      if (!left) s.R = ringRadii(r0, gmin, mergeBands([[rs * 0.93, rs * 1.09], [rb * 0.93, rb * 1.09]]));
      else {
        /* 왼쪽 배치는 반지름을 직접 정한다. 안쪽 네 궤도는 촘촘하게 두되 오른쪽 가장자리에서 넉넉히 떨어뜨리고,
           다섯 번째는 가장자리를 크게 넘겨 잘리게 한다. 가장자리 바로 안팎에 걸치는 궤도가 있으면 그림이 벽에 끼인 것처럼 보인다.
           가운데 빈 자리는 넓게 잡아 과녁처럼 읽히지 않게 한다 */
        var rr = Math.min(rs, rb * 1.18), R4 = Math.min(rr * 1.22, rb * 0.86);
        if (R4 < rr * 1.12) R4 = Math.max(rr * 1.22, rb * 1.2);
        s.R = [rr * 0.43, rr * 0.56, rr * 0.69, rr * 0.82, R4];
      }
      s.hop = (left ? 1.85 : 1.7) * (s.R[1] - s.R[0]); // 한 번에 건너는 길이의 상한. 넘으면 짧은 교환으로 읽히지 않는다

      /* 기관(노드): 궤도 둘레에 비슷한 간격으로 놓고 조금씩 흩는다 */
      s.W = []; s.nodes = []; s.byRing = [];
      var sp = clamp(w * (left ? 0.13 : 0.165), 96, 300);
      for (i = 0; i < NR; i++) {
        s.W.push((i % 2 ? -1 : 1) * TAU / (PERIOD[i] * 1000));
        var circ = TAU * s.R[i] * Math.sqrt((1 + K * K) / 2), n = clamp(Math.round(circ / sp), 4, 28), ph = rnd() * TAU, L = [];
        for (j = 0; j < n; j++) {
          var o = { ring: i, a: ph + (j + (rnd() - 0.5) * 0.5) / n * TAU, hit: -1e9, out: -1e9, act: -rnd() * 5000, inb: false, ok0: false, ok1: false, x0: 0, y0: 0, x1: 0, y1: 0, c0: 0, s0: 0 };
          L.push(o); s.nodes.push(o);
        }
        s.byRing.push(L);
      }

      /* 선 농도: 뒤쪽 반(위)은 옅고 가늘게, 앞쪽 반(아래)은 진하게. 밝은 배경은 1.4~1.5배 */
      var aF = P.dark ? 0.34 : 0.42, aB = P.dark ? 0.16 : 0.2; // 뒤쪽 반이 너무 옅으면 어두운 배경에서 점선 궤도가 끊겨 보인다
      function lineN(ri, ang, x, y) {
        return GAIN[ri] * (aB / aF + (1 - aB / aF) * sstep(-1, 1, Math.sin(ang))) * (FLOOR + (1 - FLOOR) * quiet(s, x, y)) * side(s, x);
      }
      s.dotRing = left ? 2 : 1; s.tickRing = left ? 4 : 3;       // 점선 궤도 하나, 눈금 궤도 하나. 눈금은 글에서 먼 바깥 궤도에 둔다
      /* 궤도 각도별 알파 단계 표(점선·눈금이 돌 때 쓴다). 화면 밖은 -1 */
      s.lut = [];
      for (i = 0; i < NR; i++) {
        var lut = new Int8Array(NL);
        for (k = 0; k < NL; k++) { a = (k + 0.5) / NL * TAU; pos(s, i, a, T); lut[k] = inView(s, T.x, T.y, 24) ? Math.min(NB - 1, Math.floor(lineN(i, a, T.x, T.y) * NB)) : -1; }
        s.lut.push(lut);
      }
      /* 궤도 선은 돌아도 모양이 같으므로 알파 단계별 꺾은선으로 한 번만 만들어 둔다 */
      s.bins = []; for (k = 0; k < NB; k++) s.bins.push([]);
      for (i = 0; i < NR; i++) {
        if (i === s.dotRing) continue;
        var ns = clamp(Math.ceil(TAU * s.R[i] / 8), 120, 900), run = null, rbin = -1, px = 0, py = 0, pv = false, pn = 0;
        for (k = 0; k <= ns; k++) {
          a = k / ns * TAU; pos(s, i, a, T);
          var v = inView(s, T.x, T.y, 12), nn = lineN(i, a, T.x, T.y);
          if (k > 0) {
            if (pv || v) {
              var b = Math.min(NB - 1, Math.floor((nn + pn) / 2 * NB));
              if (!run || b !== rbin) { run = [px, py]; s.bins[b].push(run); rbin = b; }
              run.push(T.x, T.y);
            } else run = null;
          }
          px = T.x; py = T.y; pv = v; pn = nn;
        }
      }
      s.nd = Math.round(TAU * s.R[s.dotRing] / (11 * lw)); s.dLen = 3.2 * lw / s.R[s.dotRing];
      s.nt = 10 * Math.max(6, Math.round(TAU * s.R[s.tickRing] / (15 * u) / 10));

      /* 색 문자열은 미리 만들어 둔다 */
      var AT = P.dark ? 0.6 : 0.5;                    // 강조색은 한 가지. 어두운 배경에서는 살짝 밝은 쪽
      s.inkLine = []; s.lwBin = [];
      for (k = 0; k < NB; k++) { var f = (k + 0.5) / NB; s.inkLine.push(P.ink(aF * f)); s.lwBin.push(lw * (0.6 + 0.45 * f)); }
      s.inkQ = []; s.accQ = [];
      for (k = 0; k <= 40; k++) { s.inkQ.push(P.ink(k / 40)); s.accQ.push(P.c(AT, k / 40)); }

      s.nr = 2.6 * u; s.dr = 2.2 * u;                 // 기관과 건너가는 점의 반지름
      s.nf = w < 700 ? 5 : 6;                         // 동시에 날고 있는 점 수
      s.iv = (FLY0 + FLY1 / 2) / s.nf;
      s.spread = Math.max(w, h) * 0.2;
      for (k = 0; k < 300; k++) step(s, 16);          // 첫 장면부터 교환이 한창이도록 미리 돌린다
      return s;
    },
    draw: function (ctx, w, h, t, P, s) {
      var dt = s.lastT == null ? 16 : clamp(t - s.lastT, 0, 50); s.lastT = t;
      step(s, dt);
      var now = s.clock, cx = s.cx, cy = s.cy, cp = s.cp, sp = s.sp, K = s.K, lw = s.lw, u = s.u, i, k, b, a, ca, sa, X, Y, x, y, cur, fr;

      /* 1. 궤도 선 */
      ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      for (b = 0; b < NB; b++) {
        var runs = s.bins[b]; if (!runs.length) continue;
        ctx.strokeStyle = s.inkLine[b]; ctx.lineWidth = s.lwBin[b]; ctx.beginPath();
        for (i = 0; i < runs.length; i++) { var rn = runs[i]; ctx.moveTo(rn[0], rn[1]); for (k = 2; k < rn.length; k += 2) ctx.lineTo(rn[k], rn[k + 1]); }
        ctx.stroke();
      }

      /* 2. 점선 궤도: 짧은 선 조각이 궤도와 함께 돌아 회전이 선에서도 읽힌다 */
      var D = s.dotRing, RD = s.R[D], lutD = s.lut[D], rotD = s.W[D] * now, stD = TAU / s.nd, del = s.dLen;
      cur = -1;
      for (k = 0; k < s.nd; k++) {
        a = rotD + k * stD; fr = a / TAU; fr -= Math.floor(fr); b = lutD[Math.min(NL - 1, (fr * NL) | 0)]; if (b < 0) continue;
        if (b !== cur) { if (cur >= 0) ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = s.inkLine[b]; ctx.lineWidth = s.lwBin[b] * 1.15; cur = b; }
        ca = Math.cos(a); sa = Math.sin(a); X = RD * ca; Y = RD * K * sa;
        var eX = X - RD * sa * del, eY = Y + RD * K * ca * del;
        ctx.moveTo(cx + X * cp - Y * sp, cy + X * sp + Y * cp); ctx.lineTo(cx + eX * cp - eY * sp, cy + eX * sp + eY * cp);
      }
      if (cur >= 0) ctx.stroke();

      /* 3. 눈금 궤도: 바깥쪽으로 난 짧은 눈금, 열 칸마다 긴 눈금 */
      var TR = s.tickRing, RT = s.R[TR], lutT = s.lut[TR], rotT = s.W[TR] * now, stT = TAU / s.nt;
      cur = -1;
      for (k = 0; k < s.nt; k++) {
        a = rotT + k * stT; fr = a / TAU; fr -= Math.floor(fr); b = lutT[Math.min(NL - 1, (fr * NL) | 0)]; if (b < 0) continue;
        if (b !== cur) { if (cur >= 0) ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = s.inkLine[b]; ctx.lineWidth = s.lwBin[b] * 0.9; cur = b; }
        ca = Math.cos(a); sa = Math.sin(a);
        var r1 = RT + 3 * u, r2 = RT + (k % 10 === 0 ? 14 : 8) * u;
        X = r1 * ca; Y = r1 * K * sa; ctx.moveTo(cx + X * cp - Y * sp, cy + X * sp + Y * cp);
        X = r2 * ca; Y = r2 * K * sa; ctx.lineTo(cx + X * cp - Y * sp, cy + X * sp + Y * cp);
      }
      if (cur >= 0) ctx.stroke();

      /* 4. 건너간 길: 점과 함께 그어지고 도착한 뒤 1초 안에 사라진다 */
      var F = s.fl, f, e, al, TA = P.dark ? 0.86 : 0.62; // 남색은 어두운 배경에서 가라앉으므로 길을 더 진하게 긋는다
      ctx.lineCap = 'round'; ctx.lineWidth = lw * (P.dark ? 1.15 : 1.05);
      for (k = 0; k < F.length; k++) {
        f = F[k];
        if (!f.done) {
          e = ease((now - f.t0) / f.dur);
          var ax = f.x0 + (f.mx - f.x0) * e, ay = f.y0 + (f.my - f.y0) * e, bx = f.mx + (f.x1 - f.mx) * e, by = f.my + (f.y1 - f.my) * e;
          f.px = ax + (bx - ax) * e; f.py = ay + (by - ay) * e;
          ctx.strokeStyle = s.accQ[qz(TA)]; ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.quadraticCurveTo(ax, ay, f.px, f.py); ctx.stroke();
        } else {
          /* 도착한 뒤에는 길이 옅어지면서 출발 쪽부터 걷혀 닿은 자리로 줄어든다.
             기관은 계속 돌아 나가므로, 길을 통째로 남기면 어디에도 붙지 않은 긴 호가 떠 있게 된다 */
          var g = (now - f.t1) / (TRACE * 0.85); if (g >= 0.98) continue;
          al = TA * (1 - g) * (1 - g * 0.5); if (!(al > 0.02)) continue;
          var rq = ease(g);
          var s0x = f.x0 + (f.mx - f.x0) * rq, s0y = f.y0 + (f.my - f.y0) * rq, c1x = f.mx + (f.x1 - f.mx) * rq, c1y = f.my + (f.y1 - f.my) * rq;
          ctx.strokeStyle = s.accQ[qz(al)]; ctx.beginPath(); ctx.moveTo(s0x + (c1x - s0x) * rq, s0y + (c1y - s0y) * rq); ctx.quadraticCurveTo(c1x, c1y, f.x1, f.y1); ctx.stroke();
        }
      }

      /* 5. 기관: 속이 빈 작은 원. 점을 받으면 강조색으로 채워졌다가 서서히 비워진다 */
      var N = s.nodes, pad = 20 * u, NA = P.dark ? 0.82 : 0.74, FA = P.dark ? 0.7 : 0.45, o, vis, d, rr, age, fill; // FA: 뒤쪽 기관이 채워졌을 때의 최소 농도
      for (i = 0; i < N.length; i++) {
        o = N[i]; a = o.a + s.W[o.ring] * now; ca = Math.cos(a); sa = Math.sin(a);
        X = s.R[o.ring] * ca; Y = s.R[o.ring] * K * sa; x = cx + X * cp - Y * sp; y = cy + X * sp + Y * cp;
        if (x < -pad || x > w + pad || y < -pad || y > h + pad) continue;
        vis = nodeK(s, x, y); if (vis < 0.03) continue;
        d = (sa + 1) / 2; al = (0.5 + 0.5 * d) * vis; rr = s.nr * (0.8 + 0.28 * d);
        age = now - o.hit; fill = age < HOLD ? 1 : age < HOLD + FADE ? 1 - sstep(0, 1, (age - HOLD) / FADE) : 0;
        if (age < 240) rr *= 1 + 0.3 * (1 - eOut(age / 240));
        ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU);
        ctx.globalAlpha = Math.min(1, vis * 1.5); ctx.fillStyle = P.bg; ctx.fill(); ctx.globalAlpha = 1; // 궤도 선이 원을 관통하지 않게 속을 바탕색으로 지운다
        ctx.lineWidth = lw;
        var fa = fill * Math.min(1, vis * 1.5) * (FA + (1 - FA) * al);
        if (fill > 0.01) { ctx.fillStyle = s.accQ[qz(fa)]; ctx.fill(); }
        if (fill < 0.99) { ctx.strokeStyle = s.inkQ[qz(NA * al * (1 - fill))]; ctx.stroke(); }
        if (fill > 0.01) { ctx.strokeStyle = s.accQ[qz(fa)]; ctx.stroke(); }
        if (age < PING) {
          var pk = age / PING;
          ctx.beginPath(); ctx.arc(x, y, rr + u * (1.5 + 5.5 * eOut(pk)), 0, TAU);
          ctx.strokeStyle = s.accQ[qz(0.9 * (1 - pk) * (1 - pk) * vis)]; ctx.lineWidth = lw; ctx.stroke();
        }
      }

      /* 6. 건너가는 점: 번짐 없는 작은 원 */
      ctx.fillStyle = s.accQ[40];
      for (k = 0; k < F.length; k++) {
        f = F[k]; if (f.done) continue;
        ctx.beginPath(); ctx.arc(f.px, f.py, s.dr, 0, TAU); ctx.fill();
      }
    }
  });
})();
