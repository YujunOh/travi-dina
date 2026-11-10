/* D2. 부드러운 동그라미 배경: 흐릿한 큰 원(기관)이 가장자리를 천천히 돌며 겹치고, 이웃한 두 원 사이에 가는 연결선이 생겼다 사라진다. 가운데는 문구 자리로 비워 둔다. */
(function () {
  var TAU = Math.PI * 2;
  function ss(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function rgbOf(str) { var m = String(str).match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
  function hexRgb(hex) { var h = String(hex).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  /* 가우시안에 가까운 방사형 원 하나를 미리 그려 둔 스프라이트 */
  function sprite(P, tone) {
    var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    var st = [[0, 1], [0.18, 0.9], [0.36, 0.66], [0.54, 0.38], [0.72, 0.15], [0.86, 0.05], [1, 0]];
    st.forEach(function (q) { gr.addColorStop(q[0], P.c(tone, q[1])); });
    g.fillStyle = gr; g.fillRect(0, 0, S, S); return c;
  }

  /* 그라데이션 띠(banding)를 지우는 아주 옅은 입자 */
  function grain(P) {
    var S = 160, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d'), im = g.createImageData(S, S), ink = rgbOf(P.ink(1));
    for (var i = 0; i < S * S; i++) { var k = i * 4; im.data[k] = ink[0]; im.data[k + 1] = ink[1]; im.data[k + 2] = ink[2]; im.data[k + 3] = Math.random() * 255; }
    g.putImageData(im, 0, 0); return c;
  }

  LAB.register({
    id: 'd2-soft-bubbles', name: '부드러운 동그라미 배경', designed: true, defaultPal: 'brand', textDefault: true,
    idea: '흐릿한 큰 동그라미(각 기관)가 제자리를 지키며 천천히 떠다니고, 겹치는 곳에서 색이 섞인다. 가끔 이웃한 두 기관 사이에 가는 선이 이어졌다 사라져 데이터는 두고 함께 배운다는 느낌을 준다.',
    init: function (w, h, P) {
      var N = 7, B = [], i;
      for (i = 0; i < N; i++) {
        var tone = ((i * 3) % N) / (N - 1);
        B.push({
          tone: tone, img: sprite(P, tone),
          a: i / N * TAU + (Math.random() - 0.5) * 0.35,
          r: 0.46 + Math.random() * 0.16,               // 높이 대비 반지름
          fx: TAU / (26000 + Math.random() * 22000), fy: TAU / (30000 + Math.random() * 24000), fr: TAU / (14000 + Math.random() * 10000),
          px: Math.random() * TAU, py: Math.random() * TAU, pr: Math.random() * TAU
        });
      }
      var seq = []; for (i = 0; i < 24; i++) seq.push(Math.floor(Math.random() * N));
      var gc = grain(P), ctx0 = gc.getContext('2d');
      return { B: B, N: N, seq: seq, grain: gc, pat: ctx0.createPattern(gc, 'repeat'), bg: hexRgb(P.bg) };
    },
    draw: function (ctx, w, h, t, P, s) {
      var cx = w / 2, cy = h / 2, rot = t * TAU / 220000, N = s.N, bg = s.bg;
      var rx = w * 0.40, ry = h * 0.43;
      var u = Math.max(1, w / 600);        // 굵기·점 크기 단위: 카드 폭(약 600px)에서 1, 1440px에서 2.4
      var lt = P.dark ? 1 : 1.5;           // 밝은 배경에서는 선·점이 묻히므로 알파를 1.5배
      function A1(a) { return a > 1 ? 1 : a; }

      /* 1) 위치: 가장자리 타원 위 자기 자리 + 느린 흔들림 */
      var pos = s.B.map(function (b) {
        var a = b.a + rot;
        return {
          x: cx + Math.cos(a) * rx + Math.sin(t * b.fx + b.px) * w * 0.045,
          y: cy + Math.sin(a) * ry + Math.sin(t * b.fy + b.py) * h * 0.07,
          r: h * b.r * (1 + 0.07 * Math.sin(t * b.fr + b.pr)), b: b
        };
      });

      /* 1.5) 지금 살아 있는 연결 목록. 원·선·점이 같은 값을 쓰도록 먼저 계산한다 */
      var EVERY = 3600, LIFE = 7800, glow = new Array(N), link = new Array(N), links = [];
      for (var q = 0; q < N; q++) { glow[q] = 0; link[q] = 0; }
      var k1 = Math.floor(t / EVERY), k0 = Math.floor((t - LIFE) / EVERY) + 1;
      for (var k = Math.max(0, k0); k <= k1; k++) {
        var age = t - k * EVERY; if (age < 0 || age >= LIFE) continue;
        var i = s.seq[k % s.seq.length], j = (i + 1) % N;
        var env = ss(age / 1800) * ss((LIFE - age) / 2000), grow = ss(age / 2600);
        glow[i] = Math.max(glow[i], env); glow[j] = Math.max(glow[j], env * grow);
        /* 선이 상대에게 닿는 순간 두 원이 함께 밝아진다 */
        var hit = env * ss((age - 1600) / 1400);
        link[i] = Math.max(link[i], hit); link[j] = Math.max(link[j], hit);
        links.push({ i: i, j: j, age: age, env: env, grow: grow });
      }

      /* 2) 원: 밝은 배경은 multiply(물감처럼 겹쳐 진해짐), 어두운 배경은 screen(빛처럼 겹쳐 밝아짐) */
      ctx.globalCompositeOperation = P.dark ? 'screen' : 'multiply';
      var baseA = P.dark ? (P.pal === 'mono' ? 0.34 : 0.6) : 0.5; // 무채색+어두운 배경은 팔레트 자체가 밝은 회색이라 낮춘다
      pos.forEach(function (p, n) {
        var g = link[n], rr = p.r * (1 + 0.035 * g);
        ctx.globalAlpha = A1(baseA * (1 + 0.38 * g));
        ctx.drawImage(p.b.img, p.x - rr, p.y - rr, rr * 2, rr * 2);
      });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      /* 3) 가운데 비우기: 배경색으로 부드럽게 걷어 낸 타원 */
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.5);
      var R = w * 0.4, wash = ctx.createRadialGradient(0, 0, 0, 0, 0, R), bgs = 'rgba(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ',';
      var wa = P.dark ? 0.62 : 0.7;
      wash.addColorStop(0, bgs + wa + ')'); wash.addColorStop(0.45, bgs + (wa * 0.6) + ')'); wash.addColorStop(1, bgs + '0)');
      ctx.fillStyle = wash; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.restore();

      /* 4) 연결선: 이웃한 두 기관 사이, 바깥으로 살짝 휜 가는 선이 그려졌다가 사라진다 */
      links.forEach(function (lk) {
        var age = lk.age, env = lk.env, grow = lk.grow, A = pos[lk.i], Bp = pos[lk.j];
        var mx = (A.x + Bp.x) / 2, my = (A.y + Bp.y) / 2, dx = mx - cx, dy = my - cy, dl = Math.sqrt(dx * dx + dy * dy) || 1;
        var ch = Math.sqrt((Bp.x - A.x) * (Bp.x - A.x) + (Bp.y - A.y) * (Bp.y - A.y)), bow = ch * 0.16;
        var qx = mx + dx / dl * bow, qy = my + dy / dl * bow, L = ch * 1.08;
        var lg = ctx.createLinearGradient(A.x, A.y, Bp.x, Bp.y);
        var la = A1(0.8 * lt * env);
        lg.addColorStop(0, P.c(A.b.tone, la)); lg.addColorStop(1, P.c(Bp.b.tone, la));
        ctx.strokeStyle = lg; ctx.lineWidth = 1.4 * u; ctx.lineCap = 'round';
        ctx.setLineDash([L * grow, L * 2]);
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(qx, qy, Bp.x, Bp.y); ctx.stroke();
        ctx.setLineDash([]);
        /* 선을 따라 한 번 지나가는 작은 빛 */
        var f = ss((age - 600) / (LIFE - 2400));
        if (f > 0 && f < 1) {
          var v = 1 - f, px = v * v * A.x + 2 * v * f * qx + f * f * Bp.x, py = v * v * A.y + 2 * v * f * qy + f * f * Bp.y, pa = env * Math.sin(f * Math.PI);
          var hr = 9 * u, hg = ctx.createRadialGradient(px, py, 0, px, py, hr); hg.addColorStop(0, P.c(0.5, A1(0.35 * lt * pa))); hg.addColorStop(1, P.c(0.5, 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(px, py, hr, 0, TAU); ctx.fill();
          ctx.fillStyle = P.ink(A1(0.7 * lt * pa)); ctx.beginPath(); ctx.arc(px, py, 1.5 * u, 0, TAU); ctx.fill();
        }
      });

      /* 5) 각 기관의 중심: 작은 점과 가는 고리. 평소에도 보이고, 연결될 때 더 또렷해진다 */
      pos.forEach(function (p, n) {
        var g = glow[n], ra = A1((0.2 + 0.5 * g) * lt);
        ctx.strokeStyle = P.ink(ra * 0.7); ctx.lineWidth = 1.1 * u;
        ctx.beginPath(); ctx.arc(p.x, p.y, (4.5 + 2.5 * g) * u, 0, TAU); ctx.stroke();
        ctx.fillStyle = P.c(p.b.tone, A1((0.45 + 0.55 * g) * lt)); ctx.beginPath(); ctx.arc(p.x, p.y, 2 * u, 0, TAU); ctx.fill();
      });

      /* 6) 아주 옅은 입자 */
      ctx.globalAlpha = P.dark ? 0.035 : 0.028; ctx.fillStyle = s.pat; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    }
  });
})();
