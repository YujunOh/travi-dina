/* D7. 점 격자 물결: 촘촘한 점 격자 위에서 몇몇 점(기관)이 잔잔한 물결을 낸다.
   물결이 지나가는 점은 살짝 커지고 밝아지며, 서로 다른 물결이 겹치는 곳은 더 밝아진다. */
(function () {
  var TAU = Math.PI * 2;
  function ss(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  LAB.register({
    id: 'd7-dot-ripple', name: '점 격자 물결', designed: true, defaultPal: 'brand', textDefault: false,
    idea: '촘촘한 점 격자 곳곳의 기관이 각자 잔잔한 물결을 낸다. 물결은 데이터가 아니라 영향만 퍼뜨리고, 서로 다른 물결이 만나는 자리는 더 밝아진다. 함께할 때 가치가 커진다는 뜻.',
    init: function (w, h, P) {
      // 점 간격은 촘촘하게(하한 7px) 해서 물결이 사각 덩어리가 아니라 고리로 읽히게 한다.
      // 물결 굵기는 점 간격과 떼어 예전 크기(wg)를 유지한다.
      var gap = Math.max(7, Math.min(11, Math.min(w, h) / 42));
      var wg = Math.max(10, Math.min(18, Math.min(w, h) / 28));
      var cols = Math.floor(w / gap), rows = Math.floor(h / gap);
      var ox = (w - (cols - 1) * gap) / 2, oy = (h - (rows - 1) * gap) / 2;
      var n = cols * rows, X = new Float32Array(n), Y = new Float32Array(n), V = new Float32Array(n), B = new Uint8Array(n);
      var NB = 6, i, j, k = 0;
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var x = ox + i * gap, y = oy + j * gap;
        X[k] = x; Y[k] = y;
        var ex = Math.abs(x / w - 0.5) * 2, ey = Math.abs(y / h - 0.5) * 2;
        V[k] = 1 - 0.65 * ss(0.55, 1.05, Math.max(ex * 0.92, ey)); // 가장자리로 갈수록 흐려지는 깊이감
        B[k] = Math.min(NB - 1, Math.floor(x / w * NB));
        k++;
      }
      // 기관 위치: 가운데(문구 자리)를 피해 둘레에 놓고 격자점에 맞춘다
      var seeds = [[0.13, 0.27], [0.31, 0.8], [0.6, 0.16], [0.87, 0.6], [0.7, 0.86], [0.07, 0.66]];
      var periods = [6800, 7600, 7200, 8000, 7400, 8400];
      var S = seeds.map(function (p, idx) {
        var gi = Math.round((p[0] * w + (Math.random() - 0.5) * wg * 2 - ox) / gap), gj = Math.round((p[1] * h + (Math.random() - 0.5) * wg * 2 - oy) / gap);
        gi = Math.max(1, Math.min(cols - 2, gi)); gj = Math.max(1, Math.min(rows - 2, gj));
        return { x: ox + gi * gap, y: oy + gj * gap, per: periods[idx], off: idx * 1300 + Math.random() * 600 };
      });
      // 기관별 거리와 방향을 미리 계산(프레임당 sqrt 없음)
      var m = S.length, D = new Float32Array(n * m), UX = new Float32Array(n * m), UY = new Float32Array(n * m);
      for (k = 0; k < n; k++) for (var q = 0; q < m; q++) {
        var dx = X[k] - S[q].x, dy = Y[k] - S[q].y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        D[k * m + q] = d; UX[k * m + q] = dx / d; UY[k * m + q] = dy / d;
      }
      // 가만히 있는 바탕 점은 한 번만 그려 둔다
      var dpr = Math.min(2, window.devicePixelRatio || 1), off = document.createElement('canvas');
      off.width = Math.max(1, Math.round(w * dpr)); off.height = Math.max(1, Math.round(h * dpr));
      var oc = off.getContext('2d'); oc.setTransform(dpr, 0, 0, dpr, 0, 0);
      var baseA = P.dark ? 0.17 : 0.2, LV = 5, br = 0.75;
      for (var lv = 0; lv < LV; lv++) {
        oc.beginPath();
        for (k = 0; k < n; k++) { var vb = Math.min(LV - 1, Math.floor(V[k] * LV)); if (vb !== lv) continue; oc.moveTo(X[k] + br, Y[k]); oc.arc(X[k], Y[k], br, 0, TAU); }
        oc.fillStyle = P.ink(baseA * (0.35 + 0.65 * (lv + 0.5) / LV)); oc.fill();
      }
      // 프레임마다 반복되는 계산을 미리 해 둔다: 가운데(문구 자리) 차분함 x 깊이감, 물결 단면(exp*cos) 표
      var VC = new Float32Array(n), cx = w / 2, cy = h / 2;
      for (k = 0; k < n; k++) {
        var qx = (X[k] - cx) / (w * 0.3), qy = (Y[k] - cy) / (h * 0.26);
        VC[k] = V[k] * (0.55 + 0.45 * ss(0.5, 1.3, Math.sqrt(qx * qx + qy * qy)));
      }
      var sgF = wg * 1.4, sgB = wg * 3.6, kw = TAU / (wg * 3.1), lo = -sgB * 2.4, hi = sgF * 2.4, RES = 2; // 0.5px 해상도
      var LUT = new Float32Array(Math.ceil((hi - lo) * RES) + 2);
      for (k = 0; k < LUT.length; k++) {
        var xx = lo + k / RES, cw = 0.5 + 0.5 * Math.cos(xx * kw);
        LUT[k] = (xx > 0 ? Math.exp(-(xx * xx) / (sgF * sgF)) : Math.exp(-(xx * xx) / (sgB * sgB))) * cw * cw;
      }
      return { gap: gap, wg: wg, n: n, X: X, Y: Y, V: V, VC: VC, LUT: LUT, lo: lo, hi: hi, RES: RES, B: B, NB: NB, S: S, D: D, UX: UX, UY: UY, off: off, aq: new Int32Array(m), diag: Math.sqrt(w * w + h * h), act: new Float32Array(m), rad: new Float32Array(m) };
    },
    draw: function (ctx, w, h, t, P, s) {
      var S = s.S, m = S.length, q, k;
      var life = 6400, speed = s.diag * 0.105 / 1000; // 6.4초 동안 대각선 0.67까지 퍼진다
      for (q = 0; q < m; q++) {
        var age = ((t + S[q].off) % S[q].per);
        if (age > life) { s.act[q] = 0; s.rad[q] = -1e4; continue; }
        var u = age / life;
        s.act[q] = ss(0, 0.06, u) * Math.pow(1 - u, 1.25); // 부드럽게 시작해 천천히 잦아든다
        s.rad[q] = age * speed;
      }
      ctx.drawImage(s.off, 0, 0, w, h);

      // 물결 한 번 = 앞이 또렷하고 뒤로 잦아드는 2~3겹 동심원
      var NL = 7, NB = s.NB, D = s.D, UX = s.UX, UY = s.UY, LUT = s.LUT, lo = s.lo, hi = s.hi, RES = s.RES, aq = s.aq, na = 0, ia;
      for (q = 0; q < m; q++) if (s.act[q] >= 0.01) aq[na++] = q;
      var buckets = s.bk || (s.bk = []), bi;
      for (bi = 0; bi < NB * NL; bi++) { if (!buckets[bi]) buckets[bi] = []; buckets[bi].length = 0; }
      for (k = 0; k < s.n; k++) {
        var sum = 0, mx = 0, px = 0, py = 0, base = k * m;
        for (ia = 0; ia < na; ia++) {
          q = aq[ia];
          var x = D[base + q] - s.rad[q];
          if (x >= hi || x <= lo) continue;
          var v = LUT[((x - lo) * RES) | 0] * s.act[q]; sum += v; if (v > mx) mx = v;
          px += UX[base + q] * v; py += UY[base + q] * v;
        }
        if (sum < 0.03) continue;
        // 가운데(문구 자리)는 조금 차분하게(VC에 미리 곱해 둠)
        var b = (mx * 0.82 + (sum - mx) * 1.9) * s.VC[k]; // 겹침(sum-mx)에 가중치
        if (b < 0.04) continue;
        if (b > 1) b = 1;
        var L = Math.min(NL - 1, Math.floor(b * NL));
        buckets[s.B[k] * NL + L].push(k, px * 1.6, py * 1.6);
      }
      for (var band = 0; band < NB; band++) {
        var ct = band / (NB - 1);
        for (var L2 = 0; L2 < NL; L2++) {
          var arr = buckets[band * NL + L2]; if (!arr.length) continue;
          var lvl = (L2 + 0.5) / NL, r = 0.75 + 1.15 * Math.pow(lvl, 1.2);
          ctx.beginPath();
          for (var z = 0; z < arr.length; z += 3) { var kk = arr[z], xx = s.X[kk] + arr[z + 1], yy = s.Y[kk] + arr[z + 2]; ctx.moveTo(xx + r, yy); ctx.arc(xx, yy, r, 0, TAU); }
          ctx.fillStyle = P.c(ct, P.dark ? 0.2 + 0.72 * Math.pow(lvl, 0.9) : Math.min(1, 1.5 * (0.16 + 0.78 * Math.pow(lvl, 0.9))));
          ctx.fill();
        }
      }
      // 물결 맨 앞에 아주 얇은 원을 겹쳐 점 무리가 둥근 고리로 읽히게 한다
      ctx.lineWidth = 0.75;
      for (q = 0; q < m; q++) {
        var fa = s.act[q]; if (fa < 0.02) continue;
        var ctf = Math.min(1, Math.max(0, S[q].x / w));
        ctx.beginPath(); ctx.arc(S[q].x, S[q].y, s.rad[q], 0, TAU);
        ctx.strokeStyle = P.c(ctf, (P.dark ? 0.16 : 0.24) * fa); ctx.stroke();
      }
      // 기관: 격자 속 조금 진한 점과 얇은 고리. 물결을 낼 때만 살짝 밝아진다
      for (q = 0; q < m; q++) {
        var sx = S[q].x, sy = S[q].y, ctq = Math.min(1, Math.max(0, sx / w)), pulse = s.act[q];
        ctx.beginPath(); ctx.arc(sx, sy, 6.5, 0, TAU); ctx.strokeStyle = P.c(ctq, (P.dark ? 0.22 : 0.45) + 0.3 * pulse); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, 2.4 + 0.5 * pulse, 0, TAU); ctx.fillStyle = P.c(ctq, P.dark ? 0.75 + 0.25 * pulse : 1); ctx.fill();
      }
    }
  });
})();
