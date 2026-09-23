// Concept viewer for the home page.
// Draws a SYNTHETIC axial abdominal slice (procedural shapes + noise, no patient data),
// then overlays either a hard sphere (the baseline's pseudo-label shape) or a soft contour
// with a graded confidence band — the idea Soft Contour Lab is researching.
(function () {
  var canvas = document.getElementById("ct");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var S = 0;            // canvas size in device pixels
  var base = null;      // offscreen canvas with the rendered slice
  var mode = "soft";
  var t0 = 0;
  var raf = 0;

  // Deterministic PRNG so the slice looks identical on every load.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Irregular lesion outline in unit coordinates: a lobulated blob with one
  // infiltrative extension — the kind of shape a sphere cannot represent.
  var L = { x: 0.525, y: 0.548, r: 0.052 };
  function lesionR(th) {
    var ext = 0.55 * Math.exp(-Math.pow(angDiff(th, -0.35), 2) / 0.07);
    return L.r * (1 + 0.14 * Math.sin(3 * th + 0.6) + 0.08 * Math.sin(5 * th + 2.1) + 0.04 * Math.sin(8 * th + 0.3) + ext);
  }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function lesionPath(c, scale, cx, cy) {
    c.beginPath();
    for (var i = 0; i <= 180; i++) {
      var th = (i / 180) * Math.PI * 2;
      var r = lesionR(th) * scale * S;
      var x = cx * S + Math.cos(th) * r, y = cy * S + Math.sin(th) * r;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  }
  // Equal-area circle, as a volume-matched sphere would be on this slice.
  function sphereRadius() {
    var a = 0, n = 720;
    for (var i = 0; i < n; i++) { var r = lesionR((i / n) * Math.PI * 2); a += 0.5 * r * r * (2 * Math.PI / n); }
    return Math.sqrt(a / Math.PI);
  }

  function blob(c, cx, cy, rx, ry, rot, fill, wob, seed) {
    var R = rng(seed);
    var k1 = R() * 6, k2 = R() * 6;
    c.save(); c.translate(cx * S, cy * S); c.rotate(rot || 0);
    c.beginPath();
    for (var i = 0; i <= 120; i++) {
      var th = (i / 120) * Math.PI * 2;
      var w = 1 + (wob || 0) * (Math.sin(3 * th + k1) * 0.6 + Math.sin(5 * th + k2) * 0.4);
      var x = Math.cos(th) * rx * S * w, y = Math.sin(th) * ry * S * w;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
  }
  function g(v) { return "rgb(" + v + "," + v + "," + v + ")"; }

  function renderBase() {
    base = document.createElement("canvas");
    base.width = base.height = S;
    var c = base.getContext("2d");
    c.fillStyle = "#000"; c.fillRect(0, 0, S, S);
    c.filter = "blur(" + (S * 0.0028) + "px)";

    // body outline: skin, subcutaneous fat, muscle wall, abdominal contents
    blob(c, 0.5, 0.53, 0.445, 0.335, 0, g(92), 0.02, 1);
    blob(c, 0.5, 0.53, 0.43, 0.32, 0, g(46), 0.02, 2);
    blob(c, 0.5, 0.535, 0.385, 0.28, 0, g(104), 0.03, 3);
    blob(c, 0.5, 0.53, 0.365, 0.26, 0, g(88), 0.04, 4);

    // liver (image left = patient right) and spleen
    blob(c, 0.28, 0.46, 0.16, 0.16, -0.3, g(124), 0.05, 5);
    blob(c, 0.77, 0.5, 0.07, 0.1, 0.4, g(122), 0.05, 6);
    // stomach / bowel with air pockets
    blob(c, 0.62, 0.37, 0.12, 0.075, 0.2, g(72), 0.08, 7);
    blob(c, 0.64, 0.35, 0.05, 0.03, 0.2, g(6), 0.15, 8);
    blob(c, 0.42, 0.33, 0.06, 0.04, 0, g(78), 0.1, 9);
    blob(c, 0.4, 0.325, 0.022, 0.016, 0, g(8), 0.1, 10);
    // kidneys with brighter cortex
    blob(c, 0.31, 0.67, 0.055, 0.075, 0.35, g(150), 0.04, 11);
    blob(c, 0.31, 0.67, 0.03, 0.045, 0.35, g(108), 0.05, 12);
    blob(c, 0.7, 0.67, 0.055, 0.075, -0.35, g(150), 0.04, 13);
    blob(c, 0.7, 0.67, 0.03, 0.045, -0.35, g(108), 0.05, 14);
    // pancreas: an elongated band across the midline
    c.save();
    c.translate(0.56 * S, 0.53 * S); c.rotate(-0.22);
    blob(c, 0, 0, 0.14, 0.035, 0, g(116), 0.12, 15);
    c.restore();
    // vessels (contrast-enhanced, bright)
    blob(c, 0.47, 0.625, 0.024, 0.024, 0, g(196), 0, 16);   // aorta
    blob(c, 0.56, 0.615, 0.028, 0.02, 0, g(172), 0, 17);    // IVC
    blob(c, 0.515, 0.5, 0.012, 0.012, 0, g(186), 0, 18);    // SMA
    // spine
    blob(c, 0.5, 0.745, 0.052, 0.045, 0, g(222), 0.02, 19);
    blob(c, 0.5, 0.745, 0.032, 0.026, 0, g(150), 0.05, 20);
    blob(c, 0.5, 0.815, 0.02, 0.035, 0, g(210), 0.1, 21);
    blob(c, 0.44, 0.8, 0.03, 0.012, 0.5, g(200), 0.1, 22);
    blob(c, 0.56, 0.8, 0.03, 0.012, -0.5, g(200), 0.1, 23);
    // paraspinal muscles
    blob(c, 0.41, 0.77, 0.05, 0.04, 0.2, g(98), 0.05, 24);
    blob(c, 0.59, 0.77, 0.05, 0.04, -0.2, g(98), 0.05, 25);

    // the lesion: hypodense relative to pancreas
    c.fillStyle = g(84);
    lesionPath(c, 1, L.x, L.y); c.fill();
    c.filter = "none";

    // acquisition-style noise
    var img = c.getImageData(0, 0, S, S), d = img.data, R = rng(42);
    for (var i = 0; i < d.length; i += 4) {
      if (d[i] < 3) continue;
      var n = (R() + R() + R() - 1.5) * 26;
      var v = Math.max(0, Math.min(255, d[i] + n));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    c.putImageData(img, 0, 0);
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.round(Math.max(280, Math.min(rect.width, 560)) * dpr);
    if (size === S) return;
    S = canvas.width = canvas.height = size;
    renderBase();
  }

  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3); }

  function draw(now) {
    var t = reduce ? 99 : (now - t0) / 1000;
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(base, 0, 0);

    var scan = ease(t / 1.4);           // 0–1.4 s: scan sweep
    var line = ease((t - 1.3) / 1.1);   // 1.3–2.4 s: contour draws in
    var band = ease((t - 2.1) / 0.9);   // 2.1–3.0 s: graded band fades in

    if (scan < 1) {
      var y = scan * S;
      var grd = ctx.createLinearGradient(0, y - S * 0.12, 0, y);
      grd.addColorStop(0, "rgba(255,122,77,0)");
      grd.addColorStop(1, "rgba(255,122,77,0.18)");
      ctx.fillStyle = grd; ctx.fillRect(0, y - S * 0.12, S, S * 0.12);
      ctx.fillStyle = "rgba(255,179,138,0.8)"; ctx.fillRect(0, y - 1, S, Math.max(1, S / 400));
    }

    var lw = Math.max(1.5, S / 260);
    if (mode === "soft") {
      // graded band: many faint contours between 1.0× and 1.4×, fading outward
      if (band > 0) {
        var breathe = reduce ? 0 : 0.015 * Math.sin(t * 1.6);
        for (var k = 14; k >= 1; k--) {
          var s = 1 + (k / 14) * (0.55 + breathe);
          ctx.strokeStyle = "rgba(255,122,77," + (0.42 * band * Math.pow(1 - k / 15, 1.4)) + ")";
          ctx.lineWidth = lw * 2.6;
          lesionPath(ctx, s, L.x, L.y); ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,122,77," + 0.26 * band + ")";
        lesionPath(ctx, 1, L.x, L.y); ctx.fill();
      }
      if (line > 0) {
        lesionPath(ctx, 1, L.x, L.y);
        var per = 2 * Math.PI * L.r * S * 1.5;
        ctx.setLineDash([per * line, per]);
        ctx.strokeStyle = "#ff8a5b"; ctx.lineWidth = lw;
        ctx.shadowColor = "rgba(255,122,77,0.9)"; ctx.shadowBlur = S / 50;
        ctx.stroke();
        ctx.shadowBlur = 0; ctx.setLineDash([]);
      }
    } else {
      // hard sphere of equal area, centred on the lesion
      var r = sphereRadius() * S;
      var cx = L.x * S + r * 0.18, cy = L.y * S - r * 0.05;
      ctx.fillStyle = "rgba(143,179,255," + 0.18 * line + ")";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([lw * 3, lw * 2.4]);
      ctx.strokeStyle = "rgba(143,179,255," + (0.95 * line) + ")"; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      // faint true outline, to show what the sphere misses
      ctx.setLineDash([lw, lw * 2]);
      ctx.strokeStyle = "rgba(255,255,255," + 0.45 * band + ")";
      lesionPath(ctx, 1, L.x, L.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    if (!reduce) raf = requestAnimationFrame(draw);
  }

  function restart() {
    cancelAnimationFrame(raf);
    t0 = performance.now();
    raf = requestAnimationFrame(draw);
  }

  // Mode toggle
  var buttons = document.querySelectorAll("[data-mode]");
  var modeLabel = document.getElementById("hud-mode");
  var explain = document.querySelectorAll("[data-explain]");
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-mode");
      buttons.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      explain.forEach(function (e) { e.hidden = e.getAttribute("data-explain") !== mode; });
      if (modeLabel) modeLabel.textContent = mode === "soft" ? "Soft contour · graded band" : "Hard sphere · pseudo-label shape";
      t0 = performance.now() - 1250; // skip the scan sweep on toggles
      if (reduce) draw(0);
    });
  });

  // Sidebar pipeline ticks along with the animation.
  var steps = document.querySelectorAll(".steps-mini li");
  function tickSteps() {
    if (reduce) { steps.forEach(function (s) { s.className = "done"; }); return; }
    [0, 700, 1400, 2400].forEach(function (ms, i) {
      setTimeout(function () {
        steps.forEach(function (s, j) { s.className = j < i ? "done" : j === i ? "active" : ""; });
      }, ms);
    });
    setTimeout(function () { steps.forEach(function (s) { s.className = "done"; }); }, 3200);
  }

  resize();
  window.addEventListener("resize", function () { var old = S; resize(); if (S !== old && reduce) draw(0); });
  // Pause the animation loop when the viewer is off-screen.
  if ("IntersectionObserver" in window && !reduce) {
    var started = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (!started) { started = true; tickSteps(); restart(); }
          else { raf = requestAnimationFrame(draw); }
        } else cancelAnimationFrame(raf);
      });
    }, { threshold: 0.05 }).observe(canvas);
  } else { tickSteps(); t0 = performance.now(); draw(performance.now()); }
})();
