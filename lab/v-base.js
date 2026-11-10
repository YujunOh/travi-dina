/* 기준 버전: 디자인 안 한 원형 4개 + 지금 메인 사이트 버전 1개 */
(function () {
  var TAU = Math.PI * 2;
  function dot(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function line(ctx, a, b, c, d, s, lw) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.strokeStyle = s; ctx.lineWidth = lw || 1; ctx.stroke(); }

  /* U1. 궤도와 노드, 지나가는 점. 효과 없이 선과 원만 */
  LAB.register({
    id: 'u1-orbit-raw', name: '원형 · 궤도 위 노드', designed: false,
    idea: '노드들이 하나의 궤도에 있고 점 하나(모델)가 노드를 차례로 지나간다. 지금 메인 도식에서 효과를 전부 뺀 상태.',
    init: function (w, h) { var n = 10, pts = []; for (var i = 0; i < n; i++) { var a = i / n * TAU; pts.push([w / 2 + Math.cos(a) * w * 0.34, h / 2 + Math.sin(a) * h * 0.3]); } return { pts: pts }; },
    draw: function (ctx, w, h, t, P, s) {
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.34, h * 0.3, 0, 0, TAU); ctx.strokeStyle = P.ink(0.35); ctx.lineWidth = 1; ctx.stroke();
      s.pts.forEach(function (p) { dot(ctx, p[0], p[1], 6, P.bg, P.ink(0.9), 1.2); });
      dot(ctx, w / 2, h / 2, 10, P.bg, P.ink(0.9), 1.2);
      var u = (t / 900) % s.pts.length, i = Math.floor(u), k = u - i, a = s.pts[i], b = s.pts[(i + 1) % s.pts.length];
      dot(ctx, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 5, P.c(0.5), null);
    }
  });

  /* U2. 서버로 모였다 흩어지는 점(연합학습 기본형) */
  LAB.register({
    id: 'u2-hub-raw', name: '원형 · 가운데로 모였다 퍼짐', designed: false,
    idea: '각 기관이 업데이트를 가운데로 보내고 새 모델을 돌려받는다. 연합학습 교과서 그림.',
    init: function (w, h) { var pts = []; for (var i = 0; i < 6; i++) { var a = i / 6 * TAU - Math.PI / 2; pts.push([w / 2 + Math.cos(a) * h * 0.36, h / 2 + Math.sin(a) * h * 0.36]); } return { pts: pts }; },
    draw: function (ctx, w, h, t, P, s) {
      var cx = w / 2, cy = h / 2, k = (t % 3000) / 3000, inw = k < 0.5, v = inw ? k * 2 : (k - 0.5) * 2;
      s.pts.forEach(function (p) { line(ctx, p[0], p[1], cx, cy, P.ink(0.25)); });
      s.pts.forEach(function (p) { var q = inw ? v : 1 - v; dot(ctx, p[0] + (cx - p[0]) * q, p[1] + (cy - p[1]) * q, 4, P.c(inw ? 0.1 : 0.9), null); });
      ctx.strokeStyle = P.ink(0.9); ctx.lineWidth = 1.2; ctx.strokeRect(cx - 12, cy - 12, 24, 24);
      s.pts.forEach(function (p) { dot(ctx, p[0], p[1], 7, P.bg, P.ink(0.9), 1.2); });
    }
  });

  /* U3. 일렬 노드를 왕복하는 모델과 위쪽 서버 */
  LAB.register({
    id: 'u3-chain-raw', name: '원형 · 차례로 지나가는 사슬', designed: false,
    idea: '모델이 기관을 한 곳씩 차례로 들르고, 들를 때마다 위쪽 서버와 신호를 주고받는다. TL++ 동작을 가장 그대로 옮긴 그림.',
    init: function (w, h) { var pts = []; for (var i = 0; i < 6; i++) pts.push([w * (0.12 + i * 0.152), h * 0.68]); return { pts: pts }; },
    draw: function (ctx, w, h, t, P, s) {
      var n = s.pts.length, per = 1000, tot = per * (n - 1) * 2, q = (t % tot) / per, u = q <= n - 1 ? q : 2 * (n - 1) - q;
      var i = Math.min(n - 2, Math.floor(u)), k = u - i, a = s.pts[i], b = s.pts[i + 1];
      line(ctx, s.pts[0][0], s.pts[0][1], s.pts[n - 1][0], s.pts[n - 1][1], P.ink(0.25));
      ctx.strokeStyle = P.ink(0.9); ctx.lineWidth = 1.2; ctx.strokeRect(w / 2 - 50, h * 0.18, 100, 30);
      var near = Math.round(u), d = Math.abs(u - near); if (d < 0.3) { var p = s.pts[near]; line(ctx, p[0], p[1], w / 2, h * 0.18 + 30, P.c(0.5, 0.6 * (1 - d / 0.3))); }
      s.pts.forEach(function (p) { dot(ctx, p[0], p[1], 7, P.bg, P.ink(0.9), 1.2); });
      dot(ctx, a[0] + (b[0] - a[0]) * k, a[1], 5, P.c(0.5), null);
    }
  });

  /* U4. 떠다니는 동그라미(가운데 문구용 배경의 원형) */
  LAB.register({
    id: 'u4-bubbles-raw', name: '원형 · 떠다니는 동그라미', designed: false, textDefault: true,
    idea: '동그라미 몇 개가 천천히 떠다닌다. 의미는 거의 없고 가운데 문구를 받쳐 주는 배경 역할만 한다.',
    init: function (w, h) { var b = []; for (var i = 0; i < 9; i++) b.push({ x: Math.random() * w, y: Math.random() * h, r: 30 + Math.random() * 70, vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02 }); return { b: b, last: 0 }; },
    draw: function (ctx, w, h, t, P, s) {
      var dt = s.last ? t - s.last : 16; s.last = t;
      s.b.forEach(function (o, i) { o.x += o.vx * dt; o.y += o.vy * dt; if (o.x < -o.r) o.x = w + o.r; if (o.x > w + o.r) o.x = -o.r; if (o.y < -o.r) o.y = h + o.r; if (o.y > h + o.r) o.y = -o.r; dot(ctx, o.x, o.y, o.r, null, P.c(i / 8, 0.6), 1.2); });
    }
  });

  /* D1. 지금 메인 사이트의 도식(기울어진 궤도, 꼬리 달린 모델, 신호 입자) */
  function cr(p, u) { var n = p.length; u = ((u % n) + n) % n; var i = Math.floor(u), t = u - i, a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], d = p[(i + 2) % n], t2 = t * t, t3 = t2 * t;
    function f(k) { return 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3); } return [f(0), f(1)]; }
  LAB.register({
    id: 'd1-current', name: '지금 메인 · 기울어진 궤도와 꼬리 빛', designed: true, defaultPal: 'brand',
    idea: '기울어진 3D 궤도 위 기관들, 차례로 지나가는 모델(꼬리 달린 빛), 가운데 공동 모델로 오가는 신호. 지금 사이트에 올라가 있는 버전.',
    init: function (w, h) {
      var N = [], i; for (i = 0; i < 9; i++) N.push({ a: i / 9 * TAU + 0.15 * Math.sin(i * 2.3), r: 1, y: 0.09 * Math.sin(i * 1.7), hit: -1e9 });
      for (i = 0; i < 5; i++) N.push({ a: (i + 0.5) / 5 * TAU, r: 0.5, y: -0.06 * Math.cos(i * 2.1), hit: -1e9 });
      return { N: N, TOUR: [0, 1, 9, 2, 3, 10, 4, 5, 11, 6, 12, 7, 8, 13], sig: [], lastSpawn: 0, lastSeg: -1, S: Math.min(w / 2.6, h / 1.08) };
    },
    draw: function (ctx, w, h, now, P, s) {
      var S = s.S, cx = w / 2, cy = h / 2, rot = now * 0.00005;
      function proj(x, y, z) { var c = Math.cos(rot), sn = Math.sin(rot), x1 = x * c - z * sn, z1 = x * sn + z * c, e = 0.42, y2 = y * Math.cos(e) - z1 * Math.sin(e), z2 = y * Math.sin(e) + z1 * Math.cos(e), f = 4 / (4 + z2); return [cx + x1 * S * f, cy - y2 * S * f, z2, f]; }
      var Pp = s.N.map(function (n) { return proj(Math.cos(n.a) * n.r, n.y, Math.sin(n.a) * n.r); }), C = proj(0, 0, 0);
      function depth(p) { return 0.45 + 0.55 * (1 - (p[2] + 1.1) / 2.2); }
      ctx.strokeStyle = P.ink(0.1); ctx.lineWidth = 1; ctx.beginPath();
      for (var k = 0; k <= 96; k++) { var a = k / 96 * TAU, q = proj(Math.cos(a), 0, Math.sin(a)); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke();
      Pp.forEach(function (p) { line(ctx, C[0], C[1], p[0], p[1], P.ink(0.06 * depth(p))); });
      var TP = s.TOUR.map(function (i) { return Pp[i]; });
      ctx.strokeStyle = P.ink(0.1); ctx.beginPath(); for (var m = 0; m <= TP.length * 16; m++) { var z = cr(TP, m / 16); m ? ctx.lineTo(z[0], z[1]) : ctx.moveTo(z[0], z[1]); } ctx.stroke();
      if (now - s.lastSpawn > 260) { s.lastSpawn = now; s.sig.push({ k: Math.floor(Math.random() * s.N.length), t0: now, d: 1600 + Math.random() * 1200, inw: Math.random() < 0.6 }); }
      s.sig = s.sig.filter(function (g) { return now - g.t0 < g.d; });
      s.sig.forEach(function (g) { var p = Pp[g.k], kk = (now - g.t0) / g.d, al = Math.sin(kk * Math.PI), mx = (p[0] + C[0]) / 2, my = (p[1] + C[1]) / 2 - S * 0.12, tt = g.inw ? kk : 1 - kk, uu = 1 - tt;
        dot(ctx, uu * uu * p[0] + 2 * uu * tt * mx + tt * tt * C[0], uu * uu * p[1] + 2 * uu * tt * my + tt * tt * C[1], 1.8, P.c(g.k / s.N.length, al * 0.9)); });
      var halo = ctx.createRadialGradient(C[0], C[1], 0, C[0], C[1], S * 0.42); halo.addColorStop(0, P.c(0.5, 0.16)); halo.addColorStop(1, P.c(0.5, 0)); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(C[0], C[1], S * 0.42, 0, TAU); ctx.fill();
      dot(ctx, C[0], C[1], 8, P.bg, P.ink(0.8), 1.3); dot(ctx, C[0], C[1], 2.6, P.c(0.5));
      var u = (now / 1150) % s.TOUR.length, seg = Math.floor(u); if (seg !== s.lastSeg) { s.N[s.TOUR[seg]].hit = now; s.lastSeg = seg; }
      Pp.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return b.p[2] - a.p[2]; }).forEach(function (o) {
        var age = now - s.N[o.i].hit; if (age < 1400) { var kk = age / 1400; dot(ctx, o.p[0], o.p[1], 4 + 22 * kk, null, P.c(0.55, (1 - kk) * 0.6), 1.2); }
        var d = depth(o.p); dot(ctx, o.p[0], o.p[1], 4.6 * o.p[3], P.bg, P.ink(0.75 * d), 1.2); dot(ctx, o.p[0], o.p[1], 1.5 * o.p[3], P.ink(0.85 * d));
      });
      var prev = cr(TP, u - 2.4); for (var j = 1; j <= 60; j++) { var kj = j / 60, pt = cr(TP, u - 2.4 + 2.4 * kj); line(ctx, prev[0], prev[1], pt[0], pt[1], P.c(kj, Math.pow(kj, 1.6) * 0.95), 0.4 + 2.6 * Math.pow(kj, 1.2)); prev = pt; }
      var g2 = ctx.createRadialGradient(prev[0], prev[1], 0, prev[0], prev[1], 16); g2.addColorStop(0, P.c(0.9, 0.35)); g2.addColorStop(1, P.c(0.9, 0)); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(prev[0], prev[1], 16, 0, TAU); ctx.fill();
      dot(ctx, prev[0], prev[1], 3, P.dark ? '#0b0f1a' : '#fff', P.c(0.55), 1.5);
    }
  });
})();
