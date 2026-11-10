/* D3. 코옵 묶음 지도: 분야별 코옵(떠 있는 판) 안에서 모델이 기관을 차례로 돌고, 한 바퀴가 끝나면 다리를 건너 다른 코옵에 가치를 나눈다. */
(function () {
  var TAU = Math.PI * 2;
  var HOP = 1750, MOVE = 0.7;          // 기관 한 칸 이동 시간(ms), 그중 움직이는 비율(나머지는 머무름)
  var TAIL = 14, TAIL_DT = 28;         // 꼬리 샘플 수와 간격(ms). 길이는 그대로 두고 샘플만 줄였다
  var SIG_N = 12, SIG_DT = 40;         // 다리 신호 꼬리 샘플 수와 간격(ms)
  var SIG_D = 2300;                    // 다리 건너는 신호 시간(ms)

  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeS(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  function bez(a, c, b, e) { var u = 1 - e; return [u * u * a[0] + 2 * u * e * c[0] + e * e * b[0], u * u * a[1] + 2 * u * e * c[1] + e * e * b[1]]; }
  function dot(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }

  // 판은 처음부터 바깥쪽(모서리 쪽)에 둔다. 가운데 문구가 올라갈 자리(가로 0.23~0.77, 세로 0.40~0.60)를 비우기 위함
  var DEF = [
    { name: 'SECURITY',    x: 0.170, y: 0.285, sc: 0.96, hue: 0.06, n: 5, lab: 'top', ph: 5 * HOP - 1300 },
    { name: 'HEALTHCARE',  x: 0.835, y: 0.290, sc: 0.84, hue: 0.94, n: 4, lab: 'top', ph: 2 * HOP },
    { name: 'AGRICULTURE', x: 0.575, y: 0.825, sc: 0.92, hue: 0.50, n: 6, lab: 'left', ph: 3 * HOP + 400 }
  ];
  var BR = [[0, 1], [1, 2], [2, 0]];

  LAB.register({
    id: 'd3-coop-clusters', name: '코옵 묶음 지도', designed: true, defaultPal: 'brand', textDefault: false,
    idea: '분야별 코옵이 각자 떠 있는 판이고, 그 안에서 모델이 참여 기관을 차례로 돌며 배운다. 한 바퀴를 마친 코옵은 가는 다리로 다른 코옵에 가치를 건넨다. 메인이 코옵 목록에서 출발한다는 그림.',
    init: function (w, h, P) {
      var R = Math.min(w * 0.15, h * 0.27), u = Math.max(0.8, Math.min(1.8, w / 600));
      var nu = Math.max(0.85, R / 88); // 기관 점·토큰 크기 배율: 판 크기(=폭)에 비례, 상한 없음
      var cl = DEF.map(function (d, ci) {
        var nodes = [], off = Math.random() * TAU;
        for (var j = 0; j < d.n; j++) nodes.push({ a: off + j / d.n * TAU + (Math.random() - 0.5) * 0.5, r: 0.5 + Math.random() * 0.26 });
        return { d: d, bx: d.x * w, by: d.y * h, rx: R * d.sc, ry: R * d.sc * 0.58, nodes: nodes, w: (ci % 2 ? -1 : 1) * (0.00007 + 0.00002 * ci),
          w1: Math.random() * TAU, w2: Math.random() * TAU, bob: Math.random() * TAU, round: null, glow: -1e9, X: 0, Y: 0 };
      });
      // 바닥 점 격자: 오프스크린에 한 번만 그린다(가장자리로 갈수록 옅게)
      var g = null;
      try {
        g = document.createElement('canvas'); g.width = Math.round(w * 2); g.height = Math.round(h * 2);
        var gx = g.getContext('2d'); gx.scale(2, 2);
        var sp = 22 * Math.max(0.9, Math.min(1.4, u)), cx = w / 2, cy = h / 2;
        for (var y = sp / 2; y < h; y += sp) for (var x = sp / 2; x < w; x += sp) {
          var dx = (x - cx) / (w * 0.55), dy = (y - cy) / (h * 0.62), dd = Math.sqrt(dx * dx + dy * dy), a = Math.max(0, 1 - dd);
          if (a <= 0.02) continue; gx.fillStyle = P.ink((P.dark ? 0.11 : 0.12) * a); gx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
        }
      } catch (e) { g = null; }
      return { cl: cl, grid: g, sig: [], u: u, R: R, nu: nu };
    },
    draw: function (ctx, w, h, t, P, s) {
      var u = s.u, nu = s.nu, dk = P.dark, i, j, k;
      var LA = dk ? 1 : 1.5;                 // 밝은 배경에서만 선·노드 알파 1.5배
      var lw = Math.max(1, nu * 0.6);        // 큰 화면에서 선 굵기도 조금 따라 굵게
      if (s.grid) ctx.drawImage(s.grid, 0, 0, w, h);

      // 판 위치(아주 천천히 떠 있음)
      s.cl.forEach(function (c) { c.X = c.bx; c.Y = c.by + Math.sin(t * 0.00045 + c.bob) * 2.2 * u; });
      var gcx = (s.cl[0].X + s.cl[1].X + s.cl[2].X) / 3, gcy = (s.cl[0].Y + s.cl[1].Y + s.cl[2].Y) / 3;

      function node(c, jj, tm) { var nd = c.nodes[jj], a = nd.a + tm * c.w; return [c.X + Math.cos(a) * c.rx * nd.r, c.Y + Math.sin(a) * c.ry * nd.r, Math.sin(a)]; }
      function inner(c, a, b) { var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; return [mx + (c.X - mx) * 0.42, my + (c.Y - my) * 0.42]; }
      function token(c, tm) {
        var kk = (tm + c.d.ph) / HOP, idx = Math.floor(kk), f = kk - idx, n = c.d.n, a = idx % n, b = (a + 1) % n;
        var A = node(c, a, tm), B = node(c, b, tm), e = ease(Math.min(1, f / MOVE));
        return bez(A, inner(c, A, B), B, e);
      }
      // 다리: 판 사이를 바깥쪽으로 휘게(가운데는 비워 둠)
      function bridge(bi) {
        var a = s.cl[BR[bi][0]], b = s.cl[BR[bi][1]], mx = (a.X + b.X) / 2, my = (a.Y + b.Y) / 2;
        var ox = mx - gcx, oy = my - gcy, ol = Math.sqrt(ox * ox + oy * oy) || 1, dist = Math.hypot(b.X - a.X, b.Y - a.Y), bow = dist * 0.42;
        var cp = [mx + ox / ol * bow, my + oy / ol * bow], mg = h * 0.045;
        function port(c) { var th = Math.atan2((cp[1] - c.Y) / c.ry, (cp[0] - c.X) / c.rx); return [c.X + Math.cos(th) * c.rx * 1.1, c.Y + Math.sin(th) * c.ry * 1.1]; }
        // 곡선 가운데(= 두 끝 중점과 조절점의 평균)가 화면 밖으로 나가지 않게 조절점을 묶는다(끝점이 조절점에 따라 바뀌어 두 번)
        for (var it = 0; it < 2; it++) {
          var pa = port(a), pb = port(b), qx = (pa[0] + pb[0]) / 2, qy = (pa[1] + pb[1]) / 2;
          cp[0] = Math.max(2 * mg - qx, Math.min(2 * (w - mg) - qx, cp[0]));
          cp[1] = Math.max(2 * mg - qy, Math.min(2 * (h - mg) - qy, cp[1]));
        }
        return { a: port(a), c: cp, b: port(b) };
      }
      var B3 = [bridge(0), bridge(1), bridge(2)];

      // 1) 다리(가는 점선, 천천히 흐름)
      ctx.save(); ctx.setLineDash([1.5 * u, 5 * u]); ctx.lineDashOffset = -t * 0.006; ctx.lineWidth = lw; ctx.strokeStyle = P.ink(dk ? 0.2 : 0.24);
      B3.forEach(function (b) { ctx.beginPath(); ctx.moveTo(b.a[0], b.a[1]); ctx.quadraticCurveTo(b.c[0], b.c[1], b.b[0], b.b[1]); ctx.stroke(); });
      ctx.restore();
      var pa = P.ink(0.32 * LA), pr = 1.8 * Math.max(u, nu * 0.8);
      B3.forEach(function (b) { dot(ctx, b.a[0], b.a[1], pr, P.bg, pa, lw); dot(ctx, b.b[0], b.b[1], pr, P.bg, pa, lw); });

      // 2) 코옵 판
      s.cl.forEach(function (c) {
        var hue = c.d.hue, ga = Math.max(0, 1 - (t - c.glow) / 1500);
        if (!dk) { // 판 아래 옅은 그림자(떠 있는 깊이감)
          var sy = c.Y + c.ry * 0.42, sg = ctx.createRadialGradient(c.X, sy, 0, c.X, sy, c.rx * 1.15);
          sg.addColorStop(0, P.ink(0.05)); sg.addColorStop(1, P.ink(0));
          ctx.save(); ctx.translate(c.X, sy); ctx.scale(1, c.ry / c.rx); ctx.translate(-c.X, -sy); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(c.X, sy, c.rx * 1.15, 0, TAU); ctx.fill(); ctx.restore();
        }
        function blob(sc) {
          ctx.beginPath();
          for (k = 0; k <= 56; k++) {
            var a = k / 56 * TAU, r = sc * (1 + 0.045 * Math.sin(2 * a + c.w1 + t * 0.00028) + 0.03 * Math.sin(3 * a + c.w2 - t * 0.0002));
            var x = c.X + Math.cos(a) * c.rx * r, y = c.Y + Math.sin(a) * c.ry * r; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.closePath();
        }
        var fg = ctx.createRadialGradient(c.X, c.Y - c.ry * 0.3, 0, c.X, c.Y, c.rx * 1.05);
        fg.addColorStop(0, P.c(hue, (dk ? 0.16 : 0.085) + 0.06 * ga)); fg.addColorStop(0.75, P.c(hue, dk ? 0.06 : 0.035)); fg.addColorStop(1, P.c(hue, 0.01));
        blob(1); ctx.fillStyle = fg; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = P.c(hue, Math.min(1, (dk ? 0.42 : 0.5) + 0.4 * ga)); ctx.stroke();
        blob(1.14); ctx.lineWidth = 0.8 * lw; ctx.strokeStyle = P.ink(dk ? 0.07 : 0.075); ctx.stroke();
        if (ga > 0) { blob(1 + 0.22 * (1 - ga)); ctx.lineWidth = lw; ctx.strokeStyle = P.c(hue, 0.35 * LA * ga * ga); ctx.stroke(); }

        // 기관 사이 경로(옅게)
        var n = c.d.n, pts = []; for (j = 0; j < n; j++) pts.push(node(c, j, t));
        ctx.lineWidth = 0.8 * lw; ctx.strokeStyle = P.c(hue, dk ? 0.2 : 0.24); ctx.beginPath();
        for (j = 0; j < n; j++) { var A = pts[j], Bq = pts[(j + 1) % n], cp = inner(c, A, Bq); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(cp[0], cp[1], Bq[0], Bq[1]); }
        ctx.stroke();

        // 도착 물결 + 기관 점(뒤에서 앞으로)
        var kk = (t + c.d.ph) / HOP, idx = Math.floor(kk), f = kk - idx, arrived = (f >= MOVE ? idx + 1 : idx) % n, age = (f >= MOVE ? f - MOVE : f + 1 - MOVE) * HOP;
        var ord = pts.map(function (p, jj) { return jj; }).sort(function (a, b) { return pts[a][2] - pts[b][2]; });
        ord.forEach(function (jj) {
          var p = pts[jj], d = (p[2] + 1) / 2, r = (2.9 + 1.4 * d) * nu, hot = jj === arrived && age < 1300;
          if (hot) { var q = age / 1300; dot(ctx, p[0], p[1], r + 16 * nu * ease(q), null, P.c(hue, Math.min(1, 0.5 * LA * (1 - q))), lw); }
          dot(ctx, p[0], p[1], r, P.bg, P.ink(Math.min(0.96, (0.5 + 0.4 * d) * (dk ? 0.95 : 0.85) * LA)), 1.1 * lw);
          dot(ctx, p[0], p[1], 1.25 * nu, hot ? P.c(hue, 1) : P.ink(Math.min(0.95, (0.35 + 0.45 * d) * LA)));
        });

        // 한 바퀴 완료 → 다리 건너 신호
        var rd = Math.floor(idx / n);
        if (c.round === null) c.round = rd;
        else if (rd !== c.round) {
          c.round = rd; var ci = s.cl.indexOf(c), bi = -1, to = -1, alt = rd % 2;
          for (j = 0; j < 3; j++) { if (BR[j][0] === ci || BR[j][1] === ci) { if (alt-- === 0) { bi = j; break; } } }
          if (bi < 0) for (j = 0; j < 3; j++) if (BR[j][0] === ci || BR[j][1] === ci) { bi = j; break; }
          to = BR[bi][0] === ci ? BR[bi][1] : BR[bi][0];
          s.sig.push({ bi: bi, rev: BR[bi][0] !== ci, from: ci, to: to, t0: t });
        }
      });

      // 3) 모델 토큰(꼬리 빛)
      s.cl.forEach(function (c) {
        var hue = c.d.hue, tl = []; for (j = 0; j <= TAIL; j++) tl.push(token(c, Math.max(0, t - j * TAIL_DT)));
        ctx.lineCap = 'round';
        for (j = TAIL; j > 0; j--) {
          var q = 1 - j / TAIL; ctx.beginPath(); ctx.moveTo(tl[j][0], tl[j][1]); ctx.lineTo(tl[j - 1][0], tl[j - 1][1]);
          ctx.strokeStyle = P.c(hue, Math.min(1, Math.pow(q, 1.7) * 0.9 * (dk ? 1 : 1.15))); ctx.lineWidth = (0.5 + 2.2 * Math.pow(q, 1.3)) * nu; ctx.stroke();
        }
        var hd = tl[0], gr = ctx.createRadialGradient(hd[0], hd[1], 0, hd[0], hd[1], 13 * nu);
        gr.addColorStop(0, P.c(hue, dk ? 0.42 : 0.36)); gr.addColorStop(1, P.c(hue, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(hd[0], hd[1], 13 * nu, 0, TAU); ctx.fill();
        dot(ctx, hd[0], hd[1], 2.7 * nu, P.bg, P.c(hue, 1), 1.4 * lw);
      });

      // 4) 다리 건너는 신호
      s.sig = s.sig.filter(function (g) { return t - g.t0 < SIG_D; });
      s.sig.forEach(function (g) {
        var b = B3[g.bi], h0 = s.cl[g.from].d.hue, h1 = s.cl[g.to].d.hue;
        function at(tm) { var e = easeS(Math.max(0, Math.min(1, (tm - g.t0) / SIG_D))); return { e: e, p: bez(b.a, b.c, b.b, g.rev ? 1 - e : e) }; }
        var pts = []; for (j = 0; j <= SIG_N; j++) pts.push(at(t - j * SIG_DT));
        for (j = SIG_N; j > 0; j--) {
          var q = 1 - j / SIG_N; ctx.beginPath(); ctx.moveTo(pts[j].p[0], pts[j].p[1]); ctx.lineTo(pts[j - 1].p[0], pts[j - 1].p[1]);
          ctx.strokeStyle = P.c(h0 + (h1 - h0) * pts[j].e, Math.pow(q, 1.6) * 0.85); ctx.lineWidth = (0.4 + 1.6 * q) * nu; ctx.stroke();
        }
        var hp = pts[0].p, hc = P.c(h0 + (h1 - h0) * pts[0].e, 1); dot(ctx, hp[0], hp[1], 1.9 * nu, hc);
        if (pts[0].e >= 0.999 && !g.done) { g.done = true; s.cl[g.to].glow = t; }
      });

      // 5) 라벨(작은 모노)
      var fs = Math.min(15, Math.max(11, w * 0.0105 + 5)); // 카드(588px) 약 11px, 1440px 약 15px
      ctx.font = '600 ' + fs + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'; ctx.textBaseline = 'middle';
      var hasLS = 'letterSpacing' in ctx; if (hasLS) ctx.letterSpacing = (fs * 0.16).toFixed(1) + 'px';
      s.cl.forEach(function (c) {
        var lx, ly, al = c.d.lab === 'left' ? 'right' : 'left', meta = '· ' + ('0' + c.d.n).slice(-2);
        if (c.d.lab === 'left') { lx = c.X - c.rx * 1.18 - 8 * u; ly = c.Y - fs * 0.1; }
        else { lx = c.X - c.rx * 0.78; ly = c.Y - c.ry * 1.18 - fs * 1.1; }
        ctx.textAlign = al;
        var mw = ctx.measureText(meta + ' ').width, nw = ctx.measureText(c.d.name).width;
        var x0 = al === 'left' ? lx : lx - nw - mw; // 이름 시작점
        dot(ctx, x0 - fs * 0.85, ly, fs * 0.2, P.c(c.d.hue, 0.95));
        ctx.textAlign = 'left';
        ctx.fillStyle = P.ink(dk ? 0.84 : 0.8); ctx.fillText(c.d.name, x0, ly);
        ctx.fillStyle = P.ink(dk ? 0.5 : 0.52); ctx.fillText(' ' + meta, x0 + nw, ly);
      });
      if (hasLS) ctx.letterSpacing = '0px';
    }
  });
})();
