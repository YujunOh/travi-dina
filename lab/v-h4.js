/* H4. 도메인 슬라이드쇼: 작은 점(참여 기관)들이 한 도메인의 선 그림으로 모였다가, 떼 지어 옮겨 가 다음 도메인을 그린다.
   보안(방패), 농업(나무), 의료(심장과 맥박), 경제(막대와 오르는 선) 순서로 돈다.
   - 가운데 글 배치: 그림이 왼쪽과 오른쪽 자리를 번갈아 쓴다. 반대편 자리에는 다음 그림이 옅은 점선 밑그림으로 미리 놓이고,
     점의 4분의 1쯤이 그 밑그림 위에서 쉰다. 무리는 한 덩어리로 제목 위를 넘어 건너가므로 제목 자리(P.quiet)에는 점이 들어가지 않는다.
   - 왼쪽 글 배치: 그림이 오른쪽에 크게 서고, 그 옆에 다음 그림이 작은 밑그림으로 놓인다. 점들은 한 방향으로 휘돌아 다시 짜인다.
   - 점이 다 모이면 밑그림 위로 강조색 선이 그어진다(연필 밑그림에 잉크를 올리는 느낌). 떠나기 직전에 선이 먼저 사라진다.
   중심 서버로 읽힐 요소는 없다. 색은 잉크 한 가지와 강조색 P.c(0.5) 하나만 쓰고, 번지는 빛이나 꼬리는 쓰지 않는다. */
(function () {
  var TAU = Math.PI * 2;
  var HOLD = 2500;   // 그림 하나가 머무는 시간(ms)
  var TR_X = 1300;   // 반대편 자리로 건너갈 때의 전환 시간
  var TR_S = 1100;   // 같은 자리에서 다시 짤 때의 전환 시간
  var FA = 1.25;     // 그림 틀의 세로/가로 비
  var PADK = 0.055;  // 틀 여백(그림 폭 대비)
  var NAMES = ['SECURITY', 'AGRICULTURE', 'HEALTHCARE', 'ECONOMY'];

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ss(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  /* 사다리꼴 속도: 처음과 끝의 r 구간에서만 붙고 줄며 가운데는 고르게 간다. ss보다 최고 속도가 낮아 먼 길을 가는 점이 덜 튄다 */
  function tz(x, r) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var k = 2 * r * (1 - r);
    return x < r ? x * x / k : x > 1 - r ? 1 - (1 - x) * (1 - x) / k : (x - r / 2) / (1 - r);
  }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  /* ---------- 그림 정의: 폭 1(-0.5~0.5), 높이 1.25(-0.625~0.625)인 틀 안의 폴리라인 ---------- */
  function bez(p0, c1, c2, p3, n) {
    var o = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n, v = 1 - u;
      o.push([v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p3[0],
              v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p3[1]]);
    }
    return o;
  }
  function mir(pts) { var o = []; for (var i = pts.length - 1; i >= 0; i--) o.push([-pts[i][0], pts[i][1]]); return o; }
  /* closed: 닫힌 선, sharp: 꼭짓점마다 점을 놓는 꺾은선, skipA와 skipB: 다른 선과 겹치는 끝점에는 점을 놓지 않음,
     run: 선을 따라 도는 강조점 수, spd: 그 속도 배율 */
  function prep(pts, o) {
    o = o || {};
    var x = [], y = [], cum = [0], i;
    for (i = 0; i < pts.length; i++) { x.push(pts[i][0]); y.push(pts[i][1]); }
    if (o.closed) { x.push(pts[0][0]); y.push(pts[0][1]); }
    for (i = 1; i < x.length; i++) cum.push(cum[i - 1] + Math.sqrt((x[i] - x[i - 1]) * (x[i] - x[i - 1]) + (y[i] - y[i - 1]) * (y[i] - y[i - 1])));
    return { x: x, y: y, cum: cum, len: cum[cum.length - 1], closed: !!o.closed, sharp: !!o.sharp, skipA: !!o.skipA, skipB: !!o.skipB, run: o.run || 0, spd: o.spd || 1 };
  }
  function at(p, s) {
    var c = p.cum, n = c.length, i = 1;
    if (s <= 0) return [p.x[0], p.y[0]];
    if (s >= p.len) return [p.x[n - 1], p.y[n - 1]];
    while (i < n - 1 && c[i] < s) i++;
    var k = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
    return [p.x[i - 1] + (p.x[i] - p.x[i - 1]) * k, p.y[i - 1] + (p.y[i] - p.y[i - 1]) * k];
  }

  var DEFS = (function () {
    var i, k, a;
    /* 1) 보안: 방패 윤곽과 체크 */
    var r = bez([0, -0.615], [0.157, -0.521], [0.3125, -0.447], [0.4375, -0.447], 10);
    r = r.concat(bez([0.4375, -0.447], [0.475, -0.447], [0.5, -0.42], [0.5, -0.384], 4).slice(1));
    r.push([0.5, 0.053]);
    r = r.concat(bez([0.5, 0.053], [0.5, 0.366], [0.281, 0.522], [0, 0.616], 18).slice(1));
    var l = mir(r);
    var shield = [
      prep(r.concat(l.slice(1, l.length - 1)), { closed: true, run: 2 }),
      prep([[-0.23, -0.02], [-0.07, 0.14], [0.25, -0.17]], { sharp: true, run: 1 })
    ];

    /* 2) 농업: 올록볼록한 둥근 수관(작은 원 7개의 바깥 윤곽), 줄기, 가지 둘, 땅 */
    /* 원끼리 만나는 골(안으로 꺾인 모서리)이 정확히 한 점이 되도록, 원마다 골에서 골까지의 호를 고르게 나눠 잇는다.
       (중심에서 방사선을 쏘아 뽑으면 골 근처에서 표본이 성겨져 큰 그림에서 계단처럼 꺾여 보였다.) 맨 아래 골에서 시작해 한 바퀴 돈다 */
    var cy0 = -0.195, NL = 7, d = 0.27, R = 0.16, cv = [], n = 24, hs = Math.PI / NL;
    var rc = d * Math.cos(hs) + Math.sqrt(R * R - d * d * Math.sin(hs) * Math.sin(hs)), phi = Math.atan2(rc * Math.sin(hs), rc * Math.cos(hs) - d);
    for (k = 0; k < NL; k++) {
      var la = -Math.PI / 2 + (k + 4) * TAU / NL;
      for (i = 0; i < n; i++) { a = la - phi + 2 * phi * i / n; cv.push([d * Math.cos(la) + R * Math.cos(a), cy0 + d * Math.sin(la) + R * Math.sin(a)]); }
    }
    var tree = [
      prep(cv, { closed: true, run: 2 }),
      prep([[0, 0.625], [0, 0.02], [0, -0.1], [0, -0.25]], { sharp: true, skipA: true, run: 1 }),
      prep([[0, 0.02], [0.16, -0.15]], { sharp: true, skipA: true }),
      prep([[0, -0.1], [-0.15, -0.26]], { sharp: true, skipA: true }),
      prep([[-0.22, 0.625], [0, 0.625], [0.22, 0.625]], { sharp: true })
    ];

    /* 3) 의료: 심장 윤곽과 그 사이를 지나는 맥박선(적십자 표장은 쓰지 않는다) */
    var hv = []; n = 96;
    for (i = 0; i < n; i++) {
      a = i / n * TAU;
      var sx = Math.sin(a), f = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      hv.push([16 * sx * sx * sx / 35.5, (-f - 2.52) / 35.5]);
    }
    var heart = [
      prep(hv, { closed: true, run: 1 }),
      prep([[-0.5, 0.02], [-0.19, 0.02], [-0.115, -0.2], [-0.02, 0.22], [0.06, -0.07], [0.11, 0.02], [0.5, 0.02]], { sharp: true, run: 1, spd: 1.9 })
    ];

    /* 4) 경제: 막대 넷과 그 위로 오르는 꺾은선(끝에 화살촉) */
    var chart = [prep([[-0.5, 0.5], [-0.44, 0.5], [-0.28, 0.5], [-0.2, 0.5], [-0.04, 0.5], [0.04, 0.5], [0.2, 0.5], [0.28, 0.5], [0.44, 0.5], [0.5, 0.5]], { sharp: true })];
    var bx = [-0.44, -0.2, 0.04, 0.28], bt = [0.3, 0.16, 0.04, -0.14];
    for (i = 0; i < 4; i++) chart.push(prep([[bx[i], 0.5], [bx[i], bt[i]], [bx[i] + 0.16, bt[i]], [bx[i] + 0.16, 0.5]], { sharp: true, skipA: true, skipB: true, run: i === 3 ? 1 : 0 }));
    chart.push(prep([[-0.46, 0.08], [-0.2, -0.1], [-0.06, -0.02], [0.42, -0.46]], { sharp: true, skipB: true, run: 1, spd: 1.3 }));
    chart.push(prep([[0.24, -0.46], [0.42, -0.46], [0.42, -0.28]], { sharp: true }));

    return [shield, tree, heart, chart];
  })();

  /* 자리 맞춤 검사에 쓰는 촘촘한 표본과, 가장 짧은 그림의 선 길이 */
  var TEST = [], MINLEN = 1e9;
  (function () {
    for (var i = 0; i < DEFS.length; i++) {
      var T = [], tot = 0;
      for (var j = 0; j < DEFS[i].length; j++) {
        var p = DEFS[i][j], m = Math.max(2, Math.ceil(p.len / 0.025));
        for (var q = 0; q <= m; q++) { var pt = at(p, p.len * q / m); T.push(pt[0], pt[1]); }
        tot += p.len;
      }
      TEST.push(T); if (tot < MINLEN) MINLEN = tot;
    }
  })();

  /* 그림 하나에 점 nP개를 선 길이에 비례해 고르게 나눠 놓는다. 꺾은선은 꼭짓점마다 점이 오게 한다 */
  function allot(def, nP) {
    var runs = [], total = 0, extra = 0, i, k, p, r;
    for (i = 0; i < def.length; i++) {
      p = def[i];
      if (p.sharp) { for (k = 0; k < p.x.length - 1; k++) runs.push({ p: i, s0: p.cum[k], len: p.cum[k + 1] - p.cum[k], n: 1 }); }
      else runs.push({ p: i, s0: 0, len: p.len, n: 1 });
      total += p.len;
      if (!p.closed) extra += 1 - (p.skipA ? 1 : 0) - (p.skipB ? 1 : 0);
    }
    var sp = total / Math.max(1, nP - extra), sum = extra, guard = 0;
    for (i = 0; i < runs.length; i++) { runs[i].n = Math.max(1, Math.round(runs[i].len / sp)); sum += runs[i].n; }
    while (sum !== nP && guard++ < 4000) {
      var best = -1, bv = sum < nP ? -1 : 1e9;
      for (i = 0; i < runs.length; i++) {
        r = runs[i]; var v = r.len / r.n;
        if (sum < nP) { if (v > bv) { bv = v; best = i; } } else if (r.n > 1 && v < bv) { bv = v; best = i; }
      }
      if (best < 0) break;
      if (sum < nP) { runs[best].n++; sum++; } else { runs[best].n--; sum--; }
    }
    var nx = new Float32Array(nP), ny = new Float32Array(nP), segs = [], c = 0, ri = 0, pt;
    for (i = 0; i < def.length; i++) {
      p = def[i]; var off = c, first = true;
      for (; ri < runs.length && runs[ri].p === i; ri++) {
        r = runs[ri];
        for (var j = 0; j < r.n; j++) {
          if (first && j === 0 && p.skipA) continue;
          if (c >= nP) break;
          pt = at(p, r.s0 + r.len * j / r.n); nx[c] = pt[0]; ny[c] = pt[1]; c++;
        }
        first = false;
      }
      if (!p.closed && !p.skipB && c < nP) { nx[c] = p.x[p.x.length - 1]; ny[c] = p.y[p.y.length - 1]; c++; }
      segs.push({ off: off, n: c - off, closed: p.closed, run: p.run, spd: p.spd, len: p.len });
    }
    while (c < nP) { nx[c] = nx[c - 1]; ny[c] = ny[c - 1]; c++; }
    var segOf = new Uint8Array(nP);
    for (i = 0; i < segs.length; i++) for (k = 0; k < segs[i].n; k++) segOf[segs[i].off + k] = i;
    return { nx: nx, ny: ny, segs: segs, segOf: segOf };
  }

  /* ---------- 점 하나를 띄워 보내기 ---------- */
  function go(s, i, gx, gy, t0, dur, role, ref, c1x, c1y, c2x, c2y) {
    s.FX[i] = s.X[i]; s.FY[i] = s.Y[i]; s.GX[i] = gx; s.GY[i] = gy; s.T0[i] = t0; s.DUR[i] = dur;
    s.C1X[i] = c1x; s.C1Y[i] = c1y; s.C2X[i] = c2x; s.C2Y[i] = c2y;
    s.A0[i] = s.AL[i]; s.A1[i] = role ? 0 : 1; s.ROLE[i] = role; s.REF[i] = ref; s.MOV[i] = 1; s.PT[i] = 0;
  }
  /* 납작한 아치 길: 제자리에서 곧게 차선(높이 pk)까지 오르거나 내린 뒤 차선을 따라 건너가고, 도착 자리 위에서 곧게 내려앉는다.
     모서리는 반지름 s.RC로 둥글린다. 베지어 한 줄로는 제목 타원의 어깨를 스치게 되어, 반대편으로 건너가는 무리만 이 길을 쓴다 */
  function archTo(s, i, gx, gy, t0, dur, ref, pk) {
    go(s, i, gx, gy, t0, dur, 0, ref, 0, pk, 0, pk);
    s.PT[i] = 1;
  }
  /* 살짝 휜 길. (ox, oy)를 주면 그 점에서 바깥쪽으로, 없으면 진행 방향의 옆으로 k만큼 휜다 */
  function bowTo(s, i, gx, gy, t0, dur, role, ref, k, ox, oy) {
    var fx = s.X[i], fy = s.Y[i], mx = (fx + gx) / 2, my = (fy + gy) / 2, dx = gx - fx, dy = gy - fy, ch = Math.sqrt(dx * dx + dy * dy) || 1, nx, ny;
    if (ox != null) {
      nx = mx - ox; ny = my - oy; var nl = Math.sqrt(nx * nx + ny * ny);
      if (nl < ch * 0.1) { nx = -dy / ch; ny = dx / ch; } else { nx /= nl; ny /= nl; }
    } else { nx = -dy / ch; ny = dx / ch; }
    var qx = mx + nx * k * ch, qy = my + ny * k * ch;
    go(s, i, gx, gy, t0, dur, role, ref, fx + (qx - fx) * 2 / 3, fy + (qy - fy) * 2 / 3, gx + (qx - gx) * 2 / 3, gy + (qy - gy) * 2 / 3);
  }
  /* 제목 자리를 피해 돌아가는 길. horiz면 위(side -1)나 아래(side 1)로, 아니면 왼쪽이나 오른쪽으로 돈다.
     rank 0은 타원에 가까운 안쪽 차선, 1은 바깥 차선 */
  function laneTo(s, i, gx, gy, t0, dur, role, ref, side, rank, horiz) {
    var fx = s.X[i], fy = s.Y[i], Q = s.Q, inner, outer, pk, cc;
    if (horiz) {
      inner = side < 0 ? Q.y - Q.ry - s.gI : Q.y + Q.ry + s.gI;
      outer = side < 0 ? Math.min(s.ti + s.gI, inner - 10) : Math.max(s.h - s.m - s.gI * 0.6, inner + 10);
      pk = inner + (outer - inner) * rank; cc = (8 * pk - fy - gy) / 6;
      go(s, i, gx, gy, t0, dur, role, ref, fx + (gx - fx) * 0.06, cc, gx - (gx - fx) * 0.06, cc);
    } else {
      inner = side < 0 ? Q.x - Q.rx - s.gI : Q.x + Q.rx + s.gI;
      outer = side < 0 ? Math.min(s.m + 2, inner - 10) : Math.max(s.w - s.m - 2, inner + 10);
      pk = inner + (outer - inner) * rank; cc = (8 * pk - fx - gx) / 6;
      go(s, i, gx, gy, t0, dur, role, ref, cc, fy + (gy - fy) * 0.06, cc, gy - (gy - fy) * 0.06);
    }
  }
  function qdOf(Q, x, y) { var dx = (x - Q.x) / Q.rx, dy = (y - Q.y) / Q.ry; return Math.sqrt(dx * dx + dy * dy); }
  function crosses(Q, ax, ay, bx, by) {
    for (var q = 1; q < 8; q++) { var u = q / 8; if (qdOf(Q, ax + (bx - ax) * u, ay + (by - ay) * u) < 1) return true; }
    return false;
  }

  /* ---------- 슬라이드가 바뀔 때: 누가 어디로 갈지 정한다 ----------
     ROLE 0은 지금 그림의 점(REF는 그림 안의 자리 번호), ROLE 1은 다음 그림의 밑그림 위에서 쉬는 점(REF는 밑그림 안의 자리 번호) */
  function plan(s, k) {
    var base = k * s.CY, rnd = s.rnd, nP = s.nP, nC = s.nC, N = s.N, Q = s.Q, i, j, c, r, n;
    var pic = s.pics[k % 4], gp = s.pics[(k + 1) % 4], tx = pic.tx, ty = pic.ty, z = s.zones[pic.zone], X = s.X, Y = s.Y, gocc = s.gocc;
    var picDots = [], poolDots = [], usedT = new Uint8Array(nP), usedD = new Uint8Array(N);
    for (i = 0; i < N; i++) (s.ROLE[i] ? poolDots : picDots).push(i);
    function sgn() { return rnd() < 0.5 ? -1 : 1; }

    /* (1) 밑그림 위에서 쉬던 점은 같은 번호의 자리로 들어가 새 그림의 뼈대가 된다.
           가운데 글 배치에서는 밑그림과 그림이 같은 곳이라 제자리에서 진해지기만 하고, 왼쪽 글 배치에서는 작은 밑그림에서 큰 그림으로 펼쳐진다 */
    for (r = 0; r < poolDots.length; r++) {
      i = poolDots[r]; j = s.REF[i]; usedT[j] = 1;
      bowTo(s, i, tx[j], ty[j], base + rnd() * 300, s.alt ? 420 : 660, 0, j, s.alt ? 0 : sgn() * (0.1 + rnd() * 0.14));
    }
    /* (2) 떠나는 그림에서 4분의 1쯤은 그다음 그림의 밑그림 위에 고르게 앉아 쉰다 */
    for (c = 0; c < nP; c++) gocc[c] = -1;
    for (c = 0; c < nC; c++) {
      j = Math.min(nP - 1, Math.floor((c + 0.5) * nP / nC));
      var bi = -1, bd = 1e18;
      for (r = 0; r < picDots.length; r++) { i = picDots[r]; if (usedD[i]) continue; var dd = (X[i] - gp.gx[j]) * (X[i] - gp.gx[j]) + (Y[i] - gp.gy[j]) * (Y[i] - gp.gy[j]); if (dd < bd) { bd = dd; bi = i; } }
      if (bi < 0) break;
      usedD[bi] = 1; gocc[j] = bi;
      bowTo(s, bi, gp.gx[j], gp.gy[j], base + (s.alt ? 200 : 40) + rnd() * 380, s.alt ? 560 : 640, 1, j, sgn() * (0.12 + rnd() * 0.16));
    }
    var src = [], tgt = [];
    for (r = 0; r < picDots.length; r++) if (!usedD[picDots[r]]) src.push(picDots[r]);

    if (s.alt) {
      /* (3-가) 나머지는 한 무리로 제목 위를 지나 반대편에 건너간다.
               위아래로 갈라 보내면 두 줄기가 제목을 둘러싼 고리(궤도)처럼 보여서 한쪽으로만 보낸다.
               제목 아래 띠는 쓰지 않는다. 시안 조절 막대가 그 자리를 덮어서 무리가 사라졌다가 나타나는 것처럼 보인다.
               그림 안의 자리(높이 묶음과 좌우 순서)가 비슷한 곳끼리 짝지어 가로로 가는 거리를 고르게 하고, 위쪽 점일수록 바깥(더 높은) 차선을 탄다.
               걸리는 시간은 길의 길이에 비례하게 잡는다. 그래서 모든 점이 같은 속도로 날고, 길이 먼 아래쪽 점이 먼저 떠나 거의 같은 때에 내려앉는다.
               (시간을 똑같이 주면 먼 길을 가는 점이 한 프레임에 60px 넘게 튀어 깜빡여 보였다.) */
      for (j = 0; j < nP; j++) if (!usedT[j]) tgt.push(j);
      var banded = function (arr, ys, xs) {   // 높이 순으로 여섯 묶음, 묶음 안에서는 좌우 순
        var out = [], m = arr.length, q;
        arr.sort(function (a, b) { return ys[a] - ys[b]; });
        for (q = 0; q < 6; q++) out = out.concat(arr.slice(Math.round(q * m / 6), Math.round((q + 1) * m / 6)).sort(function (a, b) { return xs[a] - xs[b]; }));
        return out;
      };
      src = banded(src, Y, X); tgt = banded(tgt, ty, tx);
      var inner = Q.y - Q.ry - s.gI, outer = Math.min(s.ti + s.gI, inner - 10), yA = 1e9, yB = -1e9, pks = [], lens = [], lmax = 1, DXM = TR_X - 80;
      n = Math.min(src.length, tgt.length);
      for (r = 0; r < n; r++) { yA = Math.min(yA, Y[src[r]]); yB = Math.max(yB, Y[src[r]]); }
      for (r = 0; r < n; r++) {
        i = src[r]; j = tgt[r];
        var pk = inner + (outer - inner) * clamp(1 - (Y[i] - yA) / Math.max(1, yB - yA) + (rnd() - 0.5) * 0.3, 0, 1);
        var len = Math.abs(Y[i] - pk) + Math.abs(tx[j] - X[i]) + Math.abs(ty[j] - pk);
        pks.push(pk); lens.push(len); if (len > lmax) lmax = len;
      }
      for (r = 0; r < n; r++) {
        var dur = DXM * lens[r] / lmax;
        archTo(s, src[r], tx[tgt[r]], ty[tgt[r]], base + (DXM - dur) + rnd() * 70, dur, tgt[r], pks[r]);
      }
    } else {
      /* (3-나) 같은 자리에서 다시 짠다: 중심 둘레의 각도 순서대로 4분의 1바퀴쯤 밀어 짝지어, 무리 전체가 한 방향으로 휘돌며 자리를 찾는다 */
      for (r = 0; r < nP; r++) if (!usedT[pic.ang[r]]) tgt.push(pic.ang[r]);
      src.sort(function (a, b) { return Math.atan2(Y[a] - z.cy, X[a] - z.cx) - Math.atan2(Y[b] - z.cy, X[b] - z.cx); });
      n = Math.min(src.length, tgt.length);
      var shift = Math.round(n * 0.27), ph0 = rnd();
      for (r = 0; r < n; r++) {
        i = src[r]; j = tgt[(r + shift) % n];
        if (crosses(Q, X[i], Y[i], tx[j], ty[j])) {
          var hz = Math.abs(tx[j] - X[i]) > Math.abs(ty[j] - Y[i]);
          laneTo(s, i, tx[j], ty[j], base + rnd() * 220, 840, 0, j, hz ? (Y[i] + ty[j] < 2 * Q.y ? -1 : 1) : (X[i] + tx[j] < 2 * Q.x ? -1 : 1), rnd(), hz);
        } else bowTo(s, i, tx[j], ty[j], base + ((r / n + ph0) % 1) * 360 + rnd() * 30, 680 + rnd() * 30, 0, j, 0.34, z.cx, z.cy);
      }
    }
  }

  /* 밑그림 위에서 쉬는 점 하나가 선을 따라 빈 옆자리로 옮긴다(둥둥 떠다니는 대신 또박또박 한 칸씩) */
  function hop(s) {
    var gp = s.pics[(s.k + 1) % 4], rnd = s.rnd, gocc = s.gocc;
    for (var tr = 0; tr < 8; tr++) {
      var i = Math.floor(rnd() * s.N);
      if (!s.ROLE[i] || s.MOV[i]) continue;
      var j = s.REF[i], sg = gp.segs[gp.segOf[j]], dir = rnd() < 0.5 ? -1 : 1;
      for (var q = 0; q < 2; q++, dir = -dir) {
        var jn = j;
        for (var st = 0; st < 2; st++) {   // 두 칸까지 비어 있으면 두 칸을 간다
          var jc = jn + dir;
          if (sg.closed) jc = sg.off + (((jc - sg.off) % sg.n) + sg.n) % sg.n; else if (jc < sg.off || jc >= sg.off + sg.n) break;
          if (gocc[jc] >= 0) break;
          jn = jc;
        }
        if (jn === j) continue;
        gocc[j] = -1; gocc[jn] = i;
        var gx = gp.gx[jn], gy = gp.gy[jn], fx = s.X[i], fy = s.Y[i];
        go(s, i, gx, gy, s.clock, 260, 1, jn, fx + (gx - fx) / 3, fy + (gy - fy) / 3, fx + (gx - fx) * 2 / 3, fy + (gy - fy) * 2 / 3);
        return;
      }
    }
  }

  function step(s, dt) {
    s.clock += dt;
    var k = Math.floor(s.clock / s.CY), i;
    while (s.k < k) { s.k++; plan(s, s.k); }
    var ph = s.clock - s.k * s.CY; s.ph = ph;
    if (s.nC > 0 && ph > s.TR + 120 && ph < s.CY - 280 && s.clock >= s.nextHop) { hop(s); s.nextHop = s.clock + 150 + s.rnd() * 120; }
    var X = s.X, Y = s.Y, MOV = s.MOV, clk = s.clock;
    for (i = 0; i < s.N; i++) {
      if (!MOV[i]) continue;
      var u = (clk - s.T0[i]) / s.DUR[i];
      if (u <= 0) continue;
      if (u >= 1) { X[i] = s.GX[i]; Y[i] = s.GY[i]; s.AL[i] = s.A1[i]; MOV[i] = 0; continue; }
      var e, v;
      if (s.PT[i]) {
        /* 납작한 아치: 세로, 둥근 모서리, 가로, 둥근 모서리, 세로를 길이 그대로 이어 붙이고 그 위를 고른 속도로 간다 */
        e = tz(u, 0.2);
        var fx = s.FX[i], fy = s.FY[i], gx = s.GX[i], gy = s.GY[i], pk = s.C1Y[i];
        var h1 = Math.abs(fy - pk), h2 = Math.abs(gy - pk), dd = Math.abs(gx - fx), sx = gx < fx ? -1 : 1, s1 = pk < fy ? -1 : 1, s2 = gy < pk ? -1 : 1;
        var ro = Math.max(0.01, Math.min(s.RC, h1, h2, dd / 2)), qa = Math.PI / 2 * ro, d = e * (h1 + h2 + dd - 4 * ro + 2 * qa), an;
        if (d < h1 - ro) { X[i] = fx; Y[i] = fy + s1 * d; }
        else if ((d -= h1 - ro) < qa) { an = d / ro; X[i] = fx + sx * ro * (1 - Math.cos(an)); Y[i] = pk - s1 * ro * (1 - Math.sin(an)); }
        else if ((d -= qa) < dd - 2 * ro) { X[i] = fx + sx * (ro + d); Y[i] = pk; }
        else if ((d -= dd - 2 * ro) < qa) { an = d / ro; X[i] = gx - sx * ro * (1 - Math.sin(an)); Y[i] = pk + s2 * ro * (1 - Math.cos(an)); }
        else { d -= qa; X[i] = gx; Y[i] = pk + s2 * (ro + d); }
      } else {
        e = ss(u); v = 1 - e;
        X[i] = v * v * v * s.FX[i] + 3 * v * v * e * s.C1X[i] + 3 * v * e * e * s.C2X[i] + e * e * e * s.GX[i];
        Y[i] = v * v * v * s.FY[i] + 3 * v * v * e * s.C1Y[i] + 3 * v * e * e * s.C2Y[i] + e * e * e * s.GY[i];
      }
      s.AL[i] = s.A0[i] + (s.A1[i] - s.A0[i]) * e;   // AL: 1이면 그림의 점, 0이면 쉬는 점. 농도와 크기를 이 값으로 섞는다
    }
  }

  LAB.register({
    id: 'h4-domains', name: '도메인 슬라이드쇼', short: '도메인', en: 'Domains',
    hero: true, designed: true, textDefault: true, defaultPal: 'dawn', heroPal: { light: 'dawn', dark: 'indigo' },
    idea: '작은 점(참여 기관)들이 모여 보안의 방패, 농업의 나무, 의료의 심장, 경제의 그래프를 차례로 그린다. 한 그림이 끝나면 점들이 떼 지어 옮겨 가 옅은 밑그림으로 기다리던 다음 그림을 채워서 TRAVI가 한 분야에 묶여 있지 않다는 점을 보여 준다.',

    init: function (w, h, P) {
      var u = clamp(w / 900, 0.75, 1.6), rnd = rng(90417), i, j;
      var q = P.quiet || { x: 0.5, y: 0.5, rx: 0.31, ry: 0.26 };
      var Q = { x: q.x * w, y: q.y * h, rx: Math.max(1, q.rx * w), ry: Math.max(1, q.ry * h) };
      function qd(x, y) { return qdOf(Q, x, y); }
      var left = P.layout === 'left', tall = w / h < 1.05, alt = !left && !tall;
      var m = Math.max(12, 0.016 * w), ti = Math.min(72, 0.1 * h);   // 가장자리 여백, 위쪽 머리띠 자리
      var fs = clamp(7.4 * u, 9, 12), capGap = 13 * u, capH = fs + 15 * u;
      var strip = left && !tall ? 0.08 * w : 0;                      // 왼쪽 글 배치에서 다음 그림의 작은 밑그림이 서는 오른쪽 띠
      var top0, bot0;
      if (left && tall) { top0 = Q.y + Q.ry * 0.8; bot0 = h - m; }   // 세로로 긴 화면 + 왼쪽 글: 오른쪽 아래 구석에만 작게 그린다
      else if (left) { top0 = ti + 10; bot0 = h - Math.max(m, 0.07 * h); }
      else if (alt) { top0 = ti + 4; bot0 = h - m; }
      else { top0 = Q.y + Q.ry + 6; bot0 = h - m; }                  // 세로로 긴 화면 + 가운데 글: 제목 아래에만 그린다

      /* 그림 중심. 가운데 배치는 양옆 가장자리에 붙이고, 왼쪽 배치는 오른쪽 띠 안쪽에 붙인다 */
      function centers(W) {
        var pad = PADK * W, bh = FA * W + 2 * pad + capGap + capH;
        var cy = top0 + Math.max(0, (bot0 - top0 - bh) * 0.5) + pad + FA * W / 2;
        if (left) return [{ cx: w - m - strip - pad - W / 2, cy: cy }];
        if (alt) return [{ cx: m + pad + W / 2, cy: cy }, { cx: w - m - pad - W / 2, cy: cy }];
        return [{ cx: w / 2, cy: cy }];
      }
      /* 네 그림의 모든 선이 제목 타원 밖, 화면 안에 들어오는가 */
      function fits(W) {
        if (FA * W + 2 * PADK * W + capGap + capH > bot0 - top0) return false;
        var zc = centers(W);
        for (var a = 0; a < 4; a++) {
          var c = zc[a % zc.length], T = TEST[a];
          for (var b = 0; b < T.length; b += 2) {
            var x = c.cx + T[b] * W, y = c.cy + T[b + 1] * W;
            if (x < m || x > w - m || qd(x, y) < 1.02) return false;
          }
        }
        return true;
      }
      var maxW = left ? Math.min(0.4 * w, 0.7 * h / FA) : alt ? Math.min(0.26 * w, 0.62 * h / FA) : Math.min(0.5 * w, 0.62 * h / FA);
      var W = maxW;
      if (!fits(W)) { var lo = 6, hi = maxW; for (i = 0; i < 18; i++) { var mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } W = lo; }

      function frameOf(cx, cy, Wz) { var pd = PADK * Wz; return { cx: cx, cy: cy, W: Wz, x0: cx - Wz / 2 - pd, x1: cx + Wz / 2 + pd, y0: cy - FA * Wz / 2 - pd, y1: cy + FA * Wz / 2 + pd }; }
      var zc = centers(W), zones = [];
      for (i = 0; i < zc.length; i++) zones.push(frameOf(zc[i].cx, zc[i].cy, W));

      /* 왼쪽 글 배치: 큰 그림 오른쪽 아래에 다음 그림의 작은 밑그림 틀을 둔다(아랫변을 큰 틀에 맞춘다) */
      var thumb = null;
      if (strip > 0) {
        var gx0 = zones[0].x1 + 0.016 * w, Wt = (w - m - gx0) / (1 + 2 * PADK);
        if (Wt >= 34) { var ht = FA * Wt + 2 * PADK * Wt; thumb = frameOf((gx0 + w - m) / 2, zones[0].y1 - ht / 2, Wt); }
      }

      /* 점 수: 가장 짧은 그림에서도 점 사이가 8.5px쯤 되게 잡는다. 점이 붙으면 선 그림이 아니라 굵은 점선으로 보인다.
         작은 화면에서는 84개까지 줄이고, 그래도 점 사이가 4px 아래로 붙는 아주 작은 그림에서는 더 줄인다 */
      var nP = Math.round(clamp(MINLEN * W / 8.5, clamp(MINLEN * W / 4.2, 40, 84), 164));
      var r = clamp(0.175 * MINLEN * W / nP, 0.9, 1.2 * u);
      var nC = alt ? Math.round(nP / 3) : thumb ? Math.round(nP / 4) : 0, N = nP + nC;
      /* 쉬는 점의 크기: 가운데 배치는 거의 같은 크기, 작은 밑그림 위에서는 촘촘해지지 않게 줄인다 */
      var rPool = alt ? r * 0.92 : thumb ? clamp(0.19 * MINLEN * thumb.W / Math.max(1, nC), 0.7, r * 0.8) : r;

      /* 네 그림의 점 자리(tx, ty)와 선(polys), 밑그림으로 놓일 때의 점 자리(gx, gy)와 선(gpolys) */
      var pics = [];
      for (i = 0; i < 4; i++) (function (def, zi) {
        var z = zones[zi], al = allot(def, nP), a;
        function place(c, Wz) {
          var px = new Float32Array(nP), py = new Float32Array(nP), pl = [], b;
          for (a = 0; a < nP; a++) { px[a] = c.cx + al.nx[a] * Wz; py[a] = c.cy + al.ny[a] * Wz; }
          for (a = 0; a < def.length; a++) {
            var p = def[a], lx = new Float32Array(p.x.length), ly = new Float32Array(p.x.length);
            for (b = 0; b < p.x.length; b++) { lx[b] = c.cx + p.x[b] * Wz; ly[b] = c.cy + p.y[b] * Wz; }
            pl.push({ x: lx, y: ly, len: p.len * Wz });
          }
          return { x: px, y: py, polys: pl };
        }
        var big = place(z, W), gh = thumb ? place(thumb, thumb.W) : big;
        var ang = range(nP);
        ang.sort(function (c, d) { return Math.atan2(big.y[c] - z.cy, big.x[c] - z.cx) - Math.atan2(big.y[d] - z.cy, big.x[d] - z.cx); });
        pics.push({ zone: zi, tx: big.x, ty: big.y, polys: big.polys, gx: gh.x, gy: gh.y, gpolys: gh.polys, segs: al.segs, segOf: al.segOf, ang: ang });
      })(DEFS[i], i % zones.length);

      var F = function () { return new Float32Array(N); };
      var s = {
        w: w, h: h, u: u, m: m, ti: ti, Q: Q, gI: 0.032 * h, RC: Math.max(6, 0.045 * h), alt: alt, W: W, r: r, rPool: rPool, fs: fs, capGap: capGap,
        zones: zones, thumb: thumb, pics: pics, nP: nP, nC: nC, N: N, rnd: rnd, gocc: new Int16Array(nP),
        X: F(), Y: F(), FX: F(), FY: F(), GX: F(), GY: F(), C1X: F(), C1Y: F(), C2X: F(), C2Y: F(),
        T0: new Float64Array(N), DUR: F(), A0: F(), A1: F(), AL: F(), ROLE: new Uint8Array(N), MOV: new Uint8Array(N), PT: new Uint8Array(N), REF: new Int16Array(N), BIN: new Uint8Array(N),
        TR: alt ? TR_X : TR_S, k: 0, ph: 0, lastT: null, nextHop: 0,
        font: '500 ' + fs.toFixed(1) + 'px ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace', tw: null
      };
      s.CY = HOLD + s.TR;
      /* 첫 장면은 첫 그림이 다 그려진 상태다(draw에서 첫 슬라이드는 다 그려진 것으로 친다). 시계를 앞에 두어 첫 그림이 3초 가까이 머문다.
         이 값이면 1.5초, 6초, 12초 무렵이 모두 그림이 다 그려진 장면이다(가운데 배치는 첫 전환이 3.0초, 왼쪽 배치는 3.25초에 시작한다).
         촬영 도구는 뒤 장면일수록 0.2~0.5초 늦게 찍히므로 그만큼 여유를 두었다 */
      s.clock = alt ? 800 : 350;
      for (i = 0; i < nP; i++) { s.X[i] = pics[0].tx[i]; s.Y[i] = pics[0].ty[i]; s.AL[i] = 1; s.REF[i] = i; s.gocc[i] = -1; }
      /* 쉬는 점은 다음 그림(두 번째)의 밑그림 위에 고르게 놓는다 */
      for (j = 0; j < nC; j++) {
        i = nP + j; var tj = Math.min(nP - 1, Math.floor((j + 0.5) * nP / nC));
        s.X[i] = pics[1].gx[tj]; s.Y[i] = pics[1].gy[tj]; s.AL[i] = 0; s.ROLE[i] = 1; s.REF[i] = tj; s.gocc[tj] = i;
      }
      return s;
    },

    draw: function (ctx, w, h, t, P, s) {
      var dt = s.lastT == null ? 16 : clamp(t - s.lastT, 0, 50); s.lastT = t;
      step(s, dt);

      var u = s.u, r = s.r, Q = s.Q, ph = s.ph, CY = s.CY, TR = s.TR, N = s.N, i, j, b;
      var phv = s.k === 0 ? Math.max(ph, TR + 600) : ph;   // 첫 슬라이드는 처음부터 다 그려진 것으로 친다
      var LB = P.dark ? 1 : 1.5;                           // 밝은 배경에서는 가는 선과 옅은 점을 1.5배 진하게
      var idx = s.k % 4, nix = (s.k + 1) % 4, pic = s.pics[idx], npic = s.pics[nix], z = s.zones[pic.zone];
      function A1(a) { return a > 1 ? 1 : a < 0 ? 0 : a; }

      var envIn = ss((phv - 80) / 380), envOut = 1 - ss((ph - (CY - 280)) / 240), GL = 0.42;
      var pg = ss((phv - (TR - 320)) / 450), sa = 1 - ss((ph - (CY - 300)) / 240);   // 강조색 선이 그어진 정도와 농도(점이 내려앉자마자 0.45초에 긋는다)
      var gIn = ss((phv - 300) / 600);                                               // 다음 그림 밑그림이 나타난 정도

      /* 1) 그림 틀의 모서리 눈금 */
      ctx.strokeStyle = P.ink(A1(0.19 * LB)); ctx.lineWidth = Math.max(0.8, 0.65 * u); ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      ctx.beginPath();
      function ticks(f, tl) {
        var CX = [f.x0, f.x1, f.x1, f.x0], CYs = [f.y0, f.y0, f.y1, f.y1], SX = [1, -1, -1, 1], SY = [1, 1, -1, -1];
        for (var c = 0; c < 4; c++) {
          if (qdOf(Q, CX[c], CYs[c]) < 1.04) continue;
          ctx.moveTo(CX[c] + SX[c] * tl, CYs[c]); ctx.lineTo(CX[c], CYs[c]); ctx.lineTo(CX[c], CYs[c] + SY[c] * tl);
        }
      }
      for (i = 0; i < s.zones.length; i++) ticks(s.zones[i], 8 * u);
      if (s.thumb) ticks(s.thumb, 5 * u);
      ctx.stroke();

      /* 2) 캡션과 진행 표시. 다음 그림의 캡션도 옅게 미리 보인다 */
      ctx.font = s.font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      if ('letterSpacing' in ctx) ctx.letterSpacing = (s.fs * 0.14).toFixed(2) + 'px';
      if (!s.tw) { s.tw = []; for (i = 0; i < 4; i++) s.tw.push([ctx.measureText('0' + (i + 1) + ' / 04').width, ctx.measureText(NAMES[i]).width]); }
      var gapT = s.fs * 1.1;
      /* al: 글자 농도, dash: 진행 표시 농도(0이면 안 그림), full: 도메인 이름까지 쓸지, right: 틀의 오른쪽 끝에 맞출지.
         왼쪽 글 배치에서는 큰 그림의 캡션을 오른쪽 끝에 맞춘다. 왼쪽 아래에 두면 시안 조절 막대(화면 가운데 아래, 폭의 절반)에 가려진다 */
      function caption(ix, zn, al, dash, full, right) {
        var totW = s.tw[ix][0] + (full ? gapT + s.tw[ix][1] : 0), yb = zn.y1 + s.capGap + s.fs * 0.78;
        var x0 = right ? Math.max(s.m, zn.x1 - totW) : Math.max(s.m, Math.min(zn.x0, w - s.m - totW));
        if (al > 0.01) {
          ctx.fillStyle = P.ink(0.46 * al); ctx.fillText('0' + (ix + 1) + ' / 04', x0, yb);
          if (full) { ctx.fillStyle = P.ink(0.74 * al); ctx.fillText(NAMES[ix], x0 + s.tw[ix][0] + gapT, yb); }
        }
        if (dash <= 0.01) return;
        var dw = 15 * u, dg = 5 * u, dth = Math.max(1.4, 1.5 * u), dy = yb + 9 * u, dl = right ? Math.max(s.m, zn.x1 - 4 * dw - 3 * dg) : x0;
        for (var d = 0; d < 4; d++) {
          var dx0 = dl + d * (dw + dg);
          ctx.fillStyle = P.ink(A1(0.2 * LB * dash)); ctx.fillRect(dx0, dy, dw, dth);
          if (d === ix) { ctx.fillStyle = P.c(0.5, A1(envIn * envOut)); ctx.fillRect(dx0, dy, dw * clamp(ph / CY, 0.08, 1), dth); }
        }
      }
      if (s.alt) {
        caption(idx, z, (GL + (1 - GL) * envIn) * envOut, envIn * envOut, true);
        caption(nix, s.zones[npic.zone], GL * gIn, 0, true);
      } else {
        caption(idx, z, envIn * envOut, 1, true, !!s.thumb);
        if (s.thumb) caption(nix, s.thumb, GL * 1.3 * gIn, 0, false, true);   // 작은 밑그림의 번호도 오른쪽 끝에 맞춰 큰 그림의 캡션과 떨어뜨린다
      }

      /* 3) 선. 다음 그림은 옅은 점선 밑그림으로 먼저 놓이고, 점이 다 모이면 그 위로 강조색 선이 그어진다 */
      function trace(pl) { ctx.beginPath(); ctx.moveTo(pl.x[0], pl.y[0]); for (var c = 1; c < pl.x.length; c++) ctx.lineTo(pl.x[c], pl.y[c]); }
      function ghost(polys, al) {
        if (al < 0.02) return;
        ctx.strokeStyle = P.ink(A1((P.dark ? 0.28 : 0.36) * al)); ctx.lineWidth = Math.max(0.8, 0.62 * u); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
        ctx.setLineDash([2.2 * u, 3.4 * u]); ctx.lineDashOffset = -((s.clock * 0.011 * u) % (5.6 * u));   // 점선이 선을 따라 천천히 흐른다
        for (var c = 0; c < polys.length; c++) { trace(polys[c]); ctx.stroke(); }
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      if (s.nC > 0) {
        ghost(npic.gpolys, gIn);
        ghost(pic.gpolys, s.alt ? 1 - pg : 1 - ss(phv / 380));   // 지금 그림의 밑그림: 잉크가 올라가며(또는 점이 떠나며) 사라진다
      }
      if (pg > 0.01 && sa > 0.01) {
        ctx.strokeStyle = P.c(0.5, A1((P.dark ? 1 : 0.95) * sa)); ctx.lineWidth = clamp(0.72 * r + 0.3, 0.9, 1.8); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (i = 0; i < pic.polys.length; i++) {
          var pl = pic.polys[i];
          trace(pl);
          if (pg < 0.999) ctx.setLineDash([pl.len * pg, pl.len * 2 + 10]); else ctx.setLineDash([]);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      /* 4) 강조점: 선을 따라 점에서 점으로 넘겨받으며 달린다. 점보다 먼저 그려서 강조색 원판이 점을 가리지 않고 테처럼 둘러싼다.
            (점 위에 덮으면 어두운 배경에서 흰 점이 남색으로 가려져 오히려 어두워 보인다.) 번짐 없이 가장자리가 또렷한 단색 원판이다 */
      var he = ss((phv - TR - 120) / 380) * sa;
      if (he > 0.02) {
        var clk = s.clock;
        for (i = 0; i < pic.segs.length; i++) {
          var sg = pic.segs[i]; if (!sg.run || sg.n < 3) continue;
          var spc = sg.len * s.W / sg.n, vel = 190 * u * sg.spd / Math.max(1, spc) / 1000;   // 점/ms
          for (j = 0; j < sg.run; j++) {
            var span = sg.closed ? sg.n : sg.n + 2, pos = (clk * vel + j * span / sg.run + sg.off * 0.37) % span;
            if (!sg.closed) pos -= 1;
            var j0 = Math.floor(pos), fr = pos - j0;
            for (var e = 0; e < 2; e++) {
              var jj = j0 + e, wt = ss(e ? fr : 1 - fr);
              if (sg.closed) jj = ((jj % sg.n) + sg.n) % sg.n; else if (jj < 0 || jj >= sg.n) continue;
              if (wt < 0.03) continue;
              ctx.fillStyle = P.c(0.5, A1(he * wt)); ctx.beginPath(); ctx.arc(pic.tx[sg.off + jj], pic.ty[sg.off + jj], r * (1.5 + 1.3 * wt), 0, TAU); ctx.fill();
            }
          }
        }
      }

      /* 5) 점. 농도 구간별로 모아 한 번에 칠한다. 날아가는 동안에도 꼬리나 번짐 없이 둥근 점 그대로다 */
      var NBIN = 6, X = s.X, Y = s.Y, AL = s.AL, BIN = s.BIN, MOV = s.MOV, aPool = 0.55, rP = s.rPool;
      for (i = 0; i < N; i++) {
        var a = aPool + (1 - aPool) * AL[i];
        if (MOV[i]) { var dq = qdOf(Q, X[i], Y[i]); if (dq < 1.02) a *= ss((dq - 0.84) / 0.18); }   // 제목 자리에 들어서면 지운다
        BIN[i] = a < 0.03 ? 255 : Math.min(NBIN - 1, Math.floor(a * NBIN));
      }
      var dotA = P.dark ? 0.9 : 0.95;
      for (b = 0; b < NBIN; b++) {
        var any = false;
        ctx.beginPath();
        for (i = 0; i < N; i++) {
          if (BIN[i] !== b) continue;
          var rr = rP + (r - rP) * AL[i];
          ctx.moveTo(X[i] + rr, Y[i]); ctx.arc(X[i], Y[i], rr, 0, TAU); any = true;
        }
        if (any) { ctx.fillStyle = P.ink(A1(dotA * (b + 0.85) / NBIN)); ctx.fill(); }
      }
    }
  });
})();
