(function () {
  var shell = document.querySelector(".shell.home");
  var land = document.querySelector(".home .land-rise");
  if (!shell || !land) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = document.getElementById("shape-cursor");
  var img = el && el.querySelector(".shape-cursor-icon");
  var label = el && el.querySelector(".shape-cursor-label");
  if (!el || !img || !label) return;

  document.documentElement.classList.add("shape-cursor-ready");

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
  var EXPAND_MS = reduced ? 0 : 150;
  var lastX = NaN;
  var lastY = NaN;

  function clearExpandTimer() {
    if (expandTimer) {
      window.clearTimeout(expandTimer);
      expandTimer = 0;
    }
  }

  function hide() {
    clearExpandTimer();
    currentKey = null;
    el.classList.remove("shape-cursor--label", "shape-cursor--shown");
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

  /** Hit-test uses the top element under the pointer so SVG/path nodes still resolve to `.shape`. */
  function shapeAtPoint(clientX, clientY) {
    if (typeof document.elementFromPoint !== "function") return null;
    var node = document.elementFromPoint(clientX, clientY);
    return shapeFromTarget(node);
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
    el.classList.add("shape-cursor--shown");
    position(clientX, clientY);
  }

  function refreshUnderPointer() {
    if (lastX !== lastX || lastY !== lastY) return;
    var shape = shapeAtPoint(lastX, lastY);
    if (!shape) {
      hide();
      return;
    }
    activate(shape, lastX, lastY);
  }

  document.addEventListener(
    "pointermove",
    function (e) {
      lastX = e.clientX;
      lastY = e.clientY;

      if (e.pointerType && e.pointerType !== "mouse") {
        return;
      }

      var shape = shapeAtPoint(lastX, lastY);
      if (!shape) {
        hide();
        return;
      }

      activate(shape, lastX, lastY);
    },
    { passive: true }
  );

  land.addEventListener(
    "pointerleave",
    function (e) {
      if (!e.relatedTarget || !land.contains(e.relatedTarget)) {
        hide();
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
      lastX = r.left + r.width / 2;
      lastY = r.top + r.height / 2;
      activate(shape, lastX, lastY);
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
      refreshUnderPointer();
    },
    { passive: true, capture: true }
  );

  window.addEventListener("resize", refreshUnderPointer);
  window.addEventListener("blur", hide);
})();
