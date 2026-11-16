/* TRAVI 시안 공통 스크립트.
   1) 보기 상태를 정한다. 사용자는 member로 고정이고, 로그아웃했을 때만 guest다
   2) 공통 헤더와 푸터를 그린다 (<header data-travi-header>, <footer data-travi-footer>)
   3) 게스트 가입 안내 팝업, 알림 패널, 아바타 메뉴, 드롭다운, 모달, 토스트
   네트워크 요청은 하지 않는다. <head>에서 불러도 되고 </body> 앞에서 불러도 된다. */
(function () {
  'use strict';

  /* ---------- 보기 상태 ---------- */
  var KEY = 'travi.as';
  var STATES = ['guest', 'member'];

  function param(name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  var body0 = document.body; // <head>에서 불렸으면 아직 null
  function authMode() {
    var b = document.body || body0;
    return b ? (b.getAttribute('data-auth') || '') : '';
  }

  // 우선순위: 주소의 ?as= > 저장된 값 > 기본값 member.
  // 역할 전환은 없다. guest는 로그아웃했거나 ?as=guest를 직접 줬을 때만이다.
  // 로그인이 필요한 페이지(body data-auth="required")는 ?as=guest를 직접 주지 않는 한 member로 본다.
  function resolve() {
    var p = param('as');
    if (STATES.indexOf(p) > -1) { store(p); return { as: p, explicit: true }; }
    var s = stored();
    return { as: STATES.indexOf(s) > -1 ? s : 'member', explicit: false };
  }
  var R = resolve();
  var AS = R.as;
  // </body> 앞에서 불렸으면 여기서 바로 로그인 필요 페이지를 회원으로 바꿔 깜빡임을 없앤다
  if (authMode() === 'required' && AS === 'guest' && !R.explicit) AS = 'member';
  document.documentElement.setAttribute('data-as', AS);

  /* ---------- 참여 상태 ----------
     같은 Coop이 화면마다 다른 말을 하지 않게 상태 하나를 모든 페이지가 같이 읽는다.
     none      아직 참여 전. Coop은 모집 중이고 Dashboard와 Wallet은 비어 있다 (기본값)
     requested Join 양식을 냈고 기관 인증이 남았다
     member    승인되어 학습이 진행 중인 뒤 시점. Coop은 In training이고 포인트가 쌓여 있다
     Join 양식 제출 > 인증 제출 순서로 넘어가고, Dashboard의 Leave Coop이 none으로 되돌린다.
     주소에 ?join=none|requested|member를 주면 그 상태로 바로 본다. guest는 언제나 none이다 */
  var JKEY = 'travi.join', RKEY = 'travi.role';
  var JSTATES = ['none', 'requested', 'member'];
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var JOIN = (function () {
    var p = param('join');
    if (JSTATES.indexOf(p) > -1) { put(JKEY, p); return p; }
    var s = get(JKEY);
    return JSTATES.indexOf(s) > -1 ? s : 'none';
  })();
  if (AS === 'guest') JOIN = 'none';
  var IN = JOIN === 'member';

  /* ---------- 공통 예시 데이터 (모든 페이지가 같은 값을 쓴다) ---------- */
  var USERS = {
    member: { name: 'Yujun Oh', org: 'Hongik University', email: 'yujun@hongik.example', initials: 'YO' }
  };
  // Coop은 SOC Threat Detection 하나만 둔다. 이름 끝에 Coop을 붙이지 않는다
  // 20석 = Data 12, Computing Resource 4, Model 4. 모집 중에는 12곳이 찼고, 내가 들어간 뒤(member)에는 13곳이다
  var COOPS = {
    soc: {
      id: 'soc', name: 'SOC Threat Detection', domain: 'Security',
      status: IN ? 'In training' : 'Open to join', statusKey: IN ? 'training' : 'open',
      line: 'SOCs train one attack classifier together, each on its own network flow records.',
      memberCount: IN ? 13 : 12, seats: 20,
      members: (IN ? 13 : 12) + ' of 20 members', closes: 'Joining closes Dec 2', daysLeft: '12 days left',
      round: 'Round 6 of 12',
      leader: 'Soyeon Park', contact: 'soyeon@hongik.example'
    }
  };
  // Join 양식의 자원 선택지. id는 주소와 저장에 쓰고 label은 선택지 글자, role은 역할 이름이다
  var RESOURCES = [
    { id: 'data', label: 'Data', role: 'Data Provider' },
    { id: 'compute', label: 'Computing resource', role: 'Computing Resource Provider' },
    { id: 'model', label: 'Model', role: 'Model Provider' }
  ];
  // 예시 기준일: Nov 20, 2026 (회의 날짜와 겹치지 않게). "Joining closes Dec 2"와 "12 days left"는 이 날 기준.
  // member 상태는 모집이 끝나고 학습 6라운드까지 간 뒤 시점이다 (Wallet 내역 Dec 12 ~ Jan 2)
  function myRole() {
    var id = get(RKEY), r = RESOURCES[0];
    RESOURCES.forEach(function (x) { if (x.id === id) r = x; });
    return r;
  }
  function notifsFor(as) {
    if (as === 'guest') return [];
    if (JOIN === 'requested') return [
      { unread: true, href: 'verify.html?coop=soc', text: 'Verify your organization to join SOC Threat Detection.', when: 'Today' }
    ];
    if (JOIN === 'member') return [
      { unread: false, href: 'dashboard.html', text: "Your request to join SOC Threat Detection was approved. You're in as a " + myRole().role + '.', when: 'Dec 2' }
    ];
    return [];
  }

  /* ---------- 작은 도구 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function here() {
    var u;
    try { u = new URL(location.href); u.searchParams.delete('as'); u.searchParams.delete('return'); } catch (e) { return 'index.html'; }
    return (u.pathname.split('/').pop() || 'index.html') + u.search + u.hash;
  }
  function onAuthPage() { return /(^|\/)(login|join)\.html$/.test(location.pathname); }
  function withReturn(url, ret, extra) {
    var q = [];
    if (extra) q.push(extra);
    if (ret) q.push('return=' + encodeURIComponent(ret));
    return q.length ? url + (url.indexOf('?') > -1 ? '&' : '?') + q.join('&') : url;
  }
  // return 값은 같은 사이트의 상대 경로만 받는다
  function safeReturn(v) {
    if (!v || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(v)) return null;
    return v;
  }

  /* ---------- 헤더 ---------- */
  var BRAND_SVG =
    '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<defs><linearGradient id="tv-lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1aa3d9"/><stop offset=".55" stop-color="#5b4ce0"/><stop offset="1" stop-color="#e0675e"/></linearGradient></defs>' +
    '<circle cx="16" cy="16" r="12.5" fill="none" stroke="url(#tv-lg)" stroke-width="2.4"/>' +
    '<path d="M6 22 C10 12, 14 22, 18 12 S 25 14, 26 8" fill="none" stroke="#0d1220" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="6" cy="22" r="2.2" fill="#0d1220"/><circle cx="18" cy="12" r="2.2" fill="#0d1220"/><circle cx="26" cy="8" r="2.2" fill="#e0675e"/>' +
    '</svg>';
  var BELL_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>';

  var NAV = [
    { key: 'cooperatives', label: 'AI Cooperatives', href: 'coop.html' },
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', gate: 'dashboard' },
    { key: 'wallet', label: 'Wallet', href: 'wallet.html' },
    { key: 'whitepaper', label: 'Whitepaper', href: 'whitepaper.html' }
  ];

  function navLinks(active, cls) {
    return NAV.map(function (n) {
      var on = n.key === active;
      return '<a class="' + cls + (on ? ' on' : '') + '" href="' + n.href + '"' +
        (n.gate ? ' data-gate="' + n.gate + '"' : '') +
        (on ? ' aria-current="page"' : '') + '>' + n.label + '</a>';
    }).join('');
  }

  function notifItems(list) {
    if (!list.length) return '<p class="tv-n-empty">No notifications yet</p>';
    return list.map(function (n) {
      return '<a class="tv-n' + (n.unread ? ' unread' : '') + '" href="' + esc(n.href) + '">' +
        '<span class="tv-n-dot" aria-hidden="true"></span>' +
        '<span>' + esc(n.text) + '<small>' + esc(n.when) + '</small></span></a>';
    }).join('');
  }

  function rightSide() {
    if (AS === 'guest') {
      // 로그인·가입 페이지 안에서는 지금 주소의 return을 그대로 넘긴다
      var ret = onAuthPage() ? safeReturn(param('return')) : here();
      return '<a class="btn ghost" href="' + esc(withReturn('login.html', ret)) + '">Log in</a>' +
        '<a class="btn solid" href="' + esc(withReturn('join.html', ret)) + '">Join TRAVI</a>';
    }
    var u = USERS[AS];
    var list = TRAVI.notifications;
    var unread = list.filter(function (n) { return n.unread; }).length;
    return '' +
      '<div class="dd">' +
        '<button class="tv-bell" type="button" data-dd aria-haspopup="true" aria-expanded="false" aria-controls="tv-notif" aria-label="Notifications" title="Notifications">' +
          BELL_SVG + (unread ? '<b class="tv-bell-n">' + unread + '</b>' : '') +
        '</button>' +
        '<div class="menu tv-notif" id="tv-notif" role="region" aria-label="Notifications">' +
          '<div class="tv-n-head"><span>Notifications</span>' +
            (unread ? '<button type="button" class="tv-link" data-tv-readall>Mark all as read</button>' : '') +
          '</div>' +
          '<div class="tv-n-list">' + notifItems(list) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dd">' +
        '<button class="me" type="button" data-dd aria-haspopup="true" aria-expanded="false" aria-controls="tv-me" aria-label="Account menu"><i>' + esc(u.initials) + '</i>▾</button>' +
        '<div class="menu sm" id="tv-me" role="menu">' +
          '<div class="who"><b>' + esc(u.name) + '</b><span>' + esc(u.org) + ' · ' + esc(u.email) + '</span></div>' +
          '<a class="mi" role="menuitem" href="settings.html"><span></span><span>Settings</span></a>' +
          '<a class="mi" role="menuitem" href="index.html" data-tv-logout><span></span><span>Log out</span></a>' +
        '</div>' +
      '</div>';
  }

  function renderHeader(el) {
    var active = el.getAttribute('data-active') || '';
    el.classList.add('topbar', 'tv-top');
    el.innerHTML =
      '<div class="wrap">' +
        '<a class="brand" href="index.html" aria-label="TRAVI home">' + BRAND_SVG + 'TRAVI</a>' +
        '<div class="spacer"></div>' +
        '<nav class="nav tv-nav" aria-label="Main">' + navLinks(active, 'tv-nl') + '</nav>' +
        '<div class="tv-right">' + rightSide() + '</div>' +
        '<div class="dd tv-burger-dd">' +
          '<button class="tv-burger" type="button" data-dd aria-haspopup="true" aria-expanded="false" aria-controls="tv-mnav" aria-label="Menu"><span></span><span></span><span></span></button>' +
          '<div class="menu sm tv-mnav" id="tv-mnav">' + navLinks(active, 'mi') + '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- 푸터 (Figma Footer / Full, Footer / Minimal) ----------
     아랫줄(Footer Bottom)은 모든 페이지가 같다. 메인만 그 위에 로고와 링크 묶음이 붙는다.
     Terms, Privacy, FAQ, LinkedIn, GitHub는 아직 갈 곳이 없어 #로 둔다 */
  var LINKEDIN_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.4 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7V22h-4.56v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.53 1.72-2.53 3.49V22H7.62V8z"/></svg>';
  var GITHUB_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>';
  var MAIL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/></svg>';
  var MAIL = 'contact@travi.example';
  var ORG_LINE = 'Operated by DINA Lab &amp; Neouly Inc.';
  var FOOT_COLS = [
    { h: 'Explore', links: [['AI Cooperatives', 'coop.html'], ['How It Works', 'index.html#how']] },
    { h: 'Resources', links: [['Whitepaper', 'whitepaper.html']] },
    { h: 'Help', links: [['FAQ', '#'], ['Contact Us', 'mailto:' + MAIL]] }
  ];

  function footBottom() {
    return '<div class="tv-foot-bottom">' +
      '<div class="tv-foot-copy"><span>© 2026 TRAVI</span><span>' + ORG_LINE + '</span></div>' +
      '<div class="tv-foot-links">' +
        '<a href="#">Terms of Service</a><a href="#">Privacy Policy</a>' +
        '<span class="tv-foot-social">' +
          '<a href="#" aria-label="LinkedIn" title="LinkedIn">' + LINKEDIN_SVG + '</a>' +
          '<a href="#" aria-label="GitHub" title="GitHub">' + GITHUB_SVG + '</a>' +
          '<a href="mailto:' + MAIL + '" aria-label="Email" title="Email">' + MAIL_SVG + '</a>' +
        '</span>' +
      '</div>' +
    '</div>';
  }

  function renderFooter(el) {
    var full = el.getAttribute('data-travi-footer') === 'full';
    el.className = full ? 'tv-foot full' : 'tv-foot';
    if (full && !el.id) el.id = 'contact';
    var main = '';
    if (full) {
      main = '<div class="tv-foot-main">' +
        '<div class="tv-foot-brand">' +
          '<a class="tv-foot-logo" href="index.html" aria-label="TRAVI home">' + BRAND_SVG.replace('tv-lg', 'tv-lg-f').replace('#tv-lg', '#tv-lg-f') + 'TRAVI</a>' +
          '<p>Build AI Together. Share the Value.</p>' +
        '</div>' +
        '<nav class="tv-foot-nav" aria-label="Footer">' +
          FOOT_COLS.map(function (c) {
            return '<div><b>' + c.h + '</b>' + c.links.map(function (l) {
              return '<a href="' + l[1] + '">' + l[0] + '</a>';
            }).join('') + '</div>';
          }).join('') +
        '</nav>' +
      '</div>';
    }
    el.innerHTML = '<div class="wrap">' + main + footBottom() + '</div>';
  }

  /* ---------- 드롭다운 (기존 페이지의 data-dd 메뉴도 같은 방식으로 동작) ---------- */
  function closeMenus(except) {
    document.querySelectorAll('.menu.open').forEach(function (m) { if (m !== except) m.classList.remove('open'); });
    document.querySelectorAll('[data-dd]').forEach(function (b) {
      if (!except || b.getAttribute('aria-controls') !== except.id) b.setAttribute('aria-expanded', 'false');
    });
  }
  function onDocClick(e) {
    var b = e.target.closest('[data-dd]');
    if (b) {
      e.preventDefault();
      var m = document.getElementById(b.getAttribute('aria-controls'));
      if (!m) return;
      var open = !m.classList.contains('open');
      closeMenus(open ? m : null);
      m.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open));
      return;
    }
    if (!e.target.closest('.menu')) closeMenus();

    var g = e.target.closest('[data-gate]');
    if (g && AS === 'guest') {
      e.preventDefault();
      TRAVI.gate(g.getAttribute('data-gate'), g.getAttribute('href') || g.getAttribute('data-href'),
        { extra: g.getAttribute('data-gate-extra') });
      return;
    }
    var mo = e.target.closest('[data-modal-open]');
    if (mo) { e.preventDefault(); TRAVI.openModal(mo.getAttribute('data-modal-open')); return; }
    var mc = e.target.closest('[data-modal-close]');
    if (mc) { e.preventDefault(); TRAVI.closeModal(mc.closest('dialog, .tv-modal')); return; }
    if (e.target.closest('[data-tv-logout]')) { e.preventDefault(); TRAVI.signOut(); return; }
    if (e.target.closest('[data-tv-readall]')) { e.preventDefault(); TRAVI.markAllRead(); return; }
  }

  /* ---------- 모달 (<dialog class="tv-modal">) ---------- */
  function getDialog(x) { return typeof x === 'string' ? document.getElementById(x) : x; }
  function openModal(x) {
    var d = getDialog(x);
    if (!d) return;
    closeMenus();
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); }
    else d.setAttribute('open', '');
    var f = d.querySelector('[autofocus], .btn.solid, button, a, input');
    if (f) f.focus();
  }
  function closeModal(x, value) {
    var d = getDialog(x);
    if (!d) return;
    if (typeof d.close === 'function' && d.open) d.close(value || '');
    else d.removeAttribute('open');
  }
  // 배경(대화상자 바깥)을 누르면 닫는다
  function bindBackdrop(d) {
    if (d._tvBound) return;
    d._tvBound = true;
    // .tv-modal-box가 대화상자 전체를 채우므로 dialog 자신이 눌렸다면 배경이다
    d.addEventListener('click', function (e) {
      if (e.target === d && !d.hasAttribute('data-sticky')) {
        if (d.getAttribute('data-leave')) location.href = d.getAttribute('data-leave');
        else closeModal(d);
      }
    });
  }

  /* ---------- 게스트 가입 안내 팝업 ---------- */
  var GATE_COPY = {
    dashboard: {
      h: 'Join TRAVI to see your dashboard',
      p: "Your dashboard shows training progress for the Coops you're in. Create an account to get started, or log in if you already have one."
    },
    create: {
      h: 'Join TRAVI to create a Coop',
      p: 'You need an account to create a Coop and invite members.'
    }
  };
  function ensureGate() {
    var d = document.getElementById('tv-gate');
    if (d) return d;
    d = document.createElement('dialog');
    d.id = 'tv-gate';
    d.className = 'tv-modal sm';
    d.setAttribute('aria-labelledby', 'tv-gate-h');
    d.innerHTML =
      '<div class="tv-modal-box">' +
        '<h2 class="tv-modal-title" id="tv-gate-h"></h2>' +
        '<p class="tv-modal-body" id="tv-gate-p"></p>' +
        '<div class="tv-modal-actions stack">' +
          '<a class="btn solid" id="tv-gate-join" href="join.html">Join TRAVI</a>' +
          '<a class="btn ghost" id="tv-gate-login" href="login.html">Log in</a>' +
          '<button class="tv-link" type="button" id="tv-gate-no">Not now</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    bindBackdrop(d);
    d.querySelector('#tv-gate-no').addEventListener('click', function () {
      if (d.getAttribute('data-leave')) location.href = d.getAttribute('data-leave');
      else closeModal(d);
    });
    d.addEventListener('cancel', function (e) {
      if (d.getAttribute('data-leave')) { e.preventDefault(); location.href = d.getAttribute('data-leave'); }
    });
    return d;
  }
  // kind: 'dashboard' | 'create' | 'login'. target: 회원이면 갈 주소
  function gate(kind, target, opts) {
    opts = opts || {};
    var ret = safeReturn(target) || here();
    if (kind === 'login') { location.href = withReturn('login.html', ret, opts.extra); return; }
    var c = GATE_COPY[kind] || GATE_COPY.dashboard;
    var d = ensureGate();
    d.querySelector('#tv-gate-h').textContent = c.h;
    d.querySelector('#tv-gate-p').textContent = c.p;
    d.querySelector('#tv-gate-join').setAttribute('href', withReturn('join.html', ret));
    d.querySelector('#tv-gate-login').setAttribute('href', withReturn('login.html', ret));
    if (opts.leaveTo) d.setAttribute('data-leave', opts.leaveTo); else d.removeAttribute('data-leave');
    openModal(d);
  }

  /* ---------- 토스트 ---------- */
  var toastTimer;
  function toast(msg, ms) {
    var t = document.getElementById('tv-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tv-toast';
      t.className = 'tv-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 4000);
  }

  /* ---------- 공개 객체 ---------- */
  var TRAVI = window.TRAVI = {
    as: AS,
    isGuest: AS === 'guest',
    isLeader: false, // 리더 보기는 없앴다. 옛 코드가 읽어도 깨지지 않게 값만 남긴다
    user: AS === 'guest' ? null : USERS[AS],
    users: USERS,
    coops: COOPS,
    resources: RESOURCES,
    notifications: notifsFor(AS),
    // 참여 상태와 고른 자원. 값을 바꾼 쪽이 화면을 다시 그리거나 다른 페이지로 넘어간다
    join: JOIN,
    role: myRole(),
    setJoin: function (v, roleId) {
      if (JSTATES.indexOf(v) < 0) return;
      put(JKEY, v);
      if (roleId) put(RKEY, roleId);
    },
    param: param,
    toast: toast,
    gate: gate,
    openModal: openModal,
    closeModal: closeModal,
    // 로그인 흉내: 상태를 저장하고 return 주소(없으면 기본값)로 간다
    signIn: function (role, fallback) {
      store('member');
      location.href = safeReturn(param('return')) || fallback || 'dashboard.html';
    },
    signOut: function () { store('guest'); location.href = 'index.html'; },
    notify: function (item) {
      TRAVI.notifications.unshift({ unread: true, href: item.href || '#', text: item.text, when: item.when || 'Just now' });
      refreshHeader();
    },
    markAllRead: function () {
      TRAVI.notifications.forEach(function (n) { n.unread = false; });
      refreshHeader(true);
    },
    setNotifications: function (list) { TRAVI.notifications = list.slice(); refreshHeader(); }
  };

  function refreshHeader(keepOpen) {
    var el = document.querySelector('[data-travi-header]');
    if (!el) return;
    renderHeader(el);
    if (keepOpen) {
      var m = document.getElementById('tv-notif');
      var b = document.querySelector('[aria-controls="tv-notif"]');
      if (m && b) { m.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
    }
  }

  /* ---------- 시작 ---------- */
  function init() {
    // 로그인이 필요한 페이지: 주소로 guest를 고르지 않았으면 회원으로 본다
    var mode = authMode();
    if (mode === 'required' && AS === 'guest' && !R.explicit) {
      AS = 'member';
      document.documentElement.setAttribute('data-as', AS);
      TRAVI.as = AS; TRAVI.isGuest = false;
      TRAVI.user = USERS[AS]; TRAVI.notifications = notifsFor(AS);
    }

    document.querySelectorAll('[data-travi-header]').forEach(renderHeader);
    document.querySelectorAll('[data-travi-footer]').forEach(renderFooter);
    document.querySelectorAll('dialog.tv-modal').forEach(bindBackdrop);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });

    // 게스트가 로그인 필요 페이지를 ?as=guest로 열었을 때
    if (mode === 'required' && AS === 'guest') {
      var g = document.body.getAttribute('data-auth-gate');
      if (g) gate(g, here(), { leaveTo: 'index.html' });
      else location.replace(withReturn('login.html', here()));
    }
    document.dispatchEvent(new CustomEvent('travi:ready', { detail: { as: AS } }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
