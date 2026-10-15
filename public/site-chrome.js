/**
 * Strip Netlify's Collaborative Deploy Preview drawer (bottom popup).
 * Netlify injects it on preview URLs after our HTML is served.
 */
(function () {
  "use strict";

  var SELECTOR = [
    "iframe[src*='netlify-cdp']",
    "iframe[src*='netlify-cdp-loader']",
    "iframe[title='Netlify Drawer']",
    "iframe[title*='Netlify']",
    "#netlify-drawer",
    "#netlify-drawer-iframe",
    "#netlify-welcome-modal",
    "netlify-drawer",
    "[data-netlify-drawer]",
    "[id^='netlify-drawer']",
    "[class*='netlify-drawer']",
    "script[src*='netlify-cdp']",
  ].join(",");

  function sweep(root) {
    if (!root) return;
    if (root.nodeType === 1 && root.matches && root.matches(SELECTOR)) {
      root.remove();
      return;
    }
    if (!root.querySelectorAll) return;
    var nodes = root.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) nodes[i].remove();
  }

  function run() {
    sweep(document.documentElement);
  }

  run();
  new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) sweep(added[j]);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
