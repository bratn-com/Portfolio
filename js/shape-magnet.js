(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  /** Base polygon corners in each SVG’s own viewBox user space (from exported paths). */
  var SHAPE_VERTICES = {
    about: [
      [563.188, 0],
      [0, 117.35],
      [401.552, 141.577],
    ],
    work: [
      [0, 140.892],
      [160.854, 0],
      [314.971, 66.6789],
      [365.501, 209.455],
    ],
    portfolio: [
      [0, 0],
      [484.908, 15.8991],
      [50.7757, 143.47],
    ],
  };

  var links = document.querySelectorAll("a.shape[data-shape-magnet]");
  if (!links.length) return;

  function buildPath(vertices) {
    if (!vertices.length) return "";
    var d = "M" + vertices[0][0] + " " + vertices[0][1];
    for (var i = 1; i < vertices.length; i++) {
      d += "L" + vertices[i][0] + " " + vertices[i][1];
    }
    return d + "Z";
  }

  function clientToSvg(svg, clientX, clientY) {
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }

  /**
   * Pull each vertex toward `cursor` when within `radius` (SVG units). Falloff is quadratic;
   * `pullScale` caps how far a vertex can move (fraction of radius).
   */
  function magnetVertices(base, cursor, radius, pullScale) {
    var out = [];
    var r = Math.max(radius, 1);
    for (var i = 0; i < base.length; i++) {
      var bx = base[i][0];
      var by = base[i][1];
      var dx = cursor.x - bx;
      var dy = cursor.y - by;
      var dist = Math.hypot(dx, dy);
      if (dist < 1e-6) {
        out.push([bx, by]);
        continue;
      }
      var t = dist < r ? 1 - dist / r : 0;
      t = t * t;
      if (t <= 0) {
        out.push([bx, by]);
        continue;
      }
      var maxMove = r * pullScale * t;
      var move = Math.min(maxMove, dist * 0.85);
      var nx = dx / dist;
      var ny = dy / dist;
      out.push([bx + nx * move, by + ny * move]);
    }
    return out;
  }

  var state = [];
  for (var li = 0; li < links.length; li++) {
    var link = links[li];
    var key = link.getAttribute("data-shape-magnet");
    var base = SHAPE_VERTICES[key];
    var svg = link.querySelector("svg.shape-magnet-svg");
    var path = svg && svg.querySelector("path.shape-magnet-path");
    if (!base || !svg || !path) continue;
    path.setAttribute("d", buildPath(base));
    state.push({
      link: link,
      svg: svg,
      path: path,
      base: base,
      key: key,
    });
  }

  if (!state.length) return;

  var pending = false;
  var lastX = NaN;
  var lastY = NaN;

  function tick() {
    pending = false;
    if (lastX !== lastX || lastY !== lastY) return;
    for (var i = 0; i < state.length; i++) {
      var s = state[i];
      var rect = s.svg.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;

      var vb = s.svg.viewBox && s.svg.viewBox.baseVal;
      if (!vb || vb.width <= 0 || vb.height <= 0) continue;
      var radiusSvg = Math.min(220, 0.42 * Math.min(vb.width, vb.height));
      var pullScale = s.key === "work" ? 0.22 : 0.28;

      var cursor = clientToSvg(s.svg, lastX, lastY);
      if (!cursor) continue;

      var displaced = magnetVertices(s.base, cursor, radiusSvg, pullScale);
      s.path.setAttribute("d", buildPath(displaced));
    }
  }

  function schedule(clientX, clientY) {
    lastX = clientX;
    lastY = clientY;
    if (pending) return;
    pending = true;
    requestAnimationFrame(tick);
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      schedule(e.clientX, e.clientY);
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerleave",
    function () {
      lastX = NaN;
      lastY = NaN;
      for (var i = 0; i < state.length; i++) {
        state[i].path.setAttribute("d", buildPath(state[i].base));
      }
    },
    { passive: true }
  );

  window.addEventListener("scroll", function () {
    schedule(lastX, lastY);
  }, { passive: true });

  window.addEventListener("resize", function () {
    schedule(lastX, lastY);
  });
})();
