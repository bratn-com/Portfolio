(function () {
  var VERSIONS = {
    illustrations: "20261116f",
    remotecare: "20261118d"
  };

  var ILLUSTRATIONS = [
    { file: "04-auger.html", title: "Auger — screw", w: 1152, h: 354 },
    { file: "11-truck-drum.html", title: "Truck — drum", w: 1085, h: 445 },
    { file: "06-aggbin-discharge.html", title: "AggBin — discharge", w: 373, h: 490 },
    { file: "07-air-compressor-steam.html", title: "Air Compressor — steam", w: 802, h: 520 },
    { file: "08-stationary-mixer.html", title: "Stationary Mixer — wheels", w: 874, h: 514 },
    { file: "15-waterbin-fill.html", title: "WaterBin — fill", w: 807, h: 506 },
    { file: "05-mixer-drum.html", title: "Mixer — drum", w: 637, h: 714 },
    { file: "02-belt.html", title: "Belt — run", w: 1124, h: 433 },
    { file: "12-vibrator-shake.html", title: "Vibrator — shake", w: 667, h: 887 },
    { file: "03-aerator.html", title: "Aerator — air", w: 528, h: 712 },
    { file: "01-water-tank.html", title: "Water Tank — fill", w: 671, h: 581 },
    { file: "09-horn-sound.html", title: "Horn — sound", w: 884, h: 623 },
    { file: "13-pump-vial-fill.html", title: "Pump — vial fill", w: 994, h: 539 },
    { file: "10-cement-silo.html", title: "Cement Silo", w: 282, h: 1112 },
    { file: "14-pump-chemical-level.html", title: "Pump — chemical level", w: 350, h: 813, center: true }
  ];

  var REMOTECARE = [
    { file: "remote-visit.html", title: "Remote visit", w: 300, h: 300 },
    { file: "step1.html", title: "Step 1", w: 300, h: 300 },
    { file: "step2.html", title: "Step 2", w: 300, h: 300 },
    { file: "step3.html", title: "Step 3", w: 300, h: 300 },
    { file: "you-are-ready.html", title: "You are ready", w: 300, h: 300 },
    { file: "email-sent.html", title: "Email sent", w: 300, h: 300 },
    { file: "offline.html", title: "Offline", w: 300, h: 300 }
  ];

  var SETS = {
    illustrations: {
      attr: "data-illustrations",
      folder: "illustrations",
      bare: true,
      items: ILLUSTRATIONS
    },
    remotecare: {
      attr: "data-remotecare",
      folder: "remotecare",
      bare: false,
      items: REMOTECARE
    }
  };

  var root = null;
  var active = null;
  var live = false;
  var observer = null;

  function detect(scope) {
    if (!scope) return null;
    for (var key in SETS) {
      if (!Object.prototype.hasOwnProperty.call(SETS, key)) continue;
      var cfg = SETS[key];
      var el = scope.querySelector("[" + cfg.attr + "]");
      if (el) return { el: el, key: key, cfg: cfg };
    }
    return null;
  }

  function clipSrc(cfg, clip) {
    var version = VERSIONS[active] || "";
    var url = "content/" + cfg.folder + "/" + clip.file;
    var query = cfg.bare ? "?bare=1&bg=0" : "?";
    if (query === "?") query += "v=" + version;
    else query += "&v=" + version;
    return url + query;
  }

  function limits() {
    var narrow = window.matchMedia("(max-width: 800px)").matches;
    if (active === "remotecare") {
      return narrow ? { maxW: 300, maxH: 280 } : { maxW: 420, maxH: 360 };
    }
    return narrow ? { maxW: 220, maxH: 160 } : { maxW: 280, maxH: 210 };
  }

  function layout() {
    if (!root || !active) return;
    var box = limits();
    var cfg = SETS[active];
    var frames = root.querySelectorAll(".ill-machine iframe");
    cfg.items.forEach(function (clip, i) {
      var frame = frames[i];
      if (!frame) return;
      var ratio = clip.w / clip.h;
      var width = box.maxW;
      var height = width / ratio;
      if (height > box.maxH) {
        height = box.maxH;
        width = height * ratio;
      }
      frame.style.width = Math.round(width) + "px";
      frame.style.height = Math.round(height) + "px";
    });
  }

  function watch() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var frame = entry.target.querySelector("iframe");
        if (frame && frame.dataset.src && !frame.getAttribute("src")) {
          frame.setAttribute("src", frame.dataset.src);
        }
      });
    }, { root: null, rootMargin: "400px" });
    root.querySelectorAll(".ill-machine").forEach(function (figure) {
      observer.observe(figure);
    });
  }

  function build(cfg) {
    var grid = root.querySelector("[data-ill-grid]");
    grid.textContent = "";
    cfg.items.forEach(function (clip) {
      var figure = document.createElement("figure");
      figure.className = "ill-machine" + (clip.center ? " is-center" : "");
      var frame = document.createElement("iframe");
      frame.title = clip.title;
      frame.setAttribute("scrolling", "no");
      frame.dataset.src = clipSrc(cfg, clip);
      figure.appendChild(frame);
      grid.appendChild(figure);
    });
    root.dataset.built = "1";
    root.dataset.bay = active;
  }

  function destroy() {
    live = false;
    window.removeEventListener("resize", layout);
    if (observer) observer.disconnect();
    observer = null;
    root = null;
    active = null;
  }

  function mount(scope) {
    var found = detect(scope);
    if (!found) return;
    if (live && root === found.el && found.el.isConnected && active === found.key) {
      layout();
      return;
    }
    destroy();
    root = found.el;
    active = found.key;
    live = true;
    if (root.dataset.built !== "1" || root.dataset.bay !== active) build(found.cfg);
    watch();
    layout();
    window.addEventListener("resize", layout);
  }

  window.SysdyneBay = { mount: mount, destroy: destroy };
})();