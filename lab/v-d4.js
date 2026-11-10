/* D4. 별자리 네트워크: 점(기관)들이 3~4개의 무리(코옵)를 이루어 천천히 표류한다.
   무리 안은 진한 색 선으로 촘촘히, 무리 사이는 옅은 점선으로 느슨하게 이어진다.
   신호(빛)가 긴 꼬리를 끌며 이웃으로 한 칸씩 건너가고, 건넌 간선은 몇 초간 색을 머금어 지나온 길이 보인다.
   가끔 신호가 무리 경계를 넘어 다른 코옵으로 건너간다. 데이터는 자리에 있고 신호만 오간다.
   점 수는 화면 면적에 맞춰 늘고, 가운데 문구를 위해 중앙 타원 영역은 점 밀도와 선 농도를 낮춘다. */
(function () {
  var TAU = Math.PI * 2;
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eOut(x) { return 1 - Math.pow(1 - x, 3); }
  /* 중앙 타원 안쪽일수록 작아지는 계수(0.2~1). 문구 자리를 비워 둔다 */
  function mask(x, y, w, h) {
    var dx = (x - w / 2) / (w * 0.31), dy = (y - h / 2) / (h * 0.26), d = Math.sqrt(dx * dx + dy * dy);
    if (d >= 1.25) return 1; if (d <= 0.5) return 0.2;
    var k = (d - 0.5) / 0.75; k = k * k * (3 - 2 * k); return 0.2 + 0.8 * k;
  }
  var NB = 6, HL = 3200, GL = 1700;

  LAB.register({
    id: 'd4-constellation', name: '별자리 네트워크', designed: true, defaultPal: 'brand', textDefault: true,
    idea: '기관(점)들이 몇 개의 코옵(색 무리)으로 모여 있고, 각자 자리에서 조금씩 흔들릴 뿐이다. 빛(학습 신호)이 긴 꼬리를 끌며 이웃으로 건너가 지나온 길을 남기고, 가끔은 무리 경계를 넘어 다른 코옵과 이어진다.',
    init: function (w, h) {
      var rnd = rng(Math.floor(Math.random() * 4294967295));
      var k = Math.min(1.7, Math.max(0.8, w / 620));
      /* 무리(코옵) 중심: 가운데 문구를 둘러싼 타원 위에 고르게 놓고 조금씩 흔든다 */
      var C = 4, HUES = [0.0, 0.4, 0.7, 1.0], base = rnd() * TAU, CL = [];
      for (var ci = 0; ci < C; ci++) {
        var an = base + ci * TAU / C + (rnd() - 0.5) * 0.5;
        CL.push({ x: w / 2 + Math.cos(an) * w * (0.3 + rnd() * 0.08), y: h / 2 + Math.sin(an) * h * (0.3 + rnd() * 0.08), hue: HUES[ci], wt: 0.85 + rnd() * 0.3, hub: -1 });
      }
      /* 점: 칸 크기를 거의 고정해서 면적에 비례해 점이 늘어난다 */
      var cell = 50 * Math.pow(k, 0.35), cols = Math.max(8, Math.round(w / cell)), rows = Math.max(5, Math.round(h / cell)), cw = w / cols, ch = h / rows;
      var N = [], ph = rnd() * TAU;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = (c + 0.15 + rnd() * 0.7) * cw, y = (r + 0.15 + rnd() * 0.7) * ch;
        var m = mask(x, y, w, h); if (m < 0.6 && rnd() > 0.3) continue;
        /* 가장 가까운 무리에 속한다. 경계가 직선이 되지 않게 물결 잡음을 섞는다 */
        var bi = 0, bd = 1e18;
        for (ci = 0; ci < C; ci++) {
          var ddx = (x - CL[ci].x) / w, ddy = (y - CL[ci].y) / h;
          var dd = Math.sqrt(ddx * ddx + ddy * ddy) * CL[ci].wt + 0.035 * Math.sin(x / w * 9 + ci * 2.1 + ph) * Math.cos(y / h * 7 - ci * 1.3);
          if (dd < bd) { bd = dd; bi = ci; }
        }
        /* 자기 무리 중심 쪽으로 살짝 당겨 무리 사이에 틈을 만든다 */
        x += (CL[bi].x - x) * 0.07; y += (CL[bi].y - y) * 0.07;
        var z = 0.3 + 0.7 * rnd();
        N.push({
          bx: x, by: y, z: z, g: bi, hue: CL[bi].hue, anchor: rnd() < 0.12, hubOf: -1,
          ax: (7 + rnd() * 12) * k * (0.6 + 0.6 * z), ay: (5 + rnd() * 9) * k * (0.6 + 0.6 * z),
          fx: TAU / (24000 + rnd() * 22000), fy: TAU / (26000 + rnd() * 24000), px: rnd() * TAU, py: rnd() * TAU, hit: -1e9
        });
      }
      /* 무리마다 중심에 가장 가까운 점 하나를 코옵의 허브로 */
      for (ci = 0; ci < C; ci++) {
        var hb = -1, hd = 1e18;
        for (var ni = 0; ni < N.length; ni++) if (N[ni].g === ci && mask(N[ni].bx, N[ni].by, w, h) > 0.7) {
          var ex = N[ni].bx - CL[ci].x, ey = N[ni].by - CL[ci].y; if (ex * ex + ey * ey < hd) { hd = ex * ex + ey * ey; hb = ni; }
        }
        if (hb >= 0) { CL[ci].hub = hb; N[hb].hubOf = ci; N[hb].anchor = true; }
      }
      /* 이웃한 무리끼리 가장 가까운 점 두 쌍을 다리로 잇는다(코옵 사이 협력 통로). 문구를 가로지르는 맞은편 무리는 잇지 않는다 */
      var BR = [];
      for (ni = 0; ni < N.length; ni++) N[ni].br = [];
      for (ci = 0; ci < C; ci++) {
        var cj = (ci + 1) % C, used = {};
        for (var rep = 0; rep < 2; rep++) {
          var bA = -1, bB = -1, bD = 1e18;
          for (var u1 = 0; u1 < N.length; u1++) {
            if (N[u1].g !== ci || used[u1] || mask(N[u1].bx, N[u1].by, w, h) < 0.75) continue;
            for (var u2 = 0; u2 < N.length; u2++) {
              if (N[u2].g !== cj || used[u2] || mask(N[u2].bx, N[u2].by, w, h) < 0.75) continue;
              var qx = N[u2].bx - N[u1].bx, qy = N[u2].by - N[u1].by, qd = qx * qx + qy * qy;
              if (qd < bD && mask((N[u1].bx + N[u2].bx) / 2, (N[u1].by + N[u2].by) / 2, w, h) > 0.6) { bD = qd; bA = u1; bB = u2; }
            }
          }
          if (bA < 0 || bD > cell * cell * 20) break;
          used[bA] = used[bB] = 1; BR.push(bA, bB); N[bA].br.push(bB); N[bB].br.push(bA);
          /* 다음 다리는 이 다리 근처를 피한다 */
          for (u1 = 0; u1 < N.length; u1++) { var vx = N[u1].bx - N[bA].bx, vy = N[u1].by - N[bA].by; if (vx * vx + vy * vy < cell * cell * 9) used[u1] = 1; }
        }
      }
      /* 신호 수도 면적에 맞춰 늘린다. 시작은 무리마다 고르게 */
      var W = [], nw = Math.max(4, Math.min(9, Math.round(N.length / 30)));
      for (var i = 0; i < nw; i++) {
        var g = i % C, pool = []; for (ni = 0; ni < N.length; ni++) if (N[ni].g === g) pool.push(ni);
        var a0 = pool.length ? pool[Math.floor(rnd() * pool.length)] : Math.floor(rnd() * N.length);
        W.push({ a: a0, b: -1, hist: [a0], hops: Math.floor(rnd() * 5), goal: -1, t0: 0, dur: 1, next: null, delay: 200 + i * 420 + rnd() * 300 });
      }
      var B = []; for (i = 0; i < (C + 1) * NB; i++) B.push([]);
      return { N: N, W: W, CL: CL, C: C, BR: BR, R: cell * 1.95, k: k, heat: {}, t0: null, rnd: rnd, B: B,
        X: new Float32Array(N.length), Y: new Float32Array(N.length), M: new Float32Array(N.length) };
    },
    draw: function (ctx, w, h, t, P, s) {
      if (s.t0 === null) { s.t0 = t; s.W.forEach(function (q) { q.next = t + q.delay; }); }
      var fade = eOut(Math.min(1, (t - s.t0) / 1100)), N = s.N, n = N.length, X = s.X, Y = s.Y, M = s.M, R = s.R, R2 = R * R, k = s.k, C = s.C, CL = s.CL, i, j;
      var LB = P.dark ? 1 : 1.5; /* 밝은 배경에서는 선과 점을 1.5배 진하게 */
      var lw = Math.min(1.3, k);

      /* 무리마다 아주 옅은 색 안개를 깔아 코옵의 영역을 보여 준다 */
      var ba = (P.dark ? 0.075 : 0.055) * fade, gr0 = Math.max(w, h) * 0.3;
      for (i = 0; i < C; i++) {
        var cg = ctx.createRadialGradient(CL[i].x, CL[i].y, 0, CL[i].x, CL[i].y, gr0);
        cg.addColorStop(0, P.c(CL[i].hue, ba)); cg.addColorStop(1, P.c(CL[i].hue, 0));
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(CL[i].x, CL[i].y, gr0, 0, TAU); ctx.fill();
      }

      for (i = 0; i < n; i++) {
        var o = N[i];
        X[i] = o.bx + o.ax * Math.sin(t * o.fx + o.px) + o.ax * 0.35 * Math.sin(t * o.fx * 2.3 + o.py);
        Y[i] = o.by + o.ay * Math.sin(t * o.fy + o.py) + o.ay * 0.35 * Math.cos(t * o.fy * 1.7 + o.px);
        M[i] = mask(X[i], Y[i], w, h);
      }

      /* 선: 무리 안(무리 색, 진하게)과 무리 사이(잉크, 옅은 점선)로 나누고 알파 구간별로 모아 그린다 */
      var B = s.B; for (i = 0; i < B.length; i++) B[i].length = 0;
      for (i = 0; i < n; i++) {
        var xi = X[i], yi = Y[i], gi = N[i].g, zi = N[i].z, mi = M[i];
        for (j = i + 1; j < n; j++) {
          var dx = X[j] - xi, dy = Y[j] - yi, d2 = dx * dx + dy * dy; if (d2 > R2) continue;
          var same = N[j].g === gi, q = 1 - Math.sqrt(d2) / R; q = q * q;
          if (!same) q *= 0.8;
          var al = q * Math.min(mi, M[j]) * (0.45 + 0.55 * (zi + N[j].z) / 2);
          if (al < 0.04) continue;
          B[(same ? gi : C) * NB + Math.min(NB - 1, Math.floor(al * NB))].push(i, j);
        }
      }
      ctx.lineCap = 'round';
      var bin = (P.dark ? 0.62 : 0.5) * LB * fade, bout = (P.dark ? 0.26 : 0.24) * LB * fade;
      for (var g = 0; g <= C; g++) {
        var inter = g === C;
        ctx.lineWidth = (inter ? 0.6 : 0.85) * lw;
        if (inter) ctx.setLineDash([2 * lw, 3.5 * lw]);
        for (var b = 0; b < NB; b++) {
          var L = B[g * NB + b]; if (!L.length) continue;
          var a = (b + 0.6) / NB;
          ctx.strokeStyle = inter ? P.ink(Math.min(1, bout * a)) : P.c(CL[g].hue, Math.min(1, bin * a));
          ctx.beginPath();
          for (var e = 0; e < L.length; e += 2) { ctx.moveTo(X[L[e]], Y[L[e]]); ctx.lineTo(X[L[e + 1]], Y[L[e + 1]]); }
          ctx.stroke();
        }
        if (inter) ctx.setLineDash([]);
      }
      /* 다리: 두 무리 색을 잇는 점선. 무리 사이 선보다 또렷하게 */
      var BRl = s.BR;
      ctx.lineWidth = 1 * lw; ctx.setLineDash([3 * lw, 4 * lw]);
      for (e = 0; e < BRl.length; e += 2) {
        var p1 = BRl[e], p2 = BRl[e + 1], bm = Math.min(M[p1], M[p2]) * fade * LB;
        var bg = ctx.createLinearGradient(X[p1], Y[p1], X[p2], Y[p2]);
        bg.addColorStop(0, P.c(N[p1].hue, Math.min(1, 0.4 * bm))); bg.addColorStop(1, P.c(N[p2].hue, Math.min(1, 0.4 * bm)));
        ctx.strokeStyle = bg; ctx.beginPath(); ctx.moveTo(X[p1], Y[p1]); ctx.lineTo(X[p2], Y[p2]); ctx.stroke();
      }
      ctx.setLineDash([]);

      /* 신호가 지나간 간선은 몇 초간 색을 머금었다가 천천히 사라진다(지나온 길) */
      ctx.lineWidth = 1.7 * lw;
      for (var key in s.heat) {
        var hv = s.heat[key], age = t - hv.t; if (age > HL || age < 0) { delete s.heat[key]; continue; }
        var ia = hv.a, ib = hv.b; if (ia >= n || ib >= n) continue;
        var hk = 1 - age / HL, hm = Math.min(M[ia], M[ib]);
        ctx.strokeStyle = P.c(hv.hue, Math.min(1, 0.62 * LB * Math.pow(hk, 1.4) * (0.4 + 0.6 * hm) * fade));
        ctx.beginPath(); ctx.moveTo(X[ia], Y[ia]); ctx.lineTo(X[ib], Y[ib]); ctx.stroke();
      }

      /* 점: 무리 색으로 칠하고 깊이(z)로 크기·농도를 나눈다. 허브는 이중 고리, 일부는 얇은 고리 */
      for (i = 0; i < n; i++) {
        var p = N[i], hub = p.hubOf >= 0, rr = (hub ? 2.6 : p.anchor ? 1.9 : 1.2) * (0.7 + 0.5 * p.z) * Math.min(1.4, k), mm = 0.35 + 0.65 * M[i];
        var a0 = Math.min(1, (0.32 + 0.6 * p.z) * mm * LB) * fade, hg = t - p.hit, gl = hg < GL ? 1 - hg / GL : 0;
        if (gl > 0) {
          var gr = 16 * k, gg = ctx.createRadialGradient(X[i], Y[i], 0, X[i], Y[i], gr);
          gg.addColorStop(0, P.c(p.hue, 0.38 * gl * gl * fade)); gg.addColorStop(1, P.c(p.hue, 0));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(X[i], Y[i], gr, 0, TAU); ctx.fill();
          var ring = rr + 3 * k + 11 * k * eOut(hg / GL);
          ctx.strokeStyle = P.c(p.hue, Math.min(1, 0.55 * LB * gl * gl) * fade); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(X[i], Y[i], ring, 0, TAU); ctx.stroke();
        }
        if (p.anchor) {
          ctx.strokeStyle = P.c(p.hue, Math.min(1, (0.3 + 0.4 * gl) * mm * LB) * fade); ctx.lineWidth = hub ? 1 : 0.8;
          ctx.beginPath(); ctx.arc(X[i], Y[i], rr + 2.6 * k, 0, TAU); ctx.stroke();
          if (hub) { ctx.strokeStyle = P.c(p.hue, Math.min(1, 0.16 * mm * LB) * fade); ctx.beginPath(); ctx.arc(X[i], Y[i], rr + 6.5 * k, 0, TAU); ctx.stroke(); }
        }
        ctx.fillStyle = P.c(p.hue, Math.min(1, a0 + 0.6 * gl));
        ctx.beginPath(); ctx.arc(X[i], Y[i], rr * (1 + 0.5 * gl), 0, TAU); ctx.fill();
      }

      /* 신호: 이웃 점으로 한 칸씩 건너가는 빛. 대개 무리 안에서 돌고, 가끔 다른 무리로 넘어간다 */
      var rnd = s.rnd;
      for (var wi = 0; wi < s.W.length; wi++) {
        var W = s.W[wi], hist = W.hist;
        if (W.b < 0) {
          if (t < W.next) continue;
          var na = N[W.a], ga = na.g, pick = -1;
          if (W.hops > 14) { W.goal = -1; W.hops = 0; }
          /* 몇 칸 돌고 나면 가까운 다리로 향하고, 다리 끝에 닿으면 건너편 무리로 넘어간다 */
          if (W.goal === W.a && na.br.length) { pick = na.br[Math.floor(rnd() * na.br.length)]; W.goal = -1; W.hops = 0; }
          else if (W.goal < 0 && W.hops >= 5 && rnd() < 0.5) {
            var gbd = 1e18;
            for (e = 0; e < BRl.length; e++) if (N[BRl[e]].g === ga) { var gx = X[BRl[e]] - X[W.a], gy = Y[BRl[e]] - Y[W.a]; if (gx * gx + gy * gy < gbd) { gbd = gx * gx + gy * gy; W.goal = BRl[e]; } }
          }
          if (pick < 0) {
            var tot = 0, cand = [], best = -1, bd = 1e18, gd0 = 0, G = W.goal;
            if (G >= 0) gd0 = Math.hypot(X[G] - X[W.a], Y[G] - Y[W.a]);
            for (j = 0; j < n; j++) {
              if (j === W.a) continue;
              var ex = X[j] - X[W.a], ey = Y[j] - Y[W.a], dd = ex * ex + ey * ey;
              if (dd < bd) { bd = dd; best = j; }
              if (dd > R2 * 0.85) continue;
              var wt = (hist.indexOf(j) >= 0 ? 0.04 : 1) * (N[j].g === ga ? 1 : 0.15) * (0.15 + 0.85 * M[j]) * (1.1 - Math.sqrt(dd) / R * 0.6);
              if (G >= 0) wt *= j === G ? 12 : (Math.hypot(X[G] - X[j], Y[G] - Y[j]) < gd0 - R * 0.2 ? 4 : 0.3);
              cand.push(j, wt); tot += wt;
            }
            pick = best;
            if (tot > 0) { var rv = rnd() * tot; for (var c = 0; c < cand.length; c += 2) { rv -= cand[c + 1]; if (rv <= 0) { pick = cand[c]; break; } } }
            if (N[pick].g !== ga) { W.goal = -1; W.hops = 0; }
          }
          var px2 = X[pick] - X[W.a], py2 = Y[pick] - Y[W.a];
          W.b = pick; W.t0 = t; W.dur = 650 + Math.min(1.4, Math.sqrt(px2 * px2 + py2 * py2) / R) * 700;
          continue;
        }
        var u = (t - W.t0) / W.dur, A = W.a, Bn = W.b;
        if (u >= 1) {
          N[Bn].hit = t;
          s.heat[Math.min(A, Bn) * 4096 + Math.max(A, Bn)] = { a: A, b: Bn, t: t, hue: (N[A].hue + N[Bn].hue) / 2 };
          hist.push(Bn); if (hist.length > 4) hist.shift(); W.hops++;
          W.a = Bn; W.b = -1; W.next = t + 160 + rnd() * 420;
          continue;
        }
        /* 꼬리는 출발점에서부터 길게 끌린다 */
        var ev = ease(u), tv = Math.max(0, ev - 0.7);
        var hx = X[A] + (X[Bn] - X[A]) * ev, hy = Y[A] + (Y[Bn] - Y[A]) * ev, tx = X[A] + (X[Bn] - X[A]) * tv, ty = Y[A] + (Y[Bn] - Y[A]) * tv;
        var hu = N[A].hue + (N[Bn].hue - N[A].hue) * ev, wm = (0.45 + 0.55 * mask(hx, hy, w, h)) * fade;
        var lg = ctx.createLinearGradient(tx, ty, hx, hy); lg.addColorStop(0, P.c(hu, 0)); lg.addColorStop(0.6, P.c(hu, 0.35 * wm)); lg.addColorStop(1, P.c(hu, 0.95 * wm));
        ctx.strokeStyle = lg; ctx.lineWidth = 2 * Math.min(1.4, k); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        var hr = 9 * k, hg2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr); hg2.addColorStop(0, P.c(hu, 0.5 * wm)); hg2.addColorStop(1, P.c(hu, 0));
        ctx.fillStyle = hg2; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
        ctx.fillStyle = P.c(hu, wm); ctx.beginPath(); ctx.arc(hx, hy, 1.9 * Math.min(1.4, k), 0, TAU); ctx.fill();
      }
    }
  });
})();
