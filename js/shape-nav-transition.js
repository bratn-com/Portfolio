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
  var TARGET_FILL = "#4d1b8f";
  var busy = false;

  /** Figma OUT_CUBIC-style (0, 0, 0, 1) */
  function easeCubicOut(t) {
    var u = 1 - t;
    return 1 - u * u * u;
  }

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

  function parsePathPoints(d) {
    var nums = d.match(/-?\d+\.?\d*/g);
    if (!nums || nums.length < 6) return null;
    var n = nums.map(Number);
    var pts = [];
    for (var i = 0; i + 1 < n.length; i += 2) {
      pts.push([n[i], n[i + 1]]);
    }
    if (pts.length >= 2) {
      var a = pts[0];
      var b = pts[pts.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) pts.pop();
    }
    return pts;
  }

  function centroid(pts) {
    var sx = 0;
    var sy = 0;
    for (var i = 0; i < pts.length; i++) {
      sx += pts[i][0];
      sy += pts[i][1];
    }
    return [sx / pts.length, sy / pts.length];
  }

  function userToClient(svg, x, y) {
    var pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    var ctm = svg.getScreenCTM();
    if (!ctm) return [x, y];
    var p = pt.matrixTransform(ctm);
    return [p.x, p.y];
  }

  function mapVertsToClient(svg, vertsUser) {
    return vertsUser.map(function (v) {
      return userToClient(svg, v[0], v[1]);
    });
  }

  function rectQuadClient(r) {
    var L = r.left;
    var T = r.top;
    var R = r.left + r.width;
    var B = r.top + r.height;
    return [
      [L, T],
      [R, T],
      [R, B],
      [L, B],
    ];
  }

  function buildStartQuad(userPts) {
    var pts = userPts.slice();
    if (pts.length === 3) {
      var c = centroid(pts);
      pts.push(c);
    }
    if (pts.length !== 4) return null;
    return pts;
  }

  /**
   * Cyclically order 4 points by polar angle around their centroid so edge correspondence
   * stays consistent during lerp (screen coords, y down — we only need stable order).
   */
  function orderQuadByAngle(quad) {
    var c = centroid(quad);
    var indexed = quad.map(function (p, i) {
      return {
        i: i,
        ang: Math.atan2(p[1] - c[1], p[0] - c[0]),
      };
    });
    indexed.sort(function (a, b) {
      return a.ang - b.ang;
    });
    return indexed.map(function (x) {
      return quad[x.i].slice();
    });
  }

  function buildPathD(pts) {
    if (!pts || pts.length < 3) return "";
    var d = "M" + pts[0][0] + " " + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      d += "L" + pts[i][0] + " " + pts[i][1];
    }
    return d + "Z";
  }

  function lerpPt(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  function runTransition(shapeLink, href) {
    if (busy) return;
    var svg = shapeLink.querySelector("svg.shape-magnet-svg");
    var pathEl = svg && svg.querySelector("path");
    if (!svg || !pathEl) {
      window.location.href = href;
      return;
    }

    var dAttr = pathEl.getAttribute("d");
    var userPts = parsePathPoints(dAttr);
    if (!userPts || userPts.length < 3) {
      window.location.href = href;
      return;
    }

    var userQuad = buildStartQuad(userPts);
    if (!userQuad) {
      window.location.href = href;
      return;
    }

    var startClient = orderQuadByAngle(mapVertsToClient(svg, userQuad));
    var last = panelTargetRect();
    if (last.width < 1 || last.height < 1) {
      window.location.href = href;
      return;
    }

    var targetClient = orderQuadByAngle(rectQuadClient(last));

    var fillStart =
      pathEl.getAttribute("fill") ||
      (pathEl.style && pathEl.style.fill) ||
      getComputedStyle(pathEl).fill ||
      "#60339C";

    var overlay = document.createElement("div");
    overlay.className = "shape-nav-flip-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var w = window.innerWidth;
    var h = window.innerHeight;
    var outSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    outSvg.setAttribute("class", "shape-nav-morph-svg");
    outSvg.setAttribute("viewBox", "0 0 " + w + " " + h);
    outSvg.setAttribute("preserveAspectRatio", "none");
    outSvg.setAttribute("aria-hidden", "true");

    var morphPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    morphPath.setAttribute("d", buildPathD(startClient));
    morphPath.setAttribute("fill", fillStart);
    morphPath.setAttribute("fill-rule", "evenodd");
    outSvg.appendChild(morphPath);
    overlay.appendChild(outSvg);
    document.body.appendChild(overlay);

    busy = true;
    shapeLink.style.visibility = "hidden";

    var t0 = performance.now();
    var raf = 0;

    function finish() {
      cancelAnimationFrame(raf);
      window.location.href = href;
    }

    function frame(now) {
      var elapsed = now - t0;
      var t = Math.min(1, elapsed / DURATION_MS);
      var e = easeCubicOut(t);
      var pts = [];
      for (var i = 0; i < 4; i++) {
        pts.push(lerpPt(startClient[i], targetClient[i], e));
      }
      morphPath.setAttribute("d", buildPathD(pts));
      morphPath.setAttribute(
        "fill",
        e < 0.35 ? fillStart : interpolateColor(fillStart, TARGET_FILL, Math.min(1, (e - 0.35) / 0.65))
      );

      if (t >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    /** Rough sRGB lerp for hex fills */
    function interpolateColor(from, to, u) {
      function hex(s) {
        var m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
        if (!m) return null;
        return parseInt(m[1], 16);
      }
      var a = hex(from);
      var b = hex(to);
      if (a == null || b == null) return u < 0.5 ? from : to;
      var ar = (a >> 16) & 255;
      var ag = (a >> 8) & 255;
      var ab = a & 255;
      var br = (b >> 16) & 255;
      var bg = (b >> 8) & 255;
      var bb = b & 255;
      var r = Math.round(ar + (br - ar) * u);
      var g = Math.round(ag + (bg - ag) * u);
      var bl = Math.round(ab + (bb - ab) * u);
      var out = (r << 16) | (g << 8) | bl;
      return "#" + ("000000" + out.toString(16)).slice(-6);
    }

    raf = requestAnimationFrame(frame);
    window.setTimeout(finish, DURATION_MS + 150);
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
