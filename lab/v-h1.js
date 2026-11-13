/* H1. 별자리 v2.
   자리를 지키는 점(기관)들 가운데 몇몇이 선으로 이어져 작은 도형(코옵) 6~8개를 이루고, 문구가 놓이는 타원 둘레에 흩어진다.
   도형은 한 선씩 같은 빠르기로 그어진다. 다 그어지면 잠깐 머문 뒤 이웃 도형으로 가는 점선 하나가 건너가고, 그다음 평소 농도로 돌아간다.
   건너간 점선은 몇 초 남았다가 사라진다. 늘 남겨 두면 도형들이 한 줄로 이어져 문구를 두른 테두리처럼 읽힌다.
   이전 판(v-d4)에서 지적된 것을 뺐다: 무리마다 다른 색, 점마다 흔들리는 움직임, 빛나는 꼬리, 번지는 후광.
   색은 잉크(무채색)와 강조색 하나(P.c(0.5))만 쓴다. 강조색은 지금 그어지는 선과 막 완성된 도형에만 묻는다.
   모든 움직임은 시계(clock) 하나의 함수라서 첫 장면부터 완성된 그림이다. */
(function () {
  var TAU = Math.PI * 2;
  /* 시간 상수(ms). 속도 조절 막대가 t 자체를 늘리고 줄이므로 여기 값은 100% 기준이다 */
  var DIM = 450;      // 다시 긋기 전에 옛 선이 옅어지는 시간
  var SEG_MS = 740;   // 보통 길이 선 하나를 긋는 시간
  var DWELL = 80;     // 점에 닿은 뒤 다음 선을 시작하기까지
  var JUMP = 150;     // 가지를 다 긋고 갈림점으로 돌아갈 때
  var HOLD = 450;     // 완성 뒤 머무는 시간
  var LHOLD = 850;    // 점선이 이웃에 닿은 뒤 머무는 시간
  var RELAX = 2400;   // 강조색이 잉크로 돌아가는 시간
  var PING = 820;     // 점에 닿을 때 퍼지는 고리
  var POP = 380;      // 점에 닿을 때 점이 살짝 커졌다 돌아오는 시간
  var GHOST = 0.42;   // 다시 긋는 동안 옛 선의 농도 비율
  var STAGGER = 3100; // 도형 사이 시작 간격
  var LFADE = 7000;   // 이웃으로 건너간 점선이 다 사라지기까지
  var SEED_C = 20261, SEED_L = 4127;

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sstep(a, b, x) { var k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  function eio(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eOut(x) { return 1 - Math.pow(1 - x, 3); }
  function rgbOf(str) { var m = String(str).match(/[\d.]+/g) || [128, 128, 128]; return [+m[0], +m[1], +m[2]]; }
  function r3(a) { return Math.round(clamp(a, 0, 1) * 1000) / 1000; }
  /* 점 (px,py)에서 선분 AB까지 거리의 제곱 */
  function segD2(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, k = l2 > 0 ? clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1) : 0;
    var qx = ax + vx * k - px, qy = ay + vy * k - py; return qx * qx + qy * qy;
  }
  function ori(px, py, qx, qy, rx, ry) { return (qx - px) * (ry - py) - (qy - py) * (rx - px); }
  function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
    var d1 = ori(ax, ay, bx, by, cx, cy), d2 = ori(ax, ay, bx, by, dx, dy), d3 = ori(cx, cy, dx, dy, ax, ay), d4 = ori(cx, cy, dx, dy, bx, by);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }

  LAB.register({
    id: 'h1-constellation', name: '별자리 v2', short: '별자리', en: 'Constellation',
    hero: true, designed: true, textDefault: true, defaultPal: 'dawn', heroPal: { light: 'dawn', dark: 'indigo' },
    idea: '점은 기관이고, 선으로 이어진 작은 도형 하나가 코옵이다. 도형은 한 선씩 차례로 그어지고, 다 그어지면 이웃 도형으로 점선 하나가 건너간다.',

    init: function (w, h, P) {
      var left = P.layout === 'left', dark = !!P.dark;
      var S = Math.sqrt(Math.max(1, w * h)), u = clamp(w / 900, 0.75, 1.6);
      var Q = P.quiet || { x: 0.5, y: 0.5, rx: 0.31, ry: 0.26 };
      var qx = Q.x * w, qy = Q.y * h, qrx = Math.max(1, Q.rx * w), qry = Math.max(1, Q.ry * h);
      /* 조용한 타원 기준 거리. 1이면 타원 경계, 그보다 작으면 문구 자리 안쪽 */
      function rho(x, y) { var ex = (x - qx) / qrx, ey = (y - qy) / qry; return Math.sqrt(ex * ex + ey * ey); }
      /* 왼쪽 큰 문구 배치에서는 왼쪽을 옅게 눌러 무게를 오른쪽에 둔다 */
      function wl(x) { return left ? 0.3 + 0.7 * sstep(0.40 * w, 0.62 * w, x) : 1; }

      var ink = rgbOf(P.ink(1)), acc = rgbOf(P.c(0.5, 1));
      /* 어두운 배경에서는 강조색이 잉크보다 어두워서 긋는 선이 평소 선보다 덜 보인다. 색상은 그대로 두고 잉크 쪽으로 조금만 밝힌다 */
      if (dark) for (var ci = 0; ci < 3; ci++) acc[ci] = Math.round(acc[ci] + (ink[ci] - acc[ci]) * 0.28);
      /* 세로로 긴 화면(휴대폰)에서는 문구가 조용한 타원보다 넓게 깔린다. 문구가 놓이는 높이 띠 안의 선과 점을 옅게 눌러 글 뒤로 물린다 */
      var nar = 1 - sstep(0.75, 1.15, w / h);
      function pb(y) { return nar > 0 ? 1 - nar * 0.7 * (1 - sstep(0.95, 1.2, Math.abs(y - qy) / qry)) : 1; }
      function inkS(a) { return 'rgba(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ',' + r3(a) + ')'; }
      function accS(a) { return 'rgba(' + acc[0] + ',' + acc[1] + ',' + acc[2] + ',' + r3(a) + ')'; }
      /* 밝은 배경에서는 가는 선이 묻히므로 선 농도를 1.5배쯤 올린다. 어두운 배경은 따로 맞춘 값이다 */
      var aR = dark ? 0.30 : 0.44, aL = dark ? 0.26 : 0.3, aA = dark ? 1 : 0.95;
      /* 배경 점은 도형의 점보다 한 단계 옅게 둔다. 같은 농도면 어느 점이 코옵에 든 기관인지 구분이 안 되고, 어두운 배경에서는 별 뿌린 밤하늘처럼 읽힌다 */
      var aStar = dark ? 0.94 : 0.9, aRing = dark ? 0.42 : 0.5, tierA = dark ? [0.28, 0.44, 0.66] : [0.32, 0.5, 0.72];
      var lw0 = Math.max(0.8, 0.62 * u), lw1 = lw0 * 1.45;
      /* 다시 긋는 동안 남는 옛 선. 어두운 배경에서는 같은 비율이면 거의 안 보여 도형이 지워진 것처럼 보이므로 조금 더 남긴다 */
      var gh = dark ? 0.56 : GHOST;

      var st = {
        F: [], B: [], TW: [], RG: null, T: 26000, clock: 0, lastT: null, u: u, gh: gh,
        ink: ink, acc: acc, inkS: inkS, accS: accS, aR: aR, aL: aL, aA: aA, lw0: lw0, lw1: lw1,
        lwL: Math.max(0.75, 0.55 * u), lwR: Math.max(0.7, 0.5 * u), dash: [3.2 * u, 3.8 * u], dA: 5 * u, ringS: inkS(aRing * 0.7)
      };
      if (w < 60 || h < 60) return st;

      var seed = left ? SEED_L : SEED_C, R = rng(seed);
      var seg0 = 0.062 * S, gap = 0.036 * S, RIN = 1.12;
      var mx = 0.045 * w, mt = Math.max(0.105 * h, Math.min(78, 0.125 * h)), mb = 0.06 * h, xMin = left ? 0.47 * w : mx;
      /* 도형이 놓일 수 있는 자리: 문구 타원 밖, 머리줄(헤더) 아래, 가장자리 안쪽 */
      function inA(x, y) { return x >= xMin && x <= w - mx && y >= mt && y <= h - mb && rho(x, y) >= RIN; }

      /* 1) 놓일 자리를 격자 표본으로 뽑고, 고르게 퍼진 중심 6~8개를 잡는다(가장 먼 점부터 고른 뒤 무게중심으로 다듬기) */
      var asp = w / h, nx = Math.round(clamp(44 * Math.sqrt(asp), 10, 90)), ny = Math.round(clamp(44 / Math.sqrt(asp), 10, 90));
      var SX = [], SY = [], gx, gy, i, j, k, x, y, d;
      for (gy = 0; gy < ny; gy++) for (gx = 0; gx < nx; gx++) { x = (gx + 0.5) / nx * w; y = (gy + 0.5) / ny * h; if (inA(x, y)) { SX.push(x); SY.push(y); } }
      var NS = SX.length, NF = NS < 24 ? 0 : clamp(Math.round(NS / (nx * ny) / 0.054), 6, 8);
      var sites = [], own = new Int16Array(NS);
      if (NF) {
        var md = new Float32Array(NS); for (k = 0; k < NS; k++) md[k] = 1e18;
        var fi0 = Math.floor(R() * NS); sites.push({ x: SX[fi0], y: SY[fi0] });
        while (sites.length < NF) {
          var ls = sites[sites.length - 1], bi = 0, bd = -1;
          for (k = 0; k < NS; k++) { d = (SX[k] - ls.x) * (SX[k] - ls.x) + (SY[k] - ls.y) * (SY[k] - ls.y); if (d < md[k]) md[k] = d; if (md[k] > bd) { bd = md[k]; bi = k; } }
          sites.push({ x: SX[bi], y: SY[bi] });
        }
        for (var it = 0; it < 20; it++) {
          var sx = [], sy = [], sn = [];
          for (i = 0; i < NF; i++) { sx.push(0); sy.push(0); sn.push(0); }
          for (k = 0; k < NS; k++) {
            var bj = 0, bdd = 1e18;
            for (i = 0; i < NF; i++) { d = (SX[k] - sites[i].x) * (SX[k] - sites[i].x) + (SY[k] - sites[i].y) * (SY[k] - sites[i].y); if (d < bdd) { bdd = d; bj = i; } }
            own[k] = bj; sx[bj] += SX[k]; sy[bj] += SY[k]; sn[bj]++;
          }
          if (it === 19) break;
          for (i = 0; i < NF; i++) if (sn[i]) { sites[i].x = sx[i] / sn[i]; sites[i].y = sy[i] / sn[i]; }
        }
      }
      /* 점이 i번 도형의 구역 안에 있고, 이웃 구역과 gap만큼 떨어져 있는가 */
      function okPt(px, py, fi) {
        if (!inA(px, py)) return false;
        var s0 = sites[fi], di = (px - s0.x) * (px - s0.x) + (py - s0.y) * (py - s0.y);
        for (var q = 0; q < sites.length; q++) {
          if (q === fi) continue;
          var o = sites[q], dj = (px - o.x) * (px - o.x) + (py - o.y) * (py - o.y), D = Math.sqrt((o.x - s0.x) * (o.x - s0.x) + (o.y - s0.y) * (o.y - s0.y)) || 1;
          if ((dj - di) / (2 * D) < gap) return false;
        }
        return true;
      }

      /* 2) 구역마다 긴 축을 구하고(주성분), 그 축을 따라 쓸 수 있는 폭을 미리 재 둔다. 띠 모양 구역이 문구를 감싸며 휘면 도형도 따라 휜다 */
      function frame(fi) {
        var n = 0, cx = 0, cy = 0, q;
        for (q = 0; q < NS; q++) if (own[q] === fi) { n++; cx += SX[q]; cy += SY[q]; }
        if (n < 6) return null;
        cx /= n; cy /= n;
        var cxx = 0, cyy = 0, cxy = 0;
        for (q = 0; q < NS; q++) if (own[q] === fi) { var ddx = SX[q] - cx, ddy = SY[q] - cy; cxx += ddx * ddx; cyy += ddy * ddy; cxy += ddx * ddy; }
        cxx /= n; cyy /= n; cxy /= n;
        var ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy), e1x = Math.cos(ang), e1y = Math.sin(ang), e2x = -e1y, e2y = e1x;
        var l1 = cxx * e1x * e1x + 2 * cxy * e1x * e1y + cyy * e1y * e1y, l2 = cxx * e2x * e2x + 2 * cxy * e2x * e2y + cyy * e2y * e2y;
        var Am = 2.3 * Math.sqrt(Math.max(l1, 1)) + 0.4 * seg0, Bm = 2.3 * Math.sqrt(Math.max(l2, 1)) + 0.4 * seg0, NA = 24, NB = 28;
        var lo = [], hi = [], ia, ib;
        for (ia = 0; ia <= NA; ia++) {
          var a = -Am + 2 * Am * ia / NA, rs = -1, bl = NaN, bh = NaN, blen = 0;
          for (ib = 0; ib <= NB + 1; ib++) {
            var b = -Bm + 2 * Bm * ib / NB, ok = ib <= NB && okPt(cx + a * e1x + b * e2x, cy + a * e1y + b * e2y, fi);
            if (ok && rs < 0) rs = ib;
            if (!ok && rs >= 0) { if (ib - rs > blen) { blen = ib - rs; bl = -Bm + 2 * Bm * rs / NB; bh = -Bm + 2 * Bm * (ib - 1) / NB; } rs = -1; }
          }
          lo.push(bl); hi.push(bh);
        }
        var r0 = -1, A0 = 0, A1 = 0;
        for (ia = 0; ia <= NA + 1; ia++) {
          var v = ia <= NA && lo[ia] === lo[ia];
          if (v && r0 < 0) r0 = ia;
          if (!v && r0 >= 0) { if (ia - 1 - r0 > A1 - A0) { A0 = r0; A1 = ia - 1; } r0 = -1; }
        }
        if (A1 - A0 < 2) return null;
        /* 구역의 대표 폭으로 선 길이와 도형 길이를 정한다. 좁은 띠에서는 작은 도형, 넓은 모서리에서는 큰 도형이 된다.
           길이는 폭의 두 배쯤에서 끊어 긴 사슬이 문구를 올가미처럼 두르지 않게 한다 */
        var wv = []; for (ia = A0; ia <= A1; ia++) wv.push(hi[ia] - lo[ia]);
        wv.sort(function (p1, p2) { return p1 - p2; });
        var Wm = wv[Math.floor(wv.length * 0.6)], fa0 = -Am + 2 * Am * A0 / NA, fa1 = -Am + 2 * Am * A1 / NA;
        var fseg = clamp(0.5 * Wm, 0.62 * seg0, 1.2 * seg0);
        return {
          i: fi, n: n, cx: cx, cy: cy, e1x: e1x, e1y: e1y, e2x: e2x, e2y: e2y, a0: fa0, a1: fa1, seg: fseg, span: Math.min(fa1 - fa0, Math.max(2.0 * Wm, 2.7 * fseg)),
          range: function (a) {
            var f = (a + Am) / (2 * Am) * NA, i0 = clamp(Math.floor(f), A0, A1), i1 = clamp(i0 + 1, A0, A1), kk = clamp(f - i0, 0, 1);
            return [lo[i0] + (lo[i1] - lo[i0]) * kk, hi[i0] + (hi[i1] - hi[i0]) * kk];
          }
        };
      }

      /* 3) 도형 후보 하나: 긴 축을 따라 완만하게 꺾이는 등뼈(점 3~6개)에 가지 한두 개를 단다. 성도의 별자리처럼 일부러 그은 모양이 되게 한다 */
      function candidate(fr, Rr, seg, tgt) {
        var pts = [], E = [], span = fr.span, q;
        if (span < seg * 1.2) return null;
        var ns = clamp(Math.round(span / seg) + 1 - (Rr() < 0.3 ? 1 : 0), 3, 5);
        /* 한 칸이 선 길이의 1.25배를 넘지 않게 해서 도형이 헐겁게 늘어지지 않게 한다 */
        var step = Math.min(span / (ns - 1), 1.25 * seg), bPrev = 0, dir = Rr() < 0.5 ? 1 : -1;
        var aS = fr.a0 + Rr() * Math.max(0, fr.a1 - fr.a0 - step * (ns - 1));
        for (q = 0; q < ns; q++) {
          var jt = q === 0 ? Rr() * 0.16 : (q === ns - 1 ? -Rr() * 0.16 : (Rr() - 0.5) * 0.46);
          var a = aS + (q + jt) * step, rg = fr.range(a), b, rw = rg[1] - rg[0];
          if (q === 0) b = rg[0] + (0.2 + 0.6 * Rr()) * rw;
          else {
            if (Rr() < 0.5) dir = -dir;
            b = bPrev + dir * (0.1 + 0.62 * Rr()) * step;
            if (b > rg[1]) { b = rg[1] - Rr() * 0.2 * Math.min(step, rw); dir = -1; }
            else if (b < rg[0]) { b = rg[0] + Rr() * 0.2 * Math.min(step, rw); dir = 1; }
          }
          bPrev = b;
          pts.push({ x: fr.cx + a * fr.e1x + b * fr.e2x, y: fr.cy + a * fr.e1y + b * fr.e2y });
        }
        if (Rr() < 0.5) pts.reverse();
        var bases = [], spurs = {};
        for (q = 1; q < ns - 1; q++) bases.push(q);
        for (q = bases.length - 1; q > 0; q--) { var z = Math.floor(Rr() * (q + 1)), tmp = bases[q]; bases[q] = bases[z]; bases[z] = tmp; }
        for (var bi2 = 0; bi2 < bases.length && bi2 < 2 && pts.length < tgt; bi2++) {
          var c = bases[bi2], p0 = pts[c - 1], pb = pts[c], p1 = pts[c + 1];
          var tx = p1.x - p0.x, ty = p1.y - p0.y, tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
          /* 가지는 등뼈가 꺾인 바깥쪽으로 낸다. 세 선이 고르게 벌어져 Y 모양이 된다 */
          var turn = (pb.x - p0.x) * (p1.y - pb.y) - (pb.y - p0.y) * (p1.x - pb.x), side = turn > 0 ? -1 : 1, placed = false;
          for (var tr = 0; tr < 2 && !placed; tr++) {
            var an = (Rr() - 0.5) * 0.7, cs = Math.cos(an), sn2 = Math.sin(an);
            var ux = -ty * side, uy = tx * side, vx = ux * cs - uy * sn2, vy = ux * sn2 + uy * cs;
            var L1 = seg * (0.72 + 0.42 * Rr()), qp = { x: pb.x + vx * L1, y: pb.y + vy * L1 };
            if (okPt(qp.x, qp.y, fr.i)) {
              var qi = pts.length; pts.push(qp); spurs[c] = [[c, qi]]; placed = true;
              if (pts.length < tgt && Rr() < 0.62) {
                var a2 = (0.35 + 0.6 * Rr()) * (Rr() < 0.5 ? 1 : -1), c2 = Math.cos(a2), s2 = Math.sin(a2), L2 = seg * (0.62 + 0.42 * Rr());
                var q2 = { x: qp.x + (vx * c2 - vy * s2) * L2, y: qp.y + (vx * s2 + vy * c2) * L2 };
                if (okPt(q2.x, q2.y, fr.i)) { pts.push(q2); spurs[c].push([qi, pts.length - 1]); }
              }
            }
            side = -side;
          }
        }
        /* 긋는 순서: 등뼈를 따라가다 갈림점을 만나면 가지부터 긋고 돌아와 이어 간다 */
        for (q = 0; q < ns - 1; q++) { if (spurs[q]) for (var z2 = 0; z2 < spurs[q].length; z2++) E.push(spurs[q][z2]); E.push([q, q + 1]); }
        return { pts: pts, E: E };
      }
      /* 후보 점수(작을수록 좋다). 겹침, 교차, 날카로운 꺾임은 탈락 */
      function score(c, seg, tgt, fi) {
        var p = c.pts, E = c.E, n = p.length, a, b, q;
        if (n < 5 || n > 9) return 1e9;
        for (a = 0; a < n; a++) if (!okPt(p[a].x, p[a].y, fi)) return 1e9;
        var mn = seg * 0.46; mn *= mn;
        for (a = 0; a < n; a++) for (b = a + 1; b < n; b++) if ((p[a].x - p[b].x) * (p[a].x - p[b].x) + (p[a].y - p[b].y) * (p[a].y - p[b].y) < mn) return 1e9;
        var sc = Math.abs(n - tgt) * 0.5, lmin = 1e9, lmax = 0, adj = [];
        for (a = 0; a < n; a++) adj.push([]);
        for (a = 0; a < E.length; a++) {
          var A = p[E[a][0]], B = p[E[a][1]], L = Math.sqrt((A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y));
          if (L < lmin) lmin = L; if (L > lmax) lmax = L;
          if (rho((A.x + B.x) / 2, (A.y + B.y) / 2) < RIN - 0.03) return 1e9;
          for (q = 0; q < n; q++) { if (q === E[a][0] || q === E[a][1]) continue; if (segD2(p[q].x, p[q].y, A.x, A.y, B.x, B.y) < seg * seg * 0.1) return 1e9; }
          for (b = a + 1; b < E.length; b++) {
            if (E[b][0] === E[a][0] || E[b][0] === E[a][1] || E[b][1] === E[a][0] || E[b][1] === E[a][1]) continue;
            var C = p[E[b][0]], Dd = p[E[b][1]];
            if (crosses(A.x, A.y, B.x, B.y, C.x, C.y, Dd.x, Dd.y)) return 1e9;
          }
          adj[E[a][0]].push(Math.atan2(B.y - A.y, B.x - A.x)); adj[E[a][1]].push(Math.atan2(A.y - B.y, A.x - B.x));
        }
        if (lmax / lmin > 3) return 1e9;
        sc += Math.max(0, lmax / lmin - 2) * 0.6;
        for (a = 0; a < n; a++) for (b = 0; b < adj[a].length; b++) for (q = b + 1; q < adj[a].length; q++) {
          var da = Math.abs(adj[a][b] - adj[a][q]); if (da > Math.PI) da = TAU - da;
          if (da < 0.87) return 1e9;
          if (da < 1.35) sc += (1.35 - da) * 1.5;
          if (da > 2.97) sc += 0.3;
        }
        return sc;
      }

      var TG = [7, 8, 6, 7, 9, 6, 8, 5], v = seg0 / SEG_MS, F = [];
      for (i = 0; i < NF; i++) {
        var fr = frame(i); if (!fr) continue;
        var Rf = rng(seed + 101 * (i + 1)), tgt = TG[(i + Math.floor(R() * 8)) % 8];
        var segF = fr.seg * (0.94 + 0.12 * Rf());
        var best = null, bs = 1e9;
        for (var shrink = 0; shrink < 3 && !best; shrink++) {
          for (var tryN = 0; tryN < 90; tryN++) { var cd = candidate(fr, Rf, segF, tgt); if (!cd) continue; var scv = score(cd, segF, tgt, i); if (scv < bs) { bs = scv; best = cd; } }
          segF *= 0.84;
        }
        if (!best) continue;
        /* 점과 선을 그리기 좋은 꼴로 옮기고, 선마다 시작 시각을 매긴다 */
        var deg = [], Pp = [], Ee = [], cxs = 0, cys = 0;
        for (j = 0; j < best.pts.length; j++) deg.push(0);
        for (j = 0; j < best.E.length; j++) { deg[best.E[j][0]]++; deg[best.E[j][1]]++; }
        /* 고리 달린 점(앵커 기관)은 갈림점이 아닌 곳에 둔다. 갈림점에 두면 중심 서버처럼 읽힌다 */
        var anc = -1; if (Rf() < 0.62) { for (var tq = 0; tq < 12 && anc < 0; tq++) { var cq = Math.floor(Rf() * best.pts.length); if (deg[cq] <= 2) anc = cq; } }
        for (j = 0; j < best.pts.length; j++) {
          var bp = best.pts[j], pv = pb(bp.y), m = (0.62 + 0.38 * sstep(1.12, 1.6, rho(bp.x, bp.y))) * wl(bp.x) * pv, isA = j === anc;
          Pp.push({ x: bp.x, y: bp.y, r: u * (isA ? 1.75 : 1.2 + 0.55 * Rf()), m: m, pv: pv, pk: (0.5 + 0.5 * m) * pv, anc: isA, lk: false, tc: 0, style: inkS(aStar * (0.5 + 0.5 * m) * (0.5 + 0.5 * pv)), ring: inkS(aRing * m) });
          cxs += bp.x; cys += bp.y;
        }
        var tcur = 0, lastN = best.E[0][0];
        for (j = 0; j < best.E.length; j++) {
          var ea = best.E[j][0], eb = best.E[j][1], pa = Pp[ea], pb2 = Pp[eb], len = Math.sqrt((pa.x - pb2.x) * (pa.x - pb2.x) + (pa.y - pb2.y) * (pa.y - pb2.y)), em = Math.min(pa.m, pb2.m);
          if (j > 0) tcur += ea !== lastN ? JUMP : DWELL;
          var ea2 = aA * (0.55 + 0.45 * em) * Math.min(pa.pv, pb2.pv);
          Ee.push({ a: ea, b: eb, ts: tcur, td: len / v, m: em, rest: inkS(aR * em), ghost: inkS(aR * em * gh), acc: accS(ea2), aAcc: ea2 });
          tcur += len / v; pb2.tc = tcur; lastN = eb;
        }
        F.push({ P: Pp, E: Ee, drawDur: tcur, link: null, cx: cxs / Pp.length, cy: cys / Pp.length, off: 0, indeg: 0, tau: 0, ph: 0, g: 1, k: 0, t1: 0, t3: 0, t4: 0, t5: 0, t6: 0, linkDur: 0 });
      }
      var N = F.length;

      /* 4) 긋는 차례: 방금 그은 도형에서 먼 도형으로 건너뛴다. 문구 둘레를 시곗바늘처럼 도는 인상을 피한다 */
      var T = Math.max(25000, N * STAGGER), order = [], used = [];
      if (N) {
        order.push(Math.floor(R() * N)); used[order[0]] = 1;
        while (order.length < N) {
          var bo = -1, bv = -1;
          for (i = 0; i < N; i++) {
            if (used[i]) continue;
            var mnD = 1e18;
            for (k = Math.max(0, order.length - 2); k < order.length; k++) { var of = F[order[k]]; d = (F[i].cx - of.cx) * (F[i].cx - of.cx) + (F[i].cy - of.cy) * (F[i].cy - of.cy); if (d < mnD) mnD = d; }
            if (mnD > bv) { bv = mnD; bo = i; }
          }
          used[bo] = 1; order.push(bo);
        }
        for (k = 0; k < N; k++) F[order[k]].off = (k + (R() - 0.5) * 0.24) * (T / N);
      }

      /* 5) 이웃 도형으로 가는 점선(코옵끼리의 협력). 문구 타원을 가로지르지 않고 다른 선과 겹치지 않는 가장 가까운 짝을 고른다.
            한 도형이 받는 점선은 둘까지로 막아 어느 도형도 허브처럼 보이지 않게 한다 */
      var pair = {};
      function linkOk(A, B, fa, fb) {
        var q, z;
        for (q = 1; q < 6; q++) if (rho(A.x + (B.x - A.x) * q / 6, A.y + (B.y - A.y) * q / 6) < 1.05) return false;
        for (q = 0; q < N; q++) {
          var f = F[q];
          for (z = 0; z < f.P.length; z++) { var sp = f.P[z]; if (sp === A || sp === B) continue; if (segD2(sp.x, sp.y, A.x, A.y, B.x, B.y) < seg0 * seg0 * 0.12) return false; }
          for (z = 0; z < f.E.length; z++) {
            var e1 = f.P[f.E[z].a], e2 = f.P[f.E[z].b];
            if (e1 === A || e1 === B || e2 === A || e2 === B) continue;
            if (crosses(A.x, A.y, B.x, B.y, e1.x, e1.y, e2.x, e2.y)) return false;
          }
          if (f.link && q !== fa) { var la = f.P[f.link.a], lb = F[f.link.j].P[f.link.b]; if (la !== A && la !== B && lb !== A && lb !== B && crosses(A.x, A.y, B.x, B.y, la.x, la.y, lb.x, lb.y)) return false; }
        }
        return true;
      }
      for (var pass = 0; pass < 2; pass++) for (k = 0; k < N; k++) {
        var fa = order[k], f1 = F[fa]; if (f1.link) continue;
        var bl2 = null, bld = 1e18;
        for (j = 0; j < N; j++) {
          if (j === fa || pair[fa + '_' + j] || F[j].indeg > pass) continue;
          var f2 = F[j], ba = -1, bb = -1, bdm = 1e18;
          for (var a1 = 0; a1 < f1.P.length; a1++) for (var b1 = 0; b1 < f2.P.length; b1++) {
            if (f1.P[a1].lk || f2.P[b1].lk) continue; /* 점선의 끝 점은 한 번씩만 쓴다. 한 점에 점선이 몰리면 그 점이 허브처럼 보인다 */
            d = (f1.P[a1].x - f2.P[b1].x) * (f1.P[a1].x - f2.P[b1].x) + (f1.P[a1].y - f2.P[b1].y) * (f1.P[a1].y - f2.P[b1].y);
            if (d < bdm) { bdm = d; ba = a1; bb = b1; }
          }
          /* 너무 먼 도형끼리는 잇지 않는다. 긴 점선은 이웃 사이의 협력이 아니라 문구를 두른 테두리 조각처럼 읽힌다 */
          if (ba < 0 || bdm > 0.055 * S * S || bdm >= bld) continue;
          if (!linkOk(f1.P[ba], f2.P[bb], fa, j)) continue;
          bld = bdm; bl2 = { j: j, a: ba, b: bb, len: Math.sqrt(bdm) };
        }
        if (bl2) {
          var lm = Math.min(f1.P[bl2.a].m, F[bl2.j].P[bl2.b].m), la2 = 0.9 * (0.55 + 0.45 * lm) * Math.min(f1.P[bl2.a].pv, F[bl2.j].P[bl2.b].pv);
          bl2.m = lm; bl2.rest = inkS(aL * lm); bl2.acc = accS(la2); bl2.aAcc = la2;
          f1.link = bl2; F[bl2.j].indeg++; pair[fa + '_' + bl2.j] = pair[bl2.j + '_' + fa] = 1; f1.P[bl2.a].lk = F[bl2.j].P[bl2.b].lk = true;
        }
      }
      for (i = 0; i < N; i++) {
        var ff = F[i]; ff.linkDur = ff.link ? ff.link.len / (v * 1.25) : 0;
        ff.t1 = DIM; ff.t3 = DIM + ff.drawDur + HOLD; ff.t4 = ff.t3 + ff.linkDur; ff.t5 = ff.t4 + (ff.link ? LHOLD : 350); ff.t6 = ff.t5 + RELAX;
      }

      /* 6) 배경 점: 아직 코옵에 들지 않은 기관. 자리는 고정이고 크기와 농도 세 단계로 깊이를 낸다. 문구 타원에 가까울수록 드물고 옅다 */
      /* 점 개수는 화면 크기를 따른다. 실험실 카드나 휴대폰에 큰 화면과 같은 수를 넣으면 빽빽해진다 */
      var Rs = rng(seed + 9001), FS = [], minD = 0.034 * S, tries = 0, want = Math.round(clamp(S / 9.5, 70, 150));
      while (FS.length < want && tries++ < 6000) {
        x = Rs() * w; y = Rs() * h; var trr = Rs(), keep = Rs(), r0f = rho(x, y);
        if (r0f < 1.04) continue;
        if (keep > sstep(1.0, 1.5, r0f) * (left ? 0.4 + 0.6 * sstep(0.3 * w, 0.6 * w, x) : 1)) continue;
        var tier = trr < 0.5 ? 0 : trr < 0.84 ? 1 : 2, mdd = minD * (tier === 0 ? 0.62 : 1), bad = false;
        for (k = 0; k < FS.length && !bad; k++) { var md2 = Math.min(mdd, FS[k].tier === 0 ? minD * 0.62 : minD); if ((FS[k].x - x) * (FS[k].x - x) + (FS[k].y - y) * (FS[k].y - y) < md2 * md2) bad = true; }
        for (i = 0; i < N && !bad; i++) {
          var fg = F[i], sd = seg0 * (tier === 2 ? 0.6 : 0.42);
          for (j = 0; j < fg.P.length && !bad; j++) if ((fg.P[j].x - x) * (fg.P[j].x - x) + (fg.P[j].y - y) * (fg.P[j].y - y) < sd * sd) bad = true;
          for (j = 0; j < fg.E.length && !bad; j++) if (segD2(x, y, fg.P[fg.E[j].a].x, fg.P[fg.E[j].a].y, fg.P[fg.E[j].b].x, fg.P[fg.E[j].b].y) < seg0 * seg0 * 0.05) bad = true;
          if (!bad && fg.link) { var l1p = fg.P[fg.link.a], l2p = F[fg.link.j].P[fg.link.b]; if (segD2(x, y, l1p.x, l1p.y, l2p.x, l2p.y) < seg0 * seg0 * 0.03) bad = true; }
        }
        if (bad) continue;
        FS.push({ x: x, y: y, tier: tier, a: tierA[tier] * (0.3 + 0.7 * sstep(1.0, 1.6, r0f)) * wl(x) * pb(y), tw: Rs() < 0.1, ring: tier === 2 && Rs() < 0.2 && y > 0.12 * h && y < 0.95 * h, ph: Rs() * TAU, per: 4200 + Rs() * 3400 });
      }
      /* 같은 단계, 같은 농도끼리 묶어 한 번에 칠한다 */
      var rad = [Math.max(0.6, 0.68 * u), Math.max(0.75, 0.92 * u), Math.max(0.95, 1.22 * u)], par = [0.4, 0.7, 1], bmap = {}, rings = [];
      for (k = 0; k < FS.length; k++) {
        var s0 = FS[k], qa = Math.max(0.05, Math.round(s0.a * 20) / 20);
        if (s0.ring) rings.push(s0.x, s0.y, rad[2] + 2.9 * u);
        if (s0.tw) { st.TW.push({ x: s0.x, y: s0.y, r: rad[s0.tier], a: s0.a, par: par[s0.tier], w: TAU / s0.per, ph: s0.ph }); continue; }
        var key = s0.tier + '|' + qa;
        if (!bmap[key]) { bmap[key] = { style: inkS(qa), par: par[s0.tier], d: [] }; st.B.push(bmap[key]); }
        bmap[key].d.push(s0.x, s0.y, rad[s0.tier]);
      }
      st.RG = rings; st.F = F; st.T = T; st.clock = T;
      return st;
    },

    draw: function (ctx, w, h, t, P, s) {
      var dt = s.lastT == null ? 0 : clamp(t - s.lastT, 0, 50); s.lastT = t; s.clock += dt;
      var clk = s.clock, u = s.u, T = s.T, F = s.F, N = F.length, i, j, f, e, A, B, x, y, pr, kk, age;
      /* 판 전체가 아주 천천히 미끄러진다(최대 초당 0.6px쯤). 점 하나하나는 제자리다. 먼 단계일수록 덜 움직여 깊이가 생긴다 */
      var dx = s.dA * Math.sin(clk * TAU / 83000 + 0.6), dy = s.dA * 0.7 * Math.sin(clk * TAU / 61000 + 2.1), GH = s.gh;

      /* 배경 점 */
      for (i = 0; i < s.B.length; i++) {
        var b = s.B[i], D = b.d, ox = dx * b.par, oy = dy * b.par;
        ctx.fillStyle = b.style; ctx.beginPath();
        for (j = 0; j < D.length; j += 3) { x = D[j] + ox; y = D[j + 1] + oy; ctx.moveTo(x + D[j + 2], y); ctx.arc(x, y, D[j + 2], 0, TAU); }
        ctx.fill();
      }
      /* 깜빡임은 배경 점 열에 하나꼴로만, 농도만 잠깐 올라간다 */
      for (i = 0; i < s.TW.length; i++) {
        var q = s.TW[i], bump = Math.sin(clk * q.w + q.ph); bump = bump > 0 ? Math.pow(bump, 6) : 0;
        ctx.fillStyle = s.inkS(q.a * (1 + 0.9 * bump)); ctx.beginPath(); ctx.arc(q.x + dx * q.par, q.y + dy * q.par, q.r, 0, TAU); ctx.fill();
      }
      if (s.RG && s.RG.length) {
        ctx.strokeStyle = s.ringS; ctx.lineWidth = s.lwR; ctx.beginPath();
        for (j = 0; j < s.RG.length; j += 3) { x = s.RG[j] + dx; y = s.RG[j + 1] + dy; ctx.moveTo(x + s.RG[j + 2], y); ctx.arc(x, y, s.RG[j + 2], 0, TAU); }
        ctx.stroke();
      }

      /* 도형마다 지금 단계: 0 평소, 1 옛 선이 옅어짐, 2 긋는 중부터 점선이 닿아 머무는 때까지, 3 잉크로 돌아감 */
      for (i = 0; i < N; i++) {
        f = F[i]; var tau = (clk - f.off) % T; if (tau < 0) tau += T; f.tau = tau;
        if (tau < f.t1) { f.ph = 1; f.g = 1 + (GH - 1) * eio(tau / f.t1); f.k = 0; }
        else if (tau < f.t5) { f.ph = 2; f.g = GH; f.k = 1; }
        else if (tau < f.t6) { f.ph = 3; f.g = 1; f.k = 1 - eio((tau - f.t5) / RELAX); }
        else { f.ph = 0; f.g = 1; f.k = 0; }
      }

      /* 도형의 선 */
      var lw0 = s.lw0, lw1 = s.lw1, aR = s.aR;
      ctx.lineCap = 'round';
      for (i = 0; i < N; i++) {
        f = F[i];
        for (j = 0; j < f.E.length; j++) {
          e = f.E[j]; A = f.P[e.a]; B = f.P[e.b];
          var ax = A.x + dx, ay = A.y + dy, bx = B.x + dx, by = B.y + dy;
          if (f.ph === 2) {
            pr = (f.tau - f.t1 - e.ts) / e.td;
            if (pr < 1) { ctx.strokeStyle = e.ghost; ctx.lineWidth = lw0; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
            if (pr > 0) { if (pr > 1) pr = 1; ctx.strokeStyle = e.acc; ctx.lineWidth = lw1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * pr, ay + (by - ay) * pr); ctx.stroke(); }
            continue;
          }
          if (f.ph === 1) ctx.strokeStyle = s.inkS(aR * e.m * f.g); else ctx.strokeStyle = e.rest;
          ctx.lineWidth = lw0; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          /* 잉크로 돌아갈 때는 두 색을 섞지 않고, 평소 선 위에 얹힌 강조색 선이 옅어지게 한다. 섞으면 중간에 두 색보다 어둡고 탁한 색이 나온다 */
          if (f.ph === 3 && f.k > 0.01) { kk = f.k; ctx.strokeStyle = s.accS(e.aAcc * kk); ctx.lineWidth = lw0 + (lw1 - lw0) * kk; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
        }
      }

      /* 이웃 도형으로 가는 점선 */
      ctx.lineCap = 'butt'; ctx.setLineDash(s.dash); ctx.lineWidth = s.lwL;
      for (i = 0; i < N; i++) {
        f = F[i]; var L = f.link; if (!L) continue;
        A = f.P[L.a]; B = F[L.j].P[L.b];
        var lx = A.x + dx, ly = A.y + dy, mx2 = B.x + dx, my2 = B.y + dy;
        if (f.ph === 2) {
          pr = (f.tau - f.t3) / f.linkDur; if (pr <= 0) continue; if (pr > 1) pr = 1;
          ctx.strokeStyle = L.acc; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + (mx2 - lx) * pr, ly + (my2 - ly) * pr); ctx.stroke();
          continue;
        }
        if (f.ph === 3) {
          /* 점선도 같은 방식: 잉크 점선 위에서 강조색이 옅어진다 */
          ctx.strokeStyle = L.rest; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(mx2, my2); ctx.stroke();
          if (f.k < 0.01) continue;
          ctx.strokeStyle = s.accS(L.aAcc * f.k);
        } else {
          /* 평소에는 잉크 점선으로 남아 있다가 천천히 사라진다. 늘 닫힌 고리가 문구를 두르지 않게 하려는 것이다 */
          var el = f.tau - f.t6; if (el < 0) el += T;
          var lf = 1 - sstep(0.25 * LFADE, LFADE, el); if (lf < 0.02) continue;
          ctx.strokeStyle = s.inkS(s.aL * L.m * lf);
        }
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(mx2, my2); ctx.stroke();
      }
      ctx.setLineDash([]);

      /* 도형의 점. 선이 닿는 순간 살짝 커졌다 돌아오고, 1px 고리 하나가 10px쯤 퍼지며 사라진다 */
      for (i = 0; i < N; i++) {
        f = F[i]; var act = f.ph === 2;
        for (j = 0; j < f.P.length; j++) {
          var p = f.P[j], rr = p.r; x = p.x + dx; y = p.y + dy; age = act ? f.tau - f.t1 - p.tc : -1;
          if (age >= 0 && age < POP) rr *= 1 + 0.45 * (1 - age / POP);
          ctx.fillStyle = p.style; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
          if (p.anc) { ctx.strokeStyle = p.ring; ctx.lineWidth = s.lwR; ctx.beginPath(); ctx.arc(x, y, p.r + 3.1 * u, 0, TAU); ctx.stroke(); }
          if (age >= 0 && age < PING) {
            kk = age / PING; ctx.strokeStyle = s.accS(0.95 * Math.pow(1 - kk, 1.15) * p.pk); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(x, y, p.r + 2 * u + (2 + 6.5 * u) * eOut(kk), 0, TAU); ctx.stroke();
          }
        }
        if (act && f.link) {
          age = f.tau - f.t4;
          if (age >= 0 && age < PING) {
            var tp = F[f.link.j].P[f.link.b]; kk = age / PING;
            ctx.strokeStyle = s.accS(0.95 * Math.pow(1 - kk, 1.15) * tp.pk); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(tp.x + dx, tp.y + dy, tp.r + 2 * u + (2 + 6.5 * u) * eOut(kk), 0, TAU); ctx.stroke();
          }
        }
      }
    }
  });
})();
