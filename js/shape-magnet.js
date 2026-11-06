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

  function cloneVertices(vertices) {
    return vertices.map(function (v) {
      return [v[0], v[1]];
    });
  }

  function lerpVertices(from, to, alpha) {
    var out = [];
    for (var i = 0; i < from.length; i++) {
      out.push([
        from[i][0] + (to[i][0] - from[i][0]) * alpha,
        from[i][1] + (to[i][1] - from[i][1]) * alpha,
      ]);
    }
    return out;
  }

  function vertexDeltaSq(a, b) {
    var d = 0;
    for (var i = 0; i < a.length; i++) {
      var dx = a[i][0] - b[i][0];
      var dy = a[i][1] - b[i][1];
      d += dx * dx + dy * dy;
    }
    return d;
  }

  /**
   * Pull each vertex toward `cursor` when within `radius` (SVG units). Falloff is cubic for a
   * stronger “snap” near the pointer; `pullScale` scales max displacement vs radius.
   * Extra “swirl”: slight perpendicular nudge from centroid so shapes feel more organic.
   */
  function magnetVertices(base, cursor, radius, pullScale, centroid) {
    var out = [];
    var r = Math.max(radius, 1);
    var cx = centroid[0];
    var cy = centroid[1];
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
      var rawT = dist < r ? 1 - dist / r : 0;
      var t = rawT * rawT * rawT;
      if (t <= 0) {
        out.push([bx, by]);
        continue;
      }
      var maxMove = r * pullScale * t;
      var move = Math.min(maxMove, dist * 0.92);
      var nx = dx / dist;
      var ny = dy / dist;
      var px = bx + nx * move;
      var py = by + ny * move;

      var vx = bx - cx;
      var vy = by - cy;
      var vlen = Math.hypot(vx, vy) || 1;
      vx /= vlen;
      vy /= vlen;
      var perpX = -vy;
      var perpY = vx;
      var swirl = r * pullScale * 0.14 * t * t;
      var hand = (dx * perpX + dy * perpY) / (dist + 1e-6);
      px += perpX * swirl * hand;
      py += perpY * swirl * hand;

      out.push([px, py]);
    }
    return out;
  }

  function polygonCentroid(vertices) {
    var n = vertices.length;
    if (n < 2) return [0, 0];
    var twice = 0;
    var x = 0;
    var y = 0;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var cross =
        vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1];
      twice += cross;
      x += (vertices[i][0] + vertices[j][0]) * cross;
      y += (vertices[i][1] + vertices[j][1]) * cross;
    }
    if (Math.abs(twice) < 1e-6) {
      var sx = 0;
      var sy = 0;
      for (var k = 0; k < n; k++) {
        sx += vertices[k][0];
        sy += vertices[k][1];
      }
      return [sx / n, sy / n];
    }
    var area = twice * 0.5;
    return [x / (6 * area), y / (6 * area)];
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
      centroid: polygonCentroid(base),
      smoothed: cloneVertices(base),
    });
  }

  if (!state.length) return;

  var lastX = NaN;
  var lastY = NaN;
  var rafId = 0;
  var LERP_TO_TARGET = 0.52;
  var LERP_TO_REST = 0.18;
  var REST_EPS = 2.5;

  function computeTarget(s, clientX, clientY) {
    var rect = s.svg.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;

    var vb = s.svg.viewBox && s.svg.viewBox.baseVal;
    if (!vb || vb.width <= 0 || vb.height <= 0) return null;

    var radiusSvg = Math.min(320, 0.58 * Math.min(vb.width, vb.height));
    var pullScale = s.key === "work" ? 0.38 : 0.46;

    var cursor = clientToSvg(s.svg, clientX, clientY);
    if (!cursor) return null;

    return magnetVertices(s.base, cursor, radiusSvg, pullScale, s.centroid);
  }

  function frame() {
    rafId = 0;
    var active = lastX === lastX && lastY === lastY;
    var keepGoing = false;

    for (var i = 0; i < state.length; i++) {
      var s = state[i];
      var target;
      if (active) {
        target = computeTarget(s, lastX, lastY);
        if (!target) continue;
        s.smoothed = lerpVertices(s.smoothed, target, LERP_TO_TARGET);
        if (vertexDeltaSq(s.smoothed, target) > REST_EPS) keepGoing = true;
      } else {
        target = s.base;
        s.smoothed = lerpVertices(s.smoothed, target, LERP_TO_REST);
        if (vertexDeltaSq(s.smoothed, target) > REST_EPS) keepGoing = true;
      }
      s.path.setAttribute("d", buildPath(s.smoothed));
    }

    if (keepGoing) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function kick() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function schedule(clientX, clientY) {
    lastX = clientX;
    lastY = clientY;
    kick();
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
      kick();
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
