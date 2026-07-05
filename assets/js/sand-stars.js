/* ==========================================================================
   sand-stars.js — the sandcassall sky
   Particles that read as stars in the night sky *and* as grains of sand
   drifting down a dune. Three parallax depth layers, gentle twinkle,
   a breath of wind from the cursor. Honors prefers-reduced-motion.
   ========================================================================== */

(function () {
  "use strict";

  var canvas = document.getElementById("sand-sky");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Drift direction — the original site's stars traveled (750, 600); keep
  // that same down-right diagonal so the sky still "pours" like sand.
  var DIR_X = 0.78, DIR_Y = 0.62;

  // Palette: mostly cool starlight, some warm sand grains, a little pink.
  var COLORS = [
    { c: "236, 234, 244", w: 0.55 },  // starlight
    { c: "207, 216, 255", w: 0.15 },  // cool blue-white
    { c: "232, 179, 106", w: 0.20 },  // sand gold
    { c: "242, 160, 189", w: 0.10 }   // dusk pink
  ];

  function pickColor() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < COLORS.length; i++) {
      acc += COLORS[i].w;
      if (r <= acc) return COLORS[i].c;
    }
    return COLORS[0].c;
  }

  var W = 0, H = 0, DPR = 1;
  var particles = [];
  var pointer = { x: -9999, y: -9999, active: false };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function build() {
    var target = Math.min(230, Math.round((W * H) / 8500));
    particles = [];
    for (var i = 0; i < target; i++) particles.push(makeParticle(true));
  }

  function makeParticle(anywhere) {
    // depth: 0 = far (small, slow, dim) .. 1 = near (bigger, faster, brighter)
    var z = Math.pow(Math.random(), 1.6);
    var speed = 14 + z * 46; // px/s along the drift diagonal
    var p = {
      z: z,
      x: 0, y: 0,
      vx: DIR_X * speed,
      vy: DIR_Y * speed,
      ox: 0, oy: 0,           // wind offset (cursor)
      ovx: 0, ovy: 0,
      r: 0.5 + z * 1.6,
      color: pickColor(),
      baseA: 0.25 + z * 0.6,
      twSpeed: 0.4 + Math.random() * 1.6,
      twPhase: Math.random() * Math.PI * 2
    };
    place(p, anywhere);
    return p;
  }

  function place(p, anywhere) {
    if (anywhere) {
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      return;
    }
    // Re-enter along the top or left edge so the pour never runs dry.
    if (Math.random() < W / (W + H)) {
      p.x = Math.random() * W;
      p.y = -6;
    } else {
      p.x = -6;
      p.y = Math.random() * H;
    }
  }

  var WIND_R = 130, WIND_R2 = WIND_R * WIND_R;

  function step(dt, t) {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Cursor wind: a soft radial push, springing back when the wind passes.
      if (pointer.active) {
        var dx = (p.x + p.ox) - pointer.x;
        var dy = (p.y + p.oy) - pointer.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < WIND_R2 && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var f = (1 - d / WIND_R) * 900 * (0.4 + p.z);
          p.ovx += (dx / d) * f * dt;
          p.ovy += (dy / d) * f * dt;
        }
      }
      p.ovx -= p.ox * 4.5 * dt;   // spring home
      p.ovy -= p.oy * 4.5 * dt;
      p.ovx *= Math.max(0, 1 - 2.8 * dt); // damping
      p.ovy *= Math.max(0, 1 - 2.8 * dt);
      p.ox += p.ovx * dt;
      p.oy += p.ovy * dt;

      if (p.x > W + 8 || p.y > H + 8) place(p, false);

      var tw = 0.72 + 0.28 * Math.sin(t * p.twSpeed + p.twPhase);
      ctx.globalAlpha = p.baseA * tw;
      ctx.fillStyle = "rgb(" + p.color + ")";
      ctx.beginPath();
      ctx.arc(p.x + p.ox, p.y + p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.baseA;
      ctx.fillStyle = "rgb(" + p.color + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt, now / 1000);
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);

  if (!reduceMotion) {
    window.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }, { passive: true });
    window.addEventListener("pointerleave", function () {
      pointer.active = false;
    });
  }

  resize();
  if (reduceMotion) {
    drawStatic();
  } else {
    requestAnimationFrame(frame);
  }
})();

/* --------------------------------------------------------------------------
   Shared page behaviors: nav scroll state + reveal-on-scroll
   -------------------------------------------------------------------------- */

(function () {
  "use strict";

  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("scrolled", window.scrollY > 24);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
})();
