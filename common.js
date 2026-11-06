/* 스크롤하면 .reveal 요소를 하나씩 드러낸다. 관찰기를 못 쓰면 전부 바로 보인다 */
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  items.forEach(function (el) { io.observe(el); });
})();
