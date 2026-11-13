(function () {
  var grid = document.getElementById("grid");
  var count = document.getElementById("count");
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  var pageSize = 4;
  var params = new URLSearchParams(window.location.search);
  var category = params.get("category") || "desktop";
  if (["desktop", "mobile", "motion"].indexOf(category) === -1) category = "desktop";
  var requested = Number(params.get("page") || "1");

  var pageRoot = document.querySelector(".portfolio-page");
  if (pageRoot) pageRoot.dataset.category = category;

  document.querySelectorAll("[data-category]").forEach(function (link) {
    if (link.getAttribute("data-category") === category) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });

  function href(page) {
    return "portfolio.html?category=" + category + "&page=" + page;
  }

  function setArrow(node, page, enabled) {
    if (enabled) {
      node.href = href(page);
      node.removeAttribute("aria-disabled");
      node.tabIndex = 0;
    } else {
      node.href = href(page < 1 ? 1 : page);
      node.setAttribute("aria-disabled", "true");
      node.tabIndex = -1;
    }
  }

  function mediaPath(project) {
    var path = project.image || "";
    var i = path.lastIndexOf(".");
    return { base: path, ext: i >= 0 ? path.slice(i + 1).toLowerCase() : "" };
  }

  function appendVisual(visual, project) {
    var m = mediaPath(project);
    var url = "content/" + m.base;
    var v = ["mp4", "webm", "ogv"];
    if (v.indexOf(m.ext) >= 0) {
      var video = document.createElement("video");
      video.src = url;
      video.setAttribute("playsinline", "");
      video.muted = true;
      video.loop = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        video.removeAttribute("autoplay");
        video.controls = true;
      } else {
        video.autoplay = true;
      }
      visual.appendChild(video);
      return;
    }
    var image = document.createElement("img");
    var bust = project.mediaVersion ? "?v=" + encodeURIComponent(project.mediaVersion) : "";
    image.src = url + bust;
    image.alt = "";
    if (project.cover === "baked" || m.base.toLowerCase().indexOf("skew") !== -1) {
      image.className = "card-cover";
    }
    visual.appendChild(image);
  }

  var caseEl = document.getElementById("case");
  var caseImage = document.getElementById("case-image");
  var caseTitle = document.getElementById("case-title");
  var caseClose = document.getElementById("case-close");
  var shell = document.querySelector(".shell");
  var catalog = [];
  var returnFocus = null;
  var scrollY = 0;
  var pushedCase = false;

  function caseHref(id) {
    var next = new URLSearchParams(window.location.search);
    if (id) next.set("case", id);
    else next.delete("case");
    var query = next.toString();
    return "portfolio.html" + (query ? "?" + query : "");
  }

  function projectById(id) {
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) return catalog[i];
    }
    return null;
  }

  function lockScroll() {
    scrollY = window.scrollY || 0;
    document.documentElement.classList.add("case-open");
    document.body.style.position = "fixed";
    document.body.style.top = "-" + scrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.documentElement.classList.remove("case-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  }

  function openCase(project, fromHistory) {
    if (!project || !project.caseStudy || !caseEl) return;
    var title = String(project.title || "Case study").replace(/\n/g, " ");
    if (caseTitle) caseTitle.textContent = title;
    var bust = project.mediaVersion ? "?v=" + encodeURIComponent(project.mediaVersion) : "";
    var src = "content/" + project.caseStudy + bust;
    if (caseImage.getAttribute("src") !== src) {
      caseImage.src = src;
    }
    caseImage.alt = title + " case study";
    if (caseEl.hidden) {
      returnFocus = document.activeElement;
      caseEl.hidden = false;
      if (shell) shell.setAttribute("inert", "");
      lockScroll();
      caseEl.scrollTop = 0;
      caseEl.focus();
    }
    if (!fromHistory) {
      history.pushState({ caseId: project.id }, "", caseHref(project.id));
      pushedCase = true;
    }
  }

  function closeCase(fromHistory) {
    if (!caseEl || caseEl.hidden) return;
    caseEl.hidden = true;
    if (shell) shell.removeAttribute("inert");
    unlockScroll();
    if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
    returnFocus = null;
    if (fromHistory) {
      pushedCase = false;
      return;
    }
    if (pushedCase) {
      pushedCase = false;
      history.back();
      return;
    }
    if (new URLSearchParams(window.location.search).get("case")) {
      history.replaceState(null, "", caseHref(""));
    }
  }

  function trapCaseTab(event) {
    var focusable = caseEl.querySelectorAll("button, a[href]");
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (caseClose) {
    caseClose.addEventListener("click", function () {
      closeCase(false);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (!caseEl || caseEl.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeCase(false);
    } else if (event.key === "Tab") {
      trapCaseTab(event);
    }
    event.stopPropagation();
  }, true);

  window.addEventListener("popstate", function () {
    var id = new URLSearchParams(window.location.search).get("case");
    if (!id) {
      closeCase(true);
      return;
    }
    var project = projectById(id);
    if (project && project.caseStudy) openCase(project, true);
  });

  function show(data) {
      catalog = data.projects || [];
      var projects = catalog.filter(function (project) {
        return project.category === category;
      });
      var pages = Math.max(1, Math.ceil(projects.length / pageSize));
      var page = Math.min(Math.max(1, requested || 1), pages);
      var slice = projects.slice((page - 1) * pageSize, page * pageSize);
      grid.style.setProperty("--cols", String(Math.max(slice.length, 1)));
      grid.replaceChildren();
      slice.forEach(function (project) {
        var card = document.createElement("article");
        card.className = "card";
        card.dataset.projectId = project.id;
        card.style.background = project.color;
        card.style.setProperty("--card-accent", project.color);
        var visual = document.createElement("div");
        visual.className = "card-visual";
        appendVisual(visual, project);
        var copy = document.createElement("div");
        copy.className = "card-copy";
        var title = document.createElement("h2");
        title.textContent = project.title;
        var meta = document.createElement("div");
        meta.className = "card-meta";
        var label = document.createElement("p");
        label.className = "card-label";
        label.textContent = project.label;
        meta.appendChild(label);
        if (project.year) {
          var year = document.createElement("span");
          year.className = "card-year";
          year.textContent = project.year;
          meta.appendChild(year);
        }
        copy.appendChild(title);
        copy.appendChild(meta);
        card.appendChild(visual);
        card.appendChild(copy);
        if (project.caseStudy) {
          card.classList.add("card-case");
          card.tabIndex = 0;
          card.setAttribute("role", "button");
          card.setAttribute(
            "aria-label",
            "Open " + project.title.replace(/\n/g, " ") + " case study"
          );
          card.addEventListener("click", function () {
            openCase(project, false);
          });
          card.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openCase(project, false);
          });
        }
        grid.appendChild(card);
      });
      count.textContent = projects.length ? page + "/" + pages : "";
      setArrow(prev, page - 1, page > 1);
      setArrow(next, page + 1, page < pages);
      var caseId = params.get("case");
      if (caseId) {
        var opened = projectById(caseId);
        if (opened && opened.caseStudy) openCase(opened, true);
        else closeCase(true);
      }
  }

  function portfolioCacheVersion() {
    var script = document.querySelector('script[src*="content/portfolio.js"]');
    if (!script) return "";
    var match = script.getAttribute("src").match(/[?&]v=([^&]+)/);
    return match ? match[1] : "";
  }

  var dataUrl = "content/portfolio.json";
  var bust = portfolioCacheVersion();
  if (bust) dataUrl += "?v=" + encodeURIComponent(bust);

  fetch(dataUrl)
    .then(function (response) {
      if (!response.ok) throw new Error("portfolio");
      return response.json();
    })
    .then(show)
    .catch(function () {
      if (window.PORTFOLIO) {
        show(window.PORTFOLIO);
        return;
      }
      grid.textContent = "Portfolio nie zostało wczytane.";
    });
})();
