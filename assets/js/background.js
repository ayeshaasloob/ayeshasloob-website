// Animated page background, drawn on <canvas class="bg-anim" data-scene="...">.
//
// Scenes:
//   polyominoes  - faint tetromino and pentomino pieces drifting upwards
//   edge-ideals  - a slowly moving graph on vertices x1, x2, ...; when two vertices
//                  come close an edge forms and its monomial x_i x_j (a generator of
//                  the graph's edge ideal) appears briefly beside it
//   none         - nothing
//
// Each style decides whether to show the canvas and in what colour, through CSS on
// .bg-anim: color = lines, --bg-accent = highlights, opacity = overall strength.
// The loop pauses when the canvas is hidden or the tab is in the background, and
// draws a single still frame for visitors who prefer reduced motion.
(function () {
  var canvas = document.querySelector('.bg-anim');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---------------------------------------------------------------- polyominoes
  function polyominoes() {
    // T, L, S, O, I tetrominoes; X, Z, U, V, W, P pentominoes.
    var SHAPES = [
      [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2]],
      [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0]], [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0]],
      [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]
    ];
    var pieces = [], w = 0, h = 0;

    function make(startBelow) {
      var cells = SHAPES[Math.floor(Math.random() * SHAPES.length)], cx = 0, cy = 0;
      cells.forEach(function (c) { cx += c[0]; cy += c[1]; });
      return {
        cells: cells, cx: cx / cells.length + 0.5, cy: cy / cells.length + 0.5,
        size: rand(14, 26), x: rand(0, w),
        y: startBelow ? h + rand(40, 160) : rand(0, h),
        speed: rand(5, 12), angle: Math.floor(rand(0, 4)) * Math.PI / 2, spin: rand(-0.06, 0.06),
        filled: Math.random() < 0.6 ? Math.floor(rand(0, cells.length)) : -1
      };
    }

    return {
      resize: function (W, H) {
        w = W; h = H;
        var target = Math.max(8, Math.min(26, Math.round(w * h / 55000)));
        while (pieces.length < target) pieces.push(make(false));
        pieces.length = target;
      },
      step: function (dt) {
        pieces.forEach(function (p, i) {
          p.y -= p.speed * dt; p.angle += p.spin * dt;
          if (p.y < -p.size * 4) pieces[i] = make(true);
        });
      },
      draw: function (c, line, accent) {
        c.lineWidth = 1.25;
        pieces.forEach(function (p) {
          c.save(); c.translate(p.x, p.y); c.rotate(p.angle);
          p.cells.forEach(function (cell, i) {
            var x = (cell[0] - p.cx) * p.size, y = (cell[1] - p.cy) * p.size;
            if (i === p.filled) { c.fillStyle = accent; c.fillRect(x, y, p.size, p.size); }
            c.strokeStyle = line; c.strokeRect(x + 0.5, y + 0.5, p.size - 1, p.size - 1);
          });
          c.restore();
        });
      }
    };
  }

  // ---------------------------------------------------------------- edge ideals
  function edgeIdeals() {
    var SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    var LABEL_TIME = 4;      // seconds a new edge's monomial stays visible
    var MAX_LABELS = 5;
    var nodes = [], edges = {}, labels = [], w = 0, h = 0, reach = 160, time = 0;

    function sub(n) { return String(n).split('').map(function (d) { return SUB[+d]; }).join(''); }
    function variable(n) { return 'x' + sub(n); }

    function makeNode(i) {
      var a = rand(0, Math.PI * 2), v = rand(6, 13);
      return { i: i, x: rand(0, w), y: rand(0, h), vx: Math.cos(a) * v, vy: Math.sin(a) * v };
    }

    function distance(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

    function updateEdges(announce) {
      var now = {};
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var d = distance(nodes[a], nodes[b]);
          if (d < reach) {
            var key = a + '-' + b;
            now[key] = d;
            if (announce && !(key in edges) && labels.length < MAX_LABELS) {
              labels.push({ a: a, b: b, born: time });
            }
          }
        }
      }
      edges = now;
      labels = labels.filter(function (l) { return time - l.born < LABEL_TIME && ((l.a + '-' + l.b) in edges); });
    }

    return {
      resize: function (W, H) {
        w = W; h = H;
        reach = Math.max(120, Math.min(190, w / 8));
        var target = Math.max(10, Math.min(30, Math.round(w * h / 42000)));
        while (nodes.length < target) nodes.push(makeNode(nodes.length + 1));
        nodes.length = target;
        updateEdges(false);
        if (reduceMotion.matches) {
          // Still frame: label the shortest few edges.
          labels = Object.keys(edges).sort(function (p, q) { return edges[p] - edges[q]; })
            .slice(0, MAX_LABELS).map(function (k) {
              var ab = k.split('-'); return { a: +ab[0], b: +ab[1], born: time - 1, still: true };
            });
        }
      },
      step: function (dt) {
        time += dt;
        var m = 40;
        nodes.forEach(function (n) {
          n.x += n.vx * dt; n.y += n.vy * dt;
          if (n.x < -m) n.x = w + m; else if (n.x > w + m) n.x = -m;
          if (n.y < -m) n.y = h + m; else if (n.y > h + m) n.y = -m;
        });
        updateEdges(true);
      },
      draw: function (c, line, accent) {
        // Edges, fading with length
        c.lineWidth = 1.1;
        c.strokeStyle = line;
        Object.keys(edges).forEach(function (k) {
          var ab = k.split('-'), p = nodes[+ab[0]], q = nodes[+ab[1]];
          c.globalAlpha = Math.pow(1 - edges[k] / reach, 1.2);
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
        });
        // Vertices and their variables
        c.globalAlpha = 1;
        c.fillStyle = line;
        c.font = 'italic 13px "STIX Two Text", "Times New Roman", Georgia, serif';
        c.textBaseline = 'middle';
        nodes.forEach(function (n) {
          c.beginPath(); c.arc(n.x, n.y, 3, 0, Math.PI * 2); c.fill();
          c.fillText(variable(n.i), n.x + 6, n.y - 9);
        });
        // Monomials of newly formed edges: x_i x_j
        c.fillStyle = accent;
        c.font = 'italic 15px "STIX Two Text", "Times New Roman", Georgia, serif';
        c.textAlign = 'center';
        labels.forEach(function (l) {
          var p = nodes[l.a], q = nodes[l.b], age = time - l.born;
          var fade = l.still ? 1 : Math.min(1, age / 0.6, (LABEL_TIME - age) / 0.8);
          var i = Math.min(p.i, q.i), j = Math.max(p.i, q.i);
          var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
          var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
          c.globalAlpha = Math.max(0, fade);
          c.fillText(variable(i) + variable(j), mx - dy / len * 12, my + dx / len * 12);
        });
        c.globalAlpha = 1;
        c.textAlign = 'start';
      }
    };
  }

  // ---------------------------------------------------------------- engine
  var SCENES = { 'polyominoes': polyominoes, 'edge-ideals': edgeIdeals };
  var scene = null, width = 0, height = 0, line = '#000', accent = '#000';
  var last = 0, frame = 0, running = false;

  function readColours() {
    var cs = getComputedStyle(canvas);
    line = cs.color;
    accent = cs.getPropertyValue('--bg-accent').trim() || line;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (scene) scene.resize(width, height);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    if (scene) scene.draw(ctx, line, accent);
  }

  function visible() {
    return scene && !document.hidden && getComputedStyle(canvas).display !== 'none';
  }

  function tick(now) {
    if (!visible()) { running = false; return; }
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (frame++ % 60 === 0) readColours();   // picks up theme or style changes
    scene.step(dt);
    draw();
    requestAnimationFrame(tick);
  }

  function start() {
    if (!visible()) { ctx.clearRect(0, 0, width, height); return; }
    readColours();
    if (reduceMotion.matches) { draw(); return; }
    if (running) return;
    running = true; last = 0;
    requestAnimationFrame(tick);
  }

  function setScene(name) {
    canvas.dataset.scene = name;
    scene = SCENES[name] ? SCENES[name]() : null;
    resize();
    start();
  }

  setScene(canvas.dataset.scene || 'polyominoes');
  window.addEventListener('resize', function () { resize(); if (reduceMotion.matches) start(); });
  document.addEventListener('visibilitychange', start);
  // The style switcher swaps the stylesheet or the scene; react to both.
  var theme = document.getElementById('theme-css');
  if (theme) theme.addEventListener('load', function () { readColours(); start(); });
  document.addEventListener('bg-scene-change', function (e) { setScene(e.detail); });
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', function () { resize(); start(); });
})();
