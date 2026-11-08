/* 앱 화면 공통: 헤더 드롭다운(역할 전환, 계정 메뉴) 열고 닫기 */
(function () {
function closeMenus() {
  document.querySelectorAll('.menu.open').forEach(function (m) { m.classList.remove('open'); });
  document.querySelectorAll('[data-dd]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
}
document.querySelectorAll('[data-dd]').forEach(function (b) {
  b.addEventListener('click', function (e) {
    e.stopPropagation();
    var m = document.getElementById(b.getAttribute('aria-controls')), open = !m.classList.contains('open');
    closeMenus();
    if (open) { m.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
  });
});
document.addEventListener('click', function (e) { if (!e.target.closest('.menu')) closeMenus(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
})();
