/* D5. 동심원 궤도: 공동 모델(코어)을 중심으로 기울어진 동심원 4개가 각자 속도로 돌고,
   빛나는 호(모델)가 한 궤도의 기관들을 차례로 훑은 뒤 나선을 그리며 다음 궤도로 옮겨 간다. */
(function () {
  var TAU = Math.PI * 2;
  var R = [0.30, 0.51, 0.73, 0.95];            // 궤도 반지름(S 기준)
  var NC = [3, 5, 6, 8];                        // 궤도별 기관 수
  var W = [0.00016, -0.0001, 0.00006, -0.000036]; // 궤도 회전 속도(rad/ms), 번갈아 반대 방향
  var CT = [0, 1 / 3, 2 / 3, 1];                 // 궤도별 팔레트 위치 P.c(i/(n-1)): 원마다 색 하나
  var K = 0.5, V = 0.00095, SWEEP = TAU * 0.85, XFER = 1500, TRAIL = 1700, XTRAIL = 2600; // 나선 구간은 더 오래 남긴다

  function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function easeOut(u) { return 1 - Math.pow(1 - u, 3); }
  function wrap(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
  function colT(r) {
    if (r <= R[0]) return CT[0];
    for (var i = 0; i < R.length - 1; i++) if (r <= R[i + 1]) return CT[i] + (CT[i + 1] - CT[i]) * (r - R[i]) / (R[i + 1] - R[i]);
    return CT[CT.length - 1];
  }

  function step(s, dt) {
    s.clock += dt;
    if (s.mode === 'orbit') {
      var d = V / s.rad * dt; s.th += d; s.sweep += d;
      var ring = s.rings[s.ri], rot = ring.ph + W[s.ri] * s.clock;
      for (var j = 0; j < ring.nodes.length; j++) {
        var n = ring.nodes[j], dd = wrap(s.th - (n.a + rot));
        if (n.pd != null && n.pd < 0 && dd >= 0 && dd < 1) { n.hit = s.clock; s.e = Math.min(1, s.e + 0.3); }
        n.pd = dd;
      }
      if (s.sweep >= SWEEP) {
        var to = s.ri + s.dir; if (to < 0 || to >= R.length) { s.dir = -s.dir; to = s.ri + s.dir; }
        s.mode = 'xfer'; s.from = s.ri; s.to = to; s.u = 0;
      }
    } else {
      s.u = Math.min(1, s.u + dt / XFER);
      s.rad = R[s.from] + (R[s.to] - R[s.from]) * ease(s.u);
      s.th += V / s.rad * dt;
      if (s.u >= 1) { s.mode = 'orbit'; s.ri = s.to; s.sweep = 0; s.rings[s.ri].nodes.forEach(function (n) { n.pd = null; }); }
    }
    s.e *= Math.exp(-dt / 2200);
    var kr = 1 - Math.exp(-dt / 420);
    for (var i = 0; i < R.length; i++) {
      var tg = (s.mode === 'orbit' && i === s.ri) ? 1 : (s.mode === 'xfer' && i === s.to ? ease(s.u) : 0);
      s.rg[i] += (tg - s.rg[i]) * kr;
    }
    s.hist.push({ th: s.th, r: s.rad, c: s.clock, x: s.mode === 'xfer' });
    while (s.hist.length && s.clock - s.hist[0].c > XTRAIL) s.hist.shift();
  }

  LAB.register({
    id: 'd5-rings', name: '동심원 궤도 · 원에서 원으로', designed: true, defaultPal: 'brand', textDefault: false,
    idea: '공동 모델을 중심으로 여러 겹의 궤도가 각자 속도로 돈다. 모델은 한 궤도의 기관들을 차례로 들러 배우고, 나선을 그리며 다음 궤도로 넘어간다. 들를 때마다 가운데 공동 모델이 조금씩 밝아진다.',
    init: function (w, h) {
      var rings = [];
      for (var i = 0; i < R.length; i++) {
        var nodes = [];
        for (var j = 0; j < NC[i]; j++) nodes.push({ a: j / NC[i] * TAU + (Math.random() - 0.5) * 0.4, hit: -1e9, pd: null });
        rings.push({ ph: Math.random() * TAU, nodes: nodes });
      }
      var s = { S: Math.min(w * 0.43 / R[3], h * 0.40 / (R[3] * K)), rings: rings, rg: [0, 0, 0, 0], clock: 0, mode: 'orbit', ri: 1, dir: 1, sweep: 0,
        th: Math.random() * TAU, rad: R[1], e: 0, hist: [], lt: null };
      for (var q = 0; q < 200; q++) step(s, 16); // 첫 장면부터 꼬리와 흔적이 보이게 미리 돌려 둔다
      return s;
    },
    draw: function (ctx, w, h, t, P, s) {
      var dt = s.lt == null ? 16 : Math.max(0, Math.min(50, t - s.lt)); s.lt = t;
      step(s, dt);
      var S = s.S, cx = w / 2, cy = h * 0.5, clk = s.clock, dk = P.dark, L = dk ? 1 : 1.5; // 밝은 배경에서만 선·노드 알파 1.5배
      function pr(a, r) { return [cx + Math.cos(a) * r * S, cy + Math.sin(a) * r * S * K, Math.sin(a)]; }

      // 바닥에 깔리는 아주 옅은 빛
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, K);
      var fg = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 1.05);
      fg.addColorStop(0, P.c(0.5, dk ? 0.11 : 0.06)); fg.addColorStop(0.6, P.c(0.5, dk ? 0.03 : 0.015)); fg.addColorStop(1, P.c(0.5, 0));
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, S * 1.05, 0, TAU); ctx.fill(); ctx.restore();

      function ring(i, back) {
        var rx = R[i] * S, ry = rx * K, a0 = back ? Math.PI : 0, a1 = back ? TAU : Math.PI, rot = s.rings[i].ph + W[i] * clk;
        ctx.lineWidth = 1;
        if (i === 2) { ctx.setLineDash([1.2, 4.2]); ctx.lineDashOffset = -rot * (rx + ry) * 0.5; }
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a1);
        ctx.strokeStyle = P.c(CT[i], (back ? 0.12 : 0.26) * L); ctx.stroke();
        ctx.setLineDash([]);
        var g = s.rg[i];
        if (g > 0.01) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a1); ctx.strokeStyle = P.c(CT[i], Math.min(1, g * (back ? 0.22 : 0.45) * L)); ctx.lineWidth = 1.3; ctx.stroke(); }
        if (i === 3) { // 바깥 궤도의 눈금
          ctx.beginPath();
          for (var k = 0; k < 120; k++) {
            var a = rot + k / 120 * TAU, sn = Math.sin(a);
            if ((sn < 0) !== back) continue;
            var TL = k % 10 === 0 ? 1.05 : 1.022, p0 = pr(a, R[3] * 1.008), p1 = pr(a, R[3] * TL);
            ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
          }
          ctx.strokeStyle = P.ink((back ? 0.07 : 0.14) * L); ctx.lineWidth = 0.8; ctx.stroke();
        }
      }

      // 기관 노드 위치
      var back = [], front = [];
      for (var i = 0; i < R.length; i++) {
        var rot = s.rings[i].ph + W[i] * clk;
        s.rings[i].nodes.forEach(function (n) { var p = pr(n.a + rot, R[i]); (p[2] < 0 ? back : front).push({ n: n, i: i, p: p }); });
      }
      back.sort(function (a, b) { return a.p[2] - b.p[2]; }); front.sort(function (a, b) { return a.p[2] - b.p[2]; });

      function node(o) {
        var p = o.p, d = (p[2] + 1) / 2, sc = 0.78 + 0.38 * d, al = 0.42 + 0.58 * d, age = clk - o.n.hit, x = p[0], y = p[1];
        if (age < 1700) { var kk = age / 1700, rr = (4 + 20 * easeOut(kk)) * sc;
          ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.55, 0, 0, TAU); ctx.strokeStyle = P.c(CT[o.i], Math.min(1, (1 - kk) * 0.6 * al * L)); ctx.lineWidth = 1; ctx.stroke(); }
        var f = age < 7000 ? 1 - age / 7000 : 0; f = Math.pow(f, 1.4);
        if (f > 0.04) { var gg = ctx.createRadialGradient(x, y, 0, x, y, 11 * sc); gg.addColorStop(0, P.c(CT[o.i], f * (dk ? 0.38 : 0.26) * al)); gg.addColorStop(1, P.c(CT[o.i], 0));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 11 * sc, 0, TAU); ctx.fill(); }
        // 테두리와 심을 궤도 색으로 그려, 들렀던 노드가 회색 선과 섞여 탁해지지 않게 한다
        var la = Math.min(1, 0.5 * al * L);
        ctx.beginPath(); ctx.arc(x, y, 3.6 * sc, 0, TAU); ctx.fillStyle = P.bg; ctx.fill();
        if (f > 0.02) { ctx.fillStyle = P.c(CT[o.i], f * 0.95 * (0.55 + 0.45 * al)); ctx.fill(); }
        ctx.strokeStyle = P.c(CT[o.i], Math.max(la, f * 0.95)); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 1.15 * sc, 0, TAU); ctx.fillStyle = P.c(CT[o.i], Math.min(1, 0.7 * al * L)); ctx.fill();
        if (f > 0.02) { ctx.fillStyle = P.bg; ctx.globalAlpha = f; ctx.fill(); ctx.globalAlpha = 1; }
      }

      for (i = 0; i < R.length; i++) ring(i, true);
      back.forEach(node);

      // 공동 모델(코어): 은은하게 숨 쉬고, 기관을 들를 때마다 살짝 밝아진다
      var br = 0.5 + 0.5 * Math.sin(clk * TAU / 5600), e = s.e, hr = S * 0.2 * (1 + 0.06 * br);
      var hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, hr);
      hg.addColorStop(0, P.c(0.5, (dk ? 0.16 : 0.10) + 0.05 * br + 0.10 * e)); hg.addColorStop(1, P.c(0.5, 0));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, hr, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 15 + 1.6 * br, 0, TAU); ctx.strokeStyle = P.ink(0.09 + 0.05 * br); ctx.lineWidth = 1; ctx.stroke();
      var ga = clk * 0.0004;
      ctx.lineWidth = 1.2; ctx.strokeStyle = P.c(0.5, 0.55 + 0.3 * e);
      ctx.beginPath(); ctx.arc(cx, cy, 15 + 1.6 * br, ga, ga + 0.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 15 + 1.6 * br, ga + Math.PI, ga + Math.PI + 0.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 8.5, 0, TAU); ctx.fillStyle = P.bg; ctx.fill(); ctx.strokeStyle = P.ink(0.72); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 2.6 + 0.9 * e, 0, TAU); ctx.fillStyle = P.c(0.5, 0.95); ctx.fill();

      for (i = 0; i < R.length; i++) ring(i, false);
      front.forEach(node);

      // 지나가는 모델: 빛나는 호(꼬리)와 머리
      var H = s.hist, n = H.length;
      if (n > 1) {
        ctx.lineCap = 'round';
        var prev = pr(H[0].th, H[0].r);
        for (var j = 1; j < n; j++) {
          var q = pr(H[j].th, H[j].r), age = clk - H[j].c, kj = Math.max(0, 1 - age / TRAIL);
          var a = Math.pow(kj, 2.2) * 0.95, lw = 0.35 + 2.3 * Math.pow(kj, 1.8);
          if (H[j].x) { // 나선 구간: 꼬리가 빨리 사라지면 잘못 그은 직선처럼 보여서, 더 오래 또렷하게 남긴다
            var kx = Math.max(0, 1 - age / XTRAIL); a = Math.max(a, 0.6 * Math.pow(kx, 1.2)); lw = Math.max(lw, 0.5 + 1.5 * kx);
          }
          if (a > 0.01) { ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]);
            ctx.strokeStyle = P.c(colT(H[j].r), a); ctx.lineWidth = lw; ctx.stroke(); }
          prev = q;
        }
        var ct = colT(s.rad), hx = prev[0], hy = prev[1];
        var g2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22); g2.addColorStop(0, P.c(ct, dk ? 0.42 : 0.26)); g2.addColorStop(1, P.c(ct, 0));
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(hx, hy, 22, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, TAU); ctx.strokeStyle = P.c(ct, 0.35); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fillStyle = P.c(ct, 1); ctx.fill();
        if (dk) { ctx.beginPath(); ctx.arc(hx, hy, 1.1, 0, TAU); ctx.fillStyle = P.ink(0.9); ctx.fill(); }
        ctx.lineCap = 'butt';
      }
    }
  });
})();
