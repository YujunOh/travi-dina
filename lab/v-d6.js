/* D6. 흐름선: 양옆 기관에서 나온 가는 곡선 다발이 가운데 공동 모델(허리의 작은 코어)로 모였다가 다시 퍼진다.
   들어가는 빛(기여)은 팔레트 앞쪽 색, 나오는 빛(가치)은 채도를 낮춘 팔레트 뒤쪽 색. 기여가 닿으면 코어가 맥동한다.
   가운데 문구 자리는 선이 옅어지고, 문구를 올리면 코어도 물러난다. */
(function () {
  var TAU = Math.PI * 2, NS = 22;
  function ss(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function bz(a, b, c, d, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }
  // 가운데로 갈수록 옅어지는 정도(f: 왼쪽 노드 0 ~ 오른쪽 노드 1)
  function prof(f) { var d = Math.abs(f - 0.5) * 2; return 0.07 + 0.93 * ss(0.22, 0.9, d); }

  LAB.register({
    id: 'd6-flow-lines', name: '흐름선 · 모였다 퍼지는 빛줄기', designed: true, defaultPal: 'brand', textDefault: true,
    idea: '양옆의 여러 기관에서 나온 가는 선들이 가운데 공동 모델로 모였다가 다시 모든 기관으로 퍼진다. 들어가는 빛은 데이터가 아닌 학습 기여, 나오는 빛은 함께 만든 모델의 가치다.',
    init: function (w, h, P) {
      var n = 7, L = [], R = [], i, k, S = [], parts = [], sc = Math.max(1, Math.sqrt(w / 600));
      var xL = w * 0.055, xR = w * 0.945;
      for (i = 0; i < n; i++) {
        var f = (i + 0.5) / n;
        L.push({ x: xL, y: h * (0.1 + 0.8 * f) + (Math.random() - 0.5) * h * 0.06, f: f, hot: 0 });
        R.push({ x: xR, y: h * (0.1 + 0.8 * f) + (Math.random() - 0.5) * h * 0.06, f: f, hot: 0 });
      }
      for (i = 0; i < n; i++) {
        var pool = [0, 1, 2, 3, 4, 5, 6].sort(function () { return Math.random() - 0.5; });
        for (k = 0; k < 5; k++) {
          var j = pool[k];
          S.push({ a: i, b: j, z: Math.random(), jit: Math.random() - 0.5, hue: (L[i].f + R[j].f) / 2,
            p1: Math.random() * TAU, p2: Math.random() * TAU, p3: Math.random() * TAU, p4: Math.random() * TAU, g: null, geo: null });
        }
      }
      S.sort(function (a, b) { return a.z - b.z; }); // 뒤쪽(옅은) 선부터 그린다
      for (i = 0; i < 22; i++) { // 36 → 22: 입자가 너무 많아 산만했다
        parts.push({ s: Math.floor(Math.random() * S.length), side: Math.random() < 0.5 ? 0 : 1, inw: Math.random() < 0.55,
          per: 4200 + Math.random() * 2600, ph: Math.random(), cyc: null });
      }
      return { L: L, R: R, S: S, parts: parts, xL: xL, xR: xR, sc: sc, ready: false, pulse: 0, beat: 0, txt: -1, ov: null, lastT: 0 };
    },
    draw: function (ctx, w, h, t, P, s) {
      var cx = w / 2, cy = h / 2, xL = s.xL, xR = s.xR, dk = P.dark, sc = s.sc;
      var la = dk ? 1 : 1.5; // 밝은 배경에서는 선·노드·입자가 흐려 보여 알파를 올린다(어두운 배경은 그대로)
      var dt = s.lastT ? Math.max(0, Math.min(64, t - s.lastT)) : 16; s.lastT = t;
      // 가운데 문구가 올라와 있으면 코어를 물린다(문구 자리 비우기). 카드 밖 캔버스면 문구 없음으로 본다.
      if (s.ov === null) { var pn = ctx.canvas && ctx.canvas.parentNode; s.ov = (pn && pn.querySelector && pn.querySelector('.overlay')) || false; }
      var txtOn = s.ov && s.ov.style.display !== 'none' ? 1 : 0;
      s.txt = s.txt < 0 ? txtOn : s.txt + (txtOn - s.txt) * Math.min(1, dt / 220);

      if (!s.ready) { // 시간과 무관한 것(선 그라데이션, 배경 빛)은 한 번만 만든다
        // 선은 색 2단 x 깊이 2단 = 4묶음으로 나눠 묶음마다 한 번에 긋는다(긋는 횟수가 곧 비용)
        s.B = [];
        for (var hb = 0; hb < 2; hb++) for (var zb = 0; zb < 2; zb++) {
          var hue = 0.28 + hb * 0.44, z = zb ? 0.85 : 0.3, base = ((dk ? 0.24 : 0.18) + (dk ? 0.5 : 0.4) * z) * la;
          var g = ctx.createLinearGradient(xL, 0, xR, 0);
          for (var q = 0; q <= 12; q++) { var f = q / 12, hu = Math.max(0, Math.min(1, hue + (f - 0.5) * 0.4)); g.addColorStop(f, P.c(hu, base * prof(f))); }
          s.B.push({ g: g, lw: 0.35 + 0.75 * z, list: [] });
        }
        s.S.forEach(function (st) { var hb = st.hue < 0.5 ? 0 : 1, zb = st.z < 0.5 ? 0 : 1; s.B[hb * 2 + zb].list.push(st); });
        var dpr = ctx.getTransform ? ctx.getTransform().a : 1, bgc = document.createElement('canvas');
        bgc.width = Math.max(1, Math.round(w * dpr)); bgc.height = Math.max(1, Math.round(h * dpr));
        var bx = bgc.getContext('2d'); bx.scale(dpr, dpr);
        var gl = bx.createRadialGradient(0, cy, 0, 0, cy, h * 0.85); gl.addColorStop(0, P.c(0.05, dk ? 0.08 : 0.05)); gl.addColorStop(1, P.c(0.05, 0));
        var gr = bx.createRadialGradient(w, cy, 0, w, cy, h * 0.85); gr.addColorStop(0, P.c(0.95, dk ? 0.08 : 0.05)); gr.addColorStop(1, P.c(0.95, 0));
        bx.fillStyle = gl; bx.fillRect(0, 0, h * 0.85, h); bx.fillStyle = gr; bx.fillRect(w - h * 0.85, 0, h * 0.85, h);
        var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.34);
        core.addColorStop(0, P.c(0.5, dk ? 0.16 : 0.1)); core.addColorStop(0.55, P.c(0.5, dk ? 0.05 : 0.03)); core.addColorStop(1, P.c(0.5, 0));
        s.bgc = bgc; s.core = core; s.ready = true;
      }

      // 깊이감을 주는 아주 옅은 빛: 양옆은 미리 그려 둔 그림, 가운데는 모델이 기여를 받을 때 살짝 밝아진다
      ctx.drawImage(s.bgc, 0, 0, w, h);
      s.pulse *= Math.exp(-dt / 900);
      ctx.globalAlpha = 0.6 + 0.4 * Math.min(1, s.pulse);
      ctx.fillStyle = s.core; ctx.fillRect(cx - h * 0.34, cy - h * 0.34, h * 0.68, h * 0.68);
      ctx.globalAlpha = 1;

      // 곡선 다발: 노드 → 가운데(허리) → 반대편 노드, 두 개의 3차 베지어로 이어 붙인다
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      s.S.forEach(function (st) {
        var A = s.L[st.a], B = s.R[st.b], amp = h * (0.03 + 0.06 * st.z);
        var yc = cy + ((A.y + B.y) / 2 - cy) * 0.14 + st.jit * h * 0.03 + Math.sin(t * 0.00031 + st.p1) * h * 0.02;
        var tl = Math.sin(t * 0.0002 + st.p4) * h * 0.035, kx = (cx - xL) * 0.46;
        var g = st.geo || (st.geo = new Array(14));
        g[0] = xL; g[1] = A.y; g[2] = xL + (cx - xL) * 0.5; g[3] = A.y + Math.sin(t * 0.00023 + st.p2) * amp;
        g[4] = cx - kx; g[5] = yc + tl; g[6] = cx; g[7] = yc;
        g[8] = cx + kx; g[9] = yc - tl; g[10] = xR - (xR - cx) * 0.5; g[11] = B.y + Math.sin(t * 0.00027 + st.p3) * amp; g[12] = xR; g[13] = B.y;
        // 베지어를 직접 잘게 나눠 둔다(브라우저가 곡선을 그리는 것보다 빠르다)
        var pt = st.pt || (st.pt = new Float32Array((NS * 2 + 1) * 2)), m, v;
        for (m = 0; m <= NS; m++) { v = m / NS; pt[m * 2] = bz(g[0], g[2], g[4], g[6], v); pt[m * 2 + 1] = bz(g[1], g[3], g[5], g[7], v); }
        for (m = 1; m <= NS; m++) { v = m / NS; pt[(NS + m) * 2] = bz(g[6], g[8], g[10], g[12], v); pt[(NS + m) * 2 + 1] = bz(g[7], g[9], g[11], g[13], v); }
      });
      s.B.forEach(function (bk) {
        if (!bk.list.length) return;
        ctx.beginPath();
        bk.list.forEach(function (st) { var pt = st.pt, n2 = pt.length; ctx.moveTo(pt[0], pt[1]); for (var m = 2; m < n2; m += 2) ctx.lineTo(pt[m], pt[m + 1]); });
        ctx.strokeStyle = bk.g; ctx.lineWidth = bk.lw * sc; ctx.stroke();
      });

      // 흐르는 빛 입자
      var cIn = 0.02, cOut = 0.8; // 나가는 가치는 끝색(0.98) 대신 가운데 쪽으로 당겨 채도를 낮춘다
      s.L.forEach(function (n) { n.hot = 0; }); s.R.forEach(function (n) { n.hot = 0; });
      s.beat *= Math.exp(-dt / 520);
      s.parts.forEach(function (p) {
        var st = s.S[p.s], g = st.geo, x = t / p.per + p.ph, cyc = Math.floor(x), u = x - cyc;
        if (p.cyc !== null && cyc !== p.cyc && p.inw) { s.pulse = Math.min(1.2, s.pulse + 0.22); s.beat = 1; } // 기여가 코어에 닿음
        p.cyc = cyc;
        // 반쪽 곡선 위 위치(노드 0 → 가운데 1)
        var sp = p.inw ? 1 - Math.cos(u * Math.PI / 2) : 1 - Math.sin(u * Math.PI / 2);
        var o = p.side === 0 ? [g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[7]] : [g[12], g[13], g[10], g[11], g[8], g[9], g[6], g[7]];
        function at(v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return [bz(o[0], o[2], o[4], o[6], v), bz(o[1], o[3], o[5], o[7], v)]; }
        var hd = at(sp), d = Math.abs(hd[0] - cx) / (cx - xL);
        var pa = ss(0.1, 0.48, d) * ss(0, 0.07, u) * (1 - ss(0.93, 1, u)) * (0.55 + 0.45 * st.z) * la;
        var node = p.side === 0 ? s.L[st.a] : s.R[st.b];
        if (p.inw && u < 0.18) node.hot = Math.max(node.hot, 1 - u / 0.18);
        if (!p.inw && u > 0.86) { // 가치가 기관에 닿는 순간의 잔물결
          var kk = (u - 0.86) / 0.14; ctx.beginPath(); ctx.arc(node.x, node.y, (2.6 + 10 * kk) * sc, 0, TAU);
          ctx.strokeStyle = P.c(cOut, (1 - kk) * 0.45 * la); ctx.lineWidth = 0.8 * sc; ctx.stroke();
        }
        if (pa < 0.01) return;
        var col = p.inw ? cIn : cOut, dir = p.inw ? 1 : -1;
        ctx.beginPath(); ctx.arc(hd[0], hd[1], 4.2 * sc, 0, TAU); ctx.fillStyle = P.c(col, pa * (dk ? 0.2 : 0.12)); ctx.fill();
        var prev = hd;
        for (var k = 1; k <= 3; k++) {
          var q = at(sp - dir * k * 0.03);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]);
          ctx.strokeStyle = P.c(col, pa * (0.66 - k * 0.18)); ctx.lineWidth = (1.5 - k * 0.28) * sc; ctx.stroke(); prev = q;
        }
        ctx.beginPath(); ctx.arc(hd[0], hd[1], 1.5 * sc, 0, TAU); ctx.fillStyle = P.c(col, Math.min(1, pa)); ctx.fill();
        if (dk) { ctx.beginPath(); ctx.arc(hd[0], hd[1], 0.7 * sc, 0, TAU); ctx.fillStyle = P.ink(pa * 0.85); ctx.fill(); } // 어두운 배경에서는 빛의 심지
      });

      // 공동 모델(허리의 코어): 링 + 점. 기여가 닿을 때마다 링이 부풀고 잔물결이 한 번 퍼진다. 문구가 올라오면 물러난다.
      var ka = 1 - s.txt;
      if (ka > 0.01) {
        var bt = s.beat, pl = Math.min(1, s.pulse), cr = 8.5 * sc * (1 + 0.16 * bt);
        ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fillStyle = P.bg; ctx.globalAlpha = 0.82 * ka; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = P.c(0.5, ka * (dk ? 0.55 + 0.3 * pl : 0.5 + 0.25 * pl)); ctx.lineWidth = (0.9 + 0.5 * bt) * sc; ctx.stroke();
        if (bt > 0.02) { // 잔물결
          ctx.beginPath(); ctx.arc(cx, cy, cr * (1 + 1.1 * (1 - bt)), 0, TAU);
          ctx.strokeStyle = P.c(cIn, ka * bt * 0.32 * la); ctx.lineWidth = 0.8 * sc; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, (2.2 + 0.9 * bt) * sc, 0, TAU); ctx.fillStyle = P.c(0.5, ka * (0.75 + 0.25 * pl)); ctx.fill();
        if (dk) { ctx.beginPath(); ctx.arc(cx, cy, (0.9 + 0.4 * bt) * sc, 0, TAU); ctx.fillStyle = P.ink(ka * (0.5 + 0.4 * bt)); ctx.fill(); } // 어두운 배경에서는 심지
      }

      // 기관(양옆 노드)
      function nodeDraw(n) {
        if (n.hot > 0.01) { ctx.beginPath(); ctx.arc(n.x, n.y, 6 * sc, 0, TAU); ctx.fillStyle = P.c(cIn, 0.14 * n.hot * la); ctx.fill(); }
        ctx.beginPath(); ctx.arc(n.x, n.y, 2.7 * sc, 0, TAU); ctx.fillStyle = P.bg; ctx.fill();
        ctx.strokeStyle = P.ink((dk ? 0.45 : 0.38) * la); ctx.lineWidth = sc; ctx.stroke();
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.05 * sc, 0, TAU); ctx.fillStyle = P.c(n.f, Math.min(1, (0.55 + 0.45 * n.hot) * la)); ctx.fill();
      }
      s.L.forEach(nodeDraw); s.R.forEach(nodeDraw);
    }
  });
})();
