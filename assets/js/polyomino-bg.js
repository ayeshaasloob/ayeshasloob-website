// Polyomino background: faint tetromino and pentomino pieces drifting slowly
// upwards behind the page. Each style decides whether to show it and in what
// colour, through CSS on .poly-bg (color = outline, --poly-accent = filled cell,
// opacity = strength). Styles that hide .poly-bg cost nothing: the loop pauses.
(function () {
  var canvas = document.querySelector('.poly-bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Cell coordinates of each piece: T, L, S, O, I tetrominoes; X, Z, U, V, W, P pentominoes.
  var SHAPES = [
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0]],
    [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]
  ];

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pieces = [];
  var width = 0, height = 0, outline = '#000', accent = '#000';
  var last = 0, frame = 0, running = false;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makePiece(startBelow) {
    var cells = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    // Centre the piece on its own origin so it rotates about its middle.
    var cx = 0, cy = 0;
    cells.forEach(function (c) { cx += c[0]; cy += c[1]; });
    cx = cx / cells.length + 0.5; cy = cy / cells.length + 0.5;
    return {
      cells: cells, cx: cx, cy: cy,
      size: rand(14, 26),
      x: rand(0, width),
      y: startBelow ? height + rand(40, 160) : rand(0, height),
      speed: rand(5, 12),                       // px per second, upwards
      angle: Math.floor(rand(0, 4)) * Math.PI / 2,
      spin: rand(-0.06, 0.06),                  // radians per second
      filled: Math.random() < 0.6 ? Math.floor(rand(0, cells.length)) : -1
    };
  }

  function readColours() {
    var cs = getComputedStyle(canvas);
    outline = cs.color;
    accent = cs.getPropertyValue('--poly-accent').trim() || outline;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.max(8, Math.min(26, Math.round(width * height / 55000)));
    while (pieces.length < target) pieces.push(makePiece(false));
    pieces.length = target;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.25;
    pieces.forEach(function (p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      p.cells.forEach(function (c, i) {
        var x = (c[0] - p.cx) * p.size, y = (c[1] - p.cy) * p.size;
        if (i === p.filled) { ctx.fillStyle = accent; ctx.fillRect(x, y, p.size, p.size); }
        ctx.strokeStyle = outline;
        ctx.strokeRect(x + 0.5, y + 0.5, p.size - 1, p.size - 1);
      });
      ctx.restore();
    });
  }

  function step(dt) {
    pieces.forEach(function (p, i) {
      p.y -= p.speed * dt;
      p.angle += p.spin * dt;
      if (p.y < -p.size * 4) pieces[i] = makePiece(true);
    });
  }

  function visible() {
    return !document.hidden && getComputedStyle(canvas).display !== 'none';
  }

  function tick(now) {
    if (!visible()) { running = false; return; }
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (frame++ % 60 === 0) readColours();   // picks up theme or style changes
    step(dt);
    draw();
    requestAnimationFrame(tick);
  }

  function start() {
    if (!visible()) return;
    readColours();
    if (reduceMotion.matches) { draw(); return; }  // one still frame
    if (running) return;
    running = true; last = 0;
    requestAnimationFrame(tick);
  }

  resize();
  start();
  window.addEventListener('resize', function () { resize(); if (reduceMotion.matches) start(); });
  document.addEventListener('visibilitychange', start);
  // The style switcher swaps the stylesheet; restart once the new one has loaded.
  var theme = document.getElementById('theme-css');
  if (theme) theme.addEventListener('load', function () { readColours(); start(); });
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', start);
})();
