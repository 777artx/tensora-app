/**
 * Olora sidebar nav — Home / Models / Compute / Integrations / Deploy + bottom utilities.
 * Used by static lab pages and shell.js via window.GDLabNav.
 */
(function (global) {
  "use strict";

  var ICON_BASE = "/lab-dashboard/images/icon-svgs/sidebar/";
  var PROJECTS_KEY = "gd-projects";
  var ACTIVE_KEY = "gd-active-project";

  function imgIcon(file) {
    return (
      '<img src="' +
      ICON_BASE +
      file +
      '" alt="" class="gd-nav-icon h-4 w-4 shrink-0 object-contain"/>'
    );
  }

  var icons = {
    home: function () {
      return imgIcon("home-icon.svg");
    },
    overview: function () {
      return imgIcon("dashboard-icon.svg");
    },
    models: function () {
      return imgIcon("inference-icon.svg");
    },
    inference: function () {
      return imgIcon("inference-icon.svg");
    },
    gpus: function () {
      return imgIcon("on-demand-gpus-icon.svg");
    },
    compute: function () {
      return imgIcon("on-demand-gpus-icon.svg");
    },
    integrations: function () {
      return imgIcon("sandboxes-icon.svg");
    },
    deploy: function () {
      return imgIcon("send-icon.svg");
    },
    activity: function () {
      return imgIcon("inbox-new-icon.svg");
    },
    billing: function () {
      return imgIcon("billing-new-icon.svg");
    },
    keys: function () {
      return imgIcon("api-key-icon.svg");
    },
    docs: function () {
      return imgIcon("documentation-icon.svg");
    },
    evaluations: function () {
      return imgIcon("evaluations-icon.svg");
    },
  };

  function ensureProjects() {
    try {
      var raw = localStorage.getItem(PROJECTS_KEY);
      var list = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(list) || !list.length) {
        list = [
          {
            id: "proj_default",
            name: "Research Agent",
            createdAt: new Date().toISOString(),
          },
        ];
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
        localStorage.setItem(ACTIVE_KEY, list[0].id);
      }
      if (!localStorage.getItem(ACTIVE_KEY)) {
        localStorage.setItem(ACTIVE_KEY, list[0].id);
      }
      return list;
    } catch (e) {
      return [{ id: "proj_default", name: "My Project", createdAt: new Date().toISOString() }];
    }
  }

  function activeProject() {
    var list = ensureProjects();
    var id = localStorage.getItem(ACTIVE_KEY);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0];
  }

  function staticLink(href, label, iconKey, active) {
    return (
      '<a href="' +
      href +
      '"' +
      (active ? ' class="active"' : "") +
      ">" +
      (icons[iconKey] ? icons[iconKey]() : "") +
      label +
      "</a>"
    );
  }

  function projectSelectorHtml() {
    var p = activeProject();
    return (
      '<div class="gd-project-selector">' +
      '<button type="button" class="gd-project-btn" id="gd-project-btn" aria-expanded="false">' +
      '<span class="gd-project-name">' +
      (p && p.name ? p.name : "My Project") +
      "</span><span class=\"gd-project-caret\">▾</span></button>" +
      '<div class="gd-project-menu" id="gd-project-menu" hidden></div></div>'
    );
  }

  function renderProjectMenu(menu) {
    var list = ensureProjects();
    var active = activeProject();
    var html = "<ul>";
    for (var i = 0; i < list.length; i++) {
      html +=
        '<li><button type="button" data-project-id="' +
        list[i].id +
        '"' +
        (active && active.id === list[i].id ? ' class="is-active"' : "") +
        ">" +
        list[i].name +
        "</button></li>";
    }
    html +=
      '</ul><button type="button" class="gd-project-new" id="gd-project-new">+ New project</button>';
    menu.innerHTML = html;
  }

  function wireProjectSelector(sidebarEl) {
    var btn = sidebarEl.querySelector("#gd-project-btn");
    var menu = sidebarEl.querySelector("#gd-project-menu");
    if (!btn || !menu || btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.hasAttribute("hidden");
      if (open) {
        renderProjectMenu(menu);
        menu.removeAttribute("hidden");
        btn.setAttribute("aria-expanded", "true");
      } else {
        menu.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", "false");
      }
    });
    menu.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var pick = t.closest("[data-project-id]");
      if (pick) {
        localStorage.setItem(ACTIVE_KEY, pick.getAttribute("data-project-id"));
        menu.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", "false");
        var name = sidebarEl.querySelector(".gd-project-name");
        if (name) name.textContent = pick.textContent;
        return;
      }
      if (t.closest("#gd-project-new")) {
        var nameInput = window.prompt("Project name", "New project");
        if (!nameInput) return;
        var list = ensureProjects();
        var project = {
          id: "proj_" + Date.now().toString(36),
          name: nameInput.trim() || "Untitled project",
          createdAt: new Date().toISOString(),
        };
        list.push(project);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
        localStorage.setItem(ACTIVE_KEY, project.id);
        var label = sidebarEl.querySelector(".gd-project-name");
        if (label) label.textContent = project.name;
        menu.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("click", function () {
      menu.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  function normalizeActive(active) {
    if (active === "overview") return "dashboard";
    if (active === "cloud" || active === "gpus" || active === "instances") return "compute";
    if (active === "inference") return "models";
    if (active === "home" || active === "quickstart") return "home";
    return active;
  }

  function staticNav(active) {
    var a = normalizeActive(active);
    return (
      '<nav class="gd-nav gd-nav-home">' +
      staticLink("/lab/home", "Home", "home", a === "home") +
      staticLink("/lab/models", "Models", "models", a === "models") +
      staticLink("/lab/compute", "Compute", "compute", a === "compute") +
      staticLink("/lab/integrations", "Tools", "integrations", a === "integrations") +
      "</nav>" +
      '<div class="gd-nav-bottom">' +
      '<nav class="gd-nav">' +
      staticLink("/lab/keys", "API Access", "keys", a === "keys") +
      staticLink("/lab/activity", "Activity", "activity", a === "activity") +
      staticLink("/lab/billing", "Billing", "billing", a === "billing") +
      staticLink("/lab/dashboard", "Dashboard", "overview", a === "dashboard") +
      staticLink("/lab/docs", "Docs", "docs", a === "docs" || a === "support") +
      "</nav></div>"
    );
  }

  function closeMobileNav() {
    document.body.classList.remove("gd-nav-open");
    var btn = document.querySelector(".gd-nav-toggle");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function ensureMobileChrome(sidebarEl) {
    if (!sidebarEl) return;
    if (!document.getElementById("gd-nav-backdrop")) {
      var backdrop = document.createElement("button");
      backdrop.id = "gd-nav-backdrop";
      backdrop.className = "gd-nav-backdrop";
      backdrop.type = "button";
      backdrop.setAttribute("aria-label", "Close menu");
      backdrop.addEventListener("click", closeMobileNav);
      document.body.appendChild(backdrop);
    }
    if (!document.getElementById("gd-mobile-bar")) {
      var bar = document.createElement("div");
      bar.id = "gd-mobile-bar";
      bar.className = "gd-mobile-bar";
      bar.innerHTML =
        '<button type="button" class="gd-nav-toggle" aria-label="Open menu" aria-expanded="false">' +
        "<span></span><span></span><span></span></button>" +
        '<a class="gd-mobile-brand" href="/lab/home" aria-label="Olora"><img src="/brand/olora-wordmark-ice.png" alt="Olora" /></a>';
      var shell = sidebarEl.closest(".gd-shell");
      if (shell) shell.insertBefore(bar, shell.firstChild);
      else document.body.insertBefore(bar, document.body.firstChild);
      bar.querySelector(".gd-nav-toggle").addEventListener("click", function () {
        var open = document.body.classList.toggle("gd-nav-open");
        this.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    if (!sidebarEl.querySelector(".gd-nav-close")) {
      sidebarEl.insertAdjacentHTML(
        "afterbegin",
        '<button type="button" class="gd-nav-close" aria-label="Close menu">&times;</button>'
      );
      sidebarEl.querySelector(".gd-nav-close").addEventListener("click", closeMobileNav);
    }
    if (!sidebarEl.dataset.gdMobileWired) {
      sidebarEl.dataset.gdMobileWired = "1";
      sidebarEl.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("a[href]")) closeMobileNav();
      });
    }
  }

  function mountStaticNav(sidebarEl, active) {
    if (!sidebarEl) return;
    ensureProjects();
    sidebarEl.innerHTML = "";
    sidebarEl.insertAdjacentHTML(
      "afterbegin",
      '<a class="gd-brand" href="/lab/home" aria-label="Olora home"><img class="gd-brand-mark" src="/brand/olora-mark.png" alt="" /><img class="gd-brand-word" src="/brand/olora-wordmark.png" alt="Olora" /></a>'
    );
    sidebarEl.insertAdjacentHTML("beforeend", projectSelectorHtml());
    sidebarEl.insertAdjacentHTML(
      "beforeend",
      '<div class="gd-side-nav-body">' + staticNav(active) + "</div>"
    );
    ensureMobileChrome(sidebarEl);
    wireProjectSelector(sidebarEl);
  }

  global.GDLabNav = {
    ICON_BASE: ICON_BASE,
    icons: icons,
    imgIcon: imgIcon,
    staticNav: staticNav,
    mountStaticNav: mountStaticNav,
    normalizeActive: normalizeActive,
  };
})(typeof window !== "undefined" ? window : globalThis);
