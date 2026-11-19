(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-parallax], [data-parallax-tablet], [data-parallax-mobile]"));
  if (!nodes.length) return;

  var distance = 8;
  var factor = 0.2;
  var items = nodes.map(function (el) {
    return { el: el, cx: 0, cy: 0, active: false };
  });

  function smoothing(el) {
    var width = window.innerWidth;
    var value = width <= 800 ? el.getAttribute("data-parallax-mobile") : width <= 1100 ? el.getAttribute("data-parallax-tablet") : el.getAttribute("data-parallax");
    return value == null || value === "" ? null : Number(value);
  }

  function clearTransform(el) {
    el.style.transition = "none";
    el.style.transform = "none";
  }

  function applySmoothing() {
    items.forEach(function (item) {
      clearTransform(item.el);
    });
    items.forEach(function (item) {
      var value = smoothing(item.el);
      item.active = value != null && !isNaN(value);
      if (!item.active) return;
      var box = item.el.getBoundingClientRect();
      item.cx = box.left + window.scrollX + box.width / 2;
      item.cy = box.top + window.scrollY + box.height / 2;
      var duration = 0.01 + value / 1000;
      item.el.style.transition = "transform " + duration + "s cubic-bezier(0.22, 1, 0.36, 1)";
    });
  }

  applySmoothing();
  window.addEventListener("resize", applySmoothing);
  window.addEventListener(
    "pointermove",
    function (event) {
      items.forEach(function (item) {
        if (!item.active) return;
        var dx = (event.pageX - item.cx) * factor;
        var dy = (event.pageY - item.cy) * factor;
        var length = Math.hypot(dx, dy);
        if (length > distance) {
          var scale = distance / length;
          dx *= scale;
          dy *= scale;
        }
        item.el.style.transform = "translate(" + dx.toFixed(2) + "px, " + dy.toFixed(2) + "px)";
      });
    },
    { passive: true }
  );
})();
