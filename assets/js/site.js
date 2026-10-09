// Small enhancements. The site works without JavaScript; this adds the mobile menu,
// clickable email links, and publication filtering and BibTeX copying.
(function () {
  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Email links: the address is stored reversed in data attributes.
  var reverse = function (s) { return s.split('').reverse().join(''); };
  document.querySelectorAll('.email[data-u]').forEach(function (el) {
    var addr = reverse(el.dataset.u) + '@' + reverse(el.dataset.d);
    var a = document.createElement('a');
    a.href = 'mailto:' + addr;
    a.textContent = addr;
    el.replaceWith(a);
  });

  // BibTeX toggle and copy
  document.querySelectorAll('.bib-toggle').forEach(function (btn) {
    var box = btn.closest('.pub').querySelector('.bibtex');
    btn.addEventListener('click', function () {
      box.hidden = !box.hidden;
      btn.setAttribute('aria-expanded', String(!box.hidden));
    });
  });
  document.querySelectorAll('.copy-button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
      }, function () {
        btn.textContent = 'Select and copy';
      });
    });
  });

  // Publication filter and search
  var controls = document.querySelector('.pub-controls');
  if (!controls) return;
  controls.hidden = false;
  var pubs = Array.prototype.slice.call(document.querySelectorAll('.pub'));
  var groups = document.querySelectorAll('.pub-group');
  var buttons = controls.querySelectorAll('[data-filter]');
  var search = document.getElementById('pub-search');
  var count = document.getElementById('pub-count');
  var filter = 'all';
  // Search the citation only, not the hidden BibTeX.
  var haystack = pubs.map(function (p) {
    return ['.pub-authors', '.pub-title', '.pub-venue'].map(function (s) {
      return p.querySelector(s).textContent;
    }).join(' ').toLowerCase();
  });

  function apply() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;
    pubs.forEach(function (p, i) {
      var ok = (filter === 'all' || p.dataset.status === filter) &&
               (!q || haystack[i].includes(q));
      p.hidden = !ok;
      if (ok) shown++;
    });
    groups.forEach(function (g) { g.hidden = !g.querySelector('.pub:not([hidden])'); });
    count.textContent = (filter === 'all' && !q) ? '' : shown + ' of ' + pubs.length + ' shown';
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.dataset.filter;
      buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      apply();
    });
  });
  search.addEventListener('input', apply);
})();
