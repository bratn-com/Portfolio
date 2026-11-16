(function () {
  var VERSION = "20261116d";
  var DWELL = 7000;
  var MACHINES = [
    { file: "01-water-tank.html", title: "Water Tank — fill", note: "0 → nominal level, then idle waves", w: 671, h: 581 },
    { file: "02-belt.html", title: "Belt — run", note: "Belt and rollers locked to one speed, ramped start / stop", w: 1124, h: 433 },
    { file: "03-aerator.html", title: "Aerator — air", note: "Air streams and bubbles from under the hood", w: 528, h: 712 },
    { file: "04-auger.html", title: "Auger — screw", note: "Flights advance one pitch per turn, ramped start / stop", w: 1152, h: 354 },
    { file: "05-mixer-drum.html", title: "Mixer — drum", note: "Ribs and blades turn with the drum; ring and bolts fixed", w: 637, h: 714 },
    { file: "06-aggbin-discharge.html", title: "AggBin — discharge", note: "Gates open, sand drops, gates close · 1.5 s", w: 373, h: 490 },
    { file: "07-air-compressor-steam.html", title: "Air Compressor — steam", note: "Vapour puffs from the relief fitting, drift left and rise", w: 802, h: 520 },
    { file: "08-stationary-mixer.html", title: "Stationary Mixer — wheels", note: "Both spoke wheels turn together, ramped start / stop", w: 874, h: 514 },
    { file: "09-horn-sound.html", title: "Horn — sound", note: "Wavefronts pulse outward from the bell, inner to outer", w: 884, h: 623 },
    { file: "10-cement-silo.html", title: "Cement Silo", note: "One portion · 1 s", w: 282, h: 1112 },
    { file: "11-truck-drum.html", title: "Truck — drum", note: "Spiral bands travel along the drum as it turns; Reverse = discharge", w: 1085, h: 445 },
    { file: "12-vibrator-shake.html", title: "Vibrator — shake", note: "High-frequency shake of the motor housing, waves pulse out from the top", w: 667, h: 887 },
    { file: "13-pump-vial-fill.html", title: "Pump — vial fill", note: "Empty → 100 %, surface settles at the top · 3.8 s", w: 994, h: 539 },
    { file: "14-pump-chemical-level.html", title: "Pump — chemical level", note: "Green chemical rises through the sight windows · 4 s", w: 350, h: 813 },
    { file: "15-waterbin-fill.html", title: "WaterBin — fill", note: "Empty → 95 %, then idle waves · 3.8 s", w: 807, h: 506 }
  ];

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;
  var root = null;
  var live = false;
  var index = 0;
  var playing = !reduced;
  var hovering = false;
  var started = 0;
  var raf = 0;
  var stageFrame = null;
  var thumbs = [];

  function machineSrc(machine) {
    return "content/illustrations/" + machine.file + "?bare=1&bg=0&v=" + VERSION;
  }

  function place(frame, machine, box) {
    var bw = box.clientWidth;
    var bh = box.clientHeight;
    if (!bw || !bh) return;
    var ratio = machine.w / machine.h;
    var width = bw;
    var height = width / ratio;
    if (height > bh) {
      height = bh;
      width = height * ratio;
    }
    frame.style.width = Math.max(1, Math.round(width)) + "px";
    frame.style.height = Math.max(1, Math.round(height)) + "px";
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function centerThumb(button) {
    var rail = root.querySelector("[data-bay-rail]");
    var railBox = rail.getBoundingClientRect();
    var box = button.getBoundingClientRect();
    var delta = box.left - railBox.left - (railBox.width - box.width) / 2;
    rail.scrollBy({ left: delta, behavior: reduced ? "auto" : "smooth" });
  }

  function ensureStage() {
    var screen = root.querySelector("[data-bay-screen]");
    stageFrame = screen.querySelector("iframe");
    if (stageFrame) return;
    stageFrame = document.createElement("iframe");
    stageFrame.setAttribute("title", "");
    stageFrame.setAttribute("scrolling", "no");
    stageFrame.addEventListener("load", function () {
      screen.classList.remove("is-swap");
    });
    screen.appendChild(stageFrame);
  }

  function loadThumb(button) {
    var frame = button.querySelector("iframe");
    if (!frame || frame.getAttribute("src") || !frame.dataset.src) return;
    frame.setAttribute("src", frame.dataset.src);
  }

  function show(next) {
    if (!root) return;
    index = (next + MACHINES.length) % MACHINES.length;
    var machine = MACHINES[index];
    ensureStage();
    var screen = root.querySelector("[data-bay-screen]");
    var current = stageFrame.getAttribute("src") || "";
    var src = machineSrc(machine);
    if (current !== src) {
      screen.classList.add("is-swap");
      stageFrame.title = machine.title;
      stageFrame.setAttribute("src", src);
      window.setTimeout(function () {
        if (root) screen.classList.remove("is-swap");
      }, 900);
    }
    place(stageFrame, machine, screen);
    root.querySelector("[data-bay-index]").textContent = pad(index + 1);
    root.querySelector("[data-bay-count]").textContent = String(index + 1);
    root.querySelector("[data-bay-title]").textContent = machine.title;
    root.querySelector("[data-bay-note]").textContent = machine.note;
    root.querySelector("[data-bay-live]").textContent = machine.title + ". " + machine.note;
    thumbs.forEach(function (button, i) {
      var on = i === index;
      button.setAttribute("aria-selected", on ? "true" : "false");
      if (on) {
        loadThumb(button);
        centerThumb(button);
      }
    });
    started = performance.now();
    var bar = root.querySelector("[data-bay-progress]");
    if (bar) bar.style.transform = "scaleX(0)";
  }

  function frame() {
    raf = 0;
    if (!live) return;
    var bar = root && root.querySelector("[data-bay-progress]");
    if (playing && !hovering) {
      var amount = Math.min(1, (performance.now() - started) / DWELL);
      if (bar) bar.style.transform = "scaleX(" + amount.toFixed(4) + ")";
      if (amount >= 1) show(index + 1);
    }
    raf = requestAnimationFrame(frame);
  }

  function startClock() {
    if (raf) return;
    started = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function setPlaying(next) {
    playing = next;
    var button = root && root.querySelector("[data-bay-play]");
    if (button) {
      button.textContent = playing ? "Pause" : "Play";
      button.setAttribute("aria-pressed", playing ? "true" : "false");
    }
    var bar = root && root.querySelector("[data-bay-progress]");
    if (!playing && bar) bar.style.transform = "scaleX(0)";
    started = performance.now();
  }

  function layout() {
    if (!live || !root) return;
    var screen = root.querySelector("[data-bay-screen]");
    if (stageFrame) place(stageFrame, MACHINES[index], screen);
    thumbs.forEach(function (button, i) {
      var frame = button.querySelector("iframe");
      var fit = button.querySelector(".bay-thumb-fit");
      if (frame && fit && frame.getAttribute("src")) place(frame, MACHINES[i], fit);
    });
  }

  function onKey(event) {
    if (!live || !root || !root.isConnected) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    }
  }

  function onResize() {
    layout();
  }

  function build(scope) {
    var rail = scope.querySelector("[data-bay-rail]");
    if (scope.dataset.built === "1") {
      thumbs = [].slice.call(rail.querySelectorAll(".bay-thumb"));
      return;
    }
    MACHINES.forEach(function (machine, i) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "bay-thumb";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-label", machine.title);
      button.dataset.index = String(i);
      var fit = document.createElement("span");
      fit.className = "bay-thumb-fit";
      var frame = document.createElement("iframe");
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");
      frame.setAttribute("scrolling", "no");
      frame.dataset.src = machineSrc(machine);
      frame.addEventListener("load", function () {
        place(frame, machine, fit);
      });
      fit.appendChild(frame);
      button.appendChild(fit);
      button.addEventListener("click", function () {
        show(i);
      });
      rail.appendChild(button);
      thumbs.push(button);
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) loadThumb(entry.target);
      });
    }, { root: rail, rootMargin: "120px" });
    thumbs.forEach(function (button) { observer.observe(button); });
    scope.dataset.observer = "1";
    scope._bayObserver = observer;

    scope.querySelector("[data-bay-prev]").addEventListener("click", function () { show(index - 1); });
    scope.querySelector("[data-bay-next]").addEventListener("click", function () { show(index + 1); });
    scope.querySelector("[data-bay-play]").addEventListener("click", function () { setPlaying(!playing); });
    if (canHover) {
      var stage = scope.querySelector(".bay-stage");
      stage.addEventListener("pointerenter", function () { hovering = true; });
      stage.addEventListener("pointerleave", function () { hovering = false; started = performance.now(); });
    }
    var swipe = scope.querySelector(".bay-sheet");
    var origin = null;
    swipe.addEventListener("pointerdown", function (event) {
      origin = { x: event.clientX, y: event.clientY };
    });
    swipe.addEventListener("pointerup", function (event) {
      if (!origin) return;
      var dx = event.clientX - origin.x;
      var dy = event.clientY - origin.y;
      origin = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      show(index + (dx < 0 ? 1 : -1));
    });
    scope.dataset.built = "1";
  }

  function destroy() {
    live = false;
    hovering = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    root = null;
    stageFrame = null;
    thumbs = [];
  }

  function mount(scope) {
    var next = scope && scope.querySelector("[data-illustrations]");
    if (!next) return;
    if (live && root === next && next.isConnected) return;
    destroy();
    root = next;
    live = true;
    playing = !reduced;
    index = 0;
    build(next);
    setPlaying(playing);
    show(0);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    startClock();
    requestAnimationFrame(layout);
  }

  window.SysdyneBay = { mount: mount, destroy: destroy };
})();
