(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var selectors = 'a.shape[data-shape-magnet="about"], a.shape[data-shape-magnet="work"]';
  var links = document.querySelectorAll(selectors);
  if (!links.length) return;

  var bar = document.querySelector(".home .bar");
  var foot = document.querySelector(".home .foot");
  if (!bar || !foot) return;

  var DURATION_MS = 520;
  var PANEL_PAD_Y = 32;
  /** Matches --purple on inner pages */
  var TARGET_FILL = "#4d1b8f";
  var busy = false;

  function panelTargetRect() {
    var barRect = bar.getBoundingClientRect();
    var footRect = foot.getBoundingClientRect();
    var pad =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pad")) || 40;
    var top = barRect.bottom + PANEL_PAD_Y;
    var left = pad;
    var width = window.innerWidth - 2 * left;
    var bottom = footRect.top - PANEL_PAD_Y;
    var height = Math.max(0, bottom - top);
    return { left: left, top: top, width: width, height: height };
  }

  function runTransition(shapeLink, href) {
    if (busy) return;
    var svg = shapeLink.querySelector("svg.shape-magnet-svg");
    var pathEl = svg && svg.querySelector("path");
    if (!svg || !pathEl) {
      window.location.href = href;
      return;
    }

    var first = shapeLink.getBoundingClientRect();
    var last = panelTargetRect();
    if (first.width < 1 || first.height < 1 || last.width < 1 || last.height < 1) {
      window.location.href = href;
      return;
    }

    var cloneSvg = svg.cloneNode(true);
    cloneSvg.setAttribute("aria-hidden", "true");
    cloneSvg.style.width = "100%";
    cloneSvg.style.height = "100%";
    cloneSvg.style.display = "block";

    var path = cloneSvg.querySelector("path");
    if (path) {
      path.style.transition = "fill " + DURATION_MS / 1000 + "s cubic-bezier(0, 0, 0, 1)";
    }

    var overlay = document.createElement("div");
    overlay.className = "shape-nav-flip-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var inner = document.createElement("div");
    inner.className = "shape-nav-flip";
    inner.style.left = first.left + "px";
    inner.style.top = first.top + "px";
    inner.style.width = first.width + "px";
    inner.style.height = first.height + "px";

    inner.appendChild(cloneSvg);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
    busy = true;
    shapeLink.style.visibility = "hidden";

    var dx = last.left - first.left;
    var dy = last.top - first.top;
    var sx = last.width / first.width;
    var sy = last.height / first.height;

    function finish() {
      window.location.href = href;
    }

    function onEnd() {
      inner.removeEventListener("transitionend", onEnd);
      finish();
    }

    inner.addEventListener("transitionend", function (e) {
      if (e.propertyName === "transform") onEnd();
    });

    window.setTimeout(finish, DURATION_MS + 120);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        inner.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")";
        if (path) {
          path.setAttribute("fill", TARGET_FILL);
        }
      });
    });
  }

  links.forEach(function (link) {
    link.addEventListener(
      "click",
      function (e) {
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return;
        }
        var href = link.getAttribute("href");
        if (!href) return;
        e.preventDefault();
        runTransition(link, href);
      },
      { passive: false }
    );
  });
})();
