(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll("a.close").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      var href = link.getAttribute("href");
      if (!href) return;

      // Figma Close: from hover state (Close2, rotated “+”) the click animates back to default (Close3)
      // before NAVIGATE "/". Approximate only when the control is hovered.
      if (!link.matches(":hover")) return;

      event.preventDefault();
      link.classList.add("close--leaving");
      window.setTimeout(function () {
        window.location.href = href;
      }, 300);
    });
  });
})();
