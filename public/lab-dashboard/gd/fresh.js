/**
 * Keep Lab tabs on the current pages. Blocks stale HTML from cache / old Inference URLs.
 */
(function () {
  "use strict";

  var CANONICAL = {
    "/lab/dashboard/inference": "/lab/inference",
    "/lab/dashboard/inference/": "/lab/inference",
  };

  function pathOnly(pathname) {
    return String(pathname || "").replace(/\/+$/, "") || "/";
  }

  function canonicalize(pathname) {
    if (CANONICAL[pathname]) return CANONICAL[pathname];
    var trimmed = pathOnly(pathname);
    return CANONICAL[trimmed] || CANONICAL[trimmed + "/"] || null;
  }

  var here = canonicalize(location.pathname);
  if (here && here !== pathOnly(location.pathname)) {
    location.replace(here + location.search + location.hash);
    return;
  }

  var chrome = document.createElement("script");
  chrome.src = "/site-chrome.js?v=chrome2";
  chrome.async = true;
  document.head.appendChild(chrome);
  var chromeCss = document.createElement("link");
  chromeCss.rel = "stylesheet";
  chromeCss.href = "/site-chrome.css?v=chrome2";
  document.head.appendChild(chromeCss);

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) location.reload();
  });

  document.addEventListener(
    "click",
    function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a || (a.target && a.target !== "" && a.target !== "_self")) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;
      var url;
      try {
        url = new URL(href, location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== location.origin) return;
      var next = canonicalize(url.pathname);
      if (!next) return;
      e.preventDefault();
      location.assign(next + url.search + url.hash);
    },
    true
  );
})();
