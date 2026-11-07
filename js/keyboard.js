(function () {
  function typingTarget(node) {
    if (!node || !node.tagName) return false;
    var tag = node.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
  }

  function follow(link) {
    if (!link || link.getAttribute("aria-disabled") === "true") return false;
    link.click();
    return true;
  }

  function goHome() {
    window.location.href = "index.html";
  }

  function portfolioCategoryShift(dir) {
    var order = ["desktop", "mobile", "motion"];
    var params = new URLSearchParams(window.location.search);
    var current = params.get("category") || "desktop";
    var i = order.indexOf(current);
    if (i < 0) i = 0;
    i = (i + dir + order.length) % order.length;
    window.location.href = "portfolio.html?category=" + order[i] + "&page=1";
  }

  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || typingTarget(e.target)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    var key = e.key;

    if (key === "Escape") {
      if (document.querySelector(".close[href='index.html'], .close[href=\"index.html\"]")) {
        e.preventDefault();
        goHome();
      }
      return;
    }

    if (document.querySelector(".portfolio-page")) {
      if (key === "ArrowLeft") {
        var prev = document.getElementById("prev");
        if (prev && follow(prev)) e.preventDefault();
        return;
      }
      if (key === "ArrowRight") {
        var next = document.getElementById("next");
        if (next && follow(next)) e.preventDefault();
        return;
      }
      if (key === "[" || key === "{") {
        e.preventDefault();
        portfolioCategoryShift(-1);
        return;
      }
      if (key === "]" || key === "}") {
        e.preventDefault();
        portfolioCategoryShift(1);
        return;
      }
      if (key === "1" || key === "2" || key === "3") {
        var cats = ["desktop", "mobile", "motion"];
        var n = Number(key) - 1;
        e.preventDefault();
        window.location.href = "portfolio.html?category=" + cats[n] + "&page=1";
      }
      return;
    }

    var panel = document.querySelector(".panel-wrap");
    if (panel) {
      if (key === "ArrowLeft") {
        var left = panel.querySelector("a.side-arrow.left[href]");
        if (left && follow(left)) e.preventDefault();
        return;
      }
      if (key === "ArrowRight") {
        var right = panel.querySelector("a.side-arrow.right[href]");
        if (right && follow(right)) e.preventDefault();
      }
      return;
    }

    var shapes = document.querySelectorAll(".land a.shape[href]");
    if (!shapes.length) return;

    var list = Array.prototype.slice.call(shapes);
    var active = document.activeElement;
    var index = list.indexOf(active);

    if (key === "ArrowRight" || key === "ArrowDown") {
      e.preventDefault();
      var nextR = index < 0 ? 0 : (index + 1) % list.length;
      list[nextR].focus();
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowUp") {
      e.preventDefault();
      var nextL = index < 0 ? list.length - 1 : (index - 1 + list.length) % list.length;
      list[nextL].focus();
      return;
    }
    if (key === "a" || key === "A") {
      e.preventDefault();
      var about = document.querySelector(".shape-about[href]");
      if (about) about.click();
      return;
    }
    if (key === "w" || key === "W") {
      e.preventDefault();
      var work = document.querySelector(".shape-work[href]");
      if (work) work.click();
      return;
    }
    if (key === "p" || key === "P") {
      e.preventDefault();
      var portfolio = document.querySelector(".shape-portfolio[href]");
      if (portfolio) portfolio.click();
    }
  });
})();
