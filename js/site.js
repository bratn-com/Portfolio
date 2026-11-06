(function () {
  var root = document.documentElement;
  var buttons = document.querySelectorAll("[data-set-lang]");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var titles = { en: "Jarek Nowakowski — Senior UI/UX Designer", pl: "Jarek Nowakowski — starszy projektant UI/UX" };
  var descriptions = {
    en: "Senior UI/UX designer in Warsaw. Art direction, branding, interface design, design systems and complex SaaS products.",
    pl: "Starszy projektant UI/UX z Warszawy. Art direction, branding, interfejsy, design systemy i złożone produkty SaaS."
  };

  function applyLang(lang) {
    root.lang = lang;
    document.title = titles[lang] || titles.en;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", descriptions[lang] || descriptions.en);
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-set-lang") === lang ? "true" : "false");
    });
    if (toggle) {
      var open = document.body.classList.contains("nav-open");
      toggle.textContent = lang === "pl" ? (open ? "Zamknij" : "Menu") : open ? "Close" : "Menu";
      toggle.setAttribute("aria-label", lang === "pl" ? (open ? "Zamknij menu" : "Otwórz menu") : open ? "Close menu" : "Open menu");
    }
    if (nav) nav.setAttribute("aria-label", lang === "pl" ? "Główne" : "Primary");
    var langGroup = document.querySelector(".langs");
    if (langGroup) langGroup.setAttribute("aria-label", lang === "pl" ? "Język" : "Language");
    try {
      localStorage.setItem("bratn-lang", lang);
    } catch (e) {}
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyLang(button.getAttribute("data-set-lang"));
    });
  });

  var lastFocus = null;

  function setOpen(open) {
    var wasOpen = document.body.classList.contains("nav-open");
    if (open) lastFocus = document.activeElement;
    document.body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    applyLang(root.lang === "pl" ? "pl" : "en");
    if (open && nav) {
      var first = nav.querySelector("a");
      if (first) first.focus();
    } else if (!open && wasOpen && lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });

  if (nav) {
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
        var id = (link.getAttribute("href") || "").slice(1);
        var target = document.getElementById(id);
        if (target) {
          target.setAttribute("tabindex", "-1");
          window.setTimeout(function () {
            target.focus({ preventScroll: true });
          }, 0);
        }
      });
    });
  }

  var sections = ["about", "work", "contact"]
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && nav) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          nav.querySelectorAll("a").forEach(function (link) {
            var current = link.getAttribute("href") === "#" + entry.target.id;
            if (current) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  applyLang(root.lang === "pl" ? "pl" : "en");
})();
