(function () {
  var shell = document.querySelector(".shell.home");
  var land = document.querySelector(".home .land-rise");
  if (!shell || !land) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = document.getElementById("shape-cursor");
  var img = el && el.querySelector(".shape-cursor-icon");
  var label = el && el.querySelector(".shape-cursor-label");
  if (!el || !img || !label) return;

  var ICON = {
    about: "assets/ui/cursor-about.png",
    work: "assets/ui/cursor-contact.png",
    portfolio: "assets/ui/cursor-portfolio.png",
  };

  var TEXT = {
    about: "about",
    work: "contact",
    portfolio: "portfolio",
  };

  var currentKey = null;
  var expandTimer = 0;
  var EXPAND_MS = reduced ? 0 : 180;

  function clearExpandTimer() {
    if (expandTimer) {
      window.clearTimeout(expandTimer);
      expandTimer = 0;
    }
  }

  function hide() {
    clearExpandTimer();
    currentKey = null;
    el.classList.remove("shape-cursor--label");
    el.hidden = true;
    el.style.left = "";
    el.style.top = "";
  }

  function position(clientX, clientY) {
    el.style.left = clientX + "px";
    el.style.top = clientY + "px";
  }

  function shapeFromTarget(target) {
    if (!target || !target.closest) return null;
    var s = target.closest("a.shape[data-shape-magnet]");
    if (!s || !land.contains(s)) return null;
    return s;
  }

  function activate(shape, clientX, clientY) {
    var key = shape.getAttribute("data-shape-magnet");
    if (!key || !ICON[key]) return;

    if (key !== currentKey) {
      currentKey = key;
      img.src = ICON[key];
      img.alt = "";
      label.textContent = TEXT[key] || key;
      el.classList.remove("shape-cursor--label");
      clearExpandTimer();
      expandTimer = window.setTimeout(function () {
        el.classList.add("shape-cursor--label");
        expandTimer = 0;
      }, EXPAND_MS);
    }

    el.hidden = false;
    position(clientX, clientY);
  }

  document.addEventListener(
    "pointermove",
    function (e) {
      var shape = shapeFromTarget(e.target);
      if (!shape) {
        hide();
        return;
      }
      if (e.pointerType && e.pointerType !== "mouse") {
        return;
      }
      activate(shape, e.clientX, e.clientY);
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerdown",
    function (e) {
      var shape = shapeFromTarget(e.target);
      if (shape && (!e.pointerType || e.pointerType === "mouse")) {
        activate(shape, e.clientX, e.clientY);
      }
    },
    { passive: true }
  );

  land.addEventListener(
    "focusin",
    function (e) {
      var shape = shapeFromTarget(e.target);
      if (!shape) return;
      var r = shape.getBoundingClientRect();
      activate(shape, r.left + r.width / 2, r.top + r.height / 2);
    },
    true
  );

  land.addEventListener(
    "focusout",
    function (e) {
      var next = e.relatedTarget;
      if (shapeFromTarget(next)) return;
      hide();
    },
    true
  );

  window.addEventListener(
    "scroll",
    function () {
      if (el.hidden) return;
      hide();
    },
    { passive: true, capture: true }
  );

  window.addEventListener("blur", hide);
})();
