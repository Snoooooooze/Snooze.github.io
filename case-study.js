/* Renders a case study from a plain-text Markdown file: case-study.html?p=name  ->  content/name.md */
(function () {
  var main = document.getElementById('cs');
  var slug = (new URLSearchParams(location.search).get('p') || '').replace(/[^a-z0-9_-]/gi, '');
  var CATS = { 'service design': 'service-design', 'automotive': 'automotive', 'consumer': 'consumer', 'government': 'government', 'education': 'education' };
  var IMG = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function safeUrl(u) { u = u.trim(); return (/^(https?:\/\/|mailto:|#)/i.test(u) || /^[\w\-.\/]+$/.test(u)) ? u : '#'; }
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      var ext = /^https?:/i.test(u);
      return '<a href="' + safeUrl(u) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
    });
    return s;
  }
  function figure(alt, src, cls) {
    return '<figure class="fig reveal ' + (cls || '') + '"><div class="media"><div class="media-inner"><img src="' + safeUrl(src) + '" alt="' + esc(alt) + '" loading="lazy"></div></div>' +
      (alt ? '<figcaption>' + inline(alt) + '</figcaption>' : '') + '</figure>';
  }
  function parseFront(text) {
    text = text.replace(/\r\n?/g, '\n').replace(/^\s+/, '');
    var m = text.match(/^(---|\+\+\+)[ \t]*\n([\s\S]*?)\n\1[ \t]*(\n|$)/), meta = {};
    if (m) {
      m[2].split('\n').forEach(function (l) { var i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); });
      text = text.slice(m[0].length);
    }
    return { meta: meta, body: text };
  }
  function isBlock(l) { return /^#{2,3}\s/.test(l) || /^>/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l) || IMG.test(l) || /^---+\s*$/.test(l); }

  function renderBody(body) {
    var lines = body.replace(/<!--[\s\S]*?-->/g, '').split('\n'), out = [], i = 0, m;
    while (i < lines.length) {
      var l = lines[i];
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(/^(#{2,3})\s+(.*)$/))) { out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
      if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (IMG.test(l)) {
        var imgs = [];
        while (i < lines.length && IMG.test(lines[i])) { imgs.push(lines[i].match(IMG)); i++; }
        out.push(imgs.length === 1 ? figure(imgs[0][1], imgs[0][2]) : '<div class="gallery">' + imgs.map(function (g) { return figure(g[1], g[2]); }).join('') + '</div>');
        continue;
      }
      if (/^>/.test(l)) {
        var q = [];
        while (i < lines.length && /^>/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote class="feature">' + q.join('\n').split(/\n\s*\n/).map(function (p) { return '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>'; }).join('') + '</blockquote>');
        continue;
      }
      if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
        var ordered = /^\s*\d+\./.test(l), items = [];
        while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
          items.push('<li>' + inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '')) + '</li>'); i++;
        }
        out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !isBlock(lines[i])) { para.push(lines[i].trim()); i++; }
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  function build(md) {
    var f = parseFront(md), meta = f.meta, h = '';
    var cats = (meta.categories || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean);
    var tags = (meta.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    var pills = cats.map(function (c) { var s = CATS[c.toLowerCase()]; return '<li class="cat' + (s ? ' c-' + s : '') + '">' + esc(c) + '</li>'; })
      .concat(tags.map(function (t) { return '<li>' + esc(t) + '</li>'; })).join('');
    h += '<header class="cs-head"><a class="back" href="index.html#work">&larr; All projects</a>';
    if (pills) h += '<ul class="tags">' + pills + '</ul>';
    h += '<h1 class="cs-title">' + esc(meta.title || 'Untitled project') + '</h1>';
    if (meta.summary) h += '<p class="cs-lead">' + inline(meta.summary) + '</p>';
    if (meta.notice) h += '<p class="notice">' + inline(meta.notice) + '</p>';
    if (meta.cover) h += figure(meta['cover-caption'] || '', meta.cover, 'cs-cover');
    var facts = [['Role', meta.role], ['Company', meta.company], ['Timeline', meta.timeline], ['Release', meta.release], ['Team', meta.team], ['Tools', meta.tools]].filter(function (x) { return x[1]; });
    if (facts.length) h += '<dl class="facts">' + facts.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + inline(x[1]) + '</dd></div>'; }).join('') + '</dl>';
    h += '</header><div class="prose">' + renderBody(f.body) + '</div>';
    h += '<div class="cs-end">' + (meta.next ? '<a class="next-link" href="case-study.html?p=' + esc(meta.next.replace(/[^a-z0-9_-]/gi, '')) + '"><span>Next project</span>' + esc(meta['next-title'] || meta.next) + ' &rarr;</a>' : '<a class="next-link" href="index.html#work">&larr; Back to all projects</a>') + '</div>';
    document.title = (meta.title || 'Case study') + ' – JerryLee Anglin';
    main.innerHTML = h;

    // Missing images become a labelled placeholder instead of a broken icon
    [].forEach.call(main.querySelectorAll('img'), function (img) {
      function fail() {
        var name = (img.getAttribute('src') || '').split('/').pop();
        img.parentNode.innerHTML = '<div class="ph">Add image: ' + esc(name) + '</div>';
      }
      function mark() { var med = img.closest('.media'); if (med) med.classList.add('is-ph'); }
      img.addEventListener('error', function () { mark(); fail(); });
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { mark(); fail(); }
    });
    if (window.revealObserve) window.revealObserve(main.querySelectorAll('.reveal'));
  }

  function missing(msg) {
    main.innerHTML = '<a class="back" href="index.html#work">&larr; All projects</a><p class="cs-missing">' + msg + '</p>';
  }

  var inlineMd = document.getElementById('md-inline');
  if (inlineMd) { build(inlineMd.textContent); return; }
  if (!slug) { missing('No case study selected.'); return; }
  fetch('content/' + slug + '.md', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(build)
    .catch(function () { missing('This case study isn\u2019t written yet. Check back soon.'); });
})();
