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

  function show(data) {
      var projects = (data.projects || []).filter(function (project) {
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
        card.style.background = project.color;
        var visual = document.createElement("div");
        visual.className = "card-visual";
        var image = document.createElement("img");
        image.src = "content/" + project.image;
        image.alt = "";
        visual.appendChild(image);
        var copy = document.createElement("div");
        copy.className = "card-copy";
        var title = document.createElement("h2");
        title.textContent = project.title;
        var label = document.createElement("p");
        label.textContent = project.label;
        copy.appendChild(title);
        copy.appendChild(label);
        card.appendChild(visual);
        card.appendChild(copy);
        grid.appendChild(card);
      });
      count.textContent = projects.length ? page + "/" + pages : "";
      setArrow(prev, page - 1, page > 1);
      setArrow(next, page + 1, page < pages);
  }

  if (window.PORTFOLIO) {
    show(window.PORTFOLIO);
    return;
  }

  fetch("content/portfolio.json")
    .then(function (response) {
      if (!response.ok) throw new Error("portfolio");
      return response.json();
    })
    .then(show)
    .catch(function () {
      grid.textContent = "Portfolio nie zostało wczytane.";
    });
})();
