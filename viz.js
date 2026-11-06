/* TRAVI 움직이는 도식. canvas에 그린다. 조작은 받지 않는다.
   hero: 기울어진 궤도 위 노드들, 노드를 차례로 지나가는 모델(꼬리 달린 빛), 공동 모델로 오가는 신호
   fl / tree / tl: 방식 카드의 작은 그림 */
(function () {
  var INK = '13,18,32';
  var BG = '#fbfbfd';
  var PAL = [[26, 163, 217], [91, 76, 224], [224, 103, 94]];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pal(t, a) {
    t = Math.max(0, Math.min(1, t));
    var i = t < 0.5 ? 0 : 1, k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    var c0 = PAL[i], c1 = PAL[i + 1];
    return 'rgba(' + Math.round(c0[0] + (c1[0] - c0[0]) * k) + ',' + Math.round(c0[1] + (c1[1] - c0[1]) * k) + ',' + Math.round(c0[2] + (c1[2] - c0[2]) * k) + ',' + a + ')';
  }
  function ink(a) { return 'rgba(' + INK + ',' + a + ')'; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function fit(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }
  /* 닫힌 Catmull-Rom 곡선 위의 점. u는 0..n 구간 위치 */
  function cr(p, u) {
    var n = p.length; u = ((u % n) + n) % n;
    var i = Math.floor(u), t = u - i;
    var a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], d = p[(i + 2) % n];
    var t2 = t * t, t3 = t2 * t;
    function f(k) { return 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3); }
    return [f(0), f(1)];
  }
  /* 열린 곡선(끝을 반복) */
  function crOpen(p, u) {
    var n = p.length; u = Math.max(0, Math.min(n - 1.0001, u));
    var i = Math.floor(u), t = u - i;
    var a = p[Math.max(0, i - 1)], b = p[i], c = p[Math.min(n - 1, i + 1)], d = p[Math.min(n - 1, i + 2)];
    var t2 = t * t, t3 = t2 * t;
    function f(k) { return 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3); }
    return [f(0), f(1)];
  }
  /* 꼬리 달린 빛: 경로 함수 at(u)를 u0..u1 구간으로 그린다 */
  function comet(ctx, at, u0, u1, width, steps) {
    var prev = at(u0);
    for (var s = 1; s <= steps; s++) {
      var k = s / steps, p = at(u0 + (u1 - u0) * k);
      ctx.strokeStyle = pal(k, Math.pow(k, 1.6) * 0.95);
      ctx.lineWidth = 0.4 + width * Math.pow(k, 1.2);
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      prev = p;
    }
    var g = ctx.createRadialGradient(prev[0], prev[1], 0, prev[0], prev[1], 16);
    g.addColorStop(0, pal(0.9, 0.35)); g.addColorStop(1, pal(0.9, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(prev[0], prev[1], 16, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(prev[0], prev[1], 3, 0, 6.283); ctx.fill();
    ctx.strokeStyle = pal(0.55, 1); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(prev[0], prev[1], 4.2, 0, 6.283); ctx.stroke();
    return prev;
  }
  function node(ctx, x, y, r, a) {
    ctx.fillStyle = BG; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = ink(0.75 * a); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = ink(0.85 * a); ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, 6.283); ctx.fill();
  }
  function ping(ctx, x, y, age, dur, maxR, c) {
    if (age < 0 || age > dur) return;
    var k = age / dur;
    ctx.strokeStyle = pal(c, (1 - k) * 0.6); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 4 + maxR * ease(k), 0, 6.283); ctx.stroke();
  }

  /* ---------- 첫 화면 도식 ---------- */
  function hero(cv) {
    var N = [], OUT = 9, IN = 5, i;
    for (i = 0; i < OUT; i++) N.push({ a: i / OUT * 6.283 + 0.15 * Math.sin(i * 2.3), r: 1, y: 0.09 * Math.sin(i * 1.7), hit: -1e9 });
    for (i = 0; i < IN; i++) N.push({ a: (i + 0.5) / IN * 6.283, r: 0.5, y: -0.06 * Math.cos(i * 2.1), hit: -1e9 });
    var TOUR = [0, 1, 9, 2, 3, 10, 4, 5, 11, 6, 12, 7, 8, 13];
    /* 각 노드에서 가장 가까운 두 노드와 잇는다(회전해도 거리는 그대로) */
    var base = N.map(function (n) { return [Math.cos(n.a) * n.r, n.y, Math.sin(n.a) * n.r]; });
    var EDGES = [];
    base.forEach(function (p, a) {
      base.map(function (q, b) { return { b: b, d: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }; })
        .filter(function (o) { return o.b !== a; }).sort(function (x, y) { return x.d - y.d; }).slice(0, 2)
        .forEach(function (o) { if (!EDGES.some(function (e) { return (e[0] === o.b && e[1] === a); })) EDGES.push([a, o.b]); });
    });
    var sig = [], lastSpawn = 0, lastSeg = -1, S, cx, cy, view;

    function resize() {
      view = fit(cv);
      S = Math.min(view.w / 2.6, view.h / 1.08);
      cx = view.w / 2; cy = view.h / 2 + S * 0.04;
    }
    function proj(x, y, z, rot) {
      var c = Math.cos(rot), s = Math.sin(rot);
      var x1 = x * c - z * s, z1 = x * s + z * c;
      var e = 0.42, ce = Math.cos(e), se = Math.sin(e);
      var y2 = y * ce - z1 * se, z2 = y * se + z1 * ce;
      var f = 4 / (4 + z2);
      return [cx + x1 * S * f, cy - y2 * S * f, z2, f];
    }
    function ring(ctx, r, rot, a, dash) {
      ctx.strokeStyle = ink(a); ctx.lineWidth = 1;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      for (var k = 0; k <= 96; k++) { var t = k / 96 * 6.283, p = proj(Math.cos(t) * r, 0, Math.sin(t) * r, rot); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    function draw(now) {
      var ctx = view.ctx, rot = now * 0.00005;
      ctx.clearRect(0, 0, view.w, view.h);
      var P = N.map(function (n) { return proj(Math.cos(n.a) * n.r, n.y, Math.sin(n.a) * n.r, rot); });
      var C = proj(0, 0, 0, rot);
      function depth(p) { return 0.45 + 0.55 * (1 - (p[2] + 1.1) / 2.2); }

      /* 궤도 */
      ring(ctx, 1, rot, 0.1);
      ctx.lineDashOffset = -now * 0.01; ring(ctx, 0.5, rot, 0.08, [2, 6]); ctx.lineDashOffset = 0;
      ring(ctx, 0.22, -rot * 3, 0.1, [1, 4]);

      /* 그물과 신호선 */
      EDGES.forEach(function (e) {
        var p = P[e[0]], q = P[e[1]];
        ctx.strokeStyle = ink(0.13 * Math.min(depth(p), depth(q))); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      });
      P.forEach(function (p) {
        var g = ctx.createLinearGradient(C[0], C[1], p[0], p[1]);
        g.addColorStop(0, pal(0.5, 0.0)); g.addColorStop(1, ink(0.07 * depth(p)));
        ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(C[0], C[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      });

      /* 모델이 지나가는 길(옅게) */
      var TP = TOUR.map(function (k) { return P[k]; });
      ctx.strokeStyle = ink(0.1); ctx.lineWidth = 1; ctx.beginPath();
      for (var s = 0; s <= TOUR.length * 16; s++) { var q = cr(TP, s / 16); s ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.closePath(); ctx.stroke();

      /* 공동 모델로 오가는 신호 */
      if (now - lastSpawn > 260) {
        lastSpawn = now;
        sig.push({ k: Math.floor(Math.random() * N.length), t0: now, d: 1600 + Math.random() * 1200, inw: Math.random() < 0.6 });
      }
      sig = sig.filter(function (g) { return now - g.t0 < g.d; });
      sig.forEach(function (g) {
        var p = P[g.k], k = (now - g.t0) / g.d, a = Math.sin(k * Math.PI);
        var mx = (p[0] + C[0]) / 2, my = (p[1] + C[1]) / 2 - S * 0.12;
        function at(t) { if (!g.inw) t = 1 - t; var u = 1 - t; return [u * u * p[0] + 2 * u * t * mx + t * t * C[0], u * u * p[1] + 2 * u * t * my + t * t * C[1]]; }
        var col = g.k / N.length;
        var prev = at(Math.max(0, k - 0.12));
        for (var j = 1; j <= 8; j++) {
          var pt = at(Math.max(0, k - 0.12 + 0.12 * j / 8));
          ctx.strokeStyle = pal(col, a * 0.55 * j / 8); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke(); prev = pt;
        }
        ctx.fillStyle = pal(col, a * 0.9); ctx.beginPath(); ctx.arc(prev[0], prev[1], 1.6, 0, 6.283); ctx.fill();
      });

      /* 가운데 공동 모델 */
      var br = 1 + 0.05 * Math.sin(now * 0.0016);
      var halo = ctx.createRadialGradient(C[0], C[1], 0, C[0], C[1], S * 0.42);
      halo.addColorStop(0, pal(0.5, 0.16)); halo.addColorStop(1, pal(0.5, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(C[0], C[1], S * 0.42, 0, 6.283); ctx.fill();
      ctx.lineWidth = 1.4;
      for (var r = 0; r < 2; r++) {
        var rr = (14 + r * 8) * br, st = now * (r ? -0.0009 : 0.0013);
        ctx.strokeStyle = pal(r ? 0.15 : 0.85, 0.7);
        ctx.beginPath(); ctx.arc(C[0], C[1], rr, st, st + 1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(C[0], C[1], rr, st + 3.14, st + 3.14 + 1.2); ctx.stroke();
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(C[0], C[1], 8 * br, 0, 6.283); ctx.fill();
      ctx.strokeStyle = ink(0.8); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = pal(0.5, 1); ctx.beginPath(); ctx.arc(C[0], C[1], 2.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = ink(0.38); ctx.font = '600 10px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
      ctx.fillText('SHARED MODEL', C[0], C[1] + 42);

      /* 노드 (먼 것부터) */
      var u = (now / 1150) % TOUR.length, seg = Math.floor(u);
      if (seg !== lastSeg) { N[TOUR[seg]].hit = now; lastSeg = seg; }
      P.map(function (p, k) { return { p: p, k: k }; }).sort(function (a, b) { return b.p[2] - a.p[2]; }).forEach(function (o) {
        var d = depth(o.p);
        ping(ctx, o.p[0], o.p[1], now - N[o.k].hit, 1400, 22, 0.55);
        node(ctx, o.p[0], o.p[1], 4.6 * o.p[3], d);
      });

      /* 노드를 차례로 지나가는 모델 */
      comet(ctx, function (v) { return cr(TP, v); }, u - 2.4, u, 2.6, 70);
    }
    return { resize: resize, draw: draw };
  }

  /* ---------- 연합학습: 업데이트가 모이고, 새 모델이 퍼진다 ---------- */
  function fl(cv) {
    var view, P = [], C;
    function resize() {
      view = fit(cv); P = [];
      C = [view.w / 2, view.h / 2];
      for (var i = 0; i < 6; i++) { var a = i / 6 * 6.283 + 0.5; P.push([C[0] + Math.cos(a) * view.w * 0.36, C[1] + Math.sin(a) * view.h * 0.34]); }
    }
    function draw(now) {
      var ctx = view.ctx, T = 4200, k = (now % T) / T;
      ctx.clearRect(0, 0, view.w, view.h);
      P.forEach(function (p) { ctx.strokeStyle = ink(0.1); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(C[0], C[1]); ctx.stroke(); });
      if (k < 0.5) {
        var t = ease(k / 0.5);
        P.forEach(function (p, i) {
          comet(ctx, function (v) { return [p[0] + (C[0] - p[0]) * v, p[1] + (C[1] - p[1]) * v]; }, Math.max(0, t - 0.35), t, 1.4, 14);
        });
      } else {
        var w = ease((k - 0.5) / 0.5), maxR = Math.hypot(view.w * 0.36, view.h * 0.34);
        ctx.strokeStyle = pal(0.55, (1 - w) * 0.55); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(C[0], C[1], 14 + w * view.w * 0.36, 14 + w * view.h * 0.34, 0, 0, 6.283); ctx.stroke();
      }
      var pulse = k > 0.45 && k < 0.6 ? Math.sin((k - 0.45) / 0.15 * Math.PI) : 0;
      var g = ctx.createRadialGradient(C[0], C[1], 0, C[0], C[1], 34);
      g.addColorStop(0, pal(0.5, 0.12 + pulse * 0.25)); g.addColorStop(1, pal(0.5, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C[0], C[1], 34, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = ink(0.8); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(C[0] - 11, C[1] - 11, 22, 22, 6) : ctx.rect(C[0] - 11, C[1] - 11, 22, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal(0.5, 1); ctx.beginPath(); ctx.arc(C[0], C[1], 2.6, 0, 6.283); ctx.fill();
      P.forEach(function (p) { node(ctx, p[0], p[1], 6, 1); });
      if (k >= 0.5) P.forEach(function (p) { ping(ctx, p[0], p[1], (k - 0.86) * T, 900, 12, 0.55); });
    }
    return { resize: resize, draw: draw };
  }

  /* ---------- 트리 앙상블: 각자 나무를 키우고 하나의 숲으로 모은다 ---------- */
  function tree(cv) {
    var view, sites, box;
    function resize() {
      view = fit(cv);
      sites = [0.22, 0.5, 0.78].map(function (y) { return [view.w * 0.17, view.h * y]; });
      box = { x: view.w * 0.58, y: view.h * 0.2, w: view.w * 0.34, h: view.h * 0.6 };
    }
    function glyph(ctx, x, y, s, prog, col, a) {
      var L = [[0, 0, -1, 1], [0, 0, 1, 1], [-1, 1, -1.5, 2], [-1, 1, -0.5, 2], [1, 1, 0.5, 2], [1, 1, 1.5, 2]];
      ctx.lineWidth = 1.1;
      L.forEach(function (l, i) {
        var p = Math.max(0, Math.min(1, prog * 6 - i));
        if (!p) return;
        ctx.strokeStyle = col === null ? ink(0.55 * a) : pal(col, 0.85 * a);
        ctx.beginPath(); ctx.moveTo(x + l[0] * s, y + l[1] * s); ctx.lineTo(x + (l[0] + (l[2] - l[0]) * p) * s, y + (l[1] + (l[3] - l[1]) * p) * s); ctx.stroke();
      });
      var pts = [[0, 0], [-1, 1], [1, 1], [-1.5, 2], [-0.5, 2], [0.5, 2], [1.5, 2]];
      pts.forEach(function (q, i) {
        if (prog * 6 < i - 0.5) return;
        ctx.fillStyle = BG; ctx.strokeStyle = col === null ? ink(0.75 * a) : pal(col, a);
        ctx.beginPath(); ctx.arc(x + q[0] * s, y + q[1] * s, 2.4, 0, 6.283); ctx.fill(); ctx.stroke();
      });
    }
    function draw(now) {
      var ctx = view.ctx, T = 5200, k = (now % T) / T;
      ctx.clearRect(0, 0, view.w, view.h);
      var grow = ease(Math.min(1, k / 0.35)), s = view.h * 0.07;
      sites.forEach(function (p, i) {
        ctx.strokeStyle = ink(0.1); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p[0] + s * 2.2, p[1] + s); ctx.bezierCurveTo(view.w * 0.42, p[1] + s, view.w * 0.42, box.y + box.h / 2, box.x, box.y + box.h / 2); ctx.stroke();
        glyph(ctx, p[0], p[1] - s * 0.6, s * 0.75, grow, null, 1);
      });
      if (k > 0.35 && k < 0.7) {
        var t = ease((k - 0.35) / 0.35);
        sites.forEach(function (p, i) {
          var x0 = p[0] + s * 2.2, y0 = p[1] + s, x3 = box.x, y3 = box.y + box.h / 2, x1 = view.w * 0.42;
          function at(v) { var u = 1 - v; return [u * u * u * x0 + 3 * u * u * v * x1 + 3 * u * v * v * x1 + v * v * v * x3, u * u * u * y0 + 3 * u * u * v * y0 + 3 * u * v * v * y3 + v * v * v * y3]; }
          comet(ctx, at, Math.max(0, t - 0.3), t, 1.3, 14);
        });
      }
      ctx.strokeStyle = ink(0.7); ctx.lineWidth = 1.2; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(box.x, box.y, box.w, box.h, 10) : ctx.rect(box.x, box.y, box.w, box.h); ctx.fill(); ctx.stroke();
      var lit = k > 0.62 ? Math.min(1, (k - 0.62) / 0.12) * (k > 0.92 ? (1 - k) / 0.08 : 1) : 0;
      for (var i = 0; i < 3; i++) glyph(ctx, box.x + box.w * (0.2 + i * 0.3), box.y + box.h * 0.26, s * 0.55, 1, lit > 0 ? i / 2 : null, lit > 0 ? 0.4 + 0.6 * lit : 0.35);
      ctx.fillStyle = ink(0.4); ctx.font = '600 9px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
      ctx.fillText('ENSEMBLE', box.x + box.w / 2, box.y + box.h - 10);
    }
    return { resize: resize, draw: draw };
  }

  /* ---------- TL++: 모델이 노드를 차례로 지나가며, 자른 층의 신호만 두 서버(비밀 분산)로 오간다 ---------- */
  function tl(cv) {
    var view, P, O, H;
    function resize() {
      view = fit(cv);
      P = [0.12, 0.31, 0.5, 0.69, 0.88].map(function (x, i) { return [view.w * x, view.h * (0.74 - 0.1 * Math.sin(i / 4 * Math.PI))]; });
      O = [view.w * 0.38, view.h * 0.2]; H = [view.w * 0.62, view.h * 0.2];
    }
    function draw(now) {
      var ctx = view.ctx, per = 1300, n = P.length, total = per * (n - 1) * 2;
      ctx.clearRect(0, 0, view.w, view.h);
      /* 왕복: 앞으로 갔다가 되돌아온다 */
      var q = (now % total) / per, u = q <= n - 1 ? q : 2 * (n - 1) - q;
      ctx.strokeStyle = ink(0.12); ctx.lineWidth = 1; ctx.setLineDash([2, 5]); ctx.beginPath();
      for (var s = 0; s <= 64; s++) { var p = crOpen(P, s / 64 * (n - 1)); s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.stroke(); ctx.setLineDash([]);
      [O, H].forEach(function (b, i) {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = ink(0.7); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b[0] - 22, b[1] - 9, 44, 18, 5) : ctx.rect(b[0] - 22, b[1] - 9, 44, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink(0.5); ctx.font = '600 8px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
        ctx.fillText(i ? 'HELPER' : 'ORCH', b[0], b[1] + 3);
      });
      ctx.strokeStyle = ink(0.15); ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(O[0] + 22, O[1]); ctx.lineTo(H[0] - 22, H[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ink(0.35); ctx.font = '600 8px ui-monospace, Consolas, monospace'; ctx.fillText('MPC', view.w / 2, O[1] - 14);
      /* 노드에 머무는 동안 두 몫(secret share)이 위로 올라갔다 내려온다 */
      var here = P[Math.round(u)], near = Math.abs(u - Math.round(u)) < 0.35;
      if (near) {
        var t = (Math.abs(u - Math.round(u)) / 0.35), v = 1 - t;
        [O, H].forEach(function (b, i) {
          var x = here[0] + (b[0] - here[0]) * v, y = here[1] + (b[1] - here[1]) * v;
          ctx.strokeStyle = pal(i ? 0.95 : 0.1, 0.25 * (1 - t)); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(here[0], here[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          ctx.fillStyle = pal(i ? 0.95 : 0.1, 0.9 * (1 - t)); ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.283); ctx.fill();
        });
      }
      P.forEach(function (p) { node(ctx, p[0], p[1], 6, 1); });
      var back = q > n - 1;
      comet(ctx, function (v) { return crOpen(P, v); }, back ? Math.min(n - 1, u + 0.9) : Math.max(0, u - 0.9), u, 2, 24);
    }
    return { resize: resize, draw: draw };
  }

  var MAKERS = { hero: hero, fl: fl, tree: tree, tl: tl };
  var items = [];
  document.querySelectorAll('canvas[data-viz]').forEach(function (cv) {
    var m = MAKERS[cv.getAttribute('data-viz')]; if (!m) return;
    var v = m(cv); v.resize(); v.visible = true; items.push({ cv: cv, v: v });
  });
  window.addEventListener('resize', function () { items.forEach(function (o) { o.v.resize(); }); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { items.forEach(function (o) { if (o.cv === e.target) o.v.visible = e.isIntersecting; }); }); });
    items.forEach(function (o) { io.observe(o.cv); });
  }
  /* 도식은 사이트의 핵심이라 '움직임 줄이기'가 켜져 있어도 멈추지 않는다. 대신 60% 속도로 천천히 돈다 */
  var speed = reduce ? 0.6 : 1;
  function loop(now) { items.forEach(function (o) { if (o.v.visible) o.v.draw(now * speed); }); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
