(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header gets a hairline once you scroll
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Day / night toggle. With motion allowed, the new theme grows out from the button.
  var btn = document.getElementById('theme-toggle');
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode');
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }
  apply(root.getAttribute('data-theme') || 'light');
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition) { apply(next); return; }
    var r = btn.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = document.startViewTransition(function () { apply(next); });
    if (reduce) return; // reduced motion: simple crossfade
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  // Reveal on scroll
  var els = [].slice.call(document.querySelectorAll('.reveal, .intro'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Category filters: fade projects out/in, then hide/show them
  var filters = document.querySelector('.filters');
  if (filters) {
    var posts = [].slice.call(document.querySelectorAll('.feed .post'));
    var empty = document.querySelector('.empty');
    var buttons = [].slice.call(filters.querySelectorAll('button'));
    var setPost = function (p, show) {
      clearTimeout(p._t);
      if (show) {
        p.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.remove('is-out'); }); });
      } else {
        p.classList.add('is-out');
        p._t = setTimeout(function () { p.hidden = true; }, 320);
      }
    };
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var f = btn.getAttribute('data-filter');
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      var shown = 0;
      posts.forEach(function (p) {
        var match = f === 'all' || (p.getAttribute('data-cats') || '').split(',').indexOf(f) > -1;
        if (match) shown++;
        setPost(p, match);
      });
      empty.hidden = shown > 0;
    });
  }
})();
