/* 도식 실험실 공통 엔진: 버전 등록, 팔레트, 카드별 조절(팔레트·배경·채도·속도·문구), 평가 저장과 요약.
   버전 파일은 LAB.register({ id, name, designed, idea, init(w,h,P), draw(ctx,w,h,t,P,s) }) 로 등록한다. */
(function () {
  var PALETTES = {
    mono:  { label: '무채색',   stops: [[60, 66, 80], [13, 18, 32], [110, 118, 135]] },
    brand: { label: '브랜드',   stops: [[26, 163, 217], [91, 76, 224], [224, 103, 94]] },
    cool:  { label: '차가운',   stops: [[37, 99, 235], [8, 145, 178], [16, 185, 129]] },
    warm:  { label: '따뜻한',   stops: [[245, 158, 11], [239, 68, 68], [219, 39, 119]] },
    soft:  { label: '저채도',   stops: [[120, 150, 168], [150, 140, 190], [196, 150, 140]] },
    dawn:  { label: '따뜻한 저채도', stops: [[224, 150, 112], [212, 106, 98], [178, 96, 130]] },
    indigo: { label: '남색 계열', stops: [[92, 118, 214], [91, 92, 224], [128, 108, 228]] }
  };
  var BGS = { light: { label: '밝은 배경', bg: '#fbfbfd', ink: [13, 18, 32] }, dark: { label: '어두운 배경', bg: '#0b0f1a', ink: [226, 232, 244] } };

  function makeP(pal, bgKey) {
    var p = PALETTES[pal] || PALETTES.brand, b = BGS[bgKey] || BGS.light;
    var stops = p.stops;
    if (pal === 'mono' && bgKey === 'dark') stops = [[170, 178, 195], [226, 232, 244], [140, 148, 165]];
    function c(t, a) {
      t = Math.max(0, Math.min(1, t)); var i = t < 0.5 ? 0 : 1, k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      var c0 = stops[i], c1 = stops[i + 1];
      return 'rgba(' + Math.round(c0[0] + (c1[0] - c0[0]) * k) + ',' + Math.round(c0[1] + (c1[1] - c0[1]) * k) + ',' + Math.round(c0[2] + (c1[2] - c0[2]) * k) + ',' + (a == null ? 1 : a) + ')';
    }
    function ink(a) { return 'rgba(' + b.ink.join(',') + ',' + (a == null ? 1 : a) + ')'; }
    /* quiet: 글이 놓이는 조용한 타원(화면 비율 좌표). layout: 'center' 또는 'left'. 첫 화면 미리보기(hero.html)가 글 배치에 맞춰 바꿔 넣는다 */
    return { pal: pal, bgKey: bgKey, dark: bgKey === 'dark', bg: b.bg, c: c, ink: ink, stops: stops, layout: 'center', quiet: { x: 0.5, y: 0.5, rx: 0.31, ry: 0.26 } };
  }

  var CRITERIA = [
    ['logic', '논리', '분산학습, 코옵이라는 개념이 맞게 읽히는가'],
    ['impression', '인상', '첫인상이 TRAVI답게 느껴지는가'],
    ['image', '이미지 완성도', '그림 자체가 잘 만들어졌는가'],
    ['color', '색감', '색 조합이 마음에 드는가'],
    ['saturation', '채도', '색이 너무 진하거나 흐리지 않은가'],
    ['comfort', '보기 편함', '오래 봐도 피곤하지 않은가']
  ];
  var KEY = 'travi-diagram-lab-v1';
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} renderSummary(); }

  var variants = [], cards = [];
  var LAB = window.LAB = { register: function (v) { variants.push(v); }, variants: variants, PALETTES: PALETTES, BGS: BGS, makeP: makeP, CRITERIA: CRITERIA };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function rec(id) { if (!store[id]) store[id] = { scores: {}, memo: '', settings: null }; return store[id]; }

  function buildCard(v, idx) {
    var r = rec(v.id);
    var st = r.settings || { pal: v.defaultPal || (v.designed ? 'brand' : 'mono'), bg: 'light', sat: 100, speed: 100, text: !!v.textDefault };
    var card = el('article', 'card'); card.id = 'v-' + v.id;
    var head = el('div', 'card-head');
    head.appendChild(el('div', 'num', String(idx + 1).padStart(2, '0')));
    var ttl = el('div', 'ttl'); ttl.appendChild(el('h3', null, v.name)); ttl.appendChild(el('span', 'tag ' + (v.designed ? 'on' : 'off'), v.designed ? '디자인함' : '디자인 안 함')); head.appendChild(ttl);
    card.appendChild(head);
    card.appendChild(el('p', 'idea', v.idea || ''));

    var stage = el('div', 'stage'); var cv = el('canvas'); stage.appendChild(cv);
    var ov = el('div', 'overlay'); ov.innerHTML = '<div class="ov-eb">AI COOPERATIVES</div><div class="ov-h"></div>'; stage.appendChild(ov);
    card.appendChild(stage);

    var ctl = el('div', 'ctl');
    function seg(label, opts, cur, onPick) {
      var g = el('div', 'grp'); g.appendChild(el('span', 'lbl', label)); var w = el('div', 'seg');
      Object.keys(opts).forEach(function (k) { var b = el('button', k === cur ? 'on' : '', opts[k].label || opts[k]); b.type = 'button'; b.onclick = function () { w.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); onPick(k); }; w.appendChild(b); });
      g.appendChild(w); return g;
    }
    function range(label, min, max, val, unit, onIn) {
      var g = el('div', 'grp'); g.appendChild(el('span', 'lbl', label)); var i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.value = val; var o = el('span', 'val', val + unit);
      i.oninput = function () { o.textContent = i.value + unit; onIn(+i.value); }; g.appendChild(i); g.appendChild(o); return g;
    }
    ctl.appendChild(seg('팔레트', PALETTES, st.pal, function (k) { st.pal = k; persist(); }));
    ctl.appendChild(seg('배경', BGS, st.bg, function (k) { st.bg = k; persist(); }));
    ctl.appendChild(range('채도', 0, 160, st.sat, '%', function (x) { st.sat = x; persist(); }));
    ctl.appendChild(range('속도', 25, 200, st.speed, '%', function (x) { st.speed = x; persist(); }));
    var tg = el('label', 'chk'); var tc = el('input'); tc.type = 'checkbox'; tc.checked = st.text; tc.onchange = function () { st.text = tc.checked; persist(); }; tg.appendChild(tc); tg.appendChild(document.createTextNode(' 가운데 문구 올리기')); ctl.appendChild(tg);
    card.appendChild(ctl);

    var rate = el('div', 'rate');
    CRITERIA.forEach(function (c) {
      var row = el('div', 'rrow'); var l = el('span', 'rl', c[1]); l.title = c[2]; row.appendChild(l);
      var w = el('div', 'stars');
      for (var n = 1; n <= 5; n++) (function (n) { var b = el('button', (r.scores[c[0]] || 0) >= n ? 'on' : '', String(n)); b.type = 'button'; b.title = c[2];
        b.onclick = function () { r.scores[c[0]] = (r.scores[c[0]] === n ? 0 : n); r.settings = JSON.parse(JSON.stringify(st)); w.querySelectorAll('button').forEach(function (x, i) { x.classList.toggle('on', i < r.scores[c[0]]); }); save(); }; w.appendChild(b); })(n);
      row.appendChild(w); rate.appendChild(row);
    });
    var memo = el('textarea'); memo.placeholder = '메모 (어디가 좋고 어디가 별로인지)'; memo.value = r.memo || ''; memo.oninput = function () { r.memo = memo.value; save(); };
    rate.appendChild(memo);
    card.appendChild(rate);

    function persist() { r.settings = JSON.parse(JSON.stringify(st)); apply(); save(); }
    var o = { v: v, card: card, cv: cv, ov: ov, st: st, state: null, P: null, w: 0, h: 0, ctx: null, visible: false, t0: 0, tAcc: 0, last: 0 };
    function apply() {
      o.P = makeP(st.pal, st.bg);
      cv.style.filter = 'saturate(' + (st.sat / 100) + ')';
      stage.style.background = o.P.bg;
      ov.style.display = st.text ? 'flex' : 'none';
      ov.classList.toggle('dark', o.P.dark);
      o.state = null; // 팔레트가 바뀌면 다시 초기화
    }
    o.apply = apply; apply();
    return o;
  }

  function fit(o) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), r = o.cv.getBoundingClientRect();
    o.cv.width = Math.max(1, Math.round(r.width * dpr)); o.cv.height = Math.max(1, Math.round(r.height * dpr));
    o.ctx = o.cv.getContext('2d'); o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); o.w = r.width; o.h = r.height; o.state = null; o.drawn = false; // 크기가 바뀌면 화면 밖 카드도 첫 장면을 다시 그린다
  }

  function renderSummary() {
    var tb = document.getElementById('sumBody'); if (!tb) return;
    var rows = variants.map(function (v, i) {
      var r = store[v.id] || { scores: {} }, vals = CRITERIA.map(function (c) { return r.scores && r.scores[c[0]] || 0; });
      var n = vals.filter(Boolean).length, avg = n ? vals.reduce(function (a, b) { return a + b; }, 0) / n : 0;
      return { v: v, i: i, vals: vals, avg: avg, r: r };
    });
    var sortBy = document.getElementById('sortSel') ? document.getElementById('sortSel').value : 'order';
    if (sortBy === 'avg') rows.sort(function (a, b) { return b.avg - a.avg; });
    tb.innerHTML = rows.map(function (x) {
      var s = x.r.settings;
      return '<tr><td><a href="#v-' + x.v.id + '">' + String(x.i + 1).padStart(2, '0') + ' ' + x.v.name + '</a><span class="tag ' + (x.v.designed ? 'on' : 'off') + '">' + (x.v.designed ? '디자인' : '원형') + '</span></td>' +
        x.vals.map(function (n) { return '<td class="n' + (n ? '' : ' empty') + '">' + (n || '·') + '</td>'; }).join('') +
        '<td class="n avg">' + (x.avg ? x.avg.toFixed(1) : '·') + '</td><td class="set">' + (s ? (PALETTES[s.pal].label + ' · ' + BGS[s.bg].label.replace(' 배경', '') + ' · 채도 ' + s.sat + '%') : '') + '</td></tr>';
    }).join('');
    var done = rows.filter(function (x) { return x.vals.every(Boolean); }).length;
    var pc = document.getElementById('progress'); if (pc) pc.textContent = done + ' / ' + rows.length + '개 버전 평가 완료';
  }

  function boot() {
    var grid = document.getElementById('grid');
    variants.forEach(function (v, i) { var o = buildCard(v, i); cards.push(o); grid.appendChild(o.card); });
    cards.forEach(fit);
    window.addEventListener('resize', function () { cards.forEach(fit); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { cards.forEach(function (o) { if (o.cv === e.target) o.visible = e.isIntersecting; }); }); }, { rootMargin: '100px' });
      cards.forEach(function (o) { io.observe(o.cv); });
    } else cards.forEach(function (o) { o.visible = true; });
    var msg = document.getElementById('msg');
    function setMsg() { cards.forEach(function (o) { o.ov.querySelector('.ov-h').textContent = msg.value; }); }
    msg.oninput = setMsg; setMsg();
    document.getElementById('sortSel').onchange = renderSummary;
    document.getElementById('btnCopy').onclick = function () {
      var out = variants.map(function (v) { var r = store[v.id] || {}; return { id: v.id, name: v.name, designed: v.designed, scores: r.scores || {}, settings: r.settings || null, memo: r.memo || '' }; });
      var txt = JSON.stringify({ lab: 'travi-diagram-lab-v1', exported: new Date().toISOString(), results: out }, null, 1);
      var b = this; function ok() { b.textContent = '복사됨'; setTimeout(function () { b.textContent = '평가 결과 복사'; }, 1600); }
      try { navigator.clipboard.writeText(txt).then(ok, function () { prompt('복사해 주세요', txt); }); } catch (e) { prompt('복사해 주세요', txt); }
    };
    document.getElementById('btnReset').onclick = function () { if (!confirm('모든 평가와 메모를 지울까요?')) return; store = {}; save(); location.reload(); };
    renderSummary();
    var last = performance.now();
    function loop(now) {
      var dt = Math.max(0, Math.min(64, now - last)); last = now; // 첫 rAF 시각이 boot 시각보다 앞설 수 있어 음수를 막는다
      cards.forEach(function (o) {
        if (!o.ctx) return;
        if (!o.visible && o.drawn) return; // 화면 밖 카드는 첫 장면만 그려 두고 멈춘다
        o.drawn = true;
        o.tAcc += dt * (o.st.speed / 100);
        if (!o.state) { o.state = o.v.init ? o.v.init(o.w, o.h, o.P) || {} : {}; }
        var ctx = o.ctx; ctx.save(); ctx.fillStyle = o.P.bg; ctx.fillRect(0, 0, o.w, o.h);
        try { o.v.draw(ctx, o.w, o.h, o.tAcc, o.P, o.state); } catch (err) { ctx.fillStyle = 'red'; ctx.fillText(String(err).slice(0, 80), 10, 20); }
        ctx.restore();
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  LAB.boot = boot;
})();
