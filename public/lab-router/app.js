(function () {
  "use strict";

  var COST_TIERS = ["low", "medium", "high", "max"];

  var POOL = {
    chat: [
      { slug: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", tier: "low" },
      { slug: "openai/gpt-4o-mini", name: "GPT-4o Mini", tier: "low" },
      { slug: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", tier: "medium" },
      { slug: "openai/gpt-4o", name: "GPT-4o", tier: "high" },
      { slug: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", tier: "max" },
    ],
    code: [
      { slug: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen2.5 Coder", tier: "low" },
      { slug: "deepseek/deepseek-chat", name: "DeepSeek Chat", tier: "low" },
      { slug: "openai/gpt-4o-mini", name: "GPT-4o Mini", tier: "medium" },
      { slug: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", tier: "medium" },
      { slug: "openai/gpt-4o", name: "GPT-4o", tier: "high" },
      { slug: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", tier: "max" },
    ],
    math: [
      { slug: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", tier: "low" },
      { slug: "deepseek/deepseek-r1", name: "DeepSeek R1", tier: "medium" },
      { slug: "openai/o3-mini", name: "o3-mini", tier: "high" },
      { slug: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", tier: "max" },
    ],
    research: [
      { slug: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", tier: "low" },
      { slug: "openai/gpt-4o-mini", name: "GPT-4o Mini", tier: "medium" },
      { slug: "perplexity/sonar", name: "Sonar", tier: "high" },
      { slug: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", tier: "max" },
    ],
    creative: [
      { slug: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", tier: "low" },
      { slug: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", tier: "medium" },
      { slug: "openai/gpt-4o", name: "GPT-4o", tier: "high" },
      { slug: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", tier: "max" },
    ],
    translate: [
      { slug: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", tier: "low" },
      { slug: "openai/gpt-4o-mini", name: "GPT-4o Mini", tier: "medium" },
      { slug: "openai/gpt-4o", name: "GPT-4o", tier: "high" },
    ],
  };

  var TASK_LABELS = {
    chat: "general chat",
    code: "code / debugging",
    math: "math / reasoning",
    research: "research / QA",
    creative: "creative writing",
    translate: "translation",
  };

  var ACCOUNT_KEY = "gd-account";
  var MIN_FRONTIER = 20000;

  var state = {
    costTier: "medium",
    messages: [],
    busy: false,
    lastRoute: null,
    gate: { status: "checking", reason: "wallet", wallet: "", balance: null },
  };

  var SEND_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function classifyTask(text) {
    var t = String(text || "").toLowerCase();
    if (
      /```|stack trace|debug|refactor|typescript|javascript|python|rust|golang|sql|regex|compile|function\b|class\b|bug|error:/.test(
        t
      )
    ) {
      return "code";
    }
    if (/integral|derivative|prove that|equation|algebra|calculus|probability|matrix|theorem/.test(t)) {
      return "math";
    }
    if (/translate|traduis|übersetz|翻訳|traducir|in french|in spanish|in german|in japanese/.test(t)) {
      return "translate";
    }
    if (/poem|lyrics|story|fiction|screenplay|creative|write a song|haiku/.test(t)) {
      return "creative";
    }
    if (/summarize|research|cite|compare|what is|explain|analyze|report|benchmark/.test(t)) {
      return "research";
    }
    return "chat";
  }

  function tierRank(tier) {
    var i = COST_TIERS.indexOf(tier);
    return i < 0 ? 1 : i;
  }

  function candidatesFor(task, costTier) {
    var pool = POOL[task] || POOL.chat;
    var want = tierRank(costTier);
    var scored = pool
      .map(function (m) {
        return { model: m, dist: Math.abs(tierRank(m.tier) - want) };
      })
      .sort(function (a, b) {
        return a.dist - b.dist || tierRank(a.model.tier) - tierRank(b.model.tier);
      });
    var out = [];
    scored.forEach(function (row) {
      if (out.length >= 4) return;
      if (
        out.some(function (x) {
          return x.slug === row.model.slug;
        })
      )
        return;
      out.push(row.model);
    });
    return out;
  }

  function routePrompt(text, costTier) {
    var task = classifyTask(text);
    var candidates = candidatesFor(task, costTier);
    var pick = candidates[0] || POOL.chat[0];
    return {
      task: task,
      taskLabel: TASK_LABELS[task] || task,
      costTier: costTier,
      candidates: candidates,
      model: pick,
      source: text,
    };
  }

  function renderShell() {
    var root = document.getElementById("gd-router-app");
    if (!root) return;

    root.innerHTML =
      '<section class="gd-chat-shell is-gated" id="gd-router-chat">' +
      '<div class="gd-chat-gate" id="gd-router-gate">' +
      '<div class="gd-chat-gate-card" id="gd-router-gate-card"></div>' +
      "</div>" +
      '<div class="gd-chat-body">' +
      '<div class="gd-messages" id="gd-router-messages"></div>' +
      '<div class="gd-composer-dock">' +
      '<div class="gd-route-bar" id="gd-route-bar"></div>' +
      '<div class="gd-candidates" id="gd-router-candidates"></div>' +
      '<div class="gd-composer-pill">' +
      '<textarea id="gd-router-input" rows="1" placeholder="Connect a wallet holding 20,000 $FRONTIER to chat…" disabled></textarea>' +
      '<button type="button" class="gd-send" id="gd-router-send" aria-label="Route and run" disabled>' +
      SEND_ICON +
      "</button>" +
      "</div>" +
      '<div class="gd-composer-hint">Wallet + 20,000 $FRONTIER required to chat</div>' +
      "</div></div></section>" +
      '<aside class="gd-side-stack">' +
      '<div class="gd-card gd-side-card">' +
      "<h3>How it works</h3>" +
      '<ol class="gd-steps">' +
      "<li><span>1</span>Classify the prompt into a task type</li>" +
      "<li><span>2</span>Rank candidate models for that task</li>" +
      "<li><span>3</span>Filter by your cost tier</li>" +
      "<li><span>4</span>Run on the top pick (with fallbacks ready)</li>" +
      "</ol></div>" +
      '<div class="gd-card gd-side-card">' +
      "<h3>API shape</h3>" +
      "<p>One model slug. Automatic selection based on task and cost tier.</p>" +
      '<pre class="gd-code" id="gd-router-code">{\n  "model": "gradient/auto",\n  "cost_tier": "' +
      escapeHtml(state.costTier) +
      '",\n  "messages": [{ "role": "user", "content": "…" }]\n}</pre>' +
      "</div>" +
      '<div class="gd-card gd-side-card">' +
      "<h3>Cost tiers</h3>" +
      "<p><strong>Low</strong> cheapest capable · <strong>Medium</strong> balanced · <strong>High</strong> stronger models · <strong>Max</strong> frontier quality.</p>" +
      "</div></aside>";

    wireChrome();
    renderMessages();
    renderGate();
    refreshAccess();
  }

  function syncTiers() {
    document.querySelectorAll("#gd-router-tiers .gd-chip").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tier") === state.costTier);
    });
    var meta = document.getElementById("gd-router-meta");
    if (meta) {
      meta.textContent =
        "Cost tier: " +
        state.costTier +
        ". Controls how far up the capability ladder routing can go.";
    }
    var code = document.getElementById("gd-router-code");
    if (code) {
      code.textContent =
        '{\n  "model": "gradient/auto",\n  "cost_tier": "' +
        state.costTier +
        '",\n  "messages": [{ "role": "user", "content": "…" }]\n}';
    }
  }

  function syncTier() {
    syncTiers();
  }

  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  function wireChrome() {
    var tiers = document.getElementById("gd-router-tiers");
    if (tiers && tiers.dataset.wired !== "1") {
      tiers.dataset.wired = "1";
      tiers.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-tier]");
        if (!btn) return;
        state.costTier = btn.getAttribute("data-tier");
        syncTiers();
        if (state.lastRoute && state.lastRoute.source) {
          applyRoute(routePrompt(state.lastRoute.source, state.costTier));
        }
      });
    }

    var send = document.getElementById("gd-router-send");
    var input = document.getElementById("gd-router-input");
    if (send) send.addEventListener("click", submit);
    if (input) {
      input.addEventListener("input", function () {
        autoGrow(input);
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      });
    }

    var walletBtn = document.getElementById("gd-router-wallet-btn");
    if (walletBtn && walletBtn.dataset.wired !== "1") {
      walletBtn.dataset.wired = "1";
      walletBtn.addEventListener("click", onWalletButton);
    }

    var gate = document.getElementById("gd-router-gate");
    if (gate && gate.dataset.wired !== "1") {
      gate.dataset.wired = "1";
      gate.addEventListener("click", function (e) {
        var action = e.target.closest("[data-gate-action]");
        if (!action) return;
        var kind = action.getAttribute("data-gate-action");
        if (kind === "connect") connectWallet();
        else if (kind === "signin") goLabSignIn();
        else if (kind === "disconnect") disconnectWallet();
      });
    }
    syncTiers();
  }

  function applyRoute(route) {
    state.lastRoute = route;
    var bar = document.getElementById("gd-route-bar");
    var chips = document.getElementById("gd-router-candidates");

    if (bar) {
      bar.classList.add("is-visible");
      bar.innerHTML =
        '<span class="gd-route-pill">Task <strong>' +
        escapeHtml(route.taskLabel) +
        "</strong></span>" +
        '<span class="gd-route-pill is-pick">Model <strong>' +
        escapeHtml(route.model.name) +
        "</strong></span>" +
        '<span class="gd-route-pill">Tier <strong>' +
        escapeHtml(route.costTier) +
        "</strong></span>";
    }

    if (chips) {
      chips.innerHTML = route.candidates
        .map(function (c, i) {
          return (
            '<span class="gd-cand' +
            (i === 0 ? " is-pick" : "") +
            '" title="' +
            escapeHtml(c.slug) +
            '">' +
            escapeHtml(c.name) +
            "</span>"
          );
        })
        .join("");
    }
  }

  function renderMessages() {
    var box = document.getElementById("gd-router-messages");
    if (!box) return;
    if (!state.messages.length) {
      box.innerHTML =
        '<div class="gd-messages-inner"><div class="gd-empty">' +
        "<h2>What should we route?</h2>" +
        "<p>Connect a wallet holding 20,000 $FRONTIER on Robinhood Chain, then ask anything. We pick the best model for the task at your cost tier.</p>" +
        "</div></div>";
      return;
    }
    var html =
      '<div class="gd-messages-inner">' +
      state.messages
        .map(function (m) {
          var meta = "";
          if (m.role === "assistant" && m.route) {
            meta =
              '<div class="gd-msg-meta">Routed as <code>' +
              escapeHtml(m.route.task) +
              "</code> → <code>" +
              escapeHtml(m.route.model) +
              "</code></div>";
          }
          return (
            '<div class="gd-msg ' +
            m.role +
            '"><div class="gd-msg-role">' +
            (m.role === "user" ? "You" : "Router") +
            '</div><div class="gd-bubble">' +
            escapeHtml(m.content) +
            "</div>" +
            meta +
            "</div>"
          );
        })
        .join("");
    if (state.busy) {
      html +=
        '<div class="gd-msg assistant"><div class="gd-msg-role">Router</div><div class="gd-bubble">Routing…</div></div>';
    }
    html += "</div>";
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  function getAccount() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveAccount(next) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
    try {
      window.dispatchEvent(new CustomEvent("gd-account-changed", { detail: next }));
    } catch (e) {}
  }

  function routerWallet() {
    var account = getAccount();
    var wallet = account && account.wallet ? String(account.wallet).trim() : "";
    return isEthAddress(wallet) ? wallet : "";
  }

  function shortAddr(addr) {
    if (!addr || addr.length < 10) return addr || "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  function isEthAddress(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
  }

  function persistWallet(address) {
    var prev = getAccount() || {};
    var wallet = String(address || "").trim();
    if (!isEthAddress(wallet)) return null;
    saveAccount({
      email: prev.email || wallet.slice(0, 8) + "…@wallet.gradient",
      name: prev.name || "Wallet user",
      wallet: wallet,
      privyId: prev.privyId || null,
      company: prev.company || "",
      bio: prev.bio || "",
      createdAt: prev.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return wallet;
  }

  function disconnectWallet() {
    var prev = getAccount();
    if (!prev) {
      refreshAccess();
      return;
    }
    if (prev.email && String(prev.email).indexOf("@wallet.gradient") !== -1 && !prev.privyId) {
      localStorage.removeItem(ACCOUNT_KEY);
      try {
        window.dispatchEvent(new CustomEvent("gd-account-changed", { detail: null }));
      } catch (e) {}
      refreshAccess();
      return;
    }
    prev.wallet = null;
    prev.updatedAt = new Date().toISOString();
    saveAccount(prev);
    refreshAccess();
  }

  function goLabSignIn() {
    window.location.href = "/lab/signin?return=" + encodeURIComponent("/lab/router");
  }

  var ROBINHOOD_CHAIN_ID = "0x1237";
  var ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com/";
  var ROBINHOOD_EXPLORER = "https://robinhoodchain.blockscout.com";

  function getEthereum() {
    return (typeof window !== "undefined" && window.ethereum) || null;
  }

  function ensureRobinhoodChain(eth) {
    return eth
      .request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ROBINHOOD_CHAIN_ID }],
      })
      .catch(function (err) {
        if (err && (err.code === 4902 || String(err.code) === "4902")) {
          return eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ROBINHOOD_CHAIN_ID,
                chainName: "Robinhood Chain",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: [ROBINHOOD_RPC],
                blockExplorerUrls: [ROBINHOOD_EXPLORER],
              },
            ],
          });
        }
        throw err;
      });
  }

  function connectWallet() {
    var eth = getEthereum();
    if (!eth) {
      goLabSignIn();
      return;
    }
    ensureRobinhoodChain(eth)
      .catch(function () {
        return null;
      })
      .then(function () {
        return eth.request({ method: "eth_requestAccounts" });
      })
      .then(function (accounts) {
        var addr = accounts && accounts[0];
        if (!addr) {
          goLabSignIn();
          return;
        }
        persistWallet(addr);
        refreshAccess();
      })
      .catch(function () {
        goLabSignIn();
      });
  }

  function onWalletButton() {
    if (routerWallet()) disconnectWallet();
    else connectWallet();
  }

  function checkAccess() {
    var wallet = routerWallet();
    if (!wallet) {
      return Promise.resolve({ ok: false, reason: "wallet", wallet: "", balance: null });
    }
    return fetch("/api/lab/token-gate")
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        return fetch("/api/lab/token-gate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: wallet }),
        }).then(function (r) {
          return r.json().then(function (body) {
            return { meta: d, body: body || {}, status: r.status };
          });
        });
      })
      .then(function (res) {
        var body = res.body;
        if (body.ok && !body.skipped) {
          return { ok: true, reason: "", wallet: wallet, balance: body.balance };
        }
        return {
          ok: false,
          reason: "tokens",
          wallet: wallet,
          balance: body.balance != null ? body.balance : null,
        };
      })
      .catch(function () {
        return { ok: false, reason: "tokens", wallet: wallet, balance: null };
      });
  }

  function renderGate() {
    var shell = document.getElementById("gd-router-chat");
    var overlay = document.getElementById("gd-router-gate");
    var card = document.getElementById("gd-router-gate-card");
    var input = document.getElementById("gd-router-input");
    var send = document.getElementById("gd-router-send");
    var hint = document.querySelector(".gd-composer-hint");
    var walletBtn = document.getElementById("gd-router-wallet-btn");
    var gate = state.gate;
    var unlocked = gate.status === "ok";

    if (shell) shell.classList.toggle("is-gated", !unlocked);
    if (overlay) overlay.hidden = unlocked;
    if (input) {
      input.disabled = !unlocked || state.busy;
      input.placeholder = unlocked
        ? "Ask anything: code, math, research, creative…"
        : "Connect a wallet holding 20,000 $FRONTIER to chat…";
    }
    if (send) send.disabled = !unlocked || state.busy;
    if (hint) {
      hint.textContent = unlocked
        ? "Enter to send · Shift+Enter for newline"
        : "Wallet + 20,000 $FRONTIER required to chat";
    }
    if (walletBtn) {
      walletBtn.textContent = gate.wallet ? shortAddr(gate.wallet) : "Connect wallet";
    }
    if (!card || unlocked) return;

    var mark =
      '<img src="/landing/icons/gradient-mark-blue.png?v=ring5" alt="" width="40" height="40" />';
    if (gate.status === "checking") {
      card.innerHTML = mark + "<h2>Checking access…</h2><p>Looking up your $FRONTIER balance.</p>";
      return;
    }
    if (gate.reason === "wallet") {
      card.innerHTML =
        mark +
        "<h2>Connect a wallet to chat</h2>" +
        "<p>Hold 20,000 $FRONTIER on Robinhood Chain to unlock Model Router.</p>" +
        '<div class="gd-chat-gate-actions">' +
        '<button type="button" class="gd-btn gd-btn-primary" data-gate-action="connect">Connect wallet</button>' +
        '<button type="button" class="gd-btn" data-gate-action="signin">Lab sign-in</button>' +
        "</div>";
      return;
    }
    var have =
      gate.balance != null
        ? " This wallet holds " + Number(gate.balance).toLocaleString() + " $FRONTIER."
        : "";
    card.innerHTML =
      mark +
      "<h2>Hold 20,000 $FRONTIER</h2>" +
      "<p>Chat unlocks when this wallet has at least " +
      MIN_FRONTIER.toLocaleString() +
      " $FRONTIER on Robinhood Chain." +
      have +
      "</p>" +
      (gate.wallet ? '<div class="gd-chat-gate-addr">' + escapeHtml(shortAddr(gate.wallet)) + "</div>" : "") +
      '<div class="gd-chat-gate-actions">' +
      '<button type="button" class="gd-btn gd-btn-primary" data-gate-action="connect">Switch wallet</button>' +
      '<button type="button" class="gd-btn" data-gate-action="disconnect">Disconnect</button>' +
      "</div>";
  }

  function refreshAccess() {
    state.gate = {
      status: "checking",
      reason: routerWallet() ? "tokens" : "wallet",
      wallet: routerWallet(),
      balance: null,
    };
    renderGate();
    return checkAccess().then(function (result) {
      state.gate = {
        status: result.ok ? "ok" : "locked",
        reason: result.ok ? "" : result.reason,
        wallet: result.wallet || "",
        balance: result.balance,
      };
      renderGate();
      return result.ok;
    });
  }

  function ensureTokenAccess() {
    return refreshAccess();
  }

  function submit() {
    if (state.busy) return;
    var input = document.getElementById("gd-router-input");
    var send = document.getElementById("gd-router-send");
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    ensureTokenAccess().then(function (allowed) {
      if (!allowed) return;

    var route = routePrompt(text, state.costTier);
    applyRoute(route);

    state.messages.push({ role: "user", content: text });
    input.value = "";
    autoGrow(input);
    state.busy = true;
    if (send) send.disabled = true;
    renderMessages();

    fetch("/api/inference/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openrouter/auto",
        cost_tier: state.costTier,
        preferred_model: route.model.slug,
        wallet: routerWallet(),
        messages: state.messages.map(function (m) {
          return { role: m.role, content: m.content };
        }),
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, d: d };
        });
      })
      .then(function (res) {
        state.busy = false;
        renderGate();
        if (!res.ok) {
          return runPreferred(route).then(function (content) {
            state.messages.push({
              role: "assistant",
              content: content,
              route: { task: route.task, model: route.model.slug },
            });
            renderMessages();
          });
        }
        var used = res.d.model || route.model.slug;
        if (used && used !== "openrouter/auto" && state.lastRoute) {
          state.lastRoute.model = {
            name: used.split("/").pop(),
            slug: used,
            tier: state.costTier,
          };
          applyRoute(state.lastRoute);
        }
        state.messages.push({
          role: "assistant",
          content: res.d.content || "(empty response)",
          route: { task: route.task, model: used },
        });
        renderMessages();
      })
      .catch(function () {
        state.busy = false;
        renderGate();
        return runPreferred(route).then(function (content) {
          state.messages.push({
            role: "assistant",
            content: content,
            route: { task: route.task, model: route.model.slug },
          });
          renderMessages();
        });
      });
    });
  }

  function runPreferred(route) {
    return fetch("/api/inference/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: route.model.slug,
        wallet: routerWallet(),
        messages: state.messages.map(function (m) {
          return { role: m.role, content: m.content };
        }),
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, d: d };
        });
      })
      .then(function (res) {
        if (res.ok && res.d.content) return res.d.content;
        return (
          "Routed to " +
          route.model.name +
          " (" +
          route.model.slug +
          ") for " +
          route.taskLabel +
          " at cost tier " +
          route.costTier +
          ".\n\nConnect an inference API key on the server to stream a live completion from the selected model."
        );
      })
      .catch(function () {
        return (
          "Routed to " +
          route.model.name +
          " (" +
          route.model.slug +
          ") for " +
          route.taskLabel +
          ". Add an inference API key to enable live replies."
        );
      });
  }

  function init() {
    document.documentElement.classList.add("gd-lab-fonts");
    renderShell();
    window.addEventListener("gd-account-changed", function () {
      refreshAccess();
    });
    window.addEventListener("storage", function (e) {
      if (e.key === ACCOUNT_KEY) refreshAccess();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
