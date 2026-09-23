// Live demo viewer: real CT slices + real model output from assets/demo/manifest.json.
// Soft mode draws the graded probability band plus the p = 0.5 edge; hard mode fills the
// thresholded mask the way conventional tools do, so the two can be compared.
(function () {
  var canvas = document.getElementById("demo-ct");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var el = function (id) { return document.getElementById(id); };
  var slider = el("demo-slice"), caseList = el("demo-cases");
  var state = { m: null, c: null, i: 0, mode: "soft", pancreas: true, imgs: {} };

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.getBoundingClientRect().width || 512;
    canvas.width = canvas.height = Math.round(w * dpr);
  }

  function img(src) {
    if (state.imgs[src]) return state.imgs[src];
    var im = new Image();
    im.decoding = "async";
    im.onload = draw;
    im.src = src;
    return (state.imgs[src] = im);
  }

  function path(poly, k) {
    ctx.beginPath();
    poly.forEach(function (p, j) { j ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k); });
    ctx.closePath();
  }

  function draw() {
    var c = state.c; if (!c) return;
    var S = canvas.width, k = S / state.m.size, i = state.i;
    var base = "assets/demo/" + c.id + "/", n = String(i).padStart(2, "0");
    var ct = img(base + "ct_" + n + ".jpg");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, S, S);
    if (ct.complete && ct.naturalWidth) ctx.drawImage(ct, 0, 0, S, S);
    var sl = c.contours[i], lw = Math.max(1.5, S / 300);

    if (state.pancreas) {
      ctx.setLineDash([lw * 2.5, lw * 2.5]); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = "rgba(255,255,255,.55)";
      sl.pancreas.forEach(function (p) { path(p, k); ctx.stroke(); });
      ctx.setLineDash([]);
    }
    if (state.mode === "soft") {
      var band = img(base + "band_" + n + ".png");
      if (band.complete && band.naturalWidth) ctx.drawImage(band, 0, 0, S, S);
      ctx.strokeStyle = "#ff8a5b"; ctx.lineWidth = lw; ctx.shadowColor = "rgba(255,122,77,.9)"; ctx.shadowBlur = S / 70;
      sl.tumour.forEach(function (p) { path(p, k); ctx.stroke(); });
      ctx.shadowBlur = 0;
    } else if (state.mode === "hard") {
      ctx.fillStyle = "rgba(143,179,255,.45)"; ctx.strokeStyle = "#8fb3ff"; ctx.lineWidth = lw;
      sl.tumour.forEach(function (p) { path(p, k); ctx.fill(); ctx.stroke(); });
    }
    el("demo-hud-slice").textContent = "SLICE " + (i + 1) + " / " + c.slices;
    el("demo-hud-mode").textContent = { soft: "Soft contour · graded band", hard: "Hard mask · p ≥ 0.5", off: "Overlay off" }[state.mode];
    slider.value = i;
  }

  function preload(c) {
    for (var i = 0; i < c.slices; i++) {
      var n = String(i).padStart(2, "0");
      img("assets/demo/" + c.id + "/ct_" + n + ".jpg"); img("assets/demo/" + c.id + "/band_" + n + ".png");
    }
  }

  function selectCase(idx) {
    var c = state.m.cases[idx];
    state.c = c; state.i = c.start;
    slider.max = c.slices - 1;
    caseList.querySelectorAll("button").forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === idx)); });
    el("demo-volume").textContent = c.volume_ml.toFixed(1) + " mL";
    el("demo-hud-case").textContent = "CASE " + (idx + 1) + " · " + c.id.toUpperCase().replace("_", " ");
    preload(c); draw();
  }

  function step(d) {
    if (!state.c) return;
    state.i = Math.max(0, Math.min(state.c.slices - 1, state.i + d)); draw();
  }

  slider.addEventListener("input", function () { state.i = +slider.value; draw(); });
  canvas.addEventListener("wheel", function (e) { e.preventDefault(); step(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  canvas.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });
  document.querySelectorAll("[data-demo-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.mode = b.getAttribute("data-demo-mode");
      document.querySelectorAll("[data-demo-mode]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      draw();
    });
  });
  el("demo-pancreas").addEventListener("change", function (e) { state.pancreas = e.target.checked; draw(); });
  window.addEventListener("resize", function () { sizeCanvas(); draw(); });

  sizeCanvas();
  fetch("assets/demo/manifest.json").then(function (r) { return r.json(); }).then(function (m) {
    state.m = m;
    caseList.innerHTML = "";
    m.cases.forEach(function (c, j) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "case-btn";
      b.innerHTML = "<b>Case " + (j + 1) + "</b><span>" + c.volume_ml.toFixed(1) + " mL · " + c.slices + " slices</span>";
      b.addEventListener("click", function () { selectCase(j); });
      caseList.appendChild(b);
    });
    selectCase(0);
  }).catch(function () {
    el("demo-hud-mode").textContent = "Demo data failed to load";
  });
})();
